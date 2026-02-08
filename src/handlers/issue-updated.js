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
import { incrementAgg, incrementUserAgg, incrementTeamAgg, getWeekKey } from '../services/aggregation';
import { generateAwardId, getAccountKey } from '../services/storage-keys';
import { createPlantOrder } from '../services/afforestation-client';

/**
 * Main handler for issue updated events
 */
export async function handler(event, context) {
    const { issue, changelog, atlassianId } = event;
    let tenantId = context.cloudId || context.workspaceId;
    if (!tenantId && context.installContext) {
        tenantId = context.installContext.split('/').pop();
    }

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
        const dailyKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const weekKey = getWeekKey(now);
        const monthKey = now.toISOString().substring(0, 7); // YYYY-MM

        await Promise.all([
            incrementAgg(tenantId, 'daily', dailyKey, score.leaves, score.trees),
            incrementAgg(tenantId, 'weekly', weekKey, score.leaves, score.trees),
            incrementAgg(tenantId, 'monthly', monthKey, score.leaves, score.trees),
            // Track team stats (Project = Team)
            incrementTeamAgg(tenantId, issue.fields.project.key, 'monthly', monthKey, score.leaves, score.trees)
        ]);

        if (issue.fields.assignee?.accountId) {
            await incrementUserAgg(tenantId, issue.fields.assignee.accountId, 'daily', periodKey, score.leaves);
        }

        // 10. Process planting (instant or pledge)
        if (config.plantingMode.instantEnabled && score.trees > 0) {
            const account = await storage.get(getAccountKey(tenantId));
            if (account?.apiKey) {
                console.log(`[IssueUpdated] Instant planting ${score.trees} trees for ${issue.key}`);
                const plantResult = await createPlantOrder({
                    tenantId,
                    projectId: config.funding?.projectCatalogSelection?.[0]?.projectId,
                    trees: score.trees,
                    issueKey: issue.key,
                    issueId: issue.id,
                    awardId
                }, account.apiKey);
                if (!plantResult.success) {
                    console.error(`[IssueUpdated] Instant planting failed for ${issue.key}:`, plantResult.error);
                }
            } else {
                console.log(`[IssueUpdated] No linked account for instant planting, skipping ${issue.key}`);
            }
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
