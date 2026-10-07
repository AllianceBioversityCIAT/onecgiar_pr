# Requirements — Reporting platforms resubmit a rejected bilateral result through `create`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-rejected-result` |
| Type | **Change** · Depth **Full** (payload contract, migration, review workflow) |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Jira | [P2-3894](https://cgiarmel.atlassian.net/browse/P2-3894) (epic P2-3094) |
| Proposal | `proposal.md`, same folder. Answers from 2026-10-06 incorporated (`R-1`, `D-1`, `OQ-1`, `OQ-2`) |
| Supersedes | `changes/bilateral-create-upsert-by-code`: `UBC-R-2`, `UBC-R-9` (on hold) and the open-phase rows of `UBC-R-5`. See §10 |
| Builds on | `notifications/bilateral-primary-sp-request` (`PSR`), `notifications/primary-notify-on-submit` (`PNS`), `notifications/primary-decline-rejects-result` (`PDR`) |
| Baseline | `docs/prd.md` G3 / US-D1 / `AC-2`, `AC-3`, `AC-4`, `AC-5`, `AC-8`; `docs/trd/trd.md` bilateral module + workflow review; contract `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |

## 2. Executive Summary

A producer platform (STAR, MEL, TIP) resends **the same `create`** with the `result_code` of a result that a Science Program **rejected**. PRMS replaces its data **on the same record** and returns it to review. If the payload names a different primary, PRMS assigns that SP as primary at once, with no ownership request and no acceptance round (`RRC-R-17`, amended 2026-10-06; it was an acceptance round before).

| What the platform sends | What PRMS does |
|---|---|
| `result_code` of a **Rejected** open-phase result, same platform | Replaces data in place → **Pending Review** · `operation: "updated"` |
| `result_code` of a result in any other status | **409** naming the code and the status. Nothing changes |
| No `result_code` | Exactly the same as today |

Every review decision and every resubmission is added to the history **with its Science Program**. Nothing is overwritten.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Resubmission** | A `create` carrying the `result_code` of a Rejected open-phase result. It replaces the result's data and returns it to review |
| **Open phase** | The active reporting phase (`getActiveReportingPhase`) |
| **Owner / primary SP** | The SP with role 1 accepted on the result. It reviews the result |
| **Primary request** | The PSR flow: the SP must **accept** before becoming owner. A resubmission through `create` no longer uses it (`RRC-R-17`: direct assignment) |
| **Allocated SP** | An SP with a `Confirmed` mapping and `allocation > 0` on the result's lead bilateral project (P-7 rule, the same one the Reporting Tool applies) |
| **Refusal** | Any 4xx response to a resubmission |
| **Review history** | Rows in `result_review_history` per result, ordered by date |

## 4. System Context & Scope

### In scope

- The resubmission path inside `POST /api/bilateral/create`.
- The eligibility rules and their messages.
- Data replacement on the same record. Status → Pending Review.
- Primary and contributors as sent by the centre, through the existing flows.
- The review history: the SP on every decision, and the resubmission as its own action.
- Change-log row in the contract.

### Out of scope

- Overwriting results in any status other than Rejected.
- Deleting through the API, PATCH or partial updates, Knowledge Products.
- Carrying a result between phases (already delivered: `UBC-R-3`).
- Reporting Tool UI (companion story).
- Analysis of rejection reasons across the portfolio.
- Backfilling the SP on historical history rows.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| **Producer platform** (STAR, MEL, TIP; downstream consumer, US-D1) | Can close the rejected → corrected → reviewed loop without retyping |
| **SP reviewer** | Gets the corrected result back in its queue, and sees the history of rejections and resubmissions |
| **New SP named as primary** | Becomes primary at once (`RRC-R-17`) and sees the result in its queue with the ordinary notice. It is never asked to accept |
| **Centre user in PRMS** | Sees the updated data when reloading. Last write wins |
| **Platform admin** | Can audit the full sequence |

## 6. Functional Requirements

### MUST

#### Requirement `RSB-R-1`: No code, no change

A `create` without `result_code`, or with an empty one, MUST behave **exactly** as today: same response, same status, same side effects.

##### Scenario: a regular create
- GIVEN a payload with no `result_code`
- WHEN the platform calls `create`
- THEN the result is created as today, with the same response shape and the same `keep_editing` rule
- BUT it must NOT pass through any of the checks in this spec

#### Requirement `RSB-R-2`: Only a Rejected result is overwritten (BR1)

When `result_code` matches a result in the open phase, the system MUST accept the resubmission **only** if that result is in **Rejected** (7). For **Editing (1), Quality Assessed (2), Submitted (3), Discontinued (4), Pending Review (5), Approved (6) and Draft (8)** it MUST respond **409**. The message names the `result_code` and the status name.

##### Scenario: the result is under review
- GIVEN result `28565` is in Pending Review in the open phase
- WHEN its platform resends `create` with `result_code: "28565"`
- THEN the response is 409 and its message contains `28565` and `pending review`
- AND IT MUST leave the result unchanged in every field (see `RSB-R-8`)

##### Scenario: two resubmissions in a row
- GIVEN result `28565` Rejected
- WHEN the platform resubmits it twice in a row
- THEN the first goes to Pending Review
- AND the second gets 409 for Pending Review

#### Requirement `RSB-R-3`: Same record (AC2)

A successful resubmission MUST keep the result's **same internal identifier and same `result_code`**. It MUST NOT create a second result. History, contributors, notifications and `ResultReviewHistory` rows stay attached to the same record.

#### Requirement `RSB-R-4`: Replace semantics

The payload is **the new truth** for the result's data. Sections not sent are not preserved from the previous version. The sections the payload does send replace the previous ones; they are not added a second time (P2-3894 open item 2).

##### Scenario: partners replaced
- GIVEN Rejected result `28565` with partners A and B
- WHEN it is resubmitted with partner C only
- THEN the result's active partners are exactly {C}
- BUT it must NOT keep A or B active, nor duplicate C

#### Requirement `RSB-R-5`: Back to review (BR2)

After a successful resubmission the result MUST be in **Pending Review**, **regardless of `keep_editing`**.

#### Requirement `RSB-R-6`: Platform ownership (BR3)

The system MUST refuse a resubmission from a platform other than the one that reported the result. This is the same ownership rule versioning already uses.

#### Requirement `RSB-R-7`: Knowledge Products excluded (BR4)

The system MUST refuse a `result_code` that belongs to a Knowledge Product, whatever its status.

#### Requirement `RSB-R-8`: A refusal changes nothing (BR5, AC9)

On any refusal under this spec (`RSB-R-2`, `R-6`, `R-7`, `R-10`, `R-11`, `R-12`, `R-13`, `R-16`, `R-22`, `R-23`, and any payload validation) the stored result MUST stay identical in every field, its status, its sections, its primary and contributor requests, and its history. **No partial writes.**

##### Scenario: SP not allocated, after the payload has been read
- GIVEN Rejected result `28565`, with a payload whose primary is not allocated to the project
- WHEN the platform resubmits
- THEN the response is 4xx
- AND IT MUST leave no row created, modified or deactivated, in the result or in any of its sections or requests

#### Requirement `RSB-R-9`: The rejection trail survives (BR6, AC10)

After a successful resubmission the history MUST contain the previous rejection with its justification, **followed by** one entry for the resubmission (`RESUBMIT` action) with its date and the user who made it.

#### Requirement `RSB-R-10`: The result was never found

A `result_code` that exists neither in the open phase nor approved in an earlier phase MUST be refused. A new result MUST NOT be created (unchanged from `UBC-R-8`).

#### Requirement `RSB-R-11`: Closed phase

A Rejected result whose phase is no longer the open one MUST NOT be returned to review. The request is refused, and the result is unchanged.

#### Requirement `RSB-R-12`: The primary must be allocated to the project (BR8, AC17, AC18)

The resubmission's primary SP MUST be one **allocated to the result's lead bilateral project**. An SP that exists only in CLARISA MUST be refused, and the result left unchanged. It MAY be an SP different from the one that rejected it.

> ⚠️ **Assumption pending confirmation (`RSB-OQ-1`).** The ticket (BR8 and AC18) and the existing flow (`request()` already refuses `not_aligned`) require the allocation. The user asked that the centre may resend "to whichever SP they want". This spec interprets that as **any allocated SP, not only the one that rejected it**.

##### Scenario: SP allocated but different
- GIVEN Rejected result `28565`, rejected by SP01, lead project allocated to SP01 and SP06
- WHEN it is resubmitted with SP06 as primary
- THEN it is accepted (see `RSB-R-14` for what happens with SP06)

##### Scenario: SP in CLARISA but not allocated
- GIVEN the same project, allocated only to SP01 and SP06
- WHEN it is resubmitted with SP09 as primary (SP09 exists in CLARISA)
- THEN the response is 4xx and names the SP that is not allocated
- AND IT MUST leave the result unchanged (`RSB-R-8`)

##### Scenario: project with a single SP
- GIVEN a lead project allocated only to SP01
- WHEN it is resubmitted with another SP as primary
- THEN it is refused

#### Requirement `RSB-R-13`: No primary, no resubmission

If the payload does not name a primary SP, the resubmission MUST be refused, because nobody would review it. The result stays unchanged.

#### Requirement `RSB-R-14`: The primary the centre sends is the one that persists

> **Amended 2026-10-06 by `bilateral/rejected-result-correction` (`RRC-R-17`, `RRC-DD-7`, task `RRC-T-6`).** This requirement used to make the payload's primary become owner only after that SP accepted a primary request (PSR / `PNS-R-2`). It no longer does: a resubmission that changes the primary assigns it directly; no acceptance round.

The primary named in the payload MUST become the result's primary **at once**, by the direct transfer (`PrimaryProgramRequestService.transferPrimary`, in the same transaction that returns the result to Pending Review). The named SP MUST NOT receive an ownership request, and nothing waits for its acceptance.

| Case | Expected behaviour |
|---|---|
| The payload's primary **is the current owner** | It stays owner. The result enters **its queue** immediately, and the "result submitted" notification and contributor tagging fire, the same as a first submission (AC3, AC11) |
| The payload's primary is **different** from the owner, or **there is no owner** (for example, after an ownerless decline, `PDR-R-4`) | The named SP becomes owner (role 1) and the result goes to Pending Review **in its queue**, with the same "result submitted" notice and contributor tagging as the row above. The rejecting SP is no longer primary. No primary request is sent; the contributor drafts of the payload are released at once |

Both rows end the same way: the result has an owner and is announced. The ownerless state, the *"This result is awaiting the primary Science Program's acceptance."* refusal and the decline of an API-created request no longer arise on this path (they remain for the in-app first-pick flow, `PNS-R-2`, and for rows created before this amendment). If the final transaction fails (the status change, the transfer or the history entry), all of it rolls back: the result stays Rejected with its **previous primary** and the platform can retry. The earlier data writes are not part of that transaction (`RSB-DD-3`); a retry rewrites them.

##### Scenario: correction "this result is not ours"
- GIVEN result `28565` rejected by its owner SP01 with the justification "belongs to SP06"
- WHEN the platform resubmits with SP06 as primary (allocated)
- THEN the result is in Pending Review and SP06 is its owner, in SP06's queue, with the ordinary notice
- AND SP01 does not see it in its queue
- AND SP06 received no ownership request
- BUT it must NOT stay without an owner or wait for an acceptance

#### Requirement `RSB-R-15`: Contributors as sent

The contributing SPs in the payload MUST remain as the result's contributors, through the existing contribution-request flow. Previous contributors that are not in the payload MUST NOT remain as active requests. The rejection had already deactivated them.

##### Scenario: SP06 contributor
- GIVEN Rejected result `28565`, with SP01 as primary owner
- WHEN it is resubmitted with SP01 as primary and SP06 as contributor
- THEN there is an active contribution request to SP06 in the state the current flow assigns
- AND no contribution request to an SP that is not in the payload

#### Requirement `RSB-R-16`: Duplicate title (AC13)

A resubmission whose title is **identical to the result's own** MUST NOT be refused as a duplicate. A title equal to **another** result in the open phase MUST still be refused.

#### Requirement `RSB-R-17`: Response

A successful resubmission MUST return `operation: "updated"`, the `result_code` and the resulting status (Pending Review), so the platform can reconcile against its own record (AC12). The `created` and `versioned` responses do not change.

#### Requirement `RSB-R-18`: Permanent history with its SP (AC14, AC15, AC16)

Every review decision (approve or reject), every primary decline that rejects (`PDR-R-4`), and every resubmission MUST record in the history: the action, the justification (empty if none was written; the entry is never omitted), **the Science Program involved**, the user and the date. Specifically, that SP is:
- the SP that decided, for approvals and rejections;
- the SP that declined, for a primary decline;
- the primary requested in the payload, for a resubmission.

No resubmission or data replacement may modify or delete earlier entries. History entries from before this spec keep their SP empty.

##### Scenario: three cycles
- GIVEN a result rejected with A by SP01, resubmitted, rejected with B by SP01, resubmitted to SP06, rejected with C by SP06, resubmitted, then approved
- WHEN the history is read
- THEN it shows, in date order: REJECT(A, SP01), RESUBMIT, REJECT(B, SP01), RESUBMIT, REJECT(C, SP06), RESUBMIT, APPROVE
- AND each entry carries its justification, user and date
- AND IT MUST keep being readable after the approval

#### Requirement `RSB-R-19`: The history readout shows the SP

The existing review history read (the one the centre uses to see what the SP asked for) MUST include the SP of each entry when it has one. This is additive: entries without an SP are shown as today.

#### Requirement `RSB-R-20`: A primary decline records its rejection

A primary decline of a result with no owner (`PDR-R-4`) MUST record its rejection in the history with the `REJECT` action. Today, the history write uses an action value the database does not accept (`'REJECTED'`, proposal `R-1`). Under `STRICT_TRANS_TABLES` the decline fails and rolls back. Without strict mode it would store `''`, and none appear in the count from 2026-10-06. **The SQL mode in production has not been verified.** It is confirmed with `SELECT @@GLOBAL.sql_mode;`.

##### Scenario: SP06 declines being primary of an ownerless result
(The ownerless result no longer comes from an API resubmission, `RRC-R-17` / `RSB-R-14` amended; it still comes from the in-app first-pick request, so the decline keeps its rule.)
- GIVEN a result with no owner and a pending primary request to SP06
- WHEN SP06 declines with a justification
- THEN the result is Rejected
- AND the history contains `REJECT` with SP06 and the justification
- BUT it must NOT fail with a database error

#### Requirement `RSB-R-23`: The payload names the lead project

A resubmission MUST yield exactly the lead bilateral project the create writers will store: a single project, or one project flagged `is_lead` among several. If the payload sends no project, or several with none flagged, the resubmission MUST be refused **before any write** with 400, and the result left unchanged (`RSB-R-8`). Replace semantics (`RSB-R-4`) deactivate the stored projects, so the stored lead cannot stand in for a missing one (added 2026-10-06, T-3 Pivot Record).

##### Scenario: several projects, none lead
- GIVEN Rejected result `28565`
- WHEN it is resubmitted with projects P1 and P2, neither flagged lead
- THEN the response is 400 and names `28565`
- AND IT MUST leave the result unchanged

#### Requirement `RSB-R-22`: The type does not change

A resubmission whose result type differs from the stored result's type MUST be refused with 409, and the result left unchanged. Changing the type means a new result (added in Phase 2, `RSB-DD-8`; carried over from `UBC-DD-4`).

### SHOULD

- **`RSB-R-21`** — Every resubmission attempt SHOULD leave one log line containing `result_code`, `operation=updated`, platform and outcome (accepted or the refusal status). It must never include the payload body or keys (same pattern as `UBC` R-8 observability).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Atomicity** | `RSB-R-8`: every refusal happens before the first write. The data replacement, status, history and requests either complete together or roll back together |
| **Concurrency** | Two simultaneous resubmissions of the same result: exactly one succeeds. The other gets 409 for Pending Review |
| **Backwards compatibility** | `AC-4`: additive contract. No field removed. The `created` and `versioned` responses do not change (`RSB-R-1`, `R-17`) |
| **Security** | `/api/bilateral/*` stays outside JWT, as today. Ownership by platform (`RSB-R-6`). Logs contain no payload, keys or tokens (`.cursorrules`) |
| **Data** | One reversible migration (`down` returns the enum and the column to the real state verified on 2026-10-06). No backfill |
| **Observability** | `RSB-R-21` |
| **Performance** | The resubmission SHOULD NOT exceed the p95 of a regular `create` for the same type by more than 30% (it adds a preflight and the section reset). Not measured automatically; see §9 |

## 8. Scenarios Not Covered Above (Ticket Edge Cases)

| Case | Covered by |
|---|---|
| The open-phase result wins over earlier phases | `RSB-R-2` (the open phase is evaluated first, as `UBC` does) |
| Centre user editing in PRMS at the same time | Last write wins (ticket). No lock. Accepted |
| Two platforms claim the same code | `RSB-R-6` |
| Every allocated SP has already rejected it | Nothing forces a resolution. The platform can resubmit to any of them (`RSB-R-12`) |
| No limit on cycles | `RSB-R-18` |

## 9. Defect Classes and the Gate for Each

| Defect class | Gate that catches it | Gap |
|---|---|---|
| A refusal leaves partial writes (`R-8`) | Jest: for each refusal, assert that **no** writing method of any repository/manager was called (spy) | **Partial.** Mocks do not prove the real transaction rollback. Substitute: a real run in the test environment (the user, at the HITL pause), checking row counts before and after a refusal. Local runs write to the shared DB, so not locally |
| Sections duplicated or orphaned on replace (`R-4`) | Jest per type handler: deactivate-then-write over the existing rows | **Partial.** Same as above: a real run with a result that has partners/evidence/regions, comparing active rows |
| A DB fault (not a validation) in the middle of the writers | No gate can make it atomic (the create is not transactional, `RSB-DD-2`) | **Accepted risk, mitigated:** the status flips last (`RSB-DD-3`), so the result stays **Rejected and retryable**. It never stays Pending Review half-written |
| Wrong status guard (`R-2`) | Jest table with all 8 statuses | — |
| The changed primary is not owner at once, an ownership request is sent, the announce is skipped, or the old owner keeps reviewing (`R-14` as amended by `RRC-R-17`) | Jest on resubmission: `transferPrimary` called in the commit transaction, `request` never called, announce called once | — |
| SP not allocated slips through (`R-12`) | Jest: an SP present in CLARISA but without a mapping → 4xx, no writes | — |
| Regression without a code (`R-1`) | The existing `api/bilateral` create Jest suite, scoped, green, unchanged | — |
| Enum/entity/migration drift (`R-18`, `R-20`) | `npm run migration:check` + Jest that pins the entity enum values to `'APPROVE'/'REJECT'/'UPDATE'/'RESUBMIT'` | **Partial.** Applying the migration against MySQL is not tested locally. The user runs `up`/`down` on a test DB |
| The contract doc says something the code does not do | Falsifier: every error and rule in the doc is cross-checked against a test name | — |
| Performance (§7) | **None automated.** Accepted risk, reviewed on the test run | Accepted |

## 10. Effect on `changes/bilateral-create-upsert-by-code`

| UBC | Becomes |
|---|---|
| `UBC-R-2` (update in the open phase, on hold) | **Superseded** by `RSB-R-2..R-5`, restricted to Rejected |
| `UBC-R-5` (editable statuses {1, 8, 5, 7}) | **Modified**: {7} only |
| `UBC-R-9` (title excludes itself, on hold) | **Superseded** by `RSB-R-16` |
| `UBC-T-3`, `UBC-T-4` (on hold) | **Superseded**: rebuilt in this spec (decided 2026-10-06) |
| `UBC-R-3` (versioning with data), `R-8`, `R-11` | Unchanged |

## 11. Open Questions

| # | Question | Default if there is no answer |
|---|---|---|
| `RSB-OQ-1` | Does BR8 hold (primary allocated to the project), or is any CLARISA SP accepted? | **It holds** (`RSB-R-12`). Ticket + current behaviour of `request()` |
| `RSB-OQ-2` | Which project's allocation applies if the payload changes the lead project? | **Resolved 2026-10-06 (user, T-3 Pivot Record):** the payload's lead project, **with no fallback to the stored one**. A payload that yields no lead project (none sent, or several with none flagged) is refused by `RSB-R-23` |
| `RSB-OQ-3` | Do STAR, MEL and TIP already send `result_code` (ticket open item 1)? | Doesn't block. The Fetcher already forwards it. To confirm with producers before the test run |

## 12. Requirement ID Index

| ID | Short name | Strength | Ticket |
|---|---|---|---|
| `RSB-R-1` | No code, no change | MUST | AC8 |
| `RSB-R-2` | Rejected only | MUST | BR1, AC1, AC4 |
| `RSB-R-3` | Same record | MUST | AC2 |
| `RSB-R-4` | Replace semantics | MUST | Edge case, open item 2 |
| `RSB-R-5` | Back to Pending Review | MUST | BR2, AC3 |
| `RSB-R-6` | Platform ownership | MUST | BR3, AC5 |
| `RSB-R-7` | KP excluded | MUST | BR4, AC6 |
| `RSB-R-8` | Refusal changes nothing | MUST | BR5, AC9 |
| `RSB-R-9` | Rejection trail survives | MUST | BR6, AC10 |
| `RSB-R-10` | Code not found | MUST | AC7 |
| `RSB-R-11` | Closed phase | MUST | Edge case |
| `RSB-R-12` | Primary allocated to the project | MUST | BR8, AC17, AC18 |
| `RSB-R-13` | No primary → refused | MUST | Edge case |
| `RSB-R-14` | Primary by direct assignment (amended `RRC-R-17`; was by acceptance) | MUST | AC3, AC11, user 2026-10-06 |
| `RSB-R-15` | Contributors as sent | MUST | User 2026-10-06 |
| `RSB-R-16` | Duplicate title | MUST | AC13 |
| `RSB-R-17` | Response `updated` | MUST | AC12 |
| `RSB-R-18` | History with SP | MUST | BR7, AC14–16 |
| `RSB-R-19` | History readout shows the SP | MUST | AC15 |
| `RSB-R-20` | Primary decline records its rejection | MUST | Proposal `R-1` |
| `RSB-R-21` | Observability | SHOULD | — |
| `RSB-R-22` | Immutable type | MUST | Design (`DD-8`) |
| `RSB-R-23` | Lead project required | MUST | T-3 Pivot Record, user 2026-10-06 |
