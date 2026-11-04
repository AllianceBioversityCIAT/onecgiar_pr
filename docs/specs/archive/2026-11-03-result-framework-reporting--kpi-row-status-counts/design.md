# KPI row status counts — `design.md`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `result-framework-reporting/kpi-row-status-counts` (KRC) · Standard · gated |
| Requirements | [`requirements.md`](./requirements.md) |
| Status | approved (spec complete 2026-11-03) |
| Skills | `nestjs-expert`, `api-design-principles`, `angular-developer`, `spartan`, `tailwind-design-system` |

## 2. Executive Summary

The design adds **one new read-only SQL aggregate** and **one new GET endpoint**. Together they return, per program and ToC phase, the linked results of every indicator node with their status and anchors. The client loads this **once per program + version**. A pure function applies the **same matching rule the drawer uses** to each KPI row, and a small presentational chip renders the counts. Nothing that exists today is edited, apart from inserting the chip into templates and wiring one load.

## 3. Premise Ledger

Verified: 9 · UNVERIFIED: 0

| # | Claim | Evidence | If false |
|---|---|---|---|
| P-1 | Drawer count = `existing-result-contributors?scope=all&tocIndicatorTargetId=<row>`; population: `rtr.toc_result_id = row.toc_result_id`, `rtri.toc_results_indicator_id = row.related_node_id`, rtr/rtri/rit/result active, `is_not_aplicable = 0`, status ∈ {1,2,3,5,6}, anchor ∈ {row anchor, NULL} (or any, when row has none); **no** date/type/level filter | `existing-result-contributors-loader.service.ts:37-125`, `indicator-drawer.component.ts:474-490` | Parity rule wrong → KRC-R-2 fails |
| P-2 | In the current phase (version 8, Reporting 2026), **0** Editing links lack an active target row, so drawer parity loses no drafts | prdb Q-5 / Q-6 (user, 2026-11-03): A = 0; Editing B = 1, C = 122 | R-2 reopens |
| P-3 | Mixed anchored + unanchored rows on the same link: 1 result in all of prod | prdb Q-3 (user) | Dedup still handled (DD-3) |
| P-4 | Karen's result 34577 (code 31221) is now status 3, anchored 340657, value 1, and is listed by the drawer | prdb Q-1 (user) | — |
| P-5 | Versions 8 and 9 share ToC phase `7baf200a…`; rows are filtered by `tr.phase = context.phaseUuid` | prdb Q-4; `aow-bilateral.repository.ts:965` | Wrong phase scoping |
| P-6 | `getIndicatorContributions` has 3 consumers (`aow-bilateral.repository.ts:415`, `results.service.ts:1721`, `results-framework-reporting.service.ts:123`); none is touched | grep, 2026-11-03 | — |
| P-7 | Row rendering surfaces in `dashboard-lab.component.html`: full view (~254-306), AoW detail table (~603-615) and cards (~684-696), overview planned lists (~1880-2110); **plus** the Reporting tab default `aows` view, which renders KPI rows in the child `reporting-aow-table` (grouped `#indicatorRow` + "All indicators" flat table) — corrected 2026-11-03 after KRC-T-3 review | grep | Chip missing on a layout |
| P-8 | Older-phase results cannot cross into 2026 rows: in prod only versions 8/9 carry ToC phase `7baf200a…` (1–7 use other phases → other `toc_result_id`s). OQ-4 closed | prdb + test Q-7 (user, 2026-11-03) | — |
| P-9 | Version ids differ per environment (2026 = 8/9 in prod, 36/37 in test), so **no version id may be hard-coded**; context always comes from `resolveContext`/`versionId` | Q-7 test vs prod | Wrong phase on PRTest |

## 4. Architecture Overview

| Layer | New / changed | Notes |
|---|---|---|
| Repository | **New** method `findIndicatorResultStatusLinks(program, context)` in `AoWBilateralRepository` | SELECT only; reuses `resolveContext` (read) |
| Service | **New** method in `ResultsFrameworkReportingService` | Resolves initiative → official code + context exactly like the sibling `toc-results` reads |
| Controller | **New** `GET /api/results-framework-reporting/indicator-result-status-links` | Same guard as sibling GETs |
| Client API | **New** `GET_IndicatorResultStatusLinks(program, versionId?)` in `results-api.service.ts` | `HTTP_METHOD_descriptiveName` naming |
| Client logic | **New** pure util `kpi-status-counts.util.ts` (index + per-row matcher) | Unit-tested in isolation |
| Client UI | **New** standalone `app-kpi-status-chip`; dashboard-lab loads once, exposes `statusCountsFor(ind)` | Inserted into each row layout |

Untouched (KRC-R-4): `getIndicatorContributions`, `getIndicatorContributionsByCenter`, `sumContributionsForCenters`, `fetchAndGroupTocResults`, `mapIndicatorContributionRow`, all existing DTOs and endpoints, the drawer, migrations.

## 5. Data Model

No schema change. Read path: `result` → `results_toc_result` → `results_toc_result_indicators` → `result_indicators_targets` (INNER: an active target row is required, as in the drawer), plus `DB_TOC.toc_results` for `official_code` + `phase` scoping. Group by (toc_result_id, toc_results_indicator_id, result_id, status_id). Output per group: distinct non-null anchors and an "has an unanchored target row" flag.

## 6. API Design

`GET /api/results-framework-reporting/indicator-result-status-links?program=<official code>&versionId=<optional>`

| Field | Type | Meaning |
|---|---|---|
| `toc_result_id` | number | ToC result id (row's `toc_result_id`) |
| `related_node_id` | string | Indicator node (row's `related_node_id`) |
| `result_id` | number | Distinct result |
| `status_id` | number | 1, 2, 3, 5 or 6 |
| `anchors` | number[] | Distinct non-null `toc_indicator_target_id`s |
| `has_unanchored` | boolean | ≥1 active target row with NULL anchor |

- Envelope: `{ response: Link[], message, status }`, the module convention.
- No titles and no PII (KRC-NFR-3).
- Empty list → 200 with `[]`.
- Unknown program → same error contract as the sibling `toc-results` GET.

## 7. Backend Module Design

- The query carries an explicit status list derived from `ResultStatusData` members (IRR-DD-2 convention, not literals) and is parameterised like its siblings.
- `context` resolution reuses the existing private `resolveContext` through a new public method in the same class. No existing method signature changes.
- Errors go through `_handlersError.returnErrorRepository`, as in the siblings.

## 8. Frontend / UX Component Architecture

**Load (KRC-R-5.2):** dashboard-lab keeps a `Map<programCode|versionId, Link[]>` signal. It fetches on the first load of a program + version (the same trigger that loads AoWs) and never per AoW or KPI. On error it stores `[]` and writes `console.error` (client lint `no-console` allows only `error`; execute-time delta 2026-11-03) (KRC-R-5.3).

**Matcher (KRC-R-2), pure util:**
1. Index links by `toc_result_id|related_node_id`.
2. For a row, compute the row anchor with the drawer's parsing: null/undefined/blank → absent; non-finite → absent.
3. Include a link when the anchor is absent, or when `anchors` includes it, or when `has_unanchored`.
4. Dedup by `result_id` (KRC-S-2.3).
5. Bucket statuses: 1 → editing; 2/3 → submitted; 6 → approved; 5 → pending review (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header).

**Chip (`app-kpi-status-chip`):**
- Inputs: `editing`, `submitted`, `approved`, `pendingReview`. Renders nothing when all are 0 (KRC-S-1.3). (amended 2026-11-03 #2, user-approved: Approved split, 'N results reported' button, breakdown in drawer header)
- *Redesigned 2026-11-03, user-approved redesign after KRC-T-4 local visual FAIL (Stitch "Option A", hybrid chip on the taxonomy line). Supersedes the attempt-1/2 "next to Achieved" placement.*
- **Button + editing badge** (`<button type="button">`), amended #4: the `N result(s) reported ›` part is a neutral outlined button on every row (existing surface/border/text tokens, the same family as the row's secondary buttons; no `--pr-status-*` tint). The `● N editing` segment, shown only when editing > 0, is a badge with the Editing pair (`resultStatusFg/Bg(1)`). The whole control remains one `<button>` (one click target, KRC-R-7). The neutral `--pr-status-not-started-*` tint from #2 is withdrawn.
- **Content (amended #2, 2026-11-03):** `N result(s) reported` (N = editing + submitted + approved + pending), then a `● N editing` badge (dot + bold) only when editing > 0 (#4: no `·`; the editing badge is its own visual separator), then a `›` chevron. Single line, `whitespace-nowrap`; it may wrap as a whole at 640 px (KRC-R-6.3). Tint: see "Button + editing badge" (amended #4: only the editing badge is tinted). The per-group breakdown is NOT shown on the row: it lives in the aria-label/tooltip; the drawer's existing status split line shows it by status name (KRC-R-8).
- `aria-label` in full words listing every non-zero group ("8 results reported: 7 in Editing, 1 pending review"); tooltip: "Editing results do not count towards Achieved until submitted. Click to see all N reported results." (KRC-R-6.2).
- **Drawer breakdown (KRC-R-8, narrowed #3):** no drawer change. The existing IRR-R-11 `statusSplit` line already lists statuses by name (Approved separate). The row button's aria-label/tooltip carry the grouped breakdown.
- **Click / Enter / Space** opens the drawer on Reported results by emitting to the host, which calls the same handler the ⋯ menu's "View reported results" uses; `stopPropagation` so the row click does not fire (KRC-R-7). Visible hover and focus-visible states.
- **Placement:** in the indicator's title/taxonomy block, right after the tag pills (type, center) in every P-7 layout; where a layout has no tag line, directly under the title. The Achieved column is restored exactly to its pre-KRC markup.
- **Out of scope from the Stitch mock:** the "(0 valid)" note under Achieved (violates KRC-R-4) and any restyle of Status / Progress / Actions.

## 9. Design Decisions

| ID | Decision | Why | Rejected |
|---|---|---|---|
| KRC-DD-1 | New separate aggregate, not counts inside `getIndicatorContributions` | That query's population (status 2/3/6, date window, type/level filters) differs from the drawer's, so counts there would contradict the drawer; editing it also risks the 3 consumers (R-1) | Proposal Option A (superseded by discovery) |
| KRC-DD-2 | Server returns links and the client matches per row | Row anchor semantics live on the client row (`toc_indicator_target_id`); one payload per program serves every layout; keeps the server free of row-shape coupling | Server computing per-row counts (needs the full row query → touching `fetchAndGroupTocResults`) |
| KRC-DD-3 | Dedup by `result_id` per row | Several target rows per link (years / anchors, P-3) must not inflate counts | Counting target rows |
| KRC-DD-4 | Parity with the drawer, including the absence of a phase filter on results | The user sees the drawer number on click, so they must agree. Scoping is a separate product decision (OQ-4 / P-8) | Silently diverging |
| KRC-DD-5 | Fail-soft: hide chips on error | Optional information must never block reporting | Error banner |
| KRC-DD-6 | New endpoint instead of an extra field on `toc-results` responses | Leaves every existing response byte-identical (KRC-S-4.1) | Additive field (alters shared hot path + payloads of 3 endpoints) |

**Reversion challenge (Step 2.3):** no DD removes or inverts delivered behaviour (all additive), so it was not triggered.

## 10. Security, Observability, Rollback

- Read-only SELECT; same auth guard; no PII.
- No new logging server-side beyond the existing error handler; client `console.error` on failure.
- **Rollback:** revert the commits. No data or schema state to undo.

## 11. Budget (tripwire)

| Expected tasks | Expected net LOC | Expected review rounds |
|---|---|---|
| 4 (server endpoint · client load+matcher · chip+placement · verification) | ~320 (server ~110 incl. tests, client ~210 incl. tests) | 1 (2 max) |

Depth check: Standard matches (two packages, one new endpoint, a shared-data invariant).
