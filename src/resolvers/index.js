/**
 * Resolver Functions for UI modules
 * 
 * Handles data requests from the Forge UI components
 */

import Resolver from '@forge/resolver';
import { getTenantConfig, setTenantConfig, getRules, setRules, getFunding, setFunding } from '../services/tenant-config';
import { getDashboardAggregations, getUserAgg } from '../services/aggregation';
import { getIssueLedger } from '../services/ledger';
import { previewScore } from '../services/scorer';
import { getCatalogProjects, getCatalogTrees, getPledgeStatus } from '../services/afforestation-client';
import { previewAllocation, validateFundingConfig } from '../services/funding-allocator';

const resolver = new Resolver();

// ============ Configuration Resolvers ============

resolver.define('getConfig', async ({ context }) => {
  const tenantId = context.cloudId;
  return await getTenantConfig(tenantId);
});

resolver.define('setConfig', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  const formData = payload;
  const current = await getTenantConfig(tenantId);
  const updated = mergeFormData(current, formData);
  await setTenantConfig(tenantId, updated);
  return { success: true };
});

resolver.define('getRules', async ({ context }) => {
  const tenantId = context.cloudId;
  return await getRules(tenantId);
});

resolver.define('setRules', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  await setRules(tenantId, payload.rules);
  return { success: true };
});

resolver.define('getFunding', async ({ context }) => {
  const tenantId = context.cloudId;
  return await getFunding(tenantId);
});

resolver.define('setFunding', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  const validation = validateFundingConfig(payload);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  await setFunding(tenantId, payload);
  return { success: true };
});

// ============ Dashboard Resolvers ============

resolver.define('getDashboardStats', async ({ context }) => {
  const tenantId = context.cloudId;
  const aggs = await getDashboardAggregations(tenantId);
  const config = await getTenantConfig(tenantId);
  return {
    aggregations: aggs,
    currencyName: config.scoring?.currencyName || 'Leaves',
    leavesPerTree: config.plantingMode?.conversion?.leavesPerTree || 100,
    plantingMode: config.plantingMode
  };
});

resolver.define('getUserStats', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  const { accountId, periodType, periodKey } = payload;
  return await getUserAgg(tenantId, accountId, periodType, periodKey);
});

// ============ Issue Panel Resolvers ============

resolver.define('getIssueImpact', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  const { issueId } = payload;
  const [ledger, config] = await Promise.all([
    getIssueLedger(tenantId, issueId),
    getTenantConfig(tenantId)
  ]);
  return {
    ledger,
    currencyName: config.scoring?.currencyName || 'Leaves',
    leavesPerTree: config.plantingMode?.conversion?.leavesPerTree || 100
  };
});

resolver.define('previewIssueScore', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  const { issue } = payload;
  const config = await getTenantConfig(tenantId);
  config.tenantId = tenantId;
  return await previewScore(issue, config);
});

// ============ Catalog Resolvers ============

resolver.define('getCatalogProjects', async () => {
  try {
    return await getCatalogProjects();
  } catch (error) {
    console.error('Failed to fetch catalog projects:', error);
    return [];
  }
});

resolver.define('getCatalogTrees', async () => {
  try {
    return await getCatalogTrees();
  } catch (error) {
    console.error('Failed to fetch catalog trees:', error);
    return [];
  }
});

// ============ Preview Resolvers ============

resolver.define('previewAllocation', async ({ payload, context }) => {
  const tenantId = context.cloudId;
  const { totalTrees } = payload;
  const funding = await getFunding(tenantId);
  return previewAllocation(totalTrees, funding);
});

resolver.define('getPledgeStatus', async ({ payload }) => {
  const { pledgeId } = payload;
  return await getPledgeStatus(pledgeId);
});

// ============ Helpers ============

function mergeFormData(config, formData) {
  const updated = { ...config };
  for (const [key, value] of Object.entries(formData)) {
    const parts = key.split('.');
    let target = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    const finalKey = parts[parts.length - 1];
    if (typeof value === 'string' && value.includes(',') &&
      (finalKey.includes('Projects') || finalKey.includes('Types') ||
        finalKey.includes('Names') || finalKey.includes('Exclusions'))) {
      target[finalKey] = value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (typeof value === 'string' && !isNaN(value) && value !== '') {
      target[finalKey] = parseFloat(value);
    } else if (value === 'true' || value === 'false') {
      target[finalKey] = value === 'true';
    } else {
      target[finalKey] = value;
    }
  }
  return updated;
}

export const handler = resolver.getDefinitions();
