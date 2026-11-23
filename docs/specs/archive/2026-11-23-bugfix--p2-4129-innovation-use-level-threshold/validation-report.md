# Validation Report — Innovation Use level thresholds on the level number (P2-4129)

**Verdict: PASS with 4 WARN. Ready to archive** once the user accepts the WARNs. There are no FAILs.

The code does what the spec asks:
- All 5 gates compare the level number.
- Every scenario has a test that calls the real service.
- The build, lint and the affected suites are green at `50c1489df`.

The 4 WARNs are about evidence, a pending smoke test and one documentation gap. None is about behaviour.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-4129-innovation-use-level-threshold` |
| Validated at | `50c1489df` (fix `0b71a37e5`), branch `qa-development-2026-ss`; also merged into `performance-refactor` (`5fa1bd8dd`) |
| Date | 2026-11-23 |
| Auditor | Opus 5.5 (T3). The Implementer ran on sonnet, so author ≠ auditor holds |
| Inputs | proposal, requirements, design, tasks, execution. No `test-report.md` (`/akili-test` was not run) |
| New evidence | User DB reads, 2026-11-23: `SELECT id, level FROM clarisa_innovation_use_levels` on PRPROD and PRTEST (screenshots) |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | PASS |
| File existence | PASS |
| Build integrity | PASS |
| Requirement coverage | PASS (1 WARN on evidence) |
| Code quality | PASS (advisories only) |
| Design conformance | PASS (1 WARN, a minor drift that does not change behaviour) |
| Test evidence | WARN (no `test-report.md`; reconstructed mutation counts) |
| Constitution impact | PASS |
| Rollout | WARN (post-deploy smoke pending) |

### What P-5 tells us about real impact

| DB | Layout | Before the fix | After the fix |
|---|---|---|---|
| **PRPROD** | ids 1–10 = levels 0–9 (id = level + 1), no repeats | `id >= 6` ⇔ `level >= 5`, so the explanation and the answer were already right. **Study links were synced and returned from level 5** | Explanation and answer unchanged. Links only from level 6 |
| **PRTEST** | ids 1–10 = 0–9, **13–20 repeat 2–9** | A row 13–20 (levels 2–9) passed every gate: e.g. level 2 kept its explanation and links | Fixed: rows gate on their level |

In prod, the only visible change is to **level-5 results that already have study links**. Those links stop appearing in GET responses as soon as the change is deployed, and are deactivated on the result's next save. The form never shows links below level 6 (`innovation-use-form.component.html:465`), so this matches the UI. The design's reversion challenge, however, only mentions the save side (W-3).

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| ULT-T-1 | `[x]` | `execution.md`: 1 attempt, Leader re-run VERIFIED, Reviewer PASS, every DoD box ticked | PASS |

## 4. File Existence

Paths are under `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/`.

| File (design §4) | Expected | Found | Result |
|---|---|---|---|
| `innovation-use.service.ts` | modified | modified (+60/−8) | PASS |
| `enum/innov-use-levels.enum.ts` | unchanged | unchanged | PASS |
| `innovation-use.service.level-threshold.spec.ts` | new | new (238 lines, 25 tests) | PASS |
| `CLAUDE.md` (module) | +1 line | +1 trap line | PASS |
| Migration or client file | none | none | PASS (NFR-1) |

## 5. Build Integrity

All commands were re-run by the auditor at `50c1489df`, from `onecgiar-pr-server/`.

| Command | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | clean (PASS) |
| `npx eslint "src/api/results-framework-reporting/innovation-use/**/*.ts" --quiet` | clean (PASS) |
| `npx jest src/api/results-framework-reporting/innovation-use src/api/bilateral/handlers/innovation-use.handler.spec.ts src/api/results-framework-reporting/innovation_dev --silent --reporters=summary --forceExit` | `Test Suites: 12 passed, 12 total · Tests: 194 passed, 194 total` (PASS) |

The full server suite was not run, and no boot smoke was done. Neither is needed for a service-internal gate change with no DI, module or schema change.

## 6. Requirement Coverage

Coverage is checked at clause level. The test location is `innovation-use.service.level-threshold.spec.ts`.

| Requirement · scenario / clause | Code | Test | Result |
|---|---|---|---|
| R-1 repeated row at a low level (13/2): explanation `null`, answer `false` | `isLevelAtLeast(number, 5)` on the existing, new-row and retry branches | `describe.each(BRANCHES)` → 13/2 | PASS |
| R-1 `BUT` not kept because the row id is ≥ 6 | gate reads `innovation_use_level_number`, not `innovation_use_level` | 13/2 (id ≥ 6, level < 5); mutations a1–a3 red | PASS |
| R-1 level 5 kept, under any row id | threshold `Level_5` | 6/5 and `{9,'5'}` | PASS |
| R-1 `AND IT MUST` hold on existing, new and duplicate retry | 3 branches changed | `describe.each(BRANCHES)`; retry asserted entered (`save` ×2 + `Duplicate entry` warning) | PASS |
| R-1 level 4 cleared, under any row id | same gate | 5/4 | PASS |
| R-1 no level (NULL): cleared, as today | number stays `null` → "below" | `it('no level (NULL)…')` | PASS |
| R-2 save at 5: no sync, existing URLs deactivated | sync gate `Level_6`; deactivation when `< 6` | 6/5 sync asserted 0 calls; deactivation on existing + retry | PASS |
| R-2 `BUT` must NOT clear `has_scaling_studies` at 5 | the answer is set inside the ≥ 5 block | level-5 describe asserts `has_scaling_studies === true` | PASS |
| R-2 read a repeated row (13/2) → `[]` | `getScalingStudiesUrls` gates on `InnovUseExists.level` (`:888` → `:949`) | read 13/2 | PASS |
| R-2 read level ≥ 6 returns URLs, whatever the id | same | read 5/6 and `'6'` | PASS |
| R-3 storage, API and schema unchanged | `innovation_use_level = use_levels.id` kept | every save case asserts the stored id | PASS |
| NFR-1 no migration, no client change | — | file check | PASS |
| NFR-2 at most 1 extra read per GET | reuses the `ciul.level` join (`results-innovations-use.repository.ts:222`, `:244-245`) | — | PASS |
| NFR-3 number or numeric string | `Number(...)` + `isFinite` | `'5'` (save) and `'6'` (read) | PASS |

**W-1 (evidence):** the mutation reds were executed, but they were not all captured verbatim. For (a1)–(a3), the counts come from an earlier run. For (a4), (b) and (c), the lists were truncated. The Reviewer traced every mutation through the fixtures, and the auditor confirms the trace from the diff: each fixture straddles the threshold the mutation moves. So the risk is low, but the record is weaker than the tasks.md DoD wording implies.

## 7. Linting & Code Quality

The spec gate is PASS. The findings below are advisory (4R) and do not gate.

| Lens | Finding | Source |
|---|---|---|
| Readability | `(innDevExists as any).level` in `getScalingStudiesUrls`. A narrow type (`ResultsInnovationsUse & { level?: number \| string \| null }`) would state the join contract | Reviewer, confirmed |
| Reliability | Save resolves `findOne({ where: { level } })` with no `order`, so on PRTEST it may return id 3 or id 13 for level 2. This no longer matters to the gates: both carry level 2. The stored id may still be either one (pre-existing behaviour, out of scope, ULT-R-3) | Auditor |
| Resilience | `isLevelAtLeast` fails closed (null, undefined or NaN → "below"), so a broken join hides links rather than leaking them | Auditor, positive |
| Risk | In prod, level-5 results with active links disappear from GET when the change is deployed (see §2 and W-3) | Auditor |
| Evidence accuracy | The Implementer's report said the `<6` clause was also added on the new-row branch; the diff does not have it. `execution.md` already records the diff as the truth | Reviewer, carried forward |

## 8. Design Conformance

| Decision | Implementation | Result |
|---|---|---|
| DD-1 resolve `['id','level']`, store the id, keep the number locally | `innovation_use_level_number` | PASS |
| DD-2 thresholds 5 / 6; deactivate links below 6 "inside the same blocks" | existing and retry: yes. New-row block (`:283`): the clause was not added | **WARN W-2**: minor drift with no effect on behaviour. A new row has no id yet, so the deactivation would be an inert update. The record is in `execution.md` |
| DD-3 named thresholds + `@akili-spec` + P2-4129 comment | `EXPLANATION_MIN_LEVEL`, `STUDY_LINKS_MIN_LEVEL` | PASS |
| DD-4 read uses `InnovUseExists.level`, NULL → `[]` | yes | PASS |
| DD-5 `Number(...)`, non-finite → below | `isLevelAtLeast` | PASS |
| DD-6 red-first regression spec on the 3 branches + read | 25 tests; red quoted in `execution.md` | PASS |
| Reversion challenge | Its residual only mentions the next save. In prod (P-5), GET also hides level-5 links right away | **WARN W-3**: the impact statement is incomplete. The behaviour is as specified (R-2 "returned as `[]`") |

**Proposal alignment:** intent, scope and non-goals hold; there is no client, summary-route or readiness-enum change. **Cross-document figures:**
- "4 pairs × 3 branches + 2 read" is consistent with the 25 tests delivered.
- Budget: ~300 LOC against the ~200 estimate. That is under the 320 tripwire and was recorded in `execution.md`.

**Spec corrections made during this validation**, all on P-5 (UNVERIFIED → verified). Correction closure was run as a grep for `UNVERIFIED` and `prod never` over the spec folder, which now finds no hits:
- `design.md` §11: P-5 row, count line, hand-off
- `requirements.md` §4
- `proposal.md` C5, §3 likelihood paragraph, §4 data-layout sentence, OQ-1
- `tasks.md` pre-flight P-5

## 9. Test Evidence Summary

| Source | Status |
|---|---|
| `test-report.md` | Absent. `/akili-test` was not run. The ULT-TEST-1 regression spec was written red-first inside ULT-T-1, and ULT-TEST-2 (existing suites) is green. **WARN W-1** (combined with the mutation-capture gap) |
| Red-first | Quoted in `execution.md`: 15 failed / 10 passed before the fix, all behavioural |
| Consumers | 12 grep hits recorded. The importing suites (handler, innovation_dev, module) are green |

## 10. Agent Guide / Constitution Impact

There is no `## Constitution Impact` block. No module was created, and no boundary or public surface changed. The module `CLAUDE.md` gained its trap line. Pending, outside the spec: `akili doctor --agents --fix` for the outdated `leader.md` section, to run on `staging`.

## 11. Remediation

| ID | Severity | Item | Suggested action |
|---|---|---|---|
| W-1 | WARN | Mutation reds not all verbatim; no `test-report.md` | Accept, or run `/akili-test` to capture one mutation per gate with full summaries |
| W-2 | WARN | DD-2 `<6` clause absent on the new-row block | Accept as is (no effect on behaviour), or add the clause for symmetry |
| W-3 | WARN | The reversion challenge omits the immediate GET effect on prod level-5 results that have links | Size it in prod: `SELECT COUNT(DISTINCT riu.result_innovation_use_id) FROM results_innovations_use riu JOIN result_scaling_study_urls u ON u.result_innov_use_id = riu.result_innovation_use_id AND u.is_active = 1 WHERE riu.is_active = 1 AND riu.innovation_use_level_id = 6;` (id 6 = level 5 in prod). If it is 0, close; otherwise tell the PO. **Closed 2026-11-23: the user ran it on PRPROD and PRTEST → 0** (no prod result loses links; on PRTEST the query covers row id 6 only, not the repeated id 16) |
| W-4 | WARN | Post-deploy smoke (tasks §6) not done | Save a level-5 and a level-4 result on PRTEST after deploy |
| A-1 | advisory | `as any` on the read | Optional follow-up; not in this spec |

## 12. Archive Readiness Recommendation

**Ready to archive** once the user accepts W-1..W-4 or acts on them. W-3's count query is the one worth running before archive, because it is the only item that measures real user impact.

```text
/akili-archive bugfix/p2-4129-innovation-use-level-threshold
```
