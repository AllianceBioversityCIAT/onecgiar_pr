# Design — Bilateral "Update result": enforce lead-Centre authorization

## 1. Summary

Route a genuine W3/Bilateral result to `versionProcessV2` from the top of `versionProcess`, branching on the result's own identity instead of on a raw-query property that never exists. The guard, the rules service, and the rejection message all already exist and are already tested — nothing new is written on the authorization side. The change is reachability plus the scope key.

- **Depth:** Lite · **Mode:** Bug
- **Requirements:** `VER-R-1` … `VER-R-4`
- **Touches:** `onecgiar-pr-server/src/api/versioning/` only. No client, no schema, no migration, no payload.

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | File | Change |
|---|---|---|
| Service | `src/api/versioning/versioning.service.ts` | New private routing predicate + early delegation in `versionProcess` |
| Service (existing, untouched) | `versioning.service.ts` → `assertBilateralVersioningAllowed`, `versionProcessV2` | Reached at last; no edit |
| Service (existing, untouched) | `src/api/bilateral/versioning-rules/bilateral-versioning-rules.service.ts` | Consumed; no edit |
| Spec | `src/api/versioning/versioning.service.spec.ts` | Regression + real-shape + AVISA tests |
| Spec (new) | `src/api/results/results_by_inititiatives/resultByInitiatives.repository.spec.ts` (or existing) | Contract test on the selected columns |

### 2.2 Sequence — before and after

**Today** (`PATCH /api/versioning/phase-change/process/result/:id`, no body):

```
controller → versionProcess
  ├─ KP check (result_type_id == 6)                  → 409 generic
  ├─ if (ownerInitiative?.inititiative_id)            → ALWAYS FALSE, branch dead
  └─ $_genericValidation → $_versionManagement        → row written, nobody checked who asked
```

**After:**

```
controller → versionProcess
  ├─ isBilateralCarryForward(result)?                 → resolveTargetEntityId → versionProcessV2
  │                                                        └─ assertBilateralVersioningAllowed → 403 / eligibility
  ├─ KP check                                         → unchanged for W1/W2 and AVISA
  ├─ if (ownerInitiative?.inititiative_id)            → still dead; out of scope (VER-OQ-1)
  └─ legacy path                                      → unchanged for W1/W2 and AVISA
```

## 3. Data Model Changes

None. No entity, no column, no migration. `npm run migration:check` must stay clean.

## 4. API Surface

### 4.1 Endpoints

| Endpoint | Change |
|---|---|
| `PATCH /api/versioning/phase-change/process/result/:resultId` | Same route, verb, request and success response. The refusal path gains **403** (lead Centre) and the eligibility **409**s the API path already returns. No new endpoint, no versioned rollout needed |

The client needs no change: `change-phase-modal.accept()` already renders `409` as an information toast and everything else as an error toast.

### 4.2 Bilateral / platform-report impact

None. No payload field is added, removed or renamed, so `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` gets **no change-log entry** (`AC-4` does not trigger).

## 5. Server Workflow / Business Rules

The routing predicate answers one question: *is this a genuine W3/Bilateral carry-forward?*

| Condition | Source of truth | Why |
|---|---|---|
| `result.source === SourceEnum.Bilateral` | `result.source` column | The result's own identity; no query shape involved |
| primary submitter `official_code !== 'SGP-02'` | `getOwnerInitiativeByResult(result.id).official_code` | `VER-R-4`. A column the query genuinely selects — verified, and pinned by the contract test |

Both true → resolve the entity via `BilateralVersioningRulesService.resolveTargetEntityId` and delegate to `versionProcessV2`, which runs `assertBilateralVersioningAllowed` before any write. Either false → fall through untouched.

The predicate performs the owner-initiative lookup **only when `source` is `'API'`**, so the W1/W2 path gains no query.

## 6. Frontend Plan

No change. `VER-OQ-3` (the modal's missing AVISA carve-out) is recorded as a separate defect and deliberately not folded in.

## 7. Security & Authorization

- Enforcement stays in the service layer, reached before any write — `AC-3`, TRD §8 ("Frontend role gates are UX only — backend MUST enforce").
- Admin exemption preserved: `role_id === 1`, which `role-by-user.service.ts:147` confirms is the application-level Admin and not a centre or initiative role.
- The 403 message names the lead Centre and the result code only — no role payload, no user identifiers, no secrets (`.cursorrules`, `AC-9`).
- Identity comparison verified: `role_by_user.center_id` and `results_center.center_id` are both `varchar(15)`, so the strict equality in the existing guard holds.

## 8. Performance & Capacity

One extra `SELECT` (the owner-initiative lookup) on the bilateral carry-forward path, an interactive action taken a handful of times per phase. W1/W2 unchanged. No measurable impact.

## 9. Observability

No new logging. The refusal is attributable through the response message (result code + lead Centre). Existing `_logger.log` in `$_phaseChangeReporting` is untouched.

## 10. Testing Plan

| Test | Proves | Fails when |
|---|---|---|
| Regression: `versionProcess` for a bilateral, with the repository's **real** row shape | `VER-R-1`, `VER-AC-4` — the guard runs | On current code (entry condition), and if the branch is removed |
| Non-lead Centre → 403 naming the Centre; no write | `VER-R-2`, `VER-AC-1` | The membership check is dropped or inverted |
| Lead Centre and admin → pass | `VER-AC-2`, D3 | A legitimate identity is rejected |
| AVISA (`source='API'`, submitter `SGP-02`) → legacy path, guard never called | `VER-R-4`, `VER-AC-6`, D5 | The `SGP-02` condition is dropped from the key |
| W1/W2 → existing suite, no assertion modified | `VER-R-3`, `VER-AC-5`, D2 | The branch is placed before the `source` test |
| Contract: `getOwnerInitiativeByResult` selects `id`, `official_code`, `initiative_name`, `short_name`, `initiative_role_id`, `from_toc`, `is_active` | D4 | A selected column is renamed or removed |

**Why the contract test is not ceremony.** The mock at `versioning.service.spec.ts:109` returns `{ inititiative_id: 100 }` — a shape the SQL cannot produce — and 413 green tests certified a branch production never enters. A unit test written from the same wrong assumption passes forever. D4 has no other gate.

## 11. Backwards Compatibility & Migration Plan

| Consumer | Effect |
|---|---|
| W1/W2 phase change | None |
| AVISA / SGP-02 | None (`VER-R-4`) |
| Bilateral API carry-forward (P2-3228) | None — never routes through `versionProcess` |
| Bilateral reporting-tool carry-forward | Refusals that should always have happened now happen. Rows already created without authorization are **not** retro-corrected by this change (`VER-OQ-2`) |

No rollback tooling needed: reverting the commit restores the previous (defective) behavior exactly.

## 12. Design Decisions

### `VER-DD-1` — Branch on the result's identity, not on the owner-initiative lookup

The bug exists because a routing decision depended on a property of a raw-query row. The fix must not reproduce that coupling: `source` is a column on the result being processed. The `SGP-02` test does read `official_code` from that query — a column it genuinely selects — and the contract test pins exactly that dependency.

**Rejected:** fixing `?.inititiative_id` → `?.id` in place (proposal Option A). It corrects the typo but simultaneously wakes V1's "P25 must use V2" conflict for W1/W2 results — an unrelated behavior change inside a bugfix, which is the class of mistake that produced this defect. Tracked as `VER-OQ-1`.

**Rejected:** adding `inititiative_id` to the SQL (Option C). Changes a repository contract nine call sites read, to fix one caller.

### `VER-DD-2` — The scope key is compound, not `source` alone

`source = 'API'` means "is W3/bilateral", not "arrived through the external API", and is stamped on SGP-02 results created from the ordinary UI (`result.entity.ts:566-574`). P2-3229 left AVISA on the W1/W2 flow. `platform-report.service.ts:433` already needed the same compound key. Keyed on `source` alone the guard would demand a lead Centre from results that have no reason to have one.

### `VER-DD-3` — Delegate above the existing Knowledge Product check

Placing the branch before the `result_type_id == 6` check at `:746` makes the bilateral path answer entirely to `BilateralVersioningRulesService`, which is what P2-3229 AC9 asks for. Same rule, different message.

**Reversion challenge (Step 2.3).** This supersedes an observable string for one input class: a bilateral Knowledge Product would return *"Result 7654 is a Knowledge Product… report the new knowledge product with its own CGSpace handle instead"* instead of *"Result ID: 10122 is a Knowledge Product, this type of result is not possible to phase shift it contact support"*. **What does removing the old message break?** Three things checked against the code, not assumed:

1. **One test asserts that exact string** — `versioning.service.spec.ts:288-299` — and it keeps passing: its fixture is `{ id: 2, result_type_id: 6 }` with **no `source` property**, so the new predicate is false and the result falls through to the untouched KP check. That test doubles as a live check of defect class D2: if the branch were placed before the `source` test, it would fail.
2. The client renders `error.error.message` verbatim (`change-phase-modal.component.ts`, `error` handler), so no parsing depends on the wording.
3. QA quoted the old string in P2-3653, so the tester will see a different message than their ticket records — which is why it is written here rather than discovered during re-test.

The new message is the one the API path already returns, and it names the remedy. **Kept.**

## 13. Budget (Step 2.4 tripwire)

| Metric | Expected |
|---|---|
| Tasks | 3 |
| LOC | ~120 (≈25 production, ≈95 tests) |
| Review rounds | 1 |

Lite depth is right for the production change; the test count is what carries the LOC, and that is deliberate — the defect shipped because the tests asserted a fiction. `/akili-execute` escalates if actuals exceed this.

## 14. Open Gaps & Follow-ups

| ID | Item |
|---|---|
| `VER-OQ-1` | The dead `?.inititiative_id` condition still disables V1's "P25 must use V2" conflict for W1/W2. Separate ticket |
| `VER-OQ-2` | Rows already created without authorization. Count before the fix lands |
| `VER-OQ-3` | The modal's `isBilateral` getter lacks the AVISA carve-out the list has. Separate ticket |

## Required cross-references

- `docs/prd.md` — `AC-3`, `AC-5`, `US-A2`
- `docs/trd/trd.md` — §5 W2 (phase rollover), §8 Security & Authorization Model
- `docs/ux-ui/design.md` — no screen or flow changes
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — no payload change, no change-log entry due
