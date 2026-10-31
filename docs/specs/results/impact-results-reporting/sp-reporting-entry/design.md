# Design — Impact Results: SP Reporting Entry

## 1. Summary

| Field | Value |
|---|---|
| **Spec** | `results/impact-results-reporting/sp-reporting-entry` (child 2/3, P2-3901) |
| **Requirements** | [`requirements.md`](./requirements.md) — IRE-R-1..7, IRE-NFR-1..5 |
| **Status** | approved (2026-10-30) |
| **Packages** | `onecgiar-pr-client` only |
| **Server contracts used** | E1 create, E6 counts — [`../server-foundation/design.md`](../server-foundation/design.md) §4.1 (live on PRTest, verified IRS-T-9) |

A new standalone **Impact results card** component is rendered by the Reporting page right after the reporting table, outside the table's indicator pipeline. It loads E6 counts itself. Its **Report result** buttons open the existing indicator drawer with a new `impactArea` input, which puts the existing report form into **impact mode**; impact mode builds its body with a **dedicated payload builder** and reuses the form's success/error path.

All paths below are relative to `onecgiar-pr-client/src/app/pages/result-framework-reporting/` unless absolute.

---

## 2. Architecture Overview

```text
dashboard-lab (host, owns data + drawer)
 ├─ <app-reporting-aow-table>   (unchanged: AoW / Intermediate / 2030 cards)
 ├─ <app-impact-results-card>   NEW — only in grouped view
 │     inputs: initiativeId, versionId, canReport
 │     loads:  E6 counts  (results-api GET_impactLevelCounts)
 │     output: reportArea(areaId)
 └─ indicator-drawer  ← host sets managed {impactArea}
       └─ lab-report-form [impactArea]
             impact mode → buildImpactCreateResultPayload → POST_createResult (E1)
             success → existing toast + navigate to result detail
```

Flow: card click → host `openImpactReport(areaId)` → drawer opens with `impactArea` → form shows area + title → Save → E1 → navigate `/result/result-detail/<code>/general-information?phase=<v>`.

---

## 3. Directory Structure (new / changed)

| Path | Change |
|---|---|
| `pages/dashboard-lab/components/impact-results-card/impact-results-card.component.{ts,html,spec.ts}` | **New** card component (+ `.cy.ts` CT) |
| `shared/report-result/impact-areas.constant.ts` | **New** — the 5 areas (id, name, icon path) |
| `shared/report-result/create-result-payload.util.ts` | **Add** `buildImpactCreateResultPayload`; existing builder untouched |
| `shared/services/api/results-api.service.ts` (`src/app/shared/...`) | **Add** `GET_impactLevelCounts(initiativeId, versionId)` |
| `pages/dashboard-lab/dashboard-lab.component.{ts,html}` | Mount the card; `openImpactReport`; `managed` gains `impactArea` |
| `pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.{ts,html}` | New input `impactArea`, passed to the form; header copy for impact |
| `pages/dashboard-lab/components/lab-report-form/lab-report-form.component.{ts,html}` | New input `impactArea`; `isImpact` hides indicator/target/ToC/category/contributors/innovation-link blocks; save uses the impact builder |
| Folder `CLAUDE.md` guides of the touched folders | Update and re-stamp `Verified:` |

---

## 4. Data Model

No persistence change. Client-side shapes:

| Shape | Fields |
|---|---|
| Impact area (constant) | `id` 1–5, `name` (CLARISA name, verified live in IRS-T-1), `icon` (`assets/impact_areas/png/<id>.png`) |
| Counts (E6) | `{ areas: [{impact_area_id, count}] (5 rows), total }` |
| Drawer impact context | `{ id, name, icon }` or null |

Area names (CLARISA, IRS-T-1 output 4): 1 Nutrition, Health and Food Security · 2 Poverty Reduction, Livelihoods and Jobs · 3 Gender Equality, Youth and Social Inclusion · 4 Climate Adaptation and Mitigation · 5 Environmental Health and Biodiversity.

---

## 5. API Design (client side)

| Method (naming `HTTP_METHOD_descriptiveName`) | Endpoint | Used by |
|---|---|---|
| `GET_impactLevelCounts(initiativeId, versionId)` — new | `GET api/results-framework-reporting/impact-level/counts?initiativeId=&versionId=` | card (IRE-R-2) |
| `POST_createResult(body)` — existing | `POST api/results-framework-reporting/create` | form, impact mode (IRE-R-6) |

Impact create body (IRE-R-6): `{ result: { result_level_id: 1, result_type_id: 9, initiative_id, result_name, handler: '', impact_area_id } }` — **no other top-level keys**. The server rejects a non-null `toc_result_id`, `indicators` (including `[]`), `number_target`, `target_date`, `contributing_indicator` and a non-empty `contributors_result_toc_result`; the existing builder always sends `indicators: []` and `contributing_indicator`, which is why a separate builder is required (IRE-DD-5). Auth header `auth` is added by the existing interceptor.

---

## 6. Frontend / UX Component Architecture

### 6.1 `app-impact-results-card` (IRE-R-1..4)

| Part | Behavior |
|---|---|
| Header | Tag `IMPACT` (same tag component/style as `INTERMEDIATE` / `2030`), title "Impact results", line "5 Impact Areas · no targets", `NEW` chip, total count (E6 `total`) |
| Rows (5) | Icon (decorative, `alt=""`), area name (wraps), count, **Report result** button (accessible name "Report result for <area name>") |
| Absent on purpose | Progress bar, ratio, %, "By AOW", expand/collapse chevron (always open — 5 short rows), favorites, PT markers |
| Inputs | `initiativeId`, `versionId`, `canReport` |
| Output | `reportArea(areaId)` |
| States | Loading → fixed-width skeleton per count and total · Error → "—" with `aria-label` "Count unavailable" · Success → numbers (0 shown as 0) |
| Data | Reactive request keyed on (`initiativeId`, `versionId`); re-runs when either changes; no request while either is null (counts stay "—") |
| Permission | Buttons `disabled` when `!canReport` — same look as disabled row Report buttons in the table |

Styling: reuse the reporting table's card container, tag and button styles/tokens so the card reads as a sibling; Spartan primitives for any new button/badge (IRE-NFR-3). Layout must hold at 900 px (names wrap, counts and button never clip — IRE-NFR-2).

### 6.2 Host `dashboard-lab` (IRE-R-1, R-3, R-4)

- Mount the card **immediately after** `<app-reporting-aow-table>` inside the same Reporting branch, only when `reportingViewMode() === 'grouped'` (Scenario 1.2).
- Inputs: `initiativeId` = the selected program's CLARISA initiative id; `versionId` = `effectiveVersionId()`; `canReport` = `entityAowService.canReportResults()`.
- It does not receive `reportingGroupsForTable()`, search or any filter signal → filters cannot hide it (IRE-R-3), and the table's inputs are untouched (IRE-R-7).
- `openImpactReport(areaId)`: `primeEntityAowContext()`, then `managed.set({ indicator: null, node: null, emerging: false, impactArea })`, open the drawer — same opening sequence as `openEmergingReport`, but gated by `canReportResults`, not `canReportEmerging`.

### 6.3 Drawer + form impact mode (IRE-R-5, R-6)

- Drawer: new input `impactArea` → passed to `<app-lab-report-form [impactArea]>`; header reads "Report impact result".
- Form: `isImpact = impactArea() != null`. When true:
  - show a read-only block "Impact result · <icon> <area name>";
  - show the title field with today's rule (required, ≤ 30 words) and description only where the standard form already shows it;
  - hide indicator, target, contribution-to-target, ToC/Progress Tracker tab, category/level choice, contributors (centers/science/bilateral) and innovation link;
  - `missingFields` reduces to the title rule; `canSave` = title valid AND `canReport()` AND not saving;
  - Save calls `buildImpactCreateResultPayload` then the existing `POST_createResult` → existing success branch (toast `showCreatedAlert` + navigate) / error branch (`reportResultError` alert with the server message, drawer stays open).
- Double submit: the form's existing in-flight flag disables Save (Scenario 6.3) — confirm it covers impact mode; add it if not.

---

## 7. Shared Contracts

| Contract | Owner |
|---|---|
| E1 `result.impact_area_id` (1–5), forbidden fields list | server child #1 — consumed as is |
| E6 response shape | server child #1 — consumed as is |
| Impact area constant | this spec; child #3 may reuse it for the header label |

---

## 8. Design Decisions

### IRE-DD-1 — Standalone card next to the table, not a 4th `kind` inside it
- **Decision:** new `app-impact-results-card` mounted by the host after the table.
- **Why:** the table's pipeline (`matchRow`, burndown sort, Only pending, Favorites, PT, search, `visibleGroups` dropping empty cards) is indicator-driven; an indicator-less card would need opt-outs in at least five places and a fake ratio. Outside the pipeline, IRE-R-3 holds by construction and IRE-R-7 has zero surface in the table.
- **Rejected:** `ReportingGroupKind = … | 'impact'` (proposal §11 wording) — deviation recorded here; the proposal's intent (sibling card after 2030) is kept.

### IRE-DD-2 — Static Impact Area constant
- **Decision:** a 5-entry constant with CLARISA names and existing icon assets.
- **Why:** the order and ids are fixed, names were verified live (IRS-T-1); no extra request, no loading state for labels. The IPSR step-n1 hardcoded list is left as is (no refactor in scope).
- **Rejected:** loading `clarisa/impact-area/get/all` — adds a request and an ordering concern for 5 fixed rows.

### IRE-DD-3 — The card loads its own counts
- **Decision:** the card owns the E6 request, keyed on (`initiativeId`, `versionId`).
- **Why:** keeps the 4,000-line host from growing another cache; the card is self-contained and testable with a mocked API. One request per program/phase (IRE-NFR-4).

### IRE-DD-4 — Impact mode as its own input, not `emergingCategory`
- **Decision:** new `impactArea` input on drawer and form.
- **Why:** emerging mode has its own permission (`canReportEmerging`), copy and category logic; overloading it with type 9 would mix gates and labels.
- **Rejected:** `emergingCategory = {id: 9, levelId: 1}` — fewer lines, wrong permission and copy.

### IRE-DD-5 — Dedicated impact payload builder
- **Decision:** `buildImpactCreateResultPayload` returns only the `result` block of §5.
- **Why:** the existing builder always emits `indicators: []`, `contributing_indicator`, `contributing_center`, `bilateral_project`; E1 rejects `indicators: []` for impact results (server advisory FP: "client must omit `indicators: []`"). A separate function also guarantees IRE-R-7 (existing bodies byte-identical).
- **Rejected:** a branch inside `buildCreateResultPayload` — every existing caller's body would depend on a new flag.

### IRE-DD-6 — Reuse the form's success/error path
- **Decision:** impact Save goes through the same post-create code (toast + navigate with `phase`, or error alert).
- **Why:** one navigation rule for every result kind; Scenario 6.1/6.2 come for free once the body is right.

**Reversion challenge (Step 2.3):** no decision removes or disables shipped behavior — the card and impact mode are additive, and the existing builder, table and emerging flow are untouched. No challenge needed.

---

## 9. Testing Plan

| Level | What | Requirement |
|---|---|---|
| Jest — util | Impact body exact keys; non-impact bodies unchanged (snapshot of existing cases still green, no `impact_area_id` key) | R-6, R-7 |
| Jest — card | 5 rows in order; counts mapping; total from E6 not summed; loading skeleton; error "—"; disabled buttons when `!canReport`; accessible names; output emits area id | R-1, R-2, R-4, NFR-1 |
| Jest — host | Card rendered only in grouped view, after the table; filters on → card still rendered, table inputs unchanged; `openImpactReport` sets `managed.impactArea` | R-1, R-3, R-4 |
| Jest — form/drawer | Impact mode hides the listed inputs; Save disabled rules; success → navigate URL with phase; 400 → stays open with message; in-flight disables Save | R-5, R-6 |
| Cypress CT | Card render at 1280 and 900 px (no horizontal scroll, names wrap) | NFR-2 |
| HITL | Visual vs User Guide v2 step 1; keyboard order; PRTest: counts vs E6/SQL for SP01 phase 36; one real create from the card (test result accepted on PRTest) | R-1, R-2, NFR-1 |

Jest always `--maxWorkers=2` (or `--runInBand` under 4 GB free), scoped, `--findRelatedTests` before push; CT never alongside Jest.

---

## 10. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 6 (5 code + 1 HITL) |
| LOC | ~650 (≈ 300 production, ≈ 350 tests/CT) |
| Review rounds | ≤ 8 |

Depth check: matches **Standard** (multi-component UI, no data/API change).

## 11. Open Gaps

- Guide card image not extracted (PDF text only) — visual fidelity is a HITL check.
- Child #3 owns the detail page; until it ships, a created impact result opens the standard detail without the Impact level info section (expected interim state on PRTest).
