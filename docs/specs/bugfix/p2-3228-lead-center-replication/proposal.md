# Proposal — Phase replication drops the lead Centre / lead partner

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3228-lead-center-replication` |
| Slug | `p2-3228-lead-center-replication` — derived (command invoked without argument); routed to `bugfix/` per the Bug Track taxonomy |
| Type | Bug |
| Approval Mode | gated |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-22 |
| Jira | [P2-3228](https://cgiarmel.atlassian.net/browse/P2-3228) (To Be Improved) — UAT comment by Cristian Gamboa, 2026-09-22 |
| Branch | `JuanGuzman-io/fix-p2-3228-result` (contains `origin/performance-refactor`) |
| Depends on | none |
| Parallel-safe | yes — server-only; touches three replication repositories, no migration, no API contract |
| Related | `bugfix/p2-3652-bilateral-versioning-guard-dead-branch`, TRD §W2 Phase rollover (Versioning), P2-3228 implementation note (six-column fix in `result.repository.ts`) |

## 2. Intent

A result carried into a new phase must keep who leads it. Today the lead flag is lost on every phase change, so the Results Center shows `—` in the Center column for the new version.

## 3. Problem / Current Behavior

UAT (Cristian Gamboa, 2026-09-22, result **9073**): after the 2025 → 2026 rollover through the bilateral API, the Results Center grid (`/result/results-outlet/results-list`) shows the 2025 row with Center `Bioversity (Alliance)` and the 2026 row with `—`.

## 4. Bug Diagnosis

### Observed Symptom

The current-phase version of a replicated result has no lead Centre in the Results Center grid. Nothing errors.

### Reproduction Steps

1. In prtest, take an approved 2025 result with a lead Centre (9073, `CENTER-02`).
2. Carry it to 2026 (`POST /api/bilateral/version`, or "Update result" in the reporting tool).
3. Open the Results Center and filter by code 9073, both phases.
4. **Expected:** both rows show the lead Centre. **Actual:** the 2026 row shows `—`.

Data captured on prtest, 2026-09-22 (`id` = `result.id`):

| result | version | center | `is_leading_result` | active |
|---|---|---|---|---|
| 11541 | 34 (2025) | CENTER-02 | **1** | 1 |
| 11545 | 36 (2026) | CENTER-02 | **NULL** | 0 (deactivated 16:55:19) |
| 12026 | 36 (2026) | CENTER-02 | **NULL** | 1 (created 16:55:25) |

Both 2026 copies came out without the flag.

### Root Cause (confirmed)

Replication copies an explicit list of columns, and the lead flags are not in it:

| Repository | Replication query | Missing column |
|---|---|---|
| `results-centers/results-centers.repository.ts:22-62` | `findQuery` / `insertQuery` into `results_center` | `is_leading_result` (also `from_toc`, `from_cgspace`) |
| `results_by_institutions/result_by_intitutions.repository.ts:41-64` | `insertQuery` into `results_by_institution` | `is_leading_result` |
| `results/result.repository.ts:100-230` | `insertQuery` into `result` | `is_lead_by_partner` |

The grid needs exactly that flag. `AllResultsByRoleUserAndInitiativeFiltered` (`result.repository.ts:771-776`) joins `results_center ... AND rc.is_leading_result = 1`. When nothing matches, `lead_center` is NULL and the grid renders `—`.

The flags were added in migration `1726237747587-addingLeadPartnerOrCenter`. The replication queries were never updated. It is the same class of defect as the six origin columns fixed earlier in P2-3228.

### Impact & Scope

- **Every phase change, not only bilateral.** The replication config is shared by the reporting tool's manual phase change and `versionProcessV2`, W1/W2 included.
- **Results Center grid:** Center column empty, and the lead-centre filter (`results-list-filter.pipe.ts:40`) drops the result.
- **Basic report:** its lead-centre filter requires `is_leading_result = 1` (`result.repository.ts:966`), so the result disappears from filtered exports.
- **Contributors section completeness:** Lead center is required (`[required]="true"`), so the new version starts with the section incomplete. This matches Cristian's screenshot (section not green).
- **Next rollover (2026 → 2027) through the API:** ownership falls back to the lead Centre when the result has no originating platform (`bilateral-versioning.service.ts:151-163`). With no flag, it answers 403 "neither an originating platform nor a lead centre".
- **Lead partner:** results led by a partner lose both `is_lead_by_partner` and the institution's `is_leading_result`.
- **Existing data:** every result versioned since the migration is affected, and needs a data repair.

### Fix Strategy

The fix changes replication logic and requires a data repair, so it is not cosmetic. Route: `/akili-specify` (Lite) in **Bug Mode**, with a regression test that fails on the current queries and passes once the columns are carried.

## 5. Proposed Outcome

- A replicated result keeps its lead Centre or lead partner, identical to the source phase.
- The Results Center grid, lead-centre filters and section completeness behave for the new version as they did for the source.
- Already-versioned results get their lead flags back through a one-off, idempotent SQL script. Juan David runs it.

## 6. Scope

- Carry the existing lead columns in the column lists of the three replication queries (listed in §4). The columns already exist in the schema; nothing is added to any table.
- Regression tests on each `createQueries` that assert the lead column is carried.
- A data-repair SQL script (delivered, not run by the agent). It fills the flag only where the new version has **no** lead, so a lead the user already changed in the new phase is never overwritten.

## 7. Non-Goals

- No change to the grid query or the client. The read side is correct; the data is wrong.
- No `is_primary` fallback in reads. On 9073 `is_primary` is `0`, so a fallback would not help and would blur the two concepts.
- No migration, no schema change.
- No change to the rest of the replicated columns beyond `from_toc` / `from_cgspace` on `results_center`.

## 8. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Centre users, Science Program reviewers | See the lead Centre on the new version, and can filter by it |
| STAR / MEL / TIP | Future API rollovers of results with no originating platform keep passing ownership |
| `onecgiar-pr-server` — versioning / replication | Three repositories |
| Specs | P2-3228 (this is its UAT finding), `bugfix/p2-3652-*` (same versioning path) |

## 9. Visual Reference

- Source: None
- Location: —
- Notes: Backend-only fix. The symptom is documented in Cristian's screenshots on P2-3228.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Carry the columns in the replication queries + data repair** | Add the columns to three SQL lists, test, SQL repair | Smallest change, fixes the source for every flow |
| B. Re-derive the lead after replication in `versionProcessV2` | Copy the flags in a post-step from the old result | Only covers the flows that call it; a second write path |
| C. Fallback in the read queries | Treat "no lead" as "first centre" | Hides the bug, wrong when there are several centres, does not fix completeness or ownership |

## 11. Recommended Approach

**Option A.** The defect is a missing column in a copy. The fix is the column, where the copy happens. The repair script restores existing versions without touching any lead the user already set.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R1 | Repair scope: every rollover since 2024, or only into the current phase? Leaning towards every one, since the script only fills empty leads. |
| R2 | The repair has to pick the right source row. It matches by `result_code` + `center_id` (or `institutions_id` + `institution_roles_id`) against the immediately previous version. |
| OQ1 | **Unexplained:** Cristian's screenshot of the 2026 detail shows a Lead center selected, but no 2026 row has the flag and the form only reads `is_leading_result` (`rd-partners.service.ts:295-297`). Likely a value picked but not saved. A reload of `/result/result-detail/9073/contributor-partners?phase=36` settles it. |
| OQ2 | 9073 has two 2026 versions (11545 deactivated, 12026 active, six seconds apart). Confirm it was a manual re-rollover during testing and not a duplicate created by the flow. |
| D1 | Juan David runs the repair script. prtest deploys automatically on merge to its branch. |

## 13. Success Criteria

- Carrying 9073 (or any result with a lead Centre) into a new phase gives a version whose `results_center` row has `is_leading_result = 1`, and the grid shows the Centre.
- Same for a result led by a partner (`is_lead_by_partner`, `results_by_institution.is_leading_result`).
- Regression tests fail on the current queries and pass with the fix.
- After the repair script runs, prtest shows no current-phase result whose previous phase had a lead but which has none itself.

## 14. Next Step

```text
/akili-specify bugfix/p2-3228-lead-center-replication
```

In **Bug Mode**, Lite depth.
