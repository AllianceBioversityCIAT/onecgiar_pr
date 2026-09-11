# Design — "My work" board (4th Science Program tab)

**Shape of the solution:** one new lazy SP page (`my-work-board`) that mounts the existing band with a fourth tab, loads the results list **once** per scope through the existing `roles/filter` endpoint (all phases, filtered client-side by phase label exactly like the Results tab) with a new opt-in `include_completeness=true` flag, and renders a read-only, status-grouped board from a pure view-model. The server change is a bounded fold: for eligible Editing/Draft items it calls the same v2 validation the result detail uses (`validateResultById`, P22/P25-aware stored procedure), capped at 60 items with bounded concurrency, and attaches `{ complete, total, missing }`. No migration, no new endpoint, no drag-and-drop library.

## 1. Summary

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-board` · Prefix `MWB` |
| Type / Depth | Change · **Standard** |
| Approval Mode | `pre-approved` (Juan Cadavid, 2026-09-04) — Phase 2 gate auto-approved (pre-approved mode); Judgment Day round 1 applied (`./judgment.md`), no re-judgment (YOLO mandate) |
| Requirements | `./requirements.md` `MWB-R-1`…`R-11`, `MWB-AC-1`…`AC-9` |
| Visual reference | `./mockup/Main.dc.html`, `Card.dc.html`, `Empty.dc.html` (fixtures corrected to P25 section counts) |
| **Budget** | **6 tasks · ~1,350 LOC (server ~260 incl. spec, client ~980 incl. spec, CT ~80, docs ~30) · ≤ 1 Reviewer round per task** — execute stops and escalates past any of these |
| Reversion challenge (§2.3) | Not triggered: no DD removes, disables or inverts delivered behaviour. `MWB-DD-3` moves the initiative-id lookup behind a memoising root service; the Results tab keeps its behaviour (one fewer request per navigation, same result). Recorded |
| Kaizen applied | `sp-shell-app-viewport` (`SAV-DD-1/3`: lock via the `pr-viewport-page` mixin, work area is the only scroller) · `programme-results-created-by-filter` (row fields, `optionsOf`, URL bridge `replaceUrl`+merge) · `aow-identity-column-starvation` (Orca browser viewport after `goto`, zoom ×1.2 for HITL) · P2-3552 notes in `green-checks.service.ts` / `results-validation-module` (portfolio decides the validation path; `Number(v) === 1`) |

## 2. Architecture Overview

### 2.1 Where this lives

```
onecgiar-pr-client
  shared/routing/routing-data.ts ............ + route entity-details/:entityId/my-work (rfrView 'my-work')
  shared/services/api/results-api.service.ts  + include_completeness search param
  pages/result-framework-reporting/
    services/science-program-id.service.ts (NEW, root)   memoised SP code → initiative id (DD-3)
    pages/dashboard-lab/components/reporting-program-band/  activeTab union + myWorkPath + 4th tab + badge input; Drafts-slot comment updated (DD-12)
    pages/programme-results/services/programme-results.service.ts   uses ScienceProgramIdService; row gains resultTypeId + completeness; mapper exported (DD-4)
    pages/my-work-board/ (NEW)
      my-work-board.component.{ts,html,scss}   page host (pr-viewport-page), band, toolbar, groups
      components/my-work-column/               column (header, count, list, empty, rail mode)
      components/my-work-card/                 card variants
      services/my-work-board.service.ts        signals: rows, loading, error, scope, phase; one request per scope
      services/my-work-count.service.ts        root-provided badge count per (code, phaseLabel) (DD-5)
      my-work.view-model.ts                    pure: status→column table, group, order, counts, ready, badge, phase filter
      my-work-section-map.ts                   validation section_name (P22 + P25) → route + label
onecgiar-pr-server/src/api/results
  results.controller.ts ..................... @ApiQuery include_completeness
  results.service.ts ........................ flag parse + completeness fold on the filter path (eligible, capped, chunked)
  results-validation-module/
    completeness.ts (NEW, pure) ............... foldCompleteness(NewValidationsDto[]) → { complete, total, missing } (DD-1)
```

### 2.2 Sequence

| Step | Actor | What happens |
|---|---|---|
| 1 | Router | `entity-details/SP01/my-work?phase=Reporting%202026` → lazy `MyWorkBoardComponent`; route data `rfrView: 'my-work'`, sidebar 300 |
| 2 | Page | Host gets `pr-viewport-page`; band mounts with `activeTab='my-work'`, `frameLocked=true`, `scrollHost=#workArea` (same as Results) |
| 3 | `MyWorkBoardService` | `ScienceProgramIdService.resolve(code)` (memoised) → `GET_AllResultsWithUseRole(userId, { submitter_id, limit: PROGRAMME_RESULTS_PAGE_LIMIT, page: 1, filter_created_by_me: scope === 'mine', include_completeness: scope === 'mine' })`. HTTP 404 → `rows = []` (DD-13) |
| 4 | Server | Existing filter path builds items. If the flag is true: pick eligible items (`status_id` ∈ {1, 8}, `result_type_id` not an IPSR package), newest `created_date` first, take 60, run `validateResultById(id)` in chunks of 5, `completeness = foldCompleteness(rows)`; a rejected call → `null` + one warning log; every other item `null` |
| 5 | View-model | Phase filter (label = URL `phase` or default rule) → status→column table (DD-1b) → Editing ordered by ratio asc (null first) then created desc; others created desc → counts, `ready`, badge |
| 6 | `MyWorkCountService` | Cache `(code, phaseLabel) → count`; the page writes it after a Mine load; the band on the other tabs reads it or triggers `resolve(code)` + one `roles/filter?submitter_id&filter_created_by_me=true&status_id=1,8&limit=…` request and counts rows whose phase label matches (404 → 0) |
| 7 | Card action | `Continue` → `router.navigate(['/result','result-detail', code, firstMissingRoute ?? 'general-information'], { queryParams: { phase: versionId } })`; `Open` → `general-information` |

## 3. Data Model Changes

None. No entity, no migration. `npm run migration:check` unaffected.

## 4. API Surface

### 4.1 Changed endpoint

`GET /api/results/get/all/roles/filter/:userId` gains one optional query param.

| Param | Type | Default | Effect |
|---|---|---|---|
| `include_completeness` | `'true' \| 'false'` (existing `parseQueryBool`) | absent → false | When true, every item carries `completeness` |

Item addition (only when the flag is true):

| Field | Shape | Meaning |
|---|---|---|
| `completeness` | `{ complete: number; total: number; missing: string[] } \| null` | `missing` = `section_name` values whose validation is not 1, in the order the procedure returns them. `null` for ineligible items (not Editing/Draft, IPSR package), items past the cap, and items whose validation call failed |

Contract rules: with the flag absent the response is byte-identical (no key added, no validation call) — `MWB-R-8`. Swagger `@ApiQuery` documented. No `v2` change.

### 4.2 Bilateral / platform-report impact

None.

## 5. Server Workflow / Business Rules

- **Validation source (DD-1):** the result detail for P25 already calls `calculateValidationSections` → `resultValidationRepository.validateResultById(resultId)` → `CALL validate_sections_mapped_batch(id, sections)`; sections are chosen per portfolio (P25: general-information, geographic-location, evidences, contributor-partners; P22: general-information, geographic-location, evidences, links-to-results, theory-of-change, partners) plus one type section (innovation-dev-info, innovation-use-info, knowledge-product-info, cap-dev-info, policy-change1-info). The list fold reuses `validateResultById` unchanged and the `Number(v) === 1` rule (P2-3552) through the new pure `foldCompleteness`. The legacy `validation` table (v1) is **not** read: it has not been written since 2023.
- **Eligibility:** `status_id` 1 or 8; result types that `validateResultById` handles (innovation packages go through the IPSR validation module → `null`). Cap `MWB_COMPLETENESS_CAP = 60`, newest first; concurrency 5.
- **Failure isolation:** one rejected procedure call → that item `null` + `logger.warn` with the result id only; the list request still returns 200.
- **Scope:** `filter_created_by_me` keeps using `authUser.id`.
- **Section → route map (client, `MWB-R-6`):**

| `section_name` | Result-detail child route | Card label |
|---|---|---|
| `general-information` | `general-information` | General information |
| `theory-of-change` (P22) | `theory-of-change` | Theory of change |
| `geographic-location` | `geographic-location` | Geographic location |
| `partners` (P22) | `partners` | Partners |
| `contributor-partners` (P25) | `contributor-partners` | Contributing partners |
| `links-to-results` (P22) | `links-to-results` | Links to results |
| `evidences` | `evidences` | Evidence |
| `policy-change1-info` · `innovation-use-info` · `cap-dev-info` · `knowledge-product-info` · `innovation-dev-info` | same string | Policy change · Innovation use · Capacity sharing · Knowledge product · Innovation development |
| unknown | `general-information` | (omitted from the label list) |

All routes above exist as children of `result-detail/:id` in `routing-data.ts` (`partners` is P22-gated, `contributor-partners` P25-gated — the map carries both).

- **Status → column table (DD-1b, the single vocabulary):** 1 Editing, 8 Draft → **Editing**; 5 → **Pending review**; 3 → **Submitted**; 2 Quality Assessed, 6 Approved → **Quality assessed** (group *Done*, expanded — `MWB-T-10`); 4 Discontinued, 7 Rejected → **Discontinued** (rail); anything else → **Other** rail. Card chip shows `status_name`.
- **Lifecycle:** Editing (1) → Submitted (3) → Quality Assessed (2) (`submissions.service.ts`). `docs/trd/trd.md` `W1` prose is inverted — pending archive sync.

## 6. Frontend Plan

### 6.1 Routes / modules

- New entry in `routing-data.ts` next to `Program results`: `prName: 'Program my work'`, `path: 'entity-details/:entityId/my-work'`, `data: { sidebar: { width: 300 }, rfrView: 'my-work' }`, `loadComponent` → `MyWorkBoardComponent`.
- Every switch that enumerates `rfrView` values (`isProgramShell()`, footer allow-list, sidebar) treats `'my-work'` like `'results'` (locked page, band, no footer).
- **DD-12:** the band's comment reserving the design's fourth `Drafts` slot for the centre view stays true; My work is a new programme-view tab and the comment is extended to say so.

### 6.2 Components & services

| Unit | Responsibility | Inputs / outputs |
|---|---|---|
| `MyWorkBoardComponent` (page) | Host with `pr-viewport-page`; band (`activeTab='my-work'`); `<app-pr-tab-intro>` (§6.5); toolbar: scope segmented control, **phase select** (`app-pr-filter-select`, options from rows, default rule §6.6, URL `phase` bridge `replaceUrl`+merge as on Results); skeleton / error / whole-board empty / groups. Owns `#workArea`. | Route param `entityId`, query `phase` |
| `MyWorkColumnComponent` | One column: header (dot, label, count, optional *k ready to submit*), scrollable list, per-column empty. `rail` mode renders the collapsed 44px rail with count and expand button; `role="region"` + `aria-labelledby`. | `column`, `collapsed`, `(toggle)` |
| `MyWorkCardComponent` | Variants: **editing** (bar, missing list, primary Continue), **ready** (green bar, secondary Review and submit), **unknown** (*Open to check completeness*, primary Continue), **waiting/closed** (created line, Open link). Status chip = `statusName`. Native `<button>`/`<a>`; no `draggable`. | `row`, `variant` |
| `MyWorkBoardService` | Page-scoped: `scope`, `phase`, `rows`, `loading`, `error`; computed `phaseOptions`, `visibleRows`, `columns`, `totals`, `badge`; request token drops stale responses; one request per scope change; **404 → empty rows** (DD-13); `retry()`. | — |
| `MyWorkCountService` (root) | `(code, phaseLabel) → count` signal map; `ensure(code, phaseLabel)` issues the scoped request when cold; the page writes after each Mine load. | — |
| `ScienceProgramIdService` (root) | `resolve(code): Observable<number \| null>` memoised per session (`shareReplay`), wrapping `GET_ScienceProgramsProgress`; used by `ProgrammeResultsService` and the two services above (DD-3). | — |
| `my-work.view-model.ts` | Pure: `STATUS_COLUMN_MAP`, `filterByPhase`, `groupByColumn`, `orderEditing`, `orderByCreatedDesc`, `readyCount`, `badgeCount`, `totals`. No Angular imports. | — |
| `my-work-section-map.ts` | §5 table as a frozen record + `firstMissingRoute(missing)` + `sectionLabel(name)`. | — |
| Row mapper | `ProgrammeResultRow` gains `resultTypeId: number \| null` (from `result_type_id`) and optional `completeness`; `toProgrammeResultRow` exported (DD-4). Existing fields reused: `id`, `code` (string), `title`, `category`, `statusId`, `statusName`, `createdBy`, `created`, `origin`, `versionId`, `phaseName`, `phaseYear`, `raw`. | — |

### 6.3 Design system usage (from the mockup, `DD-12` Tailwind-first)

| Element | Value (source) |
|---|---|
| Tab anatomy | Same classes as the three existing tabs; icon `view_kanban`; badge `h-[18px] min-w-[18px] rounded-full bg-[var(--pr-color-primary-600)] text-[10.5px] font-bold text-white` (Results filter badge) |
| Surfaces | Page `--pr-surface-app`; action column `bg-white border-[var(--pr-color-primary-200)]`; waiting/closed columns `bg-[var(--pr-surface-app)] border-[var(--pr-border)]`; cards `bg-white border-[var(--pr-border)] rounded-[10px] shadow-[0_1px_2px_rgba(25,21,36,0.05)]` |
| Group labels | `text-[10px] font-bold uppercase tracking-[0.08em]`; action group `text-[var(--pr-color-primary-400)]`, others `text-[var(--pr-text-subtle)]` |
| Status dots / count pills | `STATUS_META` (`result-framework-reporting-home/status-meta.ts`) for Editing, Submitted, Pending, Discontinued; **Quality assessed** (ex-*Approved*, `MWB-T-10`) uses `--pr-status-approved-bg/fg` (#d1fae5 / #047857) — `MWB-DD-7`; Other rail uses the not-started pair |
| Status chip on card | Results tab pill classes with `STATUS_META.chipClass` by `statusId` (fallback not-started tokens) |
| Category chip | Results tab chip verbatim: `h-[16px] rounded-full bg-[var(--pr-color-primary-50)] px-[6px] text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--pr-color-primary-400)]` |
| Code | `font-mono text-[11px] font-semibold tracking-[0.04em] text-[var(--pr-text-subtle)]` |
| Title | `text-[13px] font-semibold leading-[1.35] text-[var(--pr-text-heading)]`, `font-medium` outside Editing |
| Completeness | Label `text-[11px] font-semibold text-[var(--pr-text-secondary)]`; bar `h-[4px] rounded-full bg-[var(--pr-surface-ground)]`, violet gradient fill, `--pr-color-green-500` when ready; missing list `text-[11px] text-[var(--pr-text-muted)]` |
| Primary action | `h-[28px] rounded-[8px] px-[12px] text-[12px] font-semibold text-white` on the brand gradient; secondary: white, `border-[var(--pr-color-primary-200)] text-[var(--pr-color-primary-400)]` |
| Rails | `w-[44px] rounded-[12px]`, vertical label via `writing-mode: vertical-rl` (SCSS) |
| Column widths | ≥ 1440: Editing `w-[360px] flex-none`, expanded columns `flex-1 basis-0 min-w-[260px]`; 900–1439: Editing `w-[320px]`, `min-w-[240px]` (`MWB-T-10` → `T-11`); rails `w-[44px]`; board `flex gap-[16px] px-[32px] overflow-x-auto` (flat row, `MWB-T-10`); lists `min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto`; **< 900**: snap strip, columns `w-[min(85vw,360px)] shrink-0 snap-start`, page scroll, sticky column jumper (`MWB-T-11`) |

### 6.4 States & a11y

- Loading: three column skeletons; no empty state while a request is in flight.
- Error: panel + **Retry**. 404 is not an error (empty).
- Whole-board empty: `Empty.dc.html`; **Go to Reporting** → `entity-details/:code` with `queryParamsHandling: 'preserve'`.
- Columns `role="region"` + `aria-labelledby`; rails `<button aria-expanded>`; badge `aria-label`; status by text.

### 6.5 Explainer copy (`MWB-R-10`, `<app-pr-tab-intro>`)

*What does this tab show?* — "Your results in this Science Program, grouped by status. The board is read-only: open a result to complete it or submit it; quality assessment happens in QA."

### 6.6 Phase model (DD-11)

Same as the Results tab: rows arrive for every phase; `phaseOptions` = distinct `phaseName` of the loaded rows (newest first); selected phase = URL `phase` label when it matches an option, else the current reporting phase (`dataControlSE.reportingPhaseVersion()` name) when it matches, else the newest option. Switching phase re-groups in memory and mirrors the URL (`replaceUrl`, merge). The Overview-selected-phase nuance of the Results tab is not replicated (documented divergence).

## 7. Security & Authorization

Same route family and interceptor as Results; no new guard. *Mine* derives from the JWT on the server. `include_completeness` exposes per result exactly what `green-checks/:id` (v2) already returns.

## 8. Performance & Capacity

- Client: one list request per scope change; phase switches are in-memory; badge on other tabs: one memoised resolve + one scoped list request per (code, phase).
- Server: ≤ 60 procedure calls per flagged request, concurrency 5; default path unchanged. Measured in `MWB-T-6` when the local server is up (3 runs, spread rule); otherwise accepted risk with the cap as mitigation (`requirements.md` §7).

## 9. Observability

Server: `logger.warn('my-work completeness failed', { resultId })` per failed call. Client: nothing new; no payload echoed.

## 10. Testing Plan

| ID | Type | Covers | Location |
|---|---|---|---|
| `MWB-TEST-1` | unit (server) | `foldCompleteness` (P22/P25 fixtures, order, `Number` rule); filter path: no flag → no key + `validateResultById` not called; flag → eligible only, cap 60, chunking, one rejection → `null` + 200 | `results-validation-module/completeness.spec.ts`, `results.service.spec.ts` |
| `MWB-TEST-2` | unit (client) | status→column table incl. 6/7/8/unknown, phase filter, ordering (null first, ties), totals, badge, ready | `my-work-board/my-work.view-model.spec.ts` |
| `MWB-TEST-3` | unit (client) | section map (P22 + P25) + `firstMissingRoute`; row mapper `resultTypeId` + `completeness`; `ScienceProgramIdService` memoisation | `my-work-section-map.spec.ts`, `programme-results.service.spec.ts`, `science-program-id.service.spec.ts` |
| `MWB-TEST-4` | unit (client) | board service: one request per scope, flag only in Mine, 404 → empty, stale drop, error/retry; count service scoped request + cache | `my-work-board/services/*.spec.ts`, `results-api.service.spec.ts` |
| `MWB-TEST-5` | unit (client) | band 4th tab/badge/preserve; page states; phase select default + URL mirror; Continue args (`'4712'`, string); no `[draggable]`; no primary button outside Editing | `reporting-program-band.component.spec.ts`, `my-work-board.component.spec.ts`, column/card specs |
| `MWB-TEST-6` | Cypress CT | 1280×720 / 1440×900: column scroll, body `scrollWidth`, no `[draggable]`, `axe` | `my-work-board/my-work-board.cy.ts` |

## 11. Backwards Compatibility & Migration

Additive only. Rollback = revert the client PR (route + tab disappear) and, independently, the server PR (flag ignored). No data change.

## 12. Design Decisions

### `MWB-DD-1` — Completeness from the v2 validation, folded on the server, eligible + capped
- **Context:** Judgment `L-1`: the `validation` table is dead (unwritten since 2023); P25 computes per result via a stored procedure; P25 sections differ from P22.
- **Decision:** reuse `validateResultById` per eligible item (Editing/Draft, non-IPSR), cap 60, concurrency 5, fold with `foldCompleteness`; flag sent only in Mine scope. **Alternatives:** a batch procedure over many ids (rejected: new SQL surface, no time to validate); client N+1 `green-checks/:id` (rejected: N requests); persisted snapshot (rejected: the snapshot mechanism is dead and would need a writer).

### `MWB-DD-1b` — One status→column table
- **Decision:** the `MWB-R-2` table lives in `my-work.view-model.ts`; merged ids keep their `status_name` on the chip; unmapped ids go to *Other*. **Alternatives:** five ids only (rejected: `L-5` — 6/7/8 exist and would vanish).
- **Amended 2026-09-05 (`MWB-T-10`, user request):** ids 2 + 6 are the column **Quality assessed** in the expanded **Done** group — four groups now (`action` · `waiting` · `done` · `closed`), *Closed* being Discontinued (4, 7) plus the conditional *Other*. The column KEY stays `approved`: it is what the visual tokens (`MWB-DD-7`), the `MyWorkTotals` field and the CT/Jest fixtures are keyed on, and only the label is user-visible.

### `MWB-DD-2` — Opt-in flag on `roles/filter`, not a sibling endpoint
- **Decision:** `include_completeness` on the existing endpoint; default path untouched (contract test). **Alternatives:** `results/my-work` endpoint (rejected: duplicates role/initiative filtering).

### `MWB-DD-3` — Memoised `ScienceProgramIdService`
- **Decision:** extract the SP-code → initiative-id lookup into a root service with `shareReplay`, used by `ProgrammeResultsService`, `MyWorkBoardService`, `MyWorkCountService`. **Alternatives:** duplicate the lookup (rejected: `L-8` — uncached, private; the board and the badge would each re-issue it).

### `MWB-DD-4` — Extend `ProgrammeResultRow`, do not fork it
- **Decision:** add `resultTypeId` and optional `completeness`; export the mapper. **Alternatives:** a `MyWorkRow` type (rejected: two mappings of one payload).

### `MWB-DD-5` — Badge count via a scoped root service
- **Decision:** `MyWorkCountService` per (code, phaseLabel) with a `submitter_id`-scoped, `filter_created_by_me`, `status_id=1,8` request counted by phase label client-side (Editing column = ids 1 and 8); 404 → 0. **Alternatives:** unscoped `limit=1` total (rejected: `L-8` — counts every programme and phase); badge only on the My work tab (rejected: `MWB-R-1`).

### `MWB-DD-6` — Read-only board, native controls
- **Decision:** no DnD library, no `draggable`; CT asserts absence. **Alternatives:** CDK drag with no-op drop (rejected: signals a forbidden capability, `W1`).

### `MWB-DD-7` — Quality assessed column uses the approved status tokens
- **Decision:** `--pr-status-approved-bg/fg` (green) dress the **Quality assessed** column (ids 2 + 6, renamed from *Approved* on 2026-09-05, `MWB-T-10`) and its **Done** group label; *ready to submit* shares the green family. **Alternatives:** `STATUS_META` blue QAed pair (rejected: the intermediate state would read more "done" than this terminal one).

### `MWB-DD-8` — Closed group collapsed, volatile
- **Decision:** page signal, default collapsed, not persisted.

### `MWB-DD-9` — Viewport lock through the existing mixin
- **Decision:** host class `pr-viewport-page` + mixin; `#workArea` single scroller; board `overflow-x-auto`; lists `overflow-y-auto` (`SAV-DD-1`).

### `MWB-DD-10` — In-app section navigation is exempt from nav rule 2
- **Context:** `docs/ux-ui/design.md` §5 rule 2 says deep links to a result MUST land on General Information; it was written for external links (`pdf_link` / `prms_link`). The result detail's own panel menu already navigates to any section route in-app.
- **Decision:** **Continue** navigates to the first missing section route; **Open** and every fallback land on `general-information`. Clarification of rule 2 recorded as a pending archive sync. **Alternatives:** always General Information (rejected: defeats the "reach the gap in one click" outcome; `MWB-US-2`).

### `MWB-DD-11` — Phase is a client-side label filter, as on Results
- **Context:** `L-3`: the Results tab loads all phases and filters by `phaseName`; `?phase=` is a label, not a version id.
- **Decision:** same model (§6.6); completeness is computed server-side for eligible Mine rows across phases (cap 60, newest first). **Alternatives:** server `version_id` filtering (rejected: the client does not know the id before rows load; two round trips).

### `MWB-DD-12` — My work is a new programme-view tab
- **Decision:** the band's reserved centre-view `Drafts` slot is untouched; the comment is extended to name My work as an additional programme-view tab so an Implementer does not read it as the forbidden fix.

### `MWB-DD-13` — HTTP 404 from the list is an empty board
- **Context:** `L-7`: the endpoint throws 404 when the filtered list is empty.
- **Decision:** `MyWorkBoardService` and `MyWorkCountService` map 404 → `[]` / 0; every other error → error state. The Results tab's own handling is out of scope.

## 13. Open Gaps & Follow-ups

- Cross-program My work page; `last_updated_by` in the list payload; a sort control (`MWB-R-20` removed from this cycle).
- Pending archive syncs (shared-file discipline): `docs/trd/trd.md` `W1` ids; `docs/ux-ui/design.md` §5 rule 2 clarification, §4 screen inventory, §5 tab list; `docs/trd/trd.md` §4 flag row.
- The legacy v1 green-checks path (`validation` table) is dead code from the board's point of view; retiring it is a separate change.

## Required cross-references

`./requirements.md` · `./proposal.md` · `./judgment.md` · `docs/prd.md` (`G1`, `US-S1`, `US-P1`, `AC-3`, `AC-5`) · `docs/ux-ui/design.md` (§5, §7, `DD-7`, `DD-12`) · `docs/trd/trd.md` (`W1`, §4) · archived `changes/sp-shell-app-viewport`, `result-framework-reporting/programme-results-created-by-filter`, `changes/sp-tab-explainer-panels`.
