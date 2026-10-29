# Requirements — Discard several AI draft results at once (`ABD`)

## 1. Document Control

| Field | Value |
|---|---|
| Module / sub-feature | `bilateral` / AI Draft Results — bulk discard |
| Spec path | `docs/specs/bilateral/ai-drafts-bulk-discard/` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Status | draft — awaiting owner review (written 2026-10-27 in a parallel specify run; Phase 1→3 pauses collapsed into one review) |
| Owner | Santiago Sanchez |
| Source | `proposal.md` (approved 2026-10-27). Ticket Freshdesk **INC-166545** point 2 (Nicoleta Trifa) |
| Related | archive `2026-09-14-bilateral--ai-drafts-redesign` (`BADR-R-*`), archive `2026-09-16-changes--bilateral-ai-draft-filters` (`BADF-R-*`), `bilateral/ai-processing-queue` (`AIQ-R-9`, `?job=` highlight), `bilateral/ai-draft-evidence-promotion` (`ADE-R-9` per-item commit pattern), `ASC-R-15` (admins not entitled to `'act'`) |

## 2. Executive Summary

On `/bilateral/:centerAcronym/drafts`, a Center member can tick several AI draft results (one by one, or all visible drafts of one AI upload at once) and discard them with **one** confirmation and **one** request. The server discards each draft under the same rules as today's single discard, commits each one independently and reports which failed. Single discard keeps working and its two writes become atomic.

## 3. Glossary

| Term | Meaning |
|---|---|
| Draft | A `bilateral_ai_draft` row with `is_discarded = false`, shown on the AI Draft Results tab |
| Upload card | One `sessionGroups()` entry = all drafts of one AI job (`job_id`) |
| Visible drafts | Drafts left after the tab's search, project and Created-by filters |
| Discard | `draft.is_discarded = true` **and** linked `result.is_active = false` |
| Center member | User for whom `isCenterMember()` is true on the client and `assertCenterEntitlement(…, 'act')` passes on the server |

## 4. System Context & Scope

**In:** AI Draft Results tab (`my-draft-results`) multi-select + action bar + confirmation; new bulk discard endpoint; transactional single discard.
**Out:** bulk promote; changing who may discard; undo/restore; selection on `bilateral-ai-draft-detail`; AI generation volume.

## 5. Stakeholders / Personas

| Persona | Change |
|---|---|
| Center reporter reviewing AI drafts | Can drop 12 of 14 drafts in a few clicks |
| Non-member viewer / admin without center role | No checkboxes, no action bar (unchanged read-only) |
| CGIAR SO (Nicoleta) | Requester |

## 6. Functional Requirements

### ABD-R-1 — Row selection

Each draft row SHALL have a selection checkbox, rendered only for Center members.

#### Scenario ABD-S-1.1: Member selects rows
- GIVEN a Center member on the AI Draft Results tab with 14 drafts in one upload card
- WHEN they tick 3 rows
- THEN those 3 rows show as selected
- AND the selection count is 3

#### Scenario ABD-S-1.2: Non-member
- GIVEN a user for whom `isCenterMember()` is false
- THEN no row checkbox, no header checkbox and no action bar are rendered
- BUT Review MUST keep working as today

#### Scenario ABD-S-1.3: Accessible name
- AND IT MUST give each row checkbox an accessible name that includes the draft title

### ABD-R-2 — Select all visible drafts of one upload

Each upload card header SHALL have a checkbox that selects or clears every **visible** draft of that card.

#### Scenario ABD-S-2.1: Select all in card
- GIVEN an upload card with 14 visible drafts, none selected
- WHEN the member ticks the card header checkbox
- THEN all 14 drafts of that card are selected
- BUT drafts of other cards MUST NOT be selected

#### Scenario ABD-S-2.2: Indeterminate state
- GIVEN 12 of 14 drafts of a card are selected
- THEN the header checkbox shows the indeterminate state
- AND ticking it selects all 14; ticking again clears all 14 of that card only

#### Scenario ABD-S-2.3: Filters respected
- GIVEN a project filter that hides 4 of a card's 14 drafts
- WHEN the member ticks the card header
- THEN only the 10 visible drafts are selected
- BUT the 4 hidden drafts MUST NOT be selected

### ABD-R-3 — Action bar

With at least one draft selected, the tab SHALL show an action bar with the count, **Discard selected** and **Clear selection**.

#### Scenario ABD-S-3.1: Bar appears and clears
- GIVEN 0 drafts selected → no action bar
- WHEN 1 draft is selected → the bar shows "1 selected"
- WHEN the member clicks Clear selection → selection is empty and the bar disappears

#### Scenario ABD-S-3.2: Button hierarchy
- AND IT MUST NOT add a second primary (brand) button to the screen; Discard selected uses the destructive/outline style (`BADR-R-*`)

### ABD-R-4 — One confirmation for the whole selection

Discard selected SHALL open one confirmation dialog stating the number of drafts, and nothing is sent until the member confirms.

#### Scenario ABD-S-4.1: Confirm
- GIVEN 12 drafts selected
- WHEN the member clicks Discard selected
- THEN a dialog says 12 draft results will be discarded and their draft results removed
- WHEN they confirm → exactly one bulk request is sent with the 12 ids

#### Scenario ABD-S-4.2: Cancel
- WHEN they cancel
- THEN no request is sent
- AND the selection is kept

### ABD-R-5 — Bulk discard endpoint

The server SHALL expose an authenticated endpoint that discards a list of drafts, applying to **each** id the same rules as the single discard, committing each draft independently, and returning the ids discarded and the ids that failed with a reason.

#### Scenario ABD-S-5.1: All succeed
- GIVEN a Center member and 12 active drafts of their center
- WHEN the endpoint is called with those 12 ids
- THEN each draft has `is_discarded = true` and its result `is_active = false`
- AND the response lists 12 discarded ids and 0 failures

#### Scenario ABD-S-5.2: Partial failure
- GIVEN 10 drafts of the member's center, 1 already-discarded draft and 1 draft of another center
- WHEN the endpoint is called with the 12 ids
- THEN the 10 are discarded
- AND the 2 others are returned as failed (not found / not entitled)
- BUT the 2 failures MUST NOT roll back the 10 successes
- AND IT MUST NOT change the draft or result of the other center

#### Scenario ABD-S-5.3: Atomic per draft
- AND IT MUST write `draft.is_discarded` and `result.is_active` in one transaction per draft — a draft is never discarded with its result left active, or the reverse

#### Scenario ABD-S-5.4: Input validation
- GIVEN an empty list, a non-integer id, or more than 100 ids
- THEN the endpoint answers 400 and changes nothing
- AND duplicate ids are processed once

#### Scenario ABD-S-5.5: Admin without center role
- GIVEN a platform admin who is not a Center User of the drafts' center
- THEN every id is returned as failed (not entitled), consistent with `ASC-R-15`

### ABD-R-6 — Result feedback on the tab

After the bulk request the tab SHALL remove discarded drafts, keep failed ones selected, and show one summary toast.

#### Scenario ABD-S-6.1: Success
- WHEN 12 of 12 succeed → the 12 rows leave the list, selection is empty, one toast "12 draft results discarded"
- BUT the page MUST NOT navigate or reload the route

#### Scenario ABD-S-6.2: Partial failure
- WHEN 10 succeed and 2 fail → 10 rows leave, the 2 stay **and stay selected**, one toast reports 10 discarded and 2 not discarded

#### Scenario ABD-S-6.3: Request error
- WHEN the request fails entirely (network / 5xx)
- THEN no row is removed (or removed rows are restored), the selection is kept, one error toast is shown

#### Scenario ABD-S-6.4: In-flight guard
- AND IT MUST disable Discard selected and the dialog's confirm while the request is in flight (no double submit)

### ABD-R-7 — Selection never holds hidden drafts

The selection SHALL be cleared whenever the visible set can change underneath it: filter change (search, project, Created-by), center switch, or draft list reload.

#### Scenario ABD-S-7.1: Filter change
- GIVEN 5 selected drafts
- WHEN the member changes the project filter
- THEN the selection is empty and the action bar disappears
- BUT a discard MUST NOT ever include a draft that is not visible at confirmation time

### ABD-R-8 — Single discard unchanged for the user, atomic on the server

The row trash icon and the panel Discard SHALL keep their current behavior; on the server, the single discard SHALL write both changes in one transaction.

#### Scenario ABD-S-8.1: Single discard
- WHEN a member discards one draft from the row icon
- THEN behavior, response shape and messages are as today
- AND IT MUST write both changes atomically (ABD-S-5.3 rule)

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| ABD-NFR-1 | One HTTP request per bulk action, regardless of the number of drafts (≤ 100) |
| ABD-NFR-2 | Keyboard: checkboxes reachable and toggled with Space; visible focus ring (`--pr-focus-ring`); action bar buttons reachable by Tab |
| ABD-NFR-3 | Styling Tailwind-first with `--pr-*` tokens; Spartan `hlm-checkbox`; px type sizes (no rem utilities); no hex literals |
| ABD-NFR-4 | Endpoint contract additive: existing `DELETE …/drafts/:draftId` path, params and response unchanged |
| ABD-NFR-5 | No migration; no new column |
| ABD-NFR-6 | The `?job=` highlight effect (`AIQ-R-9`) and filter service scoping (component-provided) keep working |

## 8. Defect classes and the gate that catches each

| Defect class | Gate |
|---|---|
| Entitlement bypass (discarding another center's draft) | Server service spec ABD-S-5.2 / 5.5 (Jest) |
| Half-written discard (draft discarded, result active) | Server spec asserting both writes run through one transactional manager and a failing second write leaves the first unapplied (ABD-S-5.3) |
| One failure rolls back the batch | Server spec ABD-S-5.2 |
| Hidden / filtered draft discarded | Client component spec ABD-S-2.3, ABD-S-7.1 |
| Wrong rows removed / failed rows lost | Client service + component spec ABD-S-6.1–6.3 |
| Double submit | Component spec ABD-S-6.4 |
| `?job=` highlight regression | Existing component spec + `--findRelatedTests` |
| Layout: checkbox column squeezing the table, action bar overlap, indeterminate visuals | **No automated gate (jsdom cannot lay out).** Substitute: manual HITL check in the browser at the execute pause (T6 screenshot review optional). Never click Discard on real drafts (shared prdb) |
| Keyboard operability | Presence assertions in Jest (role/aria-label) + manual keyboard pass at HITL |

## 9. Assumptions to confirm (from proposal open questions)

| ID | Default adopted | Confirm with |
|---|---|---|
| ABD-OQ-1 | Selection spans the whole page; select-all is per upload card | Owner |
| ABD-OQ-2 | Copy: "Discard N draft results? Their draft results will be removed from PRMS." / toast "N draft results discarded" (+ "M could not be discarded") | Owner / Nicoleta |
| ABD-OQ-3 | Cap of 100 ids per request | SQL check (max drafts per job) before execute |

## 10. Requirement ID Index

| ID | Title | Scenarios |
|---|---|---|
| ABD-R-1 | Row selection | S-1.1, S-1.2, S-1.3 |
| ABD-R-2 | Select all visible of one upload | S-2.1, S-2.2, S-2.3 |
| ABD-R-3 | Action bar | S-3.1, S-3.2 |
| ABD-R-4 | One confirmation | S-4.1, S-4.2 |
| ABD-R-5 | Bulk discard endpoint | S-5.1 … S-5.5 |
| ABD-R-6 | Result feedback | S-6.1 … S-6.4 |
| ABD-R-7 | Selection never holds hidden drafts | S-7.1 |
| ABD-R-8 | Single discard unchanged, atomic | S-8.1 |
| ABD-NFR-1 … 6 | Non-functional | — |
