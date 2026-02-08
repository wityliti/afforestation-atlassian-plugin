# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Grow for Jira** - A Jira Forge app that gamifies team workflow by converting completed issues into real trees. Teams earn "Leaves" (virtual currency) when completing Jira issues, which convert to tree planting pledges through the Afforestation.org API.

## Commands

- **Lint**: `npm run lint` - Run ESLint on the codebase
- **Forge CLI**: This is a Forge app, so use `forge` CLI commands (not included in package.json):
  - `forge deploy` - Deploy the app to development environment
  - `forge install` - Install the app on a Jira Cloud site
  - `forge tunnel` - Start local development tunnel for faster iteration
  - `forge logs` - View application logs

## Architecture

### Platform: Atlassian Forge

This is a **Forge app** - Atlassian's serverless platform for building Jira/Confluence apps. Key constraints:
- Runs on AWS Lambda (Node.js 24.x, ARM64)
- Uses Forge APIs (`@forge/api`, `@forge/bridge`, `@forge/resolver`)
- UI components use **Forge React UI Kit** (NOT standard HTML/CSS - uses declarative components like `Box`, `Stack`, `Heading`)
- Storage uses Forge's built-in key-value store (`storage` API)
- All external API calls must be declared in `manifest.yml` permissions

### Module Structure

Three main UI modules defined in `manifest.yml`:

1. **Admin Page** (`src/ui/admin/index.jsx`)
   - Jira Admin settings page
   - Configure completion rules, scoring, funding allocation, privacy
   - Multi-tab interface: Completion Logic, Project Scope, Scoring Formula, Funding, Privacy

2. **Dashboard** (`src/ui/dashboard/index.jsx`)
   - Project-level impact dashboard
   - Shows forest visualization, weekly/monthly stats, team leaderboards
   - Custom Card components with premium styling

3. **Issue Panel** (`src/ui/issue-panel/index.jsx`)
   - Per-issue impact summary sidebar
   - Shows leaves earned and trees planted from specific issue

### Backend Architecture

**Event-Driven Triggers:**
- `handlers/issue-updated.js` - Listens to `avi:jira:updated:issue` events, processes completions
- `handlers/batch-pledge.js` - Weekly scheduled trigger for batching tree pledges

**Resolver Pattern** (`src/resolvers/index.js`):
- Bridge between UI and backend
- Defines async functions callable from React via `invoke('functionName', payload)`
- Examples: `getConfig`, `setConfig`, `getDashboardStats`, `getIssueImpact`

**Service Layer** (`src/services/`):
- `tenant-config.js` - Configuration storage per tenant (cloud ID)
- `completion-detector.js` - Detects when issues are completed based on status changes
- `scope-filter.js` - Filters issues by project/labels/exclusions
- `scorer.js` - Calculates leaves earned (base points + story points × multiplier)
- `ledger.js` - Tracks awards per issue for idempotency
- `aggregation.js` - Maintains daily/weekly/monthly stats and leaderboards
- `funding-allocator.js` - Distributes trees across Afforestation projects
- `afforestation-client.js` - External API client for tree planting catalog and pledges

**Storage Schema:**
- Keys follow pattern: `tenant:{tenantId}:...`
- Config: `tenant:X:config`, `tenant:X:rules`, `tenant:X:funding`
- Awards: `tenant:X:award:{awardId}` (idempotency tracking)
- Issue ledger: `tenant:X:issue:{issueId}:ledger`
- Aggregations: `tenant:X:agg:{period}:{key}` (e.g., `tenant:X:agg:monthly:2026-01`)

### Data Flow Example (Issue Completion)

1. User moves Jira issue to "Done"
2. `issue-updated.js` handler triggered
3. Checks scope filter → completion detection → idempotency
4. `scorer.js` calculates leaves (base + story points)
5. Records award in ledger, updates aggregations
6. If instant planting enabled, calls Afforestation API
7. UI modules fetch updated stats via resolvers

## Key Patterns

- **Idempotency**: Uses deterministic award IDs (`generateAwardId`) to prevent duplicate scoring if issue transitions multiple times
- **Multi-tenancy**: All storage keyed by `tenantId` (Jira Cloud ID)
- **Forge UI Kit**: React components are declarative wrappers, not standard HTML. Use `xcss` prop for styling (limited CSS support)
- **No DOM APIs**: Cannot use `document`, `window`, standard browser APIs - Forge renders serverside
- **Resolver communication**: UI calls backend via `invoke()`, backend exports resolver definitions via `handler`

## Important Considerations

- **Forge React UI Kit limitations**: No standard CSS classes, limited styling via `xcss` prop. Component library is restrictive but ensures Atlassian design consistency.
- **External URLs for icons**: Local static assets had issues with Forge CLI, so icons are loaded from external URLs (GitHub raw).
- **Manifest changes require redeployment**: Changes to `manifest.yml` (permissions, modules, triggers) require `forge deploy`.
- **Storage is eventually consistent**: Forge storage uses DynamoDB, may have slight delays.
- **Error handling**: Handlers should log errors but not throw to avoid automatic retries that could cause duplicate processing.

## Configuration Structure

The tenant config object has this structure:
```javascript
{
  completion: { statusCategory, statusName, reopenPolicy },
  scope: { includedProjects, excludedProjects, labelExclusions },
  scoring: { basePoints, storyPointMultiplier, caps, currencyName },
  funding: { projectCatalogSelection: [{projectId, allocation, constraints}] },
  plantingMode: { conversion: {leavesPerTree}, instantEnabled, pledgeEnabled },
  privacy: { leaderboardMode, userOptInRequired }
}
```
