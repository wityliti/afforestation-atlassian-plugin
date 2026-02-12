/**
 * Resolver Functions for UI modules
 *
 * Handles data requests from the Forge UI components
 */

import Resolver from '@forge/resolver';
import { storage } from '@forge/api';
import { getTenantConfig, setTenantConfig, getRules, setRules, getFunding, setFunding } from '../services/tenant-config';
import { getDashboardAggregations, getUserAgg, getTopTeams } from '../services/aggregation';
import { getIssueLedger } from '../services/ledger';
import { previewScore } from '../services/scorer';
import { getCatalogProjects, getCatalogTrees, getPledgeStatus, generateAuthToken, checkAuthToken, validateLinkCode, getCompanyStats } from '../services/afforestation-client';
import { previewAllocation, validateFundingConfig } from '../services/funding-allocator';
import { getAccountKey, getPendingTokenKey } from '../services/storage-keys';

const resolver = new Resolver();

const MAIN_APP_URL = 'https://afforestation.org';

const linkAccountWithCode = async (context, linkCode) => {
  const tenantId = context.cloudId;

  if (!linkCode || linkCode.trim().length === 0) {
    return { success: false, error: 'Please enter a link code' };
  }

  try {
    const siteUrl = context.siteUrl || `https://${context.cloudId}.atlassian.net`;
    const result = await validateLinkCode(linkCode.trim(), siteUrl);

    if (result.companyId) {
      const account = {
        isLinked: true,
        companyId: result.companyId,
        companyName: result.companyName
      };
      await storage.set(getAccountKey(tenantId), {
        companyId: result.companyId,
        companyName: result.companyName,
        apiKey: result.apiKey,
        linkedAt: new Date().toISOString()
      });
      return {
        success: true,
        account,
        message: `Successfully linked to ${result.companyName || 'company account'}!`
      };
    }

    return { success: false, error: 'Invalid link code' };
  } catch (error) {
    console.error('Failed to validate link code:', error);
    return {
      success: false,
      error: 'Could not connect to Afforestation. Please try again later.'
    };
  }
};

// ============ Account Resolvers ============

resolver.define('getAccountStatus', async ({ context }) => {
  const tenantId = context.cloudId;
  const account = await storage.get(getAccountKey(tenantId));
  if (account && account.companyId) {
    return {
      isLinked: true,
      companyId: account.companyId,
      companyName: account.companyName
    };
  }
  return { isLinked: false };
});

resolver.define('linkAccount', async ({ payload, context }) => {
  const linkCode = payload?.linkCode || payload?.code;
  return await linkAccountWithCode(context, linkCode);
});

resolver.define('linkWithCode', async ({ payload, context }) => {
  const linkCode = payload?.code || payload?.linkCode;
  return await linkAccountWithCode(context, linkCode);
});

resolver.define('unlinkAccount', async ({ context }) => {
  const tenantId = context.cloudId;
  await storage.delete(getAccountKey(tenantId));
  await storage.delete(getPendingTokenKey(tenantId));
  return { success: true, message: 'Account unlinked successfully' };
});

resolver.define('createSignupToken', async ({ context }) => {
  const tenantId = context.cloudId;
  try {
    const siteUrl = context.siteUrl || `https://${context.cloudId}.atlassian.net`;
    const result = await generateAuthToken('signup', siteUrl, tenantId);

    await storage.set(getPendingTokenKey(tenantId), {
      token: result.token,
      type: 'signup',
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      redirectUrl: `${MAIN_APP_URL}/signup/jira?token=${result.token}`
    };
  } catch (error) {
    console.error('Failed to generate signup token:', error);
    return {
      success: false,
      error: 'Could not generate signup link. Please try again.'
    };
  }
});

resolver.define('createLoginToken', async ({ context }) => {
  const tenantId = context.cloudId;
  try {
    const siteUrl = context.siteUrl || `https://${context.cloudId}.atlassian.net`;
    const result = await generateAuthToken('login', siteUrl, tenantId);

    return {
      success: true,
      redirectUrl: `${MAIN_APP_URL}/auth/jira?token=${result.token}`
    };
  } catch (error) {
    console.error('Failed to generate login token:', error);
    return {
      success: false,
      error: 'Could not generate login link. Please try again.'
    };
  }
});

resolver.define('checkConnection', async ({ context }) => {
  const tenantId = context.cloudId;
  const pending = await storage.get(getPendingTokenKey(tenantId));

  if (!pending || !pending.token) {
    return { linked: false, error: 'No pending connection. Please create an account first.' };
  }

  try {
    const result = await checkAuthToken(pending.token);

    if (result.linked && result.companyId) {
      await storage.set(getAccountKey(tenantId), {
        companyId: result.companyId,
        companyName: result.companyName,
        apiKey: result.apiKey,
        linkedAt: new Date().toISOString()
      });
      await storage.delete(getPendingTokenKey(tenantId));
      return {
        linked: true,
        companyId: result.companyId,
        companyName: result.companyName
      };
    }

    return { linked: false };
  } catch (error) {
    console.error('Failed to check connection:', error);
    return { linked: false, error: 'Could not check connection status.' };
  }
});

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
  const now = new Date();
  const monthKey = now.toISOString().substring(0, 7);
  const topTeams = await getTopTeams(tenantId, 'monthly', monthKey, 5);

  // Fetch real company stats if linked
  let companyStats = null;
  try {
    const account = await storage.get(getAccountKey(tenantId));
    if (account && account.apiKey) {
      const result = await getCompanyStats(account.apiKey);
      if (result.success) {
        companyStats = result.stats;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch company stats for dashboard:', err);
  }

  return {
    aggregations: aggs,
    companyStats,
    topTeams,
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

resolver.define('getCatalogProjects', async ({ context }) => {
  try {
    const tenantId = context.cloudId;
    const account = await storage.get(getAccountKey(tenantId));
    return await getCatalogProjects(account?.apiKey);
  } catch (error) {
    console.error('Failed to fetch catalog projects:', error);
    return [];
  }
});

resolver.define('getCatalogTrees', async ({ context }) => {
  try {
    const tenantId = context.cloudId;
    const account = await storage.get(getAccountKey(tenantId));
    return await getCatalogTrees(account?.apiKey);
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

resolver.define('getPledgeStatus', async ({ payload, context }) => {
  const { pledgeId } = payload;
  const tenantId = context.cloudId;
  const account = await storage.get(getAccountKey(tenantId));
  return await getPledgeStatus(pledgeId, account?.apiKey);
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
