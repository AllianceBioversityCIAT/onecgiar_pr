# Requirements — Hide the 2030 Use Projection on W3/Bilateral Innovation Use (`IWH`)

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-w3-hide-2030` |
| Prefix | `IWH` |
| Depth | Lite |
| Type | Change |
| Ticket | INC-168060 (SR-168060), Nicoleta Trifa, email 2026-11-11 09:07 |
| Branch | `qa-development-2026-ss` |
| Status | Draft — Phase 1 |

## 1. Executive Summary

Nicoleta (2026-11-11): *"future use (2030 users) is not part of the MDS for bilateral results so it should not be in PRMS for this type of results."* W3/Bilateral Innovation Use results show the **2030 Use Projection** block in two forms today. This spec hides that block on both forms for W3/Bilateral results. W1/W2 Innovation Use and IPSR step 1 keep it. Stored 2030 data is kept as it is, and nothing is deleted.

### 1.1 Decision Record — who asked for this and where

| Field | Value |
|---|---|
| Decision | W3/Bilateral Innovation Use results no longer show or ask for the **2030 Use Projection** (future use / 2030 users). W1/W2 and IPSR keep it. |
| Requested by | Nicoleta Trifa |
| Ticket | **INC-168060** (SR-168060) |
| Date / channel | 2026-11-11, email 09:07 |
| Her words | *"future use (2030 users) is not part of the MDS for bilateral results so it should not be in PRMS for this type of results."* |
| What it reverses | P2-3428, which had added the 2030 Use Projection block to the bilateral page (behind "Complete full metadata"). |
| Stored data | Kept. Nothing is deleted; existing 2030 answers are sent back unchanged on save. |
| Green check side effect | The live `validation_innovation_use_P25` still requires the 2030 question to be answered (`innov_use_2030_to_be_determined` NULL → section red). Once the block is hidden nobody can answer it, so the W3 rows left at NULL get `1` ("to be determined") by data fix (IWH-T-3) — the same value the bilateral ingest already writes for every new W3 result. |
| Where it lives in code | `type-innovation-use.component.html` (INC-168060 comment where the block was), `innovation-use-form.component.ts` (`hides2030Projection`), and both folders' `CLAUDE.md`. |

## 2. Glossary

| Term | Meaning |
|---|---|
| W3/Bilateral result | `result.source = 'API'`; the client sees it as `source_name = 'W3/Bilaterals'` |
| 2030 Use Projection block | "This is yet to be determined" radio + guidance + "What is the projected innovation use by end of 2030?" + 2030 Actors / Organizations / Other measures (+ justification on the shared form) |
| Shared form | `app-innovation-use-form`, mounted by result-detail `innovation-use-info` and IPSR step 1 |
| Bilateral form | `type-innovation-use`, the bilateral review page (P2-3428 added its 2030 block) |

## 3. Scope

**In scope:** hiding the 2030 block on the shared form when the result is W3/Bilateral (and not IPSR), and on the bilateral form always (every result there is W3/Bilateral).

**Out of scope:**
- the current-use Actors sentence (already done in `quick/innovation-use-actors-sentence-ipsr`)
- deleting or rewriting stored `innovation_use_2030` rows or `innov_use_2030_to_be_determined`
- the QA catalog `iu_projection_2030` section (it has no condition kind keyed to the source; recorded as a follow-up)
- bilateral `/api/bilateral/*` payloads and the `validation_innovation_use_P25` function, unless the data check shows W3 rows that would block the green check (done at specify as design P-8: rows found, handled by the IWH-T-3 data fix instead of a Pivot)

## 4. Personas

| Persona | Effect |
|---|---|
| W3/Bilateral submitter / reviewer | No longer sees or fills the 2030 projection |
| W1/W2 submitter | No change |
| IPSR innovation-package editor | No change |

## 5. Functional Requirements

### IWH-R-1 — Shared form hides the 2030 block for W3/Bilateral results (MUST)

#### Scenario: W3 result in result-detail
- GIVEN an Innovation Use result whose `source_name` is `W3/Bilaterals`
- WHEN the user opens `result-detail/<id>/innovation-use-info`
- THEN no part of the 2030 Use Projection block is rendered (radio, guidance, question, 2030 lists, justification)
- AND the current-use block above it is unchanged
- BUT it must NOT change what the section save sends for the 2030 keys: the loaded values go back unchanged
- AND IT MUST still show the block while `source_name` is not yet known (fail toward today's form)

#### Scenario: W1/W2 result
- GIVEN an Innovation Use result whose `source_name` is `W1/W2`
- WHEN the user opens the same page
- THEN the 2030 block is rendered exactly as today

#### Scenario: IPSR step 1
- GIVEN IPSR step 1 (`[isIpsr]="true"`)
- WHEN the step is opened, whatever the source of the current result signal
- THEN the 2030 block is rendered exactly as today

### IWH-R-2 — Bilateral form drops the 2030 block (MUST)

#### Scenario: bilateral review page
- GIVEN a W3/Bilateral Innovation Use result on the bilateral page (`type-innovation-use`)
- WHEN the type-specific section renders
- THEN the "2030 Use Projection" block (title radio, guidance, question, three lists) is not rendered
- AND the current-use block, the readiness explanation and the P2-3424 innovation-link question are unchanged
- BUT it must NOT null or drop the stored 2030 values on save: `innov_use_2030_to_be_determined` and `innovation_use_2030` are sent as loaded

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| IWH-N-1 | No data migration, no endpoint change, no new design token |
| IWH-N-2 | Tests scoped (`--findRelatedTests` / `--testPathPattern`, `--maxWorkers=2`) |

## 7. Defect classes → gate

| Defect class | Gate |
|---|---|
| Block still rendered for W3 (wrong condition / wrong source string) | Jest DOM test on the shared form with `source_name='W3/Bilaterals'` |
| Block hidden for W1/W2 or IPSR (over-hiding) | Jest DOM tests with `W1/W2` and `isIpsr=true` |
| Bilateral save nulls the stored 2030 answer | Jest `buildPayload` test with a loaded `true` and a loaded list |
| A consumer spec pins the removed bilateral markup | `--findRelatedTests` on the changed files + the consumer list in `tasks.md` |
| Template compile error (ngc stricter than Jest) | `npx ng build` is too heavy; `npx tsc -p tsconfig.app.json --noEmit` + Jest DOM render of the template |
| Green check turns red for a W3 result whose 2030 answer is NULL and can no longer be edited | No automated gate: data query at specify (design P-8, user-run on prod/test DB) → rows found → IWH-T-3 data fix |
| Visual: an empty gap or orphan divider where the block was | No automated gate: PRTest check on result 5093 and one bilateral result (HITL) |

## 8. Requirement ID Index

| ID | Title | Owner task |
|---|---|---|
| IWH-R-1 | Shared form hides 2030 for W3 | IWH-T-1 |
| IWH-R-2 | Bilateral form drops 2030 | IWH-T-2 |
| IWH-N-1/2 | No data change; scoped tests | IWH-T-1, IWH-T-2 |
