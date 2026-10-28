# my-draft-results

**Verified:** 2026-10-27 · qa-development-2026-ss · 7075736c9 · `ABD-T-3` T-4 rework (fixed bulk bar, checkbox contrast). Prior: `AIQ-T-7`, 2026-09-29.

## What it is
The **Draft Results** tab of the bilateral center dashboard (P2-3169, P2-3315). Lists every AI-generated
result suggestion the center still has to decide on, and offers Review (read-only aside), Create Result
(creates the real result) and Delete on each one. P2-3319 added a **filter by project** on top of the list.
`AIQ-T-7` (2026-09-29) added the `?job=` deep link (see below).

## Contract
- Route: `/bilateral/:centerAcronym/drafts`. No component inputs — everything comes from services
  and `?job=` (read-only, own deep link, see below).
- State: `BilateralAiService` owns it. `draftList()` = source of truth for the list,
  `isDraftListLoaded()` = loading gate, `isPromoting()` = full-screen overlay,
  `projectNameMap()` / `initiativeNameMap()` = id → label lookups.
  `BilateralContextService.centerInstitutionId()` decides which center's drafts are fetched.
- Endpoint: `GET /api/bilateral/center/ai/drafts?centerId=` via
  `BilateralApiService.GET_bilateralAiDrafts`, plus `POST …/drafts/:id/promote` and
  `DELETE …/drafts/:id`. All three are wrapped by `BilateralAiService`, never called from here.
- **`?job=<id>` deep link (`AIQ-R-9` D / P-19)**, from the "AI processes" drawer and the completion toast;
  outside `parseBilateralQueryParams`. The matching `sessionGroups()` entry is scrolled into view and
  ringed for 4 s, once. Drafts load async, so a constructor `effect()` applies it when the group first
  appears; it reads `pendingHighlightJobId()` and `sessionGroups()` unconditionally (see Traps).
- Children reused from the detail page: `app-draft-result-card`, `app-draft-evidence-list`
  (`../bilateral-ai-draft-detail/components/…`).
- Filter state: `services/my-draft-results-filter.service.ts`, **provided on the component**, not in
  root — it must reset when the tab or the center is left. `drafts()` = filtered list rendered,
  `allDrafts()` = everything the center has; the pair is what separates "no drafts yet" from
  "the filter hid them all" (`isFilteredEmpty()`).
- P2-3315 Center validation is a required, client-side confirmation in the Create Result dialog,
  resetting on every open/cancel/complete and gating `onPromoteConfirm()` before
  `BilateralAiService.promoteDraft`. Not persisted: promotion sets `Editing`; Submit for review is
  the only path toward P/A review.
- **Bulk discard (ABD-T-3), Center members only (`isCenterMember()`).** Row `hlm-checkbox` (`aria-label`
  "Select draft: {title}") in a 44px leading column; card select-all in `.mdr-session-header`, over
  VISIBLE drafts only (`group.drafts`, never `allDrafts()`).
- Selection is component-local (`selectedIds`, DD-5). Cleared on tab/centre leave, filter-key or centre
  change, or a selected id no longer visible; that visibility check is skipped while a bulk request is
  in flight (the service removes rows optimistically).
- Viewport-fixed bar `mdr-bulk-bar` (document scrolls, not #workArea; left offset = `--sidebar-width` (`--sidebar-width-icon` when rail collapsed), from `md:`; spacer `mdr-bulk-spacer`) (N selected · Clear · Discard) opens an `app-pr-dialog` confirm; copy in `BULK_COPY`.
- Flow: `BilateralAiService.discardDrafts(ids)` → `POST api/bilateral/center/ai/drafts/discard` `{ draftIds }`
  (1..100) → `{ discarded, failed[{ id, reason }] }`, HTTP 200 on partial. The service removes rows at
  call time, restores failed ids, owns the one toast, and emits `null` on error (selection kept). No
  navigation. Server: one transaction per draft.
- Test trap: `tests/mocks/spartanBrainMock.ts` has no `BrnCheckbox`; the spec stubs `@spartan/checkbox`
  as a `<button role="checkbox">`.

## Where it is used
- `src/app/shared/routing/routing-data.ts` — the `drafts` child route of the bilateral center.
- `../../components/bilateral-page-header/` renders the tab and its pending-drafts badge (`activeTab="drafts"`).

## The payload behind the card (P2-3169 AC2)
`listDrafts` on the server loads `relations: { job: true, result: true }`
(`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:192-202`), so every row
carries more than the draft columns:

| Card field | Comes from |
|---|---|
| Title | `extracted_mds.title` |
| Indicator category | `extracted_mds.indicator` |
| Result type (Output/Outcome) | `result.result_level_id` — 3 Outcome, 4 Output |
| AI-Assistant session | `job_id` (+ `job.created_date`, `job.result_count` in the tooltip) |
| Generation date | `created_date` |
| Draft status | `result.status_id` (8 = Draft) |

The level and the status are stamped by the server when the draft is created, from
`TYPE_BY_INDICATOR` (same file, `:37-48` and `createDraftFromCandidate` at `:397-410`).

## The project filter (P2-3319)
The project is **already in the drafts payload** — `draft.job.project_id`, the same field the card
and the promote dialog print through `BilateralAiService.projectNameMap()`. No new endpoint.

- The dropdown is the shared `app-pr-filter-select`
  (`src/app/shared/components/pr-filter-select/`), the same pill the Science Program Results tab
  uses. Its "no filter" sentinel is the string `'all'`; the filter service's is `null` —
  `selectValue()` / `onProjectFilterChange()` translate between the two.
- `projectFilterOptions()` is built from the **drafts on screen**, not from the CLARISA catalogue,
  so the dropdown can never offer a project that would empty the list. Labels fall back to the raw
  id while `projectNameMap()` is still loading.
- Shape copied from `programme-results/services/programme-results-filter.service.ts` (pure state +
  pure predicate + `clearAll()`), so a second dimension is a signal plus a branch.

## Traps (⚠️ = already broke something)
- ⚠️ **Scroll (P2-3853).** Never `scrollIntoView()` (it also scrolls `pr-viewport-page`); use
  `scrollWithinNearestScrollContainer()`. Never defer it with `queueMicrotask()` (it runs before the
  `@for` renders); use `afterNextRender(cb, {injector})` and arm the clear-timer inside it.
- ⚠️ **The highlight effect must read its two signals unconditionally, before any early return** —
  reading `sessionGroups()` only after an `if (!jobId) return` registers zero dependencies on that
  first (job-less) run, and Angular never re-runs the effect once a job id and a matching group show
  up later. `pendingHighlightJobId` is a signal (not a plain field) for the same reason.
- ⚠️ **Subscribe to the LIVE `activatedRoute.queryParamMap`, never a `snapshot`** (P2-3853): the route
  is reused on query-only changes, so `ngOnInit` does not rerun and a snapshot misses the new `?job=`.
- ⚠️ `BilateralAiDraft` (`../../services/bilateral-ai.interfaces.ts`) **does not model the `result`
  relation** even though the endpoint always returns it — read here through a local
  `DraftResultRelation` cast. Model it on the shared interface next time that file is touched.
- ⚠️ TypeORM serialises `bigint`/`int` columns as **strings** — `status_id` arrives as `"8"`, not `8`.
  Always `Number(...)` before comparing against `BILATERAL_STATUS`. Same reason the project filter
  compares ids through `normalizeProjectId()` instead of `===` (a numeric id vs the dropdown's string).
- ⚠️ The filter must NOT be `providedIn: 'root'` — project ids belong to one center, and
  `BilateralAiService` refetches `draftList()` per switch; a surviving selection would blank the tab.
- ⚠️ No shared client catalogue for result levels: `RESULT_LEVEL_LABELS` here duplicates the private
  `RESULT_LEVELS` of `../../components/bilateral-result-level-selector/`. Change both together.
- Every draft in this list is status `Draft` in practice: promote/decline both set
  `is_discarded = true`, dropping the row from the endpoint's `where`. Status still reads from the
  payload rather than hardcoded, so a server-side change surfaces instead of lying. It replaced a
  decorative "completeness" ring (fixed 50% arc, `Draft` printed inside) — do not bring that back.
- `promoteDraft` navigates away and `discardDraft` reloads the route; both drop the draft from
  `draftList()` optimistically, so nothing here needs to refetch.

## Pending / Coming soon
- The mockup's Drafts card (`.design-snapshots/PRMS-Reporting.dc.html:1101-1140`) has a per-card kebab
  menu and a source-document link this page does not implement — not part of
  P2-3169/3319, not built, not implied.
- Multi-select + bulk discard is built (spec `docs/specs/bilateral/ai-drafts-bulk-discard/`). Bulk
  promote is NOT built.
