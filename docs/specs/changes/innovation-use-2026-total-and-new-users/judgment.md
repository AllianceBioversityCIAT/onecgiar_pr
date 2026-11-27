# Judgment Day — design.md (round 1)

| Field | Value |
|---|---|
| Target | `design.md` + `requirements.md` + `proposal.md` v2 at `093655d2c` |
| Mode | judgment_day, two blind read-only judges (Sonnet, ≠ author model Opus) |
| Date | 2026-11-25 |
| Round | 1 (findings frozen below) |

## Frozen ledger

| ID | Judges | Severity | Finding | Settlement |
|---|---|---|---|---|
| JD-1 | B (B-1, B-2) | **severe** (one judge, suspect) | The organization stop-copy and the cleanup filter only on `section_id`. `results_by_institution_type` also holds partner rows (roles 1/2) of the same result, so these would be dropped. Innovation Use organizations are role 5 | **Confirmed by the architect's re-run:** `result_by_intitutions_type.repository.ts:31-80` copies every role without a filter; `:155,:181` read roles 1/2; `innovation-use.service.ts:466,594,761,1033` write role 5 |
| JD-2 | A-1, B-6 | warning (both) | DD-6 does not protect the data: `innovation-use-info.component.ts:511-512` and W3 `:957-958` send `?? null`, so the key is present; the component is missing from §6.1 and the ledger | — |
| JD-3 | A-2, B-5 | warning (both) | DD-3 unifies the row rule to "NULL or ≠ 2", but the v2 caller uses section = 1 only; a per-caller pick is needed. The P-9 path/range is imprecise | — |
| JD-4 | A-3, B-4 | warning (both) | P-17 "31 files" does not reproduce (30, 3 of them this spec's docs); the docs readers are not listed | — |
| JD-5 | A-4, B-3 | warning (both) | §1 says "five tables", §2/§3 list six | — |
| JD-6 | A-5, B-7 | warning (both) | No row for the single funnel `$_phaseChangeReporting` (incl. the annual cron `annualReplicationProcessInnovationUse`); `ReplicableConfigInterface` lacks `phase_year` | — |
| JD-7 | A-6, B-2 | warning (both) | Cleanup SQL contract incomplete: section predicate, status filter (exclude status 4), role 5, NULL sections, `is_active` multiset rule, stale green-check state, post-deploy guard | — |
| JD-8 | A-7, B-9 | warning (both) | The bilateral API MDS validator reads `summaryService.getInnovationUse` (`innovation-use-mds-validator.service.ts:46`); no row covers it ignoring the new fields or its outcome on a `/version` copy without actors | — |
| JD-9 | B-8 | warning (one) | The source of the IPSR step 3 phase year has no row | — |
| JD-10 | A-8 | suggestion | State that the IPSR `:743/:749/:793` copies (package-level) stay untouched | info |
| JD-11 | A-9 | suggestion | `results-framework-reporting/innovation-use/CLAUDE.md` is stale on replication; fix at archive | info |
| JD-12 | A-10, B-10 | info | P-18/P-19 not refutable; budget and count line consistent | info |

Counts: confirmed severe 1 (JD-1, settled by source re-run) · warnings 8 · suggestions/info 3 · contradictions 0.

Round-1 decision: user chose **Fix and Re-judge** (2026-11-25). Fix delta = design.md rev 2 + requirements R-9/R-10 partner clauses.

## Scoped re-judgment 1 (both judges, Sonnet)

JD-1, JD-3..JD-7 and JD-9 resolved (JD-7 with gaps below). New findings from the fix:

| ID | Judges | Severity | Finding | Fix in rev 3 |
|---|---|---|---|---|
| JD-13 | RA-1, RB-1 (both) | **severe** | The DD-6 server guard was not phase-gated, so pre-2026 users could no longer clear `new_users_added` / the narrative | Guard only for `phase_year >= 2026`; a pre-2026 test where null still clears |
| JD-14 | RB-2 (severe), RA-2 (warning) | severe/warning | P-23 misstated the validator: it also reads measures (an error only when measures exist and none is complete) and investments; JD-8 not fully resolved | P-23 reworded; change-log text and the §10 test state the measures/investments outcome |
| JD-15 | RA-3 | warning | Legacy `results_innovations_use_measures` was left out of the cleanup without a decision | Architect re-run: it feeds the bilateral GET and the section-7 report (P-26). DD-11 leaves it as today in both the copy and the cleanup |
| JD-16 | RB-4, RB-5, RA-4 | warning/suggestion | Org filter must be in both the find and insert queries, NULL-safe; "qualifying result" ambiguous; previous-result join not named | §5.2 and §5.5 rewritten |
| JD-17 | RB-3 | warning | P-24 cited docstring lines | Cites `:101` |

Round 2 = design.md rev 3.

## Scoped re-judgment 2 (final, both judges)

JD-13..JD-17 resolved (both judges). No severe finding. Info only, applied by the architect without changing any decision:

| ID | Judges | Severity | Finding | Applied |
|---|---|---|---|---|
| FA-1 / FB-1 | both | warning | P-26 count "8 files" did not reproduce with the broader pattern (12) | Re-run by the architect: 12 files with the files listed by role |
| FA-2 | A | suggestion | P-10 `:121-122` is destructuring | Citation narrowed |
| FB-2 | B | suggestion | Under the 2026 guard, an emptied narrative must be sent as `""` | §5.3 states it; task test |
| FB-3 | B | suggestion | The MDS error depends on the copied TBD value | §11 wording |

Counts: rounds used 2/2 · severe confirmed 2 (JD-1, JD-13), both resolved · contradictions 0.

JUDGMENT: APPROVED ✅
