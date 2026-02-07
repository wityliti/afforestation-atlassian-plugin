/**
 * Completion Detector Service
 * 
 * Detects issue completions per spec section 2 (Completion Detection)
 */

/**
 * Detect if an issue update represents a completion
 * @param {object} issue - Jira issue object
 * @param {object} changelog - Changelog from event
 * @param {object} completionConfig - Tenant's completion configuration
 * @returns {object} { detected: boolean, type: string, toStatus: string, transitionTime: string }
 */
export async function detectCompletion(issue, changelog, completionConfig) {
    const results = {
        statusName: false,
        statusCategory: false,
        resolution: false
    };

    let toStatus = null;
    let transitionTime = new Date().toISOString();

    // Parse changelog for status and resolution changes
    const items = changelog?.items || [];

    for (const item of items) {
        // Strategy A: Status Name
        if (item.field === 'status' && completionConfig.statusName?.enabled) {
            const doneNames = completionConfig.statusName.doneStatusNames || [];
            if (doneNames.includes(item.toString)) {
                results.statusName = true;
                toStatus = item.toString;
            }
        }

        // Strategy B: Status Category
        if (item.field === 'status' && completionConfig.statusCategory?.enabled) {
            const doneCategoryKeys = completionConfig.statusCategory.doneCategoryKeys || ['done'];
            // Note: We may need to fetch the status category from the issue or additional API call
            // For now, check if the status name matches common "done" patterns
            const statusCategory = getStatusCategory(item.toString, issue);
            if (doneCategoryKeys.includes(statusCategory)) {
                results.statusCategory = true;
                toStatus = toStatus || item.toString;
            }
        }

        // Strategy C: Resolution
        if (item.field === 'resolution' && completionConfig.resolution?.enabled) {
            if (item.to && item.toString) {
                const requiredResolutions = completionConfig.resolution.requiredResolutionNames || [];
                if (requiredResolutions.length === 0 || requiredResolutions.includes(item.toString)) {
                    results.resolution = true;
                }
            }
        }
    }

    // Apply mode logic
    const mode = completionConfig.mode || 'ANY';
    let detected = false;
    let type = '';

    switch (mode) {
        case 'ANY':
            detected = results.statusName || results.statusCategory || results.resolution;
            type = Object.entries(results).filter(([_, v]) => v).map(([k]) => k).join('+');
            break;

        case 'ALL':
            // All enabled strategies must match
            detected = true;
            const enabledStrategies = [];

            if (completionConfig.statusName?.enabled) {
                enabledStrategies.push('statusName');
                if (!results.statusName) detected = false;
            }
            if (completionConfig.statusCategory?.enabled) {
                enabledStrategies.push('statusCategory');
                if (!results.statusCategory) detected = false;
            }
            if (completionConfig.resolution?.enabled) {
                enabledStrategies.push('resolution');
                if (!results.resolution) detected = false;
            }

            type = enabledStrategies.join('+');
            break;

        case 'CUSTOM':
            // Custom expressions not implemented in V1
            // Fall back to ANY mode
            detected = results.statusName || results.statusCategory || results.resolution;
            type = 'custom';
            break;

        default:
            detected = results.statusName || results.statusCategory || results.resolution;
            type = 'any';
    }

    return {
        detected,
        type,
        toStatus: toStatus || issue.fields?.status?.name,
        transitionTime,
        strategies: results
    };
}

/**
 * Detect if an issue was reopened
 * @param {object} changelog 
 * @param {object} completionConfig 
 * @returns {boolean}
 */
export function detectReopen(changelog, completionConfig) {
    const items = changelog?.items || [];

    for (const item of items) {
        if (item.field === 'status') {
            // Check if moving FROM a done status TO a non-done status
            const fromDone = isDoneStatus(item.fromString, completionConfig);
            const toDone = isDoneStatus(item.toString, completionConfig);

            if (fromDone && !toDone) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if a status name is considered "done"
 * @param {string} statusName 
 * @param {object} completionConfig 
 * @returns {boolean}
 */
function isDoneStatus(statusName, completionConfig) {
    if (!statusName) return false;

    if (completionConfig.statusName?.enabled) {
        const doneNames = completionConfig.statusName.doneStatusNames || [];
        if (doneNames.includes(statusName)) return true;
    }

    // Common done status patterns
    const commonDonePatterns = ['done', 'closed', 'resolved', 'complete', 'completed'];
    return commonDonePatterns.some(pattern =>
        statusName.toLowerCase().includes(pattern)
    );
}

/**
 * Get status category from status name (heuristic)
 * Note: In production, this should use Jira API to get actual category
 * @param {string} statusName 
 * @param {object} issue 
 * @returns {string}
 */
function getStatusCategory(statusName, issue) {
    // Try to get from issue if available
    if (issue?.fields?.status?.statusCategory?.key) {
        return issue.fields.status.statusCategory.key;
    }

    // Fallback heuristic based on common status names
    const lowerName = (statusName || '').toLowerCase();

    const donePatterns = ['done', 'closed', 'resolved', 'complete', 'completed', 'released', 'shipped'];
    if (donePatterns.some(p => lowerName.includes(p))) {
        return 'done';
    }

    const inProgressPatterns = ['in progress', 'in review', 'in development', 'working', 'active'];
    if (inProgressPatterns.some(p => lowerName.includes(p))) {
        return 'indeterminate';
    }

    const todoPatterns = ['to do', 'todo', 'open', 'new', 'backlog', 'pending'];
    if (todoPatterns.some(p => lowerName.includes(p))) {
        return 'new';
    }

    return 'indeterminate';
}
