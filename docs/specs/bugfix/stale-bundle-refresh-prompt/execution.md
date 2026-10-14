# Execution Log — `bugfix/stale-bundle-refresh-prompt`

## 1. Document Control

- **Spec:** `docs/specs/bugfix/stale-bundle-refresh-prompt/` (`requirements.md` + `design.md` + `tasks.md`)
- **Approval Mode:** interactive (per `requirements.md` §1 Document Control)
- **Branch:** `qa-development-2026-mc-2` (not `master`/`staging` — a feature/work branch; no shared-file write discipline concerns, this spec's own deliverables only)
- **Leader model:** Sonnet 5 (T1 role, this session)
- **First execution run:** 2026-10-14

---

## 2. Task Execution History

### `SBR-T-1` — Detect stale lazy-chunk import failures and prompt refresh

**Status:** `PASS` (attempt 2, after pivot)
**Date:** 2026-10-14

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/app.component.ts` (edit — `NavigationError` subscription, `isStaleBundleError`, `extractErrorMessage`, `showStaleBundleBanner`)
  - `onecgiar-pr-client/src/app/app.component.spec.ts` (edit — new `describe('Stale-bundle refresh prompt (SBR-T-1)')` block, 4 tests)
  - `onecgiar-pr-client/src/app/internationalization/stale-bundle-refresh.copy.ts` (new)
- **Implementer verification (as reported, independently re-run by the Leader with matching results):**
  - `npx jest src/app/app.component.spec.ts` — red-before (`expect(toast).toBeDefined()` → `Received: undefined`, a genuine behavioral failure, not setup/compile) → green-after (9/9 passed: 5 pre-existing + 4 new). **Leader re-run:** 9/9 passed — VERIFIED.
  - `npx ng lint --quiet` — "All files pass linting." **Leader re-run:** matches — VERIFIED.
  - `npm run build` — succeeded, only pre-existing unrelated warnings (bundle-budget, Sass `@import` deprecation, CJS modules). **Leader re-run:** exit 0, same warnings — VERIFIED.
  - `npm run test:coverage` (full suite) — 646 suites / 13409 tests passed; 83.05%/75.64%/80.34%/83.92% (statements/branches/functions/lines), well above 50/60/60/60 gate.
- **Implementer judgment call:** discovered `router.navigateByUrl(...)`'s own returned promise also rejects on a failed lazy-load (separate from the `Router.events` `NavigationError`); added a `navigateExpectingRejection` test helper to swallow that expected rejection without masking the behavior under test. Reviewer confirmed this reasoning is sound (see verdict) — the green main-case test independently proves the Router does emit `NavigationError` for a rejected `loadChildren` in this Angular/Router config, so the task's Disqualifier condition does not apply.
- **Reviewer verdict: `STATUS: FAIL`** (full report):

  > SUMMARY: The detection, de-dup, i18n and logging all match the spec, and the Implementer's try/catch reasoning holds up. But the toast can never appear on screen. It is added under a key that no `<app-pr-toast>` host on the page displays, so the click still looks dead to the user, which is exactly the bug this spec exists to fix. The tests only check the service's toast list, so they pass on a toast nobody can see.
  >
  > **ISSUE 1 — Discovered Issue:** The toast is never shown. `PrToastComponent` only displays toasts whose key matches its own: `visible = computed(() => this.svc.toasts().filter(t => (t.key ?? '') === (this.key ?? '')))` (`pr-toast.component.ts:25`). The only host in the app shell is `<app-pr-toast key="globalUserNotification" />` (`app.component.html:91`). No host exists with `key="stale-bundle-refresh"`. The toast sits in the `toasts()` signal, de-dup then suppresses every later failure in the session too.
  > **Violated Rule:** `requirements.md` §6 `SBR-R-1` ("MUST NOT leave the triggering click with no visible effect") and `SBR-R-2` ("MUST show a visible, sticky banner/toast"); Main-case scenario's "it must NOT leave the click silently doing nothing." Design's own `SBR-P-3` (Premise Ledger) verified the service capability but missed the host-key filter.
  > **Remediation Suggestion:** requires a spec amendment before re-implementation — either (a) add `<app-pr-toast key="stale-bundle-refresh" />` to `app.component.html` (a 4th file beyond `tasks.md`'s "Files (expected)" list) and add a DOM-level assertion (`fixture.detectChanges()` + check rendered `.pr-toast__detail`/`.pr-toast__action`), or (b) reuse the existing `key: 'globalUserNotification'` host and de-dup by key + `detail` match instead of a dedicated key (changes `SBR-R-10`'s "(keyed)" wording and the test's key assertions).
  >
  > **ISSUE 2 — Discovered Issue:** Definition-of-done's manual smoke check (the one check that would have caught Issue 1) has no evidence it was run — correctly skipped per the Implementer's brief (Leader-added `[advisory-grade]` instruction, pre-fix unresolvable anyway since nothing renders).
  > **Violated Rule:** `tasks.md` §3 `SBR-T-1` Definition of done, last item.
  > **Remediation Suggestion:** run it after Issue 1 is fixed, on a local build.
  >
  > **Verified as conforming:** `SBR-DD-1`/`-2`/`-3` followed; `inject()` pattern per `src/CLAUDE.md` §21.1; copy file matches `bilateral-decision-notice.copy.ts` pattern (`as const`, not `TermKey`); no routing module touched (`trd.md:412` holds); logger call clean under `.cursorrules`/NFR §7; falsifier error string, route, and negative-control error match `tasks.md` exactly; judgment call on the Disqualifier is sound. DoD: lint/build/red-green/coverage/logging/copy-file/negative-case/dedup-case all met; "merged via commit convention" still pending (expected, task not closed); manual smoke check not met (Issue 2, downstream of Issue 1).
  >
  > **Scope not closed:** `package-lock.json` is modified in git status but not in the diff given to the Reviewer — **Leader note: confirmed pre-existing** (already modified per git status captured at the start of this session, before any Implementer spawn — unrelated to `SBR-T-1`, stays out of this task's commit).
  >
  > **ADVISORY (never gates):**
  > - RELIABILITY: the de-dup test doesn't independently confirm a second `NavigationError` actually fired before asserting "exactly 1 toast" — a spy count would strengthen it.
  > - RELIABILITY: `Object.defineProperty(window, 'location', ...)` override in the reload test is never restored — could leak into later tests in the file; add `afterEach` restore.
  > - READABILITY: `design.md` §6.3 mentions a "title" in the copy file; none is exported, `summary` is never set — consistent with `SBR-R-2`'s single string, record as a deliberate deviation.

- **runtime events:** none.
- **checkpoints:** none fired.
- **spawns:** `akili-implementer` 45 calls, 167509 tokens, ended complete; `akili-reviewer` 13 calls, 94352 tokens, ended complete.
- **Requirements covered (attempted, not yet conforming):** `SBR-R-1`, `SBR-R-2`, `SBR-R-3`, `SBR-R-4`, `SBR-R-10` — detection/dedup/reload logic all correct; the visible-banner clause of `SBR-R-1`/`SBR-R-2` is **not met** pending the pivot fix.
- **Decisions made:** none yet — pivot direction pending user input (see below).
- **Issues encountered:** the toast-host key-filter gap (Issue 1 above) — a design-level gap, not an implementation defect; the Implementer followed `design.md` §6.2/`SBR-DD-2`/`SBR-DD-3` exactly as written.
- **Final verification result:** all automated checks green (tests, lint, build, coverage) — but the Reviewer's conformance audit shows the shipped behavior does not satisfy `SBR-R-1`/`SBR-R-2` in a real browser, because the toast has no host to render through.

**Per the Pivot Detection rule** (`/akili-execute` Step 2.4): this FAIL is evidence the *design* is incomplete, not merely that the implementation needs rework — it does **not** consume one of the 3 rework attempts. The rework loop is stopped here rather than retried.

---

## Pivot Record: `SBR-T-1`

**Trigger:** Reviewer `STATUS: FAIL` Issue 1 (confirmed independently by the Leader — see tool reads of `pr-toast.component.ts:25` and `app.component.html:91` in this session).

**What's wrong:** `design.md`'s Premise Ledger `SBR-P-3` verified that `PrToastService` supports a sticky, keyed toast with an action button — true of the *service*. It did not verify that `PrToastComponent` (the thing that actually renders a toast) filters by key and that the app shell only mounts one host, keyed `globalUserNotification` (`app.component.html:91`). `SBR-DD-2` ("reuse `PrToastService`, no new banner component") and `SBR-DD-3` (dedup via a fixed new key `'stale-bundle-refresh'`) both implicitly assumed a toast added under any key would render somewhere. It does not — a toast under an unhosted key is invisible, which silently reproduces the exact "dead click" bug this spec exists to fix.

**Blocker:** cannot close `SBR-T-1` as currently designed; the implementation faithfully follows a design that has this gap.

**Alternatives considered:**

| # | Direction | Change required | Trade-off |
|---|---|---|---|
| **(a)** | Add a dedicated `<app-pr-toast key="stale-bundle-refresh" />` host to `app.component.html` | New 4th file touched (`tasks.md` "Files (expected)" needs updating); test needs a DOM-level assertion (`fixture.detectChanges()` + rendered markup check) instead of only checking `prToastSE.toasts()` | Keeps a dedicated, unambiguous key for this banner (clean de-dup, no risk of colliding with unrelated `globalUserNotification` toasts); slightly larger diff; the new host needs its own CSS stacking/position check (both hosts render fixed-position — may visually overlap if both are active at once) |
| **(b)** | Reuse the existing `key: 'globalUserNotification'` host; de-dup by `key + detail` match instead of a dedicated key | No new file; `app.component.ts`'s `STALE_BUNDLE_TOAST_KEY` constant and `showStaleBundleBanner`'s de-dup check change; `SBR-R-10`'s "(keyed)" wording and the test's key assertions need updating | Zero new wiring, truly "reuse existing architecture" (closer to `SBR-DD-2`'s spirit); the stale-bundle toast now visually competes for the same host as any other global notification that happens to be showing at the same moment (acceptable per NFR, but worth naming) |

**Leader recommendation:** no strong preference — both are small, safe changes within Lite-depth budget. (a) is closer to the literal `SBR-R-10` wording ("keyed") and gives this banner a dedicated, uncontested slot. (b) is marginally smaller (no new template host) and leans harder into "reuse, don't add."

**User decision (2026-10-14):** direction **(a)** — add a dedicated `<app-pr-toast key="stale-bundle-refresh" />` host.

**Spec amendments made (2026-10-14, this session):**
- `design.md` §1A: `SBR-P-3` corrected (host-key filter made explicit), new row `SBR-P-3b` added (second-host-instance premise, confirmed); Premise Ledger count 7→8.
- `design.md` §1 Summary, §2.1, §2.2 (sequence), §6.2: all updated to name the new `<app-pr-toast key="stale-bundle-refresh" />` host in `app.component.html`.
- `design.md` `SBR-DD-2` Consequences: amended to note the host-instance requirement; still "no new component" (DD-2's core decision unchanged).
- `design.md` §10 Testing Plan: added a required DOM-level assertion (`fixture.detectChanges()` + rendered markup check), renumbered.
- `design.md` §13 Open Gaps: added a "Resolved" entry documenting the gap and its fix; noted the DOM assertion does not replace the tasks.md manual smoke check for real pixel-level visibility.
- `design.md` Budget: LOC estimate 70–90 → 75–95 (4th file, +1 template line, +1 test assertion); review rounds 1 → 2 (one round already spent finding this).
- `tasks.md` `SBR-T-1`: Description, Files (expected) (+`app.component.html`), Falsifier (DOM-assertion requirement + new mutation row), Definition of done (+1 item) all updated; task-level and document-level Status fields updated to reflect pivot resolution.
- **Two-direction sweep run** (forward: grepped `no new.*component|one task|single file|3 file|three file` across all 3 spec docs; backward: grepped `SBR-P-3\b|SBR-DD-2` across all 3 spec docs) — found and fixed two more stale mentions (`design.md` §1 Summary's "No new component" line, §2.1's "Client module touched" bullet) that the cited-site list alone would have missed. No other stale references found; `requirements.md` needed no changes (its `SBR-R-10` "(keyed)" wording already matches direction (a) as-is).
- **No committed baseline to diff against** — this entire spec folder is untracked (first run), so the Pivot Protocol's "read the git diff of each amended document" step has no prior committed version to compare; each edit was reviewed inline via the Edit tool instead.

**ADR impact:** none — no TRD architecture decision is overturned; this is a spec-local design correction, not a system-architecture reversal.

**Resolution:** pivot closed. Resuming execution with `SBR-T-1` attempt 2 against the amended spec.

---

#### Attempt 2 (post-pivot)

- **Files changed (relative to the amended `tasks.md` Files (expected) list, all 4 present):**
  - `onecgiar-pr-client/src/app/app.component.html` — new this attempt: second `<app-pr-toast key="stale-bundle-refresh" />` host added alongside the existing `globalUserNotification` host (line 91 unchanged, new host added after it).
  - `onecgiar-pr-client/src/app/app.component.spec.ts` — new this attempt: `PrToastComponent` added to TestBed imports (outer `beforeEach` + `setupWithRejectingRoute`, both needed — see Implementer's note on Angular's JIT template-scope memoization, confirmed empirically before writing the real test); new DOM-rendering test (`By.directive(PrToastComponent)` + `.key` filter, asserts rendered `.pr-toast__detail` text + `.pr-toast__action` button label); trivial advisory fix carried in (restore `window.location` in a `finally` block, per attempt-1 Reviewer advisory #2).
  - `onecgiar-pr-client/src/app/app.component.ts` — unchanged this attempt (carried from attempt 1, already correct).
  - `onecgiar-pr-client/src/app/internationalization/stale-bundle-refresh.copy.ts` — unchanged this attempt (carried from attempt 1).
- **Implementer verification (as reported, independently re-run by the Leader with matching results):**
  - `npx jest src/app/app.component.spec.ts` — red-before (host removed from `app.component.html`, subscription intact, mirroring attempt 1's exact bug state): new DOM-assertion test failed at `expect(staleHost).toBeDefined()` (`Received: undefined`), while the pre-existing `toasts()`-based assertion in the first test still passed under the same mutation — the row the amended Falsifier required, confirming the DOM check catches what the service-level check could not. Green-after: 10/10 passed. **Leader re-run (green state): 10/10 passed — VERIFIED.**
  - `npx ng lint --quiet` — "All files pass linting." **Leader re-run: matches — VERIFIED.**
  - `npm run build` — succeeded, only pre-existing unrelated warnings. **Leader re-run (background): exit 0, same warnings — VERIFIED.**
  - Full-suite coverage: NOT independently re-run by the Implementer this attempt (reasoned: change is purely additive — +1 test, +1 template line; cannot lower the global percentage). Reviewer accepted this reasoning explicitly (see verdict).
- **Reviewer verdict: `STATUS: PASS`** (full report):

  > SUMMARY: The pivot fix works and the new test proves it. A second `<app-pr-toast key="stale-bundle-refresh" />` host now sits next to the original one, and the new test checks that the message and button actually appear on that host's rendered page. The Implementer's red-before result (host removed, so the test fails at `staleHost`) shows the test catches the exact gap attempt 1 missed. Everything that passed review on attempt 1 still holds.
  >
  > Checked against source: `pr-toast.component.ts:25`'s `visible` computed confirmed to filter strictly by host-key match; `pr-toast.component.html:10-14` confirmed `.pr-toast__detail`/`.pr-toast__action` markup matches the test's assertions; `app.component.html:91` confirmed the original `globalUserNotification` host is untouched and the new host is additive; `PrToastComponent` is standalone and already imported app-wide (`app.module.ts:19,53`), so adding it to the TestBed imports is not hiding anything; attempt-1 items (`SBR-DD-1`/`-3`, `inject()` pattern, i18n `as const`, no routing module touched (`trd.md:412`), clean logger call, falsifier strings/route/negative-control exact match) all reconfirmed; `window.location` restore-in-`finally` confirmed correct (executes even on assertion failure); Definition of done items 2–9 confirmed, item 1 (commit) and item 10 (manual smoke check) correctly left open as non-reviewer-gated; coverage reasoning accepted.
  >
  > ADVISORY (never gates):
  > - RISK: both `<app-pr-toast>` hosts share identical fixed positioning (`pr-toast.component.scss:3-13`: `position: fixed; top: 70px; right: 20px; z-index: 1200`) — if both are visible simultaneously, the later one (stale-bundle) visually covers the other rather than stacking. Flagged for the manual smoke check to observe deliberately; not a spec violation as designed.
  > - RELIABILITY (test-only): `setupWithRejectingRoute` calls `ngOnInit()` manually, then the DOM test's `detectChanges()` triggers Angular's own `ngOnInit` a second time — registers a duplicate `NavigationError` subscription in that one test. No assertion is affected (navigation happens before `detectChanges`), but a future test navigating *after* `detectChanges` could hit double-logging.
  > - READABILITY: `expect(toast?.detail ?? toast?.summary)` in the main-case test could be tightened to `toast?.detail` directly since the implementation always sets `detail`.

- **runtime events:** none.
- **checkpoints:** none fired.
- **spawns:** `akili-implementer` 46 calls, 187356 tokens, ended complete; `akili-reviewer` 13 calls, 87606 tokens, ended complete.
- **Requirements covered:** `SBR-R-1`, `SBR-R-2`, `SBR-R-3`, `SBR-R-4`, `SBR-R-10` — all scenarios in `requirements.md` §6 now conformant, including the previously-unmet "visible" clause of `SBR-R-1`/`SBR-R-2`.
- **Decisions made:** none new this attempt (all pivot decisions already recorded above).
- **Issues encountered:** none blocking; 3 ADVISORY findings recorded above (none actioned — correctly non-gating per `.agents/leader.md` "Advisory Never Gates").
- **Final verification result:** all automated checks green (10/10 tests including the new DOM-render assertion, lint clean, build clean) and Reviewer `STATUS: PASS` — `SBR-T-1` is conformant.

**Attempt accounting:** per Pivot Detection, attempt 1's FAIL (the host-key gap) did not consume a rework attempt — it triggered a spec pivot instead. This attempt 2 is therefore the task's first attempt counted against the 3-attempt ceiling, and it PASSed on that first counted attempt.

---

## 3. Summary

All tasks in this spec (`SBR-T-1`, the spec's only task) are complete.

- **Task:** `SBR-T-1` — Detect stale lazy-chunk import failures and prompt refresh.
- **Outcome:** PASS (attempt 2, after a mid-loop Pivot that corrected a design gap found by the Reviewer on attempt 1).
- **Files changed:** `onecgiar-pr-client/src/app/app.component.ts`, `app.component.html`, `app.component.spec.ts`; new `onecgiar-pr-client/src/app/internationalization/stale-bundle-refresh.copy.ts`.
- **Verification:** `npx jest src/app/app.component.spec.ts` (10/10 passed, including red-before/green-after on both the detection logic and the DOM-rendering assertion), `npx ng lint --quiet` (clean), `npm run build` (clean) — all independently re-run and verified by the Leader.
- **Spec amendments:** `design.md` and `tasks.md` were amended mid-execution (Pivot, 2026-10-14) to add a second toast-render host and a DOM-level test assertion; `requirements.md` needed no changes.
- **Outstanding (non-blocking, recorded for `/akili-archive`/`/akili-validate`):**
  - Manual smoke check on TEST (tasks.md Rollout & verification) — the one check nothing in CI can substitute for; still pending human execution.
  - 3 ADVISORY findings from the attempt-2 Reviewer (toast-host visual stacking, test-only duplicate-subscription reliability note, a minor test-assertion tightening) — recorded, not actioned, never gating.
  - `onecgiar-pr-client/src/CLAUDE.md` §2.1's stale "Toast = MessageService/ToastModule" documentation-drift note (flagged in `design.md`'s Required cross-references) — not actioned here per shared-file write discipline; flagged for `/akili-audit`.
- **Commit:** pending (see below).

**ADR impact:** none — no TRD architecture decision is overturned; this is a spec-local design correction, not a system-architecture reversal.

**Deviation from protocol's literal step order (noted per Leader judgment):** `/akili-execute`'s Pivot Protocol step 3 says to draft the spec amendment before step 4 (explain to user). Because two materially different, equally valid directions exist here with different downstream edits, drafting either one unilaterally risks producing the wrong amendment to re-review. Asking the user to pick a direction first (this message) avoids that waste — consistent with the general rule "if the design is ambiguous, the Leader asks the user before spawning the Implementer."
