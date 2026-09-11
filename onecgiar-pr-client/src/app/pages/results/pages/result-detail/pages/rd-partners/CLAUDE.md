# rd-partners (P22 Partners & Contributors)

**Verified:** 2026-09-10 · branch qa-development-2026-ss · changes/unsaved-changes-alert `UCA-T-9` rework attempt 4 (per-catalogue-source scoping on the late-catalogue reconciliation — see `CanComponentDeactivate` section below); prior: 2026-09-10 · rework attempt 3 (late-CLARISA-catalogue reconciliation, initial version); prior: 2026-09-10 · rework attempt 2 (`CanComponentDeactivate` wiring, `saveSection()`/`hasUnsavedChanges()`); prior: 2026-09-01 · branch performance-refactor · 17fd108db

## What it is
The Partners & Contributors section of Result Detail for the **P22 portfolio only**
(`routing-data.ts`, `portfolioAcronym: 'P22'`). P25 uses `../rd-contributors-and-partners/` instead.

## Contract
- State: `RdPartnersService` (`providedIn: 'root'`) owns `partnersBody`, `possibleLeadPartners`,
  `possibleLeadCenters`, `leadPartnerId`, `leadCenterCode`, `updatingLeadData`, `sectionLoading`.
- Catalogues: `CentersService.centersList`, `InstitutionsService.institutionsWithoutCentersList`,
  both awaited through their `loaded*` subjects in the service constructor.
- Children: `components/normal-selector/`, `components/knowledge-product-selector/`.

## ⚠️ The service has a TWIN, and they are not interchangeable
`RdPartnersService` (here) and `../rd-contributors-and-partners/rd-contributors-and-partners.service.ts`
implement the same lead-partner/lead-centre logic for different portfolios. Grep is misleading because
**both are injected under the name `rdPartnersSE`**:

| Page | Injects | Portfolio |
|---|---|---|
| `rd-partners` (this folder) | `RdPartnersService` | P22 |
| `rd-contributors-and-partners` | `RdContributorsAndPartnersService` | P25 |
| `ipsr-contributors` | `RdContributorsAndPartnersService` | IPSR |

So a call site reading `this.rdPartnersSE.setPossibleLeadCenters(true)` may belong to **either**
service. Check the injection before assuming which one you are looking at. A change here reaches P22
only; the twin reaches P25 **and** Innovation Packages.

## Traps (⚠️ = already broke something)
- ⚠️ **`updatingLeadData` is signal-backed and must stay that way** (P2-3322). It is raised to hide
  the Lead selects while the possible-leads list is recomputed and cleared inside a
  `setTimeout(..., 25)`; under zoneless change detection a plain field never triggers the second
  render pass and the select stays hidden (`rd-partners.component.html:58,70`). The public API is a
  plain boolean, so callers are unaffected — do not turn it back into a field.
- ⚠️ **It previously used `ViewRefreshService.schedule()` instead.** That is an `ApplicationRef.tick()`
  from the root: it worked (nothing in this page's ancestor chain is OnPush) but it skips an OnPush
  ancestor that is not dirty, and **a TestBed cannot drive it**, so the behaviour could not be pinned
  by any test. That is why the mechanism was converged onto the twin's signal, not because it was
  producing a live defect.
- ⚠️ **A test asserting `updatingLeadData` instead of the rendered select passes with the bug present.**
  `rd-partners.zoneless.spec.ts` asserts on `app-pr-select[label="Lead center"]` existing in the DOM.
  Keep it that way; reverting the service must fail it.
- The chip delete icon renders only when `!rolesSE.readOnly`, the result has no `status`, and the
  centre is not `from_cgspace` — a DOM test must satisfy all three to reach it.
- `sectionLoading` is raised in `ngOnInit`, not in `getSectionInformation`: the service is a root
  singleton, so without that the skeleton would only ever show for the first result of the session.

## CanComponentDeactivate (UCA-T-9)

`RdPartnersComponent implements CanComponentDeactivate` for `docs/specs/changes/unsaved-changes-alert`:
- `hasUnsavedChanges()`/snapshot target is a COMPOSITE `{ partnersBody, leadCenterCode,
  leadPartnerId }` (`dirtySnapshotValue()`, `component.ts`) — not `partnersBody` alone.
  `leadCenterCode`/`leadPartnerId` live on `RdPartnersService`, outside `partnersBody`, but feed
  `performSave()`'s PATCH — a Reviewer FAIL (attempt 1) found editing ONLY one of them left
  `partnersBody` byte-identical, so Next silently skipped saving it.
- No child-mutation false-dirty bug here (unlike the P25 twin's `multiple-wps` ToC rows) — this
  section has no ToC-mapped `result_toc_results` array; P22's ToC lives in `rd-theory-of-change`.
- ⚠️ **`UCA-T-9` attempt 3 — late-catalogue reconciliation (was accepted as a "narrow residual gap"
  in attempt 2; it wasn't).** `RdPartnersService`'s constructor subscriptions to
  `institutionsSE.loadedInstitutions`/`centersSE.loadedCenters` can re-run
  `setLeadPartnerOnLoad`/`setLeadCenterOnLoad` AFTER this component's own load-flow snapshot on a
  genuine cold-entry load (`InstitutionsService` has no bootstrap prefetch — its GET races this
  section's own GET directly). Fixed the same way as the P25 twin
  (`rd-contributors-and-partners.component.ts`): `snapshotBaseline()` is the single write path for
  both `dirtyTracker`'s baseline and a component-local `lastDirtySnapshot` (JSON-cloned — a live
  object reference would drift with in-place edits and silently mask a genuine dirty edit, caught by
  this fix's own regression test), and `reconcileLeadFieldsAfterLateCatalogue()` (wired through the
  service's new `onCatalogueDrivenLeadUpdate` callback, set in `ngOnInit`/cleared in `ngOnDestroy`)
  folds the catalogue's corrected lead fields into a fresh baseline ONLY when nothing else changed
  since the last snapshot. ⚠️ **Attempt 3's first version substituted BOTH lead fields back
  unconditionally, silently erasing a concurrent edit to whichever field the EMITTING catalogue did
  NOT touch** (e.g. editing `leadCenterCode` while `loadedInstitutions` was still resolving got wiped
  when it finally emitted). Attempt 4 fixed this: the callback now carries a
  `source: 'centers' | 'institutions'` discriminator, and `reconcileLeadFieldsAfterLateCatalogue(source)`
  substitutes back ONLY the field that catalogue can affect (`leadPartnerId` for `'institutions'`,
  `leadCenterCode` for `'centers'`) — the other field's live value stays in the comparison, so a
  genuine edit to it is preserved as dirty.
- `saveSection()` wraps `performSave()` (same PATCH + error branch as `onSaveSection()`, `UCA-DD-3`).
- `canDeactivate: [UnsavedChangesGuard]` lives on the INNER `{ path: '', component: RdPartnersComponent }`
  route in `rd-partners-routing.module.ts` — NOT on `resultDetailRouting`'s `partners` entry (that one
  has `loadChildren`, no `component`; see `docs/specs/changes/unsaved-changes-alert/execution.md`).
- Tests: `rd-partners.component.spec.ts`, describe `RdPartnersComponent — CanComponentDeactivate
  (UCA-T-9)` — renders through the REAL `RdPartnersService` (the snapshot target lives there), with
  `GET_partnersSection`/`PATCH_partnersSection` mocked via `delay(0)` + `fakeAsync`/`tick`, never a
  synchronous `of(...)`.

## Where it is used
- `resultDetailRouting` → the Partners section of Result Detail, P22 results only.

## Tests
- `rd-partners.zoneless.spec.ts` — real DOM under `provideZonelessChangeDetection()`. Mirrors the
  twin's `../rd-contributors-and-partners/rd-contributors-and-partners.zoneless.spec.ts`.
- `rd-partners.service.spec.ts`, `rd-partners.component.spec.ts` — Jest.
