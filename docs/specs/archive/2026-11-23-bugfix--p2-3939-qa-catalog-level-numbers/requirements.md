# Requirements — QA catalog level rules on level numbers (P2-3939)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Ticket | P2-3939 (epic P2-2340) |
| Source | `proposal.md` (approved 2026-11-23) |
| ID prefix | `LVL` |
| Status | approved — 2026-11-23 |

## 2. Executive Summary

The QA catalog (`GET /api/qa/catalog`) evaluates level rules against the stored level-table **row id**. It SHALL evaluate them against the **level number (0–9)** that a new read-only field exposes, so the Innovation Use explanation rule matches the form (5–9) and the IPSR Step 3 level rules can be stated.

## 3. Glossary

| Term | Meaning |
|---|---|
| Level number | `level` column of `clarisa_innovation_use_levels` / `clarisa_innovation_readiness_level` (0–9) |
| Row id | Primary key of those tables; what result tables store. Not equal to the level number and differs by environment |
| Level-number field | New read-only catalog entry (field or subfield) whose value is the level number of a sibling level field |

## 4. System Context & Scope

Current behavior (cited in `proposal.md` §3 and §9):
- Innovation Use stores the row id (`innovation-use.service.ts:131-140`), and the catalog gates the explanation with `in [5..9]` on that id (`qa-catalog/definitions/sections/innovation-use.ts:618-627`).
- IPSR Step 3 gates are documented as not expressible (`ipsr-step-3.ts` header, level gate note; `qa-catalog.en.md:242`).
- The live step-3 function reads `clarisa_*.level != 0` (`ipsr-step-3.ts` header citing VS3:19-47, 231-264) — `UNVERIFIED — confirm at source before relying on it` (function body not re-read; cited from the code comment).
- The form hides current use when the core **evidence-based** use level is at list index 0 (`step-n3.component.html:61-63`, `step-n3.component.ts:182-184`).

In scope: `onecgiar-pr-server/src/api/qa-catalog/**`, `onecgiar-pr-server/docs/qa-catalog.en.md`.
Out of scope: stored values, `innovation-use.service.ts` `Level_6` comparisons, bilateral, client, condition vocabulary.

## 5. Stakeholders / Personas

| Persona | Need |
|---|---|
| QA reviewer (via QA app) | Asked for exactly what the form asks for |
| QA app consumer | Stable, additive catalog contract and a version signal |

## 6. Functional Requirements

### Requirement LVL-R-1: Level number exposed

The catalog SHALL expose a read-only level-number entry for each level field that drives a rule: `innovation_use.use_level.innovation_use_level`, `ipsr_step_3.core.readiness_level`, `ipsr_step_3.core.use_level`, and the `readiness_level` / `use_level` subfields of each `ipsr_step_3.complementary_components` element.

#### Scenario: Level number resolved from the row
- GIVEN a result whose stored use level is the row of level 4 (whatever its id)
- WHEN `GET /api/qa/results` returns its values
- THEN the level-number entry is `4`
- AND IT MUST resolve a repeated level row (e.g. a row id 13 that holds level 2) to its own `level` (`2`)
- BUT it must NOT change the existing level field's value (still the row id) or its `control_list`

#### Scenario: Unset level
- GIVEN a result with no level stored (NULL)
- WHEN the values are returned
- THEN the level-number entry is empty (the existing empty value for a number)

### Requirement LVL-R-2: Innovation Use explanation on level numbers (regression)

`innovation_use.use_level.readiness_level_explanation` SHALL be visible and required exactly when the use level number is 5–9.

#### Scenario: Level 4 (the failing case)
- GIVEN an Innovation Use result saved at level 4 (stored row id 5 where id = level + 1)
- WHEN the catalog rule is evaluated on its values
- THEN the explanation is neither visible nor required
- BUT it must NOT be required because the stored id is 5

#### Scenario: Level 9
- GIVEN a result saved at level 9 (stored row id 10)
- WHEN the rule is evaluated
- THEN the explanation is visible and required

### Requirement LVL-R-3: IPSR Step 3 evidence gate

Each evidence list (`core.readiness_evidences`, `core.use_evidences`, and `readiness_evidences` / `use_evidences` of each complementary element) SHALL be required when its own level number is in 1–9.

#### Scenario: Level 0
- GIVEN a core readiness level of number 0
- WHEN the rule is evaluated
- THEN `core.readiness_evidences` is not required
- AND the list stays visible (the form always renders it)

#### Scenario: Level ≠ 0 on a repeated row
- GIVEN a complementary element whose use level is the row id 13 holding level 2
- WHEN the rule is evaluated
- THEN its `use_evidences` is required
- BUT it must NOT add a `visible_when` to any evidence list

### Requirement LVL-R-4: IPSR Step 3 current use hidden at use level 0

`ipsr_step_3.core.current_use.actors`, `.organizations` and `.measures` SHALL be visible only when the core evidence-based use level number (`ipsr_step_3.core.use_level`) is in 1–9.

#### Scenario: Use level 0
- GIVEN a core use level of number 0
- WHEN the rule is evaluated
- THEN the three current-use lists are not visible
- BUT it must NOT change their `required` / `required_confirmed` or their row-level subfield rules

### Requirement LVL-R-5: Contract and version

The catalog version SHALL be raised and the contract SHALL state the correction.

#### Scenario: Version bump
- GIVEN the catalog at `2026.35`
- WHEN the change ships
- THEN `catalog_version` is `2026.36` (or the next free revision at merge time)
- AND `qa-catalog.en.md` carries a change-log row naming P2-3939, the new keys and the corrected rule
- AND IT MUST remove the "not expressible" level-gap text for IPSR Step 3 and the D28 caveat, keeping only the residual NULL-level gap (LVL-R-6)
- BUT it must NOT rename or remove any existing key

### Requirement LVL-R-6: Residual NULL-level gap documented

The contract SHALL document that a **NULL** level (complementary elements: the function requires evidence; form: an unset level counts as ≠ 0) is not stated as a condition, because the vocabulary has no "is null"; the level field itself is `required: true`, so QA already flags the missing level.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| LVL-NFR-1 | Additive contract change only; existing keys, types, values and lists unchanged |
| LVL-NFR-2 | No migration; no write path touched |
| LVL-NFR-3 | Lookups batched per source by the existing resolver (no per-result query) |

### Defect classes and gates

| Defect class | Gate |
|---|---|
| Rule compares the wrong value (id vs number) | Unit test evaluating the condition on fixture values (row id 5 / level 4; id 10 / level 9; id 13 / level 2) — red on current code |
| Lookup binding malformed / unregistered source | `qa-catalog.shape.spec.ts`, `lookup-sources.spec.ts`, `lookup.resolver.spec.ts` |
| Catalog drift vs pinned expectations | `qa-catalog.display-rules.spec.ts`, `qa-catalog.required-follows-form.spec.ts`, `qa-catalog.ipsr-step-3.spec.ts`, `qa-catalog.snapshot.spec.ts` |
| Version not bumped / doc drift | `qa-catalog.controller.spec.ts` (version), snapshot check |
| Type error in a typed definition | `npx tsc --noEmit -p tsconfig.json` (stricter than the ts-jest runner) |
| Prod data where `level` of a row is wrong | No automated check — **accepted risk**; the rule is only as true as the `level` column |

## 8. Requirement ID Index

| ID | Title | Proposal AC |
|---|---|---|
| LVL-R-1 | Level number exposed | AC1 |
| LVL-R-2 | Innovation Use explanation on level numbers | AC2 |
| LVL-R-3 | IPSR Step 3 evidence gate | AC3 |
| LVL-R-4 | IPSR Step 3 current use hidden at 0 | AC3 |
| LVL-R-5 | Contract and version | AC3, AC4 |
| LVL-R-6 | Residual NULL-level gap | AC3 (OQ-1) |
