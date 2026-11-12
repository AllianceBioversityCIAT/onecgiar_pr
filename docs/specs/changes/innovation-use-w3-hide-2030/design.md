# Design — Hide the 2030 Use Projection on W3/Bilateral Innovation Use (`IWH`)

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-w3-hide-2030` |
| Depth | Lite |
| Requirements | `requirements.md` (IWH-R-1, IWH-R-2) |
| Verified at | `3e54aa295` |
| Status | Draft — Phase 2 |

## 1. Summary

The change is client-only, plus one optional data fix.
- **Shared form** (`innovation-use-form`): add one getter `hides2030Projection = !isIpsr && source_name === W3_BILATERALS_SOURCE_NAME` and wrap the whole 2030 block (`.html:449-794`) in `@if (!hides2030Projection)`.
- **Bilateral form** (`type-innovation-use`): remove the P2-3428 "2030 Use Projection" block from the template (`.html:292-378`), and take the projection actors out of `hasActorMissingType`. Otherwise a hidden row with no actor type would still block Save (`.ts:247`, `:801`, `:907`).
- **The payloads do not change.** Both forms keep sending the 2030 keys exactly as they were loaded.
- **Data (IWH-T-3, user-run):** the 2 W3 rows in the 2026 prod phase whose `innov_use_2030_to_be_determined` is NULL get `1`. That is the value the bilateral ingest writes for every new W3 result. Once the block is hidden nobody can answer the question, and NULL is what keeps the P25 Innovation Use check red.

## 1A. Premise Ledger

Count: 9 verified · 1 UNVERIFIED (Low: 1, High: 0).
Blast-radius triggers: `live-path` (user action "open IU section" with a branch on source/isIpsr) · `shared-state` (shared form used by result-detail + IPSR step 1) · `consumer` (template markup pinned by specs).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The 2030 block in the shared form runs from the `2030-to-be-determined` radio to the end of the `projection2030JustificationRequired` @if | location | `innovation-use-form.component.html:449-794` (grep `2030`, lines 451 → 794) | 3e54aa295 | T-1's wrap boundaries change (Low) | — |
| P-2 | The shared form reads the source from `api.dataControlSE.currentResultSignal().source_name`, and the value is `'W3/Bilaterals'` when `result.source <> 'Result'` | data-env | `innovation-use-form.component.ts:535`; `farmer-follow-up.ts:21`; server `result.repository.ts:764` `IF(r.source = 'Result','W1/W2','W3/Bilaterals')` | 3e54aa295 | DD-1's condition is wrong (High) | — |
| P-3 | Live path: `result-detail/:id/innovation-use-info` mounts `app-innovation-use-form` without `isIpsr`; IPSR step 1 mounts it with `[isIpsr]="true"` | live-path | `innovation-use-info.component.html:48`; `step-n1.component.html:30`; grep `app-innovation-use-form` over `src/app/**/*.html` → these 2 hits only | 3e54aa295 | Other mount points need a decision (High) | — |
| P-4 | Shared-state siblings that read the 2030 block's state: the template-only `projection2030Locked`, `has2030PreviousProjection` and `projection2030JustificationRequired` (DOM-scanned mandatory marker). No TS save or validity gate reads them | shared-state | `innovation-use-form.component.ts:415-442` (getters only); justification `appFeedbackValidation` at `.html:792` sits inside the block | 3e54aa295 | A hidden field could still block the missing-fields list (Low) | — |
| P-5 | Result-detail sends the 2030 keys from `innovationUseInfoBody` as loaded (NULL loads as `false`, `=== 1`) | data-env | `innovation-use-info.component.ts:251`, `:478-480` | 3e54aa295 | DD-3 must add normalization (Low) | — |
| P-6 | The bilateral form keeps NULL as NULL and sends `innov_use_2030_to_be_determined ?? null` plus `innovation_use_2030` whole | data-env | `type-innovation-use.component.ts:564-567`, `:838-844` | 3e54aa295 | DD-3 changes (Low) | — |
| P-7 | Bilateral Save refuses when `hasActorMissingType`, which today includes projection actors while their lists are shown | shared-state | `type-innovation-use.component.ts:244-248`, `:801`, `:907` | 3e54aa295 | Hidden rows silently block Save (High) → handled by DD-2 | — |
| P-8 | Prod: 3 active W3 IU results have `innov_use_2030_to_be_determined` NULL, and all 3 return `validation_innovation_use_P25 = 0`; the 2 with `0` return `1` | data-env | User ran the query on PRMSPROD 2026-11-11 (screenshot): ids 29318 (2025, status 6), 32686 and 32740 (2026, status 1) | n/a (DB) | The data fix is unnecessary or insufficient (Low) | — |
| P-9 | The bilateral ingest writes `innov_use_2030_to_be_determined: true` for every new W3 IU result | existence | `api/bilateral/handlers/innovation-use.handler.ts:102` | 3e54aa295 | DD-4's value choice changes (Low) | — |
| P-10 | NULL is the only reason those 3 rows fail the P25 IU check | data-env | UNVERIFIED — confirm at source before relying on it | — | The data fix does not turn them green; the hide still stands (Low) | IWH-T-3 (re-run the validation after the UPDATE) |

**Consumers (template markup / selectors removed or wrapped):** grep of `2030-to-be-determined|iu-field-2030|iu-2030-previous-note|innovation_use_2030|projection2030` over `onecgiar-pr-client/src` and `cypress` (`*.ts`) → `innovation-use-form.component.spec.ts`, `innovation-use-form.zoneless.spec.ts`, `type-innovation-use.component.spec.ts`, `step-n1.component.spec.ts`, `innovation-use-info.component.spec.ts`, `fields-manager.service.spec.ts`. No Cypress hit.

## 2. Architecture

Nothing changes in the structure: two template gates and one getter edit. No endpoint, entity or migration changes.

## 3. Data Model

No schema change. One optional user-run data fix (IWH-T-3).

## 4. API

None. Bilateral `/api/bilateral/*` payloads are unchanged.

## 5. Frontend Plan

| File | Change |
|---|---|
| `shared/components/innovation-use-form/innovation-use-form.component.ts` | `get hides2030Projection(): boolean` — `!this.isIpsr && source_name === W3_BILATERALS_SOURCE_NAME` (reuses the existing import and the existing signal read) |
| `…/innovation-use-form.component.html` | `@if (!hides2030Projection) { … }` around `:449-794` |
| `pages/bilateral/…/type-innovation-use.component.html` | Delete the P2-3428 block `:292-378` and replace it with a one-line comment that cites INC-168060 |
| `…/type-innovation-use.component.ts` | `hasActorMissingType` checks current-use actors only. `showProjection2030Lists`, `projection2030` and the `addProjection2030*` methods stay: the payload builder and specs still use them, and removing them is out of scope |

## 6. Design Decisions

### IWH-DD-1 — Gate on `source_name`, not on the route
The shared form already uses this exact signal for the Farmers gate (P-2), and it fails toward showing the block while the value is unknown (IWH-R-1 "AND IT MUST"). Rejected: a new `@Input() hide2030` set by `innovation-use-info`. That needs the same signal one level up and adds a binding for no gain.

### IWH-DD-2 — Bilateral: delete the markup, not `@if (false)`
Every result on that page is W3, so no condition is needed. `hasActorMissingType` drops the projection half; otherwise hidden rows would block Save (P-7).
*Reversion challenge (Step 2.3), "what does removing this break?":* (a) a W3 reviewer can no longer view or edit 2030 data that is already stored. Prod has 2 such results (tbd=0 with 2030 actors). The data stays stored but becomes invisible, and this is accepted per Nicoleta ("should not be in PRMS"). (b) Specs that pin the P2-3428 markup (`type-innovation-use.component.spec.ts:447-500`) must be rewritten to assert the absence. (c) P2-3428 was a Jira request: whoever raised it should hear about the reversal (open question Q-1).

### IWH-DD-3 — Payloads unchanged
Hiding is display-only. Forcing `true` on save would make the server retire the 2030 lists of the 2 prod rows with data (`type-innovation-use.component.ts:840` comment: "retires them when yet to be determined"). Sending the values as loaded keeps the data intact.

### IWH-DD-4 — The NULL rows are fixed with data, not with a validation-function change
Only 3 prod rows are affected (P-8). New W3 rows already arrive with `1` (P-9). Changing `validation_innovation_use_P25` would mean editing a live DB function for 3 rows. The UPDATE is scoped to the 2026 phase (2 rows). The 2025 row (29318) is Approved in a closed phase, so it is left alone unless the user asks.

## 7. Testing Plan

Jest (`--findRelatedTests` on the 4 changed files, `--maxWorkers=2`):
- shared form DOM: W3 → no `[fieldRef*=2030-to-be-determined]` / no `[data-block="2030"]`; W1/W2 → present; `isIpsr` + W3 signal → present; source unknown → present.
- bilateral: template has no `projection2030Copy.title`; `hasActorMissingType` ignores a projection actor without a type; `buildPayload` still carries the loaded `innov_use_2030_to_be_determined` and `innovation_use_2030`.

Type-check: `npx tsc -p tsconfig.app.json --noEmit` (template binding errors are caught by Jest DOM render).

## 8. Budget (tripwire)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 3 (T-1 shared form, T-2 bilateral, T-3 data, user-run) | ~120 (≈20 code + ≈100 spec) | 1 per code task |

## 9. Open Questions

| ID | Question | Owner |
|---|---|---|
| Q-1 | Tell the P2-3428 requester that the bilateral 2030 block is removed per Nicoleta? | Santiago |
| Q-2 | Also UPDATE the 2025 Approved row 29318? | Santiago (default: no) |
