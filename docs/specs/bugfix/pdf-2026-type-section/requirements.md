# Requirements — 2026 result PDFs lose their type-specific section

## 1. Document Control

| Field | Value |
|---|---|
| Module | platform-report (PDF data) — DB function `resultFullDataByResultCode` (lives only in MySQL) |
| Spec path | `bugfix/pdf-2026-type-section` |
| Type | Bug · Deliverable: software · Bug Mode |
| Depth | Lite |
| Ticket | none yet (OQ-1) |
| Approval Mode | gated |
| Status | approved 2026-11-12 (requirements, design, tasks gates — Santiago Sanchez) |
| Proposal | `proposal.md`, approved by Santiago Sanchez on 2026-11-12. Aligned with it |

## 2. Executive Summary

The PDF data function sends only Reporting 2025 (version 6) through the P25 type-section builder. Reporting 2026 goes through the legacy builder, so its PDFs have no type block. After the fix, every P25-era reporting phase (phase year 2025 and later) uses the P25 builder. Reporting 2025 output and pre-2025 output stay exactly as they are.

## 3. Glossary

| Term | Meaning here |
|---|---|
| Type section | The result-type keys of the PDF payload (e.g. `innovation_use_actors`) built by `reportSectionSevenByResultCode_P25`, or by the legacy `reportSectionSevenByResultCode`. `json_merge_patch` drops keys whose value is null. So "carries the type keys" means every key the builder emits with a non-null value: a *live P25 key* (clarified 2026-11-12, `tasks.md` §2) |
| P25-era phase | A `version` row whose `phase_year` is 2025 or later |
| Same output | The function's JSON for a given (result_code, version_id) equals the pre-change JSON once the two generation-date keys are removed |

## 4. System Context & Scope

Current behavior (cited in the proposal, Problem table):
- The function picks the P25 builder only when `p_version_id = 6`. This comes from `SHOW CREATE FUNCTION`, run by the user on 2026-11-12.
- Result 27926 on version 8 returns `innovation_use_actors` = NULL and 49 keys; on version 6 it returns the array and 52 keys. The actor rows are identical (queries run by the user on 2026-11-12).
- In the version 6 branch, `char_lim` is never assigned (same function body).

**In scope:** `resultFullDataByResultCode` only; a before/after SQL record in `sql/`; verification queries written in `tasks.md` and pasted in chat (no query files).
**Out of scope:**
- Sibling functions. If T-1 finds the same gate in one, it is reported at the T-1 gate and the user decides. It is never added silently.
- New 2026-only fields in the P25 builder.
- PDF templates and the Excel export.

## 5. Stakeholders

| Persona | What changes |
|---|---|
| Anyone downloading a 2026 result PDF (submitters, PMU, public report page) | The type block appears |
| Readers of 2025 and older PDFs | Nothing |
| DB owner (Santiago, via DBeaver) | Applies the function on TEST, then on PROD |

## 6. Functional Requirements

### PTS-R-1 — 2026 PDFs carry the P25 type section

The PDF data function SHALL build the type section with the P25 builder for every P25-era phase.

#### Scenario: Result 27926, Reporting 2026 (the reproduction)
- GIVEN result 27926 active on version 8 (Reporting 2026) with one active actor (Other, 513753)
- WHEN `resultFullDataByResultCode(27926, 8, <non-empty url>)` runs
- THEN `$.innovation_use_actors` is an array that contains that actor
- AND its key set differs from the version-6 payload of the same result only in ToC-block keys (built by `tocInfoByResultCode`, which depend on the result's ToC mapping in each phase). Amended 2026-11-12 by user decision, "Narrow the clause": 27926 has no 2026 ToC mapping
- BUT it must NOT return `error` or `internal_error`

#### Scenario: One 2026 result per type
- GIVEN one active Reporting 2026 result each of Innovation Use, Innovation Development, Capacity Sharing, Policy Change, Knowledge Product, and Other outcome/output
- WHEN the function runs for each
- THEN each payload carries the type keys the P25 builder emits for that type (the same keys a 2025 result of that type carries)

### PTS-R-2 — Older phases are untouched

#### Scenario: Reporting 2025 output is the same
- GIVEN a sample of version-6 results covering every type above
- WHEN the function runs before and after the change
- THEN the output is the same (generation-date keys removed)

#### Scenario: Pre-2025 phases keep the legacy builder
- GIVEN a sample of results on a phase with `phase_year` < 2025
- WHEN the function runs before and after the change
- THEN the output is the same
- AND IT MUST still come from the legacy builder

### PTS-R-3 — The P25 path raises the concat limit

#### Scenario: Limit raised before building
- GIVEN any P25-era call
- WHEN the function builds the payload
- THEN `char_lim` holds the session's `group_concat_max_len` before the comparison, so a value under 150000 is raised

### PTS-R-4 — Invalid inputs behave as today

#### Scenario: Guards unchanged
- GIVEN a nonexistent result code, a result of type 10 or 11, or an empty PDF URL
- WHEN the function runs on any version
- THEN it returns the same `error` / `internal_error` object as before the change

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| PTS-NFR-1 | Applied on TEST first and verified, then on PROD. A before file is kept per environment for rollback: `before.sql` (TEST) and `before.prod.sql` (PROD). Amended 2026-11-12 by user decision: the TEST and PROD bodies differ (P-9 refuted) |
| PTS-NFR-2 | The phase lookup adds one indexed single-row read (`version` by PK). Generation time is not measurably slower (no automated timing gate, see the defect table) |
| PTS-NFR-3 | The script runs in DBeaver: body-only variant for the routine editor; the full script ends with an active `COMMIT` and a check from a fresh tab |

### Defect classes → gate

| Defect class | Gate |
|---|---|
| 2026 still missing type keys | SQL: live P25 keys missing on version 8, per type (PTS-R-1). Red before the fix and green after for types 1, 2, 6 and 7. Types 4 and 8 cannot be red, because the P25 builder returns NULL for them. Type 5 had no red candidate on TEST. All three are key-check only (clarified 2026-11-12, `tasks.md` §2–§3). Automated, run by the user |
| 2025 regression | SQL: `JSON_REMOVE(fn(code, 6, 'x'), generation keys)` compared before vs after for the per-type sample (PTS-R-2). Automated |
| Pre-2025 regression | Same comparison on a pre-2025 sample. Automated |
| Guard regression | SQL: the PTS-R-4 inputs before vs after. Automated |
| The wrong or a partial body was saved in DBeaver | `SHOW CREATE FUNCTION`, read and diffed against `after.sql` by eye. Human check by the user |
| The 2026 payload renders badly in the P25 template | **No automated check.** Substitute: human look at a PRTest 2026 PDF after the TEST apply, and at the production PDF of 27926 after the PROD apply |
| Truncated long text (`group_concat`) | **No direct check** (the limit is session-internal). Accepted risk, Low: the fix only adds an assignment that the legacy branch already does |
| Slower generation | Not gated. Accepted risk, Low: one PK lookup |

## 8. Requirement ID Index

| ID | Title |
|---|---|
| PTS-R-1 | 2026 PDFs carry the P25 type section |
| PTS-R-2 | Older phases untouched |
| PTS-R-3 | P25 path raises the concat limit |
| PTS-R-4 | Invalid inputs behave as today |
| PTS-NFR-1..3 | Non-functional |

### Open questions
- OQ-1: Jira ticket to attach or open.
- OQ-2: Is the version → `phase_year` mapping safe (no non-reporting version with year ≥ 2025 reaching this function)? Settled by T-1.
- OQ-3: Siblings `resultFullDataByIPSRCode`, `tocInfoByResultCode`, `reportBasicInfoByResultCode`, and the P25 builder itself: does any of them carry a version-6 gate? Settled by T-1 and reported, not fixed here.
