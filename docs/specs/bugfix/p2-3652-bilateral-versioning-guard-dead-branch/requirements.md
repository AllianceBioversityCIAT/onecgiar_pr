# Requirements — Bilateral "Update result": enforce lead-Centre authorization

## 1. Module / Feature

- **Module:** `versioning` (defect surfaces in `bilateral`)
- **Sub-feature:** reporting-tool carry-forward of W3/Bilateral results (P2-3229)
- **Owner:** Juan David Delgado (j.delgado@cgiar.org)
- **Status:** draft
- **Ticket(s):** `P2-3652` (QA - Bug) under `P2-3229`, epic `P2-3478`
- **Depth:** Lite · **Mode:** Bug · **Approval Mode:** pre-approved (Juan David Delgado, 2026-09-11)
- **Proposal:** `./proposal.md` (root cause confirmed)

## 2. Context

P2-3229 shipped the "Update result" action for W3/Bilateral results with a server-side guard (`assertBilateralVersioningAllowed`) enforcing that only the result's lead Centre — or a platform admin — may carry it into the open phase. QA proved the guard never executes: a Bioversity/Alliance user replicated and edited CIP's result 8375.

The cause is not the guard's logic but its reachability — `versionProcess` tests `ownerInitiative?.inititiative_id`, a property the underlying query never returns, so the branch that routes bilaterals to `versionProcessV2` is dead (see `proposal.md` §4).

Baseline this spec answers to:

- `docs/prd.md` — **AC-3** ("Role checks MUST be enforced at the controller/guard layer; the frontend MUST NOT be the sole gatekeeper"), **AC-5** (phase/versioning correctness), **US-A2**.
- `docs/trd/trd.md` — **§5 W2** (phase rollover: prior-phase data snapshotted without mutation), **§8 Authorization** ("Frontend role gates are UX only — backend MUST enforce (AC-3)").
- `docs/ux-ui/design.md` — no UI change; the only visible difference is the existing error toast in `change-phase-modal`'s `error` handler.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — no payload change, so no change-log entry is due.

## 3. In Scope / Out of Scope

### In scope

- Make the reporting-tool carry-forward of a W3/Bilateral result reach `assertBilateralVersioningAllowed` before any row is written.
- Regression coverage that fails on current code.
- A contract test binding the repository row shape the call site depends on.

### Out of scope

- **AVISA / SGP-02 results.** They carry `source = 'API'` but keep the W1/W2 flow by decision of P2-3229 — see `VER-R-4`.
- The client-side Knowledge Product filter and the blank modal fields → `bugfix/p2-3653-*`.
- Repairing the dead `ownerInitiative?.inititiative_id` condition for W1/W2 P25 results (pre-existing since `6b0ad82ff`, 2026-04-09) → separate ticket.
- Changing `getOwnerInitiativeByResult`'s SQL or DTO (nine other call sites read it).
- Any change to the bilateral submission/review workflow (P2-3229 AC6) or to the API carry-forward path (P2-3228).
- Repair of rows already created without authorization → operational decision, tracked as `VER-OQ-2`.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Centre user, lead Centre) | Nothing — carries the result forward exactly as today |
| Result submitter (Centre user, other Centre) | Loses an action that was never theirs; receives an explicit 403 naming the lead Centre |
| Platform admin | Nothing — admin exemption preserved |
| Bilateral consumer (downstream) | Nothing — no payload or structural change |

## 5. User Stories

- **`VER-US-1`** — As a Centre user, I want the platform to refuse my carrying forward another Centre's bilateral result, so that a Centre stays accountable for its own reporting. *Refines `US-A2`; enforces `AC-3`.*

## 6. Functional Requirements

### Required (MUST)

- **`VER-R-1`** When a W3/Bilateral result is carried forward from the reporting tool, the system MUST evaluate the lead-Centre authorization and the bilateral eligibility rules **before** writing any row, and MUST apply the same rules the API path applies (P2-3229 AC9).
- **`VER-R-2`** The system MUST reject the request with **403** and a message naming the lead Centre when the acting user neither belongs to that Centre nor holds the platform admin role — regardless of which of the two entry points (Result Center list, Bilateral Centre list) initiated it.
- **`VER-R-3`** The system MUST NOT alter the outcome of a W1/W2 (`source = 'Result'`) phase change in any way.
- **`VER-R-4`** The rule MUST apply only to genuine W3/Bilateral results: `source = 'API'` **AND** a primary submitter whose `official_code` is not `SGP-02`. AVISA results MUST keep the phase-change outcome they have today.

> **Why `source = 'API'` alone is the wrong key.** `result.entity.ts:566-574` records that `source = 'API'` means "is W3/bilateral", not "arrived through the external API", and that `createOwnerResultV2` stamps it on any result created under initiative `SGP-02` from the ordinary reporting UI. P2-3229 put AVISA out of scope and the client honours that through `isW3BilateralsAvisa` (`results-list.component.ts:392-395`, used by `useBilateralFlow` at `:523`). `platform-report` already needed the same compound key (`platform-report.service.ts:433`). A guard keyed on `source` alone would demand a lead Centre from AVISA results, which is a scope regression, not a fix.

#### Scenario: Another Centre's result is refused

- GIVEN an approved 2025 W3/Bilateral result whose lead Centre is CIP
- AND an authenticated user affiliated only with Bioversity (Alliance), without the platform admin role
- WHEN that user confirms "Update result" on it
- THEN the request fails with HTTP 403 and a message naming CIP as the Centre that leads the result
- AND no row for that `result_code` exists in the open reporting phase afterwards
- BUT it must NOT depend on the client hiding the action, since the menu is UX only (`AC-3`)
- AND IT MUST behave identically from the Result Center list and from the Bilateral Centre list

#### Scenario: The lead Centre and the admin still pass

- GIVEN the same result led by CIP
- WHEN a user affiliated with CIP, or a platform admin, confirms "Update result"
- THEN the result is carried into the open phase and the user is redirected to the bilateral editor
- AND the prior-phase row is left unmodified (`AC-5`, TRD W2)

#### Scenario: A non-approved bilateral is refused server-side

- GIVEN a W3/Bilateral result of a previous phase whose status is not Approved
- WHEN the carry-forward endpoint is called directly for it by a lead-Centre user
- THEN the request is refused by the shared eligibility rules
- AND IT MUST be refused by the server even though the client already hides the action for that status

#### Scenario: AVISA (SGP-02) keeps the flow it has today

- GIVEN a result whose `source` is `'API'` but whose primary submitter `official_code` is `SGP-02`
- WHEN it is carried forward through the reporting tool
- THEN its outcome is identical to the current behavior
- BUT it must NOT be asked for a lead Centre, since AVISA results are not owned by one and would be refused outright
- AND IT MUST NOT acquire the bilateral eligibility refusals (Approved, Knowledge Product, already-carried-forward)

#### Scenario: W1/W2 is untouched

- GIVEN a pool-funded (`source = 'Result'`) result eligible for phase change
- WHEN it is carried forward through the same endpoint
- THEN its outcome is byte-identical to the current behavior
- BUT it must NOT acquire the bilateral eligibility refusals or the lead-Centre check

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security** | Cross-Centre write is closed: authorization enforced in the service layer, not the client (`AC-3`, TRD §8). No secret, token, or full role payload written to logs (`.cursorrules`) |
| **Backwards compatibility** | No API contract change: same route, same verb, same request/response shape. Only the refusal path gains a 403 that the modal's existing `error` handler already renders |
| **Data integrity** | No row is written before authorization resolves; the prior-phase row is never mutated (`AC-5`) |
| **Observability** | A refusal MUST be attributable (result code + lead Centre in the message); no change to existing log volume |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `VER-AC-1` | Approved 2025 bilateral led by Centre B; user of Centre A, non-admin | Carry-forward is requested | 403 naming Centre B; no new row for that `result_code` in the open phase |
| `VER-AC-2` | Same result; user of Centre B (or admin) | Carry-forward is requested | Row created in the open phase, prior-phase row unmodified |
| `VER-AC-3` | Previous-phase bilateral not in Approved status; lead-Centre user | Carry-forward is requested | Refused by the shared eligibility rules |
| `VER-AC-4` | `getOwnerInitiativeByResult` returns its **real** row shape (`id`, `official_code`, `initiative_name`, `short_name`, `initiative_role_id`, `from_toc`, `is_active`) | `versionProcess` runs for a bilateral | The authorization guard executes — this assertion fails on current code |
| `VER-AC-5` | A W1/W2 result | Phase change runs | Existing versioning suite passes with no assertion modified |
| `VER-AC-6` | A result with `source = 'API'` whose primary submitter is `SGP-02` | Phase change runs | Outcome identical to current behavior; the lead-Centre guard does not fire |

Cross-cutting ACs that apply without restatement: `AC-3`, `AC-5`, `AC-9`.

## 9. Defect Classes & Their Gates

Per the specify checklist — the classes this spec can produce, and what catches each:

| # | Defect class | Gate | Can it fail? |
|---|---|---|---|
| D1 | The guard stays unreachable (the bug recurs) | Regression test driving `versionProcess` with the repository's real row shape (`VER-AC-4`) | Yes — it fails on current code; that is its entry condition |
| D2 | Over-application: the guard leaks onto W1/W2 | Existing versioning suite, unmodified, plus `VER-AC-5` | Yes — a guard placed before the `source` branch fails these |
| D3 | False negative: a legitimate lead-Centre user is blocked | `VER-AC-2` with a role row whose `center_id` matches the result's lead Centre | Yes — an identity mismatch on either side fails it. *Verified during proposal: both `role_by_user.center_id` and `results_center.center_id` are `varchar(15)`, so the strict comparison holds* |
| D4 | **Mock drift** — a test asserts a row shape production cannot produce | Contract test pinning the columns `getOwnerInitiativeByResult` selects | Yes — removing or renaming a selected column fails it |
| D5 | **Over-capture of AVISA** — the guard keyed on `source` alone catches SGP-02 results and refuses them for lacking a lead Centre | `VER-AC-6` | Yes — dropping the `SGP-02` condition from the key fails it |

**D4 is the class that let this defect ship**, and it is the one no ordinary unit test can see: `versioning.service.spec.ts:109` mocks `{ inititiative_id: 100 }`, and 413 green tests certified a branch production never enters. A unit test written from the same wrong assumption passes forever. The contract test is its substitute gate; without it, D4 is an unmeasured blind spot.

**Accepted risk:** no test in this repo instantiates the Nest DI container or runs against a live schema, so "the SQL is valid against the real database" is not covered here. It is covered operationally by the deploy to prtest.

## 10. Dependencies & Assumptions

### Upstream

- `auth/modules/role-by-user` — `getAllRolesByUser` supplies the identity compared against the lead Centre.
- `bilateral/versioning-rules` — `BilateralVersioningRulesService`, the shared eligibility source (P2-3228 / P2-3229 AC9).

### Downstream

- `bilateral` API carry-forward (P2-3228) — unaffected; it never routes through `versionProcess`.
- Client `change-phase-modal` — unchanged; it already renders a 403 through its `error` handler.

### Assumptions

- `A1` — Every 2026 W3/Bilateral result has a primary (role 1) Science Program, as the rules service requires. If one does not, it is refused with that rule's message, which is correct behavior.
- `A2` — The QA account used in the P2-3652 evidence may or may not hold the admin role; the fix does not depend on the answer, because the KP message in P2-3653 already proves the guard is bypassed for every user.
- `A3` — Whether AVISA/SGP-02 results carry a leading `results_center` row has **not** been verified against data. `VER-R-4` excludes them by submitter code regardless, so the answer changes nothing here; it would only change how badly a guard keyed on `source` alone would have broken them.

## 11. Open Questions

- `VER-OQ-1` — The dead condition also disables V1's "P25 must use V2" conflict for W1/W2 results. Confirmed out of scope here; does it get its own ticket? **Recommendation: yes.** Does not block this spec.
- `VER-OQ-2` — Rows already created without authorization (result 8375 among them). Counting them before the fix lands is cheaper than after. Operational decision, does not block this spec.
- `VER-OQ-3` — **Found while validating `VER-R-4`:** the modal's `isBilateral` getter (`change-phase-modal.component.ts:69`) tests `source_name === 'W3/Bilaterals'` with **no AVISA carve-out**, unlike the list's `useBilateralFlow`. So an AVISA result already renders the read-only bilateral modal, posts without an `entityId`, and redirects to `/bilateral/<lead_center>/result/...`. Harmless today only because the server branch is dead. Server-side `VER-R-4` closes the authorization half; the client half is a separate defect. **Recommendation: its own ticket, not folded in here.** Does not block this spec.

## 12. Requirement ID Index

| ID | Summary | Scenarios | ACs |
|---|---|---|---|
| `VER-R-1` | Guard and eligibility evaluated before any write | Another Centre's result is refused; A non-approved bilateral is refused | `VER-AC-1`, `VER-AC-3`, `VER-AC-4` |
| `VER-R-2` | 403 naming the lead Centre, both entry points | Another Centre's result is refused | `VER-AC-1` |
| `VER-R-3` | W1/W2 outcome unchanged | W1/W2 is untouched | `VER-AC-5` |
| `VER-R-4` | Scope key is bilateral **and not** SGP-02 | AVISA (SGP-02) keeps the flow it has today | `VER-AC-6` |
