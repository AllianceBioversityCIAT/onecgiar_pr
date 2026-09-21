## Context

The app shell has four surfaces that can hold a control: the sidebar's **Extras** block
(`reporting-nav-sidebar.component.html:398-462`), the topbar **Support** menu, the topbar
**notifications bell**, and the topbar **user menu** (`shell-topbar.component.html:91-240`).

Extras holds five entries today — Glossary, Release notes, Tour, Notifications, Text size. The design
attached to P2-3682 and the mockup it links to (`.design-snapshots/PRMS-Reporting.dc.html:246-250`)
hold one: Release notes. The same mockup (`:383-386`) shows the user menu as `Profile · Settings ·
Sign out`, so Settings is where a per-user preference such as text size belongs.

Two controls already have a home elsewhere: the bell at `shell-topbar.component.html:55` opens the
notifications popover and its footer link calls the same route the sidebar button navigated to
(`result/results-outlet/results-notifications/requests`). Support is, since P2-3683, "the single
entry point for getting help".

## Goals / Non-Goals

**Goals:**
- Extras shows exactly one entry: Release notes.
- No shell control is reachable from two surfaces at once.
- Text size is reached through Settings in the user-profile menu, with its behaviour unchanged.
- Glossary and Tour keep working from somewhere in the shell.

**Non-Goals:**
- Changing what any control does — same routes, same `FontScaleService`, same tour steps.
- A Profile entry or a settings *page*. The mockup shows `Profile`, but P2-3682 does not ask for it
  and no profile screen exists; out of scope, noted on the ticket.
- Touching the notifications settings screen that already lives under
  `results-notifications/pages/settings/`.

## Decisions

**1. Text size lives in the profile panel; Settings is not created.**
It went three ways in one day, and the last one is the one that holds: first into Settings in the
account menu (as the requirement says), then out onto its own topbar button, and finally **inside the
account panel itself** — Yeck, 17-Sep: *"mejor dejarlo dentro de profile cuando se despliega"*. One
click, on screen the moment the panel opens, and without adding a fourth icon to a topbar that
already carries Help, the bell and the avatar. Settings is still not created: text size was the only
thing the ticket put in it.

**1-superseded. Text size on its own topbar button.**
The requirement puts text size inside Settings, reached from the account menu. Built that way first,
then undone on 17-Sep (Yeck): *"eso no lo va a ver nadie en el tal Settings"*. Text size is how a
person who cannot read the platform makes it readable — it cannot cost two clicks and prior knowledge
of a menu name. It gets its own topbar button, one click, always on screen. With text size on the
topbar, Settings would have held nothing, so it is not created. The deviation is written on the
ticket rather than silently absorbed.

**1b. The help menu is renamed and grouped.**
A menu holding a support chat, a feedback form, a glossary and a guided tour is not "Support" any
more — two of those are things you do on your own. It is labelled **Help**, and its entries sit under
two group labels, *Get help* and *Learn*. Four flat rows of two natures read as a junk drawer, which
is exactly how the first attempt landed.

**1c. (Superseded) Settings as a sibling overlay.**
The topbar already drives Support, notifications and the user menu as three sibling
`cdkConnectedOverlay` popovers closed by one shared `document:keydown.escape` listener. Settings
becomes a fourth, anchored to the same `userTrigger` origin; choosing Settings closes the user menu
and opens it. *Alternative rejected:* rendering the text-size grid inside the user menu, which would
make an already tall panel (user card + programmes + centres + log out) taller than a laptop viewport
— the exact defect P2-3739 just fixed for the filter panel.

**2. The text-size popover markup moves verbatim.**
The 5-option radiogroup, the "Reset to default" button and `FontScaleService` wiring move from the
sidebar to the topbar unchanged, so the control a reporter already knows behaves identically. Only
the trigger and the overlay position change (the sidebar's opened upward from a footer; this one
opens downward from the topbar).

**3. Glossary and Tour move to Support instead of being deleted.**
P2-3682 names a destination for Notifications (topbar) and Text size (Settings) but none for these
two. Deleting them would remove two working entry points nobody asked to remove; Support is already
the help surface. Recorded on the ticket as our decision, not as part of the requirement.

**4. The Tour keeps working from the topbar because its steps never anchored on its own trigger.**
`buildSidebarTourSteps` (`platform/platform-tour.steps.ts:62-87`) targets
`[data-guide="platform-tour-sidebar-header" | "…-programs" | "…-platform" | "…-results-center" |
"…-centers" | "sidebar-toggle"]` — all inside the sidebar body, none of them the trigger. The
`data-guide="platform-tour-sidebar-trigger"` attribute is not read by any step. `startSidebarTour`
also re-opens a collapsed sidebar itself (`reporting-guide.service.ts:439-445`), so firing it from the
topbar is safe.

**5. The tour context is rebuilt in the topbar from the same two services.**
`startSidebarTour` needs `hasMyPrograms`, `hasOtherPrograms`, `hasCenters`. The sidebar derives them
from `ResultFrameworkReportingHomeService` (`mySPsList()` / `otherSPsList()`) and
`api.rolesSE.getMyCenters()`; both are injectable and the topbar already calls the latter. Four lines
are duplicated rather than moved. *Alternative rejected:* teaching `ReportingGuideService` to compute
its own context — it lives in another module's service tree, and widening its API for one caller is a
larger blast radius than four lines.

## Risks / Trade-offs

- **The sidebar tour is now started from a surface the tour never highlights** → the first step still
  points at the sidebar header, which is on screen; `startSidebarTour` opens the sidebar when
  collapsed, so the sequence is unchanged.
- **Reporters used to the Extras entries will not find them** → Notifications and Text size land on
  surfaces that are visible at all times (bell, avatar); Glossary and Tour land under a labelled
  Support button. Nothing becomes unreachable.
- **Four duplicated lines of tour context** → the alternative touches another module's service; noted
  here so the next reader knows it was deliberate.
- **`data-guide="platform-tour-sidebar-trigger"` disappears from the sidebar** → no tour step reads
  it; the sidebar spec asserts on its presence and is updated in the same change.

## Open Questions

- The mockup's user menu also shows a **Profile** entry. No profile screen exists and P2-3682 does not
  ask for one, so it is left out and flagged on the ticket.
