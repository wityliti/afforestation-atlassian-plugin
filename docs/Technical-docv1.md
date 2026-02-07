Below is a **technical spec** you can hand to your coding agent to build the first production-grade version of the Forge Jira app with deep company customization.

---

# Jira × Afforestation Forge App

## Technical Design Document (for Coding Agent)

### Objective

Build an Atlassian Forge app for Jira that:

* Listens to Jira workflow events (status transitions/resolution changes).
* Awards configurable “impact points” and converts them into **tree pledges** and/or **real plantings**.
* Lets each company customize:

  * What “completion” means (**both** status-name and status-category + resolution).
  * Which Jira projects/issue types count.
  * Point formulas, caps, and quality gates (reopen handling).
  * Funding allocation across **Afforestation projects** (which locations/providers/species/categories).
  * Planting mode: **instant plant** and/or **pledge batch**.
* Provides dashboards/leaderboards inside Jira (with privacy modes).

Non-goals (V1):

* Slack/Teams notifications (planned later).
* GitHub/CI signals (future).
* External DB (start with Forge storage; allow migration path).

---

# 1) High-level Architecture

### Components

1. **Forge Trigger Handler**
   Subscribes to Jira issue update events. Detects completion transitions and emits “impact events”.

2. **Rules Engine** (tenant-configured)
   Evaluates event + issue metadata against configured rules to produce outcomes:

   * leaves points
   * tree pledges / plant instructions
   * badge/achievements (optional V1-lite)

3. **Ledger + Aggregation**
   Stores idempotency + issue lifecycle state to avoid double-counting and to support reopen/pause logic.

4. **Funding Allocator**
   Converts “trees to plant” into allocations across selected afforestation projects based on company settings:

   * percentage splits
   * fixed caps per project
   * policy constraints (allowed tree types/species categories)

5. **Afforestation API Client (egress)**
   Calls `api.afforestation.org` endpoints to create:

   * pledge batches
   * plant orders (instant or batch execution)
   * retrieve project catalogs / tree catalog

6. **UI (Jira modules)**

   * Project Page: Impact Dashboard
   * Issue Panel: Issue Impact Card
   * Admin Page: Configuration (rules, mappings, funding, modes)

---

# 2) Core Event Flow

### Jira Event

Use `avi:jira:updated:issue` (issue updated) trigger.

### Completion Detection (both supported)

A completion is true if **any** of the enabled completion strategies matches:

**Strategy A — Status Name**

* If changelog contains field `status` change AND `toStatusName ∈ tenant.doneStatusNames`

**Strategy B — Status Category**

* If `toStatusCategoryKey == "done"` (or configured list) AND enabled

**Strategy C — Resolution**

* If changelog contains `resolution` set (or issue now has resolution) and enabled

**Combined rules**
Tenant selects one of:

* `ANY` (A OR B OR C)
* `ALL` (e.g., status done AND resolution set)
* `CUSTOM` (admin-built expression using rule builder)

### Idempotency and state

Before awarding points, consult issue ledger:

* If already awarded for the same completion signature (issueId + transitionTime + targetStatus), skip.
* If previously completed then reopened and re-completed:

  * handle according to tenant policy (re-award allowed after X days? award reduced? pause?).

---

# 3) Data Model (Forge Storage)

Use namespaced keys per tenant.

## Tenant identity

* `tenantId = jiraCloudId` (from context/install)
* `siteId` or `cloudId` stored on install

## Storage keys

### 3.1 Configuration

* `cfg:{tenantId}:v1` → main config blob
* `rules:{tenantId}:v1` → rules array (JSON)
* `funding:{tenantId}:v1` → funding allocations and allowed catalog items

### 3.2 Ledgers

* `issueLedger:{tenantId}:{issueId}` → per issue state & awarded history
* `awardLedger:{tenantId}:{awardId}` → award idempotency record (awardId deterministic hash)
* `batchLedger:{tenantId}:{batchId}` → pledge batch record state

### 3.3 Aggregations (time buckets)

* `agg:{tenantId}:{periodType}:{periodKey}` → aggregated totals

  * periodType: `daily|weekly|monthly|sprint`
  * periodKey: `YYYY-MM-DD`, `YYYY-Www`, `YYYY-MM`, `sprintId`
* `userAgg:{tenantId}:{accountId}:{periodType}:{periodKey}`
* `teamAgg:{tenantId}:{teamId}:{periodType}:{periodKey}` (optional)

---

# 4) Configuration Schema

## 4.1 Main Config `cfg:{tenantId}:v1`

```json
{
  "version": 1,
  "completion": {
    "mode": "ANY",
    "statusName": { "enabled": true, "doneStatusNames": ["Done", "Resolved"] },
    "statusCategory": { "enabled": true, "doneCategoryKeys": ["done"] },
    "resolution": { "enabled": true, "requiredResolutionNames": [] },
    "reopenPolicy": {
      "enabled": true,
      "pauseIfReopenedWithinDays": 7,
      "reawardAllowed": true,
      "reawardCooldownDays": 14,
      "reawardMultiplier": 0.5
    }
  },
  "scope": {
    "includedProjects": ["ABC", "DEF"],
    "excludedProjects": [],
    "includedIssueTypes": ["Story", "Bug", "Task"],
    "excludedIssueTypes": ["Sub-task"],
    "jqlAllowlist": "",
    "labelExclusions": ["no-impact"],
    "epicExclusions": []
  },
  "scoring": {
    "currencyName": "Leaves",
    "basePoints": 10,
    "storyPointMultiplier": 5,
    "issueTypeWeights": { "Bug": 1.2, "Story": 1.0, "Task": 0.7 },
    "caps": { "perUserPerDay": 200, "perIssueMax": 200 }
  },
  "plantingMode": {
    "instantEnabled": true,
    "pledgeEnabled": true,
    "pledgeBatching": { "frequency": "weekly", "dayOfWeek": 5, "timeHHmm": "18:00" },
    "conversion": { "leavesPerTree": 100 }
  },
  "privacy": {
    "leaderboardMode": "TEAM_ONLY",
    "userOptInRequired": true
  }
}
```

## 4.2 Rules `rules:{tenantId}:v1`

Rules operate after completion detection and scoping.
Each rule: `when` + `if` + `then`.

* `when.event` can include:

  * `issue.completed`
  * `issue.reopened`
  * `issue.created` (future)
* `if` supports field operators.

Example:

```json
[
  {
    "ruleId": "bug-bonus",
    "enabled": true,
    "when": { "event": "issue.completed" },
    "if": [
      { "field": "issueType", "op": "eq", "value": "Bug" },
      { "field": "priority", "op": "in", "value": ["High", "Highest"] }
    ],
    "then": {
      "leavesExpr": "base + (storyPoints ?? 0) * spMult + 15",
      "tags": ["bugfix", "priority"]
    }
  }
]
```

**Expression engine (V1)**
Implement a minimal safe evaluator:

* Variables: `base`, `spMult`, `storyPoints`, `issueTypeWeight`
* Operators: `+ - * / ( ) ?? min max`
* No function calls besides whitelisted `min/max`.

If rule engine fails, fallback to default scoring.

## 4.3 Funding config `funding:{tenantId}:v1`

Company chooses:

* which projects to fund
* allocation strategy
* eligible tree categories/species constraints

```json
{
  "projectCatalogSelection": [
    {
      "projectId": "proj_ka_agro_001",
      "name": "Karnataka Agroforestry",
      "allocation": { "type": "percentage", "value": 60 },
      "constraints": {
        "allowedTreeTypes": ["native", "fruit"],
        "disallowedSpeciesIds": ["species_x"]
      }
    },
    {
      "projectId": "proj_ts_mangrove_002",
      "name": "Telangana Mangroves",
      "allocation": { "type": "percentage", "value": 40 },
      "constraints": { "allowedTreeTypes": ["mangrove"] }
    }
  ],
  "allocationPolicy": {
    "rounding": "floor",
    "minTreesPerProjectPerBatch": 5,
    "carryForwardRemainders": true
  }
}
```

---

# 5) Afforestation API Contract (expected endpoints)

> Coding agent should implement a small client with retries + timeouts.

## 5.1 Catalog

* `GET /v1/catalog/projects` → list projects (id, name, region, types, min order)
* `GET /v1/catalog/trees` → tree types/species metadata

## 5.2 Pledges

* `POST /v1/pledges`
  Body includes tenant, period, totalTrees, allocation breakdown, evidence refs.
* `POST /v1/pledges/{pledgeId}/execute` (optional) → convert pledge to planting order

## 5.3 Instant plant

* `POST /v1/plant-orders`

  * allocations + “reason” metadata (jira evidence)

## 5.4 Evidence links

Send references (no PII beyond Jira IDs unless necessary):

```json
{
  "tenantId": "cloud_123",
  "source": "jira",
  "evidence": {
    "issueId": "10010",
    "issueKey": "ABC-123",
    "projectKey": "ABC",
    "sprintId": "42",
    "completedAt": "2026-02-07T15:20:00Z"
  }
}
```

---

# 6) Algorithms

## 6.1 Scope filter

Reject event if:

* project not in include list (if list not empty)
* project in exclude list
* issueType excluded
* labels include any excluded label
* optional JQL allowlist (future; avoid V1 unless needed)

## 6.2 Completion signature and award idempotency

Generate deterministic `awardId` hash:
`awardId = sha256(tenantId + issueId + completionType + toStatus + completedAtRoundedOrTransitionId)`

Store in `awardLedger`. If exists → skip.

## 6.3 Scoring

Base:

* `base = cfg.scoring.basePoints`
* `sp = storyPoints ?? 0`
* `wIssue = cfg.scoring.issueTypeWeights[issueType] ?? 1.0`

Default score:
`leaves = min(perIssueMax, (base + sp * storyPointMultiplier) * wIssue)`

Apply rule overrides:

* Find matching rules; apply first-match or priority order.
* Rule can override `leavesExpr` or add bonus.

Apply caps:

* per-user-per-day cap: clamp daily userAgg increments.

## 6.4 Convert leaves → trees

If leavesPerTree = 100:

* `trees = floor(leaves / 100)`
* remainder leaves carry forward in user/team totals (optional), but tree creation uses `carryForwardRemainders`.

Maintain per-tenant remainder bucket:

* `remainderLeaves:{tenantId}`

## 6.5 Funding allocation

Given `treesTotal`, allocate by percentages:

* For each project: `trees_i = floor(treesTotal * pct_i/100)`
* If remainders exist, distribute to projects with highest pct (or round-robin)
* Enforce `minTreesPerProjectPerBatch` when batching (otherwise carry forward to next batch)

---

# 7) Planting Modes

## 7.1 Instant Planting

When completion triggers `trees > 0`:

* allocate trees across selected projects
* call `POST /v1/plant-orders`
* store result in issue ledger

## 7.2 Pledge Batching

On completion:

* increase pledge counters in `agg` buckets
* do **not** call plant API immediately
  On schedule:
* create pledge from accumulated totals:

  * totalTrees + allocations
* call `POST /v1/pledges`
  Optionally execute pledge later via admin action.

### Scheduling on Forge

Forge has scheduled triggers (if used) OR implement “lazy batching”:

* create pledge when admin loads dashboard / once per week if time passed.
  Preferred: scheduled trigger if Forge supports it in your plan; otherwise lazy is acceptable V1.

---

# 8) Jira UI Modules

## 8.1 Admin Page (most important)

Sections:

1. **Completion definition**

   * Done status names (multi-select fetched from Jira)
   * Done category enabled toggle
   * Resolution requirement toggle
   * Mode ANY/ALL
   * Reopen policy controls

2. **Scope**

   * Project include/exclude
   * Issue type include/exclude
   * Exclusion labels

3. **Scoring**

   * base points
   * story point multiplier
   * weights by issue type
   * caps

4. **Planting**

   * instant toggle
   * pledge toggle
   * leaves per tree
   * batching frequency
   * remainder policy

5. **Funding**

   * choose projects from Afforestation catalog
   * set allocation percentages
   * constraints (tree types/species)
   * minimum trees per batch per project

6. **Privacy**

   * leaderboard mode
   * opt-in toggle

## 8.2 Project Dashboard

Widgets:

* Trees pledged/planted (this week / sprint / month)
* Leaves earned
* Top teams
* Progress to goal

## 8.3 Issue Panel

* “This issue contributed X leaves”
* If tree planted: show project name
* If pledge: show “counted toward next planting batch”

---

# 9) Security & Privacy

* Store only necessary identifiers:

  * Jira issueId/issueKey, projectKey, accountId

* Avoid storing user display names; fetch on render if needed.

* Provide privacy modes:

  * org-only totals
  * team-only leaderboard
  * user leaderboard opt-in

* Use Forge secure storage patterns; no secrets in storage except encrypted if required.

* Egress allowlist only `api.afforestation.org`.

---

# 10) Observability

Log events:

* completion detected (tenantId, issueId, completion type)
* score computed
* awardId created/ignored
* plant/pledge API response (success/failure codes)
* batch execution outcomes

Maintain a lightweight `errorAgg:{tenantId}:{YYYY-MM-DD}` counter for admin view.

---

# 11) Testing Plan

## Unit tests

* Completion detection across:

  * status name only
  * category only
  * resolution only
  * ANY/ALL modes
* Idempotency
* Reopen policy: pause/reaward/cooldown
* Scoring & caps
* Allocation rounding + remainders

## Integration tests (mock Jira payload)

* Simulate issue update events with changelog
* Validate storage writes
* Mock Afforestation API client for both instant and pledge

---

# 12) Deliverables for Coding Agent

1. Forge app scaffold with:

* `manifest.yml` modules: trigger, UI pages, permissions, egress
* handler: `onIssueUpdated`

2. Core services:

* `tenantConfigService` (get/set config)
* `completionDetector`
* `scopeFilter`
* `rulesEngine` (safe evaluator)
* `ledgerService` (issueLedger, awardLedger)
* `aggregationService`
* `fundingAllocator`
* `afforestationApiClient`

3. UI:

* Admin config UI with validation + save
* Project dashboard UI (read-only from aggregations)
* Issue panel UI

---

# 13) Implementation Notes (important)

* Start with **Forge Storage KVS**; keep all schemas versioned.
* Always use deterministic `awardId` to prevent duplicates.
* Make config defaults sane:

  * completion ANY
  * doneCategory enabled
  * instant off by default, pledge on by default (cost control)
* Funding allocation must validate percentages sum to 100.
* Provide a “dry run” preview in admin:

  * pick a sample issue key → show what would happen.

---


https://developer.atlassian.com/platform/forge/getting-started/
