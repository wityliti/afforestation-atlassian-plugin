/**
 * Tenant Configuration Service
 * 
 * Manages tenant-specific configuration per spec section 4.1
 */

import { storage } from '@forge/api';
import { getConfigKey, getRulesKey, getFundingKey, getTenantListKey } from './storage-keys';

/**
 * Default configuration per spec section 13
 */
export const DEFAULT_CONFIG = {
    version: 1,
    completion: {
        mode: 'ANY', // ANY, ALL, or CUSTOM
        statusName: {
            enabled: true,
            doneStatusNames: ['Done', 'Resolved', 'Closed']
        },
        statusCategory: {
            enabled: true,
            doneCategoryKeys: ['done']
        },
        resolution: {
            enabled: false,
            requiredResolutionNames: []
        },
        reopenPolicy: {
            enabled: true,
            pauseIfReopenedWithinDays: 7,
            reawardAllowed: true,
            reawardCooldownDays: 14,
            reawardMultiplier: 0.5
        }
    },
    scope: {
        includedProjects: [], // Empty = all projects
        excludedProjects: [],
        includedIssueTypes: ['Story', 'Bug', 'Task', 'Epic'],
        excludedIssueTypes: ['Sub-task'],
        jqlAllowlist: '',
        labelExclusions: ['no-impact'],
        epicExclusions: []
    },
    scoring: {
        currencyName: 'Leaves',
        basePoints: 10,
        storyPointMultiplier: 5,
        issueTypeWeights: {
            Bug: 1.2,
            Story: 1.0,
            Task: 0.7,
            Epic: 2.0
        },
        caps: {
            perUserPerDay: 200,
            perIssueMax: 200
        }
    },
    plantingMode: {
        instantEnabled: false, // Off by default for cost control
        pledgeEnabled: true,
        pledgeBatching: {
            frequency: 'weekly',
            dayOfWeek: 5 // Friday
        },
        conversion: {
            leavesPerTree: 100
        }
    },
    privacy: {
        leaderboardMode: 'TEAM_ONLY', // ORG_ONLY, TEAM_ONLY, USER_OPT_IN
        userOptInRequired: true
    }
};

/**
 * Get tenant configuration, merged with defaults
 * @param {string} tenantId 
 * @returns {Promise<object>}
 */
export async function getTenantConfig(tenantId) {
    const key = getConfigKey(tenantId);
    const stored = await storage.get(key);

    if (!stored) {
        return { ...DEFAULT_CONFIG };
    }

    // Deep merge with defaults to handle missing fields after upgrades
    return deepMerge(DEFAULT_CONFIG, stored);
}

/**
 * Set tenant configuration
 * @param {string} tenantId 
 * @param {object} config 
 * @returns {Promise<void>}
 */
export async function setTenantConfig(tenantId, config) {
    const key = getConfigKey(tenantId);
    config.version = DEFAULT_CONFIG.version;
    config.updatedAt = new Date().toISOString();

    await storage.set(key, config);

    // Track tenant in list for batch processing
    await addTenantToList(tenantId);
}

/**
 * Get rules configuration
 * @param {string} tenantId 
 * @returns {Promise<Array>}
 */
export async function getRules(tenantId) {
    const key = getRulesKey(tenantId);
    const rules = await storage.get(key);
    return rules || [];
}

/**
 * Set rules configuration
 * @param {string} tenantId 
 * @param {Array} rules 
 * @returns {Promise<void>}
 */
export async function setRules(tenantId, rules) {
    const key = getRulesKey(tenantId);
    await storage.set(key, rules);
}

/**
 * Get funding configuration
 * @param {string} tenantId 
 * @returns {Promise<object>}
 */
export async function getFunding(tenantId) {
    const key = getFundingKey(tenantId);
    const funding = await storage.get(key);
    return funding || {
        projectCatalogSelection: [],
        allocationPolicy: {
            rounding: 'floor',
            minTreesPerProjectPerBatch: 5,
            carryForwardRemainders: true
        }
    };
}

/**
 * Set funding configuration
 * @param {string} tenantId 
 * @param {object} funding 
 * @returns {Promise<void>}
 */
export async function setFunding(tenantId, funding) {
    // Validate percentages sum to 100
    if (funding.projectCatalogSelection?.length > 0) {
        const totalPercent = funding.projectCatalogSelection
            .filter(p => p.allocation?.type === 'percentage')
            .reduce((sum, p) => sum + (p.allocation.value || 0), 0);

        if (totalPercent !== 100) {
            throw new Error(`Allocation percentages must sum to 100, got ${totalPercent}`);
        }
    }

    const key = getFundingKey(tenantId);
    await storage.set(key, funding);
}

/**
 * Add tenant to tracking list
 * @param {string} tenantId 
 */
async function addTenantToList(tenantId) {
    const key = getTenantListKey();
    let tenants = await storage.get(key) || [];

    if (!tenants.includes(tenantId)) {
        tenants.push(tenantId);
        await storage.set(key, tenants);
    }
}

/**
 * Query all configured tenants (for batch processing)
 * @returns {Promise<Array>}
 */
export async function queryAllTenants() {
    const key = getTenantListKey();
    const tenantIds = await storage.get(key) || [];

    const tenants = [];
    for (const id of tenantIds) {
        const config = await getTenantConfig(id);
        const funding = await getFunding(id);
        tenants.push({ id, config, funding });
    }

    return tenants;
}

/**
 * Deep merge utility
 */
function deepMerge(target, source) {
    const result = { ...target };

    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }

    return result;
}
