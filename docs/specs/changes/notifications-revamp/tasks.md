# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `notifications` → `notifications-revamp` (Requests tab + header bell only)
- **Linked spec:** `docs/specs/changes/notifications-revamp/requirements.md` + `design.md`
- **Owner / driver:** Santiago Sanchez
- **Status:** in-progress — all code PASSed 2026-09-25 (see `execution.md`); only `NOTIF-T-8`'s manual QA sweep (desktop/tablet + Updates-tab regression check) remains before this spec can move to `shipped`

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user selected Continue).
- [x] `design.md` approved (user selected Continue).
- [x] Open questions in `requirements.md` all resolved (`NOTIF-OQ-1`, `NOTIF-OQ-2`).
- [x] No CLARISA dependency — n/a for this spec.
- [x] No conflicting in-flight spec on the same files (checked `docs/specs/notifications/*` — server-side, disjoint).
- [x] No migration — `migration:check` n/a for this spec.

---

## 3. Task list

### `NOTIF-T-1` — Add Spartan `checkbox` and `badge` components

- **Type:** `client`
- **Description:** Run the Spartan CLI to add the `checkbox` and `badge` Helm components (not in `installedComponents` today) so `NOTIF-T-6` and `NOTIF-T-7` can compose them. Register any new `ng-icon`s the copied Helm code needs.
- **Implements:** `NOTIF-R-5`, `NOTIF-R-10` (checkbox facets), `NOTIF-R-4` (decision chip)
- **Files (expected):** `onecgiar-pr-client/src/app/spartan/checkbox/**`, `onecgiar-pr-client/src/app/spartan/badge/**`, `onecgiar-pr-client/components.json`
- **Depends on:** —
- **Blocks:** `NOTIF-T-6`, `NOTIF-T-7`
- **Estimate:** S
- **Review:** `skip-eligible`
- **Verification:**
  - **Falsifier:** `ng g @spartan-ng/cli:info --json` still lists `checkbox`/`badge` as missing after the run.
  - **Red run:** n/a (no test gate) — this is a scaffolding step; correctness is verified by `NOTIF-T-6`/`NOTIF-T-7` compiling against the new imports.
  - **Disqualifier:** if the CLI reports a version mismatch blocking the add, stop and re-run `@spartan-ng/cli:healthcheck` before retrying — do not hand-author the Helm files.
  - **Consumers:** none yet (nothing imports these until `NOTIF-T-6`/`NOTIF-T-7`).
- **Definition of done:**
  - [x] `checkbox` and `badge` appear under `installedComponents` in `@spartan-ng/cli:info --json`. **Amended 2026-09-25** (see `execution.md`): `checkbox` appears; `badge` does not, due to a documented false negative in the CLI's detector (`onecgiar-pr-client/src/CLAUDE.md` §21.7 — "Trust `ls src/app/spartan/`"), reproduced by pre-existing Brain-less components `breadcrumb`/`kbd`. Verified instead via folder presence + template match + `tsconfig.json` alias.
  - [x] Lint clean.
  - [ ] Commit follows the project convention. *(Not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-2` — `group-notifications-by-recency` pipe

- **Type:** `client`, `tests`
- **Description:** Pure pipe `transform(list, dateKey = 'requested_date') → { today: [], thisWeek: [], earlier: [] }`, local-midnight boundaries, stable sort preserved (already-sorted input by `requested_date` desc). No Angular DI beyond `@Pipe`.
- **Implements:** `NOTIF-R-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/pipes/group-notifications-by-recency.pipe.ts`, `...pipe.spec.ts`
- **Depends on:** —
- **Blocks:** `NOTIF-T-5`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a fixed `Date.now()` of `2026-09-25T10:00:00Z` with rows dated `2026-09-25T09:00Z` (today), `2026-09-22T10:00Z` (this week), `2026-08-01T10:00Z` (earlier) MUST land one row in each bucket, in that order.
  - **Red run:** `npx jest --testPathPattern=group-notifications-by-recency.pipe.spec`
  - **Disqualifier:** if `requested_date` turns out to be absent on any row reachable by this pipe (contradicting `NOTIF-P-1`), stop and re-verify the premise before shipping — do not silently coerce to "Earlier".
  - **Consumers:** `NOTIF-T-5` (received/sent templates).
- **Definition of done:**
  - [x] Unit tests cover: today/this-week/earlier boundaries, empty list, missing date (per Disqualifier), single-item list.
  - [x] Coverage thresholds unaffected (pure function, trivially 100%-coverable).
  - [ ] Lint clean; commit follows convention. *(Lint clean confirmed; not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-3` — Center and Bilateral-project filter pipes

- **Type:** `client`, `tests`
- **Description:** Two pipes mirroring `filter-notification-by-initiative.pipe.ts`'s shape: `filterNotificationByCenter(list, centerIds[])`, `filterNotificationByBilateralProject(list, projectIds[])`. Both accept an array (multi-select) and no-op when empty. Read center/project identifiers from the same fields `notification-item.component.html`'s bilateral branch already reads (`obj_result.result_center_array[0].clarisa_center_object...`, bilateral project code) — per `NOTIF-P-3`.
- **Implements:** `NOTIF-R-5`
- **Files (expected):** `.../pipes/filter-notification-by-center.pipe.ts` (+ `.spec.ts`), `.../pipes/filter-notification-by-bilateral-project.pipe.ts` (+ `.spec.ts`)
- **Depends on:** —
- **Blocks:** `NOTIF-T-6`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a mixed list of bilateral and W1/W2 rows, filtered by one real center id, MUST return only the bilateral rows whose `clarisa_institution` id matches — W1/W2 rows MUST be excluded (per `NOTIF-P-4`, they have no matching field, not an error).
  - **Red run:** `npx jest --testPathPattern="filter-notification-by-(center|bilateral-project).pipe.spec"`
  - **Disqualifier:** if a live W1/W2 row is found carrying a genuine center field (refuting `NOTIF-P-4`), stop and re-scope this task to include it rather than silently leaving it unfiltered.
  - **Consumers:** `NOTIF-T-6` (filter popover).
- **Definition of done:**
  - [x] Unit tests cover: match, no-match, empty-filter no-op, mixed bilateral/W1-W2 list.
  - [ ] Lint clean; commit follows convention. *(Lint clean confirmed; not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-4` — Segmented visual for Received/Sent

- **Type:** `client`
- **Description:** Apply Spartan Tabs' Helm visual classes (`hlm-tabs-list`/`hlm-tabs-trigger`) to the two existing `routerLink` `<a>` elements in `requests.component.html`, per `NOTIF-DD-1`. No routing change — `routerLinkActive` still drives the active-state class.
- **Implements:** `NOTIF-R-1`
- **Files (expected):** `onecgiar-pr-client/.../pages/requests/requests.component.html`, `requests.component.scss` (trim now-dead `.requests_header_item` rules)
- **Depends on:** —
- **Blocks:** `NOTIF-T-8`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** navigating to `/result/results-outlet/results-notifications/requests/sent` MUST render the "Sent" trigger in its active visual state and MUST still load `SentRequestsComponent` via the router (deep link intact).
  - **Red run:** `npx jest --testPathPattern=requests.component.spec`
  - **Disqualifier:** if achieving the visual match requires instantiating a real Spartan `Tabs` component (state conflicts with router-driven navigation), stop and escalate — re-open `NOTIF-DD-1` rather than hand-rolling a parallel active-state tracker.
  - **Consumers:** none shared — this markup has no other call site.
- **Definition of done:**
  - [x] Both deep links (`/requests/received`, `/requests/sent`) still work and show correct active styling.
  - [x] No new hardcoded hex (`NOTIF-R` NFR "Visual consistency").
  - [ ] Lint clean; commit follows convention. *(Lint clean confirmed; not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-5` — Regroup Received/Sent by recency

- **Type:** `client`, `tests`
- **Description:** Replace the "Pending" / "Done" two-section template in `received-requests.component.html` and `sent-requests.component.html` with one list piped through `groupByRecency` (`NOTIF-T-2`), rendering Today/This week/Earlier headers with a Helm `badge` count pill (zero-length buckets skipped, per `NOTIF-R-2`). Existing filter pipes (`filterNotificationByInitiative`, `appFilterNotificationBySearch`, and the new center/bilateral-project pipes from `NOTIF-T-3`) still run *before* grouping.
- **Implements:** `NOTIF-R-2`, `NOTIF-AC-1`
- **Files (expected):** `.../received-requests/received-requests.component.html`, `.../sent-requests/sent-requests.component.html`, both `*.component.spec.ts`
- **Depends on:** `NOTIF-T-2`, `NOTIF-T-3`
- **Blocks:** `NOTIF-T-8`
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a fixture with one pending row dated today and one done row dated three weeks ago MUST render two group headers ("Today" count 1, "Earlier" count 1) with no "Pending"/"Done" text remaining in the DOM.
  - **Red run:** `npx jest --testPathPattern="(received|sent)-requests.component.spec"`
  - **Disqualifier:** if the existing skeleton-loading (`app-skeleton-notification-item`) or empty-state text breaks under the new structure, fix within this task — do not ship a regressed loading/empty state to hit the estimate.
  - **Consumers:** `received-requests.component.spec.ts`, `sent-requests.component.spec.ts` (both updated in this same task per the `NOTIF-DD-2` reversion challenge).
- **Definition of done:**
  - [x] Old "Pending"/"Done" assertions replaced with recency-group assertions in both spec files.
  - [x] Loading (skeleton) and empty states verified unchanged in behavior.
  - [x] Coverage thresholds (50/60/60/60) unaffected.
  - [ ] Lint clean; commit follows convention. *(Lint clean confirmed; not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-6` — Filter popover (Phase + Program + Center + Bilateral project)

- **Type:** `client`, `tests`
- **Description:** In `results-notifications.component.html`, replace the always-visible Phase/Program/Search/Clear-filters row (while the Requests tab is active) with: a Filter button (Spartan `popover`, badge showing active-facet count) opening a panel that contains the *existing* Phase `app-pr-select`, the *existing* Program `app-pr-select` (both unchanged, per `NOTIF-DD-3`), plus **new** Center and Bilateral-project checkbox lists (Spartan `checkbox`, from `NOTIF-T-1`, filtered by `NOTIF-T-3`'s pipes). Active facets render as removable chips (Helm `badge` + close icon, `aria-label="Remove filter"`) with a "Clear all" action wired to the existing `clearAllFilters()`. The visible search input (`searchFilter`) stays outside the popover, restyled to match the mockup.
- **Implements:** `NOTIF-R-5`, `NOTIF-R-6`, `NOTIF-R-7`, `NOTIF-R-10` (Program relocated unchanged, per `NOTIF-DD-3`'s fallback made default), `NOTIF-AC-3`, `NOTIF-AC-4`
- **Files (expected):** `results-notifications.component.html`, `results-notifications.component.ts` (new `centerIdsFilter`/`bilateralProjectIdsFilter` state + extend `clearAllFilters()`), `results-notifications.component.scss`, `results-notifications.component.spec.ts`. **Leader amendment 2026-09-25** (see `execution.md`): also `received-requests.component.html` and `sent-requests.component.html` — the new filter state must be exposed through `ResultsNotificationsService` (matching how `initiativeIdFilter`/`searchFilter` already work) and chained into those two templates' existing `@let ... | filterNotificationByInitiative: ... | appFilterNotificationBySearch: ...` pipe pipelines, alongside the `NOTIF-T-2` recency grouping `NOTIF-T-5` adds. `NOTIF-T-5` runs first and does not add these two pipes (they don't exist as usable filter state until this task runs) — this task closes that loop.
- **Depends on:** `NOTIF-T-1`, `NOTIF-T-3`
- **Blocks:** `NOTIF-T-8`
- **Estimate:** M
- **Review:** `full` (shared filter state touched by both Received and Sent)
- **Verification:**
  - **Falsifier:** checking one Center checkbox MUST add exactly one chip, narrow both Received and Sent lists identically, and increment the Filter button's badge to `1`; clicking that chip's remove button MUST clear it and widen the list back.
  - **Red run:** `npx jest --testPathPattern=results-notifications.component.spec`
  - **Disqualifier:** if the Phase-gating logic on the Program select (`onPhaseChange`, disabled-until-phase-selected) breaks once relocated into the popover, fix it in this task — the existing gating behavior is a hard carry-over, not negotiable.
  - **Consumers:** `received-requests.component.html`, `sent-requests.component.html` (both read the same filter state via `ResultsNotificationsService`/component inputs — verify neither regresses).
- **Definition of done:**
  - [x] `aria-expanded` on the Filter trigger; keyboard-operable (Tab/Enter/Escape) per WCAG 2.1 AA.
  - [x] "Clear all" resets every facet including the two new ones.
  - [x] i18n: no new hardcoded domain copy beyond the structural labels already agreed in `design.md` §6.3.
  - [ ] Lint clean; commit follows convention. *(Lint clean confirmed; not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-7` — Restyle `notification-item` row + decision chip

- **Type:** `client`, `tests`
- **Description:** Restyle `notification-item.component.html` only (no `.ts` change): compact row shell (avatar/entity icon, `font-mono` result code, single-line text, right-aligned action area), and add a Helm `badge` decision chip (green tint = Accepted, red tint = Declined, reusing `--pr-color-green-500`/`--pr-color-red-300` per `NOTIF-DD-4`) next to the existing "Status: Accepted/Rejected by …" line for `request_status_id` cases `2`/`3`. Case `1` (pending) keeps the existing Accept/Decline `app-pr-button`s untouched. All dialogs (`showConfirmRejectDialog`, `showTocPromptDialog`, `showTocMappingDialog`) and their bindings are untouched verbatim.
- **Implements:** `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-9`, `NOTIF-AC-2`
- **Files (expected):** `.../components/notification-item/notification-item.component.html`, `notification-item.component.scss`, `notification-item.component.spec.ts`
- **Depends on:** `NOTIF-T-1`
- **Blocks:** `NOTIF-T-8`
- **Estimate:** M
- **Review:** `full` (touches the component the folder's own `CLAUDE.md` documents as trap-heavy)
- **Verification:**
  - **Falsifier:** for a fixture row with `request_status_id: 2`, the rendered DOM MUST contain both the existing "Accepted by …" text and the new chip; for `request_status_id: 1`, clicking **Accept contribution** on a bilateral fixture MUST still open `showTocPromptDialog` exactly as before (unchanged `.ts`).
  - **Red run:** `npx jest --testPathPattern=notification-item.component.spec`
  - **Disqualifier:** if any existing test in `notification-item.component.spec.ts` covering accept/decline/ToC-mapping starts failing, that is a **stop-and-fix-the-template** signal, not a "update the test" signal — the trap list in this component's `CLAUDE.md` says these paths are exactly where past regressions happened.
  - **Consumers:** `received-requests.component.html`, `sent-requests.component.html` (both render `<app-notification-item>`).
- **Definition of done:**
  - [x] Every pre-existing `notification-item.component.spec.ts` test still passes unmodified (proves `.ts` was untouched).
  - [x] New chip-rendering assertions added for status 2 and 3.
  - [x] No new hardcoded hex; chip colors trace to `--pr-color-green-500`/`--pr-color-red-300`.
  - [ ] Lint clean; commit follows convention. *(Lint clean confirmed; not committed — Leader holds commit per user's no-auto-commit standing instruction.)*

---

### `NOTIF-T-8` — Bell/badge alignment + full manual verification

- **Type:** `client`, `tests`
- **Description:** Tailwind-only spacing/size pass on the bell icon/badge/tooltip in `shell-topbar.component.html` against the mockup (`NOTIF-DD-5`). Then run the full manual browser check across desktop and tablet widths: Received/Sent segmented navigation, Filter popover (all facets + chips + clear-all), Accept/Decline including the bilateral ToC-mapping dialogs, decision chips, and the Updates tab (regression check — must render exactly as before).
- **Implements:** `NOTIF-R-8`, `NOTIF-AC-5`, `NOTIF-AC-6`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.html` (+ `.scss` if needed)
- **Depends on:** `NOTIF-T-4`, `NOTIF-T-5`, `NOTIF-T-6`, `NOTIF-T-7`
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** with `hasUnread = true` and `unreadCount = 4`, the badge MUST render at the mockup's approximate size/position (visual diff against `mockups/screenshots/bell-icon-badge.png`, by eye — no automated visual-diff tool in this repo, see Disqualifier).
  - **Red run:** `npx jest --testPathPattern=shell-topbar.component.spec`
  - **Disqualifier:** **this task's dominant defect class (visual misalignment) has no automated gate** — `axe`/Jest cannot evaluate pixel spacing against a screenshot. The manual browser check (desktop + tablet) is the substitute gate, per `requirements.md` §"Non-Functional" visual-consistency note; treat a skipped manual check as an incomplete task, not a passed one.
  - **Consumers:** none shared beyond the shell itself.
- **Definition of done:**
  - [ ] Manual check performed at desktop (≥1280px) and tablet (~768px) widths; both recorded as done in the PR description. *(Code portion PASSed 2026-09-25 — bell/badge token cleanup + confirmed already-correct sizing. This checkbox is the manual sweep itself and stays open until the user performs and confirms it — see `execution.md`.)*
  - [ ] Updates tab confirmed unregressed (out-of-scope tab still renders as before — `NOTIF-AC-5`). *(Same — open pending manual confirmation; this is also where `NOTIF-T-6`'s tab-scoping fix gets its final live check.)*
  - [ ] Lint clean; commit follows convention.

---

### `NOTIF-T-10` (unplanned, user-directed) — Row restructure to match an updated reference file

- **Type:** `client`, `tests`
- **Description:** the user provided a newer reference design file (superseding the spec's original mockup for the row's exact shape) and confirmed it should be followed exactly: remove the Requester/Responder/bilateral-source header chips (no equivalent in the new reference); flatten the per-row card styling into one continuous bordered list, rows separated by `border-bottom` only; shorten Accept/Decline button labels (superseding an earlier ticket, P2-3106); move the decided-state caption under the main sentence instead of a separate right-side column.
- **Implements:** a user-directed visual-fidelity correction to `NOTIF-R-3`/`NOTIF-DD-2`'s original presentation (the underlying data/logic is unchanged).
- **Files:** `components/notification-item/notification-item.component.{html,scss,spec.ts,CLAUDE.md}`, `pages/requests/pages/received-requests/received-requests.component.scss`, `pages/requests/pages/sent-requests/sent-requests.component.scss`.
- **Depends on:** — (post-PASS correction on top of `NOTIF-T-5`/`NOTIF-T-7`'s already-shipped work).
- **Review:** `full` (large diff, touches the trap-heavy `notification-item` component's DOM shape).
- **Status:** PASSed (attempt 2) — see `execution.md`.

---

### `NOTIF-T-11` (unplanned, user-directed) — Move Search/Filter popover into Requests tab, align per reference row

- **Type:** `client`, `tests`
- **Description:** per the same updated reference file (`NOTIF-T-10`), the Received/Sent segmented control, Search box, Filter popover, and a "Notification settings" button must all render in one flex row — architecturally requiring the Search/Filter popover cluster (built in `NOTIF-T-6`, fixed in `NOTIF-T-9`) to move from the parent `ResultsNotificationsComponent` down into the routed-child `RequestsComponent`. Also centralizes `phaseList`/`filteredInitiatives`/`entityLabel`/`getAllPhases`/`onPhaseChange`/`filterInitiativesByPhase` onto `ResultsNotificationsService` (single owner) to prevent cross-tab state divergence between Requests and Updates.
- **Implements:** the user-directed row-layout request; a correctness fix for `NOTIF-AC-5` (Updates must be unaffected by Requests' filter state).
- **Files:** `pages/requests/requests.component.{ts,html,scss,module.ts,spec.ts}`, `results-notifications.component.{ts,html,scss,module.ts,spec.ts}`, `results-notifications.service.{ts,spec.ts}`.
- **Depends on:** `NOTIF-T-6`, `NOTIF-T-9` (relocates their work, doesn't change its behavior).
- **Review:** `full` (large diff, shared-state architecture change).
- **Status:** PASSed (attempt 3 of 3 — see `execution.md` for the full 3-attempt history: a cross-tab state-duplication bug, then a regression-causing re-fetch guard, both real defects caught before shipping).

---

### `NOTIF-T-12` (unplanned, user-reported) — Filter popover overflows viewport on narrow windows

- **Type:** `client`, `tests`
- **Description:** the Filter popover (relocated in `NOTIF-T-11`) overflowed past the right edge of the browser on narrower windows instead of repositioning, because the underlying Spartan popover library has no built-in horizontal-fallback positioning and disables CDK's viewport-push safety net. Fixed by computing which side to open on (`align='start'`/`'end'`) based on available space, right before the popover opens.
- **Files:** `pages/requests/requests.component.{ts,html,spec.ts}`.
- **Depends on:** `NOTIF-T-9`, `NOTIF-T-11` (fixes a gap in their combined result, doesn't change their own logic).
- **Review:** `checklist` (single-file, well-diagnosed fix).
- **Status:** PASSed (attempt 1) — see `execution.md`.

---

### `NOTIF-T-13` (unplanned, user-reported) — Filter popover overflows past the top of the viewport

- **Type:** `client`
- **Description:** the mockup's `max-height:420px;overflow-y:auto` spec for the filter panel was never carried over (only `width` was, in `NOTIF-T-9`) — without a height cap, the panel could grow tall enough that CDK's overlay positioning flipped it above the trigger and it overflowed past the top of the viewport. Fixed by adding the missing `max-height`/`overflow-y`, matching the mockup exactly.
- **Files:** `pages/requests/requests.component.scss`.
- **Depends on:** `NOTIF-T-9`, `NOTIF-T-12` (same popover, orthogonal fix).
- **Review:** `checklist` (single-property CSS fix).
- **Status:** PASSed (attempt 1) — see `execution.md`.

---

### `NOTIF-T-14` (unplanned, user-directed) — Rebuild Filter dropdown as a plain positioned panel

- **Type:** `client`, `tests`
- **Description:** replaced the Filter dropdown's underlying mechanism — Spartan's CDK-based `hlm-popover` overlay — with a plain, self-positioned `position:relative`/`position:absolute` panel (matching the user's own reference mockup's technique), per `NOTIF-DD-7`. Four real, distinct bugs across `NOTIF-T-6`/`T-9`/`T-12`/`T-13` in the CDK mechanism motivated the replacement rather than continuing to patch around a shared library directive's unconditional limitations.
- **Files:** `pages/requests/requests.component.{ts,html,scss,spec.ts}`, `pages/requests/requests.module.ts`.
- **Depends on:** `NOTIF-T-6`, `NOTIF-T-9`, `NOTIF-T-11`, `NOTIF-T-12`, `NOTIF-T-13` (supersedes the CDK-specific parts of `T-9`/`T-12`, preserves their logic/values).
- **Review:** `full` (mechanism replacement on a control that had failed review 4 times under its prior mechanism).
- **Status:** PASSed (attempt 1) — see `execution.md`.

---

### `NOTIF-T-15` (unplanned, user-requested) — Search inputs on Center/Bilateral-project facets

- **Type:** `client`, `tests`
- **Description:** added per-facet search inputs to the Center and Bilateral-project checkbox lists in the Filter dropdown, matching the reference mockup. Program facet confirmed out of scope (already has search via `app-pr-select`'s own built-in behavior).
- **Files:** `pages/requests/requests.component.{ts,html,spec.ts}`.
- **Depends on:** `NOTIF-T-6` (the facet lists), `NOTIF-T-14` (the dropdown mechanism they live inside).
- **Review:** `checklist` (small, additive, well-scoped feature).
- **Status:** PASSed (attempt 1) — see `execution.md`.

### `NOTIF-T-16` (unplanned, user-reported defect) — Bilateral-project facet used wrong identifier (server payload gap)

- **Type:** `server`, `client`, `tests`
- **Description:** the "Bilateral project" filter facet showed the notification's own RESULT code/title (`obj_result.result_code`/`.title`) instead of the true bilateral PROJECT identifier (`clarisa_projects.short_name`/`.full_name`, the "B-A1080" style code from the Projects Catalog). Root cause: `share-result-request.service.ts`'s `getRequestSelectFields()`/`getRequestRelations()` never joined `results_by_projects` → `clarisa_projects`, so no correct field existed for the client to read — this was not a client mis-mapping, the data was never in the payload. Fix: add the join/select on the server (mirroring the pattern already used by `ResultTaggedNotificationService` and `BilateralProjectsService.getProjectsByCenter`), then rewire `bilateralProjectFacetOptions` (`requests.component.ts`) and `filter-notification-by-bilateral-project.pipe.ts` to key off `shortName`/`fullName`/project id instead of `result_code`.
- **Files:** `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts`; `onecgiar-pr-client/.../pages/requests/requests.component.{ts,spec.ts}`; `onecgiar-pr-client/.../pipes/filter-notification-by-bilateral-project.pipe.{ts,spec.ts}`; `onecgiar-pr-client/.../notification-item/` (typing only, if `obj_result` shape changes).
- **Depends on:** `NOTIF-T-6` (the facet it corrects), `NOTIF-T-11` (the facet's current home), `NOTIF-T-15` (the search box built on top of it).
- **Review:** `checklist` (server relation change + client rewire; not security/migration-shaped, but crosses the client/server boundary — Reviewer must confirm the new relation doesn't change the response shape for any other consumer of `getRequest()`).
- **Status:** in progress.

### `NOTIF-T-17` (unplanned, user-reported defect) — Notifications page renders inside the boxed `.section_container` card, mockup has none

- **Type:** `client`
- **Description:** `results-outlet.component.html` wraps every non-`results-list` routed page (i.e. Notifications) in `.section_container` (`styles/containers.scss`: white background, `%global-shadow-1`, `border-radius: 8px`, centered `width: 90–97%`). The reference mockup's content area is flush against the page background (`padding: 32px`, no card chrome). `results-list` already opts out via `.local_container--flush`; Notifications never got an equivalent opt-out. Fix: give the Notifications route the same flush treatment (new modifier or reuse `--flush`, whichever preserves the padding the mockup expects without reintroducing `results-list`'s zero-margin behavior verbatim).
- **Files:** `onecgiar-pr-client/.../results-outlet/results-outlet.component.{ts,html,scss}`.
- **Depends on:** none (independent styling fix).
- **Review:** `checklist` (single shared-shell file, but touches a file outside `results-notifications/` — Reviewer must confirm `results-list`'s own flush rendering is unaffected).
- **Status:** PASSed (attempt 1) — see `execution.md`.

### `NOTIF-T-16` (unplanned, user-reported defect) — Bilateral-project facet server payload fix

- **Type:** `server`, `client`, `tests`
- **Description:** see the full entry above (added between `NOTIF-T-15` and `NOTIF-T-17` in document order in `execution.md` — this entry is placed here to keep `tasks.md` append-only in dispatch order). Root cause: `share-result-request.service.ts`'s `getRequest()` never joined `results_by_projects` → `clarisa_projects`. Fix added the join, filtered soft-deleted (`is_active: false`) links, and rewired the client facet/pipe to `shortName`/`fullName`.
- **Files:** `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.{ts,spec.ts}`; `onecgiar-pr-client/.../pages/requests/requests.component.{ts,spec.ts}`; `onecgiar-pr-client/.../pipes/filter-notification-by-bilateral-project.pipe.{ts,spec.ts}`; `received-requests.component.spec.ts`; `sent-requests.component.spec.ts`.
- **Depends on:** `NOTIF-T-6`, `NOTIF-T-11`, `NOTIF-T-15`.
- **Review:** `checklist`, crossed client/server boundary. Two rounds: attempt 1 FAILed (missing `is_active` filter — soft-deleted project links could still surface), attempt 2 PASSed.
- **Status:** PASSed (attempt 2) — see `execution.md`.

### `NOTIF-T-18` (unplanned, user-requested task) — Notifications explainer moved into an ⓘ tooltip; "Results Center" breadcrumb removed

- **Type:** `client`, `tests`
- **Description:** the permanently-visible explainer paragraph under the tabs replaced with an ⓘ tooltip next to the "Notifications" title (per-tab content, same copy verbatim), using the codebase's shared `.sgi-dac-info`/`<app-pr-info-icon>` trigger pattern. Bundled the user's separate ad-hoc request to remove the "Results Center" breadcrumb (`results-outlet.component.html`'s `<app-page-header>`), which only ever rendered for Notifications.
- **Files:** `results-notifications.component.{html,ts,scss,spec.ts}`; `results-outlet.component.{html,ts}`; `results-outlet.module.ts`.
- **Depends on:** none (independent).
- **Review:** `checklist`. Two rounds: attempt 1 FAILed (bespoke icon bypassing the shared `.sgi-dac-info` pattern — a known font-ligature production defect risk per P2-3339 — plus a dead trigger left rendering on Settings, plus leftover dead code); attempt 2 PASSed.
- **Status:** PASSed (attempt 2) — see `execution.md`.

---

## 4. Dependency graph

```
NOTIF-T-1 (Spartan checkbox+badge) ──┬── NOTIF-T-6 (filter popover) ──┐
NOTIF-T-3 (center/bilateral pipes) ──┤                                 │
NOTIF-T-2 (recency pipe) ────────────┴── NOTIF-T-5 (regroup lists) ────┤
NOTIF-T-1 ─────────────────────────────── NOTIF-T-7 (row + chip) ──────┤
NOTIF-T-4 (segmented tabs visual, no deps) ─────────────────────────────┼── NOTIF-T-8 (bell + full manual QA)
```

Parallel-safe: `NOTIF-T-1`, `NOTIF-T-2`, `NOTIF-T-3`, `NOTIF-T-4` have no dependencies on each other and can run concurrently. `NOTIF-T-6` and `NOTIF-T-7` can also run in parallel once `NOTIF-T-1`/`NOTIF-T-3` land. `NOTIF-T-8` is the single integration point.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `NOTIF-TEST-1` | unit (client) | `NOTIF-R-2` | `.../pipes/group-notifications-by-recency.pipe.spec.ts` |
| `NOTIF-TEST-2` | unit (client) | `NOTIF-R-5` | `.../pipes/filter-notification-by-center.pipe.spec.ts`, `filter-notification-by-bilateral-project.pipe.spec.ts` |
| `NOTIF-TEST-3` | unit (client) | `NOTIF-R-1`, `NOTIF-AC-5` | `.../pages/requests/requests.component.spec.ts` |
| `NOTIF-TEST-4` | unit (client) | `NOTIF-R-2`, `NOTIF-AC-1` | `received-requests.component.spec.ts`, `sent-requests.component.spec.ts` |
| `NOTIF-TEST-5` | unit (client) | `NOTIF-R-5`, `NOTIF-R-6`, `NOTIF-AC-3`, `NOTIF-AC-4` | `results-notifications.component.spec.ts` |
| `NOTIF-TEST-6` | unit (client) | `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-9`, `NOTIF-AC-2` | `notification-item.component.spec.ts` |
| `NOTIF-TEST-7` | manual | `NOTIF-R-8`, `NOTIF-AC-5`, `NOTIF-AC-6` | Browser check per `NOTIF-T-8` — no automated gate for visual alignment (documented gap, not silently skipped) |

Client coverage MUST stay above 50/60/60/60 — new pipes are trivial, fully coverable; template-only changes to existing components don't lower branch coverage on their `.ts` files (untouched).

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build). `migration:check:ci` n/a (no migration).
- [ ] Manual QA on staging: Received/Sent, filters, accept/decline (incl. bilateral ToC dialogs), decision chips, bell, Updates-tab regression check.
- [ ] No bilateral/platform-report change — no downstream notification needed.
- [ ] Not an admin/role/phase change — no runbook update needed.

**PR strategy:** single PR is fine (~400–450 LOC, all client, no cross-cutting risk beyond `notification-item`). If the reviewer prefers smaller diffs, split as:
- **PR 1:** `NOTIF-T-1`, `NOTIF-T-2`, `NOTIF-T-3` (pipes + Spartan components, no visible UI change yet — safe to merge first).
- **PR 2:** `NOTIF-T-4`, `NOTIF-T-5`, `NOTIF-T-6`, `NOTIF-T-7`, `NOTIF-T-8` (the actual visual revamp, reviewed as one cohesive UI change since the mockup is one screen).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] Promote `NOTIF-DD-1..5` into `docs/ux-ui/design.md` §12 if any of these patterns (router-styled-as-tabs, popover-based multi-facet filter) get reused elsewhere.
- [ ] Follow-up spec (deferred, not this chunk): Updates + Settings tabs visual revamp.
- [ ] Follow-up (deferred, not this chunk): Program facet → multi-select, if the user wants full mockup parity later (`NOTIF-DD-3`).

---

## 8. Roll-back plan

1. Revert the PR(s) (single revert if shipped as one PR; revert PR 2 only if split — PR 1's pipes/components are inert until PR 2 wires them in, so PR 1 can safely stay).
2. No migration to revert — n/a.
3. No feature flag introduced — nothing to disable.
4. No bilateral/platform-report payload touched — no fixture comparison needed.
5. No downstream consumers to notify.

---

## Required cross-references

- `docs/specs/changes/notifications-revamp/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/.../notification-item/CLAUDE.md` — the trap list `NOTIF-T-7`'s Disqualifier is built on.
