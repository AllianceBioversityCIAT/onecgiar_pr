# Proposal — Admin › Reminders page (move + redesign)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-reminders-page` |
| Slug | `admin-reminders-page` — derived from free-text argument |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Date | 2026-11-17 |
| Requirement source | User brief in chat (2026-11-17) + SR-167303 thread (Center focal point routing) |
| Visual source | Design System artifact `https://claude.ai/artifact/GRLArZ732gXdw2gDRJC4Tu` (`project/admin-module-redesign.md`, `project/tokens.json`, `project/components/AdminPhaseManagement/preview.html`) — source questions skipped, supplied by the brief |
| Depends on | `changes/rir-center-focal-routing` (code on qa-dev + perf, `2ffb3e887`; not archived) |
| Parallel-safe | no — same component files as `rir-center-focal-routing` |

## 1. Intent

Give reminders their own place in the Admin module. Add a **Reminders** entry to the Admin sidebar, move the replicated-innovation reminders and the Center focal points out of Phase management into it, and apply the design-system look while moving them.

## 2. Problem / Current Behavior

| # | Today | Source |
|---|---|---|
| P1 | Reminders and Center focal points render at the bottom of Admin › Phase management › Reporting, under the phases table and phase operations | `reporting.component.html:23` (`<app-replicated-innovation-reminders />`), `replicated-innovation-reminders.component.html:239` (`<app-center-focal-points />`) |
| P2 | The Admin sidebar has 5 items and no Reminders entry | `reporting-nav-sidebar.component.ts:182-188` (`adminModuleLinks`); routes in `routing-data.ts:191-228` (`adminModuleRouting`) |
| P3 | The reminders table shows every action on every row, most of them disabled, and four delivery counters per row | `admin-module-redesign.md` problem 6 (design source); UNVERIFIED — confirm at source before relying on it |
| P4 | The key problem ("N without a reachable recipient", Centers without a focal point) is a grey sentence, and those Centers are mixed into a 17-row table | `admin-module-redesign.md` problems 7; UNVERIFIED — confirm at source before relying on it |
| P5 | "Receives all reminders" is a checkbox that saves instantly; the scheduler does not show the UTC send time | `admin-module-redesign.md` problem 8; UNVERIFIED — confirm at source before relying on it |

Both components are already standalone and depend only on `ResultsApiService`, not on the Phase management page (`replicated-innovation-reminders.component.ts:44,49`), so moving them needs no logic change.

## 3. Proposed Outcome

- New sidebar item **Admin module › Reminders**, at `/admin-module/reminders`, admin-only, same guard as its siblings.
- The page has a header (breadcrumb, title, one-line description) and two **tabs**: **Replicated innovation reminders** and **Center focal points**. The focal-points tab shows a warning count when Centers have no focal point.
- **Reminders tab** (preview §"Replicated innovation reminders"):
  - Three summary cards: pending replicated innovations · without a reachable recipient (with a "Fix center focal points" link that switches tab) · next scheduled send with its actions (Preview, Change date, Send now, Cancel).
  - History table that shows only the actions valid for each row ("Send again" on sent rows), with a delivery bar and "16 sent · 4 unreachable" text; zero counts omitted; "Sent manually, before schedule" note when it applies.
  - Scheduler with a reminder-type select and a live "Sends at HH:MM UTC" hint.
- **Center focal points tab**: search, filter chips (All · No focal point · Receives all reminders), contacts as chips, warning badge + inline "Add contact" on rows without contacts, "Receives all reminders" as an On/Off toggle.
- Phase management keeps the phases table and phase operations only. No reminders there any more.

## 4. Scope

- Client only: `onecgiar-pr-client`.
- New page component + route + sidebar link.
- Move (not copy) the two components into the new page's folder; update imports and specs.
- Re-skin both components to the design, using Tailwind utilities, existing `--pr-color-*` tokens, Spartan (`hlm*`) components and `material-icons-round` inside the page (the sidebar keeps its Lucide icons like its siblings).
- All new copy goes into the `internationalization/` copy files.
- Work by section, plan shown before each edit: (1) route + sidebar + page shell + tabs → (2) reminders tab → (3) focal points tab.

## 5. Non-Goals

- No server, endpoint, DTO or migration changes. Where the design needs data the API does not give, leave a `TODO(admin-reminders-page)` and report it.
- Redesign of the Phase management page itself (open-phase hero, phases table, OperationCards with "Review and run"). It becomes a sibling spec if wanted (`changes/admin-phase-management-redesign`).
- New SCSS classes, copying `bundle.css`, or the app-shell changes in the preview (rail, environment strip, top bar).
- New design tokens without the user's approval (see §11 R1).

## 6. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| PMU / platform admins (Nicoleta, PRMS team) | New place to schedule reminders and manage Center focal points. Must be told before the first December send |
| `pages/admin-section/pages/phase-management/components/replicated-innovation-reminders/**` | Moved to `pages/admin-section/pages/reminders/**` and re-skinned |
| `pages/admin-section/pages/phase-management/pages/reporting/reporting.component.html` | Loses the `<app-replicated-innovation-reminders />` line |
| `shared/routing/routing-data.ts`, `reporting-nav-sidebar.component.ts` | New route + sidebar link |
| `internationalization/` | New copy keys |
| Specs | `changes/rir-center-focal-routing` (same files; archive it first or note the move in its archive), `notifications/replicated-innovation-reminders` (archived; its paths go stale) |
| Tests | `replicated-innovation-reminders.component.spec.ts` (500 lines), `center-focal-points.component.spec.ts`, `reminder-api.spec.ts`, `reminder-time.util.spec.ts` move with the code; `data-testid`s kept |

## 7. Visual Reference

- Source: Design System artifact (Impeccable-style mock, code-led) — PRMS design system v1.
- Location: `https://claude.ai/artifact/GRLArZ732gXdw2gDRJC4Tu` → `project/components/AdminPhaseManagement/preview.html` (sections "Replicated innovation reminders" and "Center focal points"), `project/admin-module-redesign.md` rows 6–8, `project/tokens.json`.
- Notes: the preview places these as tabs inside Phase management; this proposal moves the same two tabs to their own page. The preview is a visual reference only; it is translated to Tailwind + Spartan, not copied.

## 8. Requirement Delta Preview

### ADDED
- Admin sidebar item and route `Reminders` (`/admin-module/reminders`), admin-only.
- Tabs on the Reminders page, with a warning count on the focal-points tab.
- Summary cards (pending, unreachable, next send) on the reminders tab.
- Focal-points search, filter chips, inline "Add contact" on empty rows, On/Off toggle.
- Live UTC hint in the scheduler.

### MODIFIED
- Reminder history: only valid actions per row; delivery shown as a bar + text, zeros omitted.
- Phase management › Reporting no longer shows reminders or focal points.

### REMOVED
- Nothing functional. The reminders block on Phase management is removed from that page (it moves).

## 9. Approach Options

| Option | What | Pro | Con |
|---|---|---|---|
| **A. Move + re-skin in one spec, by sections** | New page, move components, redesign both tabs | One release, one PMU notice, matches the user's ask | Biggest diff; specs must move and be updated together |
| B. Move first, redesign later | Spec 1 moves the components unchanged; spec 2 re-skins | Small first step, easy review | Two releases and two notices to the PMU before December; touches the same files twice |
| C. Redesign in place, move later | Re-skin inside Phase management, then move | — | The user asked for the move; this does the work in the wrong place |

## 10. Recommended Approach

**Option A**, done in three sections with a plan shown before each one:

1. Route + sidebar + page shell + tabs, components moved unchanged (tests still green → safe stop point).
2. Reminders tab re-skin.
3. Center focal points tab re-skin.

Section 1 alone already ships the move, so if the redesign stalls before December the page still works.

## 11. Risks, Dependencies, And Open Questions

| ID | Item | Proposed handling |
|---|---|---|
| R1 | **Tokens marked PROPOSED do not exist.** `success-fg/bg`, `warning-fg/bg`, `danger-bg`, `info-fg/bg`, `surface-page`, `border-strong`, `chrome-900/800` are not in `colors.scss`. Also, the artifact's hexes differ from the real ones (`primary-300` is `#6b46e5` in `colors.scss:20`, not `#6b6dc4`; `secondary-400` is `#2b2838`, not `#2a2e45`) | Do **not** add tokens. Use the real variables and map: success → `green-50` / `green-700`; warning → `yellow-50` / `yellow-800`; danger → `red-50` / `red-300`; info → `blue-50` / `blue-700`; tints → `primary-50` / `primary-100` (both exist, `colors.scss:17-18`). **User approves this mapping at specify** |
| R2 | **Data the API may not give** (UNVERIFIED — confirm at source before relying on it): total pending replicated innovations and unreachable count outside a preview; whether a sent row has both scheduled and sent time for the "sent before schedule" note | Check the existing responses in `/akili-specify`. Missing data → `TODO(admin-reminders-page)` + placeholder, reported to the user |
| R3 | Spartan has no Switch/Toggle (`src/app/spartan/` has checkbox, tabs, badge, table, input…) | Add `switch` via the Spartan CLI, or a styled checkbox with On/Off text. Decide at specify |
| R4 | The toggle saves instantly today. The design keeps it as a toggle; it does not add a Save button | Keep instant save (no logic change) with a live-region confirmation |
| R5 | `rir-center-focal-routing` is not archived and shares these files | Archive it before execute, or execute this after it reaches PROD |
| R6 | Timing: the first December send is planned by Nicoleta | Ship section 1 (move) early; tell the PMU where the page went |
| R7 | Old bookmarks to Phase management expect reminders there | Optional one-line link on Phase management "Reminders moved to Admin › Reminders". Decide at specify |
| OQ-1 | Sidebar icon and position (after Phase management?) | Proposed: `lucideBellRing`, right after Phase management |
| OQ-2 | Does the user also want the Phase management redesign (hero, phases table, OperationCards)? | Separate sibling spec if yes |

## 12. Success Criteria

- Admin sidebar shows **Reminders**; `/admin-module/reminders` opens for admins only.
- Phase management › Reporting shows no reminders and no focal points.
- Every existing reminders and focal-points action still works (schedule, edit, cancel, preview, send, send again, focal-point add/replace/deactivate, opt-in toggle) with no endpoint change.
- Moved Jest specs green (`--maxWorkers=2`, scoped); `data-testid`s unchanged.
- No new SCSS classes; no hex or token outside `colors.scss`; all copy in `internationalization/`.
- Every `TODO(admin-reminders-page)` listed in the execution report.
- PRTest visual check at 1280 px passes for both tabs.

## 13. Next Step

```text
/akili-specify changes/admin-reminders-page
```
