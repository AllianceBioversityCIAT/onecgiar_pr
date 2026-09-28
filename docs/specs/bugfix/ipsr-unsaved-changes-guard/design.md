# ipsr-unsaved-changes-guard — design (the brief every implementer follows)

Reference implementation, copy its shape: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.ts`
(lines 21-31 providers/implements, 73 tracker, 258-273 hasUnsavedChanges/saveSection, 365 snapshot at end of load, 454 snapshot inside the PATCH `tap`) and its routing module
`rd-general-information-routing.module.ts`. Shared pieces (READ ONLY, never edited):
- `shared/guards/unsaved-changes.guard.ts` + `shared/guards/unsaved-changes.types.ts` (`CanComponentDeactivate { hasUnsavedChanges(): boolean; saveSection(): Observable<boolean> }`)
- `shared/services/unsaved-changes/section-dirty-tracker.service.ts` (`snapshot(value)`, `isDirty(value)`; NOT root-provided)
- `shared/services/unsaved-changes/unsaved-navigation-intent.service.ts` (`markSilent()`; root-provided)

## Per component (body `B`, existing PATCH call `P`)
1. `@Component({ ..., providers: [SectionDirtyTrackerService] })`, class `implements OnInit, CanComponentDeactivate`.
2. `private readonly dirtyTracker = inject(SectionDirtyTrackerService);` (add `inject` import if missing).
3. **Snapshot at the TRUE end of the load flow** — after the last synchronous mutation of `B` in the success branch (and after any async catalogue GET that mutates `B` — snapshot there instead, as rd-general-information does in `convertChecklistToDiscontinuedOptions`). A freshly loaded, untouched section MUST report `hasUnsavedChanges() === false`.
4. `hasUnsavedChanges(): boolean { return this.dirtyTracker.isDirty(B); }`
5. Extract `private performSave(): Observable<void>` holding the EXACT existing `P` call and its success side effects; inside `tap(next)` call `this.dirtyTracker.snapshot(B)` **synchronously, before** the follow-up reload (`getSectionInformation()`), then keep the reload. Keep the existing error branch behaviour (no reload on error where that is the case today).
   - `onSaveSection()` keeps every existing precondition (`loaded() !== true`, `refuseUntypedRows()`, P22 contact check, pending uploads…) and then `this.performSave().subscribe()`.
   - `saveSection(): Observable<boolean>`: when a precondition refuses → `of(false)` (the section stays, the existing alert explains why); else `this.performSave().pipe(map(() => true), catchError(() => of(false)))`.
   - Step 3 uploads files first (async/await): wrap as `defer(() => from(this.saveFlow()))` returning `Promise<boolean>`; same rule, snapshot right after the PATCH resolves.
6. **Save & go to next/previous step buttons** (step-1 `saveAndNextStep`, step-3 `onSaveSectionWithStep`, step-4 `onSavePrevious`, complementary-innovation `onSavePreviousNext`/`navigateToStep`, basic-info `onSavePreviuosNext`): keep their own PATCH endpoints; on PATCH success `this.dirtyTracker.snapshot(B)` synchronously; and call `this.intentSE.markSilent()` (inject `UnsavedNavigationIntentService`) immediately before EVERY `router.navigate` these buttons perform (also the read-only / not-loaded branches that only navigate). The guard consumes the flag on the next navigation; if anything is still dirty it saves silently instead of opening the dialog (same as `section-bottom-bar.component.ts:398-401`).
7. **Routing module** (inner one, the route that has `component:`): `{ path: '', component: X, canDeactivate: [UnsavedChangesGuard] }` + the 3-line comment explaining it lives on the inner route (copy from `rd-general-information-routing.module.ts`). Never on the outer `loadChildren` entries of `routing-data-ipsr.ts`.
8. Comments in English, short, citing `P2-3427 (Ángel, 28-Sep-2026 review)`.

## Tests (extend the component's existing spec; Jest, `fakeAsync`/`tick` where the load is async)
`describe('CanComponentDeactivate (P2-3427)')`:
- false right after the load flow completes (untouched);
- true after mutating a bound field of `B` (append to a string / push to an array — never a fixed literal);
- false at the exact instant `saveSection()` emits `true`, even when the follow-up reload is forced to fail (proves the synchronous snapshot in `performSave`);
- `saveSection()` resolves `false` (does not throw) when the PATCH errors;
- `saveSection()` resolves `false` without calling the PATCH when a precondition refuses (pick one that exists in that component);
- the save-and-go button calls `markSilent()` before `router.navigate` (spy on `UnsavedNavigationIntentService`).
Run only the specs you touched: `cd onecgiar-pr-client && npx jest <spec paths> --silent`. All green, existing tests untouched unless the refactor genuinely requires an update (say which and why).

## Rules for implementers
- Edit ONLY the files assigned to you. No git commands. No shared-file edits. No new dependencies.
- Do not change endpoints, payloads or validation order. Extract, do not rewrite.
- Report: files changed, where the snapshot lives per component and why, test command + summary line, anything you could not verify.
