# Module Spec — Real-Time Section Completion — Tasks

Linked spec: `docs/specs/changes/realtime-section-completion/requirements.md` + `design.md`.

- **Sprint / target phase:** none set
- **Owner / driver:** Frontend (onecgiar-pr-client)
- **Status:** done — shipped as a much smaller client-only fix than originally planned (see `## 0. Final outcome` below and `execution.md`'s Second Pivot). Tasks `RSC-T-1`/`RSC-T-2`/`RSC-T-4` below are **superseded, not completed as written** — kept for the audit trail, not as a to-do list.

---

## 0. Final outcome (read this first)

The user clarified mid-execution that the actual ask was never autosave — only that the bottom-bar's "Section complete" / "N fields missing" pill update **live, in the browser**, as mandatory fields are filled, without waiting for a save round-trip. Everything below `RSC-T-1`/`RSC-T-2`/`RSC-T-4` describes the abandoned debounced-autosave design; only `RSC-T-3` (the side-effect audit) and its finding survive as directly useful, and the actual shipped fix is much smaller. See `execution.md`'s **Second Pivot** section for the full narrative.

**What shipped:** `SectionBottomBarComponent.isComplete` (`section-bottom-bar.component.ts`) now reads `missingFields().length === 0` — the existing client-side DOM scan already driven live by `result-detail.component.ts`'s throttled `ngDoCheck` → `DataControlService.someMandatoryFieldIncompleteResultDetail` — unconditionally, instead of branching to the server-computed green check (`sectionsSE.currentSectionIsDone()`) for result-detail routes. This is a two-line change plus doc comments, no autosave, no new endpoint, no new input, no per-section template change.

- **Files changed:** `section-bottom-bar.component.ts` (the `isComplete` computed), `section-bottom-bar.component.spec.ts` (3 tests rewritten to assert the new behavior instead of the old P2-3542 one).
- **Verification:** `npx ng lint --quiet` clean, `npm run build` clean, `section-bottom-bar.component.spec.ts` 21/21 green, manual QA by the user in a real browser (confirmed working, screenshot: pill flips to "Section complete" live after filling the last mandatory field, no save needed).
- **Known, accepted trade-off:** this reinstates the pre-P2-3542 behavior for this one pill. P2-3542 moved away from a pure DOM scan because it disagreed with the green check in two cases — hidden ToC tabs (only the active tab is in the DOM) and business rules with no rendered `.mandatory` marker (Contributing CGIAR Centers). Both are checked and accepted: ToC (`rd-theory-of-change`) is P22-only and out of scope for this fix's actual usage pattern; Contributing CGIAR Centers already has a P2-3249 hidden `appFeedbackValidation` marker bound to the real completeness getter, confirmed correct by `rd-contributors-and-partners`'s own `*.zoneless.spec.ts`. The sidebar rail and Submit gating still read the server-authoritative green check, untouched.
- **Not committed to git** — left as a working-tree diff pending the user's explicit commit approval (standing project instruction), independent of this archive.

The rest of this file (§1–§8) is the **original plan**, preserved verbatim as the historical record of the investigation that led here — the P22/P25 exclusion findings and the section-side-effect audit (`RSC-T-3`) remain factually true and are the most reusable part of this spec if a real background-save feature is proposed later.

---

## 1. Scope of this task list

Single component (`SectionBottomBarComponent`), no server change, no migration. 4 tasks, budgeted ~120–180 LOC / 1–2 review rounds (`design.md` §13).

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved (status: approved by user, Continue at Phase 1).
- [x] `design.md` is approved (status: approved by user, Continue at Phase 2).
- [x] Open questions resolved: `RSC-OQ-1` → `RSC-DD-4` (flush-on-navigate); `RSC-OQ-2` → `RSC-DD-3` (uniform rollout, no opt-out); `RSC-OQ-3` → `RSC-DD-1` (reuse existing spinner, no new visual state).
- [ ] No conflicting in-flight spec touching `section-bottom-bar` or `result-sections.service.ts` (search `docs/specs/` before starting — none found as of this spec's creation).
- [x] No migration involved — N/A.

---

## 3. Task list

### `RSC-T-1` — Autosave trigger, coalescing, and flush-on-navigate in `SectionBottomBarComponent`

- **Status:** `[~]` REOPENED (HALT resolved 2026-09-08) — attempts 1-3's bugs (teleport-ordering, stale `hasCurrentSection()` gate) are fixed and Reviewer-confirmed correct. Attempt 3's blocker (`rd-theory-of-change` P22 side effect, unexcluded) is resolved by user decision: **rescope to P25 only** (`RSC-DD-5`) rather than a second per-section exclusion. Next attempt (counts as a fresh attempt-1 under the corrected scope, not a continuation of the exhausted 3-attempt loop, since the task itself changed) must add a `FieldsManagerService.isP25()` fire-time guard. See `execution.md` § Task Execution History, second Pivot Record.
- **Type:** `client`
- **Description:** Add the debounced autosave mechanism described in `design.md` §6.2 to `section-bottom-bar.component.ts`: a `dirty` field, a `pendingWhileSaving` field, an RxJS `Subject<void>` fed by a native `input`/`change` listener attached (in `ngAfterViewInit`, only when `sectionsSE.hasCurrentSection()`) to `this.hostRef.nativeElement.closest('.section_container')`, filtered to `event.target.closest('.mandatory')`, piped through `debounceTime(1500)`, unsubscribed in `ngOnDestroy`. On debounce fire, call the existing `onClickSave()` if `dirty && canSave && !saveButtonSE.isSaving()`; if `isSaving()` is `true`, set `pendingWhileSaving = true` instead. Add an `effect()` that watches `saveButtonSE.isSaving()` for a `true → false` transition and, if `pendingWhileSaving`, clears the flag and re-invokes the same path once (scheduled outside the effect's own write cycle). In `ngOnDestroy`, if `dirty && canSave`, call `onClickSave()` once, best-effort, before the existing `slotSE.syncSlot.set(null)` / `hostRef.nativeElement.remove()` cleanup.
  - **Attempt 2 addendum (post-Pivot, RSC-DD-3 resolution):** (1) fix the attempt-1 Reviewer FAIL — the `.section_container` lookup must happen before the pre-existing `teleport` effect can move the host out of it (resolve/cache the container in the constructor or `ngOnInit`, not `ngAfterViewInit`, or use a document-scoped query per `DataControlService.someMandatoryFieldIncompleteResultDetail`'s existing precedent). (2) Add `@Input() autosaveDisabled = false` to `SectionBottomBarComponent` (mirrors the existing `editable`/`disabled` input pattern); `ngAfterViewInit`'s listener-attach block must skip entirely when `autosaveDisabled` is `true`. (3) Set `[autosaveDisabled]="true"` on `rd-contributors-and-partners.component.html`'s `<app-section-bottom-bar>` usage (the only per-section template change this spec introduces) — explicit Save draft is unaffected there, only the silent background trigger is suppressed.
  - **Attempt 3 addendum (fixed the attempt-2 stale-gate FAIL, Reviewer-confirmed correct):** moved `hasCurrentSection()` out of `ngOnInit`'s attach-time gate into `fireAutosave()` as a fire-time guard (first line, pure no-op on `false`) — `ngOnInit` now only checks `!autosaveDisabled` before caching the container.
  - **Second Pivot addendum (RSC-DD-5, P25 rescope — required for the next attempt):** add `FieldsManagerService.isP25()` as a second fire-time guard in `fireAutosave()`, alongside `hasCurrentSection()` (same reasoning: fire-time, not attach-time, so nothing needs to distinguish "not loaded yet" from "wrong portfolio" — both just return early with no side effect). Inject `FieldsManagerService` the same way `sectionsSE`/`saveButtonSE` are already injected. **No other file changes** — `rd-theory-of-change`/`rd-partners` (P22-exclusive) need no template change since they simply never render for a P25 result; the portfolio-agnostic sections (`rd-general-information`, `rd-geographic-location`, `rd-evidences`, `rd-result-types-pages/*`) also need no per-file change, the gate lives once in `SectionBottomBarComponent`. `rd-contributors-and-partners`'s existing `autosaveDisabled="true"` stays as-is (still needed independently of the portfolio gate).
- **Implements:** `RSC-R-1`, `RSC-R-2`, `RSC-R-3`, `RSC-R-4`, `RSC-R-5`, `RSC-R-6`, `RSC-R-7`, `RSC-R-10` (satisfied by reuse per `RSC-DD-1` — no new markup needed), `RSC-R-11` (satisfied by the `ngOnDestroy` flush per `RSC-DD-4`), `RSC-AC-1`, `RSC-AC-2`, `RSC-AC-3`, `RSC-AC-5`, `RSC-AC-6`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar.component.ts`; post-Pivot addendum also touches `.../rd-contributors-and-partners/rd-contributors-and-partners.component.html` (one attribute, `[autosaveDisabled]="true"`).
- **Depends on:** `—`
- **Blocks:** `RSC-T-2`
- **Estimate:** `M`
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`✨ feat(section-bottom-bar): add debounced autosave trigger for section completion`).
  - [ ] `npx ng lint --quiet` clean on the touched file.
  - [ ] `npx tsc`/`npm run build` clean — this file participates in a template binding, so `ng lint`/`tsc --noEmit` alone is not sufficient evidence the template still compiles; a full `npm run build` (or the touched module's `ng build` if faster) MUST be run at least once for this task, since `tsc --noEmit` does not typecheck Angular templates (per `src/CLAUDE.md` §21.7 warning) — **no template change is planned here, so this check's purpose is to catch an accidental one, not to validate new markup.**
  - [ ] `RSC-R-9` (i18n): no new user-facing string is introduced by this task — confirmed by inspection, no `internationalization/` entry needed.
  - [ ] No secret/token logged (`.cursorrules`) — this task adds no logging.
  - [ ] What this task's own inspection CANNOT prove: whether the debounce actually coalesces correctly under real timer/async interleaving, and whether the flush-on-destroy actually fires before Angular tears down the component. Those are behavioral claims, not presence claims — `RSC-T-2`'s fake-timer unit tests are the check that proves them; this task's DoD is scoped to "the code exists and compiles/lints clean," not "the timing is correct."

### `RSC-T-2` — Unit tests for autosave behavior

- **Type:** `tests`
- **Description:** Extend `section-bottom-bar.component.spec.ts` (Jest, `fakeAsync`/`tick` or Jest fake timers to control the 1.5s debounce deterministically — no real `setTimeout` waits) with cases proving the behavioral claims `RSC-T-1` cannot prove by inspection alone.
- **Implements:** `RSC-R-1`, `RSC-R-3`, `RSC-R-4`, `RSC-R-5`, `RSC-R-7`, `RSC-AC-1`, `RSC-AC-2`, `RSC-AC-3`, `RSC-AC-4`, `RSC-AC-5`, `RSC-AC-6`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar.component.spec.ts`
- **Depends on:** `RSC-T-1`
- **Blocks:** `RSC-T-4`
- **Estimate:** `M`
- **Definition of done — each case names the FALSIFYING input, not only the pass condition:**
  - [ ] **Debounce fires after settling (`RSC-AC-1`).** Dispatch an `input` event on a mock `.mandatory` element inside a mock `.section_container`, advance the fake clock by 1500ms with no further events, assert `onClickSave`/`clickSave.emit` was called exactly once. *Falsifying input: an implementation that fires on the leading edge (immediately on the first event) or fires once per event instead of once per settled pause — either would make this test fail, proving the test can actually detect a debounce that isn't debouncing.*
  - [ ] **No fire on a non-mandatory field (`RSC-R-4`).** Dispatch the same event on an element without `.mandatory` in its ancestor chain, advance 1500ms, assert zero calls. *Falsifying input: an implementation that listens to ALL `input` events regardless of the `.mandatory` filter would make this test fail.*
  - [ ] **Coalescing while saving (`RSC-AC-3`).** Set `saveButtonSE.isSaving()` to `true` (or drive it via the mocked service signal), dispatch a qualifying edit, advance past 1500ms, assert `onClickSave` was NOT called during the in-flight window; then flip `isSaving()` to `false`, assert exactly one follow-up call fires. *Falsifying input: an implementation that queues a `setInterval`-style retry loop (multiple calls) instead of exactly one coalesced follow-up would make this test fail.*
  - [ ] **No autosave for read-only users (`RSC-AC-5`).** With `rolesSE.readOnly = true` and `editable = false` (so `canSave` is `false`), dispatch a qualifying edit, advance 1500ms, assert zero calls. *Falsifying input: an implementation that fires the debounce timer without re-checking `canSave` at fire time would make this test fail.*
  - [ ] **No listener outside Result Detail (`hasCurrentSection() === false`).** Mock `sectionsSE.hasCurrentSection` to return `false`, mount the component, dispatch a qualifying edit on the same DOM shape, assert zero calls ever (proves IPSR/result-creator hosts are unaffected — this spec's explicit Out of Scope). *Falsifying input: an implementation that attaches the listener unconditionally would make this test fail.*
  - [ ] **Post-Pivot: no listener when `autosaveDisabled` is `true` (`RSC-DD-3` exception, `rd-contributors-and-partners`).** Set `autosaveDisabled = true`, publish the teleport slot so the container lookup can succeed, dispatch a qualifying edit, advance 1500ms, assert zero calls. *Falsifying input: an implementation that only checks `autosaveDisabled` at debounce-fire time (not at listener-attach time) would still create the subscription and could still be made to fire by a different code path — assert no listener/subscription exists at all, not just that this one path is silent.*
  - [ ] **Teleport-ordering regression guard (Reviewer FAIL, attempt 1).** Publish `SectionBottomBarSlotService.slot` (so the pre-existing `teleport` effect actually relocates the host out of `.section_container`) BEFORE mounting/dispatching, then dispatch a qualifying edit and advance 1500ms — assert `onClickSave` fires. *Falsifying input: a container lookup performed in `ngAfterViewInit` (after the teleport effect has already run) would resolve `null` and this test would fail — this is the exact defect the attempt-1 Reviewer caught, which the previous test suite could not detect because it never published the slot.*
  - [ ] **P25-only gate (`RSC-DD-5` rescope).** Mock `FieldsManagerService.isP25()` to return `false` (a P22 result), mount the component with `hasCurrentSection()` true and no `autosaveDisabled`, dispatch a qualifying edit, advance 1500ms — assert zero calls. Then flip the mock to `true` with everything else identical and assert the same edit now fires. *Falsifying input: an implementation that checks `isP25()` at attach time (mirroring the attempt-2 mistake with `hasCurrentSection()`) rather than at fire time would fail the second half of this test if the portfolio is only known after mount — assert both the negative and the positive case, not just the negative one.*
  - [ ] **Failure does not fabricate completion (`RSC-AC-4`).** Mock the section's save path to error, trigger autosave, assert `isComplete()` is not forced to `true` by anything this task added (the existing green-check-driven `isComplete()` is untouched — this case exists to prove autosave introduces no shortcut path around it).
  - [ ] **Flush on destroy (`RSC-R-11`).** Set `dirty = true` via a qualifying edit that has not yet hit its debounce, call `ngOnDestroy()` immediately, assert `onClickSave`/`clickSave.emit` was called once synchronously — before the debounce would otherwise have fired. *Falsifying input: an implementation that relies solely on the debounce timer (no explicit destroy-time flush) would leave the pending edit unsaved and make this test fail.*
  - [ ] **Explicit Save unaffected (`RSC-AC-6`).** Click the existing Save button with no autosave state involved, assert identical behavior to the pre-change spec (regression guard — reuse/extend the existing click-save test rather than duplicate it).
  - [ ] Coverage remains ≥ the client threshold (50/60/60/60) — no exclusion added for this file.
  - [ ] `npm run test -- --testPathPattern="section-bottom-bar.component.spec"` green (per root `CLAUDE.md`'s "run only the touched module's specs" rule).

### `RSC-T-3` — Record the `RSC-DD-3` section-side-effect audit

- **Type:** `docs`
- **Description:** `design.md`'s `RSC-DD-3` states the audit's conclusion (no `rd-*` section's save path has a notification/socket side effect) but the audit itself was performed by reading the interceptor's documented side effects, not by opening each of the 11 section save handlers individually. This task closes that gap: open each `(clickSave)` handler in the 11 sections listed in `RSC-DD-3` and confirm none calls a notification/socket/email trigger directly (i.e., confirm the interceptor's two documented side effects — green-checks refresh and, for `/api/ipsr/*` only, IPSR completeness — are exhaustive for these routes). Record the confirmed list (or any exception found) as an update to `RSC-DD-3` in `design.md`.
- **Implements:** Verifies the assumption behind `RSC-DD-3`, which `RSC-R-1`..`RSC-R-6` depend on applying uniformly.
- **Files (expected):** `docs/specs/changes/realtime-section-completion/design.md` (amend `RSC-DD-3` with the confirmed per-file list or the exception found).
- **Depends on:** `—` (can run in parallel with `RSC-T-1`/`RSC-T-2`)
- **Blocks:** `RSC-T-4`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Each of the 11 section save handlers has been read (not just its route) and its side effects listed. (Count corrected from 12 to 11 — `rd-links-to-results` doesn't render `SectionBottomBarComponent`; see amended `RSC-DD-3`.)
  - [x] **What this task cannot prove:** that a handler's *transitive* callees (a service method several layers deep) never triggers a notification — reading the handler and its immediate service call is the check; a false negative here would only surface as a real notification firing during manual QA (`RSC-T-4`), which is why `RSC-T-4` is not skippable even though this task exists.
  - [x] If an exception is found, `RSC-DD-3` is amended (not silently patched around) and `RSC-T-1`'s scope is re-evaluated before merge — this task blocks `RSC-T-4`, not just documents after the fact. **Exception found:** `rd-contributors-and-partners` triggers an email + socket notification on save (see `RSC-DD-3` amendment and `execution.md` Pivot Record). `RSC-T-1` is blocked pending a user decision — see `execution.md`.

### `RSC-T-4` — Manual QA + folder `CLAUDE.md` update

- **Type:** `docs`
- **Description:** Manually verify `RSC-AC-1` and `RSC-AC-2` in a real browser against a running dev server (per `src/CLAUDE.md` §9's "verify in a REAL browser" rules — inject both `token` and `user` in localStorage, confirm the served bundle is not stale): open a **P25** Result Detail section (`RSC-DD-5` — autosave is P25-only) with one missing mandatory field, fill it, wait ~2s without clicking Save draft, confirm the bottom-bar pill and the rail's green check flip to "Section complete"; then clear the field and confirm it flips back. Also verify no unexpected notification/toast fires during an autosave (closes the residual risk `RSC-T-3` could not fully rule out by reading alone). **Additionally verify the P25 gate itself:** open a **P22** result's section, repeat the same edit-and-pause, and confirm NO autosave fires at all (no request, no pill flip) — this is the one scenario this spec's rescope decision (`RSC-DD-5`) most needs a human eyeball on, since it's a negative assertion no lint/build catches. Then update `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/section-bottom-bar/` if it gains a `CLAUDE.md`, or the parent `result-detail/CLAUDE.md`'s relevant trap/pitfall table, per the repo's folder-doc convention (`docs/COMPONENT-DOCS.md`) — this component currently has no dedicated `CLAUDE.md`, so if the change is significant enough to warrant one, add a short entry to `result-detail/CLAUDE.md` instead of creating a new file for a single mechanism.
- **Implements:** `RSC-AC-1`, `RSC-AC-2`, and closes the residual gap in `RSC-T-3`'s DoD.
- **Files (expected):** possibly `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` (append a short note under an existing or new trap entry — no restructuring).
- **Depends on:** `RSC-T-1`, `RSC-T-2`, `RSC-T-3`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [ ] Both manual scenarios above observed and screenshotted/noted in the PR description.
  - [ ] P22 negative case observed (no autosave activity at all) and noted in the PR description.
  - [ ] No unexpected toast/notification observed during the autosave window.
  - [ ] Folder doc updated if the change is significant enough to leave a trap for the next engineer (judgment call — record the decision either way in the PR description, don't silently skip).

---

## 4. Dependency graph

```
RSC-T-1 (implementation)
   └── RSC-T-2 (unit tests — depends on the implementation existing)
         └── RSC-T-4 (manual QA — needs both code and tests green first)
RSC-T-3 (docs audit — parallel-safe with RSC-T-1/RSC-T-2)
   └── RSC-T-4
```

`RSC-T-3` is parallel-friendly with `RSC-T-1`/`RSC-T-2` (pure documentation review, no shared file). `RSC-T-4` is the only task that needs everything else done first.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RSC-TEST-1` | unit (client) | `RSC-R-1`, `RSC-AC-1` | `section-bottom-bar.component.spec.ts` — debounce-settles case |
| `RSC-TEST-2` | unit (client) | `RSC-R-4` | `section-bottom-bar.component.spec.ts` — non-mandatory-field filter case |
| `RSC-TEST-3` | unit (client) | `RSC-R-3`, `RSC-AC-3` | `section-bottom-bar.component.spec.ts` — coalescing-while-saving case |
| `RSC-TEST-4` | unit (client) | `RSC-R-7`, `RSC-AC-5` | `section-bottom-bar.component.spec.ts` — read-only guard case |
| `RSC-TEST-5` | unit (client) | (Out of scope guard) `hasCurrentSection() === false` | `section-bottom-bar.component.spec.ts` — IPSR/result-creator exclusion case |
| `RSC-TEST-6` | unit (client) | `RSC-R-5`, `RSC-AC-4` | `section-bottom-bar.component.spec.ts` — failure-does-not-fabricate-completion case |
| `RSC-TEST-7` | unit (client) | `RSC-R-11` | `section-bottom-bar.component.spec.ts` — flush-on-destroy case |
| `RSC-TEST-8` | unit (client) | `RSC-R-6`, `RSC-AC-6` | `section-bottom-bar.component.spec.ts` — explicit-save regression guard |
| `RSC-MANUAL-1` | manual (browser) | `RSC-AC-1`, `RSC-AC-2` | Result Detail, any section, real dev server |

Client coverage MUST stay above 50/60/60/60 (`section-bottom-bar.component.ts` is already covered by an existing spec file — this adds to it, no new exclusion).

**Coverage closure check (per requirement/AC, scenario-level):**

| Requirement / AC | Scenario / clause | Owning task(s) |
|---|---|---|
| `RSC-R-1` | debounce fires after pause | `RSC-T-1`, `RSC-TEST-1` |
| `RSC-R-2` | green-check refresh after success | Reused unchanged path (`GreenChecksService`) — no new test needed, covered by existing interceptor tests; `RSC-T-4` manual case observes the visible effect |
| `RSC-R-3` | at most one in-flight, follow-up not dropped | `RSC-T-1`, `RSC-TEST-3` |
| `RSC-R-4` | no fire without a mandatory-field change | `RSC-T-1`, `RSC-TEST-2` |
| `RSC-R-5` | failure doesn't fake completion, input untouched | `RSC-T-1`, `RSC-TEST-6` |
| `RSC-R-6` | explicit Save unaffected | `RSC-T-1`, `RSC-TEST-8` |
| `RSC-R-7` | read-only guard | `RSC-T-1`, `RSC-TEST-4` |
| `RSC-R-10` (SHOULD) | distinguishable saving affordance | `RSC-DD-1` (reuse) — no new test; existing `isSaving()` template binding already covered by prior specs |
| `RSC-R-11` (SHOULD) | flush on navigate | `RSC-T-1`, `RSC-TEST-7` |
| `RSC-AC-1`..`RSC-AC-6` | see rows above | `RSC-TEST-1`..`8`, `RSC-MANUAL-1` |

No orphaned scenario: every `BUT`/negative clause in `requirements.md` (no autosave while unread-only-locked, no duplicate in-flight, no fabricated completion on failure) has a named falsifying test above, not just a requirement ID appearing in a task's `Implements` list.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention: `✨ feat(section-bottom-bar) [SPEC:changes/realtime-section-completion]: debounced autosave for real-time section completion`.
- [ ] CI green (lint, `npm run test -- --testPathPattern="section-bottom-bar"`, build, SonarCloud). No migration check applies (client-only, no DB change).
- [ ] Manual QA on staging/test env per `RSC-T-4`.
- [ ] No bilateral/platform-report change — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: confirm no error-rate spike on the reused save endpoints post-deploy (autosave increases their call volume; a spike would indicate the debounce/coalescing isn't working as designed).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] File a follow-up for `RSC-R-20` (last-saved timestamp) if product wants it — explicitly deferred, not silently dropped.
- [ ] File a follow-up for a per-section autosave opt-out mechanism if `RSC-T-3`/`RSC-T-4` find an exception to `RSC-DD-3`'s "no side effects" conclusion, or if a future section introduces one later.
- [ ] No `docs/prd.md` Open Question was resolved by this spec (none referenced `US-S5`'s autosave gap explicitly as an `OQ-#`) — no PRD update needed.

---

## 8. Roll-back plan

1. Revert the PR (single PR covers `RSC-T-1`/`RSC-T-2`; `RSC-T-3`/`RSC-T-4` are doc-only and can stay or be reverted independently since they carry no runtime risk).
2. No migration to revert — N/A.
3. No feature flag was introduced (`RSC-DD-3`) — nothing to disable; reverting the component change is the full rollback.
4. No bilateral/platform-report payload is touched — nothing to verify reverted there.
5. No downstream consumer to notify.

---

## Required cross-references

- `docs/specs/changes/realtime-section-completion/requirements.md` and `design.md` (same folder).
- `docs/prd.md` `US-S5`; `docs/ux-ui/design.md` Result Detail section; `docs/trd/trd.md` W1 (context only, unchanged).
