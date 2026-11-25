# Design — Innovation Use level thresholds on the level number (P2-4129)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-4129-innovation-use-level-threshold` |
| Type / Depth | Bug (Bug Mode) · Lite |
| Requirements | `requirements.md` (ULT-R-1..3) |
| Verified at | `868a115a3` (branch `qa-development-2026-ss`) |
| Backend route | `nestjs-expert` (project Skill Map). `software-architect/references/backend-routing.md`: not read, this is a service-internal gate fix with no routing decision |
| Status | approved — 2026-11-23 |

## 2. Executive Summary

Resolve the **level number** together with the row id, and compare the number with two named thresholds: 5 for the explanation and the scaling answer, 6 for the study links.
- **Save:** the same `findOne` returns `level`.
- **Read:** `InnovUseExists` already returns `ciul.level`, so there is no extra query.

## 3. Architecture Overview

No new module, endpoint, or query. The change stays inside `InnovationUseService`:
- **Save path:** the level resolution at `:123-140` also keeps `level`, and the gates at `:215`, `:254`, `:299`, `:342` read it.
- **Read path:** `getScalingStudiesUrls` (`:1014-1029`) reads the `level` that `InnovUseExists` already selects.

## 4. Extended Directory Structure

| Path (`onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/`) | Change |
|---|---|
| `innovation-use.service.ts` | Level number kept on save; 5 gates moved from the row id to the number |
| `enum/innov-use-levels.enum.ts` | Unchanged (it already holds level numbers); the thresholds are named next to their use (DD-3) |
| new `innovation-use.service.level-threshold.spec.ts` | Regression spec |
| `CLAUDE.md` (module guide) | One line: gates compare the level number, never the row id |

## 5. Data Model

No change (ULT-R-3, NFR-1). Read only: `clarisa_innovation_use_levels(id, level)`. `level` is `int`; `id` is `bigint` (`clarisa-innovation-use-level.entity.ts`).

## 6. API Design

No change to `PATCH|GET /v2/api/innovation-use/{create|get}/result/:resultId`. Only which values are kept and returned changes, and it now matches the form.

## 7. Backend Module Design — Design Decisions

| ID | Decision | Satisfies | Rejected alternative |
|---|---|---|---|
| **DD-1** | Save resolves `findOne({ where: { level }, select: ['id', 'level'] })` and keeps the row id for storage (unchanged) **and** the level number in a local value used only by the gates. A NULL level keeps the number unset, so every gate reads "below". | ULT-R-1, R-3 | Trusting the DTO value directly (proposal option C). It would work for save, but it diverges from read and from any caller that sends a row id |
| **DD-2** | Gates (`:215`, `:254`, `:299`): explanation and `has_scaling_studies` kept when the number ≥ 5. Link handling inside the same blocks: when number < 6, deactivate URLs (as the current else-branch does); keep today's `!has_scaling_studies → deactivate` at ≥ 6. URL sync (`:342`): number ≥ 6. The else-branches (`null` / `false` / deactivate) are unchanged | ULT-R-1, R-2 | One threshold for all three items. Rejected: the form shows the links only from 6 (`innovation-use-form.component.html:465`) |
| **DD-3** | Two named thresholds near the gates (explanation/answer = `InnovationUseLevel.Level_5`, links = `InnovationUseLevel.Level_6`), with a `@akili-spec` reference and a P2-4129 comment saying they are level **numbers** | ULT-R-1, R-2 | Magic numbers |
| **DD-4** | Read: `getScalingStudiesUrls` gates on `Number(innDevExists.level)` (selected by `InnovUseExists`, `ciul.level` joined on `ciul.id = riu.innovation_use_level_id`) ≥ 6. A NULL level returns `[]` | ULT-R-2, NFR-2 | A second query by id. Not needed, the join is already there |
| **DD-5** | Compare with `Number(...)`; a missing or non-finite value counts as "below" | NFR-3 | Strict `typeof` checks |
| **DD-6** | Regression spec (red first): stub `findOne` with `{ id, level }` pairs where id ≠ level (13→2, 6→5, 5→4, 7→6) and drive the 3 save branches. The duplicate retry is reached by stubbing `save` to throw `ER_DUP_ENTRY`. Read: stub `InnovUseExists` with `{ innovation_use_level_id: 13, level: 2 }`. Red on today's code: 13→2 keeps the explanation; read 13→2 returns URLs | ULT-R-1, R-2 | Asserting only the comparison constant (a presence check) |

### Step 2.3 — Reversion challenge

DD-2 narrows the URL behavior on save: level 5 (id 6 on test) passes today's `>= 6`, so URLs were synced at level 5. **What does removing that break?**
- The form never shows or sends links below 6 (`:465`), so a P25 form save loses nothing.
- The bilateral handler sends `has_scaling_studies: false` / no URLs (`bilateral/handlers/innovation-use.handler.ts:105-106`).

No concrete breakage found. Residual: a level-5 result with links stored before the fix has them deactivated on its next save. That is consistent with the form, recorded as R-2 in the proposal.

## 8. Frontend / UX

n/a — backend only; the form is the reference (`innovation-use-form.component.html:439`, `:453`, `:465`).

## 9. Shared Contracts

None changed. `InnovUseExists` (`results/summary/repositories/results-innovations-use.repository.ts:200-245`) is read, not modified.

## 10. Budget (Step 2.4)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 1 | ~200 (service ~25, spec ~160 — 4 level pairs × 3 save branches + 2 read cases, per lesson KZ-bugfix--p2-3939-qa-catalog-level-numbers-1; guide ~5) | 2 |

Matches Lite. Tripwire: > 1 task or > 320 LOC → escalate.

## 11. Premise Ledger

Count: 10 rows — 10 verified (P-5 settled at `/akili-validate`, 2026-11-23).
Blast-radius triggers: `live-path` (form and bilateral save, GET read), `shared-state` (the level value read by 5 gates and 2 siblings), `consumer` (stored field / response values) — all fired, rows P-6..P-8.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Save keeps only the row id of the chosen level | location | `innovation-use.service.ts:123-140` (`findOne({ where: { level: innovation_use_level_id }, select: ['id'] })`, `innovation_use_level = use_levels.id`) | 868a115a3 | High — no bug | — |
| P-2 | The 5 gates compare that id/stored id with `InnovationUseLevel.Level_6` = 6 | location | `:215`, `:254`, `:299`, `:342`, `:1017`; `enum/innov-use-levels.enum.ts:8` | 868a115a3 | High — DD-2/DD-4 moot | — |
| P-3 | `InnovUseExists` already returns the level number of the stored id | existence | `results/summary/repositories/results-innovations-use.repository.ts:222` (`ciul.level AS level`), `:244-245` (`LEFT JOIN … ON ciul.id = riu.innovation_use_level_id`) | 868a115a3 | Low — DD-4 needs one lookup by id | — |
| P-4 | `level` is an `int` column, `id` a `bigint` | data-env | `clarisa/…/clarisa-innovation-use-level.entity.ts` (`type: 'int', name: 'level'`; `PrimaryGeneratedColumn({ type: 'bigint' })`) | 868a115a3 | Low — DD-5 already coerces | — |
| P-5 | Row ids differ from level numbers and repeat (test: ids 1–10 = 0–9, 13–20 = 2–9) | data-env | verified 2026-11-23 by the user (`SELECT id, level FROM clarisa_innovation_use_levels`, screenshots in `/akili-validate`): PRPROD ids 1–10 = levels 0–9 (id = level + 1, no repeats); PRTEST ids 1–10 = 0–9 plus 13–20 = 2–9 | 2026-11-23 (DB) | Low — fixtures stay valid (they model id ≠ level); only real-world impact changes | user (`SELECT id, level` on test + prod; P2-3939 P-5) |
| P-6 | **live-path**: form save → `PATCH /v2/api/innovation-use/create/result/:id` → `saveInnovationUse`; read → `GET …/get/result/:id` → `getInnovationUse` → `getScalingStudiesUrls`; bilateral → `saveInnovationUse` | live-path | client `innovation-use-info.component.ts:525` → `results-api.service.ts:593-596` (`PATCH_innovationUseP25`), `:629-631`; `innovation-use.controller.ts:25-30`, `:39-40`; `innovation-use.service.ts:69`, `:843`, `:907`; `bilateral/handlers/innovation-use.handler.ts:152` | 868a115a3 | High — patch off-path | — |
| P-7 | **shared-state**: the level is read by the 5 gates above. Siblings: `bilateral.service.ts:3683` (already the number); readiness gates on row ids `summary.service.ts:875,1096`, `bilateral.service.ts:2812` (`InnovationReadinessLevelByLevel` = ids 11–20); IPSR step 1/3 saves have no `Level_6` gate | shared-state | `grep -rn "InnovationUseLevel\.\|InnovationReadinessLevelByLevel\." src/api --include=*.ts` (non-spec) → the sites listed; `innovation_dev/enum/innov-readiness-level.enum.ts:1-12` | 868a115a3 | Low — a reader missed | — |
| P-8 | **consumer**: readers of `readiness_level_explanation` / `has_scaling_studies` / `scaling_studies_urls` from this service are the P25 form and the bilateral review; module specs stub `findOne` with `{ id, level }` | consumer | `grep -rln "getInnovationUse\|saveInnovationUse" src/api --include=*.ts` → controller, bilateral handler, MDS validator (legacy `summary`), IPSR step 1/3 (own `saveInnovationUse`); `innovation-use.service.use-level.spec.ts:27` (`findOne → { id: 3, level: '3' }`) | 868a115a3 | Low — an extra spec to update | — |
| P-9 | The form thresholds are level numbers: explanation 5–9, answer ≥ 5, links ≥ 6 | location | `innovation-use-form.component.html:439`, `:453`, `:465`; `innovation-use-form.component.ts:796-804` (`getUseLevelIndex` returns `selected.level`) | 868a115a3 | High — DD-2 thresholds wrong | — |
| P-10 | The bilateral handler sends the level number and no scaling studies | location | `bilateral/handlers/innovation-use.handler.ts:100-106` | 868a115a3 | Low — DD-2 reversion challenge revisited | — |

Hand-off: P-5 → user (settled 2026-11-23); P-8 → `Consumers` of ULT-T-1.
