# Module Spec — Bilateral Contributor Tagging — Requirements

> **Answer first:** a Center-authored bilateral result (1) automatically lists, as contributing Centers, the owners of its non-lead contributing projects, in both the form and the ingest API, and (2) when it reaches **Pending Review**, notifies in-app every Center it tags, one notification per user per result. Nothing is sent before submission. The pool funding texts are unchanged.

## 1. Document Control

| Field | Value |
|---|---|
| Module | `notifications` (with `bilateral` write paths) |
| Sub-feature | Bilateral contributor tagging: owner-Center derivation + tagging notifications |
| Owner | Juan David Delgado |
| Status | approved (Juan David, 2026-09-22) |
| Depth | **Standard**: two packages, two write paths, no migration, no payload shape change |
| Type | Change (inherited from `proposal.md`) |
| Approval Mode | gated (inherited) |
| Tickets | [P2-3793](https://cgiarmel.atlassian.net/browse/P2-3793) · US [P2-3792](https://cgiarmel.atlassian.net/browse/P2-3792) (scenarios 6, 7; AC27–AC42) · epic [P2-3487](https://cgiarmel.atlassian.net/browse/P2-3487) |
| Base branch | `performance-refactor` |
| ID prefix | `BCT-`. `NOTIF-R-*` is already taken by `docs/specs/notifications/bilateral-review-decision/` |
| Proposal | `proposal.md` rev 2. Decisions D-1..D-5 are binding here; D-6 becomes BCT-R-7 |

## 2. Executive Summary

| Part | Today | After |
|---|---|---|
| A. Owner derivation | Adding CIP's project to an AfricaRice result stores the project only; CIP is not a contributing Center | CIP is stored as a contributing Center, is shown selected and locked in the form, and stays when the project is removed |
| B. Notifications | Nobody is told when a Center tags another Center on a bilateral result | At Pending Review, CIP's Center Users get one in-app notification naming the project (or the Center, when tagged by hand) |

## 3. Glossary

| Term | Meaning |
|---|---|
| Reporting Center | The result's lead Center: the `results_center` row with `is_leading_result` true, derived from the lead project |
| Lead project | The project that defines the result; shown read-only under `Contributing W3/bilateral projects` |
| Contributing project | Any active project on the result other than the lead project |
| Owning Center | The CGIAR Center a project belongs to (CLARISA `organization_code`, else the W3 acronym alias) |
| Derived Center | A contributing Center present because a contributing project it owns is present |
| Locked | Shown selected and not deselectable in the Centers selector |
| Center User | A `role_by_user` row for the Center with the Center User role, active |
| Pending Review | `result.status_id = 5` |

## 4. System Context & Scope

Baseline citations:
- `docs/prd.md` AC-4 (bilateral stability: no shape change; behavior documented), AC-8 (user-facing changes fire notifications), US-S3 (sharing and contribution).
- `docs/ux-ui/design.md` DD-6 (bilateral first-party UI, `pages/bilateral/`), DD-10 (dual-channel by default; this spec is **in-app only**, as P2-3792 excludes email), top bar notifications bell (§ top-level shell).
- `docs/trd/trd.md` W4 Notifications, W6 Bilateral enrichment, the bilateral payload contract section, ADR-004 (additive only), the Notification module row.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: change-log entry required (BCT-R-6).
- Extends `docs/specs/notifications/` (catalog) and reuses NFR-1 of `docs/specs/notifications/bilateral-review-decision/requirements.md` (settings are email-only).

### In scope

- Owner-Center derivation on the bilateral Contributors save and on `POST /api/bilateral/create`.
- Locking and auto-selecting derived Centers in the bilateral Contributors section.
- In-app tagging notifications for bilateral results on reaching Pending Review, from submit and from ingest.

### Out of scope

- Automatic removal of derived Centers; tracking the origin of a contributing Center.
- Pool funding (P25 Contributors and Partners) and AI extraction (`populateResultFromExtractedMds`).
- Email, notification settings, and list filters; new notification types; retraction notices.
- Scenarios 1–5 of P2-3792, which are regression only (§8).

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (Center User of the reporting Center) | Derived Centers appear and lock in the form; submitting now notifies the tagged Centers |
| Center User of a tagged or owning Center | Receives the notification in the bell and in Updates |
| Bilateral consumer (ingest API, including the Bulk Uploader partner) | May see extra `contributing_center` rows stored for what it sent; request and response shapes are unchanged |
| QA / Science Program users | No change beyond the regression checks |

**BCT-US-1** — As a reporting Center user, I want the Centers that own the projects I list to be recorded as contributing Centers, so that the result's contributors are complete without extra clicks. *Refines US-S1.*
**BCT-US-2** — As a Center User, I want to be told in the platform when another Center tags my Center or my Center's project on a bilateral result, so that I learn about my involvement without email threads. *Refines US-S3, AC-8.*

## 6. Functional Requirements

### Part A — Owner-Center derivation

#### BCT-R-1 — Derive the owner of a contributing project (form)

When a Center user saves `Contributing W3/bilateral projects`, the system SHALL store the owning Center of every contributing project as a contributing Center, unless it is already one.

##### Scenario: A project from another Center is added
- GIVEN an AfricaRice bilateral result in Editing
- WHEN the user adds a CIP-owned project and the section autosaves
- THEN CIP is stored as an active contributing Center of the result
- AND CIP appears selected under `Contributing CGIAR centers` without a page reload
- BUT the lead Center row MUST NOT be deactivated, duplicated, or demoted
- AND IT MUST keep every Center the user had already selected

##### Scenario: A project owned by the reporting Center is added
- GIVEN an AfricaRice result
- WHEN the user adds an AfricaRice-owned project
- THEN no contributing Center row is added for AfricaRice

##### Scenario: The owner cannot be resolved
- GIVEN a project with no `organization_code` and no known acronym alias
- WHEN it is saved
- THEN the save succeeds, the project is stored, and no Center is derived for it
- AND a warning naming the project id is logged

#### BCT-R-2 — Derive the owner of a contributing project (ingest)

On `POST /api/bilateral/create`, the system SHALL store, as contributing Centers, the union of the Centers sent in `contributing_center` and the owning Centers of the sent `contributing_bilateral_projects`, applying the same exclusions as BCT-R-1.

##### Scenario: A payload sends a project but no Center
- GIVEN a payload with `project_id` owned by AfricaRice, one contributing project owned by CIP, and no `contributing_center`
- WHEN the result is created
- THEN CIP is stored as an active contributing Center
- AND the response shape is identical to today's
- BUT a Center sent explicitly MUST NOT be dropped or duplicated when it is also a derived owner

#### BCT-R-3 — Lock derived Centers in the form

While at least one selected contributing project is owned by Center X, the system SHALL show X as selected and not deselectable in `Contributing CGIAR centers`.

##### Scenario: The user tries to remove a locked Center
- GIVEN CIP is derived from a selected CIP-owned project
- WHEN the user opens the Centers selector
- THEN CIP is shown selected and disabled, like the lead Center
- AND IT MUST NOT be removable through the chip remove action either

##### Scenario: The server re-adds a Center removed by other means
- GIVEN a `PATCH contributors` that **includes the project list** (`contributing_bilateral_projects`) with the CIP project, and omits CIP from `contributing_center`
- WHEN the save completes
- THEN CIP is still an active contributing Center
- NOTE (amended 2026-09-22, Juan David, during `/akili-execute` BCT-T-3): the server re-asserts derived Centers only on saves that carry the project list (design §5.2 guard). A centers-only `PATCH` that omits CIP deactivates it until the next save that includes projects. The form always sends both keys (design BCT-P-1), so the UI is unaffected

#### BCT-R-4 — Derived Centers are sticky

When the last contributing project owned by Center X is removed, the system SHALL keep X as a contributing Center and make it deselectable.

##### Scenario: The project is removed
- GIVEN CIP is locked because of one CIP-owned project
- WHEN the user removes that project
- THEN CIP stays selected and becomes enabled
- AND when the user then removes CIP, it is deactivated on save
- BUT the removal of the project MUST NOT deactivate CIP by itself

#### BCT-R-5 — Scope of derivation

The system SHALL apply derivation only to bilateral results (`source = Bilateral`), and only to the Contributors save and the ingest create.

##### Scenario: A pool funding save
- GIVEN a pool funding result
- WHEN an SP saves `Contributing W3 and/or bilateral projects`
- THEN no Center is derived (behavior unchanged)

#### BCT-R-6 — Document the ingest behavior

The payload contract document SHALL carry a change-log entry stating that ingested `contributing_center` may include derived owners, with no field added, removed, or renamed.

### Part B — Tagging notifications

#### BCT-R-7 — Notify owners of contributing projects on Pending Review (scenario 7)

When a bilateral result reaches Pending Review, the system SHALL notify the active Center Users of the owning Center of each **contributing** project with: `The result <code> - <title> reported by <reporting Center acronym> has tagged the <project name> of your center (<owner Center acronym>). Click to see the result.`

> Amended by `changes/notification-tagged-center-name` (NTC-R-1): the label ends with the owner Center acronym in parentheses (fallback: Center `code`). "That text" in the scenario below means this amended text.

##### Scenario: Submit with a CIP-owned project
- GIVEN an AfricaRice result in Editing with a CIP-owned contributing project
- WHEN the user submits it for review
- THEN every active CIP Center User receives one `Result Bilateral Project Tagged` notification with that text
- AND clicking it opens the result's General Information page and marks it read (existing routing)
- BUT the lead project MUST NOT produce a notification

##### Scenario: A project owned by the reporting Center (AC36)
- GIVEN a contributing project owned by AfricaRice
- WHEN an AfricaRice user submits
- THEN the other AfricaRice Center Users are notified and the submitter is not

#### BCT-R-8 — Notify contributing Centers on Pending Review (scenario 6)

When a bilateral result reaches Pending Review, the system SHALL notify the active Center Users of each non-lead contributing Center with: `The result <code> - <title> reported by <reporting Center acronym> has tagged the <tagged Center name>. Click to see the result.`

##### Scenario: Three Centers tagged by hand (AC30)
- GIVEN a result with CIP, IITA and ICRISAT as contributing Centers and no contributing project
- WHEN it is submitted
- THEN each Center's users receive exactly one notification naming their own Center
- BUT the reporting Center MUST NOT be notified as a tagged Center

#### BCT-R-9 — One notification per user per result, project message first

The system SHALL notify any user at most once per result across all tagging notifications, and when a user qualifies through both a project and a Center, SHALL send the project message (BCT-R-7).

##### Scenario: A derived Center (AC37)
- GIVEN CIP is both a derived contributing Center and the owner of a contributing project
- WHEN the result is submitted
- THEN CIP users receive one notification, with the BCT-R-7 text

##### Scenario: Re-submission after rejection (AC32)
- GIVEN a result already submitted, notified, and then rejected
- WHEN it is submitted again with the same contributors
- THEN no user receives a second tagging notification
- AND a Center newly added before the re-submission IS notified

#### BCT-R-10 — Trigger only on Pending Review

The system SHALL emit tagging notifications only when the result's status is Pending Review, from the submit action or from ingest.

##### Scenario: Saved in Editing or Draft (AC27, AC34)
- GIVEN contributors saved on a result in Editing or Draft
- WHEN no submission happens
- THEN no tagging notification exists for the result

##### Scenario: Ingest with `keep_editing: true`
- WHEN a result is ingested with `keep_editing: true`
- THEN no tagging notification is created

##### Scenario: Ingest complete (AC33, AC39)
- WHEN a result is ingested without `keep_editing` and with contributors
- THEN the notifications of BCT-R-7 and BCT-R-8 are created

#### BCT-R-11 — Emitter and recipient rules

The system SHALL exclude the acting user from every recipient set, SHALL send nothing (and raise no error) for a Center with no active Center Users, and SHALL skip a project whose owner cannot be resolved while still notifying the other targets (AC38).

#### BCT-R-12 — Existing texts unchanged (AC42)

The system SHALL keep the pool funding tagging text (`… created by <SP code> has tagged the …`) and every other existing notification text byte-for-byte unchanged.

## 7. Non-Functional Requirements

| ID | Dimension | Target |
|---|---|---|
| BCT-NFR-1 | Resilience (AC40) | A failure in derivation lookups or notification emission MUST NOT fail or roll back the save, the submit, or the ingest. Notification emission runs after commit |
| BCT-NFR-2 | Settings (AC41) | In-app notifications MUST NOT be filtered by `user_notification_settings` (email-only flags) |
| BCT-NFR-3 | Compatibility (AC-4, ADR-004) | No field added, removed, or renamed on any `/api/bilateral/*` or `PATCH contributors` request or response. Additive fields outside the bilateral contract (e.g. on the CLARISA projects catalog, design BCT-DD-4) are allowed |
| BCT-NFR-4 | Data safety | The Contributors save MUST NOT reach `syncContributingCenters` with an unintended empty list (the `section-contributors/CLAUDE.md` trap: an empty list deactivates every row, the lead included) |
| BCT-NFR-5 | Performance | Derivation MUST add at most one batched owner lookup per save (no per-project query loop beyond what `syncBilateralProjects` already does). Notification fan-out per submit is bounded by tagged Centers × their Center Users |
| BCT-NFR-6 | Observability / security | Unresolvable owners and emitter failures log a warning with result and project ids only; no tokens, no user emails (`.cursorrules`) |
| BCT-NFR-7 | No migration | The spec MUST ship without a schema or seed migration |

## 8. Regression (scenarios 1–5 of P2-3792)

No new requirement. QA confirms AC1–AC26 of P2-3792 still pass. Scenario 5 needs an admin account or the open phase, because contribution buttons are disabled in closed phases.

## 9. Defect Classes And Gates

| Defect class | Caught by | What the gate cannot see |
|---|---|---|
| Wrong recipients (missing, extra, submitter included, lead Center included) | Server Jest: `result-tagged-notification.service.spec.ts` | Real `role_by_user` data per environment. Covered by QA on prtest |
| Duplicate or wrong-message notification (BCT-R-9) | Server Jest (ordering + dedup cases) | — |
| Fires in the wrong status | Server Jest on the emitter guard + `bilateral-center.service.spec.ts` + ingest spec | — |
| Notification or derivation failure breaks the save or submit | Server Jest with a throwing mock | — |
| Pool funding text regression | The existing `result-tagged-notification.service.spec.ts` cases, **unchanged** | — |
| Derived Center not stored, lead wiped, explicit Center dropped | Server Jest on `saveContributors` and ingest | — |
| Owner mis-resolved for Alliance-descended projects (null `organization_code`) | Server Jest with an alias-fallback fixture | **Whether real CLARISA rows resolve correctly.** Unit fixtures are ours by construction. Substitute: a prtest check on a known Alliance-descended project at the HITL pause |
| Lock and auto-select wrong in the UI | Client Jest on the `section-contributors` computed state | **jsdom cannot prove PrimeNG renders the option disabled.** Substitute: manual check in the browser at the HITL pause |
| Compile-only breaks in specs that build entities by hand | `npx tsc --noEmit` (server) | — |
| Environment schema: `result_review_history.action` lacks `UPDATE` | **No automated gate.** Substitute: `SHOW CREATE TABLE result_review_history` per environment before QA (accepted manual check) | — |

## 10. Requirement ID Index

| ID | Short name | P2-3792 AC |
|---|---|---|
| BCT-R-1 | Derive owner (form) | — (scope rev 2) |
| BCT-R-2 | Derive owner (ingest) | — |
| BCT-R-3 | Lock derived Centers | — |
| BCT-R-4 | Sticky derived Centers | — |
| BCT-R-5 | Derivation scope | — |
| BCT-R-6 | Contract change-log | — |
| BCT-R-7 | Project-owner notification | AC34–AC36, AC38, AC39 |
| BCT-R-8 | Contributing-Center notification | AC27–AC31, AC33 |
| BCT-R-9 | One per user, project first | AC32, AC37 |
| BCT-R-10 | Pending Review trigger | AC20-like, AC27, AC34 |
| BCT-R-11 | Emitter and recipient rules | AC31, AC36, AC38 |
| BCT-R-12 | Existing texts unchanged | AC42 |
| BCT-NFR-1..7 | Non-functional | AC40, AC41 |

## 11. Dependencies, Assumptions, Open Questions

- **Upstream:** CLARISA projects and centers (`clarisa_projects`, `clarisa_center`, W3 acronym alias map); `role_by_user`; the notification types `Result Center Tagged` and `Result Bilateral Project Tagged` (already seeded in every environment).
- **Assumption A-1:** `Result Bilateral Project Tagged` renders `notification.text` as the suffix on the client (`notification-type.constants.ts:153-165`), so the ` of your center` wording needs no client change.
- **Assumption A-2:** the client form is read-only outside Editing and Draft (`bilateral-creation.service.ts:476-479`), so derivation happens only on editable results in the form.
- **BCT-OQ-1:** P2-3792 does not include Part A. Tell Ángel so QA tests BCT-R-1..R-6. This does not block design.
- **BCT-OQ-2:** ~~how the effective Center set reaches `section-contributors` after save~~ — resolved by `design.md` BCT-DD-4: the client learns project ownership from the catalog, so no save-response echo is needed.
