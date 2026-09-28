# ipsr-unsaved-changes-guard — proposal

**Ticket:** P2-3427 (Ángel, PO review of IPSR in prtest, 28-Sep-2026, finding #1).
**Symptom (reproduced on localhost:4200 against prtest, package 9635):** edit the Title in
*General information*, click the *Contributors and Partners* tab → the tab switches, no dialog,
and when you come back the edit is gone. To the reporter it "looked like it saved".

**Cause:** the Results (W1/W2) sections implement `CanComponentDeactivate` and register
`UnsavedChangesGuard` on their inner routes (`docs/specs/changes/unsaved-changes-alert/`). The
IPSR sections never did: `IPSRDetailRouting` / `ipsrInnovationUsePathwayRouting` have no
`canDeactivate`, and no IPSR component tracks a dirty snapshot.

**Change:** bring the SAME mechanism to IPSR, reusing the shared guard, dialog, tracker and intent
service as they are (no shared file is edited):
- every editable IPSR section implements `CanComponentDeactivate` with a component-scoped
  `SectionDirtyTrackerService`;
- its inner routing module registers `canDeactivate: [UnsavedChangesGuard]`;
- the existing *Save & go to next/previous step* buttons keep their PATCH, re-snapshot on success
  and mark the navigation as silent (`UnsavedNavigationIntentService.markSilent()`), exactly like
  `section-bottom-bar` does in Results, so they never show the dialog.

**Out of scope:** *Link to results* (nothing editable), the IPSR list/creator, the shared guard.
