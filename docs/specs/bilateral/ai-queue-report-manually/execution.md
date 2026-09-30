# Execution Log — "Report manually" Opens the Normal Create Drawer

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-queue-report-manually/` |
| **Approval Mode** | gated (continue/pause gate after every task) |
| **Branch** | `JuanGuzman-io/p2-3853-jira-understanding` |
| **Base commit** | `e7ca42ce6` |
| **Started** | 2026-09-30 |
| **Leader** | Claude Opus 5.5 (T1) |
| **Budget (design §10)** | 4 tasks · ~220 LOC · 1–2 review rounds per code task |
| **Pre-flight** | branch confirmed · `onecgiar-pr-client/src/environments/environment.ts` present · `.codegraph/` present |
| **Unattributed tree state at start** | `package-lock.json` (root) modified before this run — not touched, not committed by this run |

## Task Execution History

### ARM-T-1 — Flow service: `beginFromJob`, `externalEntry`, close on path change — PASS (attempt 2)

- **Skills:** `angular-developer`, `tdd` (as listed) · **Effort:** attempt 1 `high` (async race guard + router side effect; one level above the T2 default)

#### Attempt 1 — FAIL

- **Files changed:** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-manual-create-flow.service.ts`, `…/bilateral-manual-create-flow.service.spec.ts`, `onecgiar-pr-client/src/app/internationalization/bilateral-manual-create.copy.ts` (+338 / −10)
- **Implementer verification:** red run with stubs → 12 assertion-level reds. Falsifiers observed red: seg-3 check (spec:297), token (spec:367), open-before-fetch (spec:348), full-URL compare (spec:448). Flow jest 34 passed. `tsc -p tsconfig.app.json` clean. `tsc -p tsconfig.spec.json` has pre-existing errors in other files, none in the touched files. Lint passes. Consumer suites (drawer host, creator, panel) green.
- **Evidence re-run (Leader, inline):** `VERIFIED`. Scoped jest (flow + drawer host + creator): 176/176. App tsc clean. Spec tsc: no errors in the touched files. Lint passes.
- **Reviewer:** `FAIL`. Issue 1, verbatim summary: close on path change works only for drawers opened by `beginFromJob`. `openPathAtEntry` is written only in `beginFromJob` and never cleared. The `NavigationEnd` listener is wired lazily on the first `beginFromJob`. As a result:
  - (a) a drawer opened by `beginFromProject` or `openDrawerForManual` with no prior job never closes on a path change;
  - (b) after a job open, a later manual open on another path closes on any `NavigationEnd`, including a query-only one.
  - Violates `design.md` §7.1, `ARM-DD-6` and the tasks.md T-1 text ("path recorded at open").
  - Remediation: record the path on every open, clear it in `closeDrawer()`, wire the listener on every open, and add tests for non-job opens.
- **Advisory (attempt 1):**
  - (reliability) A navigation while the catalogue is in flight still opens the drawer on the new page. Bump the token, or compare the current path before `beginFromProject`.
  - (reliability) The not-found and error branches close a drawer opened some other way while the fetch was pending. Acceptable under R-4 B.
  - (readability) `Number(p.id) === projectId` coerces only one side.
  - (readability) A comment justifies production wiring by the test-mock shape.
- **runtime events:** none
- **Leader adjudication:** the FAIL is in scope. T-2 depends on T-1 for DD-6. Fixing it means wiring `router.events` for every open, and the Router mocks in `bilateral-result-creator.component.spec.ts` and `bilateral-projects-panel.component.spec.ts` lack `events`. **User decision, 2026-09-30:** attempt 2 may add `events` to those two mocks, as a fixture-only change with no assertion changes. This is a recorded deviation from T-1's Consumers wording, "keep passing unchanged".
- **Budget note:** T-1 attempt 1 alone is +338 LOC against the spec-wide ~220 estimate. To be escalated at the T-1 gate.

#### Attempt 2 — PASS

- **Effort:** `xhigh` (bumped one level for the rework). Resumed the same Implementer context. Reviewer resumed in its own context.
- **Files changed (cumulative):**
  - `bilateral-manual-create-flow.service.ts` (+137)
  - `bilateral-manual-create-flow.service.spec.ts` (+264)
  - `bilateral-manual-create.copy.ts` (+6)
  - `bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts`: fixture-only, adds `events: new Subject()` and `url` to `mockRouter`. This is the user-approved deviation.
  - Total: +406 / −13.
- **Change:**
  - `recordOpenPath()` is called by `beginFromProject` and `openDrawerForManual`.
  - `closeDrawer()` clears the recorded path.
  - The `NavigationEnd` subscription is wired unconditionally in the constructor.
  - The success branch re-checks `pathAtClick` before opening (advisory-grade item 1).
  - The comment tied to the test-mock shape is removed (advisory-grade item 2).
  - Two new tests: a `beginFromProject` open followed by a path change closes; a job open, close, manual open on another path, then a query-only change stays open.
- **Implementer verification:**
  - Falsifiers 1–4 re-confirmed red.
  - Falsifier 5 (path recorded only in `beginFromJob`) turns the new `beginFromProject` test red.
  - Flow jest: 36 passed.
  - App tsc clean. Lint passes.
  - Consumer suites (drawer host, creator, panel): 192 passed.
- **Evidence re-run (Leader, inline):** `VERIFIED`.
  - `npx jest` over the flow service, drawer host, creator and bilateral-home: 228/228.
  - `tsc -p tsconfig.app.json` exits 0.
  - `tsc -p tsconfig.spec.json` still errors in the panel spec (:64, :75, :86, `as BilateralCenterResult` casts, present at HEAD) and in the drawer-host spec (:18, an untouched file). No errors in the new code.
  - `ng lint --quiet` passes.
- **Reviewer:** `PASS`.
  - Issue 1 (a) and (b) are resolved.
  - No regression against §7.1–7.3, §8, DD-2, DD-4, DD-6 or R-4 A (deferred `Subject` kept).
  - R-3 B entries are intact.
  - The deviation stayed fixture-only.
- **ADVISORY (final verdict):**
  - (risk, **forward pointer to ARM-T-3**) `ai-processes-drawer-host.component.spec.ts:53` provides `Router` as `{ navigate: navigateSpy }` with no `events`. Once T-3 injects the flow service into that host, the service's constructor throws unless the spec mocks the flow service or adds `events` to the Router mock.
  - (reliability) The `error` branch of `resolveJobProject` lacks the `pathAtClick` re-check, so the toast can show on a page the user navigated to.
  - (readability) The comments at flow.service.ts:414-418 and :421-425 cite "Reviewer FAIL, attempt 1". Review history belongs here, not in code.
- **runtime events:** none
- **Requirements covered:**
  - `ARM-R-1` A/B (state half)
  - `ARM-R-2` A, B, C, D (routing half)
  - `ARM-R-4` A, B, C
  - `ARM-NFR-2`, `ARM-NFR-3`
  - `design.md` §7.1–7.3, DD-2, DD-4 (rule), DD-6
- **Decisions made:**
  - The user approved the fixture-only Router mock change in consumer specs (see attempt 1 adjudication).
  - `tdd` was kept as listed.
- **Issues encountered:**
  - Review rounds: 2, which is within the 1–2 budget.
  - LOC: +406 for T-1 alone, against the spec-wide ~220 estimate. Specs account for ≈276 of these lines. **Budget tripwire fired; escalated at the T-1 gate.**
- **Final verification:** `VERIFIED` + Reviewer `PASS`.

## Budget Escalation: after ARM-T-1

- **Delta:** T-1 alone is +406 LOC against the spec-wide ~220 estimate (≈276 of it spec code). Review rounds: 2, within budget.
- **Cause:** the race, token, path-change and replay cases need a deferred-emission harness and a table of router states. The design estimated ≈130 spec LOC for the whole spec.
- **User decision (2026-09-30):** "Sigue". Continue with T-2 and accept the LOC overrun.
- **Gate:** T-1 continue gate passed by the user (gated mode).

### ARM-T-2 — Mount the create drawer once in the bilateral shell — PASS (attempt 1)

- **Skills:** `angular-developer` · **Effort:** `medium`
- **runtime events:** user stop ×1, falsifier 2 mutation left applied in `bilateral-accordion.component.ts`. Rung 3 (resume by message) was not possible because the harness marked the worker cancelled. Recovered at rung 4: a fresh worker audited the partial diff and finished it. The user said "Continua".
- **Files changed:**
  - `bilateral.component.{html,spec.ts}` and `bilateral.module.ts`: shell mount and import; the shell spec asserts exactly 1 host.
  - Creator `.{ts,html,spec.ts}`: mount removed; the spec asserts 0 instances.
  - Projects panel `.{ts,html,spec.ts}`: mount removed; spec asserts 0 instances. The duplicate DI test was removed and deduplicated onto the existing host test (`bilateral-manual-create-drawer-host.component.spec.ts:132`). This is a dedup, not a move.
  - Drawer-host spec: comment only.
  - `bilateral-accordion.component.ts`: comment only.
  - Creator `CLAUDE.md`: re-stamped.
  - The panel and host folders have no `CLAUDE.md`. None was created.
- **Implementer verification:**
  - Red run: with the shell mount removed, the spec fails `Expected: 1, Received: 0`.
  - Falsifier 1: with the creator mount left in place, the grep finds 2 and the spec fails `Expected: 0, Received: 1`.
  - **Falsifier 2 did not go red.** The drawer mounts the sp-selector with `primaryLayout="list"`, and the accordion only renders in the `dropdown` branch (`bilateral-sp-selector.component.html:66` vs `:100`).
  - Jest 196/196. App `tsc` clean. No new spec-`tsc` errors. Lint passes. Grep finds 1.
- **Evidence re-run (Leader, inline):** `VERIFIED`.
  - Same Jest scope: 196/196.
  - App `tsc` exits 0.
  - Spec `tsc`: only pre-existing errors (drawer-host :18; panel :64, :75, :86).
  - Lint passes.
  - Grep finds 1 hit, at `bilateral.component.html:2`.
  - The accordion `inject` line is unchanged against HEAD.
- **Reviewer:** `PASS`.
  - No issues.
  - Falsifier-2 finding confirmed. The DD-1 conclusion "no breakage" holds more strongly than stated: no child of the drawer host injects `BilateralAutoSaveService` or `BilateralMdsTrackerService`, and the drawer never renders the accordion.
- **ADVISORY (final verdict), all resolved post-review (see below):**
  - Three comments claimed the drawer renders the accordion.
  - `bilateral-ai-upload/CLAUDE.md:69-71` still named the panel mount.
  - The panel DI test is a dedup, not a move.
- **Execute-time spec edits** (no approved requirement changes meaning; user instruction 2026-09-30: "Implementa eso tu asap"):
  - `tasks.md` ARM-T-2, Description bullet 3: the DI test now proves the list-layout child tree has no creator-scoped provider.
  - `tasks.md` ARM-T-2, Falsifier sentence 2: the mutation is now a required `inject(BilateralAutoSaveService)` in `BilateralSpSelectorComponent`.
  - `design.md` `ARM-DD-1`, reversion item 1: the real reason there is no breakage is the list layout.
  - The next Reviewer brief (ARM-T-3) carries these as named conformance checks.
- **Leader-inline post-review edits (user-authorized fallback; Leader-authored, so no independent review):**
  - Amended falsifier 2 executed: a required `inject(BilateralAutoSaveService)` in `BilateralSpSelectorComponent` turned 5 host-spec tests red with `NullInjectorError`, among them the DI test "lets a primary SP pick with secondary SPs render the inline contributing section without throwing". Restored; `git diff` shows no residue in the sp-selector.
  - The three false comments were rewritten: the accordion (`:28-37`), the drawer-host spec (`:126-131`), and the panel spec (dedup wording).
  - `bilateral-ai-upload/CLAUDE.md` mount line updated.
  - Re-verification: Jest over the shell, bilateral-home, creator, drawer host and sp-selector, 226/226. Lint passes.
- **Requirements covered:** `ARM-R-3` A and B; `ARM-DD-1` (items 1–4).
- **Final verification:** `VERIFIED` + Reviewer `PASS`, plus the Leader-inline comment and spec-text edits recorded above.

## REVIEW_WAIVED: ARM-T-2 (post-review edits only)

| Field | Content |
|---|---|
| flag | `inline` |
| cause | After the Reviewer's `PASS`, the user asked the Leader to apply the advisory fixes and the spec amendment directly for speed. The edits are comment text, one `CLAUDE.md` line and spec wording; no executable code changed. |
| approved by | user, 2026-09-30 ("Mano, estas muy demorado. Implementa eso tu asap") |
| verification that stood in | amended falsifier 2 observed red (`NullInjectorError`) then restored; scoped Jest 226/226; `ng lint --quiet` passes; run by the Leader |
| models | Implementer Sonnet (T2) / Reviewer Opus (T3) for the code diff; Leader Opus 5.5 for the post-review edits |

### ARM-T-3 — AI drawer host delegates; the creator reacts to the external entry — PASS (attempt 1)

- **Author:** the Leader, working inline. The user authorized this fallback on 2026-09-30 by picking option 1, "lo implemento yo directo", for speed. The Reviewer was kept independent.
- **Skills:** `angular-developer` (as listed).
- **Files changed (+40 / −7):**
  - `components/ai-processes-drawer/ai-processes-drawer-host.component.ts` and its spec
  - `pages/bilateral-result-creator/bilateral-result-creator.component.ts` and its spec
- **Change:**
  - `onReportManually` now sets `drawerOpen(false)` and calls `manualCreateFlow.beginFromJob({ projectId, centerId, centerAcronym })`. It no longer calls `router.navigate`.
  - The creator subscribes to `externalEntry` with `takeUntilDestroyed()`. On each event it resets autosave, resets MDS and sets `selectedReportingWay(null)`. It does not call `closeDrawer()`.
  - The host spec mocks `BilateralManualCreateFlowService`. This settles the T-1 forward pointer (the Router mock has no `events`), and the Router mock is unchanged.
  - The creator flow mock gains `externalEntry: new Subject<void>()`.
- **Verification (run by the Leader):**
  - Scoped Jest over `ai-processes-drawer` and `bilateral-result-creator`: 163/163.
  - Red run with the host implementation reverted to HEAD: `ARM-DD-3: reportManually closes the drawer and delegates…` fails; 162 pass.
  - Falsifier A (keep `router.navigate` next to the new call): the same test is red.
  - Falsifier B (drop `selectedReportingWay.set(null)` from the subscription): `ARM-DD-5: an external entry drops the wizard reporting way…` is red. The fixture starts at `'ai'`, per the Disqualifier.
  - Both falsifier edits were restored, and the final run is 163/163.
  - `tsc -p tsconfig.app.json` exits 0. `tsc -p tsconfig.spec.json` shows no errors in the touched files. `ng lint --quiet` passes.
  - The Done grep for `'manual'` in the non-spec `ai-processes-drawer` `*.ts` files returns 0.
  - The `ai-processes-drawer` and `ai-job-card` suites: 47/47.
- **Evidence re-run:** this was **not** done by a non-author. The Leader authored the change and ran the verification. The Reviewer has read-only tools and stated that it relied on the Leader's reported results, which it found consistent with the code it read. This is recorded under the `REVIEW_WAIVED` block below.
- **Reviewer:** `PASS`, no issues.
  - Conforms to `ARM-DD-3`, `ARM-DD-5`, `ARM-DD-7` and §8.
  - Covers `ARM-R-1` A and C, `ARM-R-5` A and `ARM-R-6` A.
  - Named conformance checks against the T-2 execute-time spec edits (tasks.md ARM-T-2 bullet 3 and Falsifier; `ARM-DD-1` item 1): no conflict.
- **ADVISORY:** none.
- **runtime events:** none.
- **Requirements covered:**
  - `ARM-R-1` A: the AI drawer closes and the URL is unchanged.
  - `ARM-R-1` C: parity, since the call reuses `beginFromProject` through `beginFromJob`.
  - `ARM-R-5` A.
  - `ARM-R-6` A.

## REVIEW_WAIVED: ARM-T-3 (evidence re-run only)

| Field | Content |
|---|---|
| flag | `inline` (applies to the evidence re-run; the conformance review was independent) |
| cause | The user chose the Leader-inline implementation for speed. The Leader is the author, so the non-author re-run of the verification could not be performed by the Leader, and the read-only Reviewer cannot execute commands. |
| approved by | user, 2026-09-30 (answer "1" to "lo implemento yo directo") |
| verification that stood in | Scoped Jest 163/163 and 47/47; red run plus falsifiers A and B observed red; app tsc exit 0; lint passes. All run by the Leader, who is the author. |
| models | Author: Leader, Opus 5.5 · Reviewer: akili-reviewer (T3) |

