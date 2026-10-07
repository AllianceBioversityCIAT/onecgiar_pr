# Requirements — Follow-ups from the rejected-result resubmission

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-followups` |
| Code | `RSF` |
| Type | **Bug** (`RSF-R-1..R-3`, Bug Mode: regression test red → green) + **Verify-first** (`RSF-R-4..R-10`) · Depth **Standard** |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 (Phase 1 gate: Continue; `OQ-1`, `OQ-2`, `OQ-3` answered) |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Proposal | `proposal.md`, same folder, approved 2026-10-06. Aligned; changes from discovery in §10 |
| Origin | `bilateral/resubmit-rejected-result` (`RSB`, archived `2026-10-06-bilateral--resubmit-rejected-result`): `design.md` §13, T-4/T-5 advisories, T-7 live run |
| Related in flight | `bilateral/rejected-result-correction` (`RRC`, approved, `RRC-T-1` uncommitted in the working tree). `RRC-R-17` replaces the API's pending-primary round with a direct transfer, and `RRC-T-5`/`T-6` edit `notification.service.ts` and `bilateral-resubmission.service.ts`. See §9 |
| Baseline | `docs/prd.md` G3 / US-D1 / `AC-4`, `AC-7`, `AC-8`; `docs/ux-ui/design.md` DD-9, DD-10; `docs/trd/trd.md` W4, W6, QAS-9; contract `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Evidence | Scout report 2026-10-06 (read-only, working tree); client sites read inline |

## 2. Executive Summary

The resubmission shipped with three kinds of loose end. This spec closes all of them.

| # | Loose end | What exists today (verified 2026-10-06) | What this spec delivers |
|---|---|---|---|
| 1 | Bell card for a **primary** request | Reads "X from **SP12** has requested inclusion of **SP12** as a contributor…" | The bell reads the primary sentence the inbox already uses |
| 2 | **Inactive role-1** rows shown as owner | Bilateral GET, QA payload and 4 notification readers treat any role-1 row as the primary | Only an **active** role-1 row is ever shown as primary or owner |
| 3 | 7 residual checks (a–g) | 4 are confirmed defects (a, b, c, d), 2 verified OK (e, g), 1 has no automated gate (f) | Each check ends **fixed with a regression test**, **closed with evidence**, or **measured by the user** |

## 3. Glossary

| Term | Meaning |
|---|---|
| **Role-1 row** | A `results_by_inititiative` row with `initiative_role_id = 1`. When active, it makes that SP the result's primary (owner) |
| **Inactive role-1 row** | A role-1 row with `is_active = false`: a retired former owner, or (`RSB-DD-5` amended) the requested SP's row that the writers leave inactive until the direct transfer reactivates it in the same transaction (`RRC-R-17`; it no longer waits for an acceptance). **Not** ownership |
| **Primary request** | A `share_result_request` with `request_type = 'primary'`, asking an SP to become the primary |
| **Bell** | The header popover of notifications (`pop-up-notification-item`) |
| **Inbox** | The results-notifications page and its drawer |
| **Reader** | Code that reads data to show it to a person or a platform (payload, notification text, export) |

## 4. System Context & Scope

### In scope

- Client: the bell's primary-request sentence, its inbox deep-link search text, and the inbox search pipe.
- Server: the readers that present a role-1 row as primary/owner: bilateral GET `obj_results_toc_result`, the QA payload's `primary_science_program`, and the notification readers (`getAllNotifications`, `getPopUpNotifications`, `resolveOwnerProgramCode`, the tagged-notification owner).
- Server, resubmission branch only: subnational reactivation (a), unresolvable lead centre (b), several lead projects (c), contributors the payload dropped (d).
- Evidence-only closure: budget readers (e), retry guidance (g). User measurement: p95 (f).

### Out of scope

- The password hash in bilateral GET → `bugfix/user-password-in-responses`.
- `obj_result_by_initiatives` in the bilateral GET. It already returns `is_active` per row, so a consumer can tell. No change (avoids a payload-shape change, `AC-4`).
- The regular no-code `create` path. Checks a–c also exist there, but the change is gated to the resubmission branch (`RSB-DD-1` lesson). A create-wide fix is a follow-up.
- `getResultInfoToMap` (KP-only caller) and `getContributingInitiativesBilateralResult` (no callers).
- Anything `RRC` delivers: direct transfer, contributor re-send at submit, rejection notices.

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| SP reviewer (QA reviewer, `docs/prd.md` §3) | The bell names a primary request correctly. Notifications never name a retired or pending SP as the result's owner |
| Bilateral consumer (STAR, MEL, TIP) | `obj_results_toc_result` lists only the active primary. Resubmissions with ambiguous leads are refused with a clear 400 instead of being stored silently |
| PMU / data stewards | No duplicate subnationals and no stale lead centre or contributor after a resubmission |

## 6. Functional Requirements

### Item 1 — Primary-request copy (Bug Mode)

#### Requirement `RSF-R-1`: The bell names a primary request as a primary request

For a request row with `request_type = 'primary'`, the bell MUST render the same sentence the inbox renders for it: "**{creating centre}** has tagged **{requested SP}** as the primary Science Program of result **{code}** - {title}", using the same copy source. Contribution and map-to-ToC rows MUST keep their current text, character for character.

##### Scenario: the T-7 case (regression)
- GIVEN a primary request for result 9762, where `obj_owner_initiative` and `obj_shared_inititiative` are both SP12 and the creating centre is CIAT
- WHEN the bell renders it
- THEN the text reads "CIAT has tagged SP12 as the primary Science Program of result 9762 - {title}"
- BUT it must NOT contain "as a contributor", "has requested inclusion" or "from SP12"
- AND IT MUST fall back to the inbox's unknown-centre label when the centre has no acronym or name

##### Scenario: a contribution request is unchanged
- GIVEN a contribution request (`request_type` `'contribution'` or absent)
- WHEN the bell renders it
- THEN the text is identical to today's, for both `is_map_to_toc` true and false

#### Requirement `RSF-R-2`: The deep link finds the row

The search text the bell puts in its inbox link MUST be a string the inbox search pipe matches for the same row, for every request kind (primary, contribution, map-to-ToC).

##### Scenario: following a primary request from the bell
- GIVEN the primary request for 9762 in the bell
- WHEN the user follows its link to the inbox
- THEN the inbox search filter keeps that row visible
- BUT it must NOT produce an empty list because the two texts disagree

### Item 2 — Inactive role-1 rows (Bug Mode)

#### Requirement `RSF-R-3`: Only an active role-1 row is shown as primary or owner

Every in-scope reader MUST derive "primary", "owner" or "Primary submitter" only from role-1 rows with `is_active = true`.

| Reader | Today | Required |
|---|---|---|
| Bilateral GET `obj_results_toc_result` (`/:id`, list, `/results`) | Every role-1 row, active or not | Only active role-1 rows |
| QA payload `primary_science_program` | Built from the row above | The active primary, or none |
| Notification list and bell (`getAllNotifications`, `getPopUpNotifications`) | Loads any role-1 row as the result's initiative | Program code/name from the active role-1 row only |
| Notification program code (`resolveOwnerProgramCode`) | First initiative of any role, active or not | The active role-1 SP |
| Tagged-notification owner ("created by {code} has tagged…") | First role 1, else any row | The active role-1 SP |

##### Scenario: owner changed (regression, the 9550 case)
- GIVEN result 9550 with SP09 retired (inactive role 1) and SP11 the active role 1
- WHEN a platform calls `GET /api/bilateral/9550`
- THEN `obj_results_toc_result` lists SP11 as the role-1 entry
- AND IT MUST NOT list SP09 as a role-1 entry

##### Scenario: ownerless result
- GIVEN a result whose role-1 rows are all inactive (a pending primary, or after a `PDR-R-4` decline)
- WHEN any in-scope reader runs
- THEN no SP is presented as primary or owner (empty or absent, per that reader's existing "no owner" form)
- BUT it must NOT hide the notification or drop the result from the GET just because there is no active primary

##### Scenario: contributors untouched
- GIVEN a result with active role-2 contributors
- WHEN the bilateral GET runs
- THEN their `obj_results_toc_result` entries are exactly as today

### Item 3 — Residual checks (verify-first)

Each check ends in exactly one state: **Fixed** (regression test red → green), **Verified OK** (evidence recorded in `execution.md`), or **Measured** (user evidence). An inconclusive check is reported as inconclusive, never as OK.

#### Requirement `RSF-R-4` (check a): One active subnational per code

After a resubmission, a result country MUST have at most one active subnational row per (`geo_scope_role_id`, subnational code). Historic duplicates MUST stay inactive.

##### Scenario: historic duplicates (regression)
- GIVEN Rejected result R whose country CO has two inactive rows for subnational code `CO-ANT`
- WHEN R is resubmitted with `CO-ANT`
- THEN exactly one `CO-ANT` row is active for CO
- BUT it must NOT reactivate both

#### Requirement `RSF-R-5` (check b): An unresolvable lead centre is refused

A resubmission whose `lead_center` cannot be resolved to a CGIAR centre MUST be refused with 400 before any write (`RSB-R-8`), naming the result code and the value sent. *(Decided by the user 2026-10-06, `RSF-OQ-2`.)*

##### Scenario: unknown lead centre (regression)
- GIVEN Rejected result R with lead centre CIAT
- WHEN it is resubmitted with a `lead_center` that matches no centre
- THEN the response is 400 and names R
- AND IT MUST leave R unchanged (still Rejected, CIAT still lead)
- BUT the no-code `create` path must NOT change its current behaviour (warn and continue)

#### Requirement `RSF-R-6` (check c): One lead project, not several

A resubmission whose payload flags more than one bilateral project as `is_lead` MUST be refused with 400 before any write. *(Decided by the user 2026-10-06, proposal `OQ-2` / `RSF-OQ-3`.)*

##### Scenario: two leads (regression)
- GIVEN Rejected result R
- WHEN it is resubmitted with projects P1 and P2, both `is_lead`
- THEN the response is 400 and names R
- AND IT MUST leave R unchanged
- BUT a single project, or one flagged project among several, must still pass (`RSB-R-23`)

#### Requirement `RSF-R-7` (check d): Contributors follow the payload

*(Decided by the user 2026-10-06, `RSF-OQ-1`: replace.)* Today an accepted contributor (active role 2) the payload no longer lists stays active after a resubmission. After a resubmission, the result's active role-2 rows MUST be limited to SPs listed in `contributing_programs`. A role-2 row for an SP the payload does not list MUST be inactive (`RSB-R-4` replace semantics, extended to accepted contributors; amends `RSB-R-15`).

##### Scenario: contributor dropped (regression)
- GIVEN Rejected result R with SP06 an accepted contributor (active role 2)
- WHEN R is resubmitted with no SP06 in `contributing_programs`
- THEN SP06's role-2 row is inactive
- BUT a contributor still in the payload must NOT lose its active role-2 row
- AND IT MUST leave the primary's role-1 row untouched (role 1 follows `RSB-DD-5` / `RRC-R-17`, not this rule)

#### Requirement `RSF-R-8` (check e): Budget never surfaces under an inactive parent — Verified OK

`result_initiative_budget` amounts MUST NOT be rendered, exported or validated under an inactive role row. Scout evidence: every reader that renders or exports the amount (bilateral GET innovation extras, QA type-specific mapper, admin export, result-detail investment, innovation-use, innovation-dev, summary, IPSR step 4, both validation modules, replication) filters the parent `is_active`. platform-report has no budget reader. Closure: the evidence table in `execution.md`, plus one regression test on the bilateral GET reader (the consumer-facing one), so a future edit cannot drop the filter unnoticed.

#### Requirement `RSF-R-9` (check f): Resubmission p95 — Measured by the user

The resubmission p95 SHOULD be within +30% of a regular `create` of the same type (`RSB` NFR). No automated perf harness exists. The user measures it on PRTest (≥ 10 runs each, same type and payload size) and records the numbers in `execution.md`. If the two series overlap so much that the difference is smaller than their spread, the result is **inconclusive** and recorded as such.

#### Requirement `RSF-R-10` (check g): Retry guidance matches the server — Verified OK + pin

The contract doc already says: a 409 "its status is pending review" after a timeout means the attempt committed, so do not resend (`bilateral-result-summaries.en.md` §Resubmitting). The server MUST produce that exact status wording for status 5. A test MUST pin `describeResultStatus(5)` → the doc's text, so the doc and the code cannot drift apart.

#### Requirement `RSF-R-12` (added 2026-10-07, user-approved amendment): Retired contributors leave `obj_results_toc_result`

The bilateral GET `obj_results_toc_result` MUST list only **active** `results_by_inititiative` rows of any role. An inactive role-2 row (a contributor retired by `RSF-R-7`, or declined) MUST NOT appear as a `"Contributor"` entry. `obj_result_by_initiatives` keeps listing every row with its `is_active` (unchanged).

*Why:* the T-7 live run (2026-10-07, result 9550) showed SP06 retired by `R-7` (`is_active:false`) still listed as `"Contributor"`. Since `R-7` retires contributors on every resubmission that drops one, consumers would routinely see SPs that no longer contribute.

##### Scenario: retired contributor (regression, 9550 live case)
- GIVEN result 12018 (9550) with SP06 role 2 inactive, SP07 role 2 active and SP11 role 1 active
- WHEN a platform calls `GET /api/bilateral/12018`
- THEN `obj_results_toc_result` lists SP11 ("Primary submitter") and SP07 ("Contributor")
- BUT it must NOT list SP06
- AND IT MUST keep `R-3`: no inactive role-1 entry, and the result is still returned when no row is active

### SHOULD

- **`RSF-R-11`** — Each new 400 (`R-5`, `R-6`) SHOULD reuse the `RSB-R-21` log line (`result_code`, `operation=updated`, platform, outcome), with no payload or keys.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | `AC-4`: no field added, removed or renamed. `obj_results_toc_result` keeps its shape; only inactive entries disappear (role 1 per `R-3`; role 2 per `R-12`, amendment 2026-10-07). That is a content correction → one change-log row in the contract doc. New 400s on the resubmission branch → change-log row + error table |
| **No-code create unchanged** | `RSB-R-1` holds: the existing create Jest suite stays green, unchanged |
| **Atomicity** | `R-5`, `R-6` refuse before the first write (`RSB-R-8`) |
| **Copy** | New client strings come from `src/app/internationalization/` (DD-9), reusing `contribution-request-drawer.copy.ts` `primaryVerb`/`primaryTail` |
| **Security** | No new surface. Logs carry no payload, keys or tokens (`.cursorrules`) |
| **Performance** | Reader filters add a predicate on a join already present; no new query. `R-9` covers the resubmission p95 |

## 8. Defect Classes and the Gate for Each

| Defect class | Gate | Gap |
|---|---|---|
| Wrong primary sentence in the bell (`R-1`) | Jest on the bell component: rendered text for primary, contribution, map-to-ToC | **Partial.** jsdom checks the text, not the line-clamp layout. Substitute: user glance at the bell at the HITL pause (read-only, no clicks — the local stack shares prdb) |
| Bell link and inbox search disagree (`R-2`) | Jest: for each kind, the pipe's text contains the bell's search text | — |
| Inactive role 1 shown as primary (`R-3`) | Jest per reader with a fixture of one active + one inactive role-1 row; the SQL reader asserts the `is_active` predicate in the query | **Partial.** A mocked repository cannot run the SQL. Substitute: one live `GET /api/bilateral/9550` (or 9762) on PRTest by the user, compared before/after |
| Notification disappears for an ownerless result (`R-3` BUT) | Jest: ownerless fixture → the notification is still returned | — |
| Duplicate subnationals reactivated (`R-4`) | Jest on the repository: the update targets one row per code | **Partial**, same SQL limit. Live: a resubmission of a result with a historic duplicate, row count checked by the user |
| Refusal leaves writes (`R-5`, `R-6`) | Jest: refusal → zero writer/repository calls (the `RSB` spy pattern) | Same as `RSB` §9: real rollback is not proven by mocks |
| Regression on the no-code create (`R-5`, `R-6`) | The existing `bilateral.service` create Jest suite, scoped, unchanged | — |
| Contributor left active (`R-7`) | Jest on the reset: dropped SP → role 2 deactivated; kept SP → untouched | — |
| Budget filter dropped later (`R-8`) | Jest on the bilateral GET reader with an inactive parent | Other readers: evidence only, accepted |
| p95 regression (`R-9`) | **None automated** | Accepted; user measurement with an explicit inconclusive outcome |
| Doc and status text drift (`R-10`) | Jest pin on `describeResultStatus(5)` | — |

## 9. Dependencies and Sequencing

| Dependency | Effect |
|---|---|
| `RRC-T-5` (edits `notification.service.ts`) | Same file as `R-3`. Run this spec's notification task **after** `RRC-T-5` lands, or rebase on it. Warn, not block |
| `RRC-T-6` (edits `bilateral-resubmission.service.ts`, `requestPrimary` → `transferPrimary`) | Same file as `R-4..R-7`. Same rule. After `RRC-R-17` ships, the pending inactive role-1 row stops being created on the API path, but retired former owners keep producing inactive role-1 rows, so `R-3` stays necessary |
| `RRC-R-8` (contributors re-sent at submit) | Context for `RSF-OQ-1`: `RRC` re-sends saved contributors but leaves accepted role 2 untouched (`RRC` reversion table, `DD-5`) |

## 10. Changes from the Proposal (discovery)

| Proposal said | Discovery | Effect |
|---|---|---|
| Card copy lives in `generateNotificationTextRequest` + the pipe | The **visible** text is in the bell's HTML template (`:96-115`). The TS function only builds the link's search text | `R-1` covers the template; `R-2` covers the TS function and the pipe together |
| Fix wording "{requester} asked {SP} to become…" | The inbox already renders "{centre} has tagged {SP} as the primary Science Program of result…" from shared copy | Reuse it (one sentence across bell and inbox) |
| Notification readers at :460, :743, :910, :1412 | :460 is already safe. :743, :910 and :1412 are confirmed. Also found: the QA payload `primary_science_program` and `resolveOwnerProgramCode` reading any role | `R-3` table |
| b "logged only at debug level" | It logs at **warn** and keeps the old lead | `R-5` |
| e "to verify" | Verified OK across 11 readers | `R-8` closes with evidence + one guard test |
| g "to verify" | Already documented; only the status text needs pinning | `R-10` |

## 11. Open Questions

| ID | Question | Default if unanswered | Owner |
|---|---|---|---|
| `RSF-OQ-1` | (proposal `OQ-1`) Should a resubmission retire accepted contributors the payload dropped? (the proposal named Nicoleta / Juan David; answered by the user) | **Resolved 2026-10-06: replace** (`R-7`) | User |
| `RSF-OQ-2` | Unresolvable `lead_center` on resubmission: refuse 400, or keep warn-and-continue? | **Resolved 2026-10-06: refuse 400** (`R-5`) | User |
| `RSF-OQ-3` | (proposal `OQ-2`) Several `is_lead` projects: refuse 400, or keep "last wins" and document it? | **Resolved 2026-10-06: refuse 400** (`R-6`) | User |
| `RSF-OQ-4` | The live role label in `obj_results_toc_result`: "Owner" (QA mapper) or "Primary submitter" (doc example)? | Read it from the PRTest GET during the `R-3` live check; fix the doc if it differs | User at HITL |

## 12. Requirement ID Index

| ID | Title | Strength | Kind | Source |
|---|---|---|---|---|
| `RSF-R-1` | Bell names a primary request correctly | MUST | Bug | Proposal §9.1 |
| `RSF-R-2` | Deep link finds the row | MUST | Bug | Discovery |
| `RSF-R-3` | Only active role 1 shown as primary | MUST | Bug | Proposal §9.2 |
| `RSF-R-4` | One active subnational per code | MUST | Fix (check a) | Proposal §9.3 a |
| `RSF-R-5` | Unresolvable lead centre refused | MUST | Fix (check b) | §9.3 b, `OQ-2` |
| `RSF-R-6` | Several lead projects refused | MUST | Fix (check c) | §9.3 c, `OQ-3` |
| `RSF-R-7` | Contributors follow the payload | MUST | Fix (check d) | §9.3 d, `OQ-1` |
| `RSF-R-8` | Budget under inactive parent | MUST | Verified OK + guard | §9.3 e |
| `RSF-R-9` | Resubmission p95 | SHOULD | Measured | §9.3 f |
| `RSF-R-10` | Retry guidance pinned | MUST | Verified OK + pin | §9.3 g |
| `RSF-R-11` | Log line for new refusals | SHOULD | — | `RSB-R-21` |
| `RSF-R-12` | Retired contributors leave `obj_results_toc_result` | MUST | Bug (amendment 2026-10-07) | T-7 live run |
