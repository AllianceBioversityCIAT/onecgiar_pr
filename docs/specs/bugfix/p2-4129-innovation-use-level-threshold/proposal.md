# Proposal — Innovation Use level thresholds on the level number (P2-4129)

**In one line:** the P25 Innovation Use service decides whether to keep the readiness-level explanation and the scaling studies by comparing the stored **row id** with `Level_6`. It should compare the **level number**, with the thresholds the form uses: explanation and the scaling-studies answer from level 5, study links from level 6.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-4129-innovation-use-level-threshold` |
| Slug | `p2-4129-innovation-use-level-threshold` — derived from the Jira URL argument (ticket key + core intent) |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | [P2-4129](https://cgiarmel.atlassian.net/browse/P2-4129) (Bug, Medium, epic P2-2340), relates to P2-3939 |
| Requirement source | Jira ticket (written in this session from verified code reads); user decision on the thresholds (2026-11-23): "explicación desde el nivel 5, has_scaling_studies desde 5 y links de estudios desde 6" |
| Visual source | none — backend-only fix |
| Depends on | none · Parallel-safe: yes (touches only `results-framework-reporting/innovation-use/`) |
| Status | Approved — 2026-11-23 (via /akili-specify) |

## 2. Intent

Make the P25 Innovation Use save and read paths keep or drop the explanation and the scaling studies based on the **level number (0–9)** the user picked, in every environment, with the same thresholds as the form.

## 3. Problem / Current Behavior

| # | Current behavior | Citation |
|---|---|---|
| C1 | The service turns the submitted level (0–9) into the catalogue **row id** and keeps only the id | `innovation-use.service.ts:123-140` (`findOne({ where: { level }, select: ['id'] })` → `innovation_use_level = use_levels.id`) |
| C2 | Save gates compare that id with `InnovationUseLevel.Level_6` (= 6, a level **number**). Below the gate the explanation is set to `null`, `has_scaling_studies = false`, and the study URLs are deactivated | `:215-234` (existing row), `:254` (new row), `:299` (duplicate-entry retry), `:342` (URL sync); enum `enum/innov-use-levels.enum.ts:8` |
| C3 | The read path hides the study URLs when the stored id `< Level_6` | `:1017` (`getScalingStudiesUrls`, called from `getInnovationUse` `:907`) |
| C4 | The form shows the explanation for level **numbers** 5–9, the scaling-studies yes/no from 5, and the study links from 6; from the 2026 phase the scaling-studies question is hidden (P2-3535) | `onecgiar-pr-client/…/innovation-use-form.component.html:439`, `:453`, `:465`; `getUseLevelIndex()` returns `selected.level` (`innovation-use-form.component.ts:796-804`) |
| C5 | Row ids differ from level numbers: test DB ids 1–10 = levels 0–9, ids 13–20 repeat levels 2–9 | `UNVERIFIED — confirm at source before relying on it` (secondary: `qa-catalog/definitions/sections/ipsr-step-3.ts` header, "read 2026-10-09 on the test DB"; prod never read — P2-3939 P-5) |

**Consequences** (with the C5 layout):
- Level 5 → id 6 → passes `>= 6`, so the explanation is kept today (it matches the form by coincidence).
- Levels 2–4 on a repeated row (ids 13–15) also pass: the explanation and the scaling studies are kept and read back at low levels.
- With a different id layout, the outcome changes per environment.

## 4. Proposed Outcome

- The gates use the **level number** of the selected row:

  | Item | Kept / returned when level number | Below the threshold |
  |---|---|---|
  | `readiness_level_explanation` | ≥ 5 | set to `null` (as today) |
  | `has_scaling_studies` | ≥ 5 | `false` (as today) |
  | Scaling study URLs: sync on save and read in `getInnovationUse` | ≥ 6 | deactivated / `[]` (as today) |

- A NULL level keeps today's behavior: everything is cleared.
- Stored values are unchanged: `innovation_use_level_id` keeps the row id; no migration.

## 5. Scope

- `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts`: the 5 gates (C2, C3) and the level resolution (C1).
- `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/enum/innov-use-levels.enum.ts`: names for the thresholds, if needed.
- Regression tests in that module (a `*.spec.ts` beside the existing `innovation-use.service.use-level.spec.ts`).
- The module guide `innovation-use/CLAUDE.md`: one line on the rule.

## 6. Non-Goals

- The client form (already decides on the level number).
- `InnovationReadinessLevelByLevel` (readiness row ids, used in `summary.service.ts:875,1096`, `bilateral.service.ts:2812`). It is a sibling on readiness, recorded in §9 and not fixed here.
- The legacy route `SummaryService.saveInnovationUse` (no level gate, `summary.service.ts:264-276`).
- The live validation function `validation_innovation_use_P25`, which requires the explanation only from 6.
- QA catalog (already fixed in 2026.36, P2-3939).
- Stored data cleanup of explanations kept at low levels (see Risk R-2).

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Reporters (W1/W2 P25 Innovation Use form) | Explanation and scaling studies kept exactly when the form shows them |
| Bilateral API (`bilateral/handlers/innovation-use.handler.ts:152` → `saveInnovationUse`) | Same gates; the handler already sends the level number |
| QA reviewers | Stored data matches the QA catalog 2026.36 rule (explanation 5–9) |
| Related specs | archived `2026-11-23-bugfix--p2-3939-qa-catalog-level-numbers`; `bugfix--innovation-use-youth-required`, `changes--innovation-use-nature-all-actors` (same service, shipped) |

## 8. Visual Reference

- Source: None
- Notes: backend-only; the form is the reference for the thresholds (C4).

## 9. Bug Diagnosis

### Observed Symptom
For results whose level is stored under a row id ≥ 6 that holds a level below 5 (the repeated rows), the explanation and the scaling studies are saved and returned although the form hides them. The decision also changes with the environment's id layout.

**How likely is it today (honest scope):** on the save path, `findOne({ where: { level } })` has no `order`. It most likely returns the first block (id = level + 1), where `id >= 6` ⇔ `level >= 5`, so the explanation threshold works by coincidence. The defect bites when (a) `findOne` returns a repeated row, (b) another writer stored a repeated id (the legacy `summary` route writes `innovation_use_level_id` as sent, `summary.service.ts:264-276` area), or (c) an environment has a different id layout. The read gate `:1017` then misreads those rows. `UNVERIFIED — confirm at source before relying on it` whether such rows exist today (OQ-1). The fix is preventive and environment-proofing more than a fix for a widely visible failure.

### Reproduction Steps
1. On an environment with repeated rows (test: id 13 = level 2), save a P25 Innovation Use result with `innovation_use_level_id: 2`, an explanation, and `has_scaling_studies: true`. Today the service resolves `findOne({ level: 2 })`, which returns the first matching row (id 3 or id 13, depending on the data).
2. If the row resolved is id 13: expected, the explanation is cleared (level 2 < 5); actual, it is kept (13 ≥ 6).
3. Deterministic unit reproduction: stub the level repository with `{ id: 13, level: 2 }` and assert the saved row. Today it keeps the explanation.

### Root Cause (confirmed)
`saveInnovationUse` keeps only `use_levels.id` (`:123-140`, `select: ['id']`) and compares it with an enum of level numbers (`:215`, `:254`, `:299`, `:342`). `getScalingStudiesUrls` compares the stored id the same way (`:1017`). The id and the number are different values: on the test DB ids are offset (id = level + 1) and repeated (13–20). Confirmed by reading the code and the enum; the data layout is C5 (`UNVERIFIED` for prod).

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline -i --grep="P2-4129"` → 0 hits; `git log --all -- …/innovation-use.service.ts` (last: `d457ea469` INC-168062, `f229d0610` P2-4049, `9e7354d4d` P2-4048) — none touches the gates; `git show origin/{staging,master,performance-refactor}:…/innovation-use.service.ts \| grep -c Level_6` → 5 / 5 / 5 | Not fixed anywhere |
| **Live path?** | Form `innovation-use-info.component.ts:525` → `PATCH_innovationUseP25` (`results-api.service.ts:593-596`, `v2 innovation-use/create/result/:id`) → `innovation-use.controller.ts:25-30` → `InnovationUseService.saveInnovationUse` (`:69`) → `:123-140` → gates `:215/:254/:299/:342`. Read: `GET_innovationUseP25` (`:629-631`) → controller `:39-40` → `getInnovationUse` (`:843`) → `getScalingStudiesUrls` (`:907`, `:1017`). Bilateral: `innovation-use.handler.ts:152` → `saveInnovationUse` | On the path |
| **Siblings on the same state** | `bilateral.service.ts:3683` (`Number(levelNum) >= Level_6`, already on the number — correct); `summary.service.ts:875,1096` and `bilateral.service.ts:2812` compare readiness row ids with `InnovationReadinessLevelByLevel` (= ids 11–20, `innovation_dev/enum/innov-readiness-level.enum.ts:1-12`), right on today's test layout but environment-dependent; IPSR step 1/3 `saveInnovationUse` (`innovation-pathway-step-one.service.ts:1026`, `…-step-three.service.ts:578`): no `Level_6` gate (grep) | Readiness sibling recorded, out of scope (§6) |
| **Downstream consumers** | Tests: `innovation-use.service.use-level.spec.ts` (stubs `findOne` → `{ id: 3, level: '3' }`), other `innovation-use.service.*.spec.ts`; client form and bilateral review read `readiness_level_explanation` / `scaling_studies_urls` from `getInnovationUse`; QA results feed reads the stored column (catalog 2026.36). Enumerated by grep over `saveInnovationUse` / `getInnovationUse` callers (lesson KZ-changes--innovation-use-farmer-count-nature-1: consumers are enumerated, never named from memory) | Feeds tests and scope |

Data / integrity: explanations and scaling studies saved under the wrong gate stay in the DB until the result is saved again (R-2). No security impact.

### Fix Strategy
Smallest safe correction: resolve the **level number** together with the id, and gate on it.
- On save, `findOne` selects `['id', 'level']`; the gates read `Number(use_levels.level)`.
- On read, `getScalingStudiesUrls` needs the number for the stored id: one lookup by id, or a relation.

Route: `/akili-specify` (Lite) in **Bug Mode**, with a red-first regression test.

## 10. Approach Options

| Option | How | Trade-off |
|---|---|---|
| **A — Gate on the resolved level number** (recommended) | Keep `level` from the same `findOne` on save; look up the level of the stored id on read; named thresholds (`EXPLANATION_FROM = 5`, `STUDY_LINKS_FROM = 6`) | Small, environment-proof; one extra indexed read on GET |
| B — Gate on row ids | Replace `Level_6` with the id of level 5 / 6 | Environment-dependent; breaks on repeated rows — the bug itself |
| C — Trust the client's level number | Use `innovation_use_level_id` from the DTO (it already carries 0–9) instead of the resolved row | Works on save, but not on read (the stored value is the id), and depends on every caller sending a number |

## 11. Recommended Approach

**Option A.** It fixes save and read with the same source of truth (the catalogue's `level` column), needs no data change, and matches the form and QA catalog 2026.36.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R-1 | The live function `validation_innovation_use_P25` requires the explanation from 6, the form and this fix from 5 | Accepted. The function is laxer, not contradictory; QA catalog 2026.36 already follows 5 |
| R-2 | Rows already saved under a wrong gate keep their explanation or URLs until saved again | Out of scope; the user may request a one-off data review later |
| R-3 | `level` may come back as a string from the entity (the existing spec stubs `level: '3'`) | Compare with `Number(...)` and test both shapes |
| OQ-1 | Does prod have repeated rows (`SELECT id, level FROM clarisa_innovation_use_levels`)? | Measures today's impact; the fix is needed either way (same open item as P2-3939 P-5) |
| OQ-2 | Should `has_scaling_studies` stay gated at all from 2026, when the form hides the question? | Proposal keeps the gate at 5 (the user's decision); the service just never receives an answer from the 2026 form |

## 13. Success Criteria

1. The explanation and `has_scaling_studies` are kept at level numbers 5–9 and cleared below, for any id layout, including a repeated row.
2. Study URLs are synced and returned at level numbers 6–9 only.
3. A level-5 result keeps its explanation (no regression from today).
4. A regression test fails on today's code (repeated row id 13 = level 2 keeps the explanation) and passes after.
5. No migration and no change to stored values.

## 14. Next Step

```text
/akili-specify bugfix/p2-4129-innovation-use-level-threshold
```

Bug Mode, Lite: the confirmed root cause becomes a fix plan with a mandatory red-first regression test.
