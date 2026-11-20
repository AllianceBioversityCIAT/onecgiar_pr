# Execution Log — ToC KPI dropdown readability (`changes/toc-kpi-option-readability`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-kpi-option-readability` |
| Approval Mode | gated |
| Started | 2026-11-19 |
| Base commit | `262dfcf38` (qa-development-2026-ss) |
| Leader | Claude Code (`opus`) |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Persona drift | `akili doctor --agents` 2026-11-19: `.agents/leader.md` section `primary-instructions` OUTDATED (matched 2.36.0); implementer/reviewer current. Reported to user, not fixed in this run |
| Budget | 3 tasks · ~180 LOC · 4 review rounds (`design.md` §12) |
| Parallelism | T-1 and T-2 run in parallel; test runs serialized by a scratchpad `mkdir` lock (one test run on the machine at a time) |

## 2. Task Execution History

### TKR-T-1 — `app-pr-select`: opt-in `wrapOptions` — **PASS** (2026-11-19)

- attempts: 1 · skills: angular-developer, spartan, tailwind-design-system · effort medium (Reviewer effort high)
- requirements covered: TKR-R-1 (S-1.1..S-1.4), TKR-R-3 (S-3.1), TKR-NFR-2, NFR-4; P-12 settled (`innerText` = full string, no `aria-label` needed)

#### Attempt 1 — Reviewer PASS
- files changed: `onecgiar-pr-client/src/app/custom-fields/custom-fields.scss` (+19), `pr-select/pr-select.component.ts` (+6/-?), `pr-select/pr-select.component.html` (+4/-?), `pr-select/pr-select.cy.ts` (+118, appended `wrapOptions at {1280,900}px` describe, 6 cases × 2 widths); 143 insertions, 4 deletions
- Implementer verification:
  - baseline (dirty tree, before edits): `pr-select.cy.ts` 8 passing / 1 failing / 1 pending; `pr-select.contract.cy.ts` 19 / 3; Jest `pr-select.component.spec` 10/10
  - after: `pr-select.cy.ts` 20 / 1 / 1 (12 new pass; pre-existing red = NG0100 "clears the selection reactively"); contract 19 / 3 (same 3 "model synchronisation" timeouts); Jest 10/10
  - CT ran via `npx cypress run --component --spec` (`npm run test:ct -- <filter>` matches nothing on Windows backslash paths); postcss "Can't resolve primeicons.eot" noise also in baseline
  - ngc exit 0 (pre-existing NG8112/NG8113 only); eslint flat config missing (ESLint 9, exit 2) → `ng lint --lint-file-patterns pr-select.component.ts` passes; `pr-select.cy.ts` not linted
- Red run (input + 50 px size added, SCSS not yet): only case 1 red, verbatim: `S-1.1/S-1.2: long labels wrap in 50px rows with no sideways overflow; the short label shows whole: viewport scrollWidth + expected - actual -9009 +1275` (+895 at 900 px). Cases 2-5 passed already (prediction "1-5 red" did not hold; they guard behaviour that already worked — P-6, P-12, prefix concat)
- Falsifiers (all reverted, source re-checked):
  - (a) no `white-space: normal` → case 1 red on viewport `scrollWidth` (-9009/+1275; +895 at 900). Per-label `scrollWidth` could not diverge (nowrap flex item sizes to content) → added `label.clientWidth <= .option.clientWidth`
  - (b) no `overflow-x: hidden` → first run no red (fixture `scrollWidth` cannot diverge once labels wrap) → added `.virtual_scroll` `have.css overflow-x hidden` → red at both widths `-'scroll' +'hidden'`
  - (c) item size ignores `wrapOptions` → first run no red (cdk still renders the last option) → added `.virtual_scroll scrollHeight >= 40*50-1` → red at both widths `AssertionError: expected 1200 to be at least 1999`
- Not Done / Assumptions (verbatim from the Implementer, assumptions only, no owed item, no blocker): "Case 1's "clientHeight ≤ 2×18+1" relies on my explicit `line-height: 18px` in the modifier. I set it for determinism instead of using the `pr-body-2` line-height." · "Cases 2-5 and 6 were not red-first. Case 6 is a default-behaviour check that passes by design. Cases 2-5 pass because of the input and size change I added first." · "The 3 pre-existing contract reds and the NG0100 red were not touched."
- Evidence re-run (Leader-inline, non-author): Jest `--maxWorkers=2 --testPathPattern=pr-select.component.spec` 10/10; CT `pr-select.cy.ts` 20 passing / 1 failing / 1 pending, `pr-select.contract.cy.ts` 19 / 3 → **VERIFIED** (identical to Implementer)
- Reviewer verdict: **PASS** — opt-in input, size + row style share `extraInformation() || wrapOptions()`; all new CSS under `.options_wrap` (`&` = `.custom_select .options`, `custom-fields.scss:116`), defaults at :166-193 unchanged, so S-3.1 holds. Falsifier (b) as computed-style assertion honours intent; `line-height: 18px` = `body-2` value (redundant, not a deviation); `flex: 1 1 auto; min-width: 0` needed for §8.1 long tokens; existing CT untouched; no folder CLAUDE.md to re-stamp
- ADVISORY (4R, non-gating):
  - RELIABILITY: no test asserts the "…" of the clamp; a `max-height` swap would pass. Guard: `webkitLineClamp === '2'` + `scrollHeight > clientHeight`
  - RELIABILITY: falsifier (b) could also be measured as behaviour (`offsetHeight - clientHeight === 0` on `.virtual_scroll`)
  - READABILITY: explicit `line-height: 18px` duplicates inherited `.pr-body-2`; prefer `inherit` or a comment to `fonts.scss:89-95`
  - RISK: `pr-select.cy.ts` not linted (no eslint flat config) — lint when config exists
  - RISK: `test:ct:changed` would pick ~52 custom-fields specs; optionally batch the `cypress/e2e/result-detail/*.cy.ts` label readers for wider S-3.1 coverage (never alongside Jest)
- runtime events: none
- issues encountered: test-lock overlap — the Leader's T-2 re-run found `test.lock` already removed at release (`rmdir: ... No such file or directory`), so another holder released it during that run; two test runs may have overlapped briefly. Results were unaffected (both re-runs matched)
- spawns: implementer 25 calls, 156,876 tokens, ended partial (assumptions-only Not Done field); reviewer 12 calls, 85,305 tokens, ended complete
- running totals: tasks 1/3 closed · LOC in tree for this spec ≈ 369 (T-1 147 + T-2 attempt-1 222, T-2 rework pending) vs budget ~180 · review rounds 2 (T-2 FAIL, T-1 PASS) vs budget 4 → **budget tripwire: LOC exceeded** (see below)

### TKR-T-2 — `app-clamped-text` (in progress)

#### Attempt 1 — 2026-11-19 — Reviewer FAIL
- files changed (all new): `src/app/shared/components/clamped-text/clamped-text.component.{ts,html,spec.ts}`, `clamped-text.cy.ts`, `src/app/internationalization/clamped-text.copy.ts` (222 lines)
- skills: angular-developer, spartan, tailwind-design-system, tdd · effort medium
- Implementer verification: Jest `--testPathPattern=clamped-text` 4/4; CT 4 passing; ngc exit 0 (pre-existing NG8112 in update-notification only); eslint clean with `ESLINT_USE_FLAT_CONFIG=false`
- Red run (stub): `Received has value: undefined` (label); `Expected: false Received: true` (reset); `Expected: "button" Received: undefined` (button type)
- Falsifiers: unconditional button → CT (b) red ("Expected <button...> not to exist in the DOM, but it was continuously found"); reset dropped → Jest + CT (d) red; clamp dropped → CT (a) red on "Expected to find element: app-clamped-text button, but never found it" (height assertion not isolated)
- Reviewer verdict: **FAIL** (verbatim):

> STATUS: FAIL
> ISSUES:
> 1. **Discovered Issue:** With the clamp removed, CT (a) did not go red on the height assertion. In `clamped-text.cy.ts` that assertion (lines 27-30) runs before the button lookup (line 31). Cypress stops at the first failure, so a failure reported as "Expected to find element: app-clamped-text button, but never found it" means the height check ran on an unclamped 2,000-character body at 600 px and passed. That body should be roughly 20 lines tall. So the `≤ 3 × line-height + 1` assertion does not catch a missing clamp. The likely cause: `textEl().then(...)` runs once, without retry, right after `cy.mount`. If the `<p>` has not laid out its text yet (height ≈ 0), the check passes whether or not the clamp exists. In the passing run, the clamp is therefore proven only indirectly, through the button appearing (overflow).
>    * **Violated Rule:** `tasks.md` L82, Falsifier: "drop the clamp style → CT (a) height assertion fails"; `.agents/reviewer.md` §2 Red Run & Mutation Trace.
>    * **Remediation Suggestion:** In CT (a), wait for the rendered text before measuring. For example, first run `cy.get('app-clamped-text button').should('be.visible')` or `textEl().should('contain.text', 'word9')`. Then measure inside a retrying `textEl().should($el => { ... at.most(3 * lh + 1) })` instead of `.then`. Also assert that `lh` is a finite number, so a `normal` line-height cannot turn the check into NaN. Then run the falsifier again with only the clamp class removed, and record that the failure message is the height assertion, not the missing button. The post-click `greaterThan` check (line 35) can stay as it is.

- ADVISORY (4R, non-gating): trailing `\n` from multi-line interpolation inside `whitespace-pre-line` `<p>` (put `{{ text() }}` on one line); optional `aria-controls`; redundant `standalone: true`; Jest header comment mentions a spy that is not used.
- runtime events: none
- spawns: implementer 22 calls, 148,734 tokens, ended complete; reviewer not reported by host

## Budget Tripwire — 2026-11-19 (after TKR-T-1 finalize)

| Metric | Budget (`design.md` §12) | Actual so far | Delta |
|---|---|---|---|
| Tasks | 3 | 1 closed, 1 in rework, 1 pending | on track |
| LOC | ~180 (incl. ~100 test) | ≈ 369 in tree (T-1 147: 25 prod + 118 CT; T-2 attempt 1 222: ~5 files incl. Jest + CT) | ≈ +190 (≈ 2×) before T-3 |
| Review rounds | 4 | 2 (T-2 FAIL, T-1 PASS) | on track; T-2 attempt 2 + T-3 will take it to 4 |

Cause: test code. T-1's CT runs 6 cases × 2 widths with long fixtures and three extra assertions added so the falsifiers diverge; T-2 ships a new component with both Jest and CT specs. Production code is small (T-1 ≈ 25 lines). Run stopped for the user's decision per Step 2.4; not auto-approved.

### TKR-T-2 — attempt 2 report (received after the tripwire stop; not yet reviewed)

- effort high (bumped after attempt-1 FAIL) · skills: angular-developer, tdd
- files changed: `clamped-text.cy.ts` (CT (a) waits on `contain.text 'word9'`, then retrying `.should` asserts finite `lh`, height > 0, height ≤ `3*lh+1` "clamped to 3 lines", then the button lookup); `clamped-text.component.html` (`{{ text() }}` on one line — advisory-grade); `clamped-text.component.spec.ts` (header comment, no spy — advisory-grade). `.ts` untouched
- Implementer verification: CT 4/4 passing; Jest 4/4; eslint (`ESLINT_USE_FLAT_CONFIG=false`) exit 0; ngc no clamped-text errors
- Falsifier (clamp class removed via `[class]="''"`): CT (a) red, verbatim `AssertionError: Timed out retrying after 10000ms: clamped to 3 lines: expected 288 to be at most 55` (height assertion); (c), (d) red on missing button; (b) green. Restore confirmed by diff (`RESTORED`)
- Not Done / Assumptions (verbatim summary, no owed item, no blocker): CT run prints TS errors from other specs (`bilateral-overview.cy.ts`, `bilateral-review.cy.ts`, `program-overview.row-layout.cy.ts`, `my-work-board.cy.ts`, `ct-utils.ts`) via the shared webpack compile — not from this task; ngc/lint only checked for touched files
- spawns: implementer 26 calls, 127,515 tokens, ended partial (assumptions only)
- pending: evidence re-run + Reviewer — held until the user answers the budget tripwire

**Tripwire decision:** user, 2026-11-19 — "continua hasta que termines": LOC overrun accepted, run continues to the end of the spec (T-2 review, T-3). Not auto-approved; explicit user answer.

### TKR-T-2 — `app-clamped-text` — **PASS** (2026-11-19, attempt 2)

- attempts: 2 (attempt 1 Reviewer FAIL — clamp falsifier did not land on the height assertion; attempt 2 effort high)
- requirements covered: TKR-R-2 (S-2.1 clamp + toggle + keyboard + aria, S-2.2, S-2.3 reset), TKR-NFR-1, NFR-2, NFR-4
- final files (all new): `src/app/shared/components/clamped-text/clamped-text.component.{ts,html,spec.ts}`, `clamped-text.cy.ts`, `src/app/internationalization/clamped-text.copy.ts` (exports `CLAMPED_TEXT_COPY` with `showMore`, `showLess`, `kpiStatementLabel`)
- Red runs: see attempt 1 (stub reds) and attempt 2 (clamp falsifier `clamped to 3 lines: expected 288 to be at most 55`)
- Evidence re-run (Leader-inline, non-author, owned lock): Jest `--maxWorkers=2 --testPathPattern=clamped-text` 4/4; CT `clamped-text.cy.ts` 4/4 "All specs passed!" → **VERIFIED**
- Reviewer verdict (attempt 2): **PASS** — attempt-1 FAIL resolved (CT (a) waits on `contain.text 'word9'`, retrying `.should` height ≤ 3·lh+1 before the button lookup); full walk S-2.1/2.2/2.3, §8.2/P-11, NFR-1/2/4 conformant; scope matches tasks.md
- ADVISORY (4R, non-gating): CT (a) post-click height in one-shot `.then` (retrying `.should` would remove flake risk; false red only); CT (b) `not.exist` could follow a body-height assertion so "no button" follows real layout; optional `aria-controls` button → `<p>`
- runtime events: none
- spawns: reviewer (attempt 1) 12 calls, 88,116 tokens, ended complete; implementer (attempt 2) 26 calls, 127,515 tokens, ended partial (assumptions only); reviewer (attempt 2) 11 calls, 79,785 tokens, ended complete
- running totals: tasks 2/3 closed · LOC ≈ 370 in tree (tripwire accepted by user) · review rounds 3 (T-2 FAIL, T-1 PASS, T-2 PASS) of 4
- continue gate: user instruction "continua hasta que termines" (2026-11-19) → proceed to TKR-T-3

### TKR-T-3 — KPI select uses both — **PASS** (2026-11-19)

- attempts: 1 · skills: angular-developer · effort medium
- requirements covered: TKR-R-1 (wiring), TKR-R-2 (S-2.1 placement + BUT payload/dirty, S-2.3 KPI change, S-2.4 pre-2026), TKR-NFR-1, NFR-3, NFR-4
- files changed (base `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`): `components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html` (+4: `[wrapOptions]="true"` on the KPI select only; bold `{{ kpiStatementLabel }}:` + `<app-clamped-text [lines]="3">` inside the `isCP2026() && selectedIndicatorData()` block, before Unit), `multiple-wps-content.component.ts` (+4: `kpiStatementLabel` from `CLAMPED_TEXT_COPY`; `indicator_description?: string` on `IndicatorItem` for strict template type-check), `cpmultiple-wps-content.component.spec.ts` (+90: describe "TKR-T-3" (a)-(e), real `ClampedTextComponent`, `settle()` advancing fake timers 150 ms past the 100 ms load effect), `rd-contributors-and-partners.module.ts` (`ClampedTextComponent` in imports), `CLAUDE.md` (Verified stamp "262dfcf38 + uncommitted" + `## TKR-T-3` section). 103 insertions, 5 deletions
- host findings: `CPMultipleWPsContentComponent` declared only in `RdContributorsAndPartnersModule`; ipsr-contributors, share-request-modal, notification-item modules import it, review drawer imports it directly → no second import
- Implementer verification: consumers baseline 10 suites / 419 tests passed → after 10 / 424; `--findRelatedTests` 22 suites / 793 passed; eslint (`ESLINT_USE_FLAT_CONFIG=false`) clean; ngc exit not captured by the Implementer
- Red run (before template edit): (a) `expect(clamped).toBeTruthy() Received: null`; (c)/(d) `TypeError: Cannot read properties of null (reading 'componentInstance')`; (e) `Expected: 1 Received: 0` (partly test bug — static `optionLabel` read via `getAttribute`)
- Falsifiers (all reverted, grep confirms no `touchTab`): F1 block outside the year gate → "(b) not 2026: app-clamped-text is absent (S-2.4) … 1 failed, 4 passed"; F2 `wrapOptions` on the Level select → "(e) only the KPI select receives wrapOptions=true … 1 failed"; F3 `touchTab()` writing `activeTab.kpiExpanded` → first green, (d) rewritten to compare against original + pre-existing load-effect write `toc_progressive_narrative: ''` (`multiple-wps-content.component.ts:335`) → "(d) … leaves partnersBody and activeTab as the load effect left them (S-2.1) … 1 failed, 4 passed"
- Not Done / Assumptions (verbatim summary, no owed item, no blocker): "ngc exit code not captured; re-run and check $? if certainty needed." · label "KPI statement:" from the copy constant · Verified stamp "262dfcf38 + uncommitted" · PRTest manual check (#953) not done, as instructed → ngc closed by the Leader re-run below
- Evidence re-run (Leader-inline, non-author): `npx ngc -p tsconfig.app.json --noEmit` **exit 0**, 0 error lines; Jest `--maxWorkers=2 --findRelatedTests <html, ts, module, spec>` 22 suites / 793 passed → **VERIFIED**
- Reviewer verdict: **PASS** — conformant; (d) is real proof of S-2.1 BUT (baseline write pre-exists at `:335`, not in diff); `IndicatorItem` addition in scope (NFR-4 type-check); label from copy, placement inside year gate before Unit; CLAUDE.md follows its convention. Conditions: (1) ngc exit 0 — closed by the re-run; (2) PR note "W3/bilateral payload: no impact (view-only)" must go in the PR description (AGENTS.md §6)
- ADVISORY (4R, non-gating): (c) does not assert the collapse on KPI switch at the host (covered by T-2's `linkedSignal` unit scope); (e) proves the binding only under `NO_ERRORS_SCHEMA` — visible wrapping evidence is T-1's CT; the "KPI statement:" label sits on its own line while Unit/Target are inline — visual check at the PRTest pass
- issues encountered: lock overlap again — the Leader's re-run found its `owner` file gone at release (the T-3 Implementer's leftover background command released/recreated `test.lock` mid-run). The Implementer was told to stop its background work and confirmed "stopped". Results matched, so no effect on evidence
- runtime events: none
- spawns: implementer ~82 calls (host), 164,412 tokens, ended partial (assumptions only; kept waking on its own background work, re-sent the same report 3×); reviewer 7 calls, 52,317 tokens, ended complete
- running totals: tasks 3/3 closed · LOC ≈ 480 in tree (T-1 147 + T-2 ~225 + T-3 108) vs ~180 budget (overrun accepted by user) · review rounds 4 (T-2 FAIL, T-1 PASS, T-2 PASS, T-3 PASS) = budget 4

## 3. Summary

| Task | Result | Attempts | Reviewer | Evidence re-run |
|---|---|---|---|---|
| TKR-T-1 `app-pr-select` `wrapOptions` | PASS | 1 | PASS | VERIFIED |
| TKR-T-2 `app-clamped-text` | PASS | 2 | FAIL → PASS | VERIFIED |
| TKR-T-3 KPI select wiring | PASS | 1 | PASS | VERIFIED |

- No `REVIEW_SKIPPED` / `REVIEW_WAIVED` records; no HALT, no Pivot. One budget tripwire (LOC ≈ 2.7×, all in tests) — user accepted, run continued.
- Nothing committed. PR description must carry: "W3/bilateral payload: no impact (view-only)".
- Open for validation (`/akili-validate`): PRTest check on result #953 (SP09, HLO 5.5.1) after deploy — two-line KPI list without sideways scroll; full KPI text with Show more; Save draft payload unchanged.
- Gaps to carry: ESLint 9 has no flat config (`ESLINT_USE_FLAT_CONFIG=false` used; `pr-select.cy.ts` not linted); `npm run test:ct -- <filter>` matches nothing on Windows backslash paths; `.agents/leader.md` `primary-instructions` outdated; scratchpad `mkdir` lock is not owner-safe (released by another holder twice).
- Constitution impact: new shared component `src/app/shared/components/clamped-text/` — consider a line in client `src/CLAUDE.md`; CodeGraph re-index pending (`codegraph sync`).
