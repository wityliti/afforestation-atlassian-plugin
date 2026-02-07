/**
 * Batch Pledge Scheduled Trigger Handler
 * 
 * Runs weekly to process accumulated tree pledges
 * and submit them to the Afforestation API.
 */

import { storage } from '@forge/api';
import { queryAllTenants } from '../services/tenant-config';
import { getAgg, resetPledgeCounters } from '../services/aggregation';
import { allocateFunding } from '../services/funding-allocator';
import { createPledge } from '../services/afforestation-client';

/**
 * Handler for weekly pledge batch processing
 */
export async function handler(event, context) {
    console.log('[BatchPledge] Starting weekly pledge batch processing');

    try {
        // Get all tenants that have enabled pledge batching
        const tenants = await queryAllTenants();

        for (const tenant of tenants) {
            try {
                await processTenantPledge(tenant);
            } catch (error) {
                console.error(`[BatchPledge] Error processing tenant ${tenant.id}:`, error);
                // Continue with other tenants
            }
        }

        console.log('[BatchPledge] Completed weekly pledge batch processing');
    } catch (error) {
        console.error('[BatchPledge] Fatal error in batch processing:', error);
    }
}

/**
 * Process pledge for a single tenant
 */
async function processTenantPledge(tenant) {
    const { id: tenantId, config, funding } = tenant;

    // Check if pledge batching is enabled
    if (!config.plantingMode?.pledgeEnabled) {
        console.log(`[BatchPledge] Pledge batching not enabled for ${tenantId}, skipping`);
        return;
    }

    // Get accumulated trees for this week
    const now = new Date();
    const weekKey = getWeekKey(now);
    const agg = await getAgg(tenantId, 'weekly', weekKey);

    if (!agg || agg.trees < 1) {
        console.log(`[BatchPledge] No trees to pledge for ${tenantId} this week`);
        return;
    }

    console.log(`[BatchPledge] Processing ${agg.trees} trees for tenant ${tenantId}`);

    // Allocate funding across projects
    const allocations = allocateFunding(agg.trees, funding);

    // Skip if no valid allocations (e.g., all below minimum)
    if (allocations.length === 0) {
        console.log(`[BatchPledge] No valid allocations for ${tenantId}, carrying forward`);
        return;
    }

    // Create pledge via Afforestation API
    const pledgeData = {
        tenantId,
        period: weekKey,
        totalTrees: agg.trees,
        totalLeaves: agg.leaves,
        allocations,
        evidence: {
            source: 'jira',
            period: weekKey,
            issueCount: agg.issueCount || 0
        }
    };

    const result = await createPledge(pledgeData);

    if (result.success) {
        console.log(`[BatchPledge] Successfully created pledge ${result.pledgeId} for ${tenantId}`);

        // Reset counters for this period
        await resetPledgeCounters(tenantId, 'weekly', weekKey);
    } else {
        console.error(`[BatchPledge] Failed to create pledge for ${tenantId}:`, result.error);
    }
}

/**
 * Get ISO week key (YYYY-Www format)
 */
function getWeekKey(date) {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}
