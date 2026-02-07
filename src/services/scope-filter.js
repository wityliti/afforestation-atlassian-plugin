/**
 * Scope Filter Service
 * 
 * Filters issues based on project/issue type/label settings
 * per spec section 6.1
 */

/**
 * Check if an issue is within the configured scope
 * @param {object} issue - Jira issue object
 * @param {object} scopeConfig - Tenant's scope configuration
 * @returns {Promise<boolean>}
 */
export async function checkScope(issue, scopeConfig) {
    if (!scopeConfig) {
        return true; // No scope config = all issues in scope
    }

    const projectKey = issue.fields?.project?.key;
    const issueTypeName = issue.fields?.issuetype?.name;
    const labels = issue.fields?.labels || [];
    const epicKey = issue.fields?.epic?.key || issue.fields?.parent?.key;

    // 1. Project filter
    if (!checkProject(projectKey, scopeConfig)) {
        return false;
    }

    // 2. Issue type filter
    if (!checkIssueType(issueTypeName, scopeConfig)) {
        return false;
    }

    // 3. Label exclusions
    if (!checkLabels(labels, scopeConfig)) {
        return false;
    }

    // 4. Epic exclusions
    if (!checkEpic(epicKey, scopeConfig)) {
        return false;
    }

    return true;
}

/**
 * Check project inclusion/exclusion
 * @param {string} projectKey 
 * @param {object} scopeConfig 
 * @returns {boolean}
 */
function checkProject(projectKey, scopeConfig) {
    if (!projectKey) return false;

    const { includedProjects, excludedProjects } = scopeConfig;

    // If excluded, reject
    if (excludedProjects?.length > 0 && excludedProjects.includes(projectKey)) {
        return false;
    }

    // If include list is non-empty, project must be in it
    if (includedProjects?.length > 0 && !includedProjects.includes(projectKey)) {
        return false;
    }

    return true;
}

/**
 * Check issue type inclusion/exclusion
 * @param {string} issueTypeName 
 * @param {object} scopeConfig 
 * @returns {boolean}
 */
function checkIssueType(issueTypeName, scopeConfig) {
    if (!issueTypeName) return false;

    const { includedIssueTypes, excludedIssueTypes } = scopeConfig;

    // If excluded, reject
    if (excludedIssueTypes?.length > 0 && excludedIssueTypes.includes(issueTypeName)) {
        return false;
    }

    // If include list is non-empty, type must be in it
    if (includedIssueTypes?.length > 0 && !includedIssueTypes.includes(issueTypeName)) {
        return false;
    }

    return true;
}

/**
 * Check label exclusions
 * @param {Array<string>} labels 
 * @param {object} scopeConfig 
 * @returns {boolean}
 */
function checkLabels(labels, scopeConfig) {
    const { labelExclusions } = scopeConfig;

    if (!labelExclusions?.length) return true;

    // If any excluded label is present, reject
    for (const label of labels) {
        if (labelExclusions.includes(label)) {
            return false;
        }
    }

    return true;
}

/**
 * Check epic exclusions
 * @param {string} epicKey 
 * @param {object} scopeConfig 
 * @returns {boolean}
 */
function checkEpic(epicKey, scopeConfig) {
    const { epicExclusions } = scopeConfig;

    if (!epicExclusions?.length) return true;
    if (!epicKey) return true;

    // If epic is in exclusion list, reject
    if (epicExclusions.includes(epicKey)) {
        return false;
    }

    return true;
}

/**
 * Validate scope configuration
 * @param {object} scopeConfig 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateScopeConfig(scopeConfig) {
    const errors = [];

    if (scopeConfig.includedProjects && !Array.isArray(scopeConfig.includedProjects)) {
        errors.push('includedProjects must be an array');
    }

    if (scopeConfig.excludedProjects && !Array.isArray(scopeConfig.excludedProjects)) {
        errors.push('excludedProjects must be an array');
    }

    if (scopeConfig.includedIssueTypes && !Array.isArray(scopeConfig.includedIssueTypes)) {
        errors.push('includedIssueTypes must be an array');
    }

    if (scopeConfig.excludedIssueTypes && !Array.isArray(scopeConfig.excludedIssueTypes)) {
        errors.push('excludedIssueTypes must be an array');
    }

    if (scopeConfig.labelExclusions && !Array.isArray(scopeConfig.labelExclusions)) {
        errors.push('labelExclusions must be an array');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
