# Proposal — QA catalog level rules on level numbers (P2-3939)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Slug | `p2-3939-qa-catalog-level-numbers` — derived from the Jira URL argument (ticket key + core intent) |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | [P2-3939](https://cgiarmel.atlassian.net/browse/P2-3939) (Bug, Medium, epic P2-2340 "Bugs 2026") |
| Requirement source | Jira ticket (description + 4 acceptance criteria; no comments, no attachments) |
| Origin | Deferred from P2-3925 / QAC-T-30 — `docs/specs/quality-assurance/qa-field-catalog/tasks.md:353`, `execution.md:408` |
| Parent / related spec | `quality-assurance/qa-field-catalog` (owner of `GET /api/qa/catalog`) |
| Depends on | none · Parallel-safe: yes (touches only `api/qa-catalog/` + its contract doc) |
| Status | Proposed — 2026-11-23 |

## 2. Intent

Make the QA field catalog state every use-level / readiness-level rule against the **level number (0–9)**, not the level-table **row id** the database stores, so QA asks for exactly what the form asks for.

## 3. Problem / Current Behavior

| # | Current behavior | Citation |
|---|---|---|
| P1 | Innovation Use stores the level **row id**, not the level number: the service looks the row up by `level` and saves `use_levels.id`. | `innovation-use.service.ts:131-140` (`findOne({ where: { level } })` → `innovation_use_level = use_levels.id`), saved at `:200`, `:244` |
| P2 | The catalog gates `innovation_use.use_level.readiness_level_explanation` with `in [5..9]` on that stored row id. | `qa-catalog/definitions/sections/innovation-use.ts:618-627` (`whenIn('innovation_use.use_level.innovation_use_level', [5,6,7,8,9])`, binding `col(USE_TABLE,'innovation_use_level_id')` at `:596`) |
| P3 | The form shows/requires the explanation on the level **number** 5–9, so catalog and form disagree by one level wherever id = level + 1 (QA asks at level 4, not at level 9). | Ticket; form `innovation-use-form.component.html:385` (`optionValue="level"`), `:412-416` (`getUseLevelIndex() > 4 && <= 9`) — `UNVERIFIED — confirm at source before relying on it` (client lines quoted from the ticket and the code comment, not re-read) |
| P4 | The code already flags this as unverified (D28). | `innovation-use.ts:613-616` |
| P5 | IPSR Step 3 rules ("evidence required when level ≠ 0", "current use hidden when core use level = 0") are **not stated** — documented as a known gap because the stored values are row ids that differ by environment (test DB: use ids 1–10 = levels 0–9 plus ids 13–20 = levels 2–9; readiness ids 11–20 = levels 0–9). | `onecgiar-pr-server/docs/qa-catalog.en.md:242` ("Gap (documented, no condition stated)") |
| P6 | Both level tables carry a `level` column next to `id`. | `clarisa-innovation-use-level.entity.ts:10-15`, `clarisa-innovation-readiness-level.entity.ts:8-12` |
| P7 | Condition vocabulary is `eq`, `in`, `not_null` only — no `not`, no `is_null`. | `qa-catalog/definitions/types.ts:152`, `shape-validator.ts:59` |
| P8 | Top-level and sibling `lookup` bindings already exist and are resolved by the feed (`requires_description`, `option_label`). | `general-information.ts:447-458`, `values/lookup.resolver.ts` (Target `topLevel`) |

## 4. Proposed Outcome

- The catalog exposes a read-only **level number** next to every level field that drives a rule.
- Innovation Use explanation: visible and required exactly for use levels **5–9**, as the form.
- IPSR Step 3: evidence required when the level number is **not 0** (`in [1..9]`); core current use hidden when the core use level number is **0**. The known gap is removed from the contract.
- `catalog_version` bumped (2026.35 → 2026.36) with a change-log row explaining the correction.

## 5. Scope

| In | Detail |
|---|---|
| Lookup sources | Register `prms.innovation_use_levels` (`clarisa_innovation_use_levels`) and `prms.innovation_readiness_levels` (`clarisa_innovation_readiness_level`) in `values/lookup-sources.ts`, value column `level` |
| Innovation Use | New read-only lookup field `innovation_use.use_level.innovation_use_level_number`; re-key the explanation's `visible_when`/`required_when` to it; drop the D28 note |
| IPSR Step 3 core | Level-number lookups for `core.readiness_level`, `core.use_level`, `core.current_use_level` (as needed by the rules); `visible_when`/`required_when` on `core.readiness_evidences`, `core.use_evidences`, `core.current_use.actors|organizations|measures` |
| IPSR Step 3 complementary | Sibling lookup subfields `readiness_level_number`, `use_level_number` inside each `complementary_components` element; rules on its `readiness_evidences` / `use_evidences` |
| Contract | `qa-catalog.en.md`: remove the step-3 gap text, update the Innovation Use rule, new change-log row, version bump |
| Tests | Regression tests (red first): a use-level row id 5 (level 4) → explanation not required; row of level 9 → required; IPSR evidence required for a level number ≠ 0 on a repeated-row id (e.g. id 13 = level 2); snapshot refresh |

## 6. Non-Goals

- Changing what is **stored** (`innovation_use_level_id` stays a row id) — no migration.
- The `>= InnovationUseLevel.Level_6` comparisons on row ids in `innovation-use.service.ts:215,254,299,342,1017` (ticket's "related observation") — logged as a follow-up, not fixed here.
- Bilateral (`bilateral.service.ts:2812,3683`) and summary level comparisons.
- Adding `not` / `is_null` to the condition vocabulary.
- Any client (form) change.

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| QA reviewers / QA app consuming `GET /api/qa/catalog` | Rule correction; new read-only keys (additive, no rename/removal) |
| `GET /api/qa/results` feed | Carries the new lookup values (resolved by the existing lookup resolver) |
| `onecgiar-pr-server/src/api/qa-catalog/**` | definitions, lookup sources, specs, snapshot |
| `onecgiar-pr-server/docs/qa-catalog.en.md` | Contract + change log |
| Spec `quality-assurance/qa-field-catalog` | Its deferred item closes here |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: backend-only change (catalog definitions + contract doc); no UI surface.

## 9. Bug Diagnosis

### Observed Symptom
- QA catalog asks for the Innovation Use explanation at level 4 and not at level 9 (where id = level + 1).
- IPSR Step 3 evidence / current-use rules are absent from the catalog (known gap).

### Reproduction Steps
1. Save an Innovation Use result with level **4** from the form → server stores the row id of level 4 (row id 5 where id = level + 1).
2. `GET /api/qa/catalog` → explanation `required_when: innovation_use_level in [5..9]`.
3. `GET /api/qa/results` value `innovation_use_level = 5` → the rule fires. **Expected:** not required (form shows nothing at level 4). **Actual:** required.
4. Mirror case: level **9** → stored id 10 → rule does not fire; form requires it.

### Root Cause (confirmed)
The catalog binds level fields to the stored FK (`innovation_use_level_id`, `ipsr` level columns), which holds the **row id** of `clarisa_innovation_use_levels` / `clarisa_innovation_readiness_level` (`innovation-use.service.ts:140`), while the rules were written in **level numbers** (`innovation-use.ts:618-627`). Ids ≠ level numbers and differ by environment (`qa-catalog.en.md:242`).

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git fetch --all; git log --all --oneline -i --grep="P2-3939"` → only `449fc1d58 docs(qa-catalog) P2-3925: defer level-number rules to P2-3939`. `qa-catalog.en.md` on `origin/master`, `origin/staging`, `origin/performance-refactor` all at `catalog_version 2026.35` with the gap still documented | **Not fixed** on any branch — proceed |
| **Live path?** | `GET /api/qa/catalog` → `qa-catalog.controller.ts` → `qa-catalog.service.ts` → section definitions (`innovation-use.ts:599-631`, `ipsr-step-3.ts:323-720`) → `shape-validator` / snapshot. Values: `GET /api/qa/results` → `qa-results.service.ts` → `values/value-reader` → `lookup.resolver.ts` | The patched definitions are what the endpoint serves — on path |
| **Siblings on the same state** | `ipsr-step-3.ts:323` `core.current_readiness_level`, `:336` `core.current_use_level`, `:351` `core.readiness_level`, `:380` `core.use_level`, `:665+` complementary `readiness_level`/`use_level`/`current_*_level`; `innovation-use.service.ts:215,254,299,342,1017` (`Level_6` vs row id) | Step-3 fields in scope; service comparisons out of scope (§6) |
| **Downstream consumers** | QA app (external) on `/api/qa/catalog` + `/api/qa/results`; specs `qa-catalog.innovation-use.spec.ts`, `qa-catalog.ipsr-step-3.spec.ts`, `qa-catalog.display-rules.spec.ts`, `qa-catalog.required-follows-form.spec.ts`, `qa-catalog.snapshot.spec.ts` + `__snapshots__/qa-catalog.snapshot.json`, `lookup-sources.spec.ts` | Additive keys + rule change → version bump; snapshot and specs updated |

- No data-integrity or security impact: read-only catalog metadata; nothing stored changes.

### Fix Strategy
Smallest safe correction = **lookup field of the level number + rules restated on it** (ticket's proposal; same pattern as `general.discontinued_reasons>requires_description`). Route: `/akili-specify` (Lite) in **Bug Mode** with a regression test red-before / green-after.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Lookup level number (recommended)** | Read-only `lookup` field/subfield reading `level` from the level table; rules on it | Uses existing binding kind + resolver; additive; environment-independent; matches ticket AC1 | New lookup sources to register; one extra SELECT per source per batch |
| B. Rewrite rules on row ids | `in [ids of levels 5–9]` | No new keys | Ids differ by environment and have repeated rows (13–20) — wrong by design |
| C. Normalizer on the stored value | Replace the exposed value with the level number | Rules unchanged | Breaks the `control_list` contract (value no longer a row id of `use_levels`); breaking change for consumers |

## 11. Recommended Approach

**Option A.** It is what the ticket prescribes, reuses `kind: 'lookup'` (already top-level and sibling-capable), keeps every existing key and value shape, and states "≠ 0" as `in [1..9]` within the current `eq/in/not_null` vocabulary.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| OQ-1 | Complementary element: the form/function also require evidence when the level is **NULL**. The vocabulary has no `is_null`. Proposal: state `in [1..9]` and keep the NULL case as a narrowed known gap. **Confirm with the owner.** |
| OQ-2 | Do the 2026 form and the live step-3 function gate the **current** use level too, or only the evidence-based `use_level`? Confirm the exact field the "hide current use" rule reads (`core.use_level` vs `core.current_use_level`). |
| OQ-3 | Key naming for the new lookups (`*_level_number`) — confirm with the QA app consumer. |
| R-1 | `catalog_version` collision: other branches may bump to 2026.36 in parallel (precedent: v1.34/v1.35 renumbering, commit `1ae11e52d`). Re-check before merge. |
| R-2 | Repeated level rows (ids 13–20) must resolve to the same `level` — verify on test and prod data before relying on it (`UNVERIFIED — confirm at source`). |
| R-3 | Completeness guard: lookups claim no table; registering new `prms.*` sources must not trip `qa-catalog.completeness.spec.ts`. |

## 13. Success Criteria

1. Catalog exposes the level number for each level field that drives a rule (AC1).
2. Explanation visible + required exactly for use levels 5–9 (AC2) — regression test red on the current code, green after.
3. IPSR Step 3 level rules stated; the step-3 gap removed from `qa-catalog.en.md` (AC3).
4. `catalog_version` raised, change-log row explains the correction (AC4).
5. Server Jest + lint + snapshot green.

## 14. Next Step

```text
/akili-specify bugfix/p2-3939-qa-catalog-level-numbers
```

Runs in **Bug Mode** (Lite): root cause → fix plan + mandatory regression test.
