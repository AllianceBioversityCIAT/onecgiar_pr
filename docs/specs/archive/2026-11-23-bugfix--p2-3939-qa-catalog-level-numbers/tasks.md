# Tasks — QA catalog level rules on level numbers (P2-3939)

## 1. Scope of this task list

- **Module / feature:** QA field catalog (`onecgiar-pr-server/src/api/qa-catalog/`) — Bug Mode, Lite
- **Linked spec:** `requirements.md` (LVL-R-1..6) + `design.md` (DD-1..8, P-1..13)
- **Owner / driver:** Santiago Sanchez (ticket assignee)
- **Status:** done — LVL-T-1..3 [x] (2026-11-23); budget overrun accepted by user

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-23)
- [x] `design.md` approved (2026-11-23)
- [ ] P-5: user runs `SELECT id, level FROM clarisa_innovation_use_levels` and the same on `clarisa_innovation_readiness_level`, on test and prod, and records the result in `execution.md` (fixture realism only; Low)
- [x] No migration (LVL-NFR-2)
- [x] No in-flight spec on the same files: `git grep -l "qa-catalog" docs/specs/*/*/tasks.md` → only `quality-assurance/qa-field-catalog` (done; deferred this item) and `changes/innovation-use-nature-all-actors` (shipped v1.35)

**Baseline (observed 2026-11-23 at `b143445bd`, `npx jest src/api/qa-catalog --silent --reporters=summary --forceExit`):** `Test Suites: 2 failed, 49 passed, 51 total · Tests: 1 failed, 1219 passed, 1220 total`. Both failures are **pre-existing and environmental**, not part of this spec:
- `qa-catalog.snapshot.spec.ts` "committed snapshot is current" — whole-file diff (−455/+455); `git ls-files --eol` → `i/lf w/crlf` (Windows working copy). Run gates on a LF checkout (`git add --renormalize` is **not** in scope) or compare with `--ignore-cr`-equivalent; CI (LF) is the authority.
- `qa-catalog.module.spec.ts` "Test suite failed to run" — `TypeError: Cannot read properties of undefined (reading 'prototype')` at `import { JwtService } from '@nestjs/jwt'`.

Every gate below compares against this baseline: **these two may stay red locally; any other red is a regression.**

## 3. Task list

### [x] LVL-T-1 — Level-number lookups + Innovation Use rule (regression first)

- **Type:** server + tests
- **Description:** Write the regression test (DD-8) first and observe it red; then register the two lookup sources (DD-2), add `innovation_use.use_level.innovation_use_level_number` (DD-1) and re-key the explanation's `visible_when` / `required_when` to `in [5..9]` on it (DD-3); remove the D28 notes (`innovation-use.ts:613-616`, `closed-control-lists.ts:16`). Update the pins in `qa-catalog.display-rules.spec.ts:76` and `qa-catalog.required-follows-form.spec.ts:130`.
  - Backend route: lead `nestjs-expert` · test-first (`tdd`) · stack `nestjs-expert` (Skill Map)
- **Implements:** LVL-R-1 (IU field; scenarios "Level number resolved from the row" incl. `AND IT MUST` repeated row and `BUT` existing value/list unchanged, "Unset level"), LVL-R-2 (both scenarios incl. `BUT` not required because id 5), LVL-NFR-1, LVL-NFR-3
- **Files (expected):** `values/lookup-sources.ts`, `definitions/sections/innovation-use.ts`, `definitions/closed-control-lists.ts`, new `qa-catalog.level-numbers.spec.ts`, `qa-catalog.display-rules.spec.ts`, `qa-catalog.required-follows-form.spec.ts`, `values/lookup-sources.spec.ts` (if it pins the registry)
- **Depends on:** — · **Blocks:** LVL-T-2, LVL-T-3
- **Estimate:** M
- **Review:** `full` — changes a payload contract (catalog keys and rules)
- **Verification:**
  - **Falsifier:** fixture rows `{id:5, level:4}`, `{id:10, level:9}`, `{id:13, level:2}`, plus a NULL level. Mutation: point the explanation's condition back at `innovation_use.use_level.innovation_use_level` (row id) → the level-4 case reads 5 ∈ [5..9] = required and the level-9 case reads 10 ∉ [5..9] = not required → test red. Second mutation: lookup `value_column: 'id'` → same red. The test MUST evaluate the catalog's **own** condition object (imported from the real definitions), never a condition authored in the test, and MUST obtain values through the real `lookup.resolver` over a stubbed query runner (not hand-written values).
  - **Red run:** `predicted — greenfield artifact (observed in LVL-T-1)`. Command: `npx jest src/api/qa-catalog/qa-catalog.level-numbers.spec.ts`. Predicted red on the assertion "level 4 → explanation not required" (received: required). Must be observed and quoted verbatim in `execution.md` **before** any definition is changed; a red from setup / import / missing key is not the red.
  - **Disqualifier:** if the resolver cannot fill a top-level lookup on the real pipeline (P-3 false), stop → Pivot. If the red is anything other than the behavioral assertion, the run is not evidence. Local snapshot/module baseline reds (§2) are not attributable to this task.
  - **Consumers:** `qa-catalog.display-rules.spec.ts:76`, `qa-catalog.required-follows-form.spec.ts:130`, `__snapshots__/qa-catalog.snapshot.json` (refreshed in LVL-T-3), `lookup-sources.spec.ts`; external QA app (P-12, via change log)
- **Definition of done:**
  - [x] Red observed and quoted (assertion-level), then green after the change
  - [x] Both mutations above executed against the post-change code → red, then reverted
  - [x] `npx jest src/api/qa-catalog --silent --reporters=summary --forceExit` = baseline (only the 2 §2 reds)
  - [x] `npx tsc --noEmit -p tsconfig.json` clean (falsifier: give the new field `type: 'numbr'` → tsc red, jest may stay green)
  - [x] `npx eslint "src/api/qa-catalog/**/*.ts" --quiet` clean
- **Skills:** `nestjs-expert`, `tdd`

### [x] LVL-T-2 — IPSR Step 3 level rules

- **Type:** server + tests
- **Description:** **First step:** settle P-7 (VS3) — read `validation_ipsr_step_three_P25` on the test DB (`SHOW CREATE FUNCTION`) or ask the user; record in `execution.md` whether it gates on `clarisa_*.level != 0`. If not → `required_confirmed: false` on the evidence lists (DD-4) and note it. Then add `ipsr_step_3.core.readiness_level_number`, `ipsr_step_3.core.use_level_number` and the complementary subfields `readiness_level_number`, `use_level_number` (DD-1); add `required_when: in [1..9]` on the four evidence lists (DD-4, no `visible_when`); add `visible_when: in [1..9]` on `core.use_level_number` to `core.current_use.actors|organizations|measures` (DD-5). Replace the guard at `qa-catalog.ipsr-step-3.spec.ts:221-226` with the assertion of §7 Step 2.3 of `design.md` (gate present **and** its field is a `lookup` with `value_column: 'level'`). Rewrite the header gap note (`ipsr-step-3.ts:26-36`, `:59-62`) to the residual NULL gap (DD-6). Extend `qa-catalog.level-numbers.spec.ts` with the S3 cases.
  - Backend route: lead `nestjs-expert` · test-first (`tdd`) · stack `nestjs-expert` (Skill Map)
- **Implements:** LVL-R-1 (S3 fields), LVL-R-3 (both scenarios incl. "stays visible" and `BUT` no `visible_when`), LVL-R-4 (scenario incl. `BUT` required flags / row rules unchanged), LVL-R-6 (code note)
- **Files (expected):** `definitions/sections/ipsr-step-3.ts`, `qa-catalog.ipsr-step-3.spec.ts`, `qa-catalog.level-numbers.spec.ts`
- **Depends on:** LVL-T-1 · **Blocks:** LVL-T-3
- **Estimate:** M
- **Review:** `full` — payload contract
- **Verification:**
  - **Falsifier:** fixtures: core readiness `{id:11, level:0}` → `readiness_evidences` not required; complementary use `{id:13, level:2}` → its `use_evidences` required; core use `{id:1, level:0}` → the 3 current-use lists not visible, `{id:13, level:2}` → visible. Mutations: (a) point any evidence gate at the row-id field → the id-13/level-2 and id-11/level-0 cases diverge → red; (b) add a `visible_when` to an evidence list → red; (c) key current use on `core.current_use_level` instead of `core.use_level` → red (the fixture sets the two to different levels). Run (a) on **each** of the 4 evidence lists and on each of the 3 current-use lists (enumeration-wide).
  - **Red run:** `predicted — greenfield artifact (observed in LVL-T-2)` — `npx jest src/api/qa-catalog/qa-catalog.level-numbers.spec.ts -t "IPSR"`; predicted red "id 13/level 2 → use_evidences required" (received: not required, no gate). Quote verbatim in `execution.md` before changing definitions.
  - **Disqualifier:** if the complementary sibling lookup cannot be resolved inside a `relation` list element (P-3 for subfields of a relation list), stop → Pivot. A red caused by the replaced guard (`no level gate may be stated`) is the old guard, not the behavioral red.
  - **Consumers:** `qa-catalog.ipsr-step-3.spec.ts` (guard at :221-226, current-use pins from :263), `__snapshots__/qa-catalog.snapshot.json` (T-3)
- **Definition of done:**
  - [x] P-7 settled and recorded first
  - [x] Red observed and quoted, then green; all 7 enumeration mutations executed → red, reverted
  - [x] `qa-catalog` jest = baseline; `tsc --noEmit` clean; eslint clean
- **Skills:** `nestjs-expert`, `tdd`

### [x] LVL-T-3 — Version bump, contract and snapshot

- **Type:** server + docs
- **Description:** `CATALOG_VERSIONS[2026].revision` 35 → 36 (check `origin/staging` / `origin/master` / `origin/performance-refactor` for a newer revision first; take the next free one); update `qa-catalog.controller.spec.ts:134`; regenerate the snapshot with `npm run qa-catalog:snapshot` on an LF working copy. `qa-catalog.en.md`: update the IU explanation rule, replace the S3 "Gap (documented, no condition stated)" text at :242 with the stated rules + residual NULL gap, remove the D28 caveat, update the "Catalog at revision" heading/examples (`:40`, `:301`, `:436`), add change-log row **v1.36** naming P2-3939, the 5 new keys, the corrected rule and the residual gap; state "no key renamed or removed".
  - Backend route: lead `nestjs-expert` · stack `nestjs-expert` (Skill Map)
- **Implements:** LVL-R-5 (scenario incl. `AND IT MUST` gap/D28 removal and `BUT` no rename/removal), LVL-R-6 (contract text)
- **Files (expected):** `definitions/versions.ts`, `qa-catalog.controller.spec.ts`, `__snapshots__/qa-catalog.snapshot.json`, `onecgiar-pr-server/docs/qa-catalog.en.md`
- **Depends on:** LVL-T-2 · **Blocks:** —
- **Estimate:** S
- **Review:** `checklist` — mechanical bump + doc; contract wording checked against DD-3..7
- **Verification:**
  - **Falsifier:** leave `revision: 35` with the new keys → `qa-catalog.snapshot.spec.ts` reports a content change without a bump (red on an LF copy). Doc sweep: `git grep -n "2026\.35\|D28\|no condition stated\|not expressible" -- onecgiar-pr-server/docs/qa-catalog.en.md onecgiar-pr-server/src/api/qa-catalog` → every remaining hit is a historical change-log row or the residual NULL gap, each read.
  - **Red run:** `predicted — greenfield artifact (observed in LVL-T-3)` — after T-1/T-2 and before the bump, `npx jest src/api/qa-catalog/qa-catalog.snapshot.spec.ts` on an LF copy must report the content-hash/key drift; quote it.
  - **Disqualifier:** a snapshot "pass" on the CRLF working copy, or a snapshot regenerated while violations exist, is not evidence. If another branch already took 2026.36, renumber (precedent `1ae11e52d`) — do not overwrite.
  - **Consumers:** `qa-catalog.controller.spec.ts:134`, `qa-catalog.snapshot.spec.ts`; external QA app (P-12)
- **Definition of done:**
  - [x] Snapshot spec green on LF; controller spec green; full `qa-catalog` jest = baseline minus the snapshot red (on LF)
  - [x] Doc sweep hits all read and justified
  - [ ] Commit convention `<emoji> <type>(qa-catalog) [P2-3939]: …` — pending user request (root `AGENTS.md` §6)
- **Skills:** `nestjs-expert`

## 4. Dependency graph

```
LVL-T-1 (regression test + IU)
   └── LVL-T-2 (IPSR step 3)
         └── LVL-T-3 (version, contract, snapshot)
```
Sequential: all three touch the snapshot/content hash.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| LVL-TEST-1 | unit (regression, red-first) | LVL-R-1, LVL-R-2 | `qa-catalog.level-numbers.spec.ts` |
| LVL-TEST-2 | unit | LVL-R-1, LVL-R-3, LVL-R-4 | `qa-catalog.level-numbers.spec.ts` (IPSR), `qa-catalog.ipsr-step-3.spec.ts` |
| LVL-TEST-3 | unit (pins) | LVL-R-2 | `qa-catalog.display-rules.spec.ts`, `qa-catalog.required-follows-form.spec.ts` |
| LVL-TEST-4 | snapshot / version | LVL-R-5 | `qa-catalog.snapshot.spec.ts`, `qa-catalog.controller.spec.ts` |

### Coverage closure (scenario / clause level)

| Requirement · scenario / clause | Owner |
|---|---|
| R-1 resolved from row · `AND IT MUST` repeated row · `BUT` value/list unchanged | T-1 (IU), T-2 (S3) |
| R-1 unset level | T-1 |
| R-2 level 4 · `BUT` not required by id 5 | T-1 |
| R-2 level 9 | T-1 |
| R-3 level 0 · `AND` stays visible | T-2 |
| R-3 repeated row · `BUT` no `visible_when` | T-2 |
| R-4 use level 0 · `BUT` required flags unchanged | T-2 |
| R-5 bump · change-log · `AND IT MUST` gap/D28 removed · `BUT` no rename | T-3 (D28 code notes: T-1) |
| R-6 residual gap | T-2 (code), T-3 (contract) |
| NFR-1 / NFR-3 | T-1 |
| NFR-2 no migration | all (no migration file; `migration:check` unaffected) |

## 6. Rollout & verification

- [ ] PR to `staging` with `[P2-3939]` commits; CI green (LF snapshot authoritative)
- [ ] Notify the QA app owner of 2026.36 (change-log row)
- [ ] Follow-up ticket for `innovation-use.service.ts:215,254,299,342,1017` `Level_6` vs row id (proposal §6)
