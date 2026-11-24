# Validation Report — QA catalog level rules on level numbers (P2-3939)

**Verdict: PASS with 4 WARN. No FAIL. Archive-ready once the WARNs are accepted or fixed.** Every requirement, scenario and `BUT` / `AND IT MUST` clause is implemented and has test evidence. The WARNs are spec-text accuracy and unchecked boxes, not code defects.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Date | 2026-11-23 |
| Code state | `qa-development-2026-ss` at `b143445bd` + uncommitted working tree |
| Auditor | Claude Code session, `opus` (T3). Implementers were `sonnet` → author ≠ auditor holds. The same session orchestrated execution and wrote one test in `/akili-test`, so this audit is not fully independent of the Leader's judgment; each task already carries an independent `opus` Reviewer PASS |
| Inputs | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `test-report.md` |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | PASS (3/3 `[x]`, each with a Reviewer PASS and a VERIFIED re-run) · WARN for unticked DoD boxes and P-5 |
| File existence | PASS |
| Build integrity | PASS (tsc, eslint, jest); migration check n/a (no migration; needs DB) |
| Requirement coverage | PASS for all 6 requirements and 3 NFRs, at scenario and clause level |
| Code quality | PASS · 4R advisories listed |
| Design conformance | PASS · WARN on DD-4 wording and the §11 ledger count |
| Test evidence | PASS (`test-report.md`: 1282/1282 tests; the only red suite already failed at the base commit) |
| Constitution impact | none |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| LVL-T-1 | `[x]` | `execution.md`: red quoted before the change, 2 mutations, tsc falsifier, VERIFIED, Reviewer PASS | PASS |
| LVL-T-2 | `[x]` | P-7 decision recorded (user); red quoted; 7 + 2 mutations; VERIFIED; Reviewer PASS | PASS |
| LVL-T-3 | `[x]` | free revision checked on 4 refs; LF red and regeneration; doc sweep; VERIFIED; Reviewer PASS | PASS |
| Pre-flight P-5 | `[ ]` | user `SELECT id, level` not supplied | WARN (W-3) |
| Per-task DoD boxes (`tasks.md` lines 42–46, 65–67, 86–88) | `[ ]` | met per `execution.md`; the commit box is deliberately not met (root `AGENTS.md` §6: commit only when asked) | WARN (W-4) |
| §6 Rollout | `[ ]` | post-merge by nature | n/a |

## 4. File Existence

Checked against the `design.md` §4 table:

| Path (`onecgiar-pr-server/…`) | Expected | Found |
|---|---|---|
| `src/api/qa-catalog/values/lookup-sources.ts` | +2 sources | ✓ |
| `src/api/qa-catalog/definitions/sections/innovation-use.ts` | +1 field, rule re-keyed, D28 removed | ✓ |
| `src/api/qa-catalog/definitions/sections/ipsr-step-3.ts` | +2 fields, +2 subfields, 4 + 3 rules, header rewritten | ✓ |
| `src/api/qa-catalog/definitions/closed-control-lists.ts` | D28 reference removed | ✓ |
| `src/api/qa-catalog/definitions/versions.ts` | 35 → 36 | ✓ |
| `src/api/qa-catalog/__snapshots__/qa-catalog.snapshot.json` | regenerated | ✓ |
| `*.spec.ts` | pins + regression test | ✓ new `qa-catalog.level-numbers.spec.ts` and `qa-catalog.level-numbers.read-plan.spec.ts`; pins updated in display-rules, required-follows-form, ipsr-step-3, lookup-sources, controller, service, shape |
| `docs/qa-catalog.en.md` | rules, gap, v1.36 change log | ✓ |
| `src/migrations/**` | none (LVL-NFR-2) | ✓ none |

Unrelated uncommitted files in the tree (clarisa-projects, client portfolio-overview, other spec folders) are not part of this spec and must stay out of its commit.

## 5. Build Integrity

| Command (cwd `onecgiar-pr-server`) | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | clean |
| `npx eslint "src/api/qa-catalog/**/*.ts" --quiet` | clean (after prettier on the new read-plan spec) |
| `npx jest src/api/qa-catalog --silent --reporters=summary --forceExit` | `Test Suites: 1 failed, 52 passed, 53 total · Tests: 1282 passed, 1282 total`. The red suite is `qa-catalog.module.spec.ts` "Test suite failed to run" (`JwtService` import); it already failed at the base commit (`tasks.md` §2) |
| `npm run migration:check` | not run: it needs a DB, which this session cannot reach. No entity or migration file changed, so LVL-NFR-2 holds by inspection |
| Snapshot on LF | green in a temporary LF worktree (T-3); CI on LF is authoritative |

## 6. Requirement Coverage

Coverage is taken from `test-report.md` §7, cross-checked against `requirements.md` clause by clause, and checked in code (§8 diff, plus a definition dump of HEAD vs the working tree).

| Requirement · clause | Task | Code | Test | Result |
|---|---|---|---|---|
| R-1 resolved from row (IU) | T-1 | `innovation-use.ts` lookup `value_column: 'level'` | level-numbers spec; read-plan spec | PASS |
| R-1 resolved from row (S3 ×2, complementary ×2) | T-2 | `ipsr-step-3.ts` | same | PASS |
| R-1 `AND IT MUST` repeated row 13 → 2 | T-1, T-2 | — | both specs | PASS |
| R-1 `BUT` level value / `control_list` unchanged | T-1, T-2 | definition diff: no `control_list` or `storage` change | read-plan spec (row ids kept); HEAD diff | PASS |
| R-1 unset → empty | T-1 | — | both specs | PASS |
| R-2 level 4 not visible / required · `BUT` not because of id 5 | T-1 | `whenIn(…_number, [5..9])` on both conditions | red-first regression | PASS |
| R-2 level 9 required | T-1 | — | level-numbers spec | PASS |
| R-3 level 0 not required · `AND` stays visible | T-2 | `required_when` only | level-numbers + ipsr-step-3 specs (visible: structural) | PASS |
| R-3 repeated row → required · `BUT` no `visible_when` | T-2 | — | mutation (b); HEAD diff | PASS |
| R-4 use level 0 → three lists hidden | T-2 | `visible_when` on `core.use_level_number` | level-numbers spec + mutation (c) | PASS |
| R-4 `BUT` required flags / row rules unchanged | T-2 | — | HEAD diff (all three lists) | PASS |
| R-5 version 2026.36 | T-3 | `versions.ts` | controller / service / shape / snapshot specs | PASS |
| R-5 change-log row · `AND IT MUST` gap / D28 removed | T-3 | `qa-catalog.en.md` | doc sweep (Implementer, then the Reviewer) | PASS |
| R-5 `BUT` no rename / removal | T-3 | — | snapshot diff; HEAD diff | PASS |
| R-6 residual NULL gap | T-2, T-3 | `ipsr-step-3.ts` header; contract text | Reviewer-checked | PASS |
| NFR-1 additive only | all | — | HEAD diff | PASS |
| NFR-2 no migration | all | — | inspection | PASS |
| NFR-3 batched lookups | T-1 | existing resolver | batched-SELECT case | PASS |

No orphan scenario or clause.

## 7. Linting & Code Quality

Code is clean: lint and typecheck green; definitions follow the `requires_description` exemplar (read-only `lookup`, `value_column: 'level'`, no form label); every change carries a P2-3939 / DD reference. No security or auth surface touched.

**4R advisories (advisory only, carried from `execution.md` and this audit):**

| Lens | Finding |
|---|---|
| Readability | `qa-catalog.level-numbers.spec.ts` declares a module-level `const test`, shadowing Jest's `test` |
| Readability | the new entries share `order` with their level field and rely on the key tie-break; a renamed key would move them |
| Readability | the S3 note at `qa-catalog.en.md:242` is one long paragraph, and it writes the range both as `in [1, ..., 9]` and as `in [1..9]` |
| Reliability | mutation (b), "stays visible", is covered only structurally; it is a declared property with no behavior to evaluate |
| Reliability | `qa-catalog.en.md` hand-kept counts: the T-3 Implementer measured `required` fields = 52 against 53 in the doc. This pre-dates this spec and was left alone |
| Risk | every rule is only as true as the `clarisa_*.level` column (accepted risk, requirements §7; stated in the contract) |
| Risk | the complementary VS3 rule is cited from a 2026-10-09 read of the deployed function, never re-read (user decision) |
| Risk | DD-7: re-check that revision 36 is still free at merge |

## 8. Design Conformance

| Decision | Implementation | Result |
|---|---|---|
| DD-1 five entries, `number`, read-only, `lookup` of `level` by `id` | as designed | PASS |
| DD-2 two sources | `lookup-sources.ts` | PASS |
| DD-3 IU explanation on number 5..9, `required_confirmed` unchanged | as designed | PASS |
| DD-4 evidence `required_when` [1..9], no `visible_when`, flags unchanged | as designed for behavior; **text drift**: DD-4 says "`required_confirmed: true` unchanged" for "core ×2, complementary ×2", but the complementary lists are relation subfields with no `required_confirmed` property. Recorded in `execution.md` (LVL-T-2) and in the contract; `design.md` not amended | WARN (W-1) |
| DD-5 current use visible on `core.use_level_number` [1..9] | as designed | PASS |
| DD-6 NULL not stated | as designed | PASS |
| DD-7 2026.36 + change log | as designed | PASS |
| DD-8 regression evaluates the catalog's own condition via the real resolver | as designed; strengthened by the read-plan spec | PASS |
| Step 2.3 guard replacement | asserts the gate exists, has no `visible_when` and targets a `lookup` with `value_column: 'level'` | PASS |

**Cross-document figure check:**

| Figure | Finding | Result |
|---|---|---|
| `design.md` §11 "13 rows — 11 verified, 2 `UNVERIFIED`" | three rows carry `UNVERIFIED`: P-5, P-7 (VS3 half) and P-12 (external QA app). The tally under-counts by one | WARN (W-2) |
| `design.md` §10 budget: 3 tasks / ~260 LOC / 4 review rounds | actual: 3 tasks / ~800 LOC / 3 rounds. The tripwire fired at T-2 and the user accepted the overrun (`execution.md`) | PASS (recorded) |
| "five" new keys (requirements, design, tasks, contract, snapshot) | consistent everywhere (snapshot +5, HEAD diff +5) | PASS |
| P-12 consumer list | missed the version pins in `qa-catalog.service.spec.ts:173` and `qa-catalog.shape.spec.ts:1029`; caught and fixed in T-3 | PASS (recorded) |

**Proposal alignment:** intent ("rules on the level number, as the form") and non-goals (stored values, the `Level_6` service comparisons, client, vocabulary) are respected; the `Level_6` follow-up ticket is still open in `tasks.md` §6.

UI design review: n/a (backend only).

## 9. Test Evidence Summary

`test-report.md`: overall PASS, 1282/1282 tests, no `PRODUCT_BUG`, no flaky test left as evidence. The red-first regression for the P2-3939 case (level 4 stored as row id 5) was observed before the fix. Accepted gaps: no live-DB run, P-5 pending, the deployed VS3 body not re-read, CRLF vs LF snapshot.

## 10. Agent Guide / Constitution Impact

No module created or reshaped and no public module surface changed: catalog data only. No `## Constitution Impact` block, none needed. Pending outside this spec: `akili doctor --agents --fix` on `staging` (`leader.md` primary-instructions outdated).

## 11. Remediation

| ID | Severity | Item | Fix |
|---|---|---|---|
| W-1 | WARN | DD-4 wording claims `required_confirmed: true` on the complementary lists | Amend DD-4: core ×2 keep `required_confirmed: true`; complementary ×2 are relation subfields without that property. Run correction closure: grep `required_confirmed` and "complementary ×2" across the spec folder |
| W-2 | WARN | `design.md` §11 tally says 2 `UNVERIFIED`, there are 3 | Change to "10 verified, 3 `UNVERIFIED` (High 0, Low 3)" |
| W-3 | WARN | P-5 pre-flight open | User runs the `SELECT`, or accepts it as a documented gap (fixtures synthetic; the rule reads `level` whatever the id) |
| W-4 | WARN | DoD boxes unticked in `tasks.md` | Tick the boxes met per `execution.md`; mark the commit box "pending user request" |

## 12. Archive Readiness Recommendation

**Ready after the user accepts or fixes W-1..W-4.** W-1, W-2 and W-4 are small spec-document edits; W-3 is a user check or an acceptance. Commit and PR to `staging` (T-1..T-3 together, revision re-checked at merge) can happen before or after archiving.

```text
/akili-archive bugfix/p2-3939-qa-catalog-level-numbers
```

## 13. Remediation Applied (2026-11-23, user: "Fix W-1, W-2, W-4")

| ID | Change | Closure |
|---|---|---|
| W-1 | `design.md` DD-4 now states that the core lists keep `required_confirmed: true` and the complementary lists have no such property | Forward grep of `required_confirmed` / "complementary ×2" over the spec folder: no other site asserts the old text. Backward: `tasks.md` LVL-T-2 cites DD-4 only conditionally ("If not → …"), still true |
| W-2 | `design.md` §11 tally → "10 verified, 3 `UNVERIFIED` (High 0, Low 3)" | Grep of "11 verified" / "2 `UNVERIFIED`": no other site |
| W-4 | `tasks.md` DoD boxes ticked where `execution.md` shows them met; commit box left `[ ]` marked "pending user request" | — |
| W-3 | Open: P-5 accepted as a documented gap (synthetic fixtures) | — |

**Updated verdict: PASS, with one accepted WARN (W-3). Archive-ready.**
