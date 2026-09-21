# Module Spec — Unsaved Changes Warning on Navigation — Tasks

Linked spec: `docs/specs/changes/unsaved-changes-alert/requirements.md` + `design.md`.

- **Sprint / target phase:** none set
- **Owner / driver:** Frontend (onecgiar-pr-client) — Santiago Sanchez Correa
- **Status:** not-started

---

## 1. Scope of this task list

Client-only, no migration. Shared primitives (interface, dirty tracker, intent flag, guard, dialog, `beforeunload` directive) plus per-section wiring across the `rd-*` Result Detail sections. Budgeted ~11–13 tasks / ~450–700 LOC / 1–2 review rounds (`design.md` §Budget).

**Confirmed decision (2026-09-10, user):** No section is excluded from the Back/Next save-on-click behavior, including `rd-contributors-and-partners` (the one section whose save triggers an email side effect) — see `design.md` §13.

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (status: approved by user, Continue at Phase 1).
- [x] `design.md` approved (status: approved by user, Continue at Phase 2).
- [x] Open questions resolved: `UCA-OQ-1` (Discard just navigates, no reset), `UCA-OQ-2` (confirm per-section serializability as each task executes — see per-task note below), `UCA-OQ-3` (Escape = Discard), and the `rd-contributors-and-partners` email-side-effect question (no exception).
- [ ] No conflicting in-flight spec touching `section-bottom-bar.component.ts`, `result-detail-routing.module.ts`, or any `rd-*` section — search `docs/specs/` before starting.
- [x] No migration involved — N/A.

---

## 3. Task list

### `UCA-T-1` — Shared contract, dirty tracker, and navigation-intent flag `[x] PASS`

- **Type:** `client`
- **Description:** Add the small reusable pieces every other task depends on: (1) `CanComponentDeactivate` interface (`hasUnsavedChanges(): boolean`, `saveSection(): Observable<boolean>`) in `shared/guards/unsaved-changes.types.ts`; (2) `SectionDirtyTrackerService` (`shared/services/unsaved-changes/section-dirty-tracker.service.ts`), **not** root-provided — each section provides its own instance via `providers: [SectionDirtyTrackerService]` — exposing `snapshot(value: unknown): void` (deep-clones and stores) and `isDirty(value: unknown): boolean` (`JSON.stringify` structural diff against the stored snapshot; returns `false` before any snapshot exists); (3) `UnsavedNavigationIntentService` (`shared/services/unsaved-changes/unsaved-navigation-intent.service.ts`, root-provided) exposing `markSilent(): void` and `consumeSilent(): boolean` (reads the flag and unconditionally resets it to `false` in the same call, so it can never leak into an unrelated navigation).
- **Implements:** `UCA-R-1` (intent flag), `UCA-DD-1` (dirty tracker), `UCA-DD-2` (intent flag consumed-once semantics)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/guards/unsaved-changes.types.ts`, `onecgiar-pr-client/src/app/shared/services/unsaved-changes/section-dirty-tracker.service.ts` (+ `.spec.ts`), `onecgiar-pr-client/src/app/shared/services/unsaved-changes/unsaved-navigation-intent.service.ts` (+ `.spec.ts`)
- **Depends on:** `—`
- **Blocks:** `UCA-T-2`, `UCA-T-3`, `UCA-T-5`
- **Estimate:** `S`
- **Definition of done — each case names the falsifying input:**
  - [x] `isDirty()` is `false` immediately after `snapshot(value)` with that same `value`. *Falsifying input: comparing by reference instead of structural diff would make this pass even when it shouldn't be trusted after a shallow mutation — the next case catches that.*
  - [x] `isDirty()` is `true` after `snapshot(value)` then mutating a field on `value` (not replacing the reference) and calling `isDirty(value)` again. *Falsifying input: a reference-equality check (`value === snapshot`) would wrongly report `false` here since the reference never changed — this is the exact case that would let real edits slip past the guard.*
  - [x] `isDirty()` is `false` before any `snapshot()` call. *Falsifying input: an implementation that treats "no snapshot yet" as dirty would show the dialog on the very first navigation of a freshly loaded, unedited section.*
  - [x] `consumeSilent()` returns `true` exactly once after `markSilent()`, then `false` on every subsequent call without another `markSilent()`. *Falsifying input: an implementation that doesn't reset the flag would leak "silent" into the next, unrelated navigation (e.g. a sidebar click right after a Next click) and silently skip the dialog when it should show.*
  - [x] `npx ng lint --quiet` clean on the three new files.
  - [x] `npm run test -- --testPathPattern="section-dirty-tracker.service.spec|unsaved-navigation-intent.service.spec"` green.
  - [x] Coverage: new files stay at or above 50/60/60/60 (small, easily fully covered).

### `UCA-T-2` — `UnsavedChangesGuard` (`CanDeactivate`) `[x] PASS`

- **Type:** `client`
- **Description:** Implement `UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate>` per `design.md` §2.2/§6.2: if `!component.hasUnsavedChanges()` return `true` synchronously (after still calling `intentSE.consumeSilent()` to clear a stray flag, per `UCA-DD-2`'s consumed-once rule); else, if `intentSE.consumeSilent()` is `true`, call `component.saveSection()` and return its result directly; else, open the Save/Discard dialog (via the service built in `UCA-T-3`) and map `'discard'` → `true`, `'save'` → `component.saveSection()`'s result.
- **Implements:** `UCA-R-1`, `UCA-R-2`, `UCA-R-4`, `UCA-R-5`, `UCA-AC-1`, `UCA-AC-3`, `UCA-AC-4`, `UCA-AC-5`, `UCA-AC-6`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/guards/unsaved-changes.guard.ts` (+ `.spec.ts`)
- **Depends on:** `UCA-T-1`, `UCA-T-3` (needs the dialog service's shape to mock/inject; can be stubbed with a minimal interface and wired for real once `UCA-T-3` lands if run in parallel)
- **Blocks:** `UCA-T-4`
- **Estimate:** `M`
- **Definition of done — each case names the falsifying input:**
  - [x] Not dirty → returns `true` immediately, dialog service is never called, `saveSection()` is never called. *Falsifying input: an implementation that always calls `saveSection()` "just in case" would make this test fail (spy call count > 0) and would violate `UCA-R-5`'s "zero added latency" intent even if navigation still worked.*
  - [x] Not dirty → `consumeSilent()` is still invoked (clears a stray leftover flag). *Falsifying input: skipping the clear on the "not dirty" early-return path would let a `markSilent()` from an earlier attempted (then blocked) navigation leak into the next real navigation.*
  - [x] Dirty + silent flag set → calls `saveSection()` directly, dialog service is never opened; resolves `true` on save success. *Falsifying input: opening the dialog anyway despite the silent flag would violate `UCA-R-1` ("no dialog on this path").*
  - [x] Dirty + silent flag set → `saveSection()` fails → guard resolves `false` (navigation blocked). *Falsifying input: resolving `true` regardless of `saveSection()`'s result would let `UCA-AC-2` regress (navigates away after a failed save).*
  - [x] Dirty + silent flag NOT set → opens the dialog; `saveSection()` is not called before the user answers. *Falsifying input: calling `saveSection()` before or without opening the dialog would bypass the user's Save/Discard choice entirely.*
  - [x] Dialog resolves `'discard'` → guard resolves `true` without ever calling `saveSection()`. *Falsifying input: calling `saveSection()` on Discard would silently reintroduce a save the user explicitly declined, and could trigger a side effect (e.g. `rd-contributors-and-partners`'s email) the user chose to avoid.*
  - [x] Dialog resolves `'save'` → calls `saveSection()`; guard resolves `true` on success, `false` on failure. *Falsifying input: always resolving `true` regardless of `saveSection()`'s outcome would swallow a save failure and still navigate away, losing the edit silently — the opposite of this whole spec's purpose.*
  - [x] `npx ng lint --quiet` clean.
  - [x] `npm run test -- --testPathPattern="unsaved-changes.guard.spec"` green.

### `UCA-T-3` — Save/Discard dialog (`hlm-dialog`) and its service `[x] PASS`

- **Type:** `client`
- **Description:** Build `UnsavedChangesDialogComponent` (`shared/components/unsaved-changes-dialog/`) on `hlm-dialog` (Spartan/Helm CDK Dialog — consult the Spartan MCP for the current API before writing markup) rendering the copy from `requirements.md` §UCA-R-3 ("You have unsaved changes. If you leave now, they'll be lost. Do you want to save before continuing?") with exactly two actions, **Save** (`brand` button, initial focus) and **Discard** (`outline`/`ghost`). Wire Escape to resolve as Discard (`UCA-OQ-3`). Add `UnsavedChangesDialogService.openSaveDiscard(): Observable<'save' | 'discard'>` opening it via `hlm-dialog`'s service API.
- **Implements:** `UCA-R-3`, NFR "Accessibility" (`design.md` §6.3 — `hlm-dialog` not `app-pr-dialog`, per `src/CLAUDE.md` §21.7)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/components/unsaved-changes-dialog/unsaved-changes-dialog.component.ts` (+ `.html`, `.scss`, `.spec.ts`), `unsaved-changes-dialog.service.ts` (+ `.spec.ts`)
- **Depends on:** `—` (parallel-safe with `UCA-T-1`)
- **Blocks:** `UCA-T-2` (for the real wiring — see `UCA-T-2`'s Depends on note), `UCA-T-4`
- **Estimate:** `M`
- **Definition of done:**
  - [x] Dialog renders exactly two actionable buttons — Save and Discard — no third action. *Falsifying input: a template that also renders a close/"X" button with no explicit resolve value would leave a third, undefined exit path — assert the DOM has exactly two `button` elements that call `close()`/`dialogRef.close()` with a value.*
  - [x] Pressing Escape resolves the dialog observable with `'discard'`. *Falsifying input: relying on `hlm-dialog`'s default Escape-closes-with-`undefined`-behavior instead of an explicit binding would make the service's caller receive `undefined`, not `'discard'` — must assert the actual resolved value, not just that the dialog closed.*
  - [x] Save button receives initial focus on open (per `design.md` §6.3). *Manual/real-browser confirmation — jsdom's focus semantics inside a CDK overlay are not fully representative; note this in the PR description if the automated assertion is inconclusive rather than reporting a false pass.* (jsdom-verifiable subset confirmed; real-CDK-overlay confirmation deferred to `UCA-T-12` manual pass.)
  - [x] `npx ng lint --quiet` clean; `npm run build` run at least once (template compiles — `tsc --noEmit` does not check templates, per `src/CLAUDE.md` §21.7).
  - [x] `npm run test -- --testPathPattern="unsaved-changes-dialog"` green.

### `UCA-T-4` — `beforeunload` warning directive + guard on `resultDetailRouting` `[x] PASS (split scope — see below)`

- **Type:** `client`
- **Description:** Add `BeforeUnloadWarningDirective` (`shared/directives/before-unload-warning.directive.ts`, selector `[appBeforeUnloadWarning]`, `@Input() appBeforeUnloadWarning: () => boolean`) with a single `@HostListener('window:beforeunload', ['$event'])` that calls `event.preventDefault()` (and sets the legacy `event.returnValue = ''` for browser compatibility) only when the bound function returns `true`. Then attach `canDeactivate: [UnsavedChangesGuard]` to every section route in `resultDetailRouting` (`result-detail-routing.module.ts`) — the always-present sections and each `rdResultTypesPages` entry (per `design.md` §6.1); confirm whether `rd-links-to-results` renders through this same routing table or is out of scope (per the sibling `realtime-section-completion` spec's finding that it doesn't render `SectionBottomBarComponent` — check whether it is even a routed `rd-*` page here before adding the guard to it).
- **Implements:** `UCA-R-6`, routing wiring for `UCA-R-2`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/directives/before-unload-warning.directive.ts` (+ `.spec.ts`), `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail-routing.module.ts`
- **Depends on:** `UCA-T-1`, `UCA-T-2`
- **Blocks:** `UCA-T-6`..`UCA-T-11` (need the guard already attached to test end-to-end per section)
- **Estimate:** `S`
- **Definition of done:**
  - [x] Directive calls `event.preventDefault()` when the bound function returns `true`, and does nothing when it returns `false`. *Falsifying input: a directive that always calls `preventDefault()` regardless of the bound function's result would show the native prompt even on a clean section, which is directly testable by asserting `preventDefault` is NOT called when the mock returns `false`.* (Reviewer notes the paired `returnValue` assertion is vacuous under jsdom — see execution.md — but the `preventDefault` case itself, including the load-bearing negative, is genuinely proven.)
  - [~] `resultDetailRouting`'s routes all list `canDeactivate: [UnsavedChangesGuard]` (or a documented, deliberate exception noted in this task's DoD if one route can't carry it). **DEFERRED to `UCA-T-6`, by design — see execution.md "Scope split".** Attaching the guard before any `rd-*` section implements `CanComponentDeactivate` would `TypeError` on every navigation attempt today; `UCA-T-6` must land this attachment alongside its own section wiring.
  - [x] `npx ng lint --quiet` clean; `npm run build` clean (routing config change).
  - [x] `npm run test -- --testPathPattern="before-unload-warning.directive.spec"` green.
  - [x] **What this task cannot prove:** that the real browser actually shows its native prompt when `beforeunload` fires — `jsdom` cannot dispatch/observe that UI. `UCA-T-12`'s manual pass is the check that proves it; do not report this task's automated green as proof of `UCA-AC-7`/`UCA-AC-8` by itself.

### `UCA-T-5` — `section-bottom-bar`: silent-save intent before Back/Next `[x] PASS (attempt 2)`

- **Type:** `client`
- **Description:** Inject `UnsavedNavigationIntentService` into `SectionBottomBarComponent` and call `this.intentSE.markSilent()` as the first line inside the private `goTo(index)` method (`section-bottom-bar.component.ts:185-189`), immediately before `this.router.navigate(...)`. No other change to `goTo`, `goPrevious`, or `goNext`.
- **Implements:** `UCA-R-1`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar.component.ts` (+ `.spec.ts`)
- **Depends on:** `UCA-T-1`
- **Blocks:** `UCA-T-6`..`UCA-T-11`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Clicking `Next`/`Back` calls `intentSE.markSilent()` before `router.navigate`. *Falsifying input: calling `markSilent()` AFTER `router.navigate()` (even if both happen) would race the guard, which reads the flag synchronously as part of the same navigation's `canDeactivate` check — order matters, not just "both were called."*
  - [x] A sidebar `routerLink` click (simulated via `Router.navigate` triggered from outside `section-bottom-bar`) does NOT call `markSilent()`. *Falsifying input: an implementation that marks the flag on some broader event (e.g. any `Router` navigation start, subscribed globally) instead of specifically inside `goTo()` would wrongly mark sidebar clicks as silent too, defeating `UCA-R-2` for that path.* (Attempt 2: test now restores the real `router.navigate` for this assertion so `NavigationStart` genuinely fires through `router.events`, closing attempt 1's mock-vacuity gap — see execution.md.)
  - [x] `npx ng lint --quiet` clean.
  - [x] `npm run test -- --testPathPattern="section-bottom-bar.component.spec"` green — extend the existing spec file, don't fork a new one.

### `UCA-T-6` — `rd-general-information`: dirty tracking + `saveSection()` `[x] PASS (attempt 2)`

- **Type:** `client`
- **Description:** Implement `CanComponentDeactivate` on `RdGeneralInformationComponent`: inject `SectionDirtyTrackerService` (component-scoped, `providers: [SectionDirtyTrackerService]`), call `dirtyTracker.snapshot(this.generalInfoBody)` at the end of the section's load flow and again on `performSave()`'s success branch; `hasUnsavedChanges()` → `dirtyTracker.isDirty(this.generalInfoBody)`; `saveSection(): Observable<boolean>` wraps the existing `performSave()` call to emit `true`/`false` instead of void (reuse the exact same `PATCH_generalInformation` call and error branch — no duplicated save logic per `UCA-DD-3`). Apply `[appBeforeUnloadWarning]="hasUnsavedChanges.bind(this)"` on the section's root element. **Also attach `canDeactivate: [UnsavedChangesGuard]` to THIS section's OWN route entry in `resultDetailRouting`** (deferred here from `UCA-T-4` — see its execution.md entry: attaching the guard before any section implements the interface would `TypeError` on every navigation). Attach ONLY to `general-information`'s route, not to every route in the table — `UCA-T-7`..`UCA-T-11` each attach the guard to their own route as they wire their own component (confirmed correct by Reviewer: `canDeactivate` fires only for the route being left, so narrow, incremental attachment is the safe rollout, not a shortcut).
- **Implements:** `UCA-R-1`, `UCA-R-2`, `UCA-R-5`, `UCA-R-6`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6`, `UCA-AC-7`, `UCA-AC-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/rd-general-information.component.ts` (+ `.html`, `.spec.ts`)
- **Depends on:** `UCA-T-1`, `UCA-T-4`, `UCA-T-5`
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:**
  - [x] `hasUnsavedChanges()` is `false` right after load and right after a successful save; `true` after editing any bound field. (Attempt 2: snapshot moved to the true end of the load flow — inside `convertChecklistToDiscontinuedOptions()` — and a direct snapshot added inside `performSave()`'s `tap` on PATCH success. Reviewer independently traced the `fakeAsync`/`delay(0)` timing to confirm both rewritten tests genuinely fail if either fix is reverted — see execution.md attempt 2.)
  - [x] `saveSection()` resolves `false` (not throws) on a failing `PATCH_generalInformation`, and the section's existing error UI still renders.
  - [x] `UCA-OQ-2` check: `GeneralInfoBody` confirmed plain-serializable (no `File`/`Blob`/circular refs) — reconfirmed independently by Reviewer in attempt 1.
  - [x] The first section route to implement `CanComponentDeactivate` gets `canDeactivate: [UnsavedChangesGuard]` attached to its OWN route entry only (`general-information`) — confirmed correct by Reviewer (attempt 1): `canDeactivate` fires only for the route being LEFT, so narrow attachment avoids the broken-navigation window. `UCA-T-7`..`UCA-T-11` each add the guard to their own route.
  - [x] Re-snapshot on `performSave()`'s success branch directly, not solely via the delegated reload. (Attempt 2 fix, Reviewer-confirmed via independent timing trace — see execution.md.)
  - [x] `npx ng lint --quiet` clean; `npm run build` clean (template change for the directive binding + routing config change — only pre-existing unrelated errors remain).
  - [x] `npm run test -- --testPathPattern="rd-general-information.component.spec"` green (110/110); coverage stays ≥ 50/60/60/60. Both timing-sensitive tests rewritten with genuine `fakeAsync`/`delay(0)` async boundaries per Reviewer's remediation — confirmed non-vacuous.

### `UCA-T-7` — `rd-geographic-location`: dirty tracking + `saveSection()` `[x] PASS (attempt 2)`

- **Type:** `client`
- **Description:** Same pattern as `UCA-T-6`, applied to `RdGeographicLocationComponent`. Identify this section's bound save-payload object (equivalent of `generalInfoBody`) before wiring — do not assume the same field name.
- **Implements:** `UCA-R-1`, `UCA-R-2`, `UCA-R-5`, `UCA-R-6`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6`, `UCA-AC-7`, `UCA-AC-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.ts` (+ `.html`, `.spec.ts`)
- **Depends on:** `UCA-T-1`, `UCA-T-4`, `UCA-T-5`, `UCA-T-6` (the routing attachment now lands with `UCA-T-6`, not `UCA-T-4` — see `UCA-T-4`'s execution.md entry; do not start this task in parallel with `UCA-T-6` until the guard is actually attached, or it inherits the same broken-navigation window)
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:** Same checklist shape as `UCA-T-6` (dirty-false-after-load-and-save — using genuinely async test observables for any load/save side effect, per `UCA-T-6`'s attempt-1 FAIL, not synchronous mocks that would mask a real race — dirty-true-after-edit, save-failure-resolves-false, `UCA-OQ-2` serializability confirmation, lint/build/test green, coverage maintained), **plus attach `canDeactivate: [UnsavedChangesGuard]` to THIS section's own route entry in `resultDetailRouting`** (narrow, incremental attachment — do not touch any other route). **Reviewer FAIL (attempt 1): the component's OWN load flow (`fillGeographicLocationBody`/`fillExtraGeographicLocationBody`) has no secondary async mutation, but a CHILD component (`app-sub-geoscope`, rendered for `geo_scope_id === SUB_NATIONAL` results) mutates `geographicLocationBody.countries[i].sub_national` both synchronously (ngOnInit) and asynchronously (after `GET_subNationalByIsoAlpha2` resolves) — AFTER the load-flow snapshot. A freshly loaded sub-national result reports dirty in production. The `UCA-OQ-2` serializability test was also found to be a tautology (round-trips a literal it just assigned, not loaded state) with an inaccurate recorded finding (claimed "only primitives/number arrays" when `countries`/`regions` are actually nested object arrays). See execution.md.**

### `UCA-T-8` — `rd-evidences`: dirty tracking + `saveSection()` `[x] PASS (attempt 3)`

- **Type:** `client`
- **Description:** Same pattern as `UCA-T-6`, applied to `RdEvidencesComponent`. Evidence sections often involve file/attachment references — during `UCA-OQ-2`'s check, confirm whether the bound object holds only metadata (serializable) or raw `File`/`Blob` objects; if the latter, exclude those fields from the dirty diff (compare only the serializable subset) rather than forcing a diff that would always read as dirty or throw on `JSON.stringify`.
- **Implements:** `UCA-R-1`, `UCA-R-2`, `UCA-R-5`, `UCA-R-6`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6`, `UCA-AC-7`, `UCA-AC-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts` (+ `.html`, `.spec.ts`)
- **Depends on:** `UCA-T-1`, `UCA-T-4`, `UCA-T-5`, `UCA-T-6` (the routing attachment now lands with `UCA-T-6`, not `UCA-T-4` — see `UCA-T-4`'s execution.md entry; do not start this task in parallel with `UCA-T-6` until the guard is actually attached, or it inherits the same broken-navigation window)
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:** Same checklist shape as `UCA-T-6` (see its attempt-1 FAIL note on async test observables), plus an explicit note on how `File`/`Blob` fields (if any) were excluded from the diff, with a test proving a change to an EXCLUDED field alone does not report dirty (documented as a deliberate, narrow gap, not silently unhandled), **plus attach `canDeactivate: [UnsavedChangesGuard]` to THIS section's own route entry in `resultDetailRouting`** (narrow, incremental attachment only).

### `UCA-T-9` — Portfolio-specific partners section: `rd-partners` (P22) and `rd-contributors-and-partners` (P25) `[x] PASS (attempt 4, user-authorized past the 3-attempt ceiling after a HALT)`

- **Type:** `client`
- **Description:** Same pattern as `UCA-T-6`, applied to both `RdPartnersComponent` (P22) and `RdContributorsAndPartnersComponent` (P25). **No exception for the email side effect** — confirmed with the user (see `design.md` §13): Back/Next silently saves this section exactly like every other section. Use `RdContributorsAndPartnersService.partnersBody` (P25) / the equivalent P22 body as the snapshot target.
- **Implements:** `UCA-R-1`, `UCA-R-2`, `UCA-R-5`, `UCA-R-6`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6`, `UCA-AC-7`, `UCA-AC-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-partners/rd-partners.component.ts` (+ `.html`, `.spec.ts`), `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts` (+ `.html`, `.spec.ts`) — **this folder is excluded from `collectCoverageFrom`** (per its own `CLAUDE.md`); tests still required, just don't count on coverage %.
- **Depends on:** `UCA-T-1`, `UCA-T-4`, `UCA-T-5`, `UCA-T-6` (the routing attachment now lands with `UCA-T-6`, not `UCA-T-4` — see `UCA-T-4`'s execution.md entry; do not start this task in parallel with `UCA-T-6` until the guard is actually attached, or it inherits the same broken-navigation window)
- **Blocks:** `—`
- **Estimate:** `L` (two components, and `rd-contributors-and-partners`'s save payload assembly is unusually involved — read `rd-contributors-and-partners.component.ts:648-770` before wiring `saveSection()` around it)
- **Definition of done:**
  - [x] Both components pass the same dirty-false/dirty-true/save-failure-resolves-false cases as `UCA-T-6`. Reached across attempts 1→4: `multiple-wps`/`multiple-wps-content` normalization (attempt 2), `normal-selector` hydration guard (attempt 3), late-catalogue reconciliation with per-source field scoping (attempt 4). All independently re-verified correct and exhaustive by the final Reviewer pass — see execution.md.
  - [x] A test explicitly asserts that clicking Next on a dirty `rd-contributors-and-partners` DOES call `PATCH_ContributorsPartners` (i.e., confirms the uniform-behavior decision is actually implemented, not silently carved out). Confirmed present and passing across all attempts.
  - [x] Every field that feeds `performSave()`'s PATCH payload must be part of the dirty diff, not just the named body object. Composite snapshot (attempt 2) + per-catalogue-source reconciliation scoping (attempt 4, closing a silent-erase bug attempt 3's first version introduced). Final Reviewer traced both services' full write-sets to confirm the `source → field` mapping is exhaustive and exact.
  - [x] `UCA-OQ-2` confirmation recorded for both components' bound bodies. Reconfirmed correct across attempts.
  - [x] Update BOTH `rd-partners/CLAUDE.md` and `rd-contributors-and-partners/CLAUDE.md` per this folder's documented convention. Re-stamped and corrected to attempt-4 state by the Leader after the final review flagged them as still describing attempt-3's (buggy) semantics.
  - [x] `npx ng lint --quiet` clean on both; `npm run build` clean.
  - [x] `npm run test -- --testPathPattern="rd-partners.component.spec|rd-contributors-and-partners.component.spec"` green — 143/143, including genuinely falsifiable async/rendered tests for every bug found across all 4 attempts.
  - [x] Attach `canDeactivate: [UnsavedChangesGuard]` to BOTH sections — moved to each section's inner `{path: '', component: X}` route (cross-cutting fix, confirmed correct).

### `UCA-T-10` — P22-only sections: `rd-theory-of-change`, `rd-links-to-results` `[x] PASS (attempt 2)`

- **Type:** `client`
- **Description:** Same pattern as `UCA-T-6`, applied to `RdTheoryOfChangeComponent` and `RdLinksToResultsComponent` (both P22-only per `src/CLAUDE.md` §3.3). First confirm whether `rd-links-to-results` is even routed through `resultDetailRouting`/renders `SectionBottomBarComponent` — the sibling `realtime-section-completion` spec found it does not; if confirmed here too, this section still needs the `CanComponentDeactivate` interface (for the dialog path on whatever navigation does apply to it) but has no Back/Next silent-save concern to test.
- **Implements:** `UCA-R-1` (where applicable), `UCA-R-2`, `UCA-R-5`, `UCA-R-6`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6`, `UCA-AC-7`, `UCA-AC-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-change.component.ts` (+ `.html`, `.spec.ts`), `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-links-to-results/rd-links-to-results.component.ts` (+ `.html`, `.spec.ts`)
- **Depends on:** `UCA-T-1`, `UCA-T-4`, `UCA-T-5`, `UCA-T-6` (the routing attachment now lands with `UCA-T-6`, not `UCA-T-4` — see `UCA-T-4`'s execution.md entry; do not start this task in parallel with `UCA-T-6` until the guard is actually attached, or it inherits the same broken-navigation window)
- **Blocks:** `—`
- **Estimate:** `L` (ToC's nested `toc-initiative-out` tree makes its bound state larger and worth double-checking for circular refs before the `JSON.stringify` diff)
- **Definition of done:** Same checklist shape as `UCA-T-6` (see its attempt-1 FAIL note on async test observables), plus an explicit note confirming (or correcting) whether `rd-links-to-results` renders `section-bottom-bar` at all, and adjusting its test scope accordingly (skip the Back/Next case with a documented reason if it truly doesn't apply, don't leave it silently untested with no explanation). **Also attach `canDeactivate: [UnsavedChangesGuard]` to both sections' own route entries in `resultDetailRouting`** (narrow, incremental attachment only) — `UCA-T-6`'s Implementer confirmed `rd-links-to-results` IS present in `resultDetailRouting` (path `links-to-results`, P22 only) and does NOT render `section-bottom-bar`, so it still needs the guard on its own route for the dialog path even without a Back/Next case to test.

### `UCA-T-11` — Result-type-specific sections (`rd-result-types-pages/*`, 5 variants) `[x] PASS (all 5 sub-components complete — see execution.md)`

- **Type:** `client`
- **Description:** Same pattern as `UCA-T-6`, applied to all five: `cap-dev-info`, `innovation-dev-info`, `innovation-use-info`, `knowledge-product-info`, `policy-change-info`. Grouped into one task since they share the exact same wiring shape and are gated by `result_type_id` (only one renders per result), but each still needs its own snapshot/dirty/save wrapper since each owns a distinct bound object and save call.
- **Implements:** `UCA-R-1`, `UCA-R-2`, `UCA-R-5`, `UCA-R-6`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6`, `UCA-AC-7`, `UCA-AC-8`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/{cap-dev-info,innovation-dev-info,innovation-use-info,knowledge-product-info,policy-change-info}/*.component.ts` (+ `.html`, `.spec.ts` each)
- **Depends on:** `UCA-T-1`, `UCA-T-4`, `UCA-T-5`, `UCA-T-6` (the routing attachment now lands with `UCA-T-6`, not `UCA-T-4` — see `UCA-T-4`'s execution.md entry; do not start this task in parallel with `UCA-T-6` until the guard is actually attached, or it inherits the same broken-navigation window)
- **Blocks:** `—`
- **Estimate:** `L` (five components; if the first one or two reveal identical wiring with no surprises, the remaining three should be mechanical — re-evaluate and split into a follow-up task rather than silently ballooning this one past the `Full`-depth threshold if a surprise does show up, per `design.md`'s Budget note)
- **Definition of done:** Same checklist shape as `UCA-T-6` (see its attempt-1 FAIL note on async test observables), applied per component (5×), plus one note on which of the five (if any) needed a non-generic dirty-diff exception (e.g. innovation-dev-info's nested `estimates`/`assumptions-examination` sub-components). **⚠️ CORRECTED (cross-cutting routing bug, see execution.md): do NOT attach `canDeactivate: [UnsavedChangesGuard]` to `resultDetailRouting`/`rdResultTypesPages`'s outer entries — those have `loadChildren` and no `component`, so Angular invokes the guard with `component: null`, which `TypeError`s on every navigation (this broke `UCA-T-6`..`UCA-T-10` before being caught and fixed centrally). Instead, attach it to each section's own INNER `{path: '', component: X}` route inside its `<section>-routing.module.ts` file** — see `rd-general-information-routing.module.ts` (or any of the 7 already-fixed sections) as the reference pattern. Also add a check in your test suite for this task confirming no `resultDetailRouting`/`rdResultTypesPages` outer entry with `loadChildren` and no `component` carries `canDeactivate` (mirrors the regression guard added to `rd-general-information-routing.canDeactivate.spec.ts`).

### `UCA-T-12` — Manual browser QA + folder doc updates

- **Type:** `docs`
- **Description:** Manually verify, per `src/CLAUDE.md` §9 (inject `token` **and** `user` in localStorage; confirm the served bundle is not stale): (1) `UCA-AC-1`/`UCA-AC-2` — edit a field in any section, click Next, confirm it saves and navigates (and, separately, force a save failure e.g. via a required-field gap and confirm it stays put with the error shown); (2) `UCA-AC-3`/`UCA-AC-4`/`UCA-AC-5` — edit a field, click a different sidebar section, confirm the dialog appears, and test both Save and Discard end up on the clicked section; (3) `UCA-AC-6` — confirm a clean section navigates instantly with no dialog via any path; (4) `UCA-AC-7`/`UCA-AC-8` — the `beforeunload` native prompt, dirty vs. clean (the one case no automated test can prove — see `UCA-T-4`'s DoD note); (5) keyboard-only pass on the dialog (Tab/Shift+Tab stay trapped inside it, Escape resolves as Discard) since `hlm-dialog`'s real focus trap can't be verified by jsdom (`design.md` §10). Update `result-detail/CLAUDE.md` with a short entry describing the new guard/dialog mechanism (where it lives, which sections it covers) per the folder-doc convention (`docs/COMPONENT-DOCS.md`); update `rd-contributors-and-partners/CLAUDE.md` if not already done in `UCA-T-9`.
- **Implements:** `UCA-AC-1`..`UCA-AC-8`, closes the residual gaps `UCA-T-3`/`UCA-T-4` flagged as unprovable by automation alone
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md`
- **Depends on:** `UCA-T-1`..`UCA-T-11`
- **Blocks:** `—`
- **Estimate:** `M`
- **Definition of done:**
  - [ ] All five manual scenarios above observed and noted (screenshots or a short written confirmation per scenario) in the PR description.
  - [ ] The Back/Next save-failure case specifically confirmed (not just the happy path) — this is the scenario most likely to silently regress if a future change touches `saveSection()`'s error branch.
  - [ ] Keyboard-only dialog pass confirmed (or a specific gap noted, not silently skipped).
  - [ ] `result-detail/CLAUDE.md` updated with the new mechanism, `Verified:` line re-stamped.

---

## 4. Dependency graph

```
UCA-T-1 (shared contract, tracker, intent flag)
   ├── UCA-T-2 (guard) ── needs UCA-T-3 for real dialog wiring
   ├── UCA-T-4 (beforeunload directive + routing guard attachment)
   ├── UCA-T-5 (section-bottom-bar silent intent)
   └── (all per-section tasks depend on T-1, T-4, T-5)
         ├── UCA-T-6  (rd-general-information)
         ├── UCA-T-7  (rd-geographic-location)
         ├── UCA-T-8  (rd-evidences)
         ├── UCA-T-9  (rd-partners / rd-contributors-and-partners)
         ├── UCA-T-10 (rd-theory-of-change / rd-links-to-results)
         └── UCA-T-11 (rd-result-types-pages × 5)
               └── UCA-T-12 (manual QA + docs, needs everything else done)

UCA-T-3 (dialog) — parallel-safe with UCA-T-1
```

`UCA-T-6`..`UCA-T-11` are mutually parallel-safe once `UCA-T-1`, `UCA-T-4`, and `UCA-T-5` land (each touches a disjoint section folder). `UCA-T-3` is parallel-safe with `UCA-T-1`.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `UCA-TEST-1` | unit (client) | `UCA-DD-1` | `section-dirty-tracker.service.spec.ts` |
| `UCA-TEST-2` | unit (client) | `UCA-DD-2` | `unsaved-navigation-intent.service.spec.ts` |
| `UCA-TEST-3` | unit (client) | `UCA-R-1`, `UCA-R-2`, `UCA-R-4`, `UCA-R-5`, `UCA-AC-1`, `UCA-AC-3`..`UCA-AC-6` | `unsaved-changes.guard.spec.ts` |
| `UCA-TEST-4` | unit (client) | `UCA-R-3` | `unsaved-changes-dialog.component.spec.ts` |
| `UCA-TEST-5` | unit (client) | `UCA-R-6` | `before-unload-warning.directive.spec.ts` |
| `UCA-TEST-6` | unit (client) | `UCA-R-1` (intent wiring) | `section-bottom-bar.component.spec.ts` (extended) |
| `UCA-TEST-7..16` | unit (client, ×10 section groups) | `UCA-R-1`, `UCA-R-2`, `UCA-R-5`, `UCA-AC-1`, `UCA-AC-2`, `UCA-AC-6` | each touched `rd-*` section's own `*.component.spec.ts` |
| `UCA-MANUAL-1` | manual (browser) | `UCA-AC-1`..`UCA-AC-8`, keyboard trap | Result Detail, real dev server (`UCA-T-12`) |

Client coverage MUST stay ≥ 50/60/60/60 for every file outside `rd-contributors-and-partners/` (which stays excluded per its existing `collectCoverageFrom` exception — tests still required there, just not counted).

**Coverage closure check (per requirement/AC, scenario-level):**

| Requirement / AC | Scenario / clause | Owning task(s) |
|---|---|---|
| `UCA-R-1` main case | Next/Back saves then navigates | `UCA-T-5`, `UCA-T-6`..`UCA-T-11`, `UCA-TEST-6`, `UCA-TEST-7..16` |
| `UCA-R-1` BUT (no dialog on this path) | `UCA-T-2` (`UCA-TEST-3`) | |
| `UCA-R-1` failure scenario | `UCA-T-2`, `UCA-T-6`..`UCA-T-11` (`saveSection()` resolves `false`) | |
| `UCA-R-2` main case | sidebar click on dirty section opens dialog | `UCA-T-2` (`UCA-TEST-3`) |
| `UCA-R-2` browser-back case | `UCA-T-2` (guard applies uniformly to any `Router` navigation, including popstate) — `UCA-T-12` manual confirms in a real browser | |
| `UCA-R-3` exactly-two-actions + BUT (no third action) | `UCA-T-3` (`UCA-TEST-4`) | |
| `UCA-R-4` Save-then-resume / Discard-then-resume | `UCA-T-2` (`UCA-TEST-3`) | |
| `UCA-R-5` clean-section instant nav, AND IT MUST NOT save/dialog | `UCA-T-2`, and every per-section task | |
| `UCA-R-6` main case + BUT (no prompt when clean) | `UCA-T-4` (`UCA-TEST-5`), `UCA-T-12` manual | |
| `UCA-R-10` (SHOULD) | primitives built generically, no Result-Detail-specific code inside them | `UCA-T-1`, `UCA-T-2`, `UCA-T-3`, `UCA-T-4` — satisfied by construction, no dedicated test |
| `UCA-AC-1`..`UCA-AC-8` | see rows above | `UCA-TEST-3`, `UCA-TEST-6..16`, `UCA-MANUAL-1` |

No orphaned scenario: every `BUT`/`AND IT MUST` clause in `requirements.md` has a named owning task above, not just a requirement ID appearing in a task's `Implements` list.

---

## 6. Rollout & verification

- [ ] PR(s) opened with the commit convention: `✨ feat(result-detail) [P2-3638]: warn on unsaved changes before leaving a section`. Given the LOC estimate (~450–700) and 10+ independently-touchable section folders, **recommend splitting into at least 2 PRs**: PR 1 = shared primitives + guard + dialog + `beforeunload` directive + `section-bottom-bar` wiring + routing attachment (`UCA-T-1`..`UCA-T-5`) with NO section wired to the interface yet (guard attached but every component still needs the interface — verify the guard's `CanDeactivate` check tolerates a component that doesn't yet implement it, or gate the routing attachment to land in the SAME PR as the first section it protects to avoid a broken intermediate state); PR 2+ = the per-section wiring (`UCA-T-6`..`UCA-T-11`), which can itself be split further by section group since they're mutually independent.
- [ ] CI green (lint, `npm run test -- --testPathPattern="unsaved-changes|section-bottom-bar|rd-general-information|rd-geographic-location|rd-evidences|rd-partners|rd-contributors-and-partners|rd-theory-of-change|rd-links-to-results|cap-dev-info|innovation-dev-info|innovation-use-info|knowledge-product-info|policy-change-info"`, build, SonarCloud). No `migration:check` applies.
- [ ] Manual QA on staging/test per `UCA-T-12`.
- [ ] No bilateral/platform-report change — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: no new logging added by this spec (`design.md` §9) — confirm no error-rate spike on the reused save endpoints post-deploy (Back/Next now calls them more often than before).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] File a follow-up for `UCA-R-10`'s actual adoption by IPSR and the bilateral result creator — explicitly deferred, not attempted here.
- [ ] File a follow-up if `UCA-T-8`/`UCA-T-10`/`UCA-T-11` surface a section needing a non-generic (per-field) dirty diff — note which section and why, so a future maintainer doesn't assume the whole-object diff is universal.
- [ ] No `docs/prd.md` Open Question was resolved by this spec — no PRD update needed.

---

## 8. Roll-back plan

1. Revert the PR(s) in reverse order (per-section PRs first, then the shared-primitives PR) — each section's revert is independent since `UCA-T-6`..`UCA-T-11` touch disjoint files.
2. No migration to revert — N/A.
3. No feature flag was introduced — nothing to disable; reverting the guard's attachment to `resultDetailRouting` (or reverting the whole PR) is the full rollback for a given section.
4. No bilateral/platform-report payload touched — nothing to verify reverted there.
5. No downstream consumer to notify.

---

## Required cross-references

- `docs/specs/changes/unsaved-changes-alert/requirements.md` and `design.md` (same folder).
- `docs/prd.md` (data-loss / submission-integrity context); `docs/ux-ui/design.md` (dialog pattern, hard UI rules); `docs/trd/trd.md` W1 (context only, unchanged).
- `onecgiar-pr-client/CLAUDE.md` §21.7 (`app-pr-dialog` focus-trap gap — reason for using `hlm-dialog`).
