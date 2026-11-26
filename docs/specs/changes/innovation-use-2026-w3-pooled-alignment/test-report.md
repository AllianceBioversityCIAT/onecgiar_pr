# Test Report — Innovation Use 2026: W3/Bilateral aligned with the pooled form

**Overall: PASS (automated) · 0 product bugs · 2 accepted gaps (both go to the IWA-T-3 manual check on PRTest)**

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-2026-w3-pooled-alignment` |
| Date | 2026-11-26 |
| Branch / HEAD | `qa-development-2026-ss` @ `e5654d462` (spec commits `63c79f70e`, `e5654d462` on base `990646d3e`) |
| Depth | Lite |
| Leader | Claude Opus 5.5 (T1), ran the suite inline as Tester |
| Implementer model | `sonnet` (from `execution.md`) |
| Tester model | Opus 5.5 — not the Implementer model (author ≠ tester holds) |

## 2. Summary

| Item | Result |
|---|---|
| Suites run | 1 (frontend unit, Jest + real Angular template) |
| Testers spawned | 0. Ran inline under the Deployment Rule (Lite depth, one suite). The `akili-tester` wrapper binds `sonnet`, which is the Implementer model, so the wrapper was not usable. The Leader's model (Opus) is not an Implementer model. |
| Author TDD tests cited (not rewritten) | 7 (IWA-T-1, `type-innovation-use.component.spec.ts`) + 3 assertions (IWA-T-2, `innovation-use-form.component.spec.ts`) |
| Tester tests added | 5, in the new file `type-innovation-use.pooled-alignment.spec.ts` |
| Affected folders | **483 / 483 passed**, 6 suites |
| Full client suite | 707 / 710 suites · 15,498 / 15,503 tests. The 5 failures sit in 3 suites outside this spec (environment-dependent, see §8) · coverage 83.93 / 77.42 / 81.65 / 84.63 (stmts / branches / funcs / lines), above the 60/50/60/60 gate |
| Product bugs | 0 |
| Skills / effort | `angular-developer` scope (Skill Map); effort `medium` |
| Inner loop | 3 attempts used on one test (a harness defect, not a product defect). It was narrowed, and the remaining path is recorded as gap G-1. |

## 3. Backend Unit Tests

Not applicable to this spec: it is client-only. Evidence: `git diff --stat 990646d3e..HEAD -- onecgiar-pr-server` is empty.

## 4. Frontend Unit Tests

| Command | Result |
|---|---|
| `npx jest --silent --no-coverage src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.pooled-alignment.spec.ts` | `Tests: 5 passed, 5 total` |
| `npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral/components/section-type-specific/type-innovation-use src/app/shared/components/innovation-use-form` | `Test Suites: 6 passed, 6 total · Tests: 483 passed, 483 total` |
| `npx jest --silent --reporters=summary --coverage --coverageReporters=text-summary` (whole client) | `Test Suites: 3 failed, 707 passed, 710 total · Tests: 5 failed, 15498 passed, 15503 total`. The failures are not caused by this spec (§8) |

**Tester tests added** (`type-innovation-use.pooled-alignment.spec.ts`; real template, no `overrideTemplate`):

| # | Test | Proves |
|---|---|---|
| A | IWA-R-1 tile + main-block button | With full metadata collapsed, the "Organizations" tile shows the loaded organization (2), and "Add organization" adds a row without opening full metadata |
| B | IWA-R-1 TBD, expanded | "To be determined" hides Actors, Other measures, Organizations and the tiles, and Organizations stays hidden after full metadata is expanded (closes the Reviewer's advisory "test 3 checks only collapsed") |
| C | IWA-R-1 read-only | The 2026 Organizations block sits inside the same `[inert]="readOnly()"` wrapper as Actors |
| D | IWA-R-4 on the W3 screen | The W3 2026 nature options show neither phrase, and each description matches the approved text word for word |
| E | IWA-R-5 payload shape | The 2026 and 2025 save payloads have the same keys at every level, and `organization[0].addressing_demands` is kept on both |

**Falsifier probe (Tester):** putting `climate advisories; ` back into `farmer-follow-up.ts` makes test D fail with `Expected substring: not "climate advisories"`. The file was restored afterwards, and `git diff --stat` shows it clean.

## 5. Integration Tests

Not applicable. No API, server or DB change (IWA-R-5). The contract evidence is test E plus the empty server diff.

## 6. E2E Tests

None added. `cypress/e2e/bilateral-type-specific-section.cy.ts` pins none of the changed labels or headers (P-6). The visual check on the real page is IWA-T-3 (manual, PRTest).

## 7. Coverage & Traceability

| Requirement | Scenario / clause | Test Type | Test File or Command | Result | Gap or Notes |
|---|---|---|---|---|---|
| IWA-R-1 | 2026: order Actors → Organizations → Other measures (collapsed) | Unit (real template) | `type-innovation-use.component.spec.ts` › "2026 with full metadata collapsed lists Actors, Organizations, Other measures…" | PASS | Author test 1 |
| IWA-R-1 | AND counts in the "Organizations" tile | Unit | `…pooled-alignment.spec.ts` › test A | PASS (partial) | The loaded row feeds the tile. Typing a figure into a new row is gap G-1 |
| IWA-R-1 | BUT must NOT enter MDS / submit gate | Unit | `type-innovation-use.component.spec.ts` › "Organizations never enter the MDS field list in 2026" | PASS | Author test 7: keys = `use-actors, use-measures, use-investment` |
| IWA-R-1 | AND MUST NOT render twice | Unit | Author test 1 (count 1 collapsed and expanded) | PASS | Leader falsifier in `execution.md`: both positions → `Expected 1, Received 2` |
| IWA-R-1 | 2025: Organizations only in full metadata | Unit | Author test 2 | PASS | — |
| IWA-R-1 | "To be determined" hides Organizations | Unit | Author test 3 + `…pooled-alignment.spec.ts` › test B | PASS | B adds the expanded state |
| IWA-R-1 | Read-only wrapper (design §8) | Unit | `…pooled-alignment.spec.ts` › test C | PASS | Structural check. jsdom does not enforce `inert` (NG0303 noise) |
| IWA-R-2 | Hidden on 2026 actor + organization cards | Unit | Author test 4 | PASS | — |
| IWA-R-2 | Payload keeps `addressing_demands = "x"` | Unit | Author test 5 | PASS | Actor `'x'`, organization `'y'` |
| IWA-R-2 | BUT must NOT send `null` / `""` | Unit | Author test 5 (`toBe('x')`) | PASS | Leader falsifier: `null` mapping → `Expected "x", Received null` |
| IWA-R-2 | AND MUST still show on 2025 | Unit | Author test 4 (2 occurrences on 2025) | PASS | — |
| IWA-R-3 | 2026 "Add actor / Add organization / Add other"; 2025 "Add another …" | Unit | Author test 6 | PASS | — |
| IWA-R-4 | Phrases gone, pooled screen | Unit | `innovation-use-form.component.spec.ts` › "does not contain the removed examples (IWA-R-4)" | PASS | Author (IWA-T-2) |
| IWA-R-4 | Phrases gone, W3 screen | Unit (real template) | `…pooled-alignment.spec.ts` › test D | PASS | Tester falsifier probe bites |
| IWA-R-4 | Rest unchanged word for word | Unit | IWA-T-2 exact-equality expectations + test D | PASS | Literal text from `tasks.md` @ `e5654d462` |
| IWA-R-4 | MUST change in one place only | Command | `git grep -n "climate advisories\|actively used a digital tool" -- onecgiar-pr-client onecgiar-pr-server ':!*.spec.ts' ':!*.md'` | PASS (exit 1, 0 hits) | — |
| IWA-R-5 | `/api/bilateral/*` shape unchanged | Unit + command | `…pooled-alignment.spec.ts` › test E · `git diff --stat 990646d3e..HEAD -- onecgiar-pr-server` (empty) · component `.ts` untouched | PASS | Live API spot check is in IWA-T-3 |
| IWA-NFR-1 | Client build green | Build | `npx ng build --configuration development` (Leader re-run during execute) | PASS | Not re-run here: the spec's code is unchanged since then; this run added only a spec file |
| IWA-NFR-2 | W3 suite green, coverage not lowered | Unit | Folder run + full client run | PASS | W3 + pooled folders 483/483. Global coverage is above the gates | — |
| NFR defect class | Visual look (spacing, tile) | Manual | IWA-T-3 on PRTest (W3 8427, 2025 result, W1/W2 6433) | PENDING | Gap G-2, by design |

## 8. Remediation

No failures come from this spec. The full client run has 5 failing tests in 3 suites that **this spec does not touch**: none of them imports a changed file, and `git diff --name-only 990646d3e..HEAD` lists only the `type-innovation-use` and `innovation-use-form` files. All 3 depend on the local `src/environments/environment.ts` (`qaUrl: ''`, `apiBaseUrl: 'http://localhost:3000/'`), and they fail the same way when run alone (`Tests: 5 failed, 39 passed, 44 total`):

| Suite | Failure (verbatim) |
|---|---|
| `src/app/shared/interceptors/general-interceptor.service.spec.ts` | 4 tests, e.g. `should add auth header for non-elastic and non-blacklisted URLs` → `expect(received).toBeTruthy() Received: false` |
| `src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/impact-level-info.component.spec.ts` | `a successful PATCH to the E4 URL on a result-detail route reloads the green checks` → `Expected number of calls: 1 Received number of calls: 0` |
| `src/app/pages/quality-assurance/quality-assurance.component.spec.ts` | `Test suite failed to run` → `TypeError: Invalid URL:` at `new URL(environment.qaUrl)` |

Remediation (outside this spec): run the client suite with the CI environment file, or make these specs independent of `environment.qaUrl` and `apiBaseUrl`. CI is the authoritative gate.

## 9. Accepted Gaps

| ID | Gap | Why not automated | Covered by |
|---|---|---|---|
| G-1 | Typing a figure into a **newly added** main-block organization row updates the "Organizations" tile | In the jsdom harness, writing the row and then calling `detectChanges` gave `NG0100 ExpressionChangedAfterItHasBeenChecked` (`Previous value: '2'. Current value: '7'`). Locating the field's `NgModel` failed twice. After 3 attempts the test was narrowed to the loaded-row and button paths. There is no evidence of a product defect: the tile reads `totalsByCategory(…, this.body.organization, …)` (P-2), the same source test A proves. | IWA-T-3: "the Organizations tile updates when a row is added locally". **Also watch for the NG0100 in the browser console during that check**: if it appears in dev mode, it is a real change-detection smell worth a follow-up. |
| G-2 | Spacing and look on the real page | jsdom has no layout | IWA-T-3 human check, then Nicoleta's acceptance |

Design-detector suite: not planned. The design route is "existing product UI, parity only" (`tasks.md` IWA-T-1), with no new surface.
