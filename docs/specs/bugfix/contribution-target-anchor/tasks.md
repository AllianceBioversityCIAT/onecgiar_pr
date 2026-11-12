# Tasks — `bugfix/contribution-target-anchor`

| Field | Value |
|---|---|
| Depth | Lite · Bug Mode |
| Approval Mode | gated |
| Budget | 2 tasks · ~280 LOC (40 code / 160 tests / 80 SQL) · 1–2 review rounds per task |
| Test rule | Jest **always** `--maxWorkers=2`, scoped (`--testPathPattern` / `--findRelatedTests`); one test run on the machine at a time; no commits without explicit user go-ahead |

## Coverage map

| Clause | Task |
|---|---|
| CTA-R-1 / CTA-S-1 (anchor = 333606, row count unchanged — `BUT`) | T-1 (CTA-TEST-1) |
| CTA-S-2 (ambiguous → NULL + warn — `BUT must NOT pick`) | T-1 (CTA-TEST-2) |
| CTA-S-3 (existing anchor kept) | T-1 (CTA-TEST-3) |
| CTA-R-2 / CTA-S-4 (foreign id ignored; valid own id still accepted — `AND IT MUST`; empty catalog keeps own id — `BUT`) | T-1 (CTA-TEST-4a/4b/4c) |
| CTA-DD-3 (fallback-to-all-years list does not anchor to another year) | T-1 (CTA-TEST-5) |
| CTA-R-4 (TTD unchanged) | T-1 (existing TTD-TEST-1…4 green) |
| CTA-NFR-1 (no extra query) | T-1 (query-count assertion in CTA-TEST-1) |
| CTA-NFR-2 (no API/migration change) | T-1 Done (diff touches only the two files) |
| CTA-R-3 / CTA-S-5 (preview, backup, unique-only UPDATE, active COMMIT, fresh-tab check, ambiguous listed — `BUT`; PROD label — `AND IT MUST`) | T-2 |
| P-8 (UNVERIFIED, High) | T-1 first step |
| P-12 (UNVERIFIED, Low) | T-2 (preview SELECT at HITL) |

---

## T-1 — Server: resolve the anchor from a unique phase-year meta; reject a foreign own id

| Field | Value |
|---|---|
| Status | [x] done (2026-11-12, PASS — see execution.md) |
| Size | S |
| Depends on | — |
| Requirements | CTA-R-1, CTA-R-2, CTA-R-4, CTA-NFR-1, CTA-NFR-2 |
| Design | Backend Module Design (resolution order), CTA-DD-1…DD-6, P-1…P-11 |
| Skills | `nestjs-expert`, `tdd`, `systematic-debugging` |
| Review | `full` — shared writer with 12 call sites (P-7); identity rule feeds every KPI Achieved figure |

**Scope**

- `Backend route: nestjs-expert (repository logic) · test-first (tdd)`
- **First step — settle P-8:** trace what IPSR (`results-package-toc-result.service.ts:299,304`) and share-request (`share-result-request.service.ts:2199`) put in `targets[].toc_indicator_target_id`. Record the finding in `execution.md`. If any caller can send an id of another year → **stop, Pivot** (DD-2 must widen).
- `results-toc-results.repository.ts` · `resolveTargetIdentity` only:
  - step 1 accepts the own id only when it is among `catalogMetas`, or when `catalogMetas` is empty (DD-2);
  - new step 4: if `phaseYear != null` and exactly one meta has `target_date === phaseYear`, return its id with `identityResolved: false` (DD-1, DD-3, DD-4);
  - when step 4 sees ≥ 2 phase-year metas, `warn` log with result id, indicator node, candidate count (DD-6) — the method needs those two ids passed in, or the warn is emitted at the two call sites; pick the smaller diff and record it.
- `results-toc-results.repository.spec.ts` · new `describe('… CTA (bugfix/contribution-target-anchor)')` reusing the TTD harness (P-10).

**Tests**

| ID | Fixture | Assert |
|---|---|---|
| CTA-TEST-1 | catalog for phase year 2026 = one meta `{333606, 6, 2026}`; payload target `{ contributing_indicator: 1 }`; no stored row | inserted row has `toc_indicator_target_id = 333606`, `contributing_indicator = 1`, `number_target = 6`, `target_date = 2026`; exactly one `save`; catalog read called once (NFR-1) |
| CTA-TEST-2 | catalog 2026 = two metas `{333606,6}`, `{333699,6}`; same payload | row saved with `toc_indicator_target_id = null`; `warn` called once with the candidate count 2 |
| CTA-TEST-3 | stored row with anchor `333000`, catalog one meta `333606`, payload `{ contributing_indicator: 2 }` | update keeps `333000` |
| CTA-TEST-4a | catalog `{333606}`; payload `{ toc_indicator_target_id: 999999, contributing_indicator: 1 }` | stored anchor `333606` (fell to step 4), never `999999` |
| CTA-TEST-4b | catalog `{333606}`; payload own id `333606` | stored `333606`, `identityResolved` path = step 1 (unchanged TTD) |
| CTA-TEST-4c | catalog empty; payload own id `555` | stored `555` (today's trust kept) |
| CTA-TEST-5 | catalog list = all-years fallback `{2027: 333607}` only, phaseYear 2026 | stored anchor `null` |

**Verification**

```bash
cd onecgiar-pr-server
npx jest src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts --maxWorkers=2 --silent --reporters=summary --forceExit
npx jest --findRelatedTests src/api/results/results-toc-results/repositories/results-toc-results.repository.ts --maxWorkers=2 --silent --reporters=summary --forceExit
npx tsc --noEmit -p tsconfig.json
npx eslint src/api/results/results-toc-results/repositories/results-toc-results.repository.ts src/api/results/results-toc-results/repositories/results-toc-results.repository.spec.ts --quiet
```

| Field | Value |
|---|---|
| Falsifier | Revert `resolveTargetIdentity` to `5d9ba6729` → CTA-TEST-1 fails on `toc_indicator_target_id` (`null` vs `333606`) and CTA-TEST-4a fails (`999999` stored). Mutation "count `catalogMetas.length === 1` instead of phase-year metas" → CTA-TEST-5 red. Mutation "step 4 returns `identityResolved: true`" → must be caught by an assertion that a second identity-less target in the same save is still skipped/inserted exactly as TTD-TEST-2 expects (add to CTA-TEST-1 fixture if TTD cases do not cover it) |
| Red run | predicted — greenfield artifact (observed in T-1). T-1 must run CTA-TEST-1…5 against the unchanged `resolveTargetIdentity` first and quote the failing assertion lines verbatim in `execution.md` before writing the fix; a red from setup/mocks is not a red |
| Disqualifier | A green where the catalog mock is never consulted, or where the TTD suite count drops (28 `it(` today, P-10) — evidence void; report it |
| Consumers | Test files: `results-toc-results.repository.spec.ts` (TTD-TEST-1…4, P2-3608, BIL-RTE), plus whatever `--findRelatedTests` lists. Design-time readers (P-9): `aow-bilateral.repository.ts`, `existing-result-contributors-loader.service.ts`, `bilateral-center.service.ts`, `results-framework-reporting.service.ts`, `results-framework-reporting.controller.ts`, `results-toc-results.service.ts`, `qa-catalog/definitions/not-for-qa.ts`, `qa-catalog/values/lookup-sources.ts` — read-only, no change expected |

**Done criteria**

- P-8 settled and recorded; no Pivot or Pivot raised.
- CTA-TEST-1…5 red quoted, then green; TTD and P2-3608 cases green and count unchanged.
- `tsc` clean; eslint clean on the two files.
- Diff touches only the repository and its spec (NFR-2).

---

## T-2 — PROD backfill script (hand-off, not executed by agents)

| Field | Value |
|---|---|
| Status | [x] done 2026-11-12 — PROD backfill 46/46 + KPI Achieved 1 in app (see execution.md) |
| Size | S |
| Depends on | T-1 (same rule, so code and data agree) |
| Requirements | CTA-R-3 |
| Design | CTA-DD-3, CTA-DD-7, P-11, P-12 |
| Skills | `systematic-debugging` |
| Review | `checklist` — no code path; correctness is the user's preview review |

**Scope**

- Write `docs/specs/bugfix/contribution-target-anchor/backfill-prod.md`, then paste each block inline for the user, each headed **PROD · read-only** or **PROD · write**:
  1. Preview SELECT (read-only): every active rit row, NULL anchor, contribution not null, result phase year 2026 → result code, status, rit id, node, count of phase-year metas, resolved anchor (only when count = 1).
  2. Backup (write): `CREATE TABLE bkp_rit_anchor_<yyyymmdd> AS SELECT …` of exactly the rows in (1).
  3. UPDATE (write): set `toc_indicator_target_id` only where phase-year meta count = 1, joined to the backup set; `last_updated_date` refreshed, `last_updated_by` = the user's admin id (ask, do not guess).
  4. Active `COMMIT;` (never commented).
  5. Verification SELECT to run from a **fresh tab**: remaining NULL rows (should equal the ambiguous count from 1) + row 25057 anchor = 333606.
  6. Ambiguous list (read-only): rows with ≥ 2 metas, with candidate ids and centres, for a manual decision.
- ToC schema name `Integration_information` (user-confirmed in the 2026-11-12 SELECT).

**Verification**

- Manual at HITL: user runs (1) and confirms the counts before (2)–(4); after (4) runs (5) in a new tab.

| Field | Value |
|---|---|
| Falsifier | Fixture row with two 2026 metas (if (1) shows none, the user picks any indicator with two metas for a dry-run SELECT) → must appear in (6) and never in the UPDATE's affected set; (5) remaining-NULL ≠ ambiguous count → backfill failed |
| Red run | n/a — SQL is executed by the user in PROD; the "red" is (1) showing 58 NULL rows before |
| Disqualifier | UPDATE affected-rows count ≠ count of `meta_count = 1` rows in (1) → stop, do not commit (roll back) |
| Consumers | none in code; read side picks the anchors up automatically (P-9) |

**Done criteria**

- `backfill-prod.md` exists; blocks pasted inline with environment labels.
- User confirms preview counts, executes, and reports (5); KPI 9378 row shows Achieved 1 (PROD, human check).
