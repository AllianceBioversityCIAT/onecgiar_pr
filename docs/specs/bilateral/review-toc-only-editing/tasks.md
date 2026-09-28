# Tasks — Bilateral review: Science Program may edit only ToC

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` / review drawer edit scope (`BIL-RTE`) |
| Linked spec | `requirements.md` + `design.md` (same folder) · baseline `docs/prd.md` AC-3/AC-7, `docs/trd/trd.md` §8/W7, `docs/ux-ui/design.md` §6/§10 |
| Ticket | P2-3794 (commit tag `[P2-3794]`) |
| Owner | Juan David Delgado |
| Status | not-started |
| Budget | 10 tasks · ≈ 650 LOC · 2 review rounds on T-1…T-3, 1 elsewhere (`design.md` §14) |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-09-22).
- [x] `design.md` approved (2026-09-22).
- [x] **BIL-RTE-T-0 done.** P-7 verified (DD-6 stands); P-2 not observed, kept assumed.
- [ ] BIL-RTE-OQ-1 answered, or its default accepted (any linked SP may decide).
- [ ] Branch contains `performance-refactor`. Bilateral work is never based on `staging`.
- [ ] No in-flight spec touching `results-toc-results.service.ts` / `bilateral-center.service.ts` (checked: `bilateral/*` actives are AI, webhook and bulk-uploader, none of which touch these).
- [ ] Migrations: none (`npm run migration:check` stays green).
- [ ] Worktree has `src/environments/*.ts` (client) and `.env` (server) copied, otherwise every suite dies with `Tests: 0`.

## 3. Task list

### BIL-RTE-T-0 — Pre-flight observations in prtest (HITL)

- **Type:** rollout
- **Description:** Three read-only checks by the owner (the agent has no prtest DB access):
  1. As a non-admin Center user, edit the description of a bilateral result at status 1. Record the HTTP status of `PATCH …/bilateral/general-info/:id` from DevTools.
  2. `SELECT id, acronym, start_date FROM clarisa_portfolios;`
  3. Count bilateral results with active `results_toc_result` rows for more than one `initiative_ids`. This sizes the R-9 impact for the ticket comment.
- **Implements:** premises P-2, P-7 (design §1A), and G-2.
- **Files (expected):** none. Results are recorded in `execution.md`.
- **Depends on:** —
- **Blocks:** T-2 (red-test claim), T-5 (DD-6 rule)
- **Estimate:** S
- **Review:** skip-eligible
- **Skills:** none (HITL, no code)
- **Verification:**
  - **Falsifier:** check 1 returns 2xx → P-2 is refuted. T-2 keeps the fix, but the ticket must not call it a live regression. Check 2 shows `start_date` null or ≠ 2025 for P25 → DD-6 switches to acronym rank before T-5.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** a check cannot be run → record it as `not observed` and keep P-2/P-7 `assumed`. Never infer them.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [x] Observations recorded, with date and environment (check 2 observed; checks 1 and 3 `not observed` per the disqualifier, see `execution.md` pre-flight).

### [x] BIL-RTE-T-1 — Access helper and membership reads

- **Type:** server
- **Description:**
  - Two read methods on the role repository: "user has an active role on initiative X", and "user has an active role on any initiative actively linked to result R". Each is a single query and returns a boolean without ever throwing on multiple rows.
  - One injectable exposing the three decisions of design §5.1 (Center write, ToC write, Decision). Each decision checks admin first, throws 403 (409 kept for a ToC write at status ≠ 5), and logs a `warn` with result id, rule and user id only.
- **Implements:** BIL-RTE-R-2 (rule), R-3 (admin first), R-5 (rule), R-6 (rule); NFR Security/Observability; DD-1, DD-3
- **Files (expected):** `onecgiar-pr-server/src/auth/modules/role-by-user/RoleByUser.repository.ts`, new helper under `onecgiar-pr-server/src/api/results/` (placement per the existing module imports; must be injectable in both `ResultsModule` and `BilateralModule`) + its `.spec.ts`
- **Depends on:** —
- **Blocks:** T-2, T-3
- **Estimate:** M
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** the matrix {admin, read-only program role, non-member, Center user} × {status 1, 5, 8} × {center, toc, decision} has one cell deviating from design §5.1. Concrete example: a read-only program role on SP X, ToC write for SP X at status 5 → must allow; the same user for SP Y → must be 403.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern="<helper-spec>" --silent --reporters=summary --forceExit` (new file: red = the file does not compile before the helper exists)
  - **Disqualifier:** the helper cannot be injected into `BilateralModule` without a circular import → stop and re-design placement (DD-1). Don't use `forwardRef` patches.
  - **Consumers:** none (new symbols)
- **Status:** [x] PASS 2026-09-22 (2 attempts, see `execution.md`)
- **Definition of done:**
  - [x] All matrix cells asserted, including the 403 body carrying no token or user data.
  - [x] eslint clean (`npx eslint "<changed files>" --quiet`).
  - [x] No secret in logs.

### [x] BIL-RTE-T-2 — Enforce the Center-write rule at bilateral entry points

- **Type:** server
- **Description:**
  - Call the Center-write decision before any write in: `title`, `general-info` (replacing `_validateBilateralResultForUpdate` in both), `bilateral-center` `updatePlannedResult` / `saveTocMapping` / `saveContributors`, and the geography entry for v2 and v1. Geography applies only when the result is bilateral; non-bilateral results skip it.
  - Keep it out of shared W1/W2 service methods (design §5.1).
  - Correct the `title` Swagger text.
- **Implements:** BIL-RTE-R-2 (R-2.a all endpoints, "data unchanged", R-2.b), R-3.a (Center endpoints), **R-4.a** (regression); DD-2
- **Files (expected):** `onecgiar-pr-server/src/api/results/results.service.ts`, `results.controller.ts` (Swagger), `src/api/bilateral/services/bilateral-center.service.ts`, the geography v2 controller/entry, + specs `src/api/results/result.spec.ts`, `src/api/bilateral/services/bilateral-center.service.spec.ts`, the geography spec
- **Depends on:** T-1, T-0 (for the regression wording)
- **Blocks:** T-8
- **Estimate:** M
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles`
- **Verification:**
  - **Falsifier:**
    - (a) A non-admin Center user at status 1 sends `general-info` with a changed description → must be 2xx and write (**red today**: 409).
    - (b) A non-admin at status 5 sends each of the 7 writes → 403, and **no repository write mock was called**.
    - (c) An admin at status 5 → the write proceeds.
    - (d) A non-bilateral result on v1 geography → the helper is not consulted.
  - **Red run:** `npx jest --testPathPattern="result.spec|bilateral-center.service.spec|geographic" --silent --reporters=summary --forceExit`. Case (a) must fail before the change.
  - **Disqualifier:** case (a) passes before the change **and** T-0 check 1 was 2xx → R-4 is not a regression; drop the "red" claim and record it. A W1 geography spec turns red → the check leaked into a shared method; move it.
  - **Consumers:** `_validateBilateralResultForUpdate` stays referenced from `toc-metadata` until T-3 (grep its callers after the change). `updatePlannedResult` in `ResultsTocResultsService` (also called from `contributors-partners.service.ts:786`) is not modified.
- **Status:** [x] PASS 2026-09-23 (3 attempts, see `execution.md`)
- **Definition of done:**
  - [x] (a)–(d) asserted.
  - [x] eslint clean.
  - [x] Swagger text matches the behaviour.

### [x] BIL-RTE-T-3 — Enforce the ToC and Decision rules

- **Type:** server
- **Description:**
  - `toc-metadata` uses the ToC-write decision with the payload's `initiative_id`. It replaces the old validator, keeping the 409 for a non-admin at status ≠ 5.
  - For a non-admin, any payload item whose `initiative_id` is set and differs from the payload's `initiative_id` → 403 before any write (DD-7, owner decision 2026-09-22: the simplest check that stops a contributor from touching another program's rows). Admins are not restricted.
  - Also for a non-admin: an item's `result_toc_result_id`, when set, must be an active row of this result owned by the saved program (null only when the saved program is the owner) → else 403 (DD-7 amendment).
  - Also for a non-admin: an item's `results_id`, when set, must equal this result's id → else 403 (DD-7 amendment, closes the indicators path).
  - `review-decision` uses the Decision rule before the status/justification checks. Those existing checks are unchanged.
  - Once `_validateBilateralResultForUpdate` has no callers, delete it.
- **Implements:** BIL-RTE-R-5.a, R-5.b, R-5 ("non-admin still needs status 5"), R-6.a, R-6.b (server side), R-6 ("existing rules stay"), R-3.a (these two endpoints)
- **Files (expected):** `onecgiar-pr-server/src/api/results/results.service.ts`, `src/api/results/result.spec.ts`
- **Depends on:** T-1
- **Blocks:** T-6
- **Estimate:** S
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - A user with a role only on SP Y saves ToC naming SP X at status 5 → 403, and `updateTocResultPartial` is not called.
    - A member of SP Y saves ToC naming SP Y at the top but an item naming SP X → 403, and `updateTocResultPartial` is not called. Items naming SP Y or no initiative → allowed.
    - A non-member approves → 403, and the status stays 5.
    - A program user approves at status 5 → 6.
    - A reject without justification → the existing 400.
  - **Red run:** `npx jest --testPathPattern="result.spec" --silent --reporters=summary --forceExit`. The first two cases fail before the change.
  - **Disqualifier:** OQ-1 answered "owner SP only" → the Decision rule changes to the owner. Re-spec R-6 before coding.
  - **Consumers:** `reviewBilateralResult` specs `result.spec.ts:1739-1863` (update their mocks for the new check).
- **Status:** [x] PASS 2026-09-22 (3 attempts, see `execution.md`)
- **Definition of done:**
  - [x] The cases above plus the existing `reviewBilateralResult` suite are green.
  - [x] The old validator is no longer called by these two endpoints; its last 3 callers are T-2's Center endpoints (forward pointer, deleted there).

### [x] BIL-RTE-T-4 — Scope ToC deactivation to the saved program

- **Type:** server
- **Description:**
  - In `updateTocResultPartial`, build the scope set (primary ∪ payload initiatives ∪ null-when-primary).
  - Restrict `_deactivateMissingRecords` and `_deactivateAllActiveRecords` to that set.
  - Add `is_active: true` to the `initSubmitter` lookup.
- **Implements:** **BIL-RTE-R-9.a** (both the `toc-metadata` and `center/toc-mapping` paths go through this method); DD-4 (both challenge findings)
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.ts` + `.spec.ts`
- **Depends on:** —
- **Blocks:** T-5
- **Estimate:** M
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - Active rows for SP X and SP Y exist; SP X saves Yes (and separately No) → the SP Y row keeps `is_active = 1` (**red today**).
    - A null-initiative row for the owner is still deactivated on an owner save.
    - With an inactive old-primary `results_by_inititiative` row and an active new one, the scope uses the new primary.
  - **Red run:** `npx jest --testPathPattern="results-toc-results.service.spec" --silent --reporters=summary --forceExit`. The SP Y case must fail before the change.
  - **Disqualifier:** a caller outside bilateral appears (P-3 refuted) → stop; scoping would change W1.
  - **Consumers:** `results.service.ts:5228` (toc-metadata), `bilateral-center.service.ts:1314` (toc-mapping). Re-grep `updateTocResultPartial` before starting.
- **Status:** [x] PASS 2026-09-22 (2 attempts, see `execution.md`)
- **Definition of done:**
  - [x] The three cases are asserted.
  - [x] The existing `results-toc-results` suite is green.

### [x] BIL-RTE-T-5 — P25-onward No: server cascade and portfolio start year

- **Type:** server
- **Description:**
  - Resolve "P25 onward" from result → version → portfolio `start_date ≥ 2025`, per DD-6 or the T-0 fallback. A null portfolio counts as false.
  - Add `portfolio_start_year` to `getCommonFieldsBilateralResultById`.
  - On a P25-onward No: ignore payload items, deactivate the scoped parents **and** their children (indicators, targets, SDG / impact-area / action-area links), skip `_handleIndicators`, and keep the special-case null row.
  - Pre-P25 keeps today's path.
- **Implements:** **BIL-RTE-R-8.a** (including "MUST NOT re-insert"), R-8 ("not physically deleted"), **R-8.b**, R-7.b (server: pre-P25 path unchanged), R-7.c (server source of the phase)
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.ts` + spec, `src/api/results/result.repository.ts` (+ spec if one covers the query)
- **Depends on:** T-4, T-0 (check 2)
- **Blocks:** T-6
- **Estimate:** M
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:**
    - A P25 result where SP X has an HLO + two indicators with targets; save No with a payload that still carries the HLO → no active parent/child for X, no `delete`/`remove` called, and no row inserted with a non-null `toc_result_id`.
    - A later Yes with a different HLO → the old children stay inactive.
    - The same No on a pre-P25 result → today's calls (snapshot of repository calls).
  - **Red run:** `npx jest --testPathPattern="results-toc-results.service.spec|result.repository" --silent --reporters=summary --forceExit`
  - **Disqualifier:** a child table has no `is_active` column → stop. Re-design DD-5 for that table; never hard-delete as a workaround. Also, a mock-only green **does not prove the MySQL state**; that check belongs to T-9.
  - **Consumers:** `getCommonFieldsBilateralResultById` callers `results.service.ts:3795` (drawer GET) and `:4223` (data-standard). The additive field must not break either.
- **Definition of done:**
- **Status:** [x] PASS 2026-09-23 (2 attempts, see `execution.md`; PR note pending until the PR is opened)
  - [x] The three cases are asserted.
  - [x] `npx tsc --noEmit` passes (entity/repository touched; the focused jest does not see every spec).
  - [ ] Additive-field note in the PR (when the PR is opened).

### [x] BIL-RTE-T-6 — Drawer ToC: P25 No renders nothing, correct program, copy

- **Type:** client
- **Description:**
  - Computed `isP25Onward` from `commonFields.portfolio_start_year`, replacing `portfolio: 'P25'`.
  - For P25-onward, do not render `app-cp-multiple-wps` unless the answer is Yes.
  - A P25-onward No sends `result_toc_results: []`.
  - `initiative_id` comes only from `tocInitiative`. Remove the fallback to `response[0].id`; if the initiative is missing, block Save with an inline message.
  - Update the No helper text and `getTocAlertDescription` for P25-onward.
- **Implements:** **BIL-RTE-R-7.a**, **R-7.b**, **R-7.c** (client), **R-5.c** (payload + refusal), **R-10**, **R-11** (renders as No; opening makes no write call)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.{ts,html,spec.ts}`
- **Depends on:** T-3, T-5
- **Blocks:** T-9
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:**
    - `portfolio_start_year = 2025`, answer No → no `app-cp-multiple-wps` in the DOM.
    - `2022`, No → present, as today.
    - `null` → present (not P25-onward).
    - The save body on P25 No has an empty list.
    - With `tocInitiative.initiative_id` undefined → no PATCH is sent and the message is shown.
    - Opening a result with `planned_result = null` → zero PATCH calls.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern="result-review-drawer.component.spec" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** jsdom can't prove the block is visually absent when CSS hides it rather than removing it → assert DOM absence (not rendered), never a class. A presence-only assertion is not accepted.
  - **Consumers:** `dataControlSE.currentResult` / `currentResultSignal`, set by the drawer and read by `app-cp-multiple-wps` and `FieldsManagerService`. Grep the readers of `.portfolio` before changing the value.
- **Definition of done:**
- **Status:** [x] PASS 2026-09-23 (1 attempt, see `execution.md`; copy review carried to T-9)
  - [x] The six cases are asserted.
  - [x] `npx ng lint --quiet` clean.
  - [x] `ng build --configuration development` exit 0 (the template compile gate).
  - [x] Copy is reviewed by the owner at HITL (T-9, 2026-09-23).

### [x] BIL-RTE-T-7 — Lock geography Yes/No in the drawer

- **Type:** client
- **Description:** `geoscope-management` honors a read-only input for its two Yes/No questions. The drawer passes `!canEditDataStandards()`. A non-admin clicking them changes nothing, and the unsaved-data-standards state stays false.
- **Implements:** **BIL-RTE-R-1.a** (including "must NOT show the chip" and "Approve stays enabled"), **R-1.b**, R-1 ("inspecting must not produce unsaved changes"), R-6.b (client: Approve not blocked)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/.../geoscope-management/geoscope-management.component.{ts,html}`, drawer html, drawer Cypress CT
- **Depends on:** —
- **Blocks:** T-9
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:**
    - Mount the drawer as a non-admin at status 5 with ToC complete, click "any regions → Yes" → the value stays unchanged and Approve is enabled.
    - As an admin → the value changes and "Save data standards" appears.
    - Other screens using `geoscope-management` without the input → behave as today.
  - **Red run:** `npx cypress run --component --spec "<drawer readonly cy spec>"`. The non-admin case fails before the change.
  - **Disqualifier:** the component is shared and the new input changes its default for other screens → the default must be "editable as today"; if that isn't possible, stop.
  - **Consumers:** every template using `geoscope-management` (grep `app-geoscope-management`); default unchanged.
- **Status:** [x] PASS 2026-09-22 (2 attempts, see `execution.md`)
- **Definition of done:**
  - [x] Three CT cases green; module CT suite green.
  - [x] Lint clean.

### [x] BIL-RTE-T-8 — Center editor: no autosave racing the submit; pin R-7 for the Center

- **Type:** client
- **Description:**
  - In `bilateral-result-creator`, "Save draft" and the section-navigation flush are no-ops while `isSubmitting()` is true.
  - Add one `section-toc` test pinning "No shows nothing" for a P25 result. That behaviour already exists, so the test must pass before and after.
- **Implements:** DD-2 challenge mitigation (R-2.b side effect), R-7 (Center editor clause)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.{ts,spec.ts}`, `pages/bilateral/components/section-toc/section-toc.component.spec.ts`
- **Depends on:** T-2
- **Blocks:** T-9
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:**
    - `isSubmitting()` true + `triggerManualSave()` → zero save calls (**red today**).
    - `isSubmitting()` false → the save proceeds.
    - `section-toc` with planned false → no detail form.
  - **Red run:** `npx jest --testPathPattern="bilateral-result-creator.component.spec|section-toc.component.spec" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** the section-toc test is red before the change → R-7 is **not** already true for the Center. Stop and re-scope; this task must not grow a Center fix silently.
  - **Consumers:** `bilateral-auto-save.service` flush callers (navigation). Grep them.
- **Definition of done:**
- **Status:** [x] PASS 2026-09-23 (1 attempt, see `execution.md`)
  - [x] Cases asserted.
  - [x] The recent `bugfix--bilateral-section-autosave-on-navigate` tests are still green.

### BIL-RTE-T-9 — Docs and post-deploy HITL

- **Type:** docs + rollout
- **Description:**
  - Update `result-review-drawer/AGENTS.md` §3b/§11: the three server rules, "every new bilateral write calls the helper", and the P25 No behaviour.
  - Leave the ticket comment: the decisions taken, plus the side findings (G-3 JWT, G-5 lost rows with the T-0 count).
  - After the deploy to prtest, the owner checks:
    - a P25 result at status 5 saved No → SQL shows no active ToC parent/child for that SP and the old rows at `is_active = 0`;
    - another SP's rows on that result are untouched;
    - a Center description autosave at status 1 succeeds;
    - a reviewer PATCH of the title via DevTools → 403.
- **Implements:** Defect classes "portfolio detection on real data" and "rows actually `is_active = 0` in MySQL" (requirements §7); R-8.a/R-9.a live check; AC criteria 1–7 of P2-3794 end to end
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/AGENTS.md`, `execution.md`
- **Depends on:** T-6, T-7, T-8 (and the deploy)
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** `cognitive-doc-design`
- **Verification:**
  - **Falsifier:** any SQL row for the saved SP with `is_active = 1` and a non-null `toc_result_id` after the No; any SP Y row flipped.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** the environment isn't running the commit (check the pipeline branch first) → the observation is not evidence; record `not observed`.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] The four checks are recorded with date and environment.
  - [ ] The ticket comment documents what shipped (no pending checklists).

## 4. Dependency graph

```
T-0 (HITL) ─┬─────────────► T-2 ──► T-8 ─┐
T-1 ────────┼─► T-2                        │
            └─► T-3 ──────► T-6 ──────────┼─► T-9
T-4 ──► T-5 (needs T-0) ──► T-6            │
T-7 ───────────────────────────────────────┘
```

**Parallel-friendly:** T-1, T-4 and T-7 can start at once. T-7 (client) is independent of every server task.

## 5. Test plan — scenario closure

| Scenario / clause | Task | Test |
|---|---|---|
| R-1.a (value unchanged · Approve enabled · no chip) | T-7 | drawer CT |
| R-1.b | T-7 | drawer CT |
| R-1 "inspecting must not produce unsaved changes" | T-7 | drawer CT |
| R-2.a, all 7 endpoints · "data unchanged" | T-2 | `result.spec`, `bilateral-center.service.spec`, geography spec |
| R-2.b | T-2 (server) · T-8 (no race) | same + creator spec |
| R-3.a | T-1 (matrix) · T-2 · T-3 | helper spec + wiring specs |
| R-4.a "must NOT return 409" | T-2 | `result.spec` (red first) |
| R-5.a · R-5.b · R-5 "non-admin still needs status 5" | T-3 (+T-1 matrix) | `result.spec` |
| R-5.c payload · "refuse to save when unknown" | T-6 | drawer spec |
| R-6.a · R-6 "existing rules stay" | T-3 | `result.spec` |
| R-6.b | T-3 (server) · T-7 (Approve enabled) | `result.spec`, drawer CT |
| R-7.a · R-7.b · R-7.c "must NOT use constant/phase year/id" | T-6 (client) · T-5 (server) | drawer spec, `results-toc-results` spec |
| R-7 Center editor | T-8 | `section-toc` spec |
| R-8.a · "MUST NOT re-insert" · "not physically deleted" | T-5 | `results-toc-results` spec |
| R-8.b | T-5 | same |
| R-9.a | T-4 | same (red first) |
| R-10 | T-6 | drawer spec + HITL copy review |
| R-11 (render · no write on open) | T-6 | drawer spec |
| NFR: checks before writes | T-2, T-3 | "no repository write called" assertions |
| NFR: 403 body without token · warn log fields | T-1 | helper spec |
| Real-data portfolio · MySQL `is_active` | T-0, T-9 | HITL (no automated gate, per requirements §7) |

No scenario is discharged by citing a different requirement.

## 6. Rollout & verification

- **PR strategy:** ≈ 650 LOC → **two PRs**, both against `performance-refactor`, never `staging`.
  - **PR 1, server** (T-1…T-5). Review first: the helper matrix, then T-4's scoping.
  - **PR 2, client + docs** (T-6…T-9). It depends on PR 1's `portfolio_start_year`.
  - Each description links the other and states what is out of scope (G-3…G-6).
- The deploy is automatic on merge. Don't measure prtest minutes after pushing; confirm the pipeline branch before T-9.
- Commits: `🔧 fix(results) [P2-3794]: …`, `✨ feat(result-review-drawer) [P2-3794]: …`.
- Jira: Ready For UAT only once merged. Assign per the module rule (screen-level → Cami).

## 7. Cleanup & follow-ups

- [ ] Spec → `shipped` after T-9.
- [ ] Follow-ups from design §13: G-1 atomicity, G-3 JWT on `api/bilateral/*`, G-4 statuses other than 5, G-5 lost rows. They go in the P2-3794 comment, not in new tickets, unless the owner decides otherwise.
- [ ] Correct TRD §8's claim that `/api/bilateral/*` is fully excluded from JWT (only on the apply-capable branch, as pending otherwise).

## 8. Roll-back plan

1. Revert PR 2, then PR 1.
2. No migration to revert.
3. No flag.
4. The bilateral read payload returns to its prior shape (only the additive `portfolio_start_year` disappears).
5. Rows deactivated by DD-5 stay inactive (intended D-4). Restore them via `is_active` only if the owner asks.
