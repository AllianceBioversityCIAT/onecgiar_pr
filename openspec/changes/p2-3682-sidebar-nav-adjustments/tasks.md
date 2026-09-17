## 1. Sidebar — trim the Extras block

- [x] 1.1 Remove the Glossary, Tour, Notifications and Text size `<li>` entries from the Extras block
      in `reporting-nav-sidebar.component.html`, leaving Release notes.
- [x] 1.2 Remove the text-size `cdkConnectedOverlay` template and the `#fontTrigger` origin from the
      same file.
- [x] 1.3 Remove from `reporting-nav-sidebar.component.ts`: `goToNotifications()`,
      `notificationBadgeCount()`, `selectFontScale()`, `startPlatformSidebarTour()`, `fontMenuOpen`,
      `fontMenuPositions`, `fontScaleOptions`, `clarisaGlossaryUrl`, and the now-unused injections
      (`FontScaleService`, `ReportingGuideService` if nothing else uses it,
      `ResultsNotificationsService`) plus their imports.
- [x] 1.4 Keep `onEscape()` closing whatever popovers remain in the sidebar (icon flyout).

## 2. Topbar — Support menu gains Glossary and Tour

- [x] 2.1 Add a Glossary `<a>` to the Support panel: `CLARISA_GLOSSARY_URL`, `target="_blank"`,
      `rel="noopener noreferrer"`, closing the menu on click.
- [x] 2.2 Add a Tour `<button>` calling a new `startPlatformSidebarTour()` on the topbar component.
- [x] 2.3 Implement `startPlatformSidebarTour()` in `shell-topbar.component.ts`: inject
      `ReportingGuideService` and `ResultFrameworkReportingHomeService`, build
      `{ hasMyPrograms, hasOtherPrograms, hasCenters }` from `mySPsList()`, `otherSPsList()` and the
      existing `getMyCenters()`, and close the Support menu.

## 3. Topbar — Settings in the user menu

- [x] 3.1 Add a Settings `<button role="menuitem">` to the user panel, above the Log out footer, that
      closes the user menu and opens the Settings overlay.
- [x] 3.2 Add the `settingsMenuOpen` signal, its `cdkConnectedOverlay` anchored to `userTrigger`, and
      its position array, following the shape of the existing three popovers.
- [x] 3.3 Move the text-size panel markup into that overlay (5-option radiogroup + conditional
      "Reset to default"), wired to `FontScaleService` exactly as the sidebar wired it.
- [x] 3.4 Extend the shared `document:keydown.escape` handler to close `settingsMenuOpen`.

## 4. Tests

- [x] 4.1 `reporting-nav-sidebar.component.spec.ts`: drop the assertions on
      `data-guide="platform-tour-sidebar-trigger"`, `startPlatformSidebarTour`, the notifications
      badge and the text-size trigger; add one asserting Extras renders Release notes **and nothing
      else** (count the Extras menu items, not just the absence of a label).
- [x] 4.2 `shell-topbar.component.spec.ts`: Support offers Glossary with the right URL and target;
      Tour forwards the three context flags to `ReportingGuideService.startSidebarTour`; Settings
      closes the user menu and opens the settings overlay; picking a size calls `FontScaleService`;
      Reset appears only for a non-default scale.

## 5. Gate

- [x] 5.1 `npx jest --silent --reporters=summary --no-coverage` on the client — green.
- [x] 5.2 `npx ng lint --quiet` — green.
- [x] 5.3 `npm run build:dev` — the only thing that typechecks Angular templates.
- [x] 5.4 Checked on screen (dev server on :4201; :4200 was taken by another project). Measured,
      not eyeballed — prtest (before) vs local (after): Extras items **5 → 1**, Support items
      **2 → 4**, account menu Settings **0 → 1**, text-size options in Settings **5**. Captures in
      `~/Desktop/prms-visual-adjustments/shots/p2-3682-*.png`.

## 6. Ticket

- [ ] 6.1 Comment on P2-3682 in English: what was done, why Glossary and Tour went to Support, and
      that the mockup's Profile entry was left out because no profile screen exists.
