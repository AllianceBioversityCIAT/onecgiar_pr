# Proposal — Remove "Innovation team diversity" from the 2026 Innovation Development form

> **Answer first:** hide the question from the 2026 phase on with the existing phase-year gate (same pattern as Megatrends, P2-3264), keep every stored answer, and drop the question from the P25 green check for 2026+ results so the section can still turn green. Bilateral and export payloads keep their shape.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/remove-innovation-team-diversity/` |
| Slug | `remove-innovation-team-diversity` — derived from free-text argument |
| Type | Change (Enhancement, severity S5) |
| Approval Mode | gated |
| Source | Item 5 of a recent feedback list (screenshot shared by Santiago, 2026-11-05). Jira ticket: _pending_ |
| Depends on | none |
| Parallel-safe | yes — touches only the Innovation Dev info section and the P25 green check routine |
| Status | Proposed — 2026-11-05 |

## 2. Intent

Reduce reporting burden on Innovation Development results by retiring a question whose data is self-reported, never verified, and not used in portfolio or scaling analysis.

## 3. Problem / Current Behavior

- The form renders **Innovation team diversity** for every phase: `innovation-dev-info.component.html:161` → `<app-innovation-team-diversity>` (no phase gate).
- The question is **required**: Yes / No / Does not apply (`result_questions` 112; options 113/114/115), and "Yes" opens a multi-select (116..121: gender, experience, expertise, disciplinary, regional, Other).
- It feeds the section's **green check**. In P22 the rule is coded in `results-validation-module.repository.ts:1457` ("question 38"); in P25 it lives in the DB function `validation_innovation_dev_P25` (live, not in `src/migrations`).
- The answer also flows to: QA catalog (`qa-catalog/.../innovation-development.ts:370`, closed list `question_options_team_diversity`), result summary / export (`result-questions.service.ts` → `flattenInnovationTeamDiversitySection`), save path (`innovation_dev.service.ts:163`, `summary.service.ts:816`) and the bilateral payload (`bilateral.service.ts:3942`).

## 4. Proposed Outcome

| Phase of the open result | Behavior after the change |
|---|---|
| 2026 and later | The question is not rendered, not required, and does not block the green check |
| 2025 and earlier | Unchanged: the question renders with its stored answers and keeps its rule |

No stored answer is deleted, deactivated or migrated.

## 5. Scope

- Client: phase-gate `<app-innovation-team-diversity>` behind the existing 2026 Innovation Dev reduction gate (`fieldsManagerSE.isInnovationDevFormReduced2026()` or a sibling flag in `ReportingDesignYear` if product wants a separate threshold).
- Client save: make sure a 2026 save does not send an empty diversity body that would wipe stored answers (same concern handled for reference materials, `innovation-dev-info.component.ts:506-517`).
- Server / DB: exclude questions 112–121 from `validation_innovation_dev_P25` for results whose phase year ≥ 2026 (DB-connected step — handed to Santiago, not run by the agent).
- QA catalog: move `innovation_dev.team_diversity` to the "phase-gated 2026 removals" list (NOT_FOR_QA for 2026), update snapshot + `docs/qa-catalog.en.md`, bump catalog version.
- Tests: client Jest for the gate (2026 hidden / 2025 shown) and the save body; QA catalog spec + snapshot.

## 6. Non-Goals

- Deleting the question, its options, or `result_answers` rows.
- Changing P22 rules or the P22 validation in `results-validation-module.repository.ts`.
- Changing the bilateral payload shape: `innovation_team_diversity` stays in `/api/bilateral/*` (it will just be empty for 2026 results). Removing the key would be a contract change and needs its own decision + change-log entry.
- Changing the summary / PDF export structure (it already prints whatever is stored).
- The other items of the same feedback list (separate proposals).

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Result submitters (Innovation Development, 2026) | One fewer required question |
| QA reviewers | Field no longer catalogued for 2026 results |
| PMU / downstream | No new data for 2026; historic data intact |
| Client | `innovation-dev-info.component.html` / `.ts`, `fields-manager.service.ts` (if a new flag) |
| Server | `qa-catalog/definitions/sections/innovation-development.ts`, snapshot, `docs/qa-catalog.en.md` |
| DB | `validation_innovation_dev_P25` (live function) |
| Related specs | `openspec/changes/p2-3263-p2-3264-innovation-dev-2026-form-reduction` (precedent; its task 5.1 — backend green-check exclusion — is still unchecked), `openspec/changes/p2-3291-innovation-team-diversity-hierarchy`, archive `2026-09-08-bugfix--innovation-team-diversity-missing-alert` |

## 8. Visual Reference

- Source: screenshot of the feedback item (current question with Yes branch and six options).
- Location: shared in chat, 2026-11-05 (not stored in the repo).
- Notes: removal only — no new UI, so no mockup needed.

## 9. Requirement Delta Preview

### REMOVED Requirements

- From the 2026 phase on, the Innovation Development form no longer asks "Innovation team diversity – Have concrete actions been taken to promote diversity in the composition of the CGIAR and partner innovation team?".
- From the 2026 phase on, answering that question is no longer a condition for the Innovation Dev info green check.

### MODIFIED Requirements

- The QA catalog treats the team-diversity field as a phase-gated 2026 removal.

### ADDED Requirements

- none

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Phase-gated hide + green-check exclusion** | Hide for phase ≥ 2026, exclude from P25 validation for 2026+, keep data | Same pattern as Megatrends; 2025 results unchanged; reversible | Needs a DB function change |
| B. Client-only hide | Only wrap the component in `@if` | Smallest diff | If P25 validation requires q112, every 2026 result stays without green check → blocks submission |
| C. Hard removal for all phases | Hide everywhere, deactivate questions | Simplest model | Rewrites history for 2025 results; breaks epic P2-3243 rule that earlier phases render as before |

## 11. Recommended Approach

**Option A.** It is the smallest *safe* path: B is only safe if we confirm the P25 function does not require the question, and C breaks the "earlier phases unchanged" rule. A also closes the gap left open by the Megatrends precedent (task 5.1).

## 12. Risks, Dependencies, And Open Questions

| # | Item | Type |
|---|---|---|
| OQ-1 | Does `validation_innovation_dev_P25` currently require question 112? Must be read from the DB (test + prod) before specifying. If not, Option A shrinks to client + QA catalog. | Open question |
| OQ-2 | Same threshold as the 2026 reduction (`isInnovationDevFormReduced2026`) or a new `ReportingDesignYear` entry? Default: reuse. | Open question |
| OQ-3 | Jira ticket id and who on product (Angel / Nicoleta) confirms the removal. | Open question |
| OQ-4 | Do Innovation Use / IPSR forms reuse the team-diversity component? Specify must confirm only Innovation Dev is affected. | Open question |
| R-1 | Editing a live DB function: run in test first, keep the before-script, verify against real 2025 and 2026 rows (memory: verify SQL fixes against real data). | Risk |
| R-2 | A 2026 save that sends an empty diversity block could deactivate stored answers on replicated results. | Risk |
| R-3 | Renaming/removing asserted copy breaks client specs — run related Jest specs (`--findRelatedTests`, `--maxWorkers=2`). | Risk |

### Reversibility (asked by Santiago, 2026-11-05 — "what if they ask for it back in a year?")

Nothing is deleted, so bringing the question back is a small change:

| What survives | Where |
|---|---|
| The question, its options and their wording | `result_questions` 112–121 (rows stay active) |
| Every answer already given | `result_answers` (untouched) |
| The UI component and its logic | `components/innovation-team-diversity/` stays in the code, only wrapped in a phase gate |
| The green-check rule | `validation_innovation_dev_P25` keeps the rule for phase < 2026; the before-script of the change is saved in the spec |
| Live example | Any 2025-phase result still renders the question exactly as today |

To re-enable: remove the `@if` gate (or move the threshold year) and revert the phase condition in the validation function.

## 13. Success Criteria

- A 2026 Innovation Development result shows no team-diversity question and can reach the green check without it.
- A 2025 result renders the question with its stored answers, and its green check behaves as before.
- No `result_answers` row for questions 112–121 changes because of a 2026 save.
- QA catalog and bilateral contract tests stay green; catalog version bumped.

## 14. Next Step

```text
/akili-specify changes/remove-innovation-team-diversity
```

(Lite depth is enough once OQ-1 is answered.)
