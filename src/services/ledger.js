/**
 * Ledger Service
 * 
 * Manages issue ledger and award ledger for idempotency
 * per spec sections 3.2 and 6.2
 */

import { storage } from '@forge/api';
import { getIssueLedgerKey, getAwardLedgerKey, getBatchLedgerKey } from './storage-keys';

/**
 * Get issue ledger (per-issue completion history)
 * @param {string} tenantId 
 * @param {string} issueId 
 * @returns {Promise<object>}
 */
export async function getIssueLedger(tenantId, issueId) {
    const key = getIssueLedgerKey(tenantId, issueId);
    const ledger = await storage.get(key);

    return ledger || {
        issueId,
        completionCount: 0,
        totalLeaves: 0,
        lastCompletedAt: null,
        lastReopenedAt: null,
        awards: []
    };
}

/**
 * Update issue ledger
 * @param {string} tenantId 
 * @param {string} issueId 
 * @param {object} update 
 * @returns {Promise<void>}
 */
export async function updateIssueLedger(tenantId, issueId, update) {
    const key = getIssueLedgerKey(tenantId, issueId);
    const current = await getIssueLedger(tenantId, issueId);

    const updated = {
        ...current,
        ...update,
        updatedAt: new Date().toISOString()
    };

    // Keep last 10 awards for history
    if (update.awardId) {
        updated.awards = [
            { awardId: update.awardId, awardedAt: update.awardedAt, leaves: update.leaves },
            ...(current.awards || []).slice(0, 9)
        ];
    }

    await storage.set(key, updated);
}

/**
 * Check if award already exists (idempotency check)
 * @param {string} tenantId 
 * @param {string} awardId 
 * @returns {Promise<boolean>}
 */
export async function checkAwardExists(tenantId, awardId) {
    const key = getAwardLedgerKey(tenantId, awardId);
    const record = await storage.get(key);
    return record !== null && record !== undefined;
}

/**
 * Record new award (idempotency record)
 * @param {string} tenantId 
 * @param {string} awardId 
 * @param {object} data 
 * @returns {Promise<void>}
 */
export async function recordAward(tenantId, awardId, data) {
    const key = getAwardLedgerKey(tenantId, awardId);

    const record = {
        awardId,
        ...data,
        createdAt: new Date().toISOString()
    };

    await storage.set(key, record);
}

/**
 * Get award record
 * @param {string} tenantId 
 * @param {string} awardId 
 * @returns {Promise<object|null>}
 */
export async function getAward(tenantId, awardId) {
    const key = getAwardLedgerKey(tenantId, awardId);
    return await storage.get(key);
}

/**
 * Create or update batch ledger record
 * @param {string} tenantId 
 * @param {string} batchId 
 * @param {object} data 
 * @returns {Promise<void>}
 */
export async function updateBatchLedger(tenantId, batchId, data) {
    const key = getBatchLedgerKey(tenantId, batchId);

    const record = {
        batchId,
        ...data,
        updatedAt: new Date().toISOString()
    };

    await storage.set(key, record);
}

/**
 * Get batch ledger record
 * @param {string} tenantId 
 * @param {string} batchId 
 * @returns {Promise<object|null>}
 */
export async function getBatchLedger(tenantId, batchId) {
    const key = getBatchLedgerKey(tenantId, batchId);
    return await storage.get(key);
}

/**
 * Check reopen policy and return adjusted multiplier
 * @param {string} tenantId 
 * @param {string} issueId 
 * @param {object} reopenPolicy 
 * @returns {Promise<{allowed: boolean, multiplier: number, reason: string}>}
 */
export async function checkReopenPolicy(tenantId, issueId, reopenPolicy) {
    if (!reopenPolicy?.enabled) {
        return { allowed: true, multiplier: 1.0, reason: 'Reopen policy disabled' };
    }

    const ledger = await getIssueLedger(tenantId, issueId);

    if (ledger.completionCount === 0) {
        return { allowed: true, multiplier: 1.0, reason: 'First completion' };
    }

    const lastCompleted = ledger.lastCompletedAt ? new Date(ledger.lastCompletedAt) : null;
    if (!lastCompleted) {
        return { allowed: true, multiplier: 1.0, reason: 'No previous completion date' };
    }

    const daysSinceLastCompletion = (Date.now() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24);

    // Check pause window
    if (daysSinceLastCompletion < reopenPolicy.pauseIfReopenedWithinDays) {
        return {
            allowed: false,
            multiplier: 0,
            reason: `Reopened within ${reopenPolicy.pauseIfReopenedWithinDays} days`
        };
    }

    // Check cooldown for reaward
    if (!reopenPolicy.reawardAllowed) {
        return { allowed: false, multiplier: 0, reason: 'Reaward not allowed' };
    }

    if (daysSinceLastCompletion < reopenPolicy.reawardCooldownDays) {
        return {
            allowed: false,
            multiplier: 0,
            reason: `Within ${reopenPolicy.reawardCooldownDays} day cooldown`
        };
    }

    // Reaward allowed with multiplier
    return {
        allowed: true,
        multiplier: reopenPolicy.reawardMultiplier || 0.5,
        reason: 'Reaward with multiplier'
    };
}
