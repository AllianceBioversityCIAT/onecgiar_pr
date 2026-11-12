# Tasks — Hide the 2030 Use Projection on W3/Bilateral Innovation Use (`IWH`)

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-w3-hide-2030` |
| Depth | Lite |
| Branch | `qa-development-2026-ss` |
| Status | Draft — Phase 3 |

## 1. Scope

Client-only hide on two forms (T-1, T-2) plus one user-run data fix (T-3). No server code, no migration, no payload change. Test runs: `--maxWorkers=2`, scoped, one run at a time.

## 2. Task list

### IWH-T-1 — Shared form hides the 2030 block for W3 (not IPSR)

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | — |
| Requirements | IWH-R-1 (all three scenarios, the BUT clause and the AND IT MUST clause) |
| Design | §5 rows 1-2, IWH-DD-1, IWH-DD-3, P-1..P-5 |
| Review | `checklist` — template gate + one getter; the risk is a wrong boundary, which the DOM tests catch |
| Skills | `angular-developer`, `tdd` |

**Scope**
- `innovation-use-form.component.ts`: `get hides2030Projection()` = `!isIpsr && currentResultSignal()?.source_name === W3_BILATERALS_SOURCE_NAME`.
- `innovation-use-form.component.html`: `@if (!hides2030Projection) { … }` around `:449-794` (the `2030-to-be-determined` radio through the end of the justification `@if`). Nothing outside that range.
- Design route: `none — no visual change, block removal only`.
- Backend route: n/a.

**Tests** (`innovation-use-form.component.spec.ts`, new `describe('IWH — 2030 block by source')`)
1. W3 (`source_name: 'W3/Bilaterals'`, `isIpsr=false`) → no `[data-block="2030"]`, no `iu-field-2030-projection-question`, no `2030-to-be-determined` radio.
2. W1/W2 → all three present.
3. W3 signal + `isIpsr=true` → present.
4. Signal returns `undefined` / no `source_name` → present.
5. Payload: with W3 and the block hidden, `body.innov_use_2030_to_be_determined` and `body.innovation_use_2030` are unchanged after `ngOnInit` (the form does not rewrite them).

**Verification fields**
- Falsifier: replace the getter body with `return false` → test 1 red. Replace it with `return true` → tests 2, 3 and 4 red. Drop `!this.isIpsr` → test 3 red.
- Red run: predicted — greenfield artifact (observed in IWH-T-1). Test 1 is written before the `@if` and must fail on the assertion "expected no `[data-block="2030"]`". Quote that red verbatim in `execution.md`.
- Disqualifier: a test 1 that passes before the `@if` exists means the fixture does not reach the block (for example `innov_use_2030_to_be_determined = true`, which hides only the lists). Fixture: tbd `null`, so the lists render on W1/W2.
- Consumers: `innovation-use-form.component.spec.ts`, `innovation-use-form.zoneless.spec.ts`, `step-n1.component.spec.ts`, `innovation-use-info.component.spec.ts`, `fields-manager.service.spec.ts` (from the design grep). All run via `--findRelatedTests`.

**Verification command**
`cd onecgiar-pr-client && npx jest --findRelatedTests src/app/shared/components/innovation-use-form/innovation-use-form.component.ts src/app/shared/components/innovation-use-form/innovation-use-form.component.html --maxWorkers=2 --silent --reporters=summary --no-coverage` + `npx eslint <touched .ts> --quiet`.

**Done criteria**
- Tests 1-5 green, falsifier mutations observed red, related suites green, lint clean.
- `innovation-use-form/CLAUDE.md` gets one line on the W3 gate.

---

### IWH-T-2 — Bilateral form drops the 2030 block

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | — (parallel-safe with T-1, different files; run tests serially) |
| Requirements | IWH-R-2 (scenario, the BUT clause) |
| Design | §5 rows 3-4, IWH-DD-2, IWH-DD-3, P-6, P-7 |
| Review | `full` — reverts P2-3428 and edits a Save gate |
| Skills | `angular-developer`, `tdd` |

**Scope**
- `type-innovation-use.component.html`: delete the P2-3428 block `:292-378`. Leave one HTML comment: `INC-168060 (Nicoleta, 2026-11-11): 2030 projection is not MDS for W3/bilateral results — block removed; stored data is kept and still sent back as loaded.`
- `type-innovation-use.component.ts`: `hasActorMissingType` checks current-use actors only. Update its doc comment.
- Do not touch `buildPayload`, `showProjection2030Lists`, `projection2030` or `addProjection2030*`.
- Design route: `none — block removal`. Backend route: n/a.

**Tests** (`type-innovation-use.component.spec.ts`)
1. Rewrite `describe('2030 Use Projection (P2-3428)')`: the template does NOT contain `projection2030Copy.title`, `showProjection2030Lists` or `addProjection2030Actor`.
2. `hasActorMissingType` is `false` when the only typeless actor is in `innovation_use_2030.actors` (tbd `null`).
3. `buildPayload` with a loaded `innov_use_2030_to_be_determined: false` and one 2030 actor → payload carries `false` and that actor.
4. Keep the existing current-use `hasActorMissingType` tests green.

**Verification fields**
- Falsifier: restore the `projection` half in `hasActorMissingType` → test 2 red. Restore the markup → test 1 red.
- Red run: write test 2 first against current code → observed red on `expected false, received true`. Quote it in `execution.md` before the edit.
- Disqualifier: a test 2 whose fixture has tbd `true` passes on today's code for the wrong reason (today's lists are hidden when tbd is true). Fixture must use tbd `null`.
- Consumers: `type-innovation-use.component.spec.ts`. No other file references `showProjection2030Lists` or `hasActorMissingType` (grep in design §1A).

**Verification command**
`cd onecgiar-pr-client && npx jest --findRelatedTests src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.ts src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.html --maxWorkers=2 --silent --reporters=summary --no-coverage` + eslint on the touched `.ts`.

**Done criteria**
- Tests green, red runs quoted, lint clean.
- `type-innovation-use/CLAUDE.md` P2-3428 entry marked "removed by INC-168060".

---

### IWH-T-3 — Data fix for W3 rows left at NULL (user-run)

| Field | Value |
|---|---|
| Status | [x] |
| Size | XS |
| Depends on | T-1, T-2 deployed (or run any time; it is independent of code) |
| Requirements | IWH-R-1 / IWH-R-2 context (no user can answer the hidden question) |
| Design | IWH-DD-4, P-8, P-9, P-10 |
| Review | `skip-eligible` — reason: 2-row UPDATE run by the user in DBeaver, checked by re-running the validation query. The claim to prove at execution time: exactly 2 rows affected and both validations read back |
| Skills | — |

**Scope**
The user runs this on PRMSPROD (and the same on PRTest, where 149 rows are NULL). The SQL is given in chat, not as a file. Scope: `source='API'`, `result_type_id=2`, active, phase year 2026, tbd NULL. Settle P-10 by re-running `validation_innovation_use_P25` on the touched ids.

**Verification fields**
- Falsifier: a `WHERE` without `v.phase_year = 2026` → affects 3 rows in prod, not 2.
- Red run: observed — prod query 2026-11-11: ids 32686 and 32740 return `iu_section_ok = 0`.
- Disqualifier: affected rows ≠ 2 → ROLLBACK, do not commit.
- Consumers: none.

**Done criteria**
- 2 rows updated in prod. Re-run shows `iu_section_ok`; if it is still `0`, record it as a separate cause (does not block T-1/T-2).

## 3. Dependency graph

T-1 ∥ T-2 (separate files; tests run serially) → PRTest check (result 5093 + one bilateral IU) → T-3 (user).

## 4. Coverage closure

| Clause | Task / test |
|---|---|
| R-1 W3 THEN not rendered | T-1 test 1 |
| R-1 AND current use unchanged | T-1 (scope boundary `:449`, related suites) |
| R-1 BUT payload unchanged | T-1 test 5 |
| R-1 AND IT MUST show while unknown | T-1 test 4 |
| R-1 W1/W2 scenario | T-1 test 2 |
| R-1 IPSR scenario | T-1 test 3 |
| R-2 THEN not rendered | T-2 test 1 |
| R-2 AND other blocks unchanged | T-2 test 4 + existing P2-3424 tests |
| R-2 BUT payload keeps stored values | T-2 test 3 |
| Visual gap (no automated gate) | PRTest HITL check |
