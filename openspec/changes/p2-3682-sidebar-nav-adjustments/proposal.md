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
- **Text size moves into Settings**, a new entry in the topbar user-profile menu. The popover itself
  (5 sizes + "Reset to default", backed by `FontScaleService`) is unchanged; only its trigger moves.
- **Glossary and Tour move to the topbar Support menu.** The ticket names no destination for them;
  Support is already "the single entry point for getting help" (P2-3683), so they keep working
  instead of being deleted. Recorded on the ticket as a decision, not as a requirement.
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
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/` — component, template, spec: Support
  menu gains Glossary and Tour; user menu gains Settings with the text-size popover.
- `FontScaleService`, `ReportingGuideService`, `CLARISA_GLOSSARY_URL` — consumed from a different
  component; no change to the services themselves.
- ⚠️ `ReportingGuideService.startResultSidebarHint()` and the platform tour anchor on
  `data-guide` hooks inside the sidebar. Moving the Tour trigger must keep a valid anchor or the
  guided tour breaks.
- Client only. No server, no migration, no API.
