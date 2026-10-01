# Requirements — Notifications Inbox: Paginated Load & Pending-First

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `notifications` (server: `api/notification`, `api/results/share-result-request`; client: `results-notifications`) |
| Sub-feature | Phase-scoped, paginated inbox load with pending-first rendering |
| Owner | Santiago Sanchez |
| Status | approved (2026-09-30) |
| Type | Change (performance + load order) |
| Depth | Standard |
| Approval Mode | gated |
| Source | `proposal.md` (approved 2026-09-30) — open questions resolved by the user 2026-09-30 (§10) |
| Ticket(s) | none |
| Related specs | `bugfix/notifications-inbox-slow-load` (previous perf pass; this delivers its deferred option C) · `notifications/inbox-revamp` (unified list, tabs, filters — must keep working) · `notifications/w1w2-center-tagged` (in progress, same files) |

**In one line:** the inbox loads only the selected phase, shows pending-decision rows first, and loads resolved/read history 200 rows at a time per source with "Load more".

## 2. Context

The Notifications page (`docs/ux-ui/design.md` — notifications inbox; `docs/trd/trd.md` W4 Notifications, module *Notification*) merges three feeds: Received requests, Sent requests (`GET /api/results/request/get/received|sent`) and Updates (`GET /api/notification/updates`). Today each feed returns the user's **whole history across all phases** (the client's `version_id` is ignored server-side), and pending-decision rows travel inside the heaviest response, so already-handled rows paint first and pending ones arrive seconds later (proposal §3, RC-1..RC-6).

Refines `docs/prd.md` AC-5 (phase/versioning correctness — the Phase filter must mean something) and AC-8 (notifications usable for acting on share requests).

## 3. Glossary

| Term | Meaning |
|---|---|
| **Source** | One of the three feeds: `received`, `sent`, `updates`. |
| **Pending set** | Rows that are not history: received/sent requests with `request_status_id = 1`, and unread updates (`read = false`), plus announcements. Never paginated. |
| **History set** | Resolved requests (`request_status_id IN (2,3)`) per source, and read updates (`read = true`). Paginated. |
| **Page** | Up to **200** history rows of **one** source, newest first. |
| **Cursor** | Opaque token marking where the next page of a source starts. |
| **Selected phase** | The Phase dropdown value (defaults to the active reporting phase); sent as `version_id`. |
| **Phase-less notification** | An update with no linked result (e.g. bilateral AI-job-finished) — it has no phase. |

## 4. In Scope / Out of Scope

### In scope

- Server honors `version_id` on Received, Sent and Updates.
- Pending set and history set are fetched separately; pending first.
- History paginated per source (200), with cursor and `hasMore`.
- `getAllNotifications` queries run concurrently.
- Client: single initial loading state, pending-first rendering, "Load more", filtered-scope hint.

### Out of scope

- Server-side filters/facets/search (toolbar keeps filtering loaded rows client-side).
- Header bell pop-up endpoints (`updates-pop-up`, received pop-up).
- Infinite/virtual scroll; DB indexes; notification content/types/emails; Settings tab; IPSR notifications.

## 5. Personas Affected

| Persona | What changes |
|---|---|
| Any user (submitter, PMU lead, QA) | Inbox opens faster; requests needing a decision appear first; history beyond 200 behind "Load more"; only the selected phase is shown. |
| Platform admin (`role = 1`) | Largest gain — no longer loads every resolved request in PRMS on open. |

## 6. User Stories

- **PAGE-US-1** — As a user who must accept/decline requests, I want pending requests to show first, so that I can act without waiting for my whole history.
- **PAGE-US-2** — As any user, I want the inbox to load only recent history for the phase I'm looking at, so that it opens fast.
- **PAGE-US-3** — As any user, I want to load older notifications on demand, so that I can still reach them.

## 7. Functional Requirements

### Required (MUST)

#### PAGE-R-1 — Phase scoping

`GET request/get/received`, `GET request/get/sent` and `GET notification/updates` MUST return only rows whose result belongs to the `version_id` sent. When no `version_id` is sent, behavior MUST stay as today (all phases).

- **Scenario: phase honored**
  - GIVEN a user with requests in phases 2025 and 2026
  - WHEN the inbox requests `version_id = <2026>`
  - THEN only 2026 rows are returned, in both the pending and history sets
  - BUT it must NOT return any row whose result `version_id` differs
- **Scenario: no phase**
  - GIVEN no phase resolves (no `version_id` sent)
  - WHEN the inbox loads
  - THEN rows from all phases are returned (paged per PAGE-R-3)
- **Scenario: phase-less updates**
  - GIVEN an unread or read update with no linked result (e.g. bilateral AI job finished)
  - WHEN any `version_id` is selected
  - THEN that update is still returned
  - AND IT MUST appear regardless of the selected phase (it has no phase to filter on)

#### PAGE-R-2 — Pending set is complete and first

The pending set (received/sent pending requests, unread updates, announcements) for the selected phase MUST be returned complete (never truncated) and MUST be requestable separately from history.

- **Scenario: pending arrives first**
  - GIVEN a user with 5 pending received requests and 3 000 resolved ones in the selected phase
  - WHEN the inbox opens
  - THEN the pending-set request is issued before (or concurrently with, never after) any history request
  - AND the list does not render rows until the pending set has arrived
  - BUT it must NOT show resolved rows first and insert pending rows above them afterwards
- **Scenario: pending never paged**
  - GIVEN 350 pending rows in one source
  - WHEN the inbox loads
  - THEN all 350 are shown
  - AND the "Needs your decision" count equals the number of pending received rows in the selected phase

#### PAGE-R-3 — History pagination per source

History MUST be returned in pages of at most **200** rows **per source**, ordered newest first (`requested_date` for requests, `created_date` for updates), each page carrying `hasMore` and a cursor.

- **Scenario: first page**
  - GIVEN 450 resolved received requests in the selected phase
  - WHEN the inbox loads
  - THEN exactly the 200 most recent are returned with `hasMore = true`
- **Scenario: next page, no gaps or duplicates**
  - GIVEN the first page was loaded
  - WHEN the next page is requested with its cursor
  - THEN rows 201–400 are returned
  - AND IT MUST contain no row already returned and skip no row, including rows sharing the same timestamp
- **Scenario: last page**
  - GIVEN 450 resolved rows and 400 already loaded
  - WHEN the next page is requested
  - THEN 50 rows return with `hasMore = false`
- **Scenario: admin bounded**
  - GIVEN an admin (`role = 1`)
  - WHEN the inbox loads
  - THEN at most 200 resolved received + 200 resolved sent + 200 read updates are returned on first load

#### PAGE-R-4 — Load more

The inbox MUST show a "Load more" control at the end of the list while any source has `hasMore = true`; activating it fetches the next page of every source that still has more, and appends the rows.

- **Scenario: append**
  - GIVEN the first pages are loaded and a filter/tab is active
  - WHEN the user clicks "Load more"
  - THEN new rows are appended to the existing list, and current filters, tab, Received/Sent toggle and open drawer are preserved
  - BUT it must NOT reload or reset already-loaded rows
- **Scenario: exhausted**
  - GIVEN every source has `hasMore = false`
  - THEN "Load more" is not shown
- **Scenario: in-flight**
  - GIVEN a "Load more" request is in flight
  - THEN the control shows a busy state and ignores further clicks
- **Scenario: error**
  - GIVEN the next-page request fails
  - THEN already-loaded rows stay, and the control is available to retry

#### PAGE-R-5 — Phase change resets paging

Changing the Phase dropdown MUST discard loaded rows and cursors and reload pending + first history pages for the new phase.

- **Scenario**
  - GIVEN 400 rows loaded for phase A
  - WHEN the user selects phase B
  - THEN only phase B rows are shown (pending + first pages)
  - BUT it must NOT keep phase A rows or cursors

#### PAGE-R-6 — Backwards-compatible responses

Existing response fields (`receivedContributionsPending`, `receivedContributionsDone`, `sentContributionsPending`, `sentContributionsDone`, `notificationsPending`, `notificationsViewed`, `notificationAnnouncement`) and row shapes MUST keep their names and meaning; paging metadata MUST be additive. Callers that send no paging parameters MUST get a bounded first page, not an error.

#### PAGE-R-7 — Concurrent updates queries

The queries composing `GET notification/updates` MUST run concurrently, not one after another.

### Should (SHOULD)

- **PAGE-R-10** When any toolbar filter or search is active and some source has `hasMore = true`, the inbox SHOULD show a hint that filters apply to loaded notifications only, next to "Load more".
- **PAGE-R-11** The list derivation (merge → filters → source → tab → recency groups) SHOULD be recomputed only when its inputs change, not on every change-detection pass.

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | First-load payload per source ≤ 200 history rows + pending set. Page-ready time (pending visible) MUST be measured before and after on the same account/phase (admin and non-admin); the after value MUST be lower than the baseline by more than run-to-run spread. No absolute SLA (none existed). |
| Backwards compatibility | Additive only (PAGE-R-6). Pop-up endpoints unchanged. |
| Security | Same JWT `auth` header gating; cursor MUST NOT allow reading rows outside the user's existing visibility rules (it only narrows the same where-conditions). No tokens in logs (`.cursorrules`). |
| Accessibility | "Load more" is a real button, keyboard reachable, with busy state announced (`aria-busy`); WCAG 2.1 AA (`docs/ux-ui/design.md` a11y). |
| UI kit | New controls use Spartan (team rule). |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| PAGE-AC-1 | Rows in two phases | Received/Sent/Updates called with `version_id` | Only that phase's rows; phase-less updates included (PAGE-R-1) |
| PAGE-AC-2 | No `version_id` | Feeds called | All phases, first page (PAGE-R-1, R-3) |
| PAGE-AC-3 | 450 resolved rows, ties on date | Pages fetched until `hasMore=false` | 200 / 200 / 50, union = all 450, no duplicates (PAGE-R-3) |
| PAGE-AC-4 | 350 pending rows | Inbox loads | All 350 present, count exact (PAGE-R-2) |
| PAGE-AC-5 | Pending + history responses race (history first) | Inbox loads | Nothing rendered until pending arrives; pending never inserted above already-shown rows (PAGE-R-2) |
| PAGE-AC-6 | Filters active, first pages loaded | Load more | Rows appended, filters/tab/toggle kept; hint shown (PAGE-R-4, R-10) |
| PAGE-AC-7 | All sources exhausted | — | No "Load more" (PAGE-R-4) |
| PAGE-AC-8 | Next page fails | Load more | Loaded rows kept, retry possible (PAGE-R-4) |
| PAGE-AC-9 | Rows of phase A loaded | Phase B selected | Only phase B, paging reset (PAGE-R-5) |
| PAGE-AC-10 | Caller without paging params | Feeds called | Existing keys present, bounded first page (PAGE-R-6) |
| PAGE-AC-11 | Updates service | Called | Its queries start concurrently (PAGE-R-7) |

Cross-cutting: AC-3 (authorization), AC-5 (phase correctness), AC-8 (notifications), AC-9 (no secrets in logs).

## 10. Decisions Taken (former open questions)

| ID | Decision (user, 2026-09-30) |
|---|---|
| PAGE-OQ-1 | Page size 200 **per source**. |
| PAGE-OQ-2 | Phase dropdown **scopes on the server**. |
| PAGE-OQ-3 | Pending set is **scoped to the selected phase** too (not all phases). |
| PAGE-OQ-4 | **"Load more"** is included. |
| PAGE-OQ-5 | Phase-less updates (no linked result) always shown — follows from OQ-2 + no phase to filter (assumption; confirm at review). |

## 11. Defect Classes → Gate

| Defect class | Caught by |
|---|---|
| Phase leak (rows of other phases) | Server Jest: where-conditions include `version_id` for every bucket (PAGE-AC-1/2) |
| Cursor gaps/duplicates on equal timestamps | Server Jest on cursor builder with tied dates (PAGE-AC-3) + manual walk of pages on a real admin account |
| Pending truncated / count wrong | Server Jest (no `take` on pending) + client Jest on count (PAGE-AC-4) |
| Pending rendered after history / reshuffle | Client Jest: service with history resolving before pending (PAGE-AC-5) |
| Load more resets state / duplicates rows | Client Jest on append + filters (PAGE-AC-6..9) |
| Response shape break for existing callers | Server Jest on response keys (PAGE-AC-10) |
| Updates queries still sequential | Server Jest with deferred repository mocks asserting all calls start before any resolves (PAGE-AC-11) |
| **No real speed-up** | **No automated check.** Substitute: manual before/after measurement (network panel, 3 runs each, admin + non-admin) at the HITL pause after execution. If spread ≥ gain, result is reported as inconclusive. |
| Load more look/feel, busy state, hint placement | **No automated layout check (jsdom).** Substitute: human visual check at HITL pause. |

## 12. Dependencies & Assumptions

- Upstream: `versioning` (`version_id` on `result`), `auth` (`role_by_user`), TypeORM `find` with `take`/order.
- Downstream: only the `results-notifications` client page consumes these feeds' history; the pop-up uses separate methods (assumption verified in proposal; re-verify in design via callers search).
- Merge risk with `notifications/w1w2-center-tagged` (untracked, same files).

## Cross-references

`docs/prd.md` AC-5, AC-8 · `docs/ux-ui/design.md` notifications inbox · `docs/trd/trd.md` W4, module *Notification*, `share-result-request` · `proposal.md` RC-1..RC-6.
