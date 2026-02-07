/**
 * Afforestation API Client
 * 
 * Client for interacting with api.afforestation.org
 * per spec section 5
 */

import { fetch } from '@forge/api';

const API_BASE_URL = 'https://api.afforestation.org';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

/**
 * Get catalog of available planting projects
 * @returns {Promise<Array>}
 */
export async function getCatalogProjects() {
    return await apiRequest('GET', '/v1/catalog/projects');
}

/**
 * Get catalog of tree types
 * @returns {Promise<Array>}
 */
export async function getCatalogTrees() {
    return await apiRequest('GET', '/v1/catalog/trees');
}

/**
 * Create a pledge (batch of tree commitments)
 * @param {object} pledgeData 
 * @returns {Promise<{ success: boolean, pledgeId: string, error?: string }>}
 */
export async function createPledge(pledgeData) {
    try {
        const response = await apiRequest('POST', '/v1/pledges', {
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
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string }>}
 */
export async function executePledge(pledgeId) {
    try {
        const response = await apiRequest('POST', `/v1/pledges/${pledgeId}/execute`);

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
 * @returns {Promise<{ success: boolean, orderId?: string, error?: string }>}
 */
export async function createPlantOrder(orderData) {
    try {
        const response = await apiRequest('POST', '/v1/orders/plant', {
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
 * @returns {Promise<object>}
 */
export async function getPledgeStatus(pledgeId) {
    return await apiRequest('GET', `/v1/pledges/${pledgeId}`);
}

/**
 * Get order status
 * @param {string} orderId 
 * @returns {Promise<object>}
 */
export async function getOrderStatus(orderId) {
    return await apiRequest('GET', `/v1/orders/${orderId}`);
}

/**
 * Make API request with retry logic
 * @param {string} method 
 * @param {string} path 
 * @param {object} options 
 * @returns {Promise<object>}
 */
async function apiRequest(method, path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Source': 'jira-forge-app',
                    'X-Request-Id': generateRequestId()
                },
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
