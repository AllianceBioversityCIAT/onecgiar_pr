# Tasks — "Contributing to W1/W2" counts 2026 P/A results only (WCO)

## 1. Scope of this task list

- **Module / feature:** Portfolio Overview, W3/Bilateral projects block, "Contributing to W1/W2"
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Owner:** Santiago Sanchez
- **Status:** closed, not implemented (2026-11-23). The premise was refuted by PROD data. This is a data question for the reporter, not a code change. See the T-2 outcome below

> **WCO-T-2 outcome (PROD, read-only, run by the user on 2026-11-23):** `rows_flag_null` = 0, `projects_with_replicated` = 2, `projects_with_2026_new` = 147. By type: Other output (8) = 139 projects from 2 results; innovations replicated from 2025 touch only 2 projects. 138 projects come from **one** result: 34792 (code 31436, "Integrating CGIAR innovations in public large-scale investments. Lead Center: IITA…", SP09, Editing, created 2026-11-17). Its 138 project links were all created within one second by one author. The other one is 34640 "Test Result" (SP01, 1 project). So excluding `is_replicated` would not change the KPI (147 → ~145-147). **Pivot:** WCO-T-1 is not executed until the counting rule is defined with Nicoleta.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-23)
- [x] `design.md` approved (2026-11-23)
- [ ] Local `qa-development-2026-ss` fast-forwarded to `origin` (`04aec7e57` or later). Today it is 3 commits behind
- [ ] OQ-1 (all replicated vs innovations only): proceeding with "all" (proposal recommendation)
- [x] No migration
- [x] Conflicting spec: `changes/portfolio-graphs-clarity` touched the same method and is already on origin; build on it

## 3. Task list

### WCO-T-1 — Exclude replicated pooled results from `has_w1w2`

- **Status:** [ ]
- **Size:** XS
- **Depends on:** pre-flight pull
- **Implements:** WCO-R-1 (WCO-S-1, WCO-S-2, WCO-S-3), WCO-NFR-1, WCO-NFR-2
- **Design:** §3, §4, DD-1, DD-2, DD-3; Premise Ledger P-1, P-2, P-4, P-5, P-6
- **Scope:**
  - `clarisa-projects.repository.ts`: in the `has_w1w2` `EXISTS`, add `AND (r.is_replicated IS NULL OR r.is_replicated = 0)` as a literal (no new bind). Update the method doc comment to say W1/W2 excludes results replicated from an earlier phase (INC-169059).
  - `clarisa-projects.repository.spec.ts`: new test `excludes replicated results from the W1/W2 probe only`. Slice the `has_w1w2` block (same slicing as `applies no status filter to the W1/W2 probe`), assert it contains the NULL-safe predicate, and assert the whole SQL contains `is_replicated` exactly once (so it is not in `has_bilateral` or the named-P/A probe). The existing bind-order, `?`-count (12), `r.is_active` (4) and `r.status_id` (4) tests stay unchanged and green.
  - `portfolio-overview/CLAUDE.md`: one line next to the projects-block entry: "Contributing to W1/W2" counts pooled results of the page version that were not replicated from an earlier phase (`is_replicated` 0/NULL), `[SPEC:changes/w1w2-contributors-2026-only]`.
  - Backend route: lead `nestjs-expert`; stack `nestjs-expert`; test-first not assigned.
- **Not in scope:** `has_bilateral`, status filters (DD-3), DTO, service, client code.
- **Tests / Verification** (server dir, `--maxWorkers=2`, scoped):
  - `npx jest --maxWorkers=2 --silent --reporters=summary src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts`
  - `npx jest --maxWorkers=2 --silent --reporters=summary --findRelatedTests src/clarisa/clarisa-projects/clarisa-projects.repository.ts`
  - `npx eslint src/clarisa/clarisa-projects/clarisa-projects.repository.ts src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts --quiet`
  - `npx tsc --noEmit -p tsconfig.json`
- **Falsifier:** (a) remove the predicate from the repository: the new test goes red on the `toContain` of the `has_w1w2` slice. (b) Move the predicate into `has_bilateral` instead: the slice assertion is red, while the "exactly once" count alone would stay green, which is why both asserts exist. (c) Write it as `r.is_replicated = 0` (not NULL-safe): the slice `toContain` of the full NULL-safe text is red.
- **Red run:** baseline observed 2026-11-23: `git show origin/qa-development-2026-ss:onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts | grep -c is_replicated` → `0`. So the new test must fail on the substring assertion before the repository edit. The Implementer writes the test first and quotes the Jest `Expected substring` failure verbatim in `execution.md`. A red from setup or an import error does not count.
- **Disqualifier:** a green test that does not slice the `has_w1w2` block (whole-SQL `toContain` passes even with the predicate in the wrong probe), or any change to the bind array or `?` count. Either means the evidence does not prove WCO-S-3.
- **Consumers:** `clarisa-projects.repository.spec.ts` (edited); `results-framework-reporting.service.spec.ts` (mocks `hasW1w2` rows, so meaning unchanged; covered by `--findRelatedTests`); `portfolio-overview/CLAUDE.md` (guide line). No client reader (P-5).
- **Review:** checklist. One SQL predicate and its spec; no shared symbol shape change.
- **Done criteria:** the 4 verification commands are green; the red run is quoted in `execution.md`; falsifier (a) was executed after the change and went red, then was restored; `git diff --stat` shows only the 3 files above.
- **Skills:** `nestjs-expert`

### WCO-T-2 — Confirm the replicated flag and the expected count in PROD (manual)

- **Status:** [ ]
- **Size:** XS
- **Depends on:** none (can run before T-1; settles P-3)
- **Implements:** the real-count defect class (`requirements.md` §7); Premise Ledger P-3
- **Scope:** the user runs the read-only PROD pre-check from `proposal.md` §11 in DBeaver and pastes the three numbers. Claude does not connect to the DB.
- **Tests / Verification:** `rows_flag_null` = 0 and `projects_with_replicated` > 0. After deploy (PRTest, then PROD), the tile reads lower than before and close to `projects_with_2026_new` restricted to mapped projects.
- **Falsifier:** `rows_flag_null` > 0 among replicated rows, or `projects_with_replicated` = 0 while the tile drops. Either way the flag is not the right marker, so stop and pivot to option B (`design.md` DD-1).
- **Red run:** n/a (manual data check, no test gate)
- **Disqualifier:** the numbers were taken on TEST, or without the `source = 'Result'` / 2026 version filter. Such numbers are not PROD evidence.
- **Consumers:** none (no shared symbol changed)
- **Review:** skip-eligible. Read-only data check owned by the user; nothing to diff.
- **Done criteria:** the three numbers are recorded in `execution.md` with environment and date; P-3 is marked settled or the Pivot is raised.
- **Skills:** none

## 4. Coverage

| Clause | Task |
|---|---|
| WCO-S-1 THEN (not counted) | T-1 (slice asserts predicate) |
| WCO-S-1 BUT (Mapped / With W3 unchanged) | T-1 ("exactly once" + `has_bilateral` untouched) |
| WCO-S-2 THEN + AND IT MUST (NULL = new) | T-1 (falsifier c) |
| WCO-S-3 (other probes untouched, binds same) | T-1 (exactly-once count + existing bind/`?` tests) |
| WCO-NFR-1 / NFR-2 | T-1 (no-interpolation test, no DTO change) |
| Real-world count | T-2 |
