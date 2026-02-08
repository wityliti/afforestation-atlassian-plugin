/**
 * Storage Key Utilities
 * 
 * Generates namespaced storage keys per the spec's data model (section 3).
 * All keys follow the pattern: {entity}:{tenantId}:{...params}
 */

import { createHash } from 'crypto';

/**
 * Configuration key
 * @param {string} tenantId 
 * @returns {string} cfg:{tenantId}:v1
 */
export function getConfigKey(tenantId) {
    return `cfg:${tenantId}:v1`;
}

/**
 * Rules configuration key
 * @param {string} tenantId 
 * @returns {string} rules:{tenantId}:v1
 */
export function getRulesKey(tenantId) {
    return `rules:${tenantId}:v1`;
}

/**
 * Funding configuration key
 * @param {string} tenantId 
 * @returns {string} funding:{tenantId}:v1
 */
export function getFundingKey(tenantId) {
    return `funding:${tenantId}:v1`;
}

/**
 * Issue ledger key (per-issue state)
 * @param {string} tenantId 
 * @param {string} issueId 
 * @returns {string} issueLedger:{tenantId}:{issueId}
 */
export function getIssueLedgerKey(tenantId, issueId) {
    return `issueLedger:${tenantId}:${issueId}`;
}

/**
 * Award ledger key (idempotency record)
 * @param {string} tenantId 
 * @param {string} awardId 
 * @returns {string} awardLedger:{tenantId}:{awardId}
 */
export function getAwardLedgerKey(tenantId, awardId) {
    return `awardLedger:${tenantId}:${awardId}`;
}

/**
 * Batch ledger key
 * @param {string} tenantId 
 * @param {string} batchId 
 * @returns {string} batchLedger:{tenantId}:{batchId}
 */
export function getBatchLedgerKey(tenantId, batchId) {
    return `batchLedger:${tenantId}:${batchId}`;
}

/**
 * Aggregation key (time bucket)
 * @param {string} tenantId 
 * @param {string} periodType - daily|weekly|monthly|sprint
 * @param {string} periodKey - YYYY-MM-DD, YYYY-Www, YYYY-MM, or sprintId
 * @returns {string} agg:{tenantId}:{periodType}:{periodKey}
 */
export function getAggKey(tenantId, periodType, periodKey) {
    return `agg:${tenantId}:${periodType}:${periodKey}`;
}

/**
 * User aggregation key
 * @param {string} tenantId 
 * @param {string} accountId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @returns {string} userAgg:{tenantId}:{accountId}:{periodType}:{periodKey}
 */
export function getUserAggKey(tenantId, accountId, periodType, periodKey) {
    return `userAgg:${tenantId}:${accountId}:${periodType}:${periodKey}`;
}

/**
 * Team aggregation key (optional)
 * @param {string} tenantId 
 * @param {string} teamId 
 * @param {string} periodType 
 * @param {string} periodKey 
 * @returns {string} teamAgg:{tenantId}:{teamId}:{periodType}:{periodKey}
 */
export function getTeamAggKey(tenantId, teamId, periodType, periodKey) {
    return `teamAgg:${tenantId}:${teamId}:${periodType}:${periodKey}`;
}

/**
 * Remainder leaves key (for carry-forward)
 * @param {string} tenantId 
 * @returns {string} remainderLeaves:{tenantId}
 */
export function getRemainderKey(tenantId) {
    return `remainderLeaves:${tenantId}`;
}

/**
 * Error aggregation key (for observability)
 * @param {string} tenantId 
 * @param {string} date - YYYY-MM-DD
 * @returns {string} errorAgg:{tenantId}:{date}
 */
export function getErrorAggKey(tenantId, date) {
    return `errorAgg:${tenantId}:${date}`;
}

/**
 * Generate deterministic award ID for idempotency
 * Uses SHA256 hash of concatenated identifiers
 * 
 * @param {string} tenantId 
 * @param {string} issueId 
 * @param {string} completionType 
 * @param {string} toStatus 
 * @param {string} transitionTime 
 * @returns {string} SHA256 hash (first 16 chars for storage efficiency)
 */
export function generateAwardId(tenantId, issueId, completionType, toStatus, transitionTime) {
    const input = `${tenantId}|${issueId}|${completionType}|${toStatus}|${transitionTime}`;
    const hash = createHash('sha256').update(input).digest('hex');
    return hash.substring(0, 16); // First 16 chars is sufficient for uniqueness
}

/**
 * Tenant list key (for querying all tenants)
 * @returns {string} tenants:list
 */
export function getTenantListKey() {
    return 'tenants:list';
}

/**
 * Account key (linked Afforestation company account)
 * Stores: { companyId, companyName, apiKey, linkedAt }
 * @param {string} tenantId
 * @returns {string} account:{tenantId}:v1
 */
export function getAccountKey(tenantId) {
    return `account:${tenantId}:v1`;
}

/**
 * Pending auth token key (temporary, for signup/login flow)
 * Stores: { token, type, createdAt }
 * @param {string} tenantId
 * @returns {string} pendingToken:{tenantId}
 */
export function getPendingTokenKey(tenantId) {
    return `pendingToken:${tenantId}`;
}
