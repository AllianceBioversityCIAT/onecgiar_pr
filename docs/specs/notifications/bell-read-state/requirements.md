# Requirements — notifications/bell-read-state

> **In one line:** the bell reads like an e-mail inbox. Unread or unseen items are bold and counted.
> Opening one or pressing "Mark as read" turns it light, keeps it listed, and lowers the badge, down to `0`.
> Requests that need a decision stay in the **Decide** tab, with its own count, until someone accepts or declines them.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-read-state` |
| Depth | **Full** (new table + migration, new endpoint, changes an approved requirement) |
| Status | approved (2026-10-06, Santiago Sanchez) |
| Approval Mode | gated |
| Owner | Santiago Sanchez |
| Ticket(s) | none (confirmed 2026-10-06). Traceability: `[SPEC:notifications/bell-read-state]` |
| Source | `proposal.md` (approved 2026-10-06), Angel's voice feedback (2026-10-06), mockup `mockup/bell-read-state.html` |
| Amends | `archive/2026-10-06-notifications--bell-quick-inbox`: `BELL-R-1` (badge meaning), `BELL-R-3` (list content), `BELL-T-10` ("Mark as read"). All other `BELL-*` requirements stand. |
| PRD | `docs/prd.md` notifications stories; P2-3157 AC5 (clicking an update lowers the badge) is preserved |

## 2. Executive Summary

Today the badge counts **everything waiting** (pending requests + unread updates). "Mark as read" clears only updates. A user with many pending requests across several SPs and Centers (Angel: Guest with roles in several of each) sees `99+` before and after, and the 10 visible rows do not change. Read updates also vanish from the bell, so there is no "read" look.

This spec splits two questions the badge mixes today:

| Question | Where it is answered |
|---|---|
| "What have I not looked at yet?" | The **badge** and the **bold** rows |
| "What still needs my decision?" | The **Decide** tab count and its rows (bold or light) |

"Seen" is recorded **per person**: a request is one shared row that several members can decide on. One member seeing it does not make it seen for the others.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Request** | A pending contribution / primary request the user can accept or decline. Bell kind `decision`. One shared record for every member who can decide it. |
| **Update** | An informational notification. One record per recipient, with its own read flag. Bell kind `update`. |
| **Unseen request** | A pending request the current user has not opened and has not covered with "Mark as read". |
| **Unread update** | An update whose read flag is false for the current user. |
| **Fresh item** | An unseen request or an unread update. Rendered bold with a dot; counted on the badge. |
| **Seen / read item** | Its opposite. Rendered light; never counted on the badge. |
| **Badge** | The count pill next to "Notifications" in the topbar. |
| **Decide tab** | The bell tab that lists requests. Its count = every request still pending, fresh or not. |
| **Inbox page** | `/result/results-outlet/results-notifications`. |

## 4. System Context & Scope

### In scope
- Badge meaning and count (all phases, as today).
- Fresh vs. seen/read look of bell rows, and keeping read rows listed.
- Per-person "seen" state for requests, persisted on the server.
- "Mark as read" in the bell and "Mark all as read" on the inbox page: same meaning.
- Opening a single request (from the bell or the inbox page) marks it seen for that person.
- Tab counts (Decide = pending requests; Updates = unread updates).

### Out of scope
- Who receives which request (role scoping). Admin visibility of all requests (`BELL-OQ-1`) stays as is.
- Accept / Decline flows, two-step confirms, hand-offs (`BELL-R-5..R-8` unchanged).
- Inbox page row redesign (it only adopts the shared fresh/seen meaning where noted).
- E-mail, notification settings, real-time push, dark mode.

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| SP / Center member with many pending requests (Angel) | "Mark as read" takes the badge to `0`. Requests stay decidable in Decide. |
| Several members of the same SP | Each one has their own fresh/seen state for the same request. |
| Center User (P2-3157) | Clicking an update still lowers the badge (AC5), and now the row stays, light. |
| Platform admin | Same rules; their pending set is unchanged (`BELL-OQ-1`). |

### User stories
- **BRS-US-1** — As a user, I want unread items to look different from read ones, so that I can tell at a glance what is new.
- **BRS-US-2** — As a user, I want "Mark as read" to clear my badge, so that the bell stops telling me about things I have already looked at.
- **BRS-US-3** — As a user, I want requests to stay in Decide until they are decided, so that marking them read never loses work.
- **BRS-US-4** — As one of several members who can decide a request, I want my "seen" state to be mine, so that a colleague opening it does not hide it from me.

## 6. Functional Requirements

### BRS-R-1 — Badge counts fresh items only *(MODIFIES `BELL-R-1`)*

The badge SHALL show the number of **fresh items**: unseen requests + unread updates, across all phases. Above 99 it MUST render `99+`. At 0 it MUST NOT render.

*Before:* pending requests + unread updates. *After:* unseen requests + unread updates.

- **Scenario: counts fresh only** — GIVEN 140 pending requests of which 3 are unseen, and 5 updates of which 2 are unread, WHEN any page loads, THEN the badge shows `5`.
- **Scenario: overflow** — GIVEN 120 unseen requests and 0 unread updates, THEN the badge shows `99+`.
- **Scenario: zero** — GIVEN no fresh items but 40 pending requests, THEN no badge is shown — BUT the Decide tab MUST still show `40 to decide` (`BRS-R-6`).
- AND IT MUST stay independent of the inbox page's phase/program/search filters (`BELL-R-1` filter independence stands).

### BRS-R-2 — "Seen" is per person

The system SHALL record, for each pending request, which users have seen it. A request MUST be fresh for a user until that user has seen it, regardless of who else has.

- **Scenario: colleagues** — GIVEN request #9821 pending for the members of SP03: Juan David, Santiago, Angel and Juan Carlos, WHEN the first three open it, THEN it is light and uncounted for those three AND it is bold and counted for Juan Carlos.
- BUT seeing a request MUST NOT accept, decline, assign, or change it in any way.
- AND IT MUST survive sign-out, another browser and another device: the same user sees the same state everywhere.

### BRS-R-3 — Opening an item marks it seen / read

Opening an item SHALL make it seen (request) or read (update) for the current user, decrement the badge by 1 if it was fresh, and keep its current destination.

- **Scenario: update from the bell** — GIVEN an unread update in the bell, WHEN the user clicks it, THEN they land on its existing destination (`BELL-R-9`) AND the badge drops by 1 AND, on reopening the bell, the row is still listed in the light style.
- **Scenario: request from the bell** — GIVEN an unseen request in the bell, WHEN the user clicks its body (not Accept/Decline), THEN it navigates as today (a link never decides, `BELL-R-6`) AND it becomes seen AND the badge drops by 1.
- **Scenario: request from the inbox page** — GIVEN an unseen request, WHEN the user opens its detail drawer on the inbox page, THEN it becomes seen AND the bell badge drops by 1 without a reload.
- **Scenario: already seen** — GIVEN a seen request, WHEN the user opens it again, THEN nothing is counted and no duplicate record is created.
- BUT a failed "mark seen/read" call MUST NOT block the navigation, and the badge MUST NOT drop for an item the server did not record.

### BRS-R-4 — "Mark as read" clears the badge *(MODIFIES `BELL-T-10`)*

"Mark as read" SHALL mark every unread update read AND every request pending for the user at that moment seen, for that user only. Afterwards the badge MUST not render and every listed row MUST be in the light style.

- **Scenario: Angel's case** — GIVEN 140 pending requests (all unseen) and 5 unread updates, WHEN the user presses "Mark as read", THEN the badge disappears AND the "N new" chip and the button disappear AND the Decide tab still shows `140 to decide` AND every request still has Accept/Decline.
- **Scenario: arrives later** — GIVEN the user pressed "Mark as read", WHEN a new request or update arrives afterwards, THEN it is bold AND the badge shows `1`.
- **Scenario: only me** — GIVEN two members share 10 pending requests, WHEN one presses "Mark as read", THEN the other's badge is unchanged.
- **Scenario: failure** — GIVEN the call fails, THEN rows and badge stay as they were AND the button is usable again (`BELL-R-8` spirit).
- BUT it MUST NOT decide, hide or remove any request.
- AND IT MUST be idempotent: pressing it twice, or after some items were already seen, creates no duplicates and no error.

### BRS-R-5 — Inbox "Mark all as read" means the same

The inbox page's "Mark all as read" SHALL have exactly the effect of `BRS-R-4` (updates read + pending requests seen, all phases, current user), and the bell SHALL reflect it without a reload.

- **Scenario** — GIVEN the inbox filtered to one phase, WHEN the user presses "Mark all as read", THEN the bell badge disappears (all phases), matching the bell button.
- AND IT MUST be offered whenever the user has any fresh item, not only when the filtered inbox view has unread updates.
- *Before:* it returned early when the phase-filtered inbox had no unread updates, and it never touched requests.

### BRS-R-6 — Tabs carry their own counts

- The **Decide** tab SHALL show `N to decide` = every pending request (fresh or seen), hidden at 0.
- The **Updates** tab SHALL show the number of unread updates, hidden at 0.
- The **All** tab SHALL keep showing the number of listed rows.
- **Scenario** — GIVEN 140 pending requests (all seen) and 2 unread updates, THEN Decide shows `140 to decide`, Updates shows `2`, and the badge shows `2`.

### BRS-R-7 — Fresh and read look *(visual)*

Each bell row SHALL show its state:
- **Fresh:** bold title text and a primary-colour dot at the leading edge.
- **Seen / read:** regular-weight, secondary-colour text, no dot, slightly dimmed status chip and icon.

- **Scenario** — GIVEN one unread update and one read update, THEN the first renders bold with a dot AND the second renders light without a dot.
- AND IT MUST NOT use colour alone: weight and the dot both change (`docs/ux-ui/design.md` §10).
- AND IT MUST expose the state to assistive tech (each fresh row announces "unread" / "new").
- BUT the "Requires decision" chip and Accept/Decline MUST look the same on fresh and seen requests: being seen never makes a request look less actionable.

### BRS-R-8 — Read items stay listed *(MODIFIES `BELL-R-3`)*

The bell SHALL list fresh items first, then seen/read items, under an "Earlier" separator:
- inside each group: requests before updates, newest first;
- read updates come from the most recent ones (the first history page), not the full history;
- at most **10** rows in the active tab, with `+N more` linking to the inbox page when more exist.

- **Scenario: clicked row stays** — GIVEN 3 fresh items, WHEN the user clicks one and reopens the bell, THEN 2 rows are above "Earlier" AND the clicked one is under it.
- **Scenario: all read** — GIVEN 0 fresh items and 4 recent read updates, THEN the popover lists the 4 light rows (no empty state).
- **Scenario: nothing at all** — GIVEN no pending requests and no updates, THEN the existing empty state shows (`BELL-R-10`).
- AND IT MUST keep the request rows' Accept/Decline working in both groups.

### BRS-R-9 — Count and list stay in step

After any event that changes fresh/seen/read state (open an item, either "Mark as read", accept/decline, refresh), the badge, the tab counts, the row styles and the inbox page SHALL agree without a reload (`BELL-R-4`, `BELL-R-11` stand).

- **Scenario** — GIVEN the bell shows `5`, WHEN the user opens one unseen request from the inbox page, THEN the bell shows `4` AND that request is light in the bell.

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Privacy / isolation** | A user's seen records MUST only be readable and writable by that user. A request's seen state MUST NOT reveal which colleagues saw it. |
| **Performance** | "Mark as read" with 150 pending requests SHOULD complete in < 1 s server time (one bulk write, not one write per request). The bell refresh SHOULD add at most one extra request (recent read updates). |
| **Data** | One new table with a migration that has a working `down`. `migration:check:ci` passes. Seen records for decided requests MAY remain; they never count. |
| **Accessibility** | WCAG 2.1 AA: fresh state not by colour alone; tab counts are part of the tab's accessible name; the badge count stays in the button label (`BELL` focus NFR stands). |
| **Compatibility** | Existing clients that ignore the new `seen` flag keep working (additive payload change). |

## 8. Defect Classes and Their Gates

| # | Defect class this spec can produce | Gate that catches it | What would make it FAIL |
|---|---|---|---|
| D1 | Badge counts the wrong things (seen requests counted, read updates counted, wrong after "Mark as read") | Client Jest on `ResultsNotificationsService` + `ShellTopbarComponent` (`--maxWorkers=2`, scoped) | A snapshot with 3 seen + 2 unseen requests and 1 unread update giving a badge ≠ 3 |
| D2 | **Seen state leaks between colleagues** (one user's open/"Mark as read" marks it for others) | Server Jest on the repository/service asserting the user id is part of every read and write | A query built without the calling user's id. **Jest cannot run the SQL against MySQL**, so it proves the query shape, not the rows → substitute: two-account browser check in TEST at the validate HITL pause |
| D3 | Duplicate records / errors on repeated "Mark as read" | Server Jest (insert-ignore semantics) + the same two-account browser check | A second press returning 500 or creating duplicates |
| D4 | "Mark as read" decides or hides requests | Server Jest asserting no write to the request table; client Jest asserting Decide count unchanged | Decide count dropping after "Mark as read" |
| D5 | Fresh/read look wrong (bold/dot missing, Accept/Decline dimmed) | **No automated check.** jsdom cannot evaluate weight or contrast. Jest only proves the class/attribute is present. Substitute: browser check against the mockup at the validate HITL pause | — |
| D6 | Migration drift / no `down` | `npm run migration:check` (server) | An entity column with no migration |
| D7 | Inbox and bell disagree | Client Jest on the inbox "Mark all as read" path + browser check | Inbox button returning early when the filtered view has no unread updates |
| D8 | "Mark as read" slow with many requests | Manual timing in TEST at the HITL pause (3 runs). **If the three runs vary by more than 2×, report the spread, not a number.** | > 1 s server time |

## 9. Requirement ID Index

| ID | Title | Kind |
|---|---|---|
| `BRS-R-1` | Badge counts fresh items only | Modifies `BELL-R-1` |
| `BRS-R-2` | "Seen" is per person | Added |
| `BRS-R-3` | Opening an item marks it seen/read | Added (extends `BELL-R-9`) |
| `BRS-R-4` | "Mark as read" clears the badge | Modifies `BELL-T-10` |
| `BRS-R-5` | Inbox "Mark all as read" means the same | Modified |
| `BRS-R-6` | Tabs carry their own counts | Added |
| `BRS-R-7` | Fresh and read look | Added (visual) |
| `BRS-R-8` | Read items stay listed | Modifies `BELL-R-3` |
| `BRS-R-9` | Count and list stay in step | Restates `BELL-R-4`/`R-11` for the new state |
| `BRS-US-1..4` | User stories | — |
| `D1..D8` | Defect classes and gates | — |

**Open (carried from the proposal):** `OQ-1`, Angel's pending-request count, gets confirmed in the browser during validation. It does not change any requirement.
