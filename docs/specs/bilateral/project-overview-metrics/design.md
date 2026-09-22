# Module Spec — `bilateral/project-overview-metrics` — Design

## 1. Summary

Add one column (`is_replicated`) to the existing `getResultsByBilateralCenter` SQL, add the matching field to the client's `BilateralCenterResult` interface, and compute two new per-project aggregates (replicated count, new-for-review count) client-side in `BilateralProjectsPanelComponent`, rendered on each project card/row. No new endpoint, no migration, no entity change. The biggest accepted trade-off: metric #3 (W1/W2 contributor count) is out of scope (see `requirements.md` §3) because no data-model link exists for it — this design only covers metrics #1/#2.

Requirements covered: `BIL-POM-R-1` through `BIL-POM-R-6`, `BIL-POM-R-10`. See `docs/specs/bilateral/project-overview-metrics/requirements.md`.

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `BIL-POM-P-1` | `Result.is_replicated` is a boolean column on the `result` table, already populated by phase rollover | `onecgiar-pr-server/src/api/results/entities/result.entity.ts:473-478` | Read the entity decorator | `verified` | Column name/type differs — adjust the SELECT and interface accordingly |
| `BIL-POM-P-2` | `getResultsByBilateralCenter` (the query behind `GET bilateral-center-results`) does not currently select `is_replicated`, and its `SELECT`/`FROM`/`WHERE` structure is exactly as read | `onecgiar-pr-server/src/api/results/result.repository.ts:4051-4160` | Read the full method body (lines 4051-4160) in this session | `verified` | N/A — read directly, not inferred |
| `BIL-POM-P-3` | `PendingReview` status has numeric value `5` | `onecgiar-pr-server/src/shared/constants/result-status.enum.ts:9-12` | Read the enum class in this session | `verified` | Adjust `BIL-POM-R-3`'s filter value |
| `BIL-POM-P-4` | `BilateralProjectsPanelComponent.results()` already loads the full `BilateralCenterResult[]` for the active center + phase via `BilateralOverviewService.resultsData`, and `resultsCountByProject` already demonstrates the per-`project_id` `Map` aggregation pattern this design extends | `onecgiar-pr-client/.../bilateral-projects-panel.component.ts:83-100` | Read the component in this session | `verified` | Aggregation would need a different data source — re-open design |
| `BIL-POM-P-5` | The "new for review" business rule (`is_replicated = false AND status_id = 5`) matches Nicoleta's intent | The ticket's mockup screenshot only, no explicit rule statement | Not verified against real center data | `assumed` | Adjust `BIL-POM-R-3`; flagged as `BIL-POM-OQ-3` in requirements, blocks the AC-2/AC-3 "done" mark, not the code itself |
| `BIL-POM-P-6` | `BilateralCenterResult` has no other consumer that would break by gaining an optional field | `bilateral-center-result.interface.ts` docstring: consumed by "the Results tab and the pure Overview/filter modules" | Read the interface docstring in this session; did not grep every consumer file body | `assumed` | A strict-mode consumer destructuring the full shape could need a type assertion update — cheap fix if found during implementation |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/` only — `result.repository.ts` (`getResultsByBilateralCenter`). No new module, no new controller method (the existing `GET bilateral-center-results` response shape gains one field).
- **Client modules touched:** `pages/bilateral/` — `bilateral-center-result.interface.ts` (interface), `bilateral-home/components/bilateral-projects-panel/` (component + template).
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

```
[BilateralProjectsPanelComponent]
  └── effect() → BilateralOverviewService.load(centerKey, versionId)
        └── BilateralApiService.GET_bilateralCenterResults(centerId, versionId)
              └── GET /api/results/bilateral-center-results?centerId=&versionId=
                    └── ResultsController.getBilateralCenterResults
                          └── ResultsService.getBilateralCenterResults
                                └── ResultRepository.getResultsByBilateralCenter
                                      (SELECT now includes r.is_replicated)
  └── results() signal updates
        ├── resultsCountByProject (existing) — total per project_id
        ├── replicatedCountByProject (NEW) — count where is_replicated = true, per project_id
        └── newForReviewCountByProject (NEW) — count where is_replicated = false AND status_id = 5, per project_id
  └── template renders three counts per bpp_card / table row
```

No new request/response round-trip — the three signals derive from the one already-loaded `results()` array, exactly as `resultsCountByProject` does today.

---

## 3. Data Model Changes

### 3.1 Entities

No entity change. `Result.is_replicated` already exists (`BIL-POM-P-1`).

### 3.2 Migrations

None.

### 3.3 CLARISA / external-data implications

None.

---

## 4. API Surface

### 4.1 New / changed endpoints

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/bilateral-center-results` (existing — no path/method change) |
| **Version** | `api` |
| **Auth** | JWT required (existing — unchanged; this is not a `/api/bilateral/*` public route) |
| **Role** | Unchanged — same as today |
| **Request DTO** | Unchanged — `centerId` (string), `versionId` (string) query params |
| **Response DTO** | Response array gains one field per row: `is_replicated: boolean` |
| **Errors** | Unchanged |
| **Telemetry** | Unchanged — no new logging needed for a SELECT-column addition |

### 4.2 Bilateral / platform-report impact

None. `bilateral-center-results` is an internal endpoint under `/api/results/*` consumed only by the Angular client — it is **not** part of the `/api/bilateral/*` external contract, so `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` is not touched.

---

## 5. Server Workflow / Business Rules

- **Controller (`ResultsController.getBilateralCenterResults`):** no change — still passes `centerId`/`versionId` through.
- **Service (`ResultsService.getBilateralCenterResults`):** no change — still validates and delegates.
- **Repository (`ResultRepository.getResultsByBilateralCenter`):** add `r.is_replicated` to the `SELECT` list (alongside `r.creation_method`, before `rc.is_leading_result` — no new join, no new WHERE clause, no new bind parameter).
- **Transactions:** none — read-only query, unchanged.
- **Concurrency:** none — no write path touched.
- **Background jobs:** none.
- **Cross-module side effects:** none.

No project-level workflow (W1..W8) changes — this is a read-projection addition to an existing reporting query.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `BilateralProjectsPanelComponent` (already routed under `/bilateral/:acronym/home`) is extended in place.

### 6.2 Components & services

- **`bilateral-center-result.interface.ts`:** add `is_replicated: boolean` (matches server's new field; not optional, since the server always returns it going forward).
- **`bilateral-projects-panel.component.ts`:** add two `computed<Map<number, number>>` signals, `replicatedCountByProject` and `newForReviewCountByProject`, following the exact shape of the existing `resultsCountByProject` (`BIL-POM-P-4`):

  ```
  replicatedCountByProject = computed(() =>
    countBy(results(), r => r.is_replicated === true))

  newForReviewCountByProject = computed(() =>
    countBy(results(), r => r.is_replicated === false && r.status_id === 5))
  ```

  (Pseudocode only, per Code Suppression — implementation writes the actual TypeScript.) Two small public getter methods (`getProjectReplicatedCount(project)`, `getProjectNewForReviewCount(project)`) mirror `getProjectResultsCount(project)` for template use.
- **No new API method** — both signals derive from data `BilateralOverviewService.resultsData` already fetches.
- **State boundary:** component-local computed signals, same as `resultsCountByProject` today — no promotion to a shared service needed for two derived counts.

### 6.3 Design system usage

- Two new badges alongside the existing `bpp_results_badge` on each `bpp_card` (grid) and `bpp_td_results` cell (list) — same Tailwind-first styling convention (`docs/ux-ui/design.md` §8), no new SCSS file, no new hex literals.
- Icons: reuse `pi-file`/similar `primeicons` glyphs already used in the panel (e.g. a refresh/replicate icon for "replicated", a bell/new icon for "new for review") — no new icon library.
- Responsive: the badges sit in the existing card header/footer flex rows (`bpp_card_head_right`, `bpp_card_footer`) — no new breakpoint behavior beyond what those rows already handle.
- A11y: each new badge gets an `aria-label` stating the full count + meaning, mirroring the existing `[attr.aria-label]="getProjectResultsCount(project) + ' results for ' + ..."` pattern (`BIL-POM-R-... ` NFR accessibility row).
- i18n: plain English labels ("Replicated", "New for review"), consistent with the rest of the panel, which is not currently P22/P25-keyed (`requirements.md` §7 i18n row).

### 6.4 Real-time / notification UX

None — no socket/Pusher event changes.

---

## 7. Security & Authorization

- No change to JWT/role posture — `bilateral-center-results` keeps its existing auth requirements.
- No new external input — the two new counts are derived client-side from data already authorized and returned.
- No secrets, tokens, or PII involved in the new field (`is_replicated` is a boolean flag).

---

## 8. Performance & Capacity

- Adding one boolean column to an existing `SELECT` over an already-joined row set: no new join, no new subquery, no measurable latency change.
- No new HTTP round-trip; the client already fetches the full result set for the aggregate count.
- No caching strategy change.

---

## 9. Observability

- No new structured logs needed for a read-projection field addition.
- No DynamoDB log usage.
- No SLO metric this design directly moves (internal reporting UI, not part of `docs/prd.md` M3.x bilateral consumer metrics).

---

## 10. Testing Plan (forward-looking)

- **Server:** extend `result.repository.spec.ts` (or add a case if none exists for `getResultsByBilateralCenter`) asserting the returned rows include `is_replicated` mapped from the DB column — verify with a fixture row where the flag is `true` and one where it's `false`.
- **Client unit (Jest):** extend `bilateral-projects-panel.component.spec.ts` with cases for `replicatedCountByProject` / `newForReviewCountByProject`: mixed `is_replicated`/`status_id` rows across two projects, asserting per-project counts and the mutual-exclusivity rule (`BIL-POM-AC-3`).
- **Client unit (Jest):** template rendering test — badges show the right numbers for a given `projects()`/`results()` fixture pair.
- Coverage: no new module — existing `bilateral-projects-panel` and `result.repository` test files absorb the new cases; no threshold uplift expected to be needed given the small surface.

---

## 11. Backwards Compatibility & Migration Plan

- **API contract:** additive field on an internal endpoint. No `v2` rollout needed (not part of the versioned bilateral/platform-report contract).
- **Feature flag:** none needed — this is a pure reporting addition, safe to ship directly.
- **Data backfill:** none — `is_replicated` is already populated by the existing phase-rollover mechanism (`shared/extendsGlobalDTO/replicable-repository.ts`); this design only starts *reading* a column that already has correct historical values.
- **Communication plan:** none needed — no downstream (bilateral/platform-report) consumer sees this field.

---

## 12. Design Decisions (ADRs)

### `BIL-POM-DD-1` — Compute the two new counts client-side, not via a new server aggregate endpoint

- **Context:** The pooled/Science-Program equivalent (`result-framework-reporting`) computes `replicatedResults`/`newResults` server-side (`results.service.ts` ~L1700-1900) as a dedicated aggregate. Bilateral's existing aggregate (`resultsCountByProject`) is computed client-side from the already-loaded row list instead.
- **Decision:** Follow bilateral's own existing pattern (client-side aggregation over `results()`), not pooled's pattern (server-side aggregate).
- **Alternatives considered:**
  1. Add a new server aggregate endpoint mirroring pooled's — rejected: bilateral's row list is already small enough (per-center, per-phase) to aggregate client-side, and the existing `resultsCountByProject` precedent in the same component would become inconsistent if the new counts used a different data path.
  2. Extend `getResultsByBilateralCenter` to return pre-aggregated counts instead of raw rows — rejected: the endpoint is also consumed as a raw list by the Results tab (`bilateral-results-list.component.ts`, per the interface's own docstring); changing its shape to aggregate-only would break that consumer.
- **Consequences:** No new endpoint, no new DTO, smallest possible diff. Trade-off: if the per-center result count ever grows large enough that client-side aggregation becomes a real cost, this decision should be revisited — not a concern at today's bilateral project/result volumes.

### `BIL-POM-DD-2` — Metric #3 (W1/W2 contributor count) is out of scope, not stubbed with a placeholder

- **Context:** Nicoleta's ticket asked for three metrics; only two have a data source today (see `requirements.md` Out of Scope, `proposal.md` Approach Options).
- **Decision:** Ship only metrics #1/#2 in this spec. Do not add a third badge showing `0`, `—`, or any placeholder for metric #3.
- **Alternatives considered:**
  1. Show a disabled/greyed "Coming soon" badge for metric #3 — rejected: a numberless placeholder invites the same "is this accurate?" confusion the proposal explicitly flagged for the heuristic-proxy option (Option C), just moved to the UI instead of the data.
  2. Silently implement Option C (institution/center-level proxy) to fill all three — rejected per the proposal's explicit recommendation and the user's confirmation to escalate rather than silently approximate.
- **Consequences:** The shipped card will visually differ from the ticket's 3-metric mockup until a follow-up spec resolves `BIL-POM-OQ-1`. This is accepted and stated plainly in the Review Handoff, not hidden.

---

## 13. Open Gaps & Follow-ups

- Metric #3 (W1/W2 contributor count) — deferred pending product decision (`BIL-POM-OQ-1`). Follow-up spec candidate: `bilateral/project-overview-w1w2-contributor`.
- `BIL-POM-OQ-3` — "new for review" rule (`is_replicated=false AND status_id=5`) should be validated against real center data during implementation, not just this ticket's screenshot.
- Nicoleta's second question (where a project team edits a replicated innovation, matching pooled's options) — explicit non-goal, separate spec.

### Budget (Step 2.4)

- **Expected tasks:** 4 (server SELECT + repo test; client interface; client component computed signals + template; client tests).
- **Expected LOC:** ~80-120 (mostly template/test lines; the SQL/interface/computed-signal changes are each under 10 lines).
- **Expected review rounds:** 1.

This sizes well below `Standard` depth's usual ceiling — flagged for the user at the Phase 2 gate per Step 2.4: **this could reasonably run as `Lite`.** Recommendation: keep `Standard` since the requirements doc is already written at that depth and the task breakdown benefits from explicit test tasks, but treat the budget above as the tripwire for `/akili-execute`.

---

## Required cross-references

- `docs/specs/bilateral/project-overview-metrics/requirements.md`
- `docs/prd.md` — G3, US-D1
- `docs/ux-ui/design.md` — §8, §10
- `docs/trd/trd.md` — bilateral module section
- `onecgiar-pr-server/src/api/results/CLAUDE.md` — `result.repository.ts` conventions (bound parameters, singular file name)
