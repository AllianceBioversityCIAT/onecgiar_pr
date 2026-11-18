# Requirements — Bilateral project codes (`bugfix/bilateral-project-codes`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bilateral` (read payload) + CLARISA data (`clarisa_projects` mirror) |
| Depth / mode | **Lite · Bug Mode** |
| Status | draft |
| Ticket | `#INC-164536` (Alliance BI, 2026-10-05) |
| Proposal | [`proposal.md`](./proposal.md), approved 2026-10-06. Root cause and scope come from its §9 and §12 |
| Approval Mode | `gated` |
| PRD | `AC-4` (bilateral payload stability, additive only) · `AC-9` (no secrets) |
| ID prefix | `BPC` |

## 2. Executive Summary

The bilateral read payload drops the project's Agresso code. `bilateral_projects[]` returns `short_name` and `organization_code` only, although `clarisa_projects.external_code` exists. The fix adds `external_code` to every item. That part is code. Separately, 12 phase-2025 projects that are wrongly owned by institution 1353 ("ABC") get moved to institution 49 (Bioversity (Alliance), CENTER-02), and the Alliance phase-2025 projects get their `external_code` values. Both data fixes are made at the source, in CLARISA, and only verified in PRMS.

## 3. Glossary

| Term | Meaning |
|---|---|
| `bilateral_projects[]` | Slim project list added to every bilateral result read by `enrichBilateralResultResponse` |
| `organization_code` (payload) | The owning institution's **acronym**. Historical name, not a code |
| `external_code` | The project's code in the source system. For Alliance projects this is the Agresso project ID |
| CLARISA sync | The ~8-hourly job that overwrites `clarisa_projects` from CLARISA |

## 4. Scope

| In | Out |
|---|---|
| `external_code` on every `bilateral_projects[]` item, on every bilateral read, for every phase | Renaming `organization_code` |
| Payload-doc change-log row | Changing any other payload block or `POST /create` |
| Data runbook: 12 rows 1353 → 49; Alliance phase-2025 `external_code` values from the mapping file, applied in CLARISA | Non-Alliance projects without `external_code` (~266 rows) |
| Pre- and post-checks (SQL) | Changing CLARISA's institution matching |

## 5. Stakeholders

| Persona | What changes |
|---|---|
| Alliance BI (Normalizer consumer) | Can join results to Agresso projects; sees `"Bioversity (Alliance)"` instead of `"ABC"` |
| CENTER-02 reporters | The 12 projects appear in their phase-2025 project picker |
| Santiago (PRMS dev / CLARISA data) | Runs the data runbook |

## 6. Functional Requirements

### Requirement BPC-R-1: Bilateral project items expose `external_code`

Every item of `bilateral_projects[]` SHALL carry `short_name`, `organization_code` and `external_code`. `external_code` is the linked CLARISA project's external code.

#### Scenario BPC-S-1.1: Project with a code (regression of the ticket case)

- GIVEN a result linked (active link) to a CLARISA project with short name `"CSICAP"`, owning institution acronym `"Bioversity (Alliance)"` and `external_code` `"A1701"`
- WHEN a bilateral read builds the result's `bilateral_projects[]`
- THEN the item is exactly `{ short_name: "CSICAP", organization_code: "Bioversity (Alliance)", external_code: "A1701" }`
- AND IT MUST be produced on every path that enriches a bilateral result (one builder, no per-endpoint copies)

#### Scenario BPC-S-1.2: Project without a code

- GIVEN the linked project has `external_code` NULL
- WHEN the list is built
- THEN the item carries `external_code: null`
- BUT it must NOT omit the key or return `undefined` (consumers rely on a stable shape)

#### Scenario BPC-S-1.3: Existing fields unchanged

- GIVEN any linked project
- WHEN the list is built
- THEN `short_name` and `organization_code` keep today's values and semantics (`organization_code` = institution acronym or null)
- BUT it must NOT rename, remove or reorder the semantics of existing fields (`AC-4`)
- AND inactive links and links to inactive results stay excluded, as today

### Requirement BPC-R-2: Payload contract documents the field

The payload contract SHALL describe `bilateral_projects[].external_code` and record the change in its change log, including the note that `organization_code` carries an acronym.

#### Scenario BPC-S-2.1

- GIVEN the code change ships
- WHEN a consumer reads `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- THEN a dated change-log row names the new field as additive and lists its null semantics

### Requirement BPC-R-3: Wrong owner corrected at the source

The 12 phase-2025 projects (185, 192, 207, 214, 215, 216, 220, 228, 233, 235, 241, 265) SHALL be owned by institution **49** in PRMS, and the value SHALL survive the CLARISA sync.

#### Scenario BPC-S-3.1

- GIVEN the pre-check showed no `source = 'API'` result led by another centre, or such results are listed for the reporter
- WHEN the rows are corrected in CLARISA and a PRMS sync runs
- THEN `clarisa_projects.organization_code = 49` for the 12 ids, and `COUNT(*) WHERE organization_code = 1353` is 0
- AND IT MUST still hold after a **second** sync
- BUT it must NOT be applied as a PRMS-only `UPDATE` (the sync reverts it)

### Requirement BPC-R-4: Alliance external codes loaded at the source

Each phase-2025 Alliance project listed in the Alliance mapping file SHALL carry the file's `external_code` in PRMS, stable across syncs.

#### Scenario BPC-S-4.1

- GIVEN the mapping file from the reporter
- WHEN the codes are loaded in CLARISA and two PRMS syncs run
- THEN every mapped id has `external_code` equal to the file's value
- BUT it must NOT touch projects of other institutions
- AND IT MUST be blocked (not guessed) for any project the file does not map

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| BPC-NFR-1 | No extra query per result: the field comes from the relation the builder already loads |
| BPC-NFR-2 | No secret in spec, commits or logs. The `x-api-key` visible in the ticket screenshot is never copied (`AC-9`) |

## 8. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Field missing, misnamed, or `undefined` instead of `null` | `BPC-TEST-1` — exact-shape `toEqual` on both scenarios (red today) |
| Existing fields regressed | Same `toEqual` (asserts all three keys and values) |
| Another endpoint builds its own list without the field | Design check: one builder, 5 callers of `enrichBilateralResultResponse`; Reviewer greps for other `short_name`/`organization_code` builders |
| Payload doc not updated | **No automated check.** Reviewer checklist item |
| Wrong rows changed / fix reverted by sync | **No automated check.** Substitute: the runbook's SQL pre/post checks, run by Santiago after two syncs (human gate) |
| Codes guessed for unmapped projects | Human gate: the runbook loads from the file only |

## 9. Requirement ID Index

| ID | Title | Task |
|---|---|---|
| BPC-R-1 (S-1.1, S-1.2, S-1.3) | `external_code` on items | BPC-T-1 |
| BPC-R-2 (S-2.1) | Contract change log | BPC-T-1 |
| BPC-R-3 (S-3.1) | Owner 1353 → 49 at source | BPC-T-2 |
| BPC-R-4 (S-4.1) | Alliance external codes at source | BPC-T-2 |
| BPC-NFR-1, BPC-NFR-2 | Performance, secrets | BPC-T-1, BPC-T-2 |
