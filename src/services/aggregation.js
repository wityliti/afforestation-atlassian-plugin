/**
 * Aggregation Service
 * 
 * Manages time-bucketed aggregations per spec section 3.3
 */

import { storage } from '@forge/api';
import { getAggKey, getUserAggKey, getTeamAggKey, getRemainderKey } from './storage-keys';

/**
 * Get aggregation for a period
 * @param {string} tenantId 
 * @param {string} periodType - daily|weekly|monthly|sprint
 * @param {string} periodKey - YYYY-MM-DD, YYYY-Www, YYYY-MM, or sprintId
 * @returns {Promise<object>}
 */
export async function getAgg(tenantId, periodType, periodKey) {
    const key = getAggKey(tenantId, periodType, periodKey);
    const agg = await storage.get(key);

    return agg || {
        periodType,
        periodKey,
        leaves: 0,
        trees: 0,
        issueCount: 0,
        createdAt: new Date().toISOString()
    };
}

/**
 * Increment aggregation counters
 * @param {string} tenantId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @param {number} leaves 
 * @param {number} trees 
 * @returns {Promise<void>}
 */
export async function incrementAgg(tenantId, periodType, periodKey, leaves, trees = 0) {
    const key = getAggKey(tenantId, periodType, periodKey);
    const current = await getAgg(tenantId, periodType, periodKey);

    const updated = {
        ...current,
        leaves: current.leaves + leaves,
        trees: current.trees + trees,
        issueCount: current.issueCount + 1,
        updatedAt: new Date().toISOString()
    };

    await storage.set(key, updated);
}

/**
 * Get user aggregation for a period
 * @param {string} tenantId 
 * @param {string} accountId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @returns {Promise<object>}
 */
export async function getUserAgg(tenantId, accountId, periodType, periodKey) {
    const key = getUserAggKey(tenantId, accountId, periodType, periodKey);
    const agg = await storage.get(key);

    return agg || {
        accountId,
        periodType,
        periodKey,
        leaves: 0,
        issueCount: 0,
        createdAt: new Date().toISOString()
    };
}

/**
 * Increment user aggregation
 * @param {string} tenantId 
 * @param {string} accountId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @param {number} leaves 
 * @returns {Promise<object>} Updated agg with capped value info
 */
export async function incrementUserAgg(tenantId, accountId, periodType, periodKey, leaves, caps = null) {
    const key = getUserAggKey(tenantId, accountId, periodType, periodKey);
    const current = await getUserAgg(tenantId, accountId, periodType, periodKey);

    let cappedLeaves = leaves;
    let wasCapped = false;

    // Apply per-user-per-day cap if provided
    if (caps?.perUserPerDay && periodType === 'daily') {
        const newTotal = current.leaves + leaves;
        if (newTotal > caps.perUserPerDay) {
            cappedLeaves = Math.max(0, caps.perUserPerDay - current.leaves);
            wasCapped = true;
        }
    }

    const updated = {
        ...current,
        leaves: current.leaves + cappedLeaves,
        issueCount: current.issueCount + 1,
        updatedAt: new Date().toISOString()
    };

    await storage.set(key, updated);

    return { updated, cappedLeaves, wasCapped, originalLeaves: leaves };
}

/**
 * Get team aggregation
 * @param {string} tenantId 
 * @param {string} teamId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @returns {Promise<object>}
 */
export async function getTeamAgg(tenantId, teamId, periodType, periodKey) {
    const key = getTeamAggKey(tenantId, teamId, periodType, periodKey);
    const agg = await storage.get(key);

    return agg || {
        teamId,
        periodType,
        periodKey,
        leaves: 0,
        trees: 0,
        issueCount: 0,
        createdAt: new Date().toISOString()
    };
}

/**
 * Increment team aggregation
 * @param {string} tenantId 
 * @param {string} teamId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @param {number} leaves 
 * @param {number} trees 
 * @returns {Promise<void>}
 */
export async function incrementTeamAgg(tenantId, teamId, periodType, periodKey, leaves, trees = 0) {
    const key = getTeamAggKey(tenantId, teamId, periodType, periodKey);
    const current = await getTeamAgg(tenantId, teamId, periodType, periodKey);

    const updated = {
        ...current,
        leaves: current.leaves + leaves,
        trees: current.trees + trees,
        issueCount: current.issueCount + 1,
        updatedAt: new Date().toISOString()
    };

    await storage.set(key, updated);
}

/**
 * Get remainder leaves for carryforward
 * @param {string} tenantId 
 * @returns {Promise<number>}
 */
export async function getRemainderLeaves(tenantId) {
    const key = getRemainderKey(tenantId);
    const value = await storage.get(key);
    return value?.leaves || 0;
}

/**
 * Set remainder leaves
 * @param {string} tenantId 
 * @param {number} leaves 
 * @returns {Promise<void>}
 */
export async function setRemainderLeaves(tenantId, leaves) {
    const key = getRemainderKey(tenantId);
    await storage.set(key, { leaves, updatedAt: new Date().toISOString() });
}

/**
 * Reset pledge counters after batch processing
 * @param {string} tenantId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @returns {Promise<void>}
 */
export async function resetPledgeCounters(tenantId, periodType, periodKey) {
    const key = getAggKey(tenantId, periodType, periodKey);
    const current = await getAgg(tenantId, periodType, periodKey);

    const updated = {
        ...current,
        trees: 0, // Reset trees (pledged)
        pledgedAt: new Date().toISOString()
    };

    await storage.set(key, updated);
}

/**
 * Get aggregations for dashboard display
 * @param {string} tenantId 
 * @returns {Promise<object>}
 */
export async function getDashboardAggregations(tenantId) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekKey = getWeekKey(now);
    const monthKey = now.toISOString().substring(0, 7); // YYYY-MM

    const [daily, weekly, monthly] = await Promise.all([
        getAgg(tenantId, 'daily', today),
        getAgg(tenantId, 'weekly', weekKey),
        getAgg(tenantId, 'monthly', monthKey)
    ]);

    return { daily, weekly, monthly };
}

/**
 * Get ISO week key
 */
function getWeekKey(date) {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}
