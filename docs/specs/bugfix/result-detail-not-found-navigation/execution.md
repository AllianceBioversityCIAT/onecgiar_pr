# Execution — Result detail: leave the not-found screen, and send IPSR codes to the IPSR module

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/result-detail-not-found-navigation` |
| Ticket | P2-3969 |
| Approval Mode | gated |
| Branch | `JuanGuzman-io/investigate-p2-3969-chrome`, fast-forwarded to `origin/performance-refactor` `317b648fc` on 2026-10-14 |
| Leader | Claude Code (opus) · Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` (opus) |
| Started | 2026-10-14 |

### Pre-flight

- Branch fast-forwarded (0 ahead / 10 behind → even); none of the 10 incoming commits touch this spec's files.
- `onecgiar-pr-client/src/environments/environment.ts` and `environment.prod.ts` copied from the main checkout (gitignored).
- `onecgiar-pr-client/node_modules` symlinked to the main checkout's (identical `package-lock.json`); not committed.
- Baseline: `--testPathPattern="shared/guards|rd-general-information-routing"` → 4 suites, 26 tests passed.
- T1 and T2 dispatched in parallel (disjoint files); T3 waits for T2.

## Task Execution History

### RDN-T-1 — attempt 1 (FAIL)

- **Files changed:** `onecgiar-pr-client/src/app/shared/guards/unsaved-changes.guard.ts`, `unsaved-changes.guard.spec.ts`, new `unsaved-changes.guard.routing.spec.ts`.
- **Implementer verification:** pre-fix red 3 failed / 9 passed (`TypeError: Cannot read properties of null|undefined (reading 'hasUnsavedChanges')`); falsifier red, same 3; final 5 suites / 29 passed; lint clean; consumers 71 suites / 1266 passed.
- **Evidence re-run (Leader inline):** VERIFIED — 5 suites / 29 passed.
- **Reviewer:** FAIL. Router-level spec mounts no root `<router-outlet>` (no fixture / `RouterTestingHarness`), so no routed component is ever built and the guard receives `null` with `sectionReady` true or false. The hidden-outlet stub is inert → Disqualifier (tasks.md RDN-T-1). Guard code and unit block conform. Remediation: `RouterTestingHarness`, parent constructor spy = 1, section spy = 0 asserted before leaving, control case with `sectionReady = true`, red re-run.
- **runtime events:** none.

### RDN-T-2 — Phase chips open the module of their phase — PASS

- **Date:** 2026-10-14 · **Attempts:** 1 · **Final status:** PASS
- **Files changed:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts` (`phaseLink(phase)`; `app_module_id == 2` → `/ipsr/detail/{code}/general-information?phase={id}`, else `router.url` path + `?phase`), `.html:105` (`phaseLink(phase)`), `.spec.ts` (Reporting / no-module / IPSR unit cases + rendered chip `href` test asserting 2 anchors).
- **Red run:** Reporting unit `Expected "/?phase=34" Received "/?phase=[object Object]"`; IPSR unit `Expected "/ipsr/detail/11719/general-information?phase=9" Received "/?phase=[object Object]"`; rendered `- "/ipsr/detail/11719/general-information?phase=9" + "/?phase=9"`. The test router URL is `/`, so the literal `/result/result-detail/11719/…` predicted by the task reads `/?phase=…` here; still a wrong-`href` red, not setup.
- **Falsifier 1** (`phaseLink` ignores `app_module_id`): 2 failed / 40 passed — IPSR unit + rendered; Reporting and no-module cases green.
- **Falsifier 2** (template back to `phase.id`): `npx tsc -p tsconfig.app.json --noEmit` stayed **green** — plain `tsc` does not type-check templates. `npx ngc -p tsconfig.app.json --noEmit` went red: `result-detail.component.html:105:47 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'Pick<Phases, "id"> & Partial<Pick<Phases, "app_module_id">>'`.
- **Implementer verification:** jest `result-detail/result-detail.component` 1 suite / 42 passed; `tsc` exit 0; `ng lint --quiet` clean.
- **Evidence re-run (Leader inline):** VERIFIED — jest 42/42, `tsc` exit 0.
- **Reviewer:** PASS — RDN-R-2 both scenarios incl. BUT / AND IT MUST; RDN-DD-2 followed; Disqualifier met. Ruled the Falsifier-2 tool gap a spec-wording defect, not a conformance FAIL.
- **ADVISORY:** (1) task Verification/Falsifier should use `ngc` (or `ng build`) for template type errors; RDN-T-3 inherits the same gate; (2) magic number `2` (also `phases.service.ts:29-30`) could be a named constant; (3) the IPSR chip relies on `api.resultsSE.currentResultCode` being set by `getData()` before the failing request — if later work moves that, chips would render `/ipsr/detail/null/…`.
- **Decisions:** param type `Pick<Phases,'id'> & Partial<Pick<Phases,'app_module_id'>>` (lets `{id}` rows type-check); loose `== 2`; code from `api.resultsSE.currentResultCode`.
- **Requirements covered:** RDN-R-2.
- **runtime events:** none.
- **spawns:** implementer 18 calls, 84137 tokens, ended complete; reviewer 9 calls, 33914 tokens, ended complete.

### RDN-T-1 — attempt 2 (PASS) · task closed

- **Date:** 2026-10-14 · **Attempts:** 2 · **Final status:** PASS
- **Files changed (attempt 2):** `onecgiar-pr-client/src/app/shared/guards/unsaved-changes.guard.routing.spec.ts` only — rewritten on `RouterTestingHarness.create()` (real root outlet); parent constructor spy = 1 and section spy = 0 asserted before leaving; control case `sectionReady = true` where the section mounts and the guard receives the `SectionStubComponent` instance. Guard and unit block unchanged from attempt 1.
- **Red run / Falsifier** (null branch removed): hidden-outlet test ✕ `TypeError: Cannot read properties of null (reading 'hasUnsavedChanges')` at the guard's `if (!component.hasUnsavedChanges())`; control ✓; 1 failed / 1 passed. Parent = 1 / section = 0 assertions precede the `/other` navigation, so they held in the red run (by assertion order, not printed). Guard restored.
- **Implementer verification:** `--testPathPattern="shared/guards|rd-general-information-routing"` 5 suites / 30 passed; `ng lint --quiet` clean; consumers (6 section specs + `rd-general-information-routing.canDeactivate.spec.ts`) 53 suites / 1002 passed. The `:103` static route-table check is untouched and green.
- **Evidence re-run (Leader inline):** VERIFIED — 5 suites / 30 passed; `ng lint --quiet` clean.
- **Reviewer:** PASS — real routed tree, both Disqualifier conditions covered, the control proves the flag decides `null` vs instance. No ADVISORY.
- **Requirements covered:** RDN-R-1 (both scenarios; `UCA-R-1`, `UCA-R-2`, `UCA-DD-2` behaviour unchanged — existing 9 guard cases green).
- **Decisions:** guard param widened to `CanComponentDeactivate | null | undefined`; harness `navigateByUrl` returns the component, so "resolves `true`" is asserted as `toBeInstanceOf(OtherStubComponent)` + `Router.url === '/other'`.
- **runtime events:** none.
- **spawns:** implementer#1 9 calls, 70598 tokens, ended complete; reviewer#1 4 calls, 68508 tokens, ended fail; implementer#2 9 calls, 69743 tokens, ended complete; reviewer#2 3 calls, 67162 tokens, ended complete.

### RDN-T-3 — P-6 settled (before attempt 1)

- **2026-10-19, user decision (gate after T1/T2):** "solo se deben abrir resultados de 10, porque los 11 son complementary". P-6 refuted by product decision rather than the read-only test-env check: the IPSR type set for RDN-DD-3 is `{10}`. Type 11 takes the RDN-R-3 exclusion branch (design.md RDN-DD-3: "If P-6 is refuted, the set becomes `{10}` … This is not a pivot."). Test case (e) asserts type 11 is **not** redirected.
- Branch check: 84 commits behind `origin/performance-refactor`; none touch `result-detail.component.*` or `shared/guards` — not integrated now, deferred to the PR.
- Open from the T1/T2 gate, unanswered: replacing `tsc` with `ngc` in T3's Verification. `tasks.md` not edited; `ngc` passed to the Implementer as `[advisory-grade]`.

### RDN-T-3 — Redirect a resolved IPSR result to the IPSR module — code PASS · `[~]` pending RDN-MAN-1

- **Date:** 2026-10-19 · **Attempts:** 1 · **Final status:** Reviewer PASS; task held at `[~]` because its Definition of done requires the post-deploy human check (RDN-MAN-1), which needs the merge to `performance-refactor`.
- **Files changed:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts` (`IPSR_RESULT_TYPE_IDS = new Set([10])`; second constructor `effect` on `currentResultSignal` → `router.navigate(['/ipsr/detail', code, 'general-information'], { queryParams: { phase: currentResultPhase }, replaceUrl: true })` when type ∈ set, `String(result.result_code) === String(currentResultCode)`, and `ipsrRedirectedCode !== code`), `result-detail.component.spec.ts` (describe "IPSR result redirect (RDN-R-3)", cases a–e). Leader: folder `result-detail/CLAUDE.md` updated + re-stamped (client convention §10 "Folder docs"; also covers T2's `phaseLink` change, which had missed it).
- **Red run:** (a) and (d) `Expected number of calls: 1 / Received number of calls: 0`; (b)(c)(e) green pre-fix as predicted.
- **Falsifiers** (each applied, run, restored): no `replaceUrl` → (a) red; no code-equality → (c) red 0 vs 1; no one-shot → (d) red 1 vs 3 (signal written 3×, task predicted 2); add 7 → (b) red; add 11 → (e) red.
- **Disqualifier:** signal written after creation + `TestBed.flushEffects()`; the outer `beforeEach` fixture doubled calls, so the block destroys it first; (a) exactly 1 call.
- **Implementer verification:** jest `result-detail/result-detail.component` 47 passed; `tsc` clean; `ng lint --quiet` clean; `[advisory-grade]` `ngc -p tsconfig.app.json --noEmit` exit 0.
- **Evidence re-run (Leader inline):** VERIFIED — jest 47/47, `tsc` exit 0, lint exit 0. After merging `origin/performance-refactor` (`3a952124d`): guards + routing + result-detail 6 suites / 77 passed.
- **Reviewer:** PASS — RDN-R-3 three scenarios incl. `replaceUrl` and type-7 / type-11 exclusions; P-6 `{10}` decision applied as RDN-DD-3 allows. Leader-named check 1 (flag never reset) → ADVISORY: `PrmsRouteReuseStrategy` re-creates the component when the id changes and the redirect leaves `/result/…`, so a later visit gets a fresh `ipsrRedirectedCode = null`.
- **ADVISORY:** (1) reliability — flag set before `router.navigate` settles and the promise is unhandled; a cancelled navigation or a failed lazy IPSR chunk leaves the user on the Reporting form with no retry until reload; (2) readability — the inline comment (and design.md RDN-DD-3) says the reuse strategy keeps the component alive across results; it only does so for a `?phase=` change on the same id; (3) risk — `result_code` presence in `GET /results/get/:id` inferred from existing usage, not seen in a payload: confirm during RDN-MAN-1; (4) folder `CLAUDE.md` update → done by the Leader in the task commit.
- **Decisions:** IPSR type set `{10}` (user, 2026-10-19); string comparison of codes; phase passed as held by the service (string from `queryParamMap`).
- **Requirements covered:** RDN-R-3 (automated part). Open: RDN-MAN-1 — on test after deploy, open an IPSR code on the Reporting route with `?phase=` → ends on `/ipsr/detail/…`; browser back does not return to the Reporting URL; note any flash of the Reporting section; confirm `result_code` in the by-id payload.
- **runtime events:** none.
- **spawns:** implementer 16 calls, 79955 tokens, ended complete; reviewer 15 calls, 102032 tokens, ended complete.
