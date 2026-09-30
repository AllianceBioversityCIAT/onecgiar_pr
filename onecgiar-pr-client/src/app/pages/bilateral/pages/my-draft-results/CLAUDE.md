# my-draft-results

**Verified:** 2026-09-29 · JuanGuzman-io/p2-3853-jira-understanding · `AIQ-T-7`; scroll deferred with `afterNextRender`, not `queueMicrotask` (second post-execution fix, same session)

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
- **`?job=<id>` deep link (`AIQ-R-9` D / P-19), from the "AI processes" drawer's "View N drafts" and
  the completion toast — NOT part of the `COV-T-7`/`parseBilateralQueryParams` contract, read
  separately in `ngOnInit` by subscribing to `activatedRoute.queryParamMap` (LIVE, not `snapshot` —
  see Traps).** The matching `sessionGroups()` entry (grouped by `job_id`, same id) gets
  `[id]="'mdr-session-'+group.sessionId"`, is scrolled into view (`scrollWithinNearestScrollContainer()`
  — see Traps, never `scrollIntoView`) and highlighted with Tailwind
  `ring-2 ring-inset ring-[var(--pr-color-primary-300)]` for 4 s (`highlightedSessionId` signal),
  once. Drafts load asynchronously (`bilateralAiService.loadAllDrafts()`), so the job usually is not
  on screen yet when the query-param subscription first fires — a constructor `effect()` applies the
  highlight the first time a matching group appears in `sessionGroups()`. **That effect reads
  `pendingHighlightJobId()` (a signal, not a plain field) AND `sessionGroups()` unconditionally on
  every run, before any early return** — the very first run would otherwise register zero tracked
  dependencies and never fire again once a job id and a matching group show up later.
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
- ⚠️ **Two scroll bugs, same target (P2-3853).** Never `element.scrollIntoView()` — it scrolls EVERY
  scrollable ancestor incl. `pr-viewport-page` (`overflow:hidden` ≥900px; measured `scrollTop` 57).
  `scrollWithinNearestScrollContainer()` walks to the nearest `overflow-y:auto|scroll` ancestor
  (`#workArea`) and scrolls ONLY that. Never defer that scroll with `queueMicrotask()` either — it
  can run BEFORE Angular renders the `@for` group the effect just matched, so `getElementById`
  returns null and the scroll silently never fires (reproduced live on every load, hard reload
  included; the 4 s ring auto-cleared with the target still off-screen). `afterNextRender(cb,
  {injector: this.injector})` waits for the real render; the clear-timer is armed INSIDE that
  callback so it starts once the card is actually visible, not before.
- ⚠️ **The highlight effect must read its two signals unconditionally, before any early return** —
  reading `sessionGroups()` only after an `if (!jobId) return` registers zero dependencies on that
  first (job-less) run, and Angular never re-runs the effect once a job id and a matching group show
  up later. `pendingHighlightJobId` is a signal (not a plain field) for the same reason.
- ⚠️ **`ngOnInit` must subscribe to the LIVE `activatedRoute.queryParamMap`, never read
  `snapshot.queryParamMap.get('job')` once** (P2-3853) — the default `RouteReuseStrategy`
  (`PrmsRouteReuseStrategy` only special-cases `result-detail/:id`) reuses this component when only
  query params change (e.g. the drawer's "View N drafts" from this same tab); `ngOnInit` never
  reruns, so a snapshot read misses the new `?job=` — reproduced live as "group on screen, no
  highlight, no scroll". `queryParamMap` re-emits on reuse and on first load alike.
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
- The mockup's Drafts card (`.design-snapshots/PRMS-Reporting.dc.html:1101-1140`) has a search box, a
  per-card kebab menu and a source-document link this page does not implement, and its reporter also
  wanted to *select* several drafts at once — neither is part of P2-3169/3319, not built, not implied.
