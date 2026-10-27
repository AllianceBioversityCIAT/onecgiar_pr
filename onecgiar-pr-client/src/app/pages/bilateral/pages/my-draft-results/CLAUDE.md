# my-draft-results

**Verified:** 2026-10-27 · qa-development-2026-mc-2 · `ADS-T-2` (draft spotlight); earlier: `ADN-T-2` ("New" badge), `AIQ-T-7` scroll via `afterNextRender`

## What it is
The **Draft Results** tab of the bilateral center dashboard (P2-3169, P2-3315). Lists every AI result suggestion
the center still has to decide on; each offers Review (read-only aside), Create Result and Delete. P2-3319 added a
**filter by project**; `AIQ-T-7` the `?job=` deep link (below).

## Contract
- Route: `/bilateral/:centerAcronym/drafts`. No component inputs — everything comes from services
  and `?job=` (read-only, own deep link, see below).
- State: `BilateralAiService` owns it. `draftList()` = source of truth for the list,
  `isDraftListLoaded()` = loading gate, `isPromoting()` = full-screen overlay,
  `projectNameMap()` / `initiativeNameMap()` = id → label lookups.
  `BilateralContextService.centerInstitutionId()` decides which center's drafts are fetched.
- Endpoint: `GET /api/bilateral/center/ai/drafts?centerId=` (+ `POST …/promote`, `DELETE …/drafts/:id`),
  all wrapped by `BilateralAiService`, never called from here.
- **`?job=<id>` deep link (`AIQ-R-9` D / P-19)**, from the drawer's "View N drafts" and the completion toast; NOT part of
  the `COV-T-7` `parseBilateralQueryParams` contract, read in `ngOnInit` from the LIVE `activatedRoute.queryParamMap`
  (see Traps). The `sessionGroups()` entry with that `job_id` has `id="mdr-session-<jobId>"`, is scrolled into view
  (`scrollWithinNearestScrollContainer()`, never `scrollIntoView`) and ringed (`highlightedSessionId`, Tailwind
  `ring-2 ring-inset`) while `?job=` stays in the URL. Drafts load async, so a constructor `effect()` applies it the first
  time the group appears. **It reads `pendingHighlightJobId()` AND `sessionGroups()` unconditionally, before any early return.**
- **Draft spotlight (`ADS-T-2`, `bilateral/ai-draft-spotlight`).** Toast "Open drafts" / drawer "View N drafts" write a
  nonce-keyed `BilateralAiService.draftSpotlightRequest` (10 s expiry). A request effect acts only when the center matches
  (case-insensitive) and the URL already names its job; it clears filters that hide the group (cancelling the search debounce),
  attaches to the `?job=` run, then calls `DraftSpotlightService.show(card, container, …)` after `highlightSettledJobId`
  (set by the 2nd scroll pass) and with no layer open (`selectedDraft`/`promoteTarget`/`discardTarget`/`drawerOpen`/tour,
  tour polled 1 s). The `?job=` effect stays the ONLY scroller. A finished same-job run re-runs through `highlightRearmSeq`.
  `onReview`/`onPromoteClick`/`onDiscardClick`, center change and destroy call `close('programmatic')`; Got it/Esc/overlay
  call `close('dismiss')` and focus the card (`tabindex="-1"`). A reload (`?job=` alone) never shows it.
- **"New" badge (`ADN-T-2`).** `DraftSessionGroup.isNew` = `freshDraftJobIds().has(sessionId)` (own jobs the
  client saw finish with drafts; `draft-<id>` fallback never new), badge `data-testid="mdr-session-new-badge"`
  after the creator badge, copy in `BILATERAL_AI_PROCESSES_COPY.drafts.newBadge`. A constructor effect collects
  the shown `isNew` ids into `shownFreshIds`; `ngOnDestroy` and every `centerInstitutionId()` change away from a
  non-null value call `consumeFreshDraftJobs(shownFreshIds)` (`null`→X never). Review/filters/delete keep it.
- Children reused from the detail page: `app-draft-result-card`, `app-draft-evidence-list`.
- Filter state: `services/my-draft-results-filter.service.ts`, **provided on the component**, not in
  root — it must reset when the tab or the center is left. `drafts()` = filtered list rendered,
  `allDrafts()` = everything the center has; the pair is what separates "no drafts yet" from
  "the filter hid them all" (`isFilteredEmpty()`).
- P2-3315 Center validation: required client-side confirmation in the Create Result dialog (resets on every
  open/cancel/complete), gates `onPromoteConfirm()` before `promoteDraft`. Not persisted; promotion sets `Editing`.

## Where it is used
- `src/app/shared/routing/routing-data.ts` — the `drafts` child route of the bilateral center.
- `../../components/bilateral-page-header/` renders the tab and its pending-drafts badge (`activeTab="drafts"`).

## The payload behind the card (P2-3169 AC2)
`listDrafts` loads `relations: { job: true, result: true }` (`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:192-202`).
Card fields: title `extracted_mds.title` · indicator `extracted_mds.indicator` · Output/Outcome `result.result_level_id`
(3 Outcome, 4 Output) · AI session `job_id` (+ `job.created_date`, `job.result_count` in the tooltip) · date `created_date` ·
status `result.status_id` (8 = Draft). Level and status are stamped by the server from `TYPE_BY_INDICATOR` (same file, `:37-48`, `:397-410`).

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
- Shape copied from `programme-results/services/programme-results-filter.service.ts` (pure state + predicate).

## Traps (⚠️ = already broke something)
- ⚠️ **P-9: the "New" badge is the only cue — no card accent.** Own-job cards already carry an unlayered SCSS
  `.mdr-session-card--me` 4px green left border that beats Tailwind's layered utilities; a card-level accent is inert.
- ⚠️ **P-10: a center switch REUSES this component** (only the parent `:acronym` changes; the shell sets
  `centerInstitutionId` to `null` meanwhile), so `ngOnDestroy` alone misses it. Consume from `shownFreshIds` (what was
  rendered), never from `allDrafts()` at destroy — that list may be another center's or lack a promoted draft.
- ⚠️ **Two scroll bugs, same target (P2-3853).** Never `element.scrollIntoView()`: it scrolls EVERY scrollable ancestor incl.
  `pr-viewport-page` (`overflow:hidden` ≥900px; measured `scrollTop` 57). `scrollWithinNearestScrollContainer()` scrolls ONLY
  the nearest `overflow-y:auto|scroll` ancestor (`#workArea`). Never defer it with `queueMicrotask()`: it can run BEFORE the
  `@for` group renders, so `getElementById` is null and the scroll silently never fires. `afterNextRender(cb, {injector})`
  waits for the real render; the 600 ms second pass is armed INSIDE it.
- ⚠️ **The highlight effect reads its signals unconditionally, before any early return** (zero dependencies on a job-less
  first run otherwise); `pendingHighlightJobId` is a signal for that reason. Same rule for the request effect.
- ⚠️ **`ngOnInit` subscribes to the LIVE `queryParamMap`, never `snapshot`** (P2-3853): the default `RouteReuseStrategy`
  reuses this component when only query params change, so a snapshot read misses the new `?job=`.
- ⚠️ **ADS P-12: a same-URL `navigate()` resolves `false`** (`onSameUrlNavigation: 'ignore'`), so `false` cannot mean
  "cancelled". Entry points navigate only when the URL changes; this page reacts to the request signal instead.
- ⚠️ **ADS P-18: writing the same job id to `pendingHighlightJobId` does not notify.** Re-run a finished run via
  `highlightRearmSeq` (read FIRST by the `?job=` effect). The subscription and the center change reset `highlightSettledJobId`.
- ⚠️ **ADS P-14: driver.js re-measures on WINDOW scroll only**; this page scrolls inside `#workArea`, so the service listens to
  that container and the page calls `refresh()` on a `sessionGroups()` change while active.
- ⚠️ **ADS P-15/P-17: driver.js internals.** The public `destroy()` skips `onDestroyStarted`; `onDestroyed` may not fire
  inside the animation window and restores no focus, so never rely on it: `close()` owns the single path. `highlight()` forces
  `showButtons: []` over the config, so the Got it button and its handler go in the STEP popover. Popover text is `innerHTML`:
  the service escapes the title; the copy file's `<strong>` is the only markup.
- ⚠️ `BilateralAiDraft` (`../../services/bilateral-ai.interfaces.ts`) **does not model the `result`
  relation** even though the endpoint always returns it — read here through a local
  `DraftResultRelation` cast. Model it on the shared interface next time that file is touched.
- ⚠️ TypeORM serialises `bigint`/`int` columns as **strings** — `status_id` arrives as `"8"`, not `8`.
  Always `Number(...)` before comparing against `BILATERAL_STATUS`. Same reason the project filter
  compares ids through `normalizeProjectId()` instead of `===` (a numeric id vs the dropdown's string).
- ⚠️ The filter must NOT be `providedIn: 'root'` — project ids belong to one center; a surviving selection would blank the tab.
- ⚠️ `RESULT_LEVEL_LABELS` here duplicates the private `RESULT_LEVELS` of `../../components/bilateral-result-level-selector/`; change both together.
- Every draft here is status `Draft` in practice (promote/decline set `is_discarded = true`); status still
  reads from the payload so a server-side change surfaces. Do not bring back the old fixed-50% "completeness" ring.
- `promoteDraft` navigates away and `discardDraft` reloads the route; both drop the draft from
  `draftList()` optimistically, so nothing here needs to refetch.

## Pending / Coming soon
- The mockup's Drafts card (`.design-snapshots/PRMS-Reporting.dc.html:1101-1140`) has a kebab menu, a
  source-document link and multi-select this page does not implement (not part of P2-3169/3319).
