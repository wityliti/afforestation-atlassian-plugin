/**
 * Scorer Service
 * 
 * Calculates impact points (leaves) based on issue properties
 * per spec section 6.3
 */

import { getRules } from './tenant-config';
import { evaluateExpression } from './expression-evaluator';
import { checkReopenPolicy } from './ledger';

/**
 * Calculate score for a completed issue
 * @param {object} issue - Jira issue object
 * @param {object} config - Tenant configuration
 * @param {object} completion - Completion detection result
 * @returns {Promise<{ leaves: number, trees: number, details: object }>}
 */
export async function calculateScore(issue, config, completion) {
    const { scoring, plantingMode } = config;

    // Extract issue properties
    const issueType = issue.fields?.issuetype?.name || 'Task';
    const storyPoints = issue.fields?.customfield_10016 || // Common story points field
        issue.fields?.storyPoints ||
        0;
    const priority = issue.fields?.priority?.name;

    // Get base values from config
    const base = scoring.basePoints || 10;
    const spMult = scoring.storyPointMultiplier || 5;
    const issueTypeWeight = scoring.issueTypeWeights?.[issueType] ?? 1.0;
    const perIssueMax = scoring.caps?.perIssueMax || 200;

    // Default formula: leaves = min(perIssueMax, (base + sp * spMult) * wIssue)
    let leaves = Math.min(perIssueMax, (base + storyPoints * spMult) * issueTypeWeight);

    // Check for rule overrides
    const rules = await getRules(config.tenantId);
    if (rules?.length > 0) {
        const ruleResult = await applyRules(rules, issue, { base, spMult, storyPoints, issueTypeWeight });
        if (ruleResult.matched) {
            leaves = ruleResult.leaves;
        }
    }

    // Apply reopen policy multiplier if applicable
    if (completion.isReopen) {
        const reopenCheck = await checkReopenPolicy(
            config.tenantId,
            issue.id,
            config.completion.reopenPolicy
        );

        if (!reopenCheck.allowed) {
            return {
                leaves: 0,
                trees: 0,
                details: {
                    base,
                    storyPoints,
                    issueTypeWeight,
                    blocked: true,
                    reason: reopenCheck.reason
                }
            };
        }

        leaves = Math.floor(leaves * reopenCheck.multiplier);
    }

    // Ensure leaves is an integer
    leaves = Math.floor(leaves);

    // Calculate trees
    const leavesPerTree = plantingMode?.conversion?.leavesPerTree || 100;
    const trees = Math.floor(leaves / leavesPerTree);
    const remainderLeaves = leaves % leavesPerTree;

    return {
        leaves,
        trees,
        details: {
            base,
            storyPoints,
            issueTypeWeight,
            spMult,
            issueType,
            priority,
            leavesPerTree,
            remainderLeaves,
            formula: `min(${perIssueMax}, (${base} + ${storyPoints} * ${spMult}) * ${issueTypeWeight})`
        }
    };
}

/**
 * Apply custom rules to calculate score
 * @param {Array} rules 
 * @param {object} issue 
 * @param {object} variables 
 * @returns {Promise<{ matched: boolean, leaves: number, ruleId: string }>}
 */
async function applyRules(rules, issue, variables) {
    for (const rule of rules) {
        if (!rule.enabled) continue;

        // Check 'when' condition
        if (rule.when?.event && rule.when.event !== 'issue.completed') {
            continue;
        }

        // Check 'if' conditions
        if (!checkConditions(rule.if, issue)) {
            continue;
        }

        // Apply 'then' action
        if (rule.then?.leavesExpr) {
            try {
                const leaves = evaluateExpression(rule.then.leavesExpr, variables);
                return { matched: true, leaves, ruleId: rule.ruleId };
            } catch (error) {
                console.error(`[Scorer] Rule ${rule.ruleId} expression error:`, error);
                continue; // Fall through to next rule or default
            }
        }
    }

    return { matched: false, leaves: 0, ruleId: null };
}

/**
 * Check if all conditions match
 * @param {Array} conditions 
 * @param {object} issue 
 * @returns {boolean}
 */
function checkConditions(conditions, issue) {
    if (!conditions || conditions.length === 0) {
        return true;
    }

    for (const condition of conditions) {
        const value = getFieldValue(condition.field, issue);

        if (!checkOperator(value, condition.op, condition.value)) {
            return false;
        }
    }

    return true;
}

/**
 * Get field value from issue
 * @param {string} field 
 * @param {object} issue 
 * @returns {any}
 */
function getFieldValue(field, issue) {
    switch (field) {
        case 'issueType':
            return issue.fields?.issuetype?.name;
        case 'priority':
            return issue.fields?.priority?.name;
        case 'project':
            return issue.fields?.project?.key;
        case 'storyPoints':
            return issue.fields?.customfield_10016 || issue.fields?.storyPoints || 0;
        case 'labels':
            return issue.fields?.labels || [];
        case 'status':
            return issue.fields?.status?.name;
        case 'resolution':
            return issue.fields?.resolution?.name;
        default:
            // Check custom fields
            if (field.startsWith('customfield_')) {
                return issue.fields?.[field];
            }
            return null;
    }
}

/**
 * Check operator condition
 * @param {any} value 
 * @param {string} op 
 * @param {any} expected 
 * @returns {boolean}
 */
function checkOperator(value, op, expected) {
    switch (op) {
        case 'eq':
            return value === expected;
        case 'neq':
            return value !== expected;
        case 'in':
            return Array.isArray(expected) && expected.includes(value);
        case 'notIn':
            return Array.isArray(expected) && !expected.includes(value);
        case 'contains':
            return Array.isArray(value) && value.includes(expected);
        case 'gt':
            return typeof value === 'number' && value > expected;
        case 'gte':
            return typeof value === 'number' && value >= expected;
        case 'lt':
            return typeof value === 'number' && value < expected;
        case 'lte':
            return typeof value === 'number' && value <= expected;
        default:
            return false;
    }
}

/**
 * Preview scoring for an issue (dry run)
 * @param {object} issue 
 * @param {object} config 
 * @returns {Promise<object>}
 */
export async function previewScore(issue, config) {
    const completion = { detected: true, type: 'preview', isReopen: false };
    const result = await calculateScore(issue, config, completion);

    return {
        ...result,
        preview: true,
        issueKey: issue.key,
        issueId: issue.id
    };
}
