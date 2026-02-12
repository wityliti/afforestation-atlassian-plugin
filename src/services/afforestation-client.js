/**
 * Afforestation API Client
 *
 * Client for interacting with afforestation.org
 * per spec section 5
 */

import { fetch } from '@forge/api';

const API_BASE_URL = 'https://api.afforestation.org';
const AUTH_BASE_URL = 'https://afforestation.org';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

// ============ Account & Auth ============

/**
 * Generate an auth token for signup or login
 * @param {'signup'|'login'} type
 * @param {string} siteUrl - Jira site URL
 * @param {string} cloudId - Atlassian cloud ID
 * @returns {Promise<{ token: string }>}
 */
export async function generateAuthToken(type, siteUrl, cloudId) {
    return await apiRequest('POST', '/api/jira/generate-token', {
        body: { type, siteUrl, cloudId },
        baseUrl: AUTH_BASE_URL
    });
}

/**
 * Check if an auth token has been linked to a company account
 * @param {string} token
 * @returns {Promise<{ linked: boolean, companyId?: number, companyName?: string, apiKey?: string }>}
 */
export async function checkAuthToken(token) {
    return await apiRequest('POST', '/api/jira/check-token', {
        body: { token },
        baseUrl: AUTH_BASE_URL
    });
}

/**
 * Validate a link code and get company details
 * @param {string} linkCode
 * @param {string} siteUrl
 * @returns {Promise<{ companyId: number, companyName: string, apiKey: string }>}
 */
export async function validateLinkCode(linkCode, siteUrl) {
    try {
        return await apiRequest('POST', '/api/jira/validate-link', {
            body: { linkCode, siteUrl },
            baseUrl: AUTH_BASE_URL
        });
    } catch (error) {
        // Handle 404 which the API returns for invalid codes
        if (error.message && error.message.includes('HTTP 404')) {
            console.warn('Validate link returned 404 (likely invalid code)');
            return { error: 'Invalid link code' };
        }
        throw error;
    }
}

/**
 * Get company stats (trees, CO2, goals)
 * @param {string} apiKey
 * @returns {Promise<object>}
 */
export async function getCompanyStats(apiKey) {
    try {
        const response = await apiRequest('GET', '/api/jira/stats', { 
            apiKey,
            baseUrl: AUTH_BASE_URL 
        });
        return {
            success: true,
            stats: response.stats
        };
    } catch (error) {
        console.warn('Failed to fetch company stats:', error);
        return { success: false, error: error.message };
    }
}

// ============ Catalog ============

/**
 * Get catalog of available planting projects
 * @param {string} [apiKey]
 * @returns {Promise<Array>}
 */
export async function getCatalogProjects(apiKey) {
    return await apiRequest('GET', '/v1/catalog/projects', { apiKey });
}

/**
 * Get catalog of tree types
 * @param {string} [apiKey]
 * @returns {Promise<Array>}
 */
export async function getCatalogTrees(apiKey) {
    return await apiRequest('GET', '/v1/catalog/trees', { apiKey });
}

// ============ Pledges ============

/**
 * Create a pledge (batch of tree commitments)
 * @param {object} pledgeData
 * @param {string} [apiKey]
 * @returns {Promise<{ success: boolean, pledgeId: string, error?: string }>}
 */
export async function createPledge(pledgeData, apiKey) {
    try {
        const response = await apiRequest('POST', '/v1/pledges', {
            apiKey,
            body: {
                source: 'jira-forge-app',
                tenantId: pledgeData.tenantId,
                period: pledgeData.period,
                totalTrees: pledgeData.totalTrees,
                totalLeaves: pledgeData.totalLeaves,
                allocations: pledgeData.allocations.map(a => ({
                    projectId: a.projectId,
                    trees: a.trees
                })),
                evidence: pledgeData.evidence,
                metadata: {
                    createdAt: new Date().toISOString()
                }
            }
        });

        return {
            success: true,
            pledgeId: response.id,
            status: response.status
        };
    } catch (error) {
        console.error('[AfforestationClient] Create pledge error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Execute a pledge (trigger actual planting order)
 * @param {string} pledgeId
 * @param {string} [apiKey]
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string }>}
 */
export async function executePledge(pledgeId, apiKey) {
    try {
        const response = await apiRequest('POST', `/v1/pledges/${pledgeId}/execute`, { apiKey });

        return {
            success: true,
            orderId: response.orderId,
            status: response.status
        };
    } catch (error) {
        console.error('[AfforestationClient] Execute pledge error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create an instant plant order (single tree)
 * @param {object} orderData
 * @param {string} [apiKey]
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string }>}
 */
export async function createPlantOrder(orderData, apiKey) {
    try {
        const response = await apiRequest('POST', '/v1/orders/plant', {
            apiKey,
            body: {
                source: 'jira-forge-app',
                tenantId: orderData.tenantId,
                projectId: orderData.projectId,
                trees: orderData.trees || 1,
                reference: {
                    issueKey: orderData.issueKey,
                    issueId: orderData.issueId,
                    awardId: orderData.awardId
                },
                metadata: {
                    createdAt: new Date().toISOString()
                }
            }
        });

        return {
            success: true,
            orderId: response.id,
            status: response.status,
            treeId: response.treeId
        };
    } catch (error) {
        console.error('[AfforestationClient] Create plant order error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get pledge status
 * @param {string} pledgeId
 * @param {string} [apiKey]
 * @returns {Promise<object>}
 */
export async function getPledgeStatus(pledgeId, apiKey) {
    return await apiRequest('GET', `/v1/pledges/${pledgeId}`, { apiKey });
}

/**
 * Get order status
 * @param {string} orderId
 * @param {string} [apiKey]
 * @returns {Promise<object>}
 */
export async function getOrderStatus(orderId, apiKey) {
    return await apiRequest('GET', `/v1/orders/${orderId}`, { apiKey });
}

// ============ Internal ============

/**
 * Make API request with retry logic
 * @param {string} method
 * @param {string} path
 * @param {object} options
 * @returns {Promise<object>}
 */
async function apiRequest(method, path, options = {}) {
    const baseUrl = options.baseUrl || API_BASE_URL;
    const url = `${baseUrl}${path}`;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Source': 'jira-forge-app',
                'X-Request-Id': generateRequestId()
            };

            if (options.apiKey) {
                headers['Authorization'] = `Bearer ${options.apiKey}`;
            }

            const fetchOptions = {
                method,
                headers,
                signal: controller.signal
            };

            if (options.body) {
                fetchOptions.body = JSON.stringify(options.body);
            }

            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            lastError = error;
            console.warn(`[AfforestationClient] Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

            // Don't retry on 4xx errors (client errors)
            if (error.message?.includes('HTTP 4')) {
                throw error;
            }

            // Exponential backoff
            if (attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Generate request ID for tracing
 * @returns {string}
 */
function generateRequestId() {
    return `jira-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sleep utility
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
