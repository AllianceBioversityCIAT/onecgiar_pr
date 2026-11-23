# Test Report — P2-3960 · Bilateral save alerts tell one consistent truth

> **Status: PASS.** All 4 requirements and every scenario clause have automated evidence: **9 regression tests**, each shown to go red on its own falsifier.
> - 216/216 tests pass in the 3 affected suites; lint is clean.
> - There are no product bugs.
> - One accepted gap remains: the real-browser modal flow, checked manually on prtest.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3960-bilateral-save-alert-consistency` · Lite · Bug Mode |
| Code under test | `6cc9c75e0` (T-1), `550737ec8` (T-2) |
| Date | 2026-11-23 |
| Leader | Claude Code `opus` (T1) |
| Tester | **Inline, by the Leader** (Deployment Rule: Lite, single suite). The Leader runs `opus`; the Implementers ran `sonnet` and there were no escalations, so author ≠ tester holds |
| Reference sections | `docs/trd/trd.md`: none · `docs/ux-ui/design.md`: none (no UI change) |

## 2. Summary

| Item | Value |
|---|---|
| Suites | 1 (frontend unit, Jest); no Tester spawned, written inline |
| Author TDD tests (cited, not rewritten) | 6: A, B, C (T-1) and D, E, F (T-2) |
| New tests added here | 3: G, H, I, closing clause gaps in BSA-R-2 and DD-3 |
| Final run | `npx jest src/app/pages/bilateral/pages/bilateral-result-creator src/app/shared/services/customized-alerts --silent --reporters=summary --no-coverage` → **3 suites, 216/216 passed** |
| Lint | `npx ng lint --quiet` → exit 0 |
| Product bugs | 0 |
| Skills | `tdd` (falsifier-first evidence). No deviation from the task defaults that matters for a single inline suite |

## 3. Backend Unit Tests

None. The change is client only (requirements §4: the server is out of scope).

## 4. Frontend Unit Tests

| ID | Test (file:line) | Proves | Falsifier → red output | Source |
|---|---|---|---|---|
| A | `bilateral-result-creator.component.spec.ts:1989` | BSA-R-1: a stale error does not block, and no "Save failed" appears | DD-1 revert → `Expected "contributors" / Received "general-info"` | T-1 (author) |
| B | `…spec.ts:2006` | BSA-R-1: a real failure that arrives late still blocks, with the server reason | unscoped wait → `Expected "general-info" / Received "contributors"` | T-1 (author) |
| C | `…spec.ts:1036` | BSA-R-2: a stale error alone gives "Nothing to save yet", not "Draft saved" | DD-3 revert → `"title": "Draft saved"` | T-1 (author) |
| **G** | `…spec.ts` "a stale error alone lists the missing fields and never says "Saved."" | BSA-R-2: "lists the missing fields" + "BUT it must NOT read … 'Saved.'" | DD-3 revert → `Expected: "Still missing: Title of Result, Description."` / `Received: "Saved. Still missing: Title of Result, Description."` | **new** |
| **H** | `…spec.ts` "a stale error alone with nothing missing says "Up to date", not "Success"" | BSA-R-2: "Success" only when something was sent; otherwise the "Up to date" branch | DD-3 revert → `Expected: ObjectContaining {"title": "Up to date"}` / `Received: {… "title": "Success"}` | **new** |
| **I** | `…spec.ts` "an untouched Evidence section stays "Up to date" although its capture is never empty" | DD-3 keeps `hadChanges` (P-4), protecting BSA-R-2 for Evidence | drop `hadChanges` (`if (flushTargets.length === 0)`) → `Expected: ObjectContaining {"title": "Up to date"}` / `Received: {… "title": "Success"}` | **new** |
| D | `customized-alerts-fe.service.spec.ts:249` describe | BSA-R-3: still on screen at 3500 ms and closed at 5000 ms | timer clearing removed → `Expected: false / Received: true` | T-2 (author) |
| E | same describe | BSA-R-4 (Fe): no throw on a detached node | guard removed → `TypeError … reading 'removeChild'` | T-2 (author) |
| F | `customized-alerts-fs.service.spec.ts:175` describe | BSA-R-4 (Fs): no throw on a detached node | guard removed → `TypeError … reading 'removeChild'` | T-2 (author) |

The G, H and I falsifiers were executed on 2026-11-23 against the committed code. Each mutation was applied with `sed`, the tests were run, and the file was restored with `git checkout`; `git diff --quiet` confirmed it was clean afterwards. Each red is a behavioural assertion, not a timeout or setup error.

Adapted consumer tests (author, T-1): `:1018` "saves the partial draft…", "names an over-limit field…", `:1971` "keeps the section open…", and "the flush fails: savedTick NOT bumped".

## 5. Integration Tests

None planned. The spec touches no API, entity or cross-module contract. `BilateralAutoSaveService` is mocked at its existing seam, and its scoped helpers already have their own tests (design P-5).

## 6. E2E Tests

None automated, by design (requirements §7: "Real-browser modal flow and console | No automated check"). See §9.

## 7. Coverage & Traceability

| Requirement | Scenario / clause | Test Type | Test | Result | Gap or Notes |
|---|---|---|---|---|---|
| BSA-R-1 | Stale error does not block: THEN opens Contributors | unit | A | PASS | — |
| BSA-R-1 | … BUT must NOT show "Save failed" | unit | A | PASS | negative constraint |
| BSA-R-1 | Real failure still blocks: THEN stays | unit | B, adapted `:1971` | PASS | — |
| BSA-R-1 | … AND IT MUST show the server reason for B | unit | B, adapted `:1971` | PASS | strict validation |
| BSA-R-2 | Stale error only: title "Nothing to save yet" | unit | C | PASS | — |
| BSA-R-2 | … and it lists the missing fields | unit | **G** | PASS | was a gap before this run |
| BSA-R-2 | … BUT must NOT read "Draft saved" | unit | C | PASS | negative constraint |
| BSA-R-2 | … BUT must NOT read "Saved." | unit | **G** | PASS | negative constraint; was a gap |
| BSA-R-2 | "Success" only when sent; otherwise "Up to date" | unit | **H**, **I** | PASS | was a gap |
| BSA-R-2 | Real save, unchanged ("Draft saved", "Saved. Still missing: …") | unit | adapted `:1018`, "names an over-limit field…" | PASS | — |
| BSA-R-3 | Same-id replacement: still on screen at 3500 ms | unit (fake timers) | D | PASS | — |
| BSA-R-3 | … AND IT MUST close at 5000 ms | unit (fake timers) | D | PASS | strict validation |
| BSA-R-4 | Detached container, Fe: no exception | unit (jsdom + window error listener) | E | PASS | — |
| BSA-R-4 | Detached container, Fs: no exception | unit (jsdom + window error listener) | F | PASS | — |
| NFR | Compatibility for about 70 `alertsFe` callers (3000 ms `closeIn`, `closeAction`) | unit | existing Fe/Fs suites `:100-132`, `:177-220`, `:249+` | PASS | — |
| NFR | Coverage 50/60/60/60 | — | full client run (see validation-report §5) | WARN | percentages not captured; the diff adds only tests and guards |
| — | Real-browser modal flow and console | manual | proposal §13 repro on prtest | **ACCEPTED GAP** | §9 |

## 8. Remediation

None required for this spec. These items are outside it and are recorded in `validation-report.md`:
- R-1: manual prtest repro.
- R-4: follow-ups — per-field error display; the 15 s stall; an in-flight failure during navigation is silent.
- R-6: 5 failures in `general-interceptor` and `impact-level-info` that predate this spec, plus the flaky `quality-assurance` suite.

## 9. Accepted Gaps

| Gap | Why it is not automated | Manual substitute |
|---|---|---|
| Real-browser modal flow and console (`removeChild` in DevTools, modal stacking, timing as the user sees it) | jsdom does not run the `animate__` CSS animations that fire `animationend`, nor real modal layering. Requirements §7 names this class as having no automated check | Proposal §9 steps 1-5 on prtest after deploy. Expect: no false "Save failed", no false "Draft saved", no alert closing before its 3 s, and no console error (validation-report R-1) |
