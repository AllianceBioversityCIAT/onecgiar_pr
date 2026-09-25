# Module Spec — `design.md`

## 1. Summary

Restyle the Requests tab (Received/Sent) and the header bell to match the approved mockup, entirely in the presentation layer: new grouping (Today/This week/Earlier) and a new Filter popover are added around the **existing** data (`results-notifications.service.ts`) and **existing** accept/decline/ToC-mapping logic (`notification-item.component.ts`), which are not touched. Biggest constraint: `notification-item.component.ts` carries real, trap-documented business logic (P2-3187 AC4) — every change here is template/CSS, verified against its own `CLAUDE.md` trap list.

Requirements: `docs/specs/changes/notifications-revamp/requirements.md`. Project references: `docs/ux-ui/design.md` §6/§7/§12 (DD-12), `onecgiar-pr-client/CLAUDE.md` §5, `onecgiar-pr-client/src/CLAUDE.md` §3.3/§21.7.

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `NOTIF-P-1` | Every request row (received/sent, pending or done) carries `requested_date` | `results-notifications.service.ts` `get_section_information`/`get_sent_notifications`, both `.sort((a,b) => Date.parse(b.requested_date) - Date.parse(a.requested_date))` | Read the sort calls — the field is dereferenced unconditionally, so a missing value would already break today's ordering | `verified` | Grouping falls back to a single "Earlier" bucket for rows with no date; log as a data-quality gap, not a spec blocker |
| `NOTIF-P-2` | `request_status_id` is `1` (pending), `2` (accepted), or `3` (declined) for every Requests-tab row this spec touches | `notification-item.component.ts` `@switch (notification?.request_status_id)` (cases 1/2/3) and `acceptOrReject()` (`isAccept ? 2 : 3`) | Read both sites — the template only defines behavior for 1/2/3; `4` appears only in `get_section_innovation_packages()`, a different (IPSR) data path never rendered by `received-requests`/`sent-requests` | `verified` | An unhandled value would already render nothing today (no `@default` case) — pre-existing, not introduced by this spec |
| `NOTIF-P-3` | Bilateral-kind rows carry center (`obj_result.result_center_array[0].clarisa_center_object.clarisa_institution`) and project identifiers usable for new filter facets | `notification-item.component.html` bilateral branch (`isBilateralResult`) | Read the template's bilateral text-building branch | `verified` | Center/Bilateral-project facets simply return zero matches for that facet — no error, per `NOTIF-P-1` in `requirements.md` |
| `NOTIF-P-4` | No W1/W2 (non-bilateral) row exposes an equivalent "Center" or "Bilateral project" value | Same template — only the `isBilateralResult` branch reads center/project fields | Read both branches (bilateral vs non-bilateral) side by side | `assumed` | If W1/W2 rows do carry a usable center field, extend the Center facet to them in a follow-up task — not a rework, an enhancement |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched (all under `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/`):**
  - `results-notifications.component.{html,ts,scss}` — shell filter row (Phase/Program/Search), visible only while Requests is active.
  - `pages/requests/requests.component.html` — Received/Sent header.
  - `pages/requests/pages/received-requests/`, `pages/requests/pages/sent-requests/` — grouping.
  - `components/notification-item/notification-item.component.{html,scss}` — row visual + decision chip (`.ts` untouched).
  - `pipes/` — one new pipe added (recency bucketing); existing filter pipes reused; two new filter pipes added (center, bilateral project).
- **Shared client component touched:** `onecgiar-pr-client/src/app/shared/components/shell-topbar/` — bell/badge alignment only.
- **No server modules touched.** No CLARISA, ToC, RMQ, or Cognito surface is affected.

### 2.2 Interaction flow (unchanged, restyled)

```
[Requests tab: Received]
  └── ReceivedRequestsComponent.ngOnInit()
        └── ResultsNotificationsService.get_section_information(phaseFilter)   ← UNCHANGED
              └── GET_allRequest → { receivedContributionsPending, receivedContributionsDone }
                    └── [NEW] groupByRecency(pending ∪ done) → { today[], thisWeek[], earlier[] }
                          └── each row → <app-notification-item>                ← .ts UNCHANGED
                                ├── status 1 → Accept/Decline buttons (existing PATCH_updateRequest flow)
                                └── status 2/3 → [NEW] decision chip (Accepted/Declined), same data
```

The only new node in this flow is the client-side `groupByRecency` step — everything above and below it is the existing, verified pipeline.

---

## 3. Data Model Changes

None. No entity, no migration, no CLARISA sync change. (§3 of the template is N/A for this spec — presentation layer only, confirmed against `NOTIF-P-1..4`.)

---

## 4. API Surface

None. No endpoint added, changed, or versioned. No bilateral/platform-report impact.

---

## 5. Server Workflow / Business Rules

None — no server code touched.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routes change. `received`/`sent` remain separate routed sub-modules (`received-requests.module.ts`, `sent-requests.module.ts`) — **not** collapsed into a single Spartan-Tabs content-swap, to avoid re-wiring the existing lazy-loaded routing (see `NOTIF-DD-1`).

### 6.2 Components & services

| Component | Change |
|---|---|
| `results-notifications.component.ts/html` | Filter row becomes a Filter-button + popover (Spartan `popover`, already installed) containing: existing Phase `app-pr-select`, existing Program `app-pr-select` (kept single-select, `NOTIF-DD-3`), **new** Center checkbox list, **new** Bilateral-project checkbox list. Active facets render as chips below the button; "Clear filters" becomes "Clear all" on the chip row (same `clearAllFilters()` method). |
| `requests.component.html` | The two `routerLink` `<a>` tabs get Spartan Tabs **visual** classes (`hlm-tabs-list`/`hlm-tabs-trigger` styling) while keeping `routerLink`/`routerLinkActive` navigation — no Spartan `Tabs` component instance, no state-machine rewiring (`NOTIF-DD-1`). |
| `received-requests.component.html`, `sent-requests.component.html` | Replace the "Pending" / "Done" two-section template with one list rendered through the new `groupByRecency` pipe, producing Today/This week/Earlier sections with a Helm `badge` count pill per group header. |
| `notification-item.component.html` | Row shell restyled (avatar/icon + `font-mono` result code + single-line text + action area), **status 2/3 branches gain a Helm `badge`-based decision chip** (green tint for Accepted, red tint for Declined) alongside the existing "Status: Accepted/Rejected by …" line — the explanatory line is kept (who/when), the mockup's chip is added as a compact visual complement, not a replacement of information. `.ts` file: **no changes**. |
| `shell-topbar.component.html` | Bell badge/tooltip: Tailwind spacing/size tweaks only (`NOTIF-DD-5`). |
| **New pipe:** `pipes/group-notifications-by-recency.pipe.ts` | Pure function, no DI: `transform(list, dateKey='requested_date') → { today, thisWeek, earlier }` using local-midnight boundaries. Unit-tested with fixed `Date.now()`. |
| **New pipes:** `filter-notification-by-center.pipe.ts`, `filter-notification-by-bilateral-project.pipe.ts` | Same shape as the existing `filterNotificationByInitiative` pipe — filter a list by a selected center id / project id, no-op when the filter is empty. |

No new API methods — `HTTP_METHOD_descriptiveName` surface is unchanged.

### 6.3 Design system usage

- **Components added via Spartan CLI** (not yet in `installedComponents`): `checkbox` (Program/Center/Bilateral-project facet lists — Program facet itself unchanged behavior, only relocated into the panel), `badge` (decision chip + group-count pill + active-filter-count indicator). `popover`, `tabs` (visual classes only, see `NOTIF-DD-1`), `button`, `input`, `skeleton` are already installed and reused as-is.
- **Tokens:** decision chip reuses `--pr-color-green-500` (Accepted) / `--pr-color-red-300` (Declined) — **no new status tokens**, resolving the proposal's Option A vs B question in favor of A (`docs/ux-ui/design.md` §8 rule 2, hard rule "status fg/bg pairs are fixed"). Result codes use `.pr-figure`/`font-mono` per `src/CLAUDE.md` §19. All new spacing/sizing in explicit `px` arbitrary Tailwind values, never `text-sm`/`text-base` (root font-size trap, `onecgiar-pr-client/CLAUDE.md` §5 "Root font-size").
- **Responsive:** tablet must keep the Filter popover and chips wrapping (`flex-wrap`), matching `docs/ux-ui/design.md` §9.
- **A11y:** Filter button gets `aria-expanded`; checkbox list items are an ARIA `role="checkbox"` control via Spartan `checkbox` (`BrnCheckbox` renders a real `<button role="checkbox">` with full keyboard activation and a `ControlValueAccessor`, never a native `<input>` — corrected 2026-09-25 per `NOTIF-T-1`'s Reviewer, who verified the Brain source; still never a styled `<div>`); chip remove buttons get `aria-label="Remove filter"` (mirrors the mockup).
- **i18n:** no new domain copy beyond structural labels ("Received", "Sent", "Today", "This week", "Earlier", "Accepted", "Declined", "Filter", "Clear all") — kept as plain English per existing convention (this screen has no P22/P25 copy variance today; if a reviewer flags one of these as should-be-`TermKey`, promote it, but it's not assumed here).

### 6.4 Real-time / notification UX

Unchanged — sockets/Pusher remain dormant; no new event consumed or emitted. `user-notification-settings` is not touched.

---

## 7. Security & Authorization

No change. Same guards (`CheckLoginGuard`), same JWT-gated endpoints, same role checks. No new external input — filters are client-side over already-authorized data.

---

## 8. Performance & Capacity

- Grouping/filtering are pure in-memory transforms over lists already sized for a single user's requests (no pagination today) — no measurable perf risk.
- No new HTTP calls, no bundle-size-relevant dependency (Spartan `checkbox`/`badge` are already-used-library additions, not new packages).

---

## 9. Observability

No change — no new logs, no new metric. Existing accept/decline success/error toasts (`alertsFe.show`) unchanged.

---

## 10. Testing Plan (forward-looking)

- **Unit (client):** `group-notifications-by-recency.pipe.spec.ts`, `filter-notification-by-center.pipe.spec.ts`, `filter-notification-by-bilateral-project.pipe.spec.ts` — pure-function tests, boundary cases (midnight edges, empty list, no date).
- **Component (client):** update `received-requests.component.spec.ts` / `sent-requests.component.spec.ts` for the new grouped-section markup (replacing "Pending"/"Done" assertions per `NOTIF-DD-2`'s reversion challenge below); `notification-item.component.spec.ts` gains assertions for the decision-chip branch (status 2/3) without touching existing accept/decline/ToC-mapping test cases.
- **Manual browser check:** `onecgiar-pr-client/CLAUDE.md` §9 — exercise Received/Sent, Filter panel (all three facets), Accept/Decline (including the bilateral ToC-mapping dialogs, to confirm zero regression), at desktop and tablet widths.
- **Coverage:** stays within existing 50/60/60/60 thresholds — new pipes are trivial pure functions, easy to fully cover.

---

## 11. Backwards Compatibility & Migration Plan

Not applicable — no API, no schema, no feature flag. Pure client-side visual/interaction change, safe to ship and roll back via a single PR revert.

---

## 12. Design Decisions (ADRs)

### `NOTIF-DD-1` — Keep router-driven Received/Sent, restyle visually as a segmented control

- **Context:** the mockup shows a single segmented control; the real app routes `received`/`sent` as two separate lazy-loaded Angular modules (`received-requests.module.ts`, `sent-requests.module.ts`) with their own routes.
- **Decision:** keep the existing `routerLink`/`routerLinkActive` `<a>` navigation; apply Spartan Tabs' **visual** classes (`hlm-tabs-list`/`hlm-tabs-trigger`) to them so they *look* like one segmented control, without instantiating the Spartan `Tabs` component (which owns its own active-tab state).
- **Alternatives considered:**
  1. Replace with a real Spartan `Tabs` component and re-wire content via `(activated)` → `router.navigate` — rejected: adds a state-sync layer for no user-visible benefit, larger diff, higher regression risk on deep-linking.
  2. Hand-roll a segmented control with bespoke Tailwind (no Spartan class reuse) — rejected: violates "use existing components first"/"compose don't reinvent" (Spartan skill).
- **Consequences:** visual parity with the mockup at minimal risk; the DOM is technically "Tabs-styled links," not a Tabs component instance — acceptable, documented here so a future audit doesn't "fix" it into a full Tabs migration without re-reading this ADR.

### `NOTIF-DD-2` — Replace "Pending / Done" sections with Today/This week/Earlier groups

- **Context:** mockup groups by recency; today's UI groups by decision state (two fixed sections).
- **Decision:** group by recency (`requested_date`); pending-vs-decided is still visually obvious per row (action buttons vs. decision chip), so no information is lost.
- **Alternatives considered:** keep both groupings (recency headers, decision-state sub-grouping inside) — rejected as over-engineered for this chunk; nesting two groupings was not asked for and adds real estate the mockup doesn't show.
- **Consequences:** existing `*.spec.ts` assertions on "Pending"/"Done" section text must be rewritten (tracked as a task, not a surprise).
- **Reversion challenge (Step 2.3 — this DD removes an already-shipped grouping):** *"What does removing the Pending/Done section split break?"* Answer: nothing functionally — every row still visibly signals its own state (buttons vs. chip); only the *section-level* signal is removed, and it is redundant with the per-row signal. The only real cost is the two component spec files' text assertions, which is a scoped, known test-update task (`NOTIF-T-*` below), not a hidden regression.

### `NOTIF-DD-3` — Program stays single-select; only Center and Bilateral-project become new checkbox facets

- **Context:** mockup shows all three facets (Program/Center/Bilateral project) as multi-select checkboxes; today's Program filter is a single-select `app-pr-select`, gated behind selecting a Phase first, with real semantic meaning (`filterNotificationByInitiative` matches owner/shared/contributing initiative).
- **Decision:** relocate the existing Program single-select into the new Filter popover unchanged; add Center and Bilateral-project as genuinely new, additive multi-select checkbox facets (`NOTIF-R-10`'s fallback made the default, proactively — safer than reshaping an existing, phase-gated filter's semantics under this budget).
- **Alternatives considered:** upgrade Program to multi-select to match the mockup pixel-for-pixel — rejected for this chunk: changes established single-select semantics and its phase-gating interaction, which is a behavior change, not a restyle; would need its own requirements pass.
- **Consequences:** visual layout matches the mockup (one Filter button, three facets, chips); one facet's *interaction model* (single vs. multi) intentionally does not match the mockup pixel-for-pixel. Recorded here so it reads as a decision, not an oversight.

### `NOTIF-DD-4` — Decision chip reuses existing green/red tokens, not the mockup's own status palette

- **Context:** the mockup's own tokens (`--st-approved-bg #D1FAE5` / `--st-rejected-bg #FEF2F2`) don't exist in `colors.scss`; the project has `--pr-color-green-500` / `--pr-color-red-300` and a hard rule ("status fg/bg pairs are fixed... never invent a sixth status color").
- **Decision:** build the chip as a Helm `badge` tinted from the existing green/red tokens (Option A from the proposal).
- **Alternatives considered:** Option B (add new `st-approved-*`/`st-rejected-*` tokens) — rejected, breaks the hard rule and duplicates existing semantics.
- **Consequences:** the chip's exact shade differs from the mockup's screenshot; it is the project's own status color, applied to a new surface — consistent with every other status pill in the app.

### `NOTIF-DD-7` — Filter dropdown rebuilt as a plain, self-positioned panel (replaces `hlm-popover`/CDK overlay for this one control)

- **Context:** the Filter dropdown was originally built on Spartan's `hlm-popover` (a CDK `flexibleConnectedTo` overlay). Across `NOTIF-T-6`, `NOTIF-T-9`, `NOTIF-T-12`, and `NOTIF-T-13`, four separate, genuine bugs were found and fixed in this mechanism: the popover never anchored to its trigger at all (fell back to a global centered position); it had no horizontal fallback and overflowed the viewport's right edge on narrow windows; it had no height cap and overflowed the viewport's top when flipped; and finally the user reported the panel rendering far below the trigger button with no clear single root cause left to chase. Each fix was individually correct and reviewed, but the pattern — a shared library directive (`BrnPopover`) that unconditionally disables CDK's own viewport-push safety net (`.withPush(false)`) and only generates same-alignment position pairs — kept surfacing new edge cases faster than they could be closed, and the user explicitly asked for something reliable and easy to maintain.
- **Decision:** replace `<hlm-popover>`/`<hlm-popover-content>`/`*hlmPopoverPortal` for the Filter dropdown ONLY with a plain, self-contained dropdown: a `position: relative` wrapper around the Filter trigger button, and the panel as a conditionally-rendered (`@if`) sibling with `position: absolute; top: <trigger height + gap>; left: 0` (or `right: 0` on narrow viewports, reusing the existing `filterPopoverAlign` logic, now driving a CSS class instead of a CDK `align` input) — **exactly the technique the user's own reference mockup already uses** (`PRMS Reporting.dc.html`'s `ntFilterOpen` panel: `position:relative` wrapper, panel `position:absolute;left:0;top:44px`). Outside-click and Escape-to-close are added as plain `@HostListener`s (document-level), replacing CDK's built-in dismissal. `aria-expanded`, `aria-haspopup="dialog"`, and a `role="dialog"` + `aria-label` on the panel are kept for a11y parity.
- **Alternatives considered:** keep debugging the CDK-based popover — rejected after four rounds of real, distinct bugs from the same underlying mechanism; the library's own defaults (`withPush(false)`, same-alignment-only fallback positions) are not something this app's code can fully control, and every fix so far has been a workaround around a decision made inside `@spartan-ng/brain`, not a fix to our own code.
- **Consequences:** the Filter dropdown no longer uses a Spartan/Brain primitive (a deliberate, documented exception to "compose, don't reinvent" — recorded here precisely so it isn't "fixed" back onto `hlm-popover` later without re-reading this history). Positioning is now fully deterministic (plain CSS, no overlay-service math, no viewport-push edge cases) at the cost of losing CDK's automatic focus-trap/scroll-strategy machinery — acceptable for a filter panel that isn't a modal.

### `NOTIF-DD-6` — Accept/Decline buttons restyled to match the mockup (amends `NOTIF-R-3`'s "unchanged" scope)

- **Context:** `NOTIF-R-3`/`NOTIF-T-7`'s Disqualifier originally kept the pending-state Accept/Decline `app-pr-button`s untouched (visual AND binding), to protect the trap-heavy `notification-item` component's business logic. The user has since confirmed, showing the actual design-tool mockup (not just the earlier static screenshot), that the buttons are intentionally meant to look different from the app's default `colorType="success"`/`"danger"` fill: **Accept** is a white/surface pill with a border and accent-purple text (not solid green); **Decline** is plain gray text with no border or background (reads as a link/label, not a filled button).
- **Decision:** restyle ONLY the visual presentation of these two `app-pr-button` instances, scoped locally to `notification-item.component.scss` (`::ng-deep`, the same pattern this file already uses for `app-pr-dialog .toc-mapping-dialog`) — never the shared `app-pr-button`/`pr-button.component.*` files themselves, which are used across the whole app. `[showBackground]="false"` on both (removes the filled background, and coincidentally already renders default text in `--pr-color-primary-300`, which matches the mockup's Accept text color for free); a local override adds the border on Accept and recolors Decline's text to a muted token. **`.ts` bindings (`(click)`, `[disabled]`, `[rotating]`, tooltips) are NOT touched** — this is a pure CSS/attribute restyle on top of already-reviewed, unchanged business logic, same category of change as `NOTIF-T-7`'s row-shell/chip work.
- **Alternatives considered:** editing `pr-button.component.scss` to add a new `colorType`-aware "outline" variant — rejected for this chunk: `app-pr-button` is a shared, app-wide primitive: broadening its own contract is a larger, separately-reviewable change, and a scoped `::ng-deep` override achieves the same visual result with a blast radius limited to this one component.
- **Consequences:** Accept/Decline now visually match the mockup; the shared `app-pr-button` component's own default behavior (solid `colorType` fill) is untouched for every other consumer in the app.

### `NOTIF-DD-5` — Bell/badge gets a spacing pass, not a rebuild

- **Context:** `shell-topbar`'s bell already uses `lucideBell` + `pr-topbar-badge` with correct data-binding (`unreadNotifications`, `notificationBadgeLength`).
- **Decision:** Tailwind-only spacing/size reconciliation against the mockup; no new component, no new binding.
- **Alternatives considered:** rebuild as a new bespoke bell component — rejected, no functional or visual gap large enough to justify it.
- **Consequences:** smallest possible diff on a component that already works.

---

## Design Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| **Tasks** | 8 |
| **LOC** | ~380–450 (mostly template/CSS across 6 existing files + 3 new pipes + their specs; no new components beyond Spartan CLI additions) |
| **Review rounds** | 2 (1 `checklist` pass per task batch; 1 `full` pass on `notification-item.component.html` given its trap history) |

This matches **Standard** depth — not over- or under-sized. No split into multiple specs warranted.

---

## 13. Open Gaps & Follow-ups

- Program facet stays single-select this chunk (`NOTIF-DD-3`); upgrading it to multi-select is a legitimate, separately-scoped follow-up if the user wants full mockup parity later.
- **`NOTIF-R-20`** (info popover, MAY) is explicitly deferred — no task in `tasks.md` schedules it. The existing always-visible `request_description` paragraph already carries the same copy, so nothing is lost by deferring the popover presentation.
- `NOTIF-P-4` (no equivalent Center field on W1/W2 rows) is assumed, not verified against a live non-bilateral row with a center attached — flag if QA finds one.
- Updates/Settings tabs remain visually pre-2026-redesign — tracked as a future chunk per the proposal, not this spec's job.

---

## Required cross-references

- `docs/specs/changes/notifications-revamp/requirements.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md` §6/§7/§12, `docs/trd/trd.md` (no entities/endpoints touched — confirmed N/A above).
- `docs/specs/changes/notifications-revamp/mockups/README.md` — visual reference.
- `onecgiar-pr-client/.../notification-item/CLAUDE.md` — trap list this design's row restyle must respect.
