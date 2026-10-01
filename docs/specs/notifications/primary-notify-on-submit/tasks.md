# Primary SP Request Sent on Submit for Review — Tasks

## 1. Scope of this task list

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-notify-on-submit` (`PNS`) · Standard |
| **Status** | approved (Santiago Sanchez, 2026-10-01) |
| **Date** | 2026-10-01 |
| **Budget** | 3 tasks · ~300 LOC · 2 review rounds (`design.md` §9). Escalate at > 4 tasks or > ~450 LOC |
| **Order** | T-1 → T-2 → T-3 (T-3 can start after T-1, in parallel with T-2) |

## 2. Pre-flight checklist

- [ ] On `qa-development-2026-ss` (or a branch off it), clean tree for the touched files
- [ ] `primary-decline-rejects-result` not being executed at the same time (same service; `Parallel-safe: no`)
- [ ] Scoped Jest only (`--testPathPattern`), never the full suite

## 3. Task list

### [x] `PNS-T-1` — Save the primary choice as a DRAFT on create

| Field | Value |
|---|---|
| **Status** | done (PASS attempt 2, see `execution.md`) |
| **Size** | M (~120 LOC with tests) |
| **Depends on** | — |
| **Requirements** | `PNS-R-1` (all three scenarios + `BUT`/`AND IT MUST`) |
| **Design** | §3, §4 (`stateFor` draft), §5 items 1-6, `PNS-DD-1`, P-5, P-6 |
| **Skills** | `nestjs-expert`, `tdd` |

**Scope**
- `primary-program-request.service.ts`: `request()` option `asDraft`. It inserts status 4, its idempotency matches an active DRAFT for the same SP, and `cancelRound` deactivates active DRAFT `primary` rows. New `findDraftPrimaryInitiativeId`. `stateFor` returns `draft` (with `program_code`) after accepted/pending.
- `bilateral-center.service.ts`: `createResultHeader` passes `asDraft: true`. `updatePrimaryAssignment` passes `asDraft: true` only when there is no owner and the status is Editing/Draft. The contributor exclusion (≈L1809) also excludes the draft SP.
- `bilateral.service.ts` `populateInitiativeAndTocFromProgramCode`: passes `asDraft: true`.
- `share-result-request.repository.ts` `shareResultRequestExists`: the draft count filters `request_type = contribution`.
- **Verify P-5:** read the inbox request queries (`getRequestByUser`, `getPendingByUser`, and the notifications-inbox request source used by `inbox-revamp`). Confirm a status-4 `primary` row is not rendered as an actionable request. If one is, add the `request_status_id <> 4` filter for `request_type = primary` in that query and note it in `execution.md`.

**Tests** (`primary-program-request.service.spec.ts`, `bilateral-center.service.spec.ts`, `share-result-request.repository.spec.ts`)
- create → one `primary` row inserted with status 4, none with status 1 (R-1 main and manual scenarios)
- not-aligned SP still returns `not_aligned` with today's message (R-1 `AND IT MUST`)
- change SP09 → SP12 while draft: SP09 draft deactivated, SP12 draft inserted. Re-save SP12: no second insert (R-1 change scenario + `BUT`)
- swap (owner exists) still inserts status 1 (scope guard)
- `stateFor` with one DRAFT row → `draft`, `program_code` = SP code
- `shareResultRequestExists` SQL contains the `contribution` filter in the draft count

**Fails if:** the create path inserts `request_status_id: 1`, or the re-save path calls `insert` twice. Each test must be seen **red** against today's `request()` (which inserts PENDING) before it goes green. A test that passes on unchanged code proves nothing and must be rewritten.

**Cannot prove:** that the SP's inbox UI shows nothing; mocked repos can't run the inbox SQL. That is covered by the P-5 read above plus the manual check in §5.

**Verify:** `npx jest --silent --reporters=summary --forceExit --testPathPattern "primary-program-request.service|bilateral-center.service|share-result-request.repository"` + `npx eslint` on touched files.

**Done when:** tests are green, P-5 is recorded with evidence (file:line of the filter), and lint is clean.

---

### `PNS-T-2` — Submit sends; accept announces; decline returns to Editing; review guard

| Field | Value |
|---|---|
| **Status** | pending |
| **Size** | M (~130 LOC with tests) |
| **Depends on** | `PNS-T-1` |
| **Requirements** | `PNS-R-2` (all four scenarios, incl. both `AND IT MUST` clauses), `PNS-R-3`, `PNS-R-4` |
| **Design** | §5 items 7-10, `PNS-DD-2`, `PNS-DD-3`, `PNS-DD-4`, P-3, P-4, P-7 |
| **Skills** | `nestjs-expert`, `tdd`, `error-handling-patterns` |

**Scope**
- `bilateral-center.service.ts` `assertSubmittable`: when there is no owner, a DRAFT primary is allowed; otherwise today's message. The swap (pending) guard is unchanged.
- `submitForReview`: when there is no owner, `PrimaryProgramRequestService.sendDraft(resultId, manager)` (new; DRAFT→PENDING via `update()`; throws on 0 rows / error) runs inside the existing transaction. `announcePendingReview` runs only when an owner exists.
- `primary-program-request.service.ts` `accept()`: after commit and the Center notice, if the result is Pending Review, it resolves `BilateralService` through `ModuleRef` (`strict: false`) and calls `announcePendingReview`. Wrapped so it never throws.
- `decline()`: ownerless, not moved, result in Pending Review → `Result.status_id` = Editing in the same transaction.
- `results.service.ts` `reviewBilateralResult`: no owner → 400 "This result is awaiting the primary Science Program's acceptance."

**Tests** (`bilateral-center.service.spec.ts`, `primary-program-request.service.spec.ts`, `results.service` review spec if one exists, else `bilateral-center` spec)
- ownerless + draft → status Pending Review, `sendDraft` called with the transaction manager, `announcePendingReview` **not** called (R-2 main, first `AND IT MUST`)
- ownerless, no draft → `BadRequestException` with today's text, no update (R-2 no-choice)
- owner exists → `announcePendingReview` called, `sendDraft` not called (R-2 existing)
- `sendDraft` throws → submit rejects, the transaction callback rejects (no status update committed) (R-2 failure)
- accept on Pending Review → `announcePendingReview(resultId, userId)` called once. Accept on Editing → not called (R-3 + `BUT` no duplicates: `releaseContributors` is still called once)
- decline single alignment on Pending Review → `status_id` updated to Editing. Decline with auto-move → no status update, moved row is PENDING (R-4 both)
- `reviewBilateralResult` with no owner → 400 with the exact text (R-2 second `AND IT MUST`)

**Fails if:** the submit test with an ownerless result still gets "The result has no Science Program assigned" (today's code), or decline leaves `status_id` untouched. Both must be seen red first.

**Cannot prove:** rollback in real MySQL (a mocked `transaction` only proves the callback rejects). The real rollback is proven in the §5 manual check by forcing a failure: comment out the DRAFT row before submit and expect the 400 with status unchanged.

**Verify:** `npx jest --silent --reporters=summary --forceExit --testPathPattern "bilateral-center.service|primary-program-request.service|results.service"` + eslint on touched files + `npm run migration:check` (expect no pending: no schema change).

**Done when:** all scenarios above map to a green test that was red on today's code, and lint is clean.

---

### `PNS-T-3` — Client: `draft` state banner and Submit not blocked

| Field | Value |
|---|---|
| **Status** | pending |
| **Size** | S (~50 LOC with tests) |
| **Depends on** | `PNS-T-1` (state contract) |
| **Requirements** | `PNS-R-5` |
| **Design** | §6 |
| **Skills** | `angular-developer`, `spartan` (existing banner markup reused, no new tokens) |

**Scope**
- `section-zero-dashboard.component.ts`: `state` union adds `'draft'`. `primaryAssignmentBanner` returns `info` + `banner.draft(code)`. `submitBlockedReason` → null for `draft`. `primaryPickerDisabled` is unchanged (only `pending`).
- `BILATERAL_PRIMARY_ASSIGNMENT_COPY`: add `banner.draft`.

**Tests** (`section-zero-dashboard.component.spec.ts`)
- `draft` + `SP09` → banner text exactly "SP09 will be asked to be the primary Science Program when you submit for review", tone `info`
- `draft` → `submitBlockedReason()` null, `primaryPickerDisabled()` false
- `pending` → today's "Awaiting SP09 acceptance…" (regression)

**Fails if:** `draft` falls through to the `none` branch (today it would show `noneUnpicked`). The test must be red first.

**Cannot prove:** the rendered layout; jsdom only checks the computed text. That is covered by the visual check in §5.

**Verify:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern "section-zero-dashboard"` + `npx ng lint --quiet`.

**Done when:** tests are green and lint is clean.

## 4. Dependency graph

```
PNS-T-1 ──► PNS-T-2
   └──────► PNS-T-3
```

## 5. Test plan

| Layer | What | Owner |
|---|---|---|
| Server Jest | R-1..R-4 scenarios | T-1, T-2 |
| Client Jest | R-5 | T-3 |
| **Manual (HITL pause, local)** | Create with SP09 → SP09 user inbox has **no** request → banner "will be asked…" → Submit → SP09 inbox shows request, SP09 review list does **not** show the result → Accept → result in SP09 review queue + "submitted" notice → separate result: Decline (single alignment) → result back in Editing with sent-back banner | User |

## 6. Coverage closure

| Clause | Task |
|---|---|
| R-1 AI/manual create: no request, saved choice | T-1 |
| R-1 `BUT` SP inbox shows nothing | T-1 (P-5) + manual |
| R-1 `AND IT MUST` not-aligned rejected | T-1 |
| R-1 change choice + `BUT` no duplicate | T-1 |
| R-2 submit sends + Pending Review | T-2 |
| R-2 `BUT` not in SP lists before accept | unchanged owner-based list query; manual §5 |
| R-2 `AND IT MUST` no submitted/tagging notices | T-2 |
| R-2 `AND IT MUST` review decision refused without owner | T-2 |
| R-2 no choice / owner exists / failure | T-2 |
| R-3 accept → queue + notices, Center notice, `BUT` no duplicates | T-2 |
| R-4 single decline → Editing; auto-move stays Pending Review | T-2 |
| R-5 banner, Submit enabled, picker enabled, post-submit banner | T-3 (post-submit = `pending` regression test) |
