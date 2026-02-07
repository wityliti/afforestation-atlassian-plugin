# Jira × Afforestation Forge App - Implementation Plan

## Spec Review Summary

### Spec Validation ✅

After reviewing the Technical Design Document (Technical-docv1.md) against Atlassian Forge documentation, all proposed features are technically feasible:

| Feature | Forge Support | Notes |
|---------|--------------|-------|
| Issue Update Events | ✅ `avi:jira:updated:issue` | Includes changelog with status/resolution changes |
| Key-Value Storage | ✅ `@forge/api` storage | Versioned schemas, 32KB value limit |
| Scheduled Triggers | ✅ `scheduledTrigger` | Supports `week`/`day` intervals for pledge batching |
| Admin Page | ✅ `jira:adminPage` | Full custom UI with subpages |
| Project Page | ✅ `jira:projectPage` | For dashboard in project nav |
| Issue Panel | ✅ `jira:issuePanel` | Display impact per issue |
| External API Calls | ✅ Egress allowlist | Configurable in manifest.yml |

### Spec Considerations

> [!NOTE]
> **Forge Storage Limits**: Values are capped at 32KB. Large aggregation buckets may need pagination.

> [!IMPORTANT]
> **Scheduled Trigger Granularity**: Forge only supports `fiveMinute`, `hour`, `day`, `week` intervals - not specific times like "18:00 on Fridays". The spec's `pledgeBatching.timeHHmm` setting won't work exactly as designed. Recommend simplifying to `weekly` interval.

> [!WARNING]
> **Expression Evaluator Security**: The spec proposes a custom expression engine. This needs careful implementation to prevent injection attacks. Recommend a strict AST parser with only whitelisted operations.

---

## Proposed Changes

### Foundation

#### [NEW] [manifest.yml](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/manifest.yml)

Forge app manifest defining:
- App metadata and permissions (`read:jira-work`, `storage:app`, etc.)
- Trigger module for `avi:jira:updated:issue`
- Scheduled trigger for weekly pledge batch processing
- `jira:adminPage` for configuration
- `jira:projectPage` for dashboard
- `jira:issuePanel` for issue impact display
- Egress allowlist: `api.afforestation.org`

#### [NEW] [package.json](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/package.json)

Node.js dependencies including:
- `@forge/api` - Storage, fetch, Jira API
- `@forge/ui` - UI Kit 2 components
- `@forge/resolver` - Function resolvers

#### [NEW] [src/index.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/index.js)

Main entry point exporting all handlers and resolvers.

---

### Core Services

#### [NEW] [src/services/storage-keys.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/storage-keys.js)

Storage key generation utilities:
```javascript
// Key structure following spec section 3.2
getConfigKey(tenantId)       // → cfg:{tenantId}:v1
getRulesKey(tenantId)        // → rules:{tenantId}:v1
getFundingKey(tenantId)      // → funding:{tenantId}:v1
getIssueLedgerKey(tenantId, issueId)
getAwardLedgerKey(tenantId, awardId)
getAggKey(tenantId, periodType, periodKey)
getUserAggKey(tenantId, accountId, periodType, periodKey)
```

#### [NEW] [src/services/tenant-config.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/tenant-config.js)

Configuration management:
- `getConfig(tenantId)` - Retrieve with defaults
- `setConfig(tenantId, config)` - Validate and save
- `DEFAULT_CONFIG` - Sane defaults per spec section 13

#### [NEW] [src/services/ledger.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/ledger.js)

Ledger operations:
- `getIssueLedger(tenantId, issueId)` - Issue completion history
- `updateIssueLedger(tenantId, issueId, entry)`
- `checkAwardExists(tenantId, awardId)` - Idempotency check
- `recordAward(tenantId, awardId, data)`

#### [NEW] [src/services/aggregation.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/aggregation.js)

Aggregation operations:
- `incrementAgg(tenantId, periodType, periodKey, leaves, trees)`
- `incrementUserAgg(tenantId, accountId, periodType, periodKey, leaves)`
- `getAgg(tenantId, periodType, periodKey)`
- `getUserAgg(tenantId, accountId, periodType, periodKey)`

---

### Event Processing

#### [NEW] [src/handlers/issue-updated.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/handlers/issue-updated.js)

Main trigger handler:
1. Extract tenant context (cloudId)
2. Parse changelog for status/resolution changes
3. Call completion detector
4. If completion detected:
   - Check scope filter
   - Check idempotency
   - Calculate score
   - Record award
   - Update aggregations
   - Process planting (instant or pledge)

#### [NEW] [src/services/completion-detector.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/completion-detector.js)

Completion detection per spec section 2:
- Strategy A: Status name matching
- Strategy B: Status category matching (`done`)
- Strategy C: Resolution field set
- Mode support: `ANY`, `ALL`, `CUSTOM`
- Reopen detection via status category reverting

#### [NEW] [src/services/scope-filter.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/scope-filter.js)

Filtering per spec section 6.1:
- Project include/exclude lists
- Issue type include/exclude
- Label exclusions
- Epic exclusions (optional V1)

---

### Scoring Engine

#### [NEW] [src/services/rules-engine.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/rules-engine.js)

Rules evaluation per spec section 4.2:
- Rule matching (`when`, `if` conditions)
- Field operators: `eq`, `in`, `contains`
- Expression evaluation for `then.leavesExpr`
- Fallback to default scoring on error

#### [NEW] [src/services/expression-evaluator.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/expression-evaluator.js)

Safe expression evaluator per spec section 4.2:
- Allowed variables: `base`, `spMult`, `storyPoints`, `issueTypeWeight`
- Allowed operators: `+ - * / ( ) ?? min max`
- No arbitrary function calls
- AST-based parsing (not `eval`)

#### [NEW] [src/services/scorer.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/scorer.js)

Scoring algorithm per spec section 6.3:
```javascript
// Default formula
leaves = min(perIssueMax, (base + sp * storyPointMultiplier) * wIssue)
```
- Apply rule overrides
- Enforce per-user-per-day caps

---

### Planting Integration

#### [NEW] [src/services/afforestation-client.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/afforestation-client.js)

API client per spec section 5:
- `getCatalogProjects()` - Fetch available projects
- `getCatalogTrees()` - Fetch tree types
- `createPledge(data)` - Create pledge batch
- `executePledge(pledgeId)` - Execute pledge
- `createPlantOrder(data)` - Instant planting
- Retry logic with exponential backoff
- Timeout handling (30s default)

#### [NEW] [src/services/funding-allocator.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/services/funding-allocator.js)

Funding allocation per spec section 6.5:
- Percentage-based distribution
- Floor rounding with remainder tracking
- Minimum trees per project enforcement
- Carry-forward remainder support

#### [NEW] [src/handlers/batch-pledge.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/handlers/batch-pledge.js)

Weekly scheduled trigger handler:
1. Query all tenants with pledge batching enabled
2. For each tenant:
   - Calculate accumulated trees from aggregations
   - Allocate across projects
   - Create pledge via API
   - Reset counters or mark as processed

---

### UI Modules

#### [NEW] [src/ui/admin/index.jsx](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/ui/admin/index.jsx)

Admin configuration page with sections per spec section 8.1:
- Completion definition (status names, categories, resolution, reopen policy)
- Scope (projects, issue types, labels)
- Scoring (base points, multipliers, weights, caps)
- Planting mode (instant/pledge toggles, conversion rate)
- Funding (project selection, allocation percentages, constraints)
- Privacy (leaderboard mode, opt-in)

#### [NEW] [src/ui/dashboard/index.jsx](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/ui/dashboard/index.jsx)

Project dashboard per spec section 8.2:
- Trees pledged/planted (weekly, monthly)
- Leaves earned totals
- Top contributors (respecting privacy settings)
- Progress toward goal visualization

#### [NEW] [src/ui/issue-panel/index.jsx](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/ui/issue-panel/index.jsx)

Issue panel per spec section 8.3:
- Leaves contributed by this issue
- Tree planted indicator (if instant)
- Pledge batch indicator (if batched)

#### [NEW] [src/resolvers/index.js](file:///Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin/src/resolvers/index.js)

UI resolvers:
- `getConfig` / `setConfig` - Admin configuration
- `getAggregations` - Dashboard data
- `getIssueImpact` - Issue panel data
- `getProjects` / `getIssueTypes` - Jira metadata for dropdowns
- `getCatalogProjects` - Afforestation project catalog

---

## File Structure

```
afforestation-atlassian-plugin/
├── manifest.yml
├── package.json
├── docs/
│   ├── Technical-docv1.md
│   └── implementation_plan.md
├── src/
│   ├── index.js
│   ├── handlers/
│   │   ├── issue-updated.js
│   │   └── batch-pledge.js
│   ├── services/
│   │   ├── storage-keys.js
│   │   ├── tenant-config.js
│   │   ├── ledger.js
│   │   ├── aggregation.js
│   │   ├── completion-detector.js
│   │   ├── scope-filter.js
│   │   ├── rules-engine.js
│   │   ├── expression-evaluator.js
│   │   ├── scorer.js
│   │   ├── afforestation-client.js
│   │   └── funding-allocator.js
│   ├── resolvers/
│   │   └── index.js
│   └── ui/
│       ├── admin/
│       │   └── index.jsx
│       ├── dashboard/
│       │   └── index.jsx
│       └── issue-panel/
│           └── index.jsx
└── test/
    ├── unit/
    │   ├── completion-detector.test.js
    │   ├── scope-filter.test.js
    │   ├── scorer.test.js
    │   ├── expression-evaluator.test.js
    │   └── funding-allocator.test.js
    └── integration/
        ├── issue-updated.test.js
        └── afforestation-client.test.js
```

---

## Verification Plan

### Automated Tests

Unit tests will be created in `test/unit/` using Jest (Forge's default test framework).

**Run all unit tests:**
```bash
cd /Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin
npm test
```

#### Test Coverage:

| Module | Test Cases |
|--------|------------|
| `completion-detector` | Status name match, category match, resolution match, ANY mode, ALL mode, reopen detection |
| `scope-filter` | Project include/exclude, issue type filtering, label exclusions |
| `scorer` | Base scoring, story point multiplier, issue type weights, per-issue caps, per-user-per-day caps |
| `expression-evaluator` | Arithmetic ops, min/max, null coalescing, variable substitution, invalid expression handling |
| `funding-allocator` | Percentage distribution, floor rounding, minimum tree enforcement, remainder carry-forward |
| `ledger` | Award ID generation (SHA256), idempotency checks |

### Manual Verification

> [!NOTE]
> These tests require a Jira Cloud development site. The Forge CLI provides `forge tunnel` for local development.

**1. Development Environment Setup:**
```bash
# Install Forge CLI globally
npm install -g @forge/cli

# Login to Atlassian (requires API token)
forge login

# Install dependencies
cd /Users/youthocrat/Desktop/Afforestation/afforestation-atlassian-plugin
npm install

# Register the app
forge register

# Deploy to development environment
forge deploy

# Install on your Jira development site
forge install
```

**2. Admin Configuration Test:**
1. Navigate to Jira Admin → Apps → Afforestation Settings
2. Configure completion detection (select "Done" status)
3. Set scoring parameters (base: 10, SP multiplier: 5)
4. Save configuration
5. Verify settings persist after page refresh

**3. Issue Completion Flow Test:**
1. Create a test issue in a configured project
2. Set story points to 3
3. Transition issue to "Done"
4. Open issue panel
5. Verify leaves displayed: `(10 + 3*5) * 1.0 = 25 leaves`

**4. Dashboard Test:**
1. Complete several issues
2. Navigate to Project → Afforestation Dashboard
3. Verify aggregated leaves/trees display correctly

**5. Tunnel Development (live reload):**
```bash
forge tunnel
```
This enables hot-reloading during development without redeploying.

---

## Implementation Sequence

1. **Phase 1 (Foundation)**: Scaffold, manifest, storage keys, config service
2. **Phase 2 (Event Core)**: Issue update handler, completion detector, scope filter
3. **Phase 3 (Scoring)**: Scorer, rules engine, expression evaluator
4. **Phase 4 (Planting)**: API client, funding allocator, instant/pledge flows
5. **Phase 5 (UI)**: Admin page, issue panel, project dashboard
6. **Phase 6 (Polish)**: Testing, error handling, observability, documentation

---

## Questions for User Review

1. **Afforestation API**: Is there existing API documentation or a staging endpoint for `api.afforestation.org`? This is needed to implement the client.

2. **UI Framework**: Should we use UI Kit 2 (React-like, Atlassian-hosted) or Custom UI (full React with custom hosting)? UI Kit 2 is simpler but more restrictive.

3. **Scheduled Trigger Timing**: Forge only supports `week` interval without specific day/time. Is weekly batching acceptable, or should we implement "lazy batching" triggered on admin dashboard load?

4. **Test Environment**: Do you have a Jira Cloud developer site set up, or should I include setup instructions?
