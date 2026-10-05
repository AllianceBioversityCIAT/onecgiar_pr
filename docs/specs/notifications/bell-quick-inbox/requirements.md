# Bell Quick Inbox — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| Module / Sub-feature | `notifications` / `bell-quick-inbox` |
| Requirement prefix | `BELL` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved (Santiago Sanchez, 2026-10-05) |
| Owner | Santiago Sanchez |
| Ticket(s) | P2-3157 (AC1 bell badge counter, AC5 mark-read decrements the badge). Inline Accept/Decline is a user-requested extension (2026-10-05), not in P2-3157's ACs. |
| Source | `proposal.md` (approved 2026-10-05, Option A) + user answers 2026-10-05 (OQ-1..OQ-4) |
| Depends on | `notifications/inbox-revamp`, `notifications/inbox-paginated-load`, `notifications/primary-decline-rejects-result` |

## 2. Executive Summary

The bell becomes a **quick inbox**. Its badge counts **what is waiting for the user** (pending decisions + unread updates) across all phases. Opening the bell no longer empties it. Pending requests can be **accepted or declined from the popover**. Requests whose decision needs a richer step (ToC mapping, primary decline justification) hand off to the existing inbox drawer/dialog for that exact request.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Bell** | The topbar notifications button + its popover (`shell-topbar`). The legacy `header-panel` is not rendered anywhere (verified 2026-10-05) and is out of scope. |
| **Pending decision** | A received request the user can Accept/Decline today — the same rows the inbox shows under "Needs your decision" (`NOTIF-R-1`). |
| **Unread update** | An informational notification not yet marked read — the inbox's pending Updates set. |
| **Attention count** | Pending decisions + unread updates. |
| **One-click request** | A pending request whose Accept needs no extra step: the ToC mapping travelled with it (`is_map_to_toc`), or a primary request. |
| **Step request** | A pending request whose Accept needs a step the popover does not host: bilateral contributor without carried mapping ("Map to ToC?" prompt, P2-3187) or the legacy modal-first flow. |
| **Hand-off** | Close the popover and open the inbox page with that request's existing drawer/dialog already open. |

## 4. System Context & Scope

### In scope

- Badge count semantics, popover content/order/cap, refresh points.
- Inline Accept (one-click requests) and inline Decline with confirm (non-primary requests).
- Hand-off for step requests and primary declines.
- Mark-read on click for updates (P2-3157 AC5) keeps working and decrements the count.
- The live bell (`shell-topbar`) and the inbox page never disagree on what is pending.

### Out of scope

- New notification types, recipient rules, decision rules, approval chain, ToC mapping rules.
- Sockets / real-time push.
- Inbox page redesign; email.
- Deleting the `notification/updates-pop-up` endpoint or the `users.last_pop_up_viewed` column (left unused by the bell, cleanup is a later decision).

## 5. Personas Affected

| Persona | What changes |
|---|---|
| SP / Center lead or coordinator receiving requests | Sees waiting decisions from any page; decides without navigating for most requests. |
| Center User (P2-3157) | Badge reflects unread approve/reject updates and drops when one is clicked. |
| Any authenticated user | Badge means "waiting for you", not "new since last open". |
| Platform admin | Same rules as their inbox rows (see `BELL-OQ-1`). |

## 6. User Stories

- **BELL-US-1** — As a request recipient, I want the bell to show how many items wait for me, so that I notice pending work without opening the inbox. *(Refines P2-3157 AC1.)*
- **BELL-US-2** — As a request recipient, I want to accept or decline a request from the bell, so that I don't lose my place in the page I'm working on.
- **BELL-US-3** — As a Center User, I want clicking an update to mark it read and lower the count, so that the badge reflects what I still haven't seen. *(P2-3157 AC5.)*

## 7. Functional Requirements

### Required (MUST)

#### BELL-R-1 — Attention count on the badge

The bell badge MUST show the attention count (pending decisions + unread updates) across **all phases**, independent of the inbox page's phase/program/search filters. Counts above 99 MUST render as `99+`. A count of 0 MUST show no badge.

- **Scenario: counts both kinds** — GIVEN 3 pending decisions and 2 unread updates, WHEN any page loads, THEN the badge shows `5`.
- **Scenario: filter independence** — GIVEN the user filtered the inbox page to a phase with 0 pending items while another phase has 4, WHEN they look at the bell, THEN the badge shows `4` — BUT it must NOT change when the inbox filters change.
- **Scenario: overflow** — GIVEN 140 waiting items, THEN the badge shows `99+` AND IT MUST still list items in the popover (capped, `BELL-R-3`).

#### BELL-R-2 — Opening the bell does not consume it

Opening or closing the popover MUST NOT clear the list, reset the badge, or mark anything read.

- **Scenario** — GIVEN a badge of `5`, WHEN the user opens and closes the popover without acting, THEN the badge still shows `5` AND the same 5 items appear on the next open.

#### BELL-R-3 — Popover content and order

The popover MUST list waiting items with **pending decisions first, then unread updates**, newest first within each group, showing at most **10** rows. When more exist, it MUST show how many more and keep "See all the notifications" as the exit to the inbox page.

- **Scenario: order** — GIVEN 2 decisions and 3 updates with mixed dates, THEN both decisions render above all updates, each group newest first.
- **Scenario: cap** — GIVEN 14 waiting items, THEN 10 rows render AND a "+4 more" indication links to the inbox page.

#### BELL-R-4 — Freshness

The bell data MUST load at session start, MUST refresh each time the popover opens, and MUST update after any decision or mark-read made from the bell **or** the inbox page.

- **Scenario: decided in the inbox** — GIVEN a request pending in the bell, WHEN the user accepts it on the inbox page, THEN the bell no longer lists it AND the badge decrements, without a page reload.
- **Scenario: refresh on open** — GIVEN a request arrived after session start, WHEN the user opens the popover, THEN it appears (after the refresh resolves).

#### BELL-R-5 — Inline Accept for one-click requests

A one-click request row MUST offer **Accept** in the popover; one click records the decision with the same server outcome as accepting it in the inbox.

- **Scenario** — GIVEN a pending request with carried ToC mapping, WHEN the user clicks Accept, THEN the request is accepted AND the row leaves the popover AND the badge decrements.
- BUT it must NOT send a second request on a double click (buttons busy/disabled while in flight).
- AND IT MUST offer Accept/Decline only on rows where the inbox row offers them (same eligibility).

#### BELL-R-6 — Accept hand-off for step requests

A step request row MUST offer Accept that **hands off** to the inbox page with that request's existing decision flow open (prompt / mapping step / legacy modal), instead of deciding in the popover.

- **Scenario** — GIVEN a bilateral contributor request without carried mapping, WHEN the user clicks Accept in the bell, THEN the popover closes AND the inbox page opens with that request's "Map to your Theory of Change?" step active.
- BUT it must NOT record any decision before the user completes the step there.

#### BELL-R-7 — Decline

A non-primary request row MUST offer **Decline** with an inline confirmation inside the popover; confirming records the decline. A **primary** request's Decline MUST hand off to the existing justification dialog (`PDR-T-4`) for that request.

- **Scenario: inline confirm** — GIVEN a pending contribution request, WHEN the user clicks Decline, THEN a confirm/cancel prompt appears on that row; WHEN they confirm, THEN the request is declined AND the row leaves AND the badge decrements; WHEN they cancel, nothing is sent.
- **Scenario: primary** — GIVEN a pending primary request, WHEN the user clicks Decline, THEN the inbox page opens with the justification dialog for that request — BUT it must NOT decline without a justification.

#### BELL-R-8 — Decision failure

If a decision from the popover fails, the row MUST stay, show an error message, re-enable its buttons, and the badge MUST NOT change.

- **Scenario** — GIVEN the decision request returns 4xx/5xx, THEN the row remains with a visible error AND the count is unchanged.

#### BELL-R-9 — Clicking an update marks it read (P2-3157 AC5)

Clicking an unread update MUST keep its current deep-link navigation, mark it read, remove it from the bell and decrement the badge.

- **Scenario** — GIVEN an unread "approved by the Science Program" update, WHEN the user clicks it, THEN they land on its existing destination AND the badge drops by 1.
- BUT clicking a pending decision row's body (not its buttons) MUST NOT decide it; it navigates like today.

#### BELL-R-10 — Empty state

The "no notifications" empty state MUST appear only when the attention count is 0.

#### BELL-R-11 — Bell and inbox agree

For the same phase scope, a row the inbox lists as pending (decision or unread update) MUST appear in the bell's count, and a row decided/read anywhere MUST leave both. *(Amended 2026-10-05 in design: was "both bells agree"; `header-panel` is dead code — not rendered — so the parity that matters is bell ↔ inbox.)*

#### BELL-R-12 — Retire "new since last open" (REMOVED behavior)

The bell MUST NOT filter, hide, or count items by when the bell was last opened. *Before:* items older than the last bell open disappeared. *After:* an item stays until it is decided or read. The `last-pop-up-viewed` PATCH is no longer called by the bell.

### Should (SHOULD)

- **BELL-R-13** — While the first load is in flight and no data is cached, the popover SHOULD show a loading state, not the empty state.
- **BELL-R-14** — If the bell data fails to load, the popover SHOULD show an error line with a link to the inbox page, and the badge SHOULD keep its last known value.

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Opening the popover MUST NOT block on the network: render cached rows immediately, refresh in background. No extra request per row. |
| **Backwards compatibility** | Inbox page decisions, drawer flows, and the existing deep links (`notification-navigation.service`) MUST behave exactly as today. |
| **Security** | No new data exposure: the bell shows only rows the existing pending endpoints already return to this user. |
| **Accessibility** | Badge exposes the count to assistive tech (button label includes it); Accept/Decline/confirm are keyboard operable; focus stays in the popover after an inline decision. WCAG 2.1 AA (`docs/ux-ui/design.md` §10). |
| **Internationalization** | New strings go through the existing notifications copy/i18n mechanism used by `notification-item`. |
| **UI library** | Visual elements built with Spartan components (team rule). |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BELL-AC-1` | 3 pending decisions + 2 unread updates in two phases | any page loads | badge `5` (`BELL-R-1`) |
| `BELL-AC-2` | badge `5` | open + close popover | badge `5`, same rows on reopen (`BELL-R-2`) |
| `BELL-AC-3` | one-click request | Accept in popover | accepted, row gone, badge −1 (`BELL-R-5`) |
| `BELL-AC-4` | bilateral step request | Accept in popover | inbox opens on that request's ToC step; nothing recorded yet (`BELL-R-6`) |
| `BELL-AC-5` | contribution request | Decline → confirm | declined, row gone, badge −1 (`BELL-R-7`) |
| `BELL-AC-6` | primary request | Decline | justification dialog for that request opens (`BELL-R-7`) |
| `BELL-AC-7` | decision PATCH fails | Accept/confirm Decline | row stays with error, badge unchanged (`BELL-R-8`) |
| `BELL-AC-8` | unread update | click it | navigates as today, badge −1 (`BELL-R-9`, P2-3157 AC5) |
| `BELL-AC-9` | request accepted on inbox page | — | bell drops it, badge −1, no reload (`BELL-R-4`) |

## 10. Defect Classes & Verification Coverage

| Defect class | Caught by |
|---|---|
| Wrong count (double-counting a row in two sets, phase-filtered count, admin inflation) | Jest unit tests on the bell selector with fixtures from both sources + phase variations |
| Badge/list reset on open/close (regression to old behavior) | Jest component test: open → close → assert count and rows |
| Wrong branch routing (step request decided inline; primary decline without justification) | Jest table-driven test over the 4 request kinds → inline vs hand-off, asserting no PATCH on hand-off |
| Double submit / stuck busy state | Jest test: two clicks → one PATCH; error → buttons re-enabled |
| Bell and inbox drifting apart after a decision | Jest service test: decision via shared path updates both bell selector and inbox pending set |
| Hand-off lands on the wrong request or no drawer opens | Jest routing assertion (query params) + **manual check at HITL pause** in the running app — drawer opening after navigation is not provable in jsdom |
| Visual: badge position/overflow, row layout in a 400px popover, dark mode | **No automated check.** Substitute: manual visual check at the `/akili-validate` HITL pause (T6 visual review if available) |
| Existing inbox decision flows regress | Existing `notification-item` / `contribution-request-drawer` specs (scoped run) |

## 11. Dependencies & Assumptions

- **Upstream:** pending endpoints used by the inbox (`request/get/received` scope `pending`, `notification/updates` scope `pending`) return all phases when no `versionId` is sent — **to verify in design**.
- **Upstream:** decision PATCH (`results/request/update`) unchanged.
- **Assumption:** unread updates = the inbox's pending Updates set.
- **Downstream:** `notifications/inbox-revamp` `NOTIF-DD-5` (bell left unchanged) is superseded by this spec.

## 12. Open Questions

| ID | Question | Default if unanswered |
|---|---|---|
| `BELL-OQ-1` | Admins see every pending request in the inbox — should all count in their badge? | Same as inbox rows (no special case); revisit if the number is unusable. |

## 13. Requirement ID Index

`BELL-R-1` count · `R-2` no consume on open · `R-3` order/cap · `R-4` freshness · `R-5` inline accept · `R-6` accept hand-off · `R-7` decline · `R-8` failure · `R-9` mark read on click · `R-10` empty state · `R-11` bell ↔ inbox parity · `R-12` retire last-viewed · `R-13` loading · `R-14` load error.
