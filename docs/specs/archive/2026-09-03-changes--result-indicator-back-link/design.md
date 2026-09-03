# Design — Clickable Area of Work on the Result Detail identity strip

**How:** extend `app-result-header` with a second identity-strip link. Official code still comes from `currentResult`. Owning AOW (and optional KPI) come from the existing `GET_ContributorsPartners` ToC mapping. The link is a same-tab `routerLink` to By AOW. No new endpoint, no return URL on create.

Links: `requirements.md` (RIBL-R-1..R-7, R-10, R-11). Proposal Option A. Baseline: `docs/prd.md` `US-S1` · `docs/ux-ui/design.md` §4–§5, §7, §9–§10 · `docs/trd/trd.md` `W1` · archived Submitter spec · `KZ-changes--kp-report-modal-auto-create-1`.

## 1. Summary

Submitter already paints the Science Program and opens program home. This design paints the owning Area of Work next to it and opens the existing By AOW query (`tocView=byAow&tocAow=` + optional `kpi=`). Trade-off: one extra existing GET on Result Detail (mapping is not on `GET_resultById`), plus a second **existing** ToC catalog GET when that mapping row has a `toc_result_id` but no WP code (live V2 — Pivot P1). **Submitter** and **Back to results** stay as shipped.

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Touched? |
|---|---|
| Server | No. Consume `GET /v2/api/contributors-partners/{id}` as-is |
| Client | `pages/results/pages/result-detail/components/result-header/` only |
| External | None. By AOW is an existing in-app query on entity-details |

### 2.2 Sequence / interaction diagram

```
Result Detail loads
  ├── GET result → currentResult (official code — already on the page)
  └── official code present
        └── GET_ContributorsPartners (existing)
              ├── planned mapping + WP code on the row → identity strip “Area of Work” + link
              ├── planned mapping + toc_result_id, no WP code
              │     └── GET_tocLevelsByconfig (existing; same catalog Contributors already uses)
              │           ├── catalog node wp_short_name is AOW-shaped → strip + link
              │           └── no matching node / no AOW-shaped code / GET fail → hide
              └── missing / unmapped / program-level bucket / GET fail → no Area of Work node
                    └── user activates the value
                          └── router → entity-details/{official_code}?tocView=byAow&tocAow={aow}
                                └── existing dashboard-lab By AOW (unchanged)
```

Create still navigates with `?phase=` only. Area of Work is derived after Result Detail load (`KZ-changes--kp-report-modal-auto-create-1`).

## 3. Data Model Changes

### 3.1 Entities

None.

### 3.2 Migrations

None.

### 3.3 CLARISA / external-data implications

None. AOW code is either on the Contributors GET row (WP fields) or on the existing ToC catalog node (`wp_short_name` = work-package acronym) keyed by that row’s `toc_result_id`.

## 4. API Surface

### 4.1 New / changed endpoints

None. Reuse:

1. `ResultsApiService.GET_ContributorsPartners()` → `GET /v2/api/contributors-partners/{currentResultId}`.
2. When that response has a planned submitter row with `toc_result_id` + `toc_level_id` but no WP code, `TocApiService.GET_tocLevelsByconfig(resultId, initiativeId, tocLevelId, isP25, planned)` — the same catalog call Contributors already uses to paint **AOW01** in the HLO dropdown (`wp_short_name` / `extraInformation`). Do **not** invent a new endpoint. Do **not** parse the HLO `title` / `extraInformation` HTML for a code.

### 4.2 Bilateral / platform-report impact

None.

## 5. Server Workflow / Business Rules

None on the server. Client display rules:

| Input | Paint |
|---|---|
| Official code missing / whitespace | No Area of Work (and no extra GET required) |
| GET fail / no `result_toc_result` / `planned_result === false` | No Area of Work |
| First planned row has no WP code after trim | No Area of Work |
| WP code is Intermediate Outcomes / 2030 Outcomes sentinel | No Area of Work |
| WP code present, short name present | `{code} - {name}` |
| WP code present, name missing | `{code}` only |
| Exactly one contributing indicator id | Href also has `kpi={id}` |
| Zero or 2+ indicator ids | Href omits `kpi` |
| Code spelling | Use the stored string; do not normalize |

**Mapping (submitter SP only):** read `result_toc_result.result_toc_results[]`. Ignore `contributors_result_toc_result`. First planned row whose WP field is non-empty wins. If **no** row has a WP field, take the first planned row that has a `toc_result_id` and resolve it through the catalog (Pivot P1). Do not skip a first row that failed catalog lookup to a later row.

**WP field order on that row:** `work_package_code`, then `aow_code`, then `work_package_id` when that value looks like an AOW official code (starts with `AOW` / `SGP` / similar stored program unit code — not a raw numeric ToC id).

**Catalog fallback (only when no row qualifies above):** `GET_tocLevelsByconfig` for `result_toc_result.initiative_id` + the row’s `toc_level_id` (P25 flag from `currentResult.portfolio === 'P25'`, `planned=true`). Match `toc_result_id`. Code = catalog `wp_short_name` when it looks like an AOW official code (same `looksLikeAowCode` rule). Do **not** read `title` or `extraInformation`. If initiative id, level id, match, or AOW-shaped `wp_short_name` is missing — or the catalog GET fails — hide.

**KPI field:** unique non-null `toc_results_indicator_id` or `related_node_id` on that row’s `indicators[]`. Size 1 → `kpi`. Else omit.

## 6. Frontend Plan

### 6.1 Routes / modules

No router-table change. Consume `entity-details/:entityId` with query `tocView=byAow`, `tocAow`, optional `kpi`. Do not add `from` / `returnUrl`. Do not put those query keys on Submitter.

### 6.2 Components & services

| Piece | Change |
|---|---|
| `result-header.component.html` | One identity-strip item **after Submitter, before status**: muted “Area of Work” + primary `routerLink` + `queryParams`. `@if` on a non-empty owning AOW. `data-testid="result-header-aow"`. |
| `result-header.component.ts` | Keep Default CD for `currentResult`. Add a signal (or equivalent assigned field) for the async mapping. When `officialCode` is non-empty, call `GET_ContributorsPartners` once per result id; map per §5; if the row needs catalog fallback, call `GET_tocLevelsByconfig` once for that result id (same key); fail-soft (hide). Getters for value, `queryParams`, `aria-label="Area of Work: {value}"`. Do not inject `FieldsManagerService` — read `portfolio` from `currentResult` (same object Submitter already uses; the signal can still be empty on first paint). |
| `result-header.component.spec.ts` | Mock `GET_ContributorsPartners`. Cases for AC-1..AC-8. Fixture lock: SP04 + AOW01. |
| `RdContributorsAndPartnersService` | **Do not** call `getSectionInformation` from the header (that mutates the form body). Header owns its own subscribe. |
| `LabReportFormComponent` | No change. |

State: mapping signal local to the header. No session, no referrer.

### 6.3 Design system usage

- **Chrome:** same as Submitter (RIBL-R-11). Tailwind-only; no new SCSS or tokens.
- **Color:** label `--pr-text-secondary`. Value `--pr-color-primary-300` + hover opacity.
- **Type:** 12px, strip scale.
- **Focus:** visible ring (`docs/ux-ui/design.md` §10). Tab order: **Back to results** → title-row actions → Submitter → Area of Work.
- **Touch:** compact header link (do not grow to 44px).
- **Responsive:** `flex-wrap` already. At `md` (900px) wrap OK; no overflow / no cover title PDF ⋮ (RIBL-R-7). HITL also ~1100px sidebar open.
- **i18n:** hardcode “Area of Work” like “Submitter”.
- **Cursor:** pointer on the value.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

- Same-tab in-app `routerLink` + `queryParams` objects (not string-interpolated href).
- Existing JWT on `GET_ContributorsPartners`. No new auth.
- Fail-soft on GET error: hide the control; do not toast; do not log tokens (`AC-9`).

## 8. Performance & Capacity

One extra existing GET (`GET_ContributorsPartners`) when official code is present. A second existing GET (`GET_tocLevelsByconfig`) only when that mapping has `toc_result_id` but no WP code. Do not refetch on every CD cycle — key both by `currentResultId`. No new bundle deps.

## 9. Observability

None. Do not add analytics for this chrome.

## 10. Testing Plan (forward-looking)

| Class | Harness | What it proves |
|---|---|---|
| AOW text (RIBL-R-1, AC-1) | Jest `result-header.component.spec` | After mocked GET with AOW01, testid shows `AOW01` (or `AOW01 - {name}`) |
| By AOW href (RIBL-R-2, AC-2) | Same | `href` has `entity-details/SP04`, `tocView=byAow`, `tocAow=AOW01`; no `target="_blank"` |
| Absence (RIBL-R-3, AC-3) | Same | Missing / empty / whitespace / unmapped / Intermediate / 2030 / GET error → no testid; no `tocAow=undefined` |
| Submitter + back (RIBL-R-4, AC-4) | Existing Submitter + back-link cases kept | Submitter href has no `tocAow`; back-link unchanged |
| Not referrer (RIBL-R-5, AC-5) | Same happy path | No history mock |
| Name (RIBL-R-6, AC-6) | Same | `aria-label` contains Area of Work + AOW01 |
| `kpi` (RIBL-R-10, AC-8) | Same | One id → `kpi=42`; 0 and 2+ omit `kpi` |
| Wrap (RIBL-R-7, AC-7) | **HITL** | 900px and ~1100px vs `visual/result-detail-with-submitter.jpg` |

A green Jest run is **not** evidence for RIBL-R-7.

## 11. Backwards Compatibility & Migration Plan

- Additive chrome only.
- Submitter href must stay program home (no `tocAow`).
- No flag, migration, or payload change.
- Contributors form behavior unchanged.

## 12. Design Decisions (ADRs)

### RIBL-DD-1 — Second strip item from ToC GET (not a return URL)

- **Context:** Submitter lands on the catalogue. The user reported from AOW01 By AOW. `currentResult` has no AOW. Create has no return query.
- **Decision:** Keep Submitter. Add Area of Work. Read mapping from existing `GET_ContributorsPartners`. Link with `tocView=byAow&tocAow=` (optional `kpi`). Derive after Result Detail load (RIBL-R-1, R-2, R-5).
- **Alternatives considered:**
  1. Retarget Submitter — rejected: user kept Submitter → program home.
  2. Return URL on every Report navigate — rejected (`KZ-changes--kp-report-modal-auto-create-1`).
  3. Enrich `GET_resultById` — rejected this slice (server/payload change).
  4. Read `RdContributorsAndPartnersService.partnersBody` — rejected: that body is the form source of truth; header must not call `getSectionInformation`.
- **Consequences:** One extra GET. Control hidden until it returns. Fail-soft if mapping missing.

### RIBL-DD-2 — Inline labeled link after Submitter

- **Context:** Strip already has Submitter. Two jobs, two controls.
- **Decision:** Muted “Area of Work” + primary value, after Submitter, before status (RIBL-R-11).
- **Alternatives considered:** Put AOW in ⓘ — rejected: R-1 requires it without opening ⓘ. Chip chrome — rejected (same as Submitter).
- **Consequences:** Longer wrap. HITL owns overlap (RIBL-R-7).

### RIBL-DD-3 — Jest owns text/href/`kpi`; HITL owns wrap

- **Context:** Dominant defects are missing AOW, wrong query, Submitter regression. jsdom cannot see wrap.
- **Decision:** Scoped Jest on `result-header.component.spec` for R-1..R-6 and R-10. R-7 is HITL at 900px and ~1100px.
- **Alternatives considered:** Cypress layout — no CI gate for this chrome.
- **Consequences:** Execute must not close R-7 without a HITL note.

## 13. Open Gaps & Follow-ups

- Filter restore and exact scroll without `kpi=` deferred.
- Live V2 GET row has no WP code (HITL result 8989). Closed by Pivot P1: resolve `toc_result_id` via `GET_tocLevelsByconfig` `wp_short_name`. Still do not guess a code from the HLO title.
- Center-contributor ToC ignored this slice.
- Focus-ring paint is HITL.

## 14. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | **2** — (1) red Jest on current header, (2) GET + strip + green Jest + HITL |
| Expected LOC | **~120** (mapping + signal + template + ~60 spec lines) |
| Expected review rounds | **1** |

Depth stays **Standard**. Tripwire: more than 2 tasks, ~240 LOC, or a second review round → stop and ask.

## 15. Reversion challenge (Step 2.3)

No shipped behavior is removed. Submitter, **Back to results**, and Contributors GET stay. Challenge skipped (additive only).
