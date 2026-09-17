## Why

P2-3682 (Juan Pablo Bueno, 11 Sep 2026) reports that the reporting sidebar's **Extras** block drifted
from the approved design. The design attached to the ticket, and the mockup it links to
(`.design-snapshots/PRMS-Reporting.dc.html:246-250`), show **Extras holding one entry: Release
notes**. The live sidebar holds five — Glossary, Release notes, Tour, Notifications and Text size —
two of which duplicate controls that already exist in the topbar or belong in a user setting.
Notifications in particular is reachable twice: the sidebar button and the topbar bell
(`shell-topbar.component.html:55`) both land on the same place.

## What Changes

- **Extras keeps only Release notes.** Glossary, Tour, Notifications and Text size leave the block.
- **Notifications leaves the sidebar with no replacement.** The topbar bell already opens the
  notifications popover and its "See all the notifications" link routes to the same page the sidebar
  button called, so nothing is lost and the duplicate entry point disappears.
- **Text size keeps a topbar button of its own.** The requirement sends it to Settings in the account
  menu; that was built on 17-Sep and then undone the same day at Yeck's call — it is an accessibility
  control, and two clicks deep behind a name that gives no hint of it is where nobody finds it. The
  popover (5 sizes + "Reset to default", backed by `FontScaleService`) is unchanged. **The Settings
  entry is therefore not created**: text size was the only thing the ticket put in it. Written up on
  the ticket as a deviation from the requirement.
- **Glossary and Tour move into the help menu**, which is **renamed from "Support" to "Help"**: with
  a glossary and a guided tour in it, the menu stopped being only about reaching a person. Its
  entries are grouped under two labels — *Get help* (chat, feedback) and *Learn* (glossary, tour) —
  because four flat rows of two different natures read as a junk drawer.
- No change to what any control *does*: same routes, same service calls, same permissions.

## Capabilities

### New Capabilities
- `shell-navigation-placement`: where each shell-level control lives — the sidebar's Extras block,
  the topbar bell, the Support menu and the user-profile menu — and the rule that no control is
  reachable from two shell surfaces at once.

### Modified Capabilities
(none — no existing spec in `openspec/specs/` covers shell navigation placement)

## Impact

- `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/` — component, template, spec:
  Extras block trimmed; `goToNotifications()`, `startPlatformSidebarTour()`, `clarisaGlossaryUrl`,
  the text-size trigger and its CDK overlay leave this component.
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/` — component, template, spec: the
  Support menu becomes Help, grouped, and gains Glossary and Tour; a text-size button joins the
  topbar icons next to the bell.
- `FontScaleService`, `ReportingGuideService`, `CLARISA_GLOSSARY_URL` — consumed from a different
  component; no change to the services themselves.
- ⚠️ `ReportingGuideService.startResultSidebarHint()` and the platform tour anchor on
  `data-guide` hooks inside the sidebar. Moving the Tour trigger must keep a valid anchor or the
  guided tour breaks.
- Client only. No server, no migration, no API.
