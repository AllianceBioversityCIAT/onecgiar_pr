# Validation Report — Contribution saved without its ToC target anchor

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/contribution-target-anchor` (INC-168252) |
| Validated at | `e96f3ad66` (qa-development-2026-ss = performance-refactor = staging) · 2026-11-12 |
| Auditor | Opus 5.5 (T3) — Implementer was sonnet (author ≠ auditor holds) |
| test-report.md | none — test evidence lives in `execution.md` (T-1 red/green + mutations) |

## Summary

**Verdict: PASS with 4 WARN — archive-ready.** 0 FAIL, 0 BLOCKED.

| Result | Count |
|---|---|
| PASS | Tasks 2/2, requirements 4/4, NFR 3/3, build/lint/tests |
| WARN | W-1 PRTest new-save check pending · W-2 LOC budget overrun · W-3 post-review SQL edit · W-4 design test-count drift (fixed here) |

## Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| T-1 server fix | `[x]` | Reviewer PASS attempt 1; Leader re-run VERIFIED; P-8 settled (no Pivot) | PASS |
| T-2 PROD backfill | `[x]` | Reviewer PASS attempt 2; user PROD run 46/46 `decision = OK`, fresh-tab 5a/5b, KPI Achieved 1 in app | PASS |

## File Existence

| Design path | Expected | Found | Result |
|---|---|---|---|
| `…/repositories/results-toc-results.repository.ts` | modified, `resolveTargetIdentity` only | +55/−3: method + 4th arg at its 2 call sites | PASS (call-site arg is the recorded warn-placement decision) |
| `…/repositories/results-toc-results.repository.spec.ts` | new CTA describe | +212, 7 `it` | PASS |
| `docs/specs/…/backfill-prod.md` | new hand-off | present | PASS |

NFR-2: commit `e96f3ad66` touches only these files + spec docs.

## Build Integrity

Re-run at validate on the committed tree (server has no uncommitted changes):

| Command | Result |
|---|---|
| `npx jest …repository.spec.ts --maxWorkers=2` | 35/35 PASS (`it(` 28 → 35) |
| `npx jest --findRelatedTests …repository.ts --maxWorkers=2` | 79 suites / 2632 tests PASS |
| `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| `npx eslint <2 files> --quiet` | exit 0 |

## Requirement Coverage

| Clause | Owner | Evidence | Result |
|---|---|---|---|
| CTA-R-1 / S-1 anchor = 333606 | T-1 | CTA-TEST-1 (red null → green); PROD rit 25057 = 333606 | PASS |
| S-1 `BUT` row count unchanged | T-1 | CTA-TEST-1 second identity-less target → exactly one `save`; mutation `identityResolved:true` → red | PASS |
| S-2 ambiguous → NULL + warn / `BUT must NOT pick` | T-1, T-2 | CTA-TEST-2 (red warn 0 → 1); PROD 12 ambiguous untouched | PASS |
| S-3 existing anchor kept | T-1 | CTA-TEST-3 (333000 kept); DD-5 expression untouched | PASS |
| CTA-R-2 / S-4 foreign id ignored | T-1 | CTA-TEST-4a (red 999999 → 333606) | PASS |
| S-4 `AND IT MUST` keep own catalog id | T-1 | CTA-TEST-4b | PASS |
| S-4 `BUT` empty catalog keeps own id | T-1 | CTA-TEST-4c (555) | PASS |
| CTA-DD-3 no other-year anchor | T-1 | CTA-TEST-5; mutation whole-list → red 333607 | PASS |
| CTA-R-3 / S-5 preview, backup, unique-only UPDATE, active COMMIT, fresh tab | T-2 | user PROD run: backup 58, affected 46 = expected 46, 5a SINGLE 46/0 null, AMBIGUOUS 12/12 | PASS |
| S-5 `BUT` ambiguous not touched, listed | T-2 | 5a AMBIGUOUS still_null 12; block 6 list (with centres) | PASS |
| S-5 `AND IT MUST` PROD label | T-2 | every block headed `PROD · read-only/write` | PASS |
| CTA-R-4 TTD unchanged | T-1 | 28 prior cases green; steps 2–3 untouched | PASS |
| NFR-1 no extra query | T-1 | CTA-TEST-1 asserts one catalog read | PASS |
| NFR-2 no API/migration | T-1 | diff scope above | PASS |
| NFR-3 scoped tests | all | `--findRelatedTests`, `--maxWorkers=2` | PASS |

Proposal Success Criteria: non-NULL anchor on new save (code + test; **live check pending → W-1**), KPI 9378 Achieved 1 (✅ user screenshot), NULL count dropped to ambiguous remainder (✅ 12), red/green + TTD green (✅).

## Linting & Code Quality

Lint clean. **Advisory (4R, non-gating — carried from execution.md):**

| Lens | Finding |
|---|---|
| Readability | JSDoc above `resolveTargetIdentity` still lists steps 1–3 only |
| Readability | CTA-TEST-2 does not assert the warn omits payload content (DD-6 exclusion half) |
| Reliability | Ambiguous warn fires once per identity-less target, not once per indicator |
| Risk | DD-2 membership runs against the all-years fallback list → other-year own id accepted when the phase year has no metas (per design) |
| Risk | App shows target 5 for KPI 9378 while catalog meta 333606 has `number_target` 6 — display source differs (P-6); out of scope |
| Risk | Proposal non-goal says the overview "0 of 111" counts KPIs that met target; after the backfill AOW02 shows "1 of 111" with 1/5 achieved — the non-goal's premise may be inaccurate; recheck what the header counts |

## Design Conformance

| Item | Result |
|---|---|
| Resolution order steps 1–4, DD-1…DD-6 | PASS (code read at validate) |
| Warn placement via optional `logContext` param | PASS — decision recorded in execution.md |
| DD-7 backfill hand-off, pasted inline | PASS |
| Cross-document figures: 58 rows (requirements) = PROD preview 58; result 33767 (id) ↔ result_code 21527 ↔ rit 25057 consistent | PASS |
| **W-4** design.md said "CTA-TEST-1…4", tasks define 5 | WARN → corrected in design.md at validate (closure grep: no other site) |
| **W-3** Backfill `YEAR()` → `LEFT(…,4)` after PROD error 1292, edited by Leader after Reviewer PASS, not re-reviewed | WARN — recorded in execution.md; equivalence argued; outcome verified in PROD (46/46) |
| **W-2** Budget ~280 LOC vs 52 code + 212 tests + ~480-line doc | WARN — overrun reported at each gate; no scope added |

## Test Evidence Summary

- Automated: CTA-TEST-1…5 (7 cases) red-first (3 behavioural reds quoted) then green; 2 falsifier mutations red; related 79 suites green.
- Manual (PROD, user): backfill preview/backup/UPDATE/verify; KPI 9378 Achieved 1 in app.
- **W-1** PRTest live check of a *new* Contributors & partners save not yet done (deploy of `performance-refactor` pending at validate time).

## Agent Guide / Constitution Impact

No `## Constitution Impact` block — no module created or reshaped. No guide sync needed. CodeGraph re-index: optional (one method changed).

## Remediation

| # | Item | Severity | Action |
|---|---|---|---|
| 1 | W-1 PRTest new-save check | WARN | User, after perf deploy: save a new 2026 contribution on a single-meta indicator → anchor non-NULL |
| 2 | W-2 / W-3 / W-4 | WARN | Accepted / recorded; feed `/akili-archive` kaizen |
| 3 | Advisories | — | Optional follow-up (JSDoc, warn test, dedupe warn) |

Out-of-spec follow-ups (not remediation): 12 ambiguous rows (block 6), re-run backfill after `master`, notify Nicoleta (SP09 Achieved jumps), ticket reply, `master` promotion (Cristian).

## Archive Readiness Recommendation

**Ready.** All tasks `[x]`, no FAIL, WARNs accepted or owned by the user. Next: `/akili-archive bugfix/contribution-target-anchor`.
