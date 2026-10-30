# Requirements — Impact Results: Server Foundation

## 1. Module / Feature

| Field | Value |
|---|---|
| **Module** | `results` (+ `results-framework-reporting`, `results-validation-module`) |
| **Sub-feature** | Impact results — server foundation (child 1 of 3, see [`../family.md`](../family.md)) |
| **Owner** | Santiago Sanchez |
| **Status** | approved (2026-10-29, Santiago Sanchez) |
| **Ticket** | P2-3901 |
| **Depth** | **Full** — new tables + migration, changes to live P25 validation functions, new API contracts |
| **Type / Approval Mode** | Change · gated (inherited from [`../proposal.md`](../proposal.md)) |
| **Visual source** | User Guide v2, 2026-10-29 (server-facing behavior only) |

**Requirement prefix:** `IRS` (Impact Results — Server).

---

## 2. Executive Summary

The server must let a Science Program create a result at **impact level** (existing level 1 `Impact` + type 9 `Impact Contribution`), store the new **Impact level info** data, compute its **green check**, and stop the P25 contributors and geography checks from blocking impact results with rules that do not apply to them (ToC, sub-national/global). It also exposes two read endpoints the clients need: a **cross-portfolio result search** for "already reported in PRMS" and **per-Impact-Area counts** for the SP Reporting card. Non-impact results must behave exactly as today.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Impact result** | A result with `result_level_id = 1` and `result_type_id = 9` |
| **Impact Area** | One of the 5 CGIAR Impact Areas (CLARISA `clarisa_impact_areas`) |
| **Score / tag** | Impact Area score 0/1/2 stored as tag id 1/2/3 (`gender_tag_level`) in the five `*_tag_level_id` columns of `result` |
| **Sub-component** | Row of `impact_areas_scores_components` selected for an area scored 2 |
| **Study type** | *Learning study* — evaluates the effectiveness of an intervention in a localized context; *Accountability study* — evaluates the total effect of an intervention that has gone to scale (James Hammond, 2026-10-27) |
| **Contribution statement** | "CGIAR's contribution to the intervention evaluated" — narrative, ≤ 100 words |
| **Previous result** | A result already in PRMS, from any phase or portfolio, that the impact result builds on |
| **Word** | A maximal run of non-whitespace characters after trimming |

---

## 4. System Context & Scope

- PRD: **G1** (submission completeness), **G2** (data quality); refines **US-S1**, **US-S2**; respects **AC-1** (typed integrity), **AC-2** (submission workflow), **AC-5** (phase correctness), **AC-7** (soft delete), **AC-9** (secrets).
- TRD: §3 Result core + type-specific entities; §4 `api/results/*`, `api/results-framework-reporting/*`; §5 **W1** result lifecycle, **W2** phase rollover, **W7** soft delete.
- UX: User Guide v2 steps 1–8 (client children consume these contracts).

### In scope

- Impact-mode result creation with Impact Area score prefill.
- Persistence + read/save API for Impact level info, including study-type catalog and previous-result links.
- P25 green check for the new section; the section is listed for impact results only.
- ToC (and generic linked-results) exemption in the P25 contributors check for impact results.
- Region/Country-only geography for impact results (save + green check).
- Cross-portfolio result search; per-Impact-Area counts per program and phase.
- Soft delete / recovery coverage of the new data.

### Out of scope

- All client UI (children #2 and #3).
- QA behavior, public dashboard, bilateral / platform-report payloads (no change to `bilateral-result-summaries.en.md`).
- Server-side completeness guard on `submitFunction` (pre-existing gap for every type — separate ticket).
- Any target, indicator or ToC data for impact results.
- Renaming the `result_type` row "Impact Contribution" (display label is a client concern, proposal OQ-4).

---

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (SP member) | Can create and complete an impact result; gets green checks that reflect impact rules |
| PMU lead | Sees per-area counts; impact results become queryable data |
| QA reviewer | Nothing (out of scope) |
| Bilateral consumer | Nothing — payload contract untouched |

**IRS-US-1** — As an SP member, I want to create an impact result for a chosen Impact Area, so that it starts with the right score and no targets.
**IRS-US-2** — As an SP member, I want my impact-level answers and links to earlier results saved and validated, so that the result can reach "complete" and be submitted.

---

## 6. Functional Requirements

### Requirement IRS-R-1: Create an impact result (MUST)

`POST /api/results-framework-reporting/create` SHALL accept `result_level_id = 1` with `result_type_id = 9` and a required `impact_area_id` (one of the 5 CGIAR Impact Areas), creating the result in Editing for the program and active phase, exactly as for other levels.

#### Scenario 1.1: Happy path
- GIVEN an SP member with permission to report for program SP01 in the open phase
- WHEN they create a result with level 1, type 9, `impact_area_id` = Climate adaptation & mitigation, and a title
- THEN the result is created with `status_id = 1`, level 1, type 9, owned by SP01, and a result code is returned
- BUT it must NOT require `toc_result_id`, `indicators`, `number_target`, `target_date` or `contributing_indicator`

#### Scenario 1.2: Missing or invalid Impact Area
- GIVEN an impact-mode create request
- WHEN `impact_area_id` is absent or not one of the 5 Impact Areas
- THEN the request is rejected with HTTP 400 and no result row is written

#### Scenario 1.3: Target or ToC data on an impact result
- GIVEN an impact-mode create request
- WHEN it carries a non-null `toc_result_id`, `indicators`, `number_target`, `target_date` or `contributing_indicator`
- THEN the request is rejected with HTTP 400 (BR1, BR2)
- AND IT MUST NOT create a result, ToC row or indicator row

#### Scenario 1.4: Impact Area on a non-impact result
- GIVEN a create request with any level/type other than 1/9
- WHEN it carries `impact_area_id`
- THEN the field is ignored and creation behaves exactly as today

### Requirement IRS-R-2: Score prefill on creation (MUST)

At creation, the chosen Impact Area SHALL be stored as **2 – Principal** and the other four as **0 – Not targeted** (BR3, AC 4).

#### Scenario 2.1
- GIVEN an impact result created with `impact_area_id` = Nutrition
- WHEN its General information is read
- THEN the Nutrition score is 2 and the other four scores are 0
- AND no sub-component is stored yet, so General information is **not** complete until one is chosen for Nutrition (BR4 — existing rule, unchanged)
- BUT the prefill must NOT run on any later save; a user change to the scores is kept as saved (AC 5)

### Requirement IRS-R-3: Study-type catalog (MUST)

The server SHALL expose the study-type catalog with **exactly two** active entries — *Learning study* and *Accountability study* — each with its definition text as in §3 (AC 13).

### Requirement IRS-R-4: Read Impact level info (MUST)

For an impact result the server SHALL return: study type (id or null), contribution statement (or null), "already reported in PRMS" answer (true / false / null), and the list of linked previous results, each with id, result code, title, result type name, phase name and portfolio acronym.

#### Scenario 4.1: Never saved
- GIVEN an impact result whose section was never saved
- WHEN it is read
- THEN every field is null and the list is empty — not an error

#### Scenario 4.2: Non-impact result
- WHEN the section is read or saved for a result whose type is not 9
- THEN the server answers HTTP 400 and writes nothing

### Requirement IRS-R-5: Save Impact level info (MUST)

The server SHALL save the section partially (draft saves allowed: any field may be null) and validate what is sent.

#### Scenario 5.1: Contribution word cap
- GIVEN a contribution statement of 101 words
- WHEN the section is saved
- THEN the save is rejected with HTTP 400 naming the 100-word limit, and nothing is written (BR7, AC 14)
- AND IT MUST accept exactly 100 words, counting words as in §3

#### Scenario 5.2: Previously reported = Yes
- GIVEN the answer Yes and a list of result ids
- WHEN the section is saved
- THEN the stored links equal the sent list (set semantics: added ids linked, missing ids unlinked, duplicates collapsed)
- AND IT MUST reject ids that do not exist, are inactive, or equal the impact result itself (HTTP 400, nothing written)
- AND links MAY point to results of any phase, portfolio, program or Center (BR8)

#### Scenario 5.3: Previously reported = No
- GIVEN an impact result with linked previous results
- WHEN the answer is saved as No
- THEN all its links are deactivated and nothing else is required (AC 16)

#### Scenario 5.4: Invalid study type
- WHEN a study type id outside the catalog is sent
- THEN HTTP 400, nothing written

### Requirement IRS-R-6: Impact level info green check (MUST)

For P25 impact results the section **`impact-level-info`** SHALL be complete only when: a study type is set, the contribution statement has 1–100 words, the "already reported" answer is set, and — if Yes — at least one active linked previous result exists.

#### Scenario 6.1
- GIVEN all four conditions hold
- THEN the section validation returns complete
- BUT with Yes and zero active links, or 0 or > 100 words, it returns incomplete

### Requirement IRS-R-7: Section list for impact results (MUST)

For a P25 impact result the green-check response SHALL contain exactly: General information, Contributors & partners, Geographic location, Evidence, Impact level info; `submit` is true only when all five are complete (AC 18).

- BUT `impact-level-info` must NOT appear for any other result type, and the section list of every other type MUST be unchanged (AC 11).

### Requirement IRS-R-8: Contributors check without ToC for impact results (MUST)

For impact results the P25 Contributors & partners check SHALL ignore every Theory-of-Change condition (planned/unplanned, ToC result, indicator, target, progressive narrative) and the generic linked-results / innovation-link question, and keep every other existing condition (Centers, Science Program/Accelerator, W3/bilateral project, external partners) as today (BR2, AC 7–8).

#### Scenario 8.1
- GIVEN an impact result created by the V2 flow (which stores a `planned_result = false` ToC row with no narrative) and all contributor fields filled
- WHEN contributors are validated
- THEN the section is complete
- BUT for any non-impact result with the same data, the result of the check MUST equal today's result

### Requirement IRS-R-9: Region / Country geography (MUST)

For impact results **created in PRMS** (not bilateral `source = 'API'` results, whose review flow is out of scope — design IRS-DD-6) the server SHALL accept only geographic scope **Regional (2)** or **Country (3)** on save, and the geography check SHALL treat any other stored scope as incomplete (BR6, AC 9).

#### Scenario 9.1
- WHEN an impact result's geography is saved with Global (1), Sub-national (5), Multi-national (4) or To be determined (50)
- THEN HTTP 400, nothing written
- AND IT MUST still require at least one region (scope 2) or one country (scope 3) — the existing rule
- BUT other result types keep every scope they accept today

### Requirement IRS-R-10: Cross-portfolio result search (MUST)

The server SHALL offer a paginated search over active results of **every phase and portfolio**, filterable by free text (result code or title), phase/portfolio, and result type(s), ordered **current reporting phase first**, then newer phases before older, then by result code (BR8, AC 15, Guide step 6).

#### Scenario 10.1
- GIVEN results #9821 (2026, Innovation development) and #4410 (2023 / P22, Policy change)
- WHEN searching "maize" with no filters
- THEN both are returned, the 2026 one first, each with code, title, type, phase, portfolio and status
- AND IT MUST exclude inactive (deleted) results and the impact result being edited
- AND each page holds at most the requested page size (max 50)

### Requirement IRS-R-11: Per-Impact-Area counts (MUST)

For a program and phase the server SHALL return, for each of the 5 Impact Areas, the number of active impact results of that program scored **2 – Principal** in that area, plus the distinct total (proposal OQ-1 default).

#### Scenario 11.1
- GIVEN SP01 has one impact result scored 2 in Climate and Nutrition, and one scored 2 in Climate only
- THEN Climate = 2, Nutrition = 1, the others = 0, total = 2

### Requirement IRS-R-12: Authorization (MUST)

Creating an impact result SHALL require the same permission as reporting a 2030 outcome for that program; reading/saving Impact level info SHALL require the same permission as editing any other section of that result. All endpoints are JWT-gated via the `auth` header (AC-3). Today that parity means **JWT only** — the server has no per-result write check on create or any section PATCH (design IRS-P-9, IRS-DD-8); adding one is a platform-wide follow-up, not part of this spec.

### Requirement IRS-R-13: Soft delete and recovery (SHOULD)

When an impact result is deleted or recovered through the existing delete/recover flow, its Impact level info and links SHALL follow it (AC-7).

### Requirement IRS-R-14: Phase replication (SHOULD — pending Nicoleta, proposal OQ-3)

If an impact result is replicated into a new phase by the versioning flow, its Impact level info and links SHALL be copied with it, so the copy is not left with an empty required section. Whether impact results replicate at all is **not** decided here.

### Requirement IRS-R-15: No regression for other types (MUST)

All changes are gated on level 1 / type 9 (or the impact-specific endpoints). For every other result type, creation, General information, Contributors, Geography and Evidence behavior and green checks MUST be identical to today (AC-1).

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Search p95 < 800 ms on the PRTest dataset with a text filter, page size 20; counts endpoint p95 < 300 ms |
| **Data integrity** | Migration is additive (new tables + catalog seed + `validation_maps` row) and every changed SQL function has a working `down` that restores the **live** prior body |
| **Backwards compatibility** | No change to `/api/bilateral/*` or `/api/platform-report/*` payloads |
| **Security** | JWT `auth` header; no tokens, credentials or webhook URLs in logs (`.cursorrules`) |
| **Observability** | 400 responses carry a human-readable message naming the violated rule |
| **Migrations** | `npm run migration:check:ci` green |

---

## 8. Defect classes → gate

| Defect class this spec can produce | Gate that catches it |
|---|---|
| Impact rule leaks into other types (contributors/geo checks change for type ≠ 9) | Jest for TS guards **plus** live SQL check (manual, user-run): compare the section results for a sample of non-impact P25 results before and after the migration — **no automated gate exists for SQL function bodies**; the HITL step is the substitute |
| SQL function rewritten from a stale repo body (live body differs) | Read the live `SHOW CREATE FUNCTION` before writing (user-run); `down` restores that exact body — manual HITL check |
| Word-count off by one / whitespace edge cases | Jest unit tests at 99/100/101 words, multiple spaces, newlines |
| Link set semantics wrong (duplicates, stale links, self-link) | Jest service tests |
| Prefill runs on update / overwrites user edits | Jest test on create vs update path |
| Search ordering or filter wrong | Jest repository/service test with fixed phases + manual PRTest check |
| Migration drift / missing `down` | `npm run migration:check:ci` + review |
| Bilateral payload changed by accident | Review: no file under `api/results/summary/` or bilateral mappers touched |

Accepted risk: the server still does not block Submit on incomplete sections (out of scope, pre-existing).

---

## 9. Dependencies & Assumptions

- **Upstream:** CLARISA Impact Areas (ids 1–5), `impact_areas_scores_components`, `validation_maps` + `validate_sections_mapped_batch`, `results-framework-reporting/create` handler, versioning.
- **Downstream:** children #2 and #3 consume IRS-R-1, 3, 4, 5, 10, 11 contracts.
- **Assumption A1:** the live DB still has `result_by_level (1, 9)` and `result_type 9` active — to be confirmed by the user with the queries in the proposal (R1). If not, the migration adds/activates them.
- **Assumption A2:** existing type-9 results (if any) belong to P22, so the new P25-only section map does not affect them — confirm with the same queries.
- **Assumption A3:** CLARISA Impact Area ids are stable 1–5 and map to the five tag columns (Nutrition, Poverty, Gender, Climate, Environment).

---

## 10. Open Questions

| ID | Question | Status |
|---|---|---|
| IRS-OQ-1 | Do impact results replicate into the next phase? | Open with Nicoleta — non-blocking; IRS-R-14 covers the "yes" case |
| IRS-OQ-2 | Results in Editing appear in the search (proposal OQ-6 default: yes, status returned) | Resolved (default accepted) |
| IRS-OQ-3 | Counts by Principal score (proposal OQ-1) | Resolved (default accepted) |

---

## 11. Requirement ID Index

| ID | Short name | Strength | Ticket AC / BR |
|---|---|---|---|
| IRS-R-1 | Create impact result | MUST | AC 3, 17 · BR1, BR2 |
| IRS-R-2 | Score prefill | MUST | AC 4–6 · BR3, BR4 |
| IRS-R-3 | Study-type catalog | MUST | AC 13 |
| IRS-R-4 | Read Impact level info | MUST | AC 11–12 |
| IRS-R-5 | Save Impact level info | MUST | AC 14–16 · BR7, BR8 |
| IRS-R-6 | Impact level info green check | MUST | AC 18 |
| IRS-R-7 | Section list | MUST | AC 11, 18 |
| IRS-R-8 | Contributors without ToC | MUST | AC 7–8 · BR2, BR5 |
| IRS-R-9 | Region/Country geography | MUST | AC 9 · BR6 |
| IRS-R-10 | Cross-portfolio search | MUST | AC 15 · BR8 |
| IRS-R-11 | Per-area counts | MUST | AC 2 (card counts) |
| IRS-R-12 | Authorization | MUST | AC-3 (PRD) |
| IRS-R-13 | Soft delete / recovery | SHOULD | AC-7 (PRD) |
| IRS-R-14 | Phase replication | SHOULD | AC-5 (PRD) · OQ-1 |
| IRS-R-15 | No regression | MUST | AC-1 (PRD) |
