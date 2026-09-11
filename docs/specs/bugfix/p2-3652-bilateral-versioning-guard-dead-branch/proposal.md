# Proposal — "Update result" for W3/Bilateral: the authorization guard never runs

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3652-bilateral-versioning-guard-dead-branch` |
| Slug | `p2-3652-bilateral-versioning-guard-dead-branch` — given as a kebab-case argument; routed to `bugfix/` per the Bug Track taxonomy |
| Type | Bug |
| Approval Mode | pre-approved (Juan David Delgado, 2026-09-11) |
| Author (session) | Proposed on behalf of j.delgado@cgiar.org |
| Date | 2026-09-11 |
| Jira | [P2-3652](https://cgiarmel.atlassian.net/browse/P2-3652) (QA - Bug, Open) under [P2-3229](https://cgiarmel.atlassian.net/browse/P2-3229) (To Be Improved), epic P2-3478 |
| Branch base | `performance-refactor` |
| Depends on | none |
| Parallel-safe | yes — server-only; `bugfix/p2-3653-*` is client-only, no shared files |
| Related | `docs/specs/bilateral/webhook-external-platforms/`, vault `CGIAR/W3/w3-bilateral-module/w3-epic-3224-p2-3229-update-result-reporting-tool.md`, vault `w3-p2-3607-replication-data-repair-decision.md` (data-repair precedent) |

## 2. Intent

Make the lead-Centre authorization that P2-3229 specified (AC2) actually execute when a Centre user carries a W3/Bilateral result forward from the reporting tool, so a user of one Centre cannot create and edit a current-phase version of another Centre's approved result.

## 3. Problem / Current Behavior

QA (María Camila Giraldo, 2026-09-10, GIF `P2-3229-BUG2_cross_centre_authorization_bypass_20260910_MG.gif`): logged in as a **Bioversity (Alliance)** user with no CIP affiliation, the "Update result" action was offered on result **8375** (Approved, 2025, W3/Bilateral, Lead Centre **CIP**). The modal correctly displayed `Lead center: CIP`, Confirm **succeeded**, and the user landed in `/bilateral/CIP/result/8375?phase=36` with CIP's result fully editable. No authorization error at any point.

The guard P2-3229 built for exactly this (`assertBilateralVersioningAllowed`, `versioning.service.ts:850-890`) is present, tested, and **unreachable from the reporting tool**.

## 4. Bug Diagnosis

### Observed Symptom

A Centre user replicates, and then edits, an approved W3/Bilateral result led by a Centre they do not belong to. The documented rejection ("Only users of centre X, which leads result Y, can carry it into a new phase") never fires.

### Reproduction Steps

1. Sign in to prtest as a user affiliated only with Centre A (e.g. Bioversity/Alliance), without the platform Admin role.
2. Go to Result Center (`/result/results-outlet/results-list`), filter to a 2025 W3/Bilateral result whose Lead Centre is Centre B (e.g. CIP, result 8375).
3. Open the row menu → **Update result**. The modal opens showing `Lead center: CIP`.
4. Click **Confirm**.
5. **Expected:** HTTP 403, message naming CIP as the leading Centre; no row created.
6. **Actual:** success toast, a current-phase row is created, and the user is redirected into CIP's bilateral editor with edit rights.

### Root Cause (confirmed)

The bilateral branch lives inside a block that never executes.

`versioning.service.ts:756-760`:

```ts
const ownerInitiative =
  await this._resultByInitiativesRepository.getOwnerInitiativeByResult(legacy_result.id);
if (ownerInitiative?.inititiative_id) {   // ← always undefined
```

`getOwnerInitiativeByResult` (`resultByInitiatives.repository.ts:188-203`) selects `ci.id as id`, `ci.official_code`, `ci.name as initiative_name`, `ci.short_name`, `rbi.initiative_role_id`, `rbi.from_toc`, `rbi.is_active`. It **does not select `inititiative_id`**. The return is a raw query cast to `InitiativeByResultDTO`, which declares the field (`InitiativeByResult.dto.ts:5`) but performs no runtime mapping, so the property is `undefined`.

Three independent confirmations:

| Evidence | What it shows |
|---|---|
| Every other caller reads `.id` — `bilateral-center.service.ts:401,505,557,1278`, `:732` | The versioning call site is the only one reading `inititiative_id` |
| `git log -L` on the query: it has selected `ci.id` and never `inititiative_id` since `7d5b2dd19` (2022-11-29) | The call site (`6b0ad82ff`, 2026-04-09) was wrong from the day it was written — this predates P2-3229 |
| QA's own P2-3653 evidence: the server answered `Result ID: 10122 is a Knowledge Product, this type of result is not possible to phase shift, contact support` | That is V1's generic message (`versioning.service.ts:747`). Had the guard run, the message would have been `assertNotKnowledgeProduct`'s ("…report the new knowledge product with its own CGSpace handle instead"). Different message ⇒ the guard did not run |

Consequently the reporting-tool flow is:

```
change-phase-modal.accept()  [isBilateral → no body]
  → PATCH /api/versioning/phase-change/process/result/:id
  → versioning.controller.ts:80  (no entityId → V1)
  → versionProcess()
      ├─ KP check (:746)                      ✅ runs
      ├─ if (ownerInitiative?.inititiative_id) ❌ never true → bilateral derive + guard skipped
      └─ legacy path: $_genericValidation → $_versionManagement → replicate
```

`$_genericValidation` (`:239-251`) asks one thing only: *does a row for this `result_code` already exist in the target phase?* No lead-Centre check, no Approved check, no "already carried forward" check.

The third confirmation matters for the ticket's own history: Yecksin's hand-over comment proposed that the QA account might simply hold the Admin role, which would make the behaviour documented rather than a hole. **That hypothesis is not needed and does not hold** — the KP message proves the guard is bypassed for every user, admin or not.

### Impact & Scope

| Dimension | Assessment |
|---|---|
| Authorization | **AC2 is unenforced end-to-end** from the reporting tool. Client visibility (`canUpdateBilateral`) is the only barrier, and the project rule is explicit that frontend role gates are UX only |
| Eligibility | AC3 also unenforced server-side: the legacy path will carry forward a non-Approved bilateral, since only the client checks `status_name === 'Approved'` |
| Entry points | Both — Result Center row menu and the Centre list added on 2026-09-03 (`50b30ab00`) — go through the same modal and the same V1 call |
| Data shape | **No structural damage.** For a bilateral, V2 would compute `same_portfolio_phase_change = true` (`:974`), making `isV2CrossPortfolio` false (`:308`) — the exact branch the legacy path takes. Rows produced by both routes are materially identical; what is lost is only the guard |
| API path (P2-3228) | **Unaffected.** `BilateralVersioningService` calls the rules service directly and never goes through V1 |
| W1/W2 | Unaffected today, but the same dead block also disables V1's "P25 results must use V2" conflict for pool-funded results. Pre-existing since 2026-04-09 and **out of scope here** (see Open Questions) |
| Security class | Cross-tenant write. Any authenticated Centre user can create and edit a current-phase version of any Centre's approved bilateral result |

### Fix Strategy

Route: **`/akili-specify bugfix/p2-3652-bilateral-versioning-guard-dead-branch` in Bug Mode.** This is a behavior and authorization change, so it needs a regression test that is red before the fix and green after — it does not qualify for `/akili-quick`.

The regression test must not repeat the failure that let this ship: `versioning.service.spec.ts:109` mocks `getOwnerInitiativeByResult` as `{ inititiative_id: 100 }`, a shape the real query cannot produce, so 413 green tests asserted a branch that production never enters. The suite therefore needs **two** tests: one that drives `versionProcess` with the repository's *real* row shape (`{ id, official_code, initiative_name, short_name, initiative_role_id, from_toc, is_active }`), and one contract test pinning the query's selected columns so the mock and the SQL cannot drift apart again.

## 5. Proposed Outcome

- A user who does not belong to a bilateral result's lead Centre receives **403** with the message naming that Centre, from both entry points, and no row is created.
- A user of the lead Centre, and a platform Admin, carry the result forward exactly as today.
- The server-side eligibility set (bilateral, Approved, previous phase, not already carried forward, not a Knowledge Product, has a primary Science Program) applies to the reporting-tool path, matching the API path — AC9.
- W1/W2 phase change is byte-identical to today.

## 6. Scope

- `onecgiar-pr-server/src/api/versioning/versioning.service.ts` — make the bilateral path reach `assertBilateralVersioningAllowed`.
- `onecgiar-pr-server/src/api/versioning/versioning.service.spec.ts` — regression + real-shape tests.
- A contract test over `getOwnerInitiativeByResult`'s selected columns.

## 7. Non-Goals

- The client-side Knowledge Product filter and the blank modal fields → `bugfix/p2-3653-*` (separate proposal).
- Repairing the dead P25 branch for W1/W2 results → separate ticket (Open Question 1).
- Changing `getOwnerInitiativeByResult`'s query or DTO, which nine other call sites read.
- Any change to the bilateral submission/review workflow (AC6).

## 8. Affected Users, Systems, And Specs

| Actor / system | Effect |
|---|---|
| Centre users reporting bilaterals | Lose an action they should never have had on other Centres' results |
| Lead-Centre users and Admins | No change |
| External platforms (P2-3228 API) | No change |
| `docs/specs/bilateral/webhook-external-platforms/` | No contract change |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | No payload change |

## 9. Visual Reference

- Source: None — server-only change.
- Location: n/a.
- Notes: QA evidence is the GIF attached to P2-3652. The UI surface is untouched; the visible difference is an error toast that already exists in the modal's `error` handler.

## 10. Approach Options

| # | Approach | Blast radius | Trade-off |
|---|---|---|---|
| **A** | Fix the call site: `ownerInitiative?.inititiative_id` → `?.id` | Bilateral **and** every P25 W1/W2 result reaching V1 without an `entityId`, which would start receiving the 409 "must use V2" the block was written to raise | Corrects the actual typo, but wakes a second dormant behavior in the same commit — a bugfix that ships an unrelated behavior change is how this class of defect got here |
| **B** | Delegate bilateral to V2 at the top of `versionProcess`, before the owner-initiative lookup: when the result is a genuine W3/Bilateral — `source === SourceEnum.Bilateral` **and** its primary submitter is not `SGP-02` (see `requirements.md` `VER-R-4`) — resolve the entity through `BilateralVersioningRulesService.resolveTargetEntityId` and call `versionProcessV2` | Bilateral only. W1/W2 and AVISA bytes-identical | Leaves the `.id` typo in place for W1/W2 (tracked separately). Also removes the bilateral path's dependency on that query's shape altogether, which is what made it fragile |
| **C** | Add `rbi.inititiative_id` to the query's `SELECT` | All nine call sites of `getOwnerInitiativeByResult` | Largest surface for the smallest ticket; changes a shared repository contract to fix one caller |

## 11. Recommended Approach

**Option B.** It is the smallest change that makes AC2 true, and it is the only one whose blast radius is confined to the results this ticket is about. It also removes the coupling that caused the bug: the bilateral flow stops depending on a raw-query row shape it never needed — it branches on the result's own identity.

**Amended during `/akili-specify` (2026-09-11):** the branch condition is **not** `source === 'API'` alone. That column means "is W3/bilateral", not "arrived through the external API", and it is stamped on AVISA/SGP-02 results created from the ordinary reporting UI (`result.entity.ts:566-574`), which P2-3229 deliberately left on the W1/W2 flow. Keyed on `source` alone the guard would demand a lead Centre from AVISA results — a scope regression. The condition is compound, matching what `platform-report.service.ts:433` already needed. See `requirements.md` `VER-R-4` and defect class D5.

One intentional side effect to approve: moving the bilateral delegation above V1's KP check (`:746`) means a bilateral Knowledge Product would be refused by `assertNotKnowledgeProduct` with its specific message instead of the generic one. That is an improvement and it is the message QA will see after `bugfix/p2-3653-*`; it is called out here because it changes observable output.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Type |
|---|---|---|
| 1 | The dead block also disables V1's "P25 must use V2" conflict for W1/W2. Pre-existing since `6b0ad82ff` (2026-04-09) and **not P2-3229's regression** — open a separate bug rather than folding it in? **Recommendation: yes, separate.** | Open question |
| 2 | Rows already created without authorization in prtest (result 8375 among them) and any equivalent in prod. Do they need repair, and by whom? Precedent: `w3-p2-3607-replication-data-repair-decision`. A read-only count by lead Centre vs. creator should run before the fix lands, since the fix makes the evidence harder to reproduce | Open question |
| 3 | `role.center_id === leadCenterCode` (`:875`) compares a code from `role_by_user` against one from `results_center` with strict equality. Once the guard actually runs, a type mismatch would block legitimate lead-Centre users — a false negative that today is invisible because the guard never executes. Must be verified with real data during `/akili-specify`, not assumed | Risk |
| 4 | No test in the repo instantiates the Nest container or exercises V1 with a real repository shape; the spec suite will accept a wrong mock again unless the contract test in the Fix Strategy is written | Risk |
| 5 | P2-3229 is in **To Be Improved** with two open QA bugs; this proposal covers one. The US cannot return to UAT until `bugfix/p2-3653-*` also lands | Dependency |

## 13. Success Criteria

1. A non-lead-Centre, non-Admin user confirming "Update result" on another Centre's bilateral result receives 403 naming the lead Centre, and `SELECT` for that `result_code` in the open phase returns no new row — verified from both entry points.
2. A lead-Centre user and a platform Admin still carry the result forward and land in the bilateral editor.
3. A non-Approved bilateral result is refused server-side, independently of the client gate.
4. A test drives `versionProcess` with the real shape of `getOwnerInitiativeByResult` and fails on the current code, passes after the fix.
5. A contract test fails if the query stops selecting the columns the call site reads.
6. W1/W2 phase change: existing versioning suite green, with no assertion changed.

## 14. Next Step

```text
/akili-specify bugfix/p2-3652-bilateral-versioning-guard-dead-branch
```

Bug Mode — the confirmed root cause above becomes the fix plan plus the mandatory regression test.
