/**
 * Issue Updated Trigger Handler
 * 
 * Listens for avi:jira:updated:issue events and processes
 * issue completions to award impact points.
 */

import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import { detectCompletion } from '../services/completion-detector';
import { checkScope } from '../services/scope-filter';
import { calculateScore } from '../services/scorer';
import { getTenantConfig } from '../services/tenant-config';
import { checkAwardExists, recordAward, updateIssueLedger } from '../services/ledger';
import { incrementAgg, incrementUserAgg } from '../services/aggregation';
import { generateAwardId } from '../services/storage-keys';

/**
 * Main handler for issue updated events
 */
export async function handler(event, context) {
    const { issue, changelog, atlassianId } = event;
    const tenantId = context.cloudId;

    console.log(`[IssueUpdated] Processing issue ${issue.key} for tenant ${tenantId}`);

    try {
        // 1. Get tenant configuration
        const config = await getTenantConfig(tenantId);
        if (!config) {
            console.log(`[IssueUpdated] No config found for tenant ${tenantId}, skipping`);
            return;
        }

        // 2. Check scope filter
        const inScope = await checkScope(issue, config.scope);
        if (!inScope) {
            console.log(`[IssueUpdated] Issue ${issue.key} not in scope, skipping`);
            return;
        }

        // 3. Detect completion
        const completion = await detectCompletion(issue, changelog, config.completion);
        if (!completion.detected) {
            console.log(`[IssueUpdated] No completion detected for ${issue.key}`);
            return;
        }

        // 4. Generate deterministic award ID for idempotency
        const awardId = generateAwardId(tenantId, issue.id, completion.type, completion.toStatus, completion.transitionTime);

        // 5. Check idempotency
        const exists = await checkAwardExists(tenantId, awardId);
        if (exists) {
            console.log(`[IssueUpdated] Award ${awardId} already exists, skipping duplicate`);
            return;
        }

        // 6. Calculate score
        const score = await calculateScore(issue, config, completion);
        console.log(`[IssueUpdated] Calculated score: ${score.leaves} leaves for ${issue.key}`);

        // 7. Record award
        await recordAward(tenantId, awardId, {
            issueId: issue.id,
            issueKey: issue.key,
            projectKey: issue.fields.project.key,
            leaves: score.leaves,
            trees: score.trees,
            completionType: completion.type,
            awardedAt: new Date().toISOString(),
            assigneeId: issue.fields.assignee?.accountId || null
        });

        // 8. Update issue ledger
        await updateIssueLedger(tenantId, issue.id, {
            lastCompletedAt: new Date().toISOString(),
            completionCount: (completion.previousCount || 0) + 1,
            totalLeaves: (completion.previousLeaves || 0) + score.leaves
        });

        // 9. Update aggregations
        const now = new Date();
        const periodKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
        await incrementAgg(tenantId, 'daily', periodKey, score.leaves, score.trees);

        if (issue.fields.assignee?.accountId) {
            await incrementUserAgg(tenantId, issue.fields.assignee.accountId, 'daily', periodKey, score.leaves);
        }

        // 10. Process planting (instant or pledge)
        if (config.plantingMode.instantEnabled && score.trees > 0) {
            console.log(`[IssueUpdated] Instant planting ${score.trees} trees for ${issue.key}`);
            // TODO: Implement instant planting via Afforestation API
        } else if (config.plantingMode.pledgeEnabled) {
            console.log(`[IssueUpdated] Added ${score.trees} trees to pledge batch for ${issue.key}`);
            // Trees are already counted in aggregations, will be processed by scheduled trigger
        }

        console.log(`[IssueUpdated] Successfully processed completion for ${issue.key}`);
    } catch (error) {
        console.error(`[IssueUpdated] Error processing issue ${issue.key}:`, error);
        // Log error for observability but don't throw to avoid retries
    }
}
