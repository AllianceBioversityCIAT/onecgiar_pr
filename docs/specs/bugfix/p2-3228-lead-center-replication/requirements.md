# Requirements — Phase replication keeps the lead Centre / lead partner

## 1. Document Control

| Field | Value |
|---|---|
| Module | `versioning` (phase replication) |
| Spec Path | `bugfix/p2-3228-lead-center-replication` |
| Depth | Lite · **Bug Mode** |
| Status | in-review |
| Ticket | [P2-3228](https://cgiarmel.atlassian.net/browse/P2-3228) — UAT finding, 2026-09-22 |
| Approval Mode | gated (inherited from `proposal.md`) |
| Source of truth | `proposal.md` §4 Bug Diagnosis (root cause confirmed with prtest data, result 9073) |
| Cross-refs | `docs/prd.md` AC-5 (phase / versioning correctness) · `docs/trd/trd.md` §W2 Phase rollover · `docs/ux-ui/design.md` Results Center grid (read side only, no UI change) |

## 2. Executive Summary

When a result is carried into a new phase, the new version MUST keep the same lead Centre or lead partner as the source. Today phase replication copies an explicit list of columns, and that list leaves the lead flags out. The new version ends up with no lead, and the Results Center shows `—` in its Center column.

## 3. Glossary

| Term | Meaning |
|---|---|
| Phase replication | The copy of a result and its child rows into the open phase (reporting tool "Update result" / phase change, and `POST /api/bilateral/version`) |
| Lead Centre | The contributing Centre flagged as leading the result (`results_center.is_leading_result`) |
| Lead partner | The partner institution flagged as leading (`results_by_institution.is_leading_result`), with the result marked `is_lead_by_partner` |
| Source / new version | The prior-phase result and its current-phase copy (same `result_code`) |

## 4. Scope

**In:** the lead flags carried on replication for Centres, partner institutions and the result; the `from_toc` / `from_cgspace` provenance flags on Centre rows; a repair script for results already replicated.
**Out:** read-side queries and the client, since both are correct already; any schema change; any other replicated column.

## 5. Personas

| Persona | What changes |
|---|---|
| Centre user / submitter | The new version opens with its lead already set, and the Contributors section is not left incomplete by the rollover |
| SP reviewer, Results Center user | Sees and filters the new version by its lead Centre |
| STAR / MEL / TIP | A later API rollover of a result with no originating platform keeps passing the lead-Centre ownership check |

## 6. Functional Requirements

### VER-R-1 — Centre rows keep their lead and provenance flags (MUST)

Replicated `results_center` rows MUST carry `is_leading_result`, `from_toc` and `from_cgspace` with the source row's values.

#### Scenario VER-S-1.1 — The UAT case (regression)
- GIVEN an approved prior-phase result whose Centre `CENTER-02` has `is_leading_result = 1` (shape of 9073)
- WHEN it is replicated into the open phase
- THEN the new version's `CENTER-02` row has `is_leading_result = 1`
- AND the Results Center grid shows that Centre for the new version
- BUT it must NOT change `is_primary`, `is_active` or `center_id` from what they carry today
- AND IT MUST keep the insert's column list and select list aligned one-to-one, so no value lands in a neighbouring column

#### Scenario VER-S-1.2 — Non-lead Centre stays non-lead
- GIVEN a source with a second contributing Centre whose `is_leading_result` is `0` or `NULL`
- WHEN it is replicated
- THEN that Centre's copy keeps the same value, and it is not promoted to lead

### VER-R-2 — Partner rows keep their lead flag (MUST)

Replicated `results_by_institution` rows MUST carry `is_leading_result` with the source row's value.

#### Scenario VER-S-2.1
- GIVEN a source whose partner institution has `is_leading_result = 1`
- WHEN it is replicated
- THEN the new version's row for that institution and role has `is_leading_result = 1`
- AND IT MUST keep the insert's column list and select list aligned

### VER-R-3 — The result keeps "led by partner" (MUST)

The replicated `result` MUST carry `is_lead_by_partner` with the source's value.

#### Scenario VER-S-3.1
- GIVEN a source with `is_lead_by_partner = 1`
- WHEN it is replicated
- THEN the new version has `is_lead_by_partner = 1`
- BUT it must NOT alter the columns the earlier P2-3228 fix already carries (`source`, `creation_method`, `external_*`), nor `status_id`

### VER-R-4 — Already-replicated results are repaired (SHOULD) — **descoped 2026-09-22**: affected rows exist only on prtest (testing), no repair needed

A delivered SQL script SHOULD restore the lead flags on existing versions, taking them from the immediately previous version with the same `result_code`.

#### Scenario VER-S-4.1 — Fill only what is empty
- GIVEN a current-phase version with no lead flagged, whose previous version had a lead on a Centre or partner still present in the copy
- WHEN the script runs
- THEN that row gets `is_leading_result = 1`, and the result gets `is_lead_by_partner` if the source had it
- BUT it must NOT touch a version that already has a lead, even when that lead differs from the source
- AND IT MUST be idempotent (a second run changes 0 rows), and it MUST ship with a dry-run `SELECT` that counts the rows it would change
- AND IT MUST NOT be executed by the agent: Juan David runs it

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No schema change, no migration, no API or bilateral payload change (AC-4 untouched) |
| Blast radius | Only the three replication `createQueries`; no change to read queries or the client |
| Data integrity | The repair never overwrites a lead set in the new phase (VER-S-4.1) |

## 8. Defect Classes → Gate

| # | Defect this spec can produce | Gate | Blind spot / substitute |
|---|---|---|---|
| D1 | The column is added to one list (`findQuery` or `insertQuery`) but not the other | Jest on each `createQueries`: the column is present in both lists | Presence only; D2 covers alignment |
| D2 | Insert columns and select values are misaligned, so a value is written to the wrong column | Jest: parse the insert's column list and its `SELECT` list, and assert the same position for each added column and the same count | Cannot prove MySQL accepts the SQL (there is no local DB). **Substitute:** the D4 check after deploy |
| D3 | Regression on already-carried columns (`status_id`, the `external_*` six) | Existing `result.repository` specs plus the D2 alignment test on `result` | — |
| D4 | The SQL runs but the data is still wrong in the environment | **Human check at UAT:** roll a result with a lead Centre forward on prtest; `results_center.is_leading_result = 1` and the grid shows the Centre | Not automatable here, so recorded as a HITL check |
| D5 | The repair overwrites or mis-matches rows | Dry-run `SELECT` reviewed before the `UPDATE`; idempotence re-run returns 0 | Reviewed by a human; the agent never runs it |
| D6 | Type / lint breakage | `npx tsc --noEmit`, eslint on touched files | — |

## 9. Open Questions

| ID | Question | Status |
|---|---|---|
| VER-OQ-1 | Repair scope: every replicated phase, or only the current one | **Resolved 2026-09-22 (user): only target versions in the 2026 phase** (`version.phase_year = 2026`, never a phase id — ids differ by environment). The source stays the previous active version |
| VER-OQ-2 | 9073 has two 2026 versions (11545 deactivated, 12026 active). Manual re-rollover, or a duplicate from the flow? | Not blocking; out of this fix. Check the `result` rows |
| VER-OQ-3 | Cristian's 2026 detail screenshot shows a Lead center that is not in the DB | Not blocking; likely picked but not saved. Reload to confirm |

## 10. Requirement ID Index

| ID | Strength | Scenarios |
|---|---|---|
| VER-R-1 | MUST | VER-S-1.1 (regression), VER-S-1.2 |
| VER-R-2 | MUST | VER-S-2.1 |
| VER-R-3 | MUST | VER-S-3.1 |
| VER-R-4 | SHOULD | VER-S-4.1 |
