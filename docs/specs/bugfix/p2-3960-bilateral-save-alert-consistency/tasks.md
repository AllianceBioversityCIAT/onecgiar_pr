# Tasks — P2-3960 · Bilateral save alerts tell one consistent truth

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3960-bilateral-save-alert-consistency` · Lite · Bug Mode |
| Inputs | `requirements.md` (BSA-R-1..4) · `design.md` (DD-1..5, P-1..9, budget) |
| Baseline | `fcd441ad1`. Every red below was **observed** on 2026-11-23 with temporary probes that were then removed |
| Order | T-1 and T-2 are independent and can run in either order |

## Coverage (scenario/clause → task)

| Clause | Task |
|---|---|
| BSA-R-1 "Stale error does not block": THEN opens Contributors · BUT no "Save failed" | T-1 (test A) |
| BSA-R-1 "Real failure still blocks": THEN stays · AND IT MUST show the server reason for B | T-1 (test B, plus the adapted test at `:1953`) |
| BSA-R-2 "Stale error only": THEN "Nothing to save yet" with missing list · BUT NOT "Draft saved"/"Saved." | T-1 (test C) |
| BSA-R-2 "Real save, unchanged" | T-1 (adapted tests at `:1018` and `:1036`) |
| BSA-R-3 "Same-id replacement": still on screen at 3500 · AND IT MUST close at 5000 | T-2 (test D) |
| BSA-R-4 "Detached container", for the Fe and Fs services | T-2 (tests E, F) |

---

## T-1 · Editor: scope navigation failure and the Save draft branch to what was sent

- **Status:** [x] done (PASS attempt 2, see execution.md) · **Size:** S (about 15 lines of production code, about 60 lines of tests)
- **Depends on:** none
- **Requirements:** BSA-R-1, BSA-R-2
- **Design:** DD-1, DD-2, DD-3; reversion challenge §10; P-1, P-3..P-6, P-9
- **Scope:**
  1. **First step:** settle **P-9**. Read the field-card binding for `titleStatus`, `descriptionStatus` and `leadContactStatus` (`section-general-info.component.html`) and record whether `'error'` paints a failed state. If it does not, stop and report it. That is a `BSF-OQ-1` visibility gap, and the fix is not to quietly widen this task.
  2. `selectSection()` (`bilateral-result-creator.component.ts:871-901`):
     - capture the dispatched set before `flush` (it is already captured as `flushTargets`);
     - pass it to `waitForSectionSave(current, flushTargets)`;
     - decide failure with `hasErrorForFields(flushTargets)`;
     - take the message from `lastErrorMessageForFields(flushTargets)`.
  3. `triggerManualSave()` (`:1339`): take the "nothing to save" branch when `!hadChanges || flushTargets.length === 0`.
  4. Tests in `bilateral-result-creator.component.spec.ts`:
     - **A**: a stale error does not block navigation;
     - **B**: the wait is scoped (a real failure that arrives after a delay still blocks with its reason);
     - **C**: a stale error alone gives "Nothing to save yet".
     - Adapt the consumers listed below.
  5. Update `bilateral-result-creator/CLAUDE.md`: in the invariant *Save draft tells the truth*, `selectSection()` is now scoped as well. Re-stamp the `Verified:` line.
- **Backend route:** n/a. The change is client only.
- **Design route:** n/a. There is no visual change.
- **Tests:** A, B and C are new. The tests at `:1018`, `:1036` and `:1953` are adapted.
- **Falsifier:**
  - Test A: revert DD-1 so that `hasErrorFor(current)` is used again. Fixture: `hasPendingFor` true, `pendingStatusKeysFor` `[]`, `hasErrorFor` true, `hasErrorForFields` false. Here the scoped and the section-wide readings differ.
  - Test C: revert DD-3 to `if (!hadChanges)`. Fixture: `hasPendingFor` true once and then false, `pendingStatusKeysFor` `[]`.
  - Test B: apply DD-1 but leave the wait unscoped (mutation `waitForSectionSave(current)`). Fixture: `hasPendingFor` stays true; stale `hasErrorFor` true; `pendingStatusKeysFor` `['title']`; `hasErrorForFields` returns false until a timer at about 300 ms flips it to true; `lastErrorMessageFor(Fields)` returns `'Title cannot be empty.'`. Under the mutation the wait exits at once, the scoped check reads false, and navigation goes ahead, so the test is red.
- **Red run (observed at baseline, probe in the main describe):**
  - A: `Expected: "contributors"` / `Received: "general-info"`.
  - C: `Expected: ObjectContaining {"title": "Nothing to save yet"}` / `Received: {… "description": "Saved. Still missing: Title of Result.", … "title": "Draft saved"}`.
  - B: n/a at baseline, because baseline already blocks (on the stale error). Its red is the falsifier mutation above, which must be executed after the change and quoted in `execution.md`.
- **Disqualifier:**
  - A red caused by the 15 s `MANUAL_SAVE_TIMEOUT_MS`, a test timeout, or a mock that was never consulted is not a red.
  - Test B must use real timers with a flip under 1 s, or fake timers advanced on purpose. A pass that takes more than 15 s means the wait timed out, and it is not evidence.
- **Consumers:** `bilateral-result-creator.component.spec.ts`:
  - default mock `:189-194`;
  - `:1018` "saves the partial draft…" and `:1036` "names an over-limit field…": both rely on the default `pendingStatusKeysFor` `[]` and expect "Draft saved", so set `['title']` / `['short-title']`;
  - `:1953` "keeps the section open…": drive `pendingStatusKeysFor`, `hasErrorForFields` and `lastErrorMessageForFields`.
  - The other `selectSection` tests (`:1238-1251`, `:1938`, `:1975-1994`) were checked and are unaffected.
  - Outside this file: none (P-6).
- **Verification:**
  - `npx jest src/app/pages/bilateral/pages/bilateral-result-creator --silent --reporters=summary --no-coverage`. The whole spec file must pass, so any consumer not listed above shows up here.
  - `npx ng lint --quiet`.
  - `npm run build` (compile gate). Falsifier for the build: pass a `string` where `readonly string[]` is expected in `waitForSectionSave`; the build goes red while the tests stay green.
- **Review:** `full`. This is a logic change on the navigation guard, with a reversion (DD-1).
- **Done:**
  - A and C are green after the fix and were red before it.
  - The B falsifier mutation was executed and its red is quoted.
  - The three consumer tests are adapted and the whole spec is green.
  - Lint and build are clean.
  - P-9 is settled in `execution.md`.
  - `CLAUDE.md` is updated.
- **Skills:** `angular-developer`, `tdd`, `systematic-debugging`

## T-2 · Alert services: replacement cancels stale timers; removal is null-safe

- **Status:** todo · **Size:** XS (about 12 lines of production code, about 45 lines of tests)
- **Depends on:** none
- **Requirements:** BSA-R-3, BSA-R-4
- **Design:** DD-4, DD-5; P-7, P-8
- **Scope:**
  1. `customized-alerts-fe.service.ts`:
     - add a private map from id to timer handle;
     - `show()` clears all pending timers before the existing removal of containers (`:29`);
     - register this alert's timer (still `3000` ms when `closeIn` is truthy), and let the callback delete its own entry;
     - make the `animationend` handler return when `parentNode` is null.
  2. `customized-alerts-fs.service.ts:35-40`: add the same null-parent early return.
  3. Tests:
     - **D** (Fe spec): a same-id replacement keeps the new alert;
     - **E** (Fe spec): removing a detached node does not throw;
     - **F** (Fs spec): the same for the Fs service.
  4. Use a real jsdom DOM (`document.body.innerHTML = '<app-root></app-root>'`), not the mocked `getElementById` of the existing `show` describe, so the timer and the removal work on real nodes.
- **Backend route:** n/a. **Design route:** n/a. There is no visual change.
- **Tests:** D, E and F are new. The existing Fe and Fs specs must stay green, including `:100-125` (3000 ms close) and `:177-220` (removal).
- **Falsifier:**
  - D: remove the timer clearing in `show()`. Fixture: show `X` at t=0, show `X` again at t=2000, read at t=3500. The stale timer fires at t=3000.
  - E and F: remove the null-parent return. Fixture: container marked for deletion (`delete` class, or `showed=false` for Fs), detached, then `animationend` dispatched. A `window` `error` listener collects the errors, because jsdom reports listener exceptions instead of throwing them.
- **Red run (observed at baseline, temporary probe spec):**
  - D: `Expected: false` / `Received: true`.
  - E: `Received: [TypeError: Cannot read properties of null (reading 'removeChild')]`.
  - F: `Received: [TypeError: Cannot read properties of null (reading 'removeChild')]`.
- **Disqualifier:**
  - E or F with no `window` `error` listener is not evidence: jsdom swallows the exception, so the test would be green on the buggy code.
  - D without fake timers is not evidence.
  - A red from `insertAdjacentHTML` on a missing host (a bad fixture) is not a red. This was seen while probing.
- **Consumers:**
  - `customized-alerts-fe.service.spec.ts` (`:100-132` timer, `:177-220` removal, `:249+` `closeAction`) and `customized-alerts-fs.service.spec.ts`, which must stay green.
  - About 70 production callers of `alertsFe.show` (P-7), whose timing is unchanged by design.
  - The proposal does not require real-browser repro of the modal flow here. That is checked at validate (requirements §7).
- **Verification:**
  - `npx jest src/app/shared/services/customized-alerts --silent --reporters=summary --no-coverage`.
  - `npx ng lint --quiet`.
  - `npm run build`.
- **Review:** `checklist`. The change is a small, mechanical guard plus a timer registry on a shared service, and it has explicit tests.
- **Done:**
  - D, E and F are red before and green after the change, each with its falsifier executed after the change.
  - The existing Fe and Fs suites are green.
  - Lint and build are clean.
- **Skills:** `angular-developer`, `tdd`, `error-handling-patterns`

---

## Final check (validate, HITL)

Run the proposal §13 repro on prtest (the v15 preview build), steps 1-5:
- no "Save failed" when the move itself did not fail;
- no "Draft saved" when nothing was sent;
- no alert closing before its own 3 s;
- no `removeChild` error in the console.

This is the substitute for the defect class that has no automated check.
