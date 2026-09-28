# Design — Phase replication keeps the lead Centre / lead partner

## 1. Summary

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3228-lead-center-replication` · Lite · Bug Mode |
| Requirements | `requirements.md` (VER-R-1..4) |
| Approval Mode | gated |
| Cross-refs | `docs/trd/trd.md` §W2 Phase rollover · PRD AC-5 |

The fix carries existing lead columns through the SQL that phase replication runs: `insertQuery` in three `createQueries` implementations. Tests assert column-to-value alignment on each one. A separate idempotent SQL script, delivered in this folder, repairs versions that were already replicated. No schema, read-query, API or client change.

## 1A. Premise Ledger

| # | Premise | How verified | Status | If false |
|---|---|---|---|---|
| VER-P-1 | The lead columns already exist in the schema | Migration `1726237747587-addingLeadPartnerOrCenter` adds `results_center.is_leading_result`, `results_by_institution.is_leading_result`, `result.is_lead_by_partner`; the prtest query on 9073 returns `is_leading_result` | verified | A migration becomes necessary, so re-specify at Full depth |
| VER-P-2 | Replication in versioning runs `insertQuery`, not `findQuery` | `replicable-repository.ts:37-60`: `findQuery` runs only with `config.f.custonFunction`; the configs at `versioning.service.ts:311` and `:651` pass no `f` | verified | The fix would still hold, because `findQuery` is updated too (DD-2) |
| VER-P-3 | Both replication paths (`versionProcess` V1, `versionProcessV2` → reporting tool + `POST /api/bilateral/version`) replicate through the same repositories | `versioning.service.ts:279/394-395` and `:622/687-688` | verified | Another path would need its own fix |
| VER-P-4 | The source copy loses the flag at replication, not later | 9073: row created `15:34:48` (the rollover) with `is_leading_result = NULL`; the 2025 row has `1` | verified | Look for a later writer that nulls it |
| VER-P-5 | Two versions of one `result_code` are ordered by their phase | `version` has `phase_year`; phase ids differ by environment (memory `project_phase_ids_env_difference`) | assumed — the repair orders by `phase_year`, then `version.id` | The repair could pick the wrong source; the dry-run exposes this before the `UPDATE` |

## 2. Architecture Overview

`VersioningService.versionProcess*` → `ResultRepository.replicate` (new `result` row) → per-child `replicate` (`ResultsCenterRepository`, `ResultByIntitutionsRepository`, …) → `ReplicableRepository.replicate` executes `insertQuery` as one `INSERT … SELECT` from the source rows. The change stays inside those three SQL strings.

## 3. Data Model Changes

None. No entity, migration or CLARISA change (VER-P-1).

## 4. API Surface

No endpoint or payload change. `POST /api/bilateral/version` and the reporting tool phase change inherit the fix. The bilateral payload contract is untouched, so there is no change-log entry.

## 5. Server Workflow / Business Rules

| Repository | Change | Req |
|---|---|---|
| `results-centers.repository.ts` `createQueries` | Add `is_leading_result`, `from_toc`, `from_cgspace` to the `insertQuery` column list and the matching `rc.<col>` to its `SELECT`, at the same position; same columns in `findQuery` | VER-R-1 |
| `result_by_intitutions.repository.ts` `createQueries` | Add `is_leading_result` to `insertQuery` (columns + `rbi.is_leading_result`) and to `findQuery` | VER-R-2 |
| `result.repository.ts` `createQueries` | Add `is_lead_by_partner` to `insertQuery` (columns + `r2.is_lead_by_partner`) and to `findQuery`; placed before `is_replicated`, leaving `status_id` and the `external_*` six as they are | VER-R-3 |

Values are copied verbatim, so `NULL` stays `NULL` and `0` stays `0` (VER-S-1.2). Nothing is derived or promoted.

**Repair script** (`repair-lead-flags.sql` in this spec folder, VER-R-4). For each active result **in the 2026 phase** (`version.phase_year = 2026`, VER-OQ-1) whose immediately previous active version (same `result_code`, previous by `phase_year` → `version.id`) had a lead:
1. **Dry-run `SELECT`** listing the target rows (result code, new id, source id, centre/institution) and the counts.
2. `UPDATE results_center` sets `is_leading_result = 1` on the new version's active row with the same `center_id`, **only when the new version has no active lead centre**.
3. The same for `results_by_institution`, matched by `institutions_id` + `institution_roles_id`, only when the new version has no active lead institution. `result.is_lead_by_partner` is copied only when the new value is `NULL`.
4. A re-run returns 0 affected rows, because every guard is "no lead yet".

Nothing is overwritten where the new phase already has a lead (VER-S-4.1). Juan David runs it, not the agent.

## 6. Frontend Plan

None. The grid (`result.repository.ts:771-776`) and the form (`rd-partners.service.ts:295-297`) already read `is_leading_result` correctly.

## 7. Security & Authorization

No change. Side effect: `bilateral-versioning.service.ts:151-163` ownership via lead Centre works again for results replicated after the fix, or repaired by the script.

## 8–9. Performance · Observability

Three extra columns in a single-row-set `INSERT … SELECT`, so the cost is negligible. No new logging.

## 10. Testing Plan

| Test | File | Proves | Red on today's code? |
|---|---|---|---|
| Alignment + presence for `results_center` | `results-centers.repository.spec.ts` (new) | VER-S-1.1 alignment, S-1.2 verbatim copy | Yes: `is_leading_result` is absent from the column list |
| Alignment + presence for `results_by_institution` | `result_by_intitutions.repository.spec.ts` (extend) | VER-S-2.1 | Yes |
| `is_lead_by_partner` + existing columns unchanged | `result.repository.spec.ts` (extend the P2-3663 block) | VER-S-3.1, D3 | Yes |
| Existing alignment test for `result` | already there | D2 on `result` | — (stays green) |

**What these tests cannot prove:** that MySQL accepts the SQL and writes the value (there is no local DB, per defect class D2/D4). This is covered by the UAT check in `requirements.md` §8 D4.

## 11. Backwards Compatibility & Rollout

The change is additive to the SQL. Merge to the prtest branch deploys automatically (memory `project_deploy_is_automatic_on_merge`). Order: merge → UAT D4 → Juan David runs the repair (dry-run, then `UPDATE`). Rollback means reverting the commit; the repair only sets flags that were `NULL`, and its dry-run output is the record of what changed.

## 12. Design Decisions

### VER-DD-1 — Fix at the copy, not at the read
Carry the flags in replication. Rejected: an `is_primary` fallback in the grid, because on 9073 `is_primary = 0` so it does not help, and it leaves completeness and ownership still broken. Also rejected: a post-replication fix-up in `VersioningService`, because it adds a second write path that only covers the callers that remember it.

### VER-DD-2 — Update `findQuery` too, although it is not executed today
It keeps both lists of the same `createQueries` consistent (VER-P-2). A future caller passing `custonFunction` must not reintroduce the bug.

### VER-DD-3 — Extract the P2-3663 `insertLists` parser into a shared spec helper
The alignment check is the gate for defect class D2, and it is needed for three tables. The helper takes the table name and the source alias, since today's regex is hard-wired to `` `result` r2 ``. It lives next to the replication base as a non-spec test helper, and the P2-3663 block switches to it. Rejected: three copies of ~40 lines.

### VER-DD-4 — Carry `from_toc` / `from_cgspace` in the same change
Same table, same defect, same test. `from_toc` drives the Centre/ToC mapping notice in Contributors, and `from_cgspace` locks KP centres. Not carrying them silently resets provenance. Low risk: copied verbatim.

**Reversion challenge (Step 2.3):** not triggered. Every DD adds, and nothing already shipped is removed or inverted.

## 13. Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 2 (T-1 code + regression tests · T-2 repair script) |
| LOC | ~15 production · ~110 test (helper ~45 + three blocks) · ~70 SQL |
| Review rounds | 1 |

Exceeding 3 tasks, ~250 LOC, or 2 review rounds → stop and escalate.

## 14. Open Gaps

- VER-P-5 is `assumed`; the repair's dry-run is where it gets checked.
- ~~VER-OQ-1 (repair scope)~~ resolved 2026-09-22: target versions are limited to `phase_year = 2026` (user decision at the VER-T-1 gate).
