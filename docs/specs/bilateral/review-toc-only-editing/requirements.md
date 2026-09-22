# Requirements — Bilateral review: Science Program may edit only ToC

## 1. Document Control

| Field | Value |
|---|---|
| Module / sub-feature | `bilateral` / review drawer — edit scope during Pending Review |
| Spec ID prefix | `BIL-RTE` |
| Depth | **Full** — authorization on write endpoints + logical delete of ToC data |
| Type | Change (inherited from `proposal.md`) |
| Approval Mode | gated |
| Status | **approved** — owner, 2026-09-22 |
| Owner | Juan David Delgado |
| Date | 2026-09-22 |
| Ticket | [P2-3794](https://cgiarmel.atlassian.net/browse/P2-3794) under epic P2-3478 |
| Proposal | `proposal.md` (approved 2026-09-22). Decisions D-1…D-5 are binding here. |
| Baseline | `docs/prd.md` US-Q1, US-Q3, **AC-3**, AC-6, **AC-7** · `docs/trd/trd.md` §8 Authorization, W1, **W7** · `docs/ux-ui/design.md` §6 drawers, §10 a11y |
| Related specs | `archive/2026-09-08-changes--sp-bilateral-review-tab` (P2-3154 permission model) · `archive/2026-09-21-bilateral--review-drawer-readonly-rendering` · `archive/2026-09-18-bilateral--toc-default-linkage` |
| Discovery since proposal | Scout pass 2026-09-22 (code only, nothing run in prtest). It changed three things. Each is marked **(discovery)** below. |

## 2. Executive Summary

While a bilateral result is **Pending Review** (`status_id = 5`), a non-admin user of a Science Program may change **only the Theory of Change** of their own program, and approve or reject. Everything else is read-only, **and the server refuses it**. Admins are unchanged.

For results in the **P25 portfolio or later**, answering **No** shows nothing below the question. Saving it logically deletes that program's previous ToC detail, children included, and leaves other programs' rows untouched.

### What discovery changed versus the proposal

| # | Proposal said | Code says | Effect on this spec |
|---|---|---|---|
| X-1 | R-1: "verify whether Center gets 409 on `general-info`" | **Confirmed in code.** A non-admin Center user at status 1/8 is rejected with 409. Since `fa2914b91` (2026-07-14), every real autosave of title/description/DAC ends in `error`. | `BIL-RTE-R-4` becomes a **regression fix** with its own test. It still needs one prtest observation (pre-flight). |
| X-2 | R-2: "a No *may* wipe other SPs" | **Worse.** Every ToC save through `toc-metadata`, **Yes included**, deactivates the active rows of **every** initiative that is not in the payload. The Center `toc-mapping` path does the same on No. | New `BIL-RTE-R-9`: a ToC save for one program never touches another program's rows. |
| X-3 | OQ-1: gate P25 by portfolio or phase year | The client gate that exists (`isCP2026`) means **phase year ≥ 2026**, not P25. The drawer never sets a phase at all. | "P25 onward" is defined by the result's **portfolio**, not by phase year or a DB id (see §3 Glossary). |

## 3. Glossary

| Term | Meaning here |
|---|---|
| **Pending Review** | `result.status_id = 5`. Other ids: 1 Editing · 8 Draft · 6 Approved · 7 Rejected. |
| **Admin** | Platform Admin (app-level role 1). |
| **Program user** | A user with **any** active role (including read-only roles) on a Science Program (SP) linked to the result. D-2. |
| **Shown program** | The SP whose ToC the drawer displays and saves (`tocInitiative.initiative_id`). |
| **ToC detail** | Everything below the Yes/No question for one program: level, HLO / result, indicators, targets, contribution, and SDG / impact-area / action-area links. |
| **P25 onward** | The result's version belongs to a CLARISA portfolio whose start year is **2025 or later**. P25 itself qualifies; P22 does not. It is never decided by a hard-coded DB id, because ids differ between environments. |
| **Center write** | Any write to the Center-reported data: title, description, DAC and general info, geography, contributors, and the Center-side ToC endpoints. |

## 4. System Context & Scope

**Surfaces**
- **Review drawer:** `/result-framework-reporting/entity-details/:entityId/bilateral-review` → `result-review-drawer`.
- **Center editor:** `/bilateral/:acronym/result/:id`. It is touched only for R-4 (regression) and R-7 (No rendering, already correct).

**Endpoints (TRD §8)**
- `PATCH api/results/bilateral/:id/title`
- `PATCH api/results/bilateral/general-info/:id`
- `PATCH api/bilateral/center/{planned-result, toc-mapping, contributors}`
- `PATCH v2/api/results/geographic-location/update/geographic/:id` and v1 `PATCH api/results/update/geographic/:id` (bilateral results only)
- `PATCH api/results/bilateral/review-update/toc-metadata/:id`
- `PATCH api/results/bilateral/:id/review-decision`
- `GET api/results/bilateral/:id` (read; gains the portfolio start year)

### In scope
- Server-side enforcement of the review edit scope (R-2, R-5, R-6) and the Center regression (R-4).
- Drawer: ToC No rendering for P25 onward, phase source, the geography Yes/No leak, and the No copy (R-1, R-7, R-10).
- Logical delete of ToC detail on No, scoped to one program (R-8, R-9).

### Out of scope
- Admin behaviour (D-1).
- Server-side status rules for statuses other than 5 (for example, writes at 6 Approved). Follow-up.
- Server-side ToC-completeness check on `review-decision`. It remains client-only, as today.
- Center editor read-only gaps (`section-contributors` → `section-toc`).
- Cleaning historic data. Rows already orphaned or cross-deleted before this change are not repaired.
- JWT identity handling on `api/bilateral/*` (see §10 OQ-4). It is a security finding for a separate item.

## 5. Stakeholders / Personas

| Persona (PRD §3) | What changes |
|---|---|
| SP program user (QA reviewer role in PRD terms) | At status 5, can change only their program's ToC and approve/reject. The server now enforces this. |
| Platform admin | Nothing changes. |
| Result submitter (Center user) | Autosave of general info at Editing/Draft works again (R-4). Nothing else changes. |
| Report / BI consumers | No longer see stale ToC detail after a No. Other programs' alignments stop disappearing. |

## 6. Functional Requirements

> Refines US-Q1 and US-Q3; enforces AC-3 and AC-7.

### BIL-RTE-R-1 — Drawer is read-only outside ToC for program users

At status 5, the drawer MUST render every section other than ToC as read-only for a non-admin program user. This includes the two geography Yes/No questions. Inspecting a read-only section MUST NOT produce an "unsaved changes" state.

#### Scenario R-1.a — Geography questions are locked
- GIVEN a non-admin program user, and a bilateral result at status 5 opened in the review drawer
- WHEN they try to change "any regions…" or "any countries…"
- THEN the answer does not change
- AND Approve stays enabled if ToC is complete
- BUT it must NOT show the "unsaved data standards" chip

#### Scenario R-1.b — Admin still edits
- GIVEN an admin on the same result
- WHEN they change a geography question
- THEN the change is accepted and "Save data standards" is offered, as today

### BIL-RTE-R-2 — Server rejects Center writes on a result in review

When a result is at status 5, the server MUST reject any Center write from a non-admin with **403**, and leave the stored data unchanged.

#### Scenario R-2.a — Reviewer tries to rename
- GIVEN a non-admin program user, and a result at status 5
- WHEN they send `PATCH …/bilateral/:id/title`
- THEN the response is 403
- AND the title in the database is unchanged
- AND IT MUST behave the same for `general-info`, `center/planned-result`, `center/toc-mapping`, `center/contributors` and the geographic PATCH (v2, and v1 when the result is bilateral)

#### Scenario R-2.b — Center user after submission
- GIVEN a non-admin Center user, and their result already at status 5
- WHEN autosave sends `general-info`
- THEN the response is 403 and nothing is written

### BIL-RTE-R-3 — Admin writes are unaffected

Admins MUST keep succeeding on every endpoint in §4, at every status, exactly as today.

#### Scenario R-3.a
- GIVEN an admin, and a result at status 5
- WHEN they send any of the §4 writes
- THEN the write succeeds as it does today

### BIL-RTE-R-4 — Center writes in Editing/Draft succeed (regression) (discovery X-1)

A non-admin Center user MUST be able to save general info and title while the result is at status 1 or 8.

#### Scenario R-4.a — The failing case
- GIVEN a non-admin Center user, and a result at status 1 (and separately at 8)
- WHEN autosave sends `general-info` with a changed description
- THEN the response is 2xx and the description is stored
- BUT it must NOT return 409 "Current status is not PENDING_REVIEW"

### BIL-RTE-R-5 — ToC save is limited to the user's own program

`toc-metadata` MUST accept a write only from:
- an admin, or
- a non-admin who holds a role on the program named in the payload, where that program is linked to the result.

Anyone else MUST get 403. For non-admins the result must still be at status 5, as today.

#### Scenario R-5.a — Own program
- GIVEN a user with a read-only role on SP X, and a result at status 5 linked to SP X
- WHEN they save ToC for SP X
- THEN the save succeeds

#### Scenario R-5.b — Another program
- GIVEN the same user
- WHEN the payload names SP Y (the user has no role on it)
- THEN the response is 403 and no ToC row changes

#### Scenario R-5.c — The drawer names the program whose ToC it shows
- GIVEN the drawer shows the ToC of SP X
- WHEN it saves ToC
- THEN the payload names SP X
- BUT it must NOT fall back to the first program of the global initiatives list
- AND IT MUST refuse to save, with a visible message, when it cannot tell which program the ToC belongs to

### BIL-RTE-R-6 — Approve/Reject limited to program users

`review-decision` MUST accept a decision only from an admin, or from a user with a role on an SP linked to the result. Anyone else gets 403. The existing rules (status 5, justification on reject) stay.

#### Scenario R-6.a
- GIVEN a logged-in user with no role on any SP linked to the result
- WHEN they send APPROVE
- THEN the response is 403 and the status stays 5

#### Scenario R-6.b — Criterion 7
- GIVEN a program user who has only viewed read-only sections and saved ToC
- WHEN they approve
- THEN the result moves to 6 Approved, as today

### BIL-RTE-R-7 — P25 onward: No shows nothing below the question

For a P25-onward result, when the ToC answer is **No** (or unanswered, D-5), the drawer and the Center editor MUST show only the question, with no level, HLO, indicator or contribution fields. **Yes** keeps today's behaviour.

#### Scenario R-7.a — Drawer
- GIVEN a P25 result at status 5 in the drawer
- WHEN the reviewer selects No
- THEN no Level select, HLO field or indicator block is shown
- AND selecting Yes shows level and all ToC fields as today

#### Scenario R-7.b — Pre-P25 unchanged
- GIVEN a result whose portfolio started before 2025
- WHEN No is selected
- THEN the drawer shows what it shows today

#### Scenario R-7.c — Phase is read from the result
- GIVEN any result in the drawer
- WHEN the drawer decides whether to apply R-7
- THEN it uses the portfolio of that result's version
- BUT it must NOT use a constant, the phase year, or a numeric DB id

### BIL-RTE-R-8 — Saving No removes that program's ToC detail (logical delete)

For a P25-onward result, saving **No** for program X MUST:
- set `is_active = 0` on every active ToC detail row of program X for that result, **children included** (indicators, targets, SDG / impact-area / action-area links), and
- leave no active level/HLO/indicator/contribution row for X.

Rows MUST NOT be physically deleted (D-4, AC-7).

#### Scenario R-8.a
- GIVEN program X had answered Yes, with an HLO and two indicators with targets
- WHEN X's ToC is saved as No
- THEN no active ToC detail remains for X
- AND the previous rows still exist with `is_active = 0`
- AND IT MUST NOT re-insert level or HLO from the payload

#### Scenario R-8.b — Nothing comes back
- GIVEN R-8.a has happened
- WHEN X later answers Yes and picks a different HLO
- THEN the old indicators/targets do not reappear as active

### BIL-RTE-R-9 — A ToC save never touches another program's rows (discovery X-2)

Any ToC save for program X, Yes or No, through `toc-metadata` or `center/toc-mapping`, MUST leave the rows of every other program on the same result exactly as they were.

#### Scenario R-9.a
- GIVEN a result with active ToC rows for SP X and SP Y
- WHEN SP X saves ToC (Yes or No)
- THEN every SP Y row keeps its `is_active` value and content

### BIL-RTE-R-10 — No copy no longer asks for an HLO

For P25-onward results, the helper text and the alert shown on No MUST NOT ask the user to select an HLO or level.

### BIL-RTE-R-11 — Unanswered shows as No

A result with no ToC answer MUST keep rendering as No (D-5). Together with R-7, that means nothing is shown below the question. Merely opening it MUST NOT write anything.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Security | Enforcement lives on the server (TRD §8, AC-3). Client gates are UX only. A 403 body MUST NOT echo tokens or user data (`.cursorrules`). |
| Data integrity | Logical delete only (W7 / AC-7). Every permission and status check MUST run **before** the first write. The ToC save SHOULD be atomic, but the repositories it uses are not enrolled in a transaction today, so atomicity is a known gap (design §13), not a gate. |
| Backwards compatibility | `GET api/results/bilateral/:id` changes additively (a new field). No `/api/bilateral/*` payload change, so the `bilateral-result-summaries.en.md` change log is not needed. |
| Performance | The permission check adds at most one indexed query per write. No N+1 over rows. |
| Accessibility | Locked geography questions stay perceivable as read-only (design §10). |
| Observability | 403s are logged with result id, endpoint and user id only. |

### Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong allow/deny for a role × status × endpoint | Server Jest matrix (admin / program user / non-member / Center user × status 1, 5, 8 × each endpoint) |
| Center autosave still 409 at 1/8 | Server Jest R-4.a (red on current code) **+ prtest HITL**: save a description as a Center user |
| Other program's rows deactivated | Server Jest R-9.a on `results-toc-results.service` (red on current code) |
| Children left active / resurrected | Server Jest R-8.a/b |
| Detail shown on No / pre-P25 changed | Client Jest + Cypress CT on the drawer |
| Geography leak blocks Approve | Cypress CT R-1.a |
| Portfolio detection wrong **on real data** | **No automated check** (test data has no real portfolios). Substitute: HITL on prtest with one P25 result and, if one exists, one pre-P25 result. Phase ids differ per environment, which is why the rule avoids ids. |
| Rows actually `is_active = 0` in MySQL (not only in mocks) | **No automated check** (Jest mocks the repository). Substitute: SQL read in prtest at HITL. |
| Forged identity on `api/bilateral/*` | **Not covered. Accepted and out of scope** (OQ-4). |

## 8. Requirement ID Index

| ID | Short name | Proposal outcome |
|---|---|---|
| BIL-RTE-R-1 | Drawer read-only outside ToC (+ geography leak) | O-1, O-7 |
| BIL-RTE-R-2 | Server rejects Center writes at status 5 | O-2 |
| BIL-RTE-R-3 | Admin unaffected | D-1 |
| BIL-RTE-R-4 | Center writes at 1/8 succeed (regression) | O-4 |
| BIL-RTE-R-5 | ToC save limited to own program | O-3 |
| BIL-RTE-R-6 | Approve/Reject limited to program users | O-3, O-7 |
| BIL-RTE-R-7 | P25+: No shows nothing | O-5 |
| BIL-RTE-R-8 | No logically deletes that program's detail | O-6, D-4 |
| BIL-RTE-R-9 | Save never touches another program | new (X-2) |
| BIL-RTE-R-10 | No copy | O-5 |
| BIL-RTE-R-11 | Unanswered = No, no write on open | D-5 |

## 9. Dependencies & Assumptions

- **Upstream:** `role_by_user` (roles per initiative), `results_by_inititiative` (SPs linked to the result), `version` → `clarisa_portfolios` (start year).
- **Downstream:** report queries over `results_toc_result`. Every reader checked joins through an active parent, so they are consistent with R-8.
- **Assumption A-1:** "linked to the result" means any active `results_by_inititiative` row, owner or contributor. That matches how the review list already selects results.
- **Assumption A-2:** the delete happens on **save**, not on toggle (proposal OQ-3).

## 10. Open Questions

| ID | Question | Default if not answered |
|---|---|---|
| BIL-RTE-OQ-1 | Should Approve/Reject be the **owner** SP only, or any linked SP (A-1)? | Any linked SP, as the list shows today. Ask Cami. |
| BIL-RTE-OQ-2 | Do all existing bilateral results sit on a P25 version? | Irrelevant to the rule; checked at HITL. |
| BIL-RTE-OQ-3 | Should R-9 also repair rows other programs lost before this change? | No (out of scope); report it in the ticket. |
| BIL-RTE-OQ-4 | Can `api/bilateral/center/*` read an unsigned token (`JwtMiddleware` substring match + `UserToken` decode without verify)? | Out of scope; note it in P2-3794 and tell the module owner. |

## 11. Out-of-Band Notes

- Pre-flight: observe R-4.a once in prtest before merging, so the regression claim is backed by a real 409, not only by code reading.
- Commit scope: `bilateral-review` and `results`. The ticket is P2-3794.
