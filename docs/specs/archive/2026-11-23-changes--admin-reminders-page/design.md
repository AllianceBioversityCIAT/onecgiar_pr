# Design — Admin › Reminders page (move + redesign)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-reminders-page` |
| Requirements | `requirements.md` (ARP-R-1…11, ARP-NFR-1…4), approved 2026-11-17 |
| Status | approved 2026-11-17 |
| Verified at | `2ffb3e887` |
| Visual source | Design System artifact `GRLArZ732gXdw2gDRJC4Tu` → `preview.html` sections "Replicated innovation reminders" and "Center focal points" |
| Page mode / ENV | Admin product page (dense data, task-focused) · ENV: existing app shell, Spartan + Tailwind v4, light mode only (dark mode not used, user decision 2026-11-14) |

## 1. Executive Summary

Client-only change. A new standalone page `RemindersPageComponent` at `/admin-module/reminders` hosts two tabs. The two existing standalone components move under it unchanged in logic: `ReplicatedInnovationRemindersComponent` (tab 1) and `CenterFocalPointsComponent` (tab 2, no longer nested inside tab 1). Both templates are rebuilt to the design with Tailwind + Spartan. The page owns the active tab; the children report two small facts up through outputs (missing focal points count, "fix focal points" click). No server, endpoint, DTO or data change.

## 1A. Premise Ledger

Count: 11 verified · 2 `UNVERIFIED` (1 High, 1 Low).
Blast-radius triggers: `live-path` (new user action: sidebar → route), `consumer` (moved files/selectors and testids), `shared-state` (the page now reads a fact the focal-points component owns). All three have rows.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Reminders render only in Phase management › Reporting | location | `reporting.component.html:24` `<app-replicated-innovation-reminders />`; `reporting.module.ts:7` import | 2ffb3e887 | ARP-R-3 scope changes (High) | — |
| P-2 | Focal points render inside the reminders component | location | `replicated-innovation-reminders.component.html:239` `<app-center-focal-points />`; imported at `.component.ts:44` | 2ffb3e887 | DD-2 (un-nesting) unnecessary (Low) | — |
| P-3 | The campaigns response carries `pending_total` and `unreachable_total` | data-env | server `dto/campaign-view.ts:34-35`, filled at `replicated-innovation-reminders.service.ts:74-75` | 2ffb3e887 | ARP-R-4 needs a TODO + server change (High) | — |
| P-4 | Each campaign carries `scheduled_at`, `sent_at`, `sent/skipped/failed/unreachable_count` | data-env | client mirror `replicated-innovation-reminders.interface.ts:7-20` of server `dto/campaign-view.ts` | 2ffb3e887 | ARP-R-6 delivery bar / "sent before schedule" need TODO (High) | — |
| P-5 | Action availability is `canEditOrCancel` = PENDING, `canPreviewOrSend` = PENDING∨FAILED, `canSendAgain` = SENT ∧ kind free; all false while `busy` | other | `replicated-innovation-reminders.component.ts:162-172` | 2ffb3e887 | ARP-R-5 table wrong (High) | — |
| P-6 | Only one open campaign per kind; open = PENDING/SENDING/FAILED; `missingKinds` drives the create forms | other | `.component.ts:29,80`; html `:184-187` | 2ffb3e887 | ARP-R-7 select contents wrong (Low) | — |
| P-7 | The opt-in toggle is optimistic and rolls back on error, then shows the server value and warning | other | `center-focal-points.component.ts:83-104` | 2ffb3e887 | ARP-R-9 needs logic change (High) | — |
| P-8 | Children of `admin-module` inherit `CheckAdminGuard` from the parent route | location | `routing-data.ts:160-168` (`canActivate: [CheckAdminGuard]` on `admin-module`, `loadChildren` admin-section) → `admin-section-routing.module.ts` children `adminModuleRouting` | 2ffb3e887 | ARP-R-1 needs its own guard (High) | — |
| P-9 | **live-path**: sidebar link → `/admin-module/reminders` → `AdminSectionComponent` children (`adminModuleRouting`, `routing-data.ts:191`) → new `loadComponent`. Branch point: the `**` redirect at `routing-data.ts:227` must stay last | live-path | `reporting-nav-sidebar.component.ts:182-188` (`adminModuleLinks`); `routing-data.ts:191-228` | 2ffb3e887 | Route unreachable / redirects to tickets (High) | — |
| P-10 | **consumer**: the moved components are referenced only by `reporting.component.html:24` and `reporting.module.ts:7`; no Cypress or other spec references them or the `rir-*` / `cfp-*` test ids outside their own folder | consumer | `grep -rnE "components/replicated-innovation-reminders\|replicated-innovation-reminders\.component\|center-focal-points\.component\|reminder-preview-drawer\|reminder-time\.util\|app-replicated-innovation-reminders\|app-center-focal-points" --include=*.ts --include=*.html --include=*.js --include=*.json onecgiar-pr-client/src onecgiar-pr-client/cypress onecgiar-pr-client/tests` minus the component folder → 2 hits (listed); `grep -rln "rir-\|cfp-\|reminder" src/app/pages/admin-section/pages/phase-management/pages src/app/pages/admin-section/*.ts cypress` → only the same 2 files | 2ffb3e887 | Extra files to update in T-1 (Low) | — |
| P-11 | Spartan brain ships a `switch` primitive but the repo has no helm switch and the Jest brain mock has no Switch | existence | `ls node_modules/@spartan-ng/brain` lists `switch`; `ls src/app/spartan` has no `switch`; `grep -c "Switch" tests/mocks/spartanBrainMock.ts` → 0 | 2ffb3e887 | DD-4 could reuse a helm switch (Low) | — |
| P-12 | **shared-state**: the hidden `hlmTabsContent` panel stays mounted (so the focal-points component loads once on page open and can report its count before its tab is opened) | shared-state | UNVERIFIED — confirm at source before relying on it | — | DD-3 changes: panels toggled by `[hidden]` instead of `hlmTabsContent` (Impact High for ARP-R-2 count + ARP-NFR-3) | T-1 first step: read `BrnTabsContent` in `node_modules/@spartan-ng/brain/fesm2022` + the Jest mock for tabs |
| P-13 | The sidebar marks "Reminders" active from the URL like its siblings | location | UNVERIFIED — confirm at source before relying on it (`reporting-nav-sidebar.component.ts:249` only shows the module expand rule) | — | T-1 adds the active rule (Low) | T-1 |

## 2. Architecture Overview

### 2.1 Where this lives

```
AdminSectionComponent (/admin-module, CheckAdminGuard)
├── phase-management/…            (loses the reminders block)
└── reminders/  ← NEW, loadComponent
    RemindersPageComponent
    ├── header (breadcrumb · title · description)
    ├── tabs: [Replicated innovation reminders] [Center focal points (N)]
    ├── tab 1 → ReplicatedInnovationRemindersComponent  (output: fixFocalPoints)
    └── tab 2 → CenterFocalPointsComponent              (output: missingCount)
```

### 2.2 Interaction

1. Page opens → both children mount → each loads its own endpoint once (same calls as today).
2. Focal points loaded → emits `missingCount` (Centers with zero active contacts) → page shows the tab count. On reload/edit it emits again. Emits nothing while loading or on error (count hidden, ARP-R-2).
3. "Fix center focal points" in tab 1 → emits `fixFocalPoints` → page selects tab 2.

## 3. Data Model Changes

None.

## 4. API Surface

None. Same six reminders calls and the focal-points calls in `results-api.service.ts:1903-1931+`.

## 5. Server Workflow

None.

## 6. Frontend Plan

### 6.1 Routes / modules

| Change | File |
|---|---|
| New route `{ prName: 'Reminders', path: 'reminders', loadComponent: RemindersPageComponent }`, placed after `phase-management`, before the `**` redirect | `shared/routing/routing-data.ts` |
| New sidebar link after Phase management, icon `lucideBellRing` (registered in the sidebar's icon provider if not already) | `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.ts` |
| Remove `<app-replicated-innovation-reminders />` and its import | `phase-management/pages/reporting/reporting.component.html`, `reporting.module.ts` |

### 6.2 Directory

```
pages/admin-section/pages/reminders/
├── reminders-page.component.{ts,html,spec.ts}                 NEW
└── components/
    ├── replicated-innovation-reminders/                       MOVED (git mv) from phase-management/components/…
    │   ├── replicated-innovation-reminders.component.{ts,html,spec.ts}
    │   ├── reminder-preview-drawer.component.{ts,html}
    │   ├── reminder-time.util.{ts,spec.ts}
    │   ├── reminder-api.spec.ts
    │   └── delivery-bar/delivery-bar.component.{ts,spec.ts}   NEW (presentational)
    └── center-focal-points/                                   MOVED, one level up (no longer nested)
        └── center-focal-points.component.{ts,html,spec.ts}
```

### 6.3 Components

| Component | Responsibility | Inputs / outputs |
|---|---|---|
| `RemindersPageComponent` (standalone) | Header, tabs, active tab signal, tab count | — |
| `ReplicatedInnovationRemindersComponent` | Summary cards, history, scheduler, preview drawer, confirm dialog. Logic unchanged | `output fixFocalPoints` |
| `DeliveryBarComponent` (new, presentational) | Stacked bar + text from the four counts; zero segments omitted | `input sent, unreachable, skipped, failed` |
| `CenterFocalPointsComponent` | Toolbar (search + chips), list, switch, contacts dialog. Logic unchanged + client-side filter | `output missingCount` |

New view-only state (computed, no API): `nextCampaign` (earliest open campaign by `scheduled_at`), `sentBeforeSchedule(c)`, `scheduleKind` signal (selected kind in the single form), `filter` + `query` signals and `visibleCenters`, `counts` (all / missing / opted-in).

### 6.4 Design system usage

Tokens are the real `--pr-color-*` variables (`styles/colors.scss`). The artifact's PROPOSED semantic tokens are **not** added (proposal R1); they map as:

| Design role | Real token pair |
|---|---|
| success badge / sent segment | bg `green-50`, text `green-700`; bar fill `green-500` |
| warning badge / unreachable | bg `yellow-50`, text `yellow-800`; bar fill `yellow-300` |
| danger / failed | bg `red-50`, text `red-300`; bar fill `red-300` |
| info / pending / scheduled | bg `blue-50`, text `blue-700`; bar fill `blue-500` |
| accent tint (active chip, next-send card) | `primary-50`, border `primary-100`, text `primary-400` |
| primary text / secondary text | `secondary-400` / `accents-5` |
| card | white, 1px `accents-2` border, `rounded-xl`, `shadow-xs` equivalent Tailwind `shadow-sm` |

Layout from the preview, as Tailwind:

| Block | Layout |
|---|---|
| Page | `flex flex-col gap-6`; header: breadcrumb (`hlmBreadcrumb`), `h1` 20/700, description 12px `accents-5` |
| Tabs | `hlmTabs` list with underline `primary-400` on active; count pill `yellow-50`/`yellow-800` |
| Summary | `grid gap-4 md:grid-cols-3` (third column slightly wider at lg); big number 24/700 tabular |
| History | Card with header line (title + zone line), `hlmTable` light header (`accents-1`); status `hlmBadge`; row actions: one ghost button + `more_vert` popover menu when > 2 |
| Scheduler | Card footer strip (`accents-1` bg): `native-select` kind · datetime input · hint · submit |
| Focal points | Card: toolbar (`hlmInput` search with `search` icon + chip buttons), `hlmTable`, contacts as pill chips with initials, warning badge + link button when empty |

Icons: `material-icons-round` at 16–18px, decorative ones `aria-hidden="true"`.

## 7. Security & Authorization

Admin-only through the inherited `CheckAdminGuard` (P-8). Server endpoints keep their own `@Roles(ADMIN, APPLICATION)` (RCF-T-3). No new surface.

## 8. Performance

Same requests as today (2 GETs on open, ARP-NFR-3). Client filtering over ≤ ~20 Centers is trivial.

## 9. Observability

None new.

## 10. Testing Plan

| Layer | What |
|---|---|
| Moved specs | Keep green after `git mv`, with updated import paths; testids kept (ARP-NFR-4) |
| Page spec (new) | tabs default, switch on `fixFocalPoints`, count shown only when `missingCount` > 0 |
| Reminders spec (extended) | action set per status (5 statuses, incl. SENT with kind open vs free), cards from P/U, no-open-campaign card, sent-before-schedule true/false/equal, single scheduler kinds + send-again preselect |
| DeliveryBar spec (new) | zero counts omitted from text and bar, "Not sent yet" when all zero and not sent |
| Focal points spec (extended) | chips counts, filter, search across code/acronym/name/contact, empty result, `missingCount` emitted after load and after edits, not on error; switch rollback |
| Route/sidebar | `adminModuleRouting` contains `reminders` before `**`; `adminModuleLinks` order |
| Build | `npx ng build` |
| Layout / visual | PRTest HITL at 1280 and 1568 px (jsdom cannot measure) |

## 11. Backwards Compatibility

Old Phase management bookmarks still open Phase management; the reminders simply are not there (OQ-2 default: no "moved" link). Rollback = revert the commits; no data involved.

## 12. Design Decisions

### ARP-DD-1 — Standalone page with `loadComponent`
Matches the newer admin siblings (Tickets dashboard, User management use `loadComponent`, `routing-data.ts:208-217`). No NgModule. Rejected: a module like Phase management (more boilerplate, no gain).

### ARP-DD-2 — Un-nest focal points; page owns tabs
Focal points becomes a sibling tab, so `<app-center-focal-points />` leaves the reminders template (P-2). Cross-tab facts go through two outputs instead of a shared service: smallest coupling, no new injectable. Rejected: a page-level store service (more code for two numbers).
**Reversion challenge (Step 2.3)** — removing the nesting: what breaks? The reminders spec may assert the focal-points child renders inside it. Check: `grep -n "center-focal\|cfp-" replicated-innovation-reminders.component.spec.ts` in T-1; any hit moves to the page spec. No user-visible breakage: both still render on the new page.

### ARP-DD-3 — Keep both tab panels mounted
Needed so the focal-points count shows before tab 2 is opened and so switching tabs does not reload (ARP-NFR-3). Use `hlmTabsContent` if it keeps the hidden panel mounted (P-12); otherwise keep `hlmTabsList`/triggers and toggle panels with `[hidden]`. Settled in T-1 before building.

### ARP-DD-4 — Switch as a native `button role="switch"` styled with Tailwind
No helm switch exists and the Jest brain mock has none (P-11). Generating one adds a helm lib, tsconfig/Jest mappings and a mock for a single use. A native button with `role="switch"`, `aria-checked`, visible On/Off text and Tailwind styling is accessible and testable. Rejected: generating `@spartan-ng/cli` switch now (revisit if a second switch appears).
**Reversion challenge** — replacing `hlmCheckbox`: what breaks? Specs that query the checkbox (`cfp-*` testid on the checkbox) — the testid stays on the new button, and the spec's `checkedChange` trigger becomes a click. Behaviour (optimistic + rollback, P-7) is unchanged.

### ARP-DD-5 — Single scheduler form with kind select
Replaces one form per missing kind (P-6). The select lists `missingKinds()`; `scheduleKind` starts at the first one and is set by "Send again". The submit calls the existing `schedule(kind)`. Testids: form `rir-schedule`, select `arp-schedule-kind`, input/submit keep their per-kind ids `rir-draft-<kind>` / `rir-submit-<kind>` bound to the selected kind, so existing spec selectors still resolve.
**Reversion challenge** — removing the second visible form: what breaks? An admin could today fill both kinds at once; after, one at a time. Accepted: they are created one by one anyway. Specs that fill both forms in one test get split.

### ARP-DD-6 — Row actions: only allowed ones, overflow menu past two
Render from P-5 predicates with `busy` ignored for visibility and applied as `disabled` (ARP-R-5). PENDING has 4 actions → "Send now" visible + `more_vert` popover (Preview, Change date, Cancel). Popover via existing `hlmPopover` (in repo).
**Reversion challenge** — removing disabled buttons: what breaks? Specs asserting `disabled` on non-allowed actions; they change to "not rendered". The confirm dialog and inline date edit stay.

### ARP-DD-7 — Tokens mapped, none added
See §6.4. No `#hex`, no new SCSS. The mapping was in the approved proposal (R1); the user confirms it at this design gate.

## 13. Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
|---|---|
| Tasks | 5 (4 code + 1 HITL) |
| LOC | ≈ 850 (≈ 450 templates/ts, ≈ 400 specs) |
| Review rounds | 7 |

**Revised 2026-11-17 (budget tripwire after ARP-T-2, approved by the user):** LOC ≈ 1,450 · review rounds 10 · tasks unchanged (5). Cause: the T-2 template rewrite, larger specs than estimated, and one `arp-*` test-id rework on T-1 and on T-2.

## 14. Open Gaps

- Phase management redesign (hero, phases table, OperationCards) → possible sibling spec.
- If a second switch is needed elsewhere, generate the helm switch and migrate.
