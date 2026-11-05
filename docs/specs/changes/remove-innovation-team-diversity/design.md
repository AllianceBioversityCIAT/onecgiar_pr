# Design — Remove "Innovation team diversity" from the 2026 Innovation Development form

> **Answer first:** reuse the existing 2026 reduction gate in the client template, add one phase-year short-circuit to the team-diversity block of `validation_innovation_dev_P25` (applied by Santiago in the DB), and drop the field from the QA catalog. No data, API or payload change.

## 0. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/remove-innovation-team-diversity/` |
| Requirements | `requirements.md` (ITD-R-1..5) |
| Depth | Standard |
| Status | draft — 2026-11-05 |
| Budget | 4 tasks · ~120 LOC (client ~30, server catalog ~60, tests) + 1 DB function edit · 1 review round |

## 1. Summary

Three surfaces, one rule ("phase year ≥ 2026 ⇒ the question does not exist for this result"):

1. **Client** — wrap `<app-innovation-team-diversity>` in the same `@if (!isInnovationDevFormReduced2026())` already used for Megatrends.
2. **DB green check** — in `validation_innovation_dev_P25`, the team-diversity condition evaluates to TRUE when the result's phase year ≥ 2026.
3. **QA catalog** — the field joins the "phase-gated 2026 removals" list.

## 1A. Premise Ledger

| # | Premise | Source | How verified | Status | If false |
|---|---|---|---|---|---|
| ITD-P-1 | Only Innovation Dev info renders the component | grep of `app-innovation-team-diversity` in client `*.html` | 1 hit: `innovation-dev-info.component.html:161` | verified | Gate the other hosts too |
| ITD-P-2 | A 2026 save does not change diversity answers when the block is hidden | `innovation_dev.service.ts:163-168` → `_saveSingleQuestion` (no-op on null/empty options; otherwise re-saves the body read from GET) + client sends back the GET body | Code read 2026-11-05; same path Megatrends uses today | verified (code) | Strip `innovation_team_diversity` from the 2026 save body, like `withoutRetiredAssumptionsQuestion` |
| ITD-P-3 | `isInnovationDevFormReduced2026` keys on phase year, not portfolio | `fields-manager.service.ts:87` → `isPhaseYearAtLeast(ReportingDesignYear.InnovationDevFormReduction)` + its spec | Code + spec read | verified | Use a dedicated flag |
| ITD-P-4 | `validation_innovation_dev_P25` requires question 112 today | Live DB function (not in `src/migrations`) | **Not verified** — needs `SHOW CREATE FUNCTION` by Santiago (test + prod) | open | If not required, T-3 becomes a no-op (record it), R-3 already holds |
| ITD-P-5 | The P25 function can reach the result's phase year | Same function; other P25 functions join `version`/phase | **Not verified** | open | Add the join inside the function |
| ITD-P-6 | Questions 112–121 have identical ids in test and prod | QA catalog header note (owner check 2026-10-06/07) | Prior owner check | verified | Resolve by text |

## 2. Architecture Overview

No new component, endpoint or table. The change is three local edits behind one phase rule; each surface keeps its own source of truth (template gate, DB function, catalog definitions).

## 3. Data Model Changes

None. `result_questions` 112–121 and their `result_answers` stay active and untouched (ITD-R-4).

## 4. API Surface

None. `GET/PATCH` Innovation Dev endpoints and `/api/bilateral/*` keep their shape; for 2026 results `innovation_team_diversity` simply carries whatever is stored (usually nothing).

## 5. Backend Module Design

### 5.1 DB green check (`validation_innovation_dev_P25`)
- Wrap the existing team-diversity block (answered question 112 + Yes-branch rules) in a phase-year short-circuit: phase year ≥ 2026 ⇒ TRUE; otherwise the current logic, byte-for-byte.
- Delivery (memory: SQL inline, DBeaver body-only editor, verify against real data):
  1. Santiago pastes the current function body (test).
  2. Agent returns the edited body **inline in chat** + a check query.
  3. Santiago saves the "before" body in the Jira/spec execution log, applies on test, runs the check (one 2026 + one 2025 result without answer), then prod.
- Rollback: re-apply the "before" body.

### 5.2 QA catalog (`qa-catalog/definitions`)
- Remove the `innovation_dev.team_diversity` field (and its actions sub-field) from `sections/innovation-development.ts`; add it to the header's "phase-gated 2026 removals" note.
- Remove `question_options_team_diversity` / `_actions` from `closed-control-lists.ts` only if no other field references them.
- Update `qa-catalog.innovation-development.spec.ts`, `qa-results.golden-bindings.spec.ts`, the snapshot and `docs/qa-catalog.en.md`; bump `catalog_version` per `content-hash.ts:31`.

## 6. Frontend Component Architecture

- `innovation-dev-info.component.html`: `@if (!fieldsManagerSE.isInnovationDevFormReduced2026())` around line 161, with a short comment citing this spec (same style as the P2-3264 comment at line 78).
- No change to `innovation-team-diversity.component.*`, `mapRadioButtonBooleans` load path or the save body.
- Spartan/visual: none (removal only). Manual check that no empty divider/spacing remains.

## 7. Design Decisions

| ID | Decision | Rationale | Rejected |
|---|---|---|---|
| ITD-DD-1 | Reuse `isInnovationDevFormReduced2026` | Same retirement wave, same threshold; one flag to move if product reverses | New `ReportingDesignYear` entry — extra flag with no distinct need |
| ITD-DD-2 | Keep sending the diversity body on 2026 saves | It is the GET body echoed back → no-op on data (ITD-P-2); identical to Megatrends | Stripping it — extra code path, no data benefit |
| ITD-DD-3 | Phase short-circuit inside the DB function, not client-side completeness | Green check authority is the DB routine (P2-3263 precedent requirement) | Client override — forbidden by the precedent spec |
| ITD-DD-4 | Remove from QA catalog entirely | Catalog follows the 2026 form (owner decision 2026-10-07, option B) | Keep with `visible_when` phase — catalog has no phase dimension |
| ITD-DD-5 | Bilateral key kept | Contract stability (`AC-4`); no change-log entry | Removing the key — breaking change |

### Reversion challenge (Step 2.3) — "what does removing this break?"

| Reverted behavior | What could break | Addressed by |
|---|---|---|
| Question rendered for 2026 | Saved 2026 answers silently lost | ITD-DD-2 / ITD-P-2 — nothing written; ITD-R-4 server test |
| Green-check requirement for 2026 | 2025 rule relaxed by mistake | Short-circuit only on phase ≥ 2026; SQL check includes a 2025 result |
| QA catalog field | QA consumers of 2025 results lose the field | Accepted: catalog follows the 2026 form (ITD-DD-4); raw data still in DB |

## 8. Budget (tripwire for `/akili-execute`)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 4 | ~120 | 1 |

Matches Standard-small; not downgraded to Lite because of the live DB function.
