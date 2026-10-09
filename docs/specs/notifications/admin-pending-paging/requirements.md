# Requirements — Notifications: Bounded Pending Load (admin-scale)

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `notifications` (server: `api/notification`, `api/results/share-result-request`, `migrations`; client: `results-notifications`, `shell-topbar` bell) |
| Sub-feature | Server-side counts for the bell, bounded bell rows, paged pending set in the inbox, composite index |
| Owner | Santiago Sanchez |
| Status | approved (2026-10-07) |
| Type | Change (performance) |
| Depth | Full (API contract change + migration on a 466k-row table) |
| Approval Mode | gated |
| Source | `proposal.md` (approved 2026-10-07, Option A) |
| Ticket(s) | none |
| Related specs | `archive/2026-10-01-notifications--inbox-paginated-load` (`PAGE-*`, **modified**: `PAGE-R-2`, `PAGE-AC-4`) · `archive/2026-10-06-notifications--bell-quick-inbox` (`BELL-*`) · bell read-state spec (`BRS-*`: badge = fresh only, Decide count, "Earlier" group, Mark as read) · `bugfix/notifications-inbox-slow-load` (its deferred Option B is superseded) |

**In one line:** the bell gets its counts from the server and downloads only the rows it shows, and the inbox loads the pending set one page at a time. Load time no longer grows with the number of unread items.

## 2. Context

Measured on prdb (2026-10-07, proposal §3): app admins hold **4,025–6,514 unread notifications** each, and `notifications` has 466,090 rows with no composite index. The bell (in the shell, on every page) and the inbox both download the **whole** pending set: unread updates plus pending received requests, with relations. The bell also re-downloads it after every mark-read or decision. A non-admin has tens of pending items, so only heavy recipients feel it.

Refines `docs/prd.md` AC-8 (notifications usable for acting on requests). Touches `docs/trd/trd.md` W4 Notifications.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Pending request** | A received share request with `request_status_id = 1` that the user may decide. Same inclusion rules as today's `received?scope=pending` (admin: unscoped). |
| **Unseen request** | A pending request with no `share_result_request_seen` row for this user (`seen !== true` today). |
| **Unread update** | A notification with `read = false` that the inbox's pending Updates set includes today: result-scoped, Center-notice and bilateral-AI-job paths. |
| **Attention counts** | `{ unseenRequests, pendingRequests, unreadUpdates }`, all phases. Badge = `unseenRequests + unreadUpdates` (`BRS`). |
| **Pending page** | Up to **P** rows of one pending source, newest first. P is fixed in design. |
| **Legacy call** | A pending request sent without `limit`. Its response stays complete, exactly as today. |

## 3A. Defect classes and the gate that catches each

| Defect class | Caught by | Disqualifier |
|---|---|---|
| Server counts disagree with today's full-list derivation (an inclusion path is missed, e.g. Center notices or AI-job rows) | Server Jest: count vs. length of today's pending queries over the same fixture, one fixture per path | A fixture that exercises only one path cannot prove the others |
| Paging duplicates or drops a row, including when a row leaves pending between pages | Server Jest over the keyset util + service, with a mid-paging mark-read | A test whose fixture fits in one page proves nothing |
| Bell renders differently for ordinary users (≤10 per group) | Client Jest: bell items, tabs and counts equal before/after for the same data | — |
| Legacy (no-`limit`) callers break | Server Jest: response without `limit` deep-equals today's | — |
| Index not used by the paged query | **No automated gate** (needs prdb). Substitute: the user runs `EXPLAIN` in DBeaver at the HITL pause | Reading `EXPLAIN` on a local DB with few rows is not evidence: the optimizer may pick a scan anyway |
| Still feels slow for an admin | **No automated gate.** Substitute: the user checks the Network timings and perceived speed as an admin at the HITL pause | — |

## 4. In Scope / Out of Scope

### In scope

- `PPG-R-1..R-5`, `R-9` (Must); `PPG-R-6..R-8` (Should).

### Out of scope

- Who receives notifications (proposal §12 open product question).
- Server-side filtering/faceting of the inbox.
- Virtual scrolling. Sent-request paging. History paging (already done by `PAGE-*`).

## 5. Personas Affected

| Persona | What changes for them |
|---|---|
| Platform admin | Bell and inbox load in bounded time. The inbox shows "Load more" in the pending block. |
| PMU / leads with many unread | Same benefit. |
| Result submitter (few unread) | No visible change (parity, `PPG-R-2`, `PPG-R-5`). |

## 5A. User Stories

- **`PPG-US-1`** — As a platform admin, I want the bell to open instantly, so that the shell is usable on every page. *(Refines BELL-US-1.)*
- **`PPG-US-2`** — As a platform admin, I want the inbox to show my newest pending items first without waiting for thousands of rows, so that I can act on what is recent.

## 6. Functional Requirements

### PPG-R-1 — Attention counts come from the server (Must)

The server SHALL return the attention counts `{ unseenRequests, pendingRequests, unreadUpdates }` for the calling user, across all phases, without returning the rows. Each count MUST equal the length of the corresponding list that today's pending queries return for the same user and data.

- **Scenario: parity with today** — GIVEN a user whose data today yields 3 unseen + 2 seen pending requests and 4 unread updates (1 result-scoped, 1 Center notice, 2 bilateral-AI-job), WHEN the counts are requested, THEN the response is `{ unseenRequests: 3, pendingRequests: 5, unreadUpdates: 4 }`.
- **Scenario: admin scale** — GIVEN an admin with 6,514 unread updates, WHEN the counts are requested, THEN `unreadUpdates = 6514` AND IT MUST NOT load the notification rows or their relations.
- **Scenario: other users' data** — BUT it must NOT count another user's notifications or another user's `seen` rows.

### PPG-R-2 — The bell downloads only what it shows (Must)

The bell SHALL take its badge, the Decide count and the "N more" figure from `PPG-R-1`. It SHALL fetch at most **10** rows for each popover group: unseen requests, seen requests, unread updates (read updates are already 10, `BRS`). Order, grouping, tabs and actions stay as defined by `BELL-*`/`BRS-*`.

- **Scenario: parity for ordinary users** — GIVEN a user with ≤10 rows in every group, WHEN the bell loads, THEN the popover rows, their order, the tab contents, the badge and the Decide count are identical to today.
- **Scenario: admin** — GIVEN an admin with 6,514 unread updates and 1,150 pending requests, WHEN any page loads, THEN the bell requests ≤10 rows per group plus the counts, AND the badge shows `99+`, AND "N more" uses the server counts.
- BUT the bell must NOT request any pending list without a `limit`.

### PPG-R-3 — Bell refreshes stay bounded (Must)

Every bell refresh (page load, mark one read, mark all read, accept/decline from the bell or the inbox) SHALL re-read the counts and the bounded rows of `PPG-R-2`, never a full pending set.

- **Scenario** — GIVEN an admin with 6,000 unread, WHEN they mark one update read, THEN the badge decrements by 1 from server truth AND no response carries more than 10 rows per group.

### PPG-R-4 — Pending updates can be paged (Must)

`GET notification/updates?scope=pending` SHALL accept `limit` (integer 1..200, the existing `parseLimit` range) and `cursor`. With `limit`, it SHALL return at most `limit` pending update rows, newest first by `(created_date, notification_id)`, merged across the result-scoped, Center-notice and AI-job paths, plus `pendingMeta { hasMore, nextCursor, total }`. Without `limit` (legacy call), the response SHALL be identical to today's.

- **Scenario: pages cover everything once** — GIVEN 130 pending updates and `limit=50`, WHEN the client follows `nextCursor` to the end, THEN it receives 50 + 50 + 30 rows, every row exactly once, newest first, AND `total = 130` on every page.
- **Scenario: row leaves pending mid-paging** — GIVEN page 1 was read, WHEN a page-1 row is marked read before page 2 is requested, THEN page 2 neither repeats nor skips any row still pending.
- **Scenario: phase filter** — GIVEN `version_id=8`, THEN only pending updates of phase 8 plus phase-less AI-job rows are returned (same rule as `PAGE-R-1`).
- AND IT MUST reject a malformed `cursor` or out-of-range `limit` with 400 (same rule as `PAGE-*`).
- BUT a legacy call must NOT change shape or content.

### PPG-R-5 — Inbox loads pending updates page by page (Must) — modifies `PAGE-R-2`

The inbox SHALL request the first pending-updates page (P rows) and show a "Load more" control at the end of the pending block while `hasMore`. The pending set SHALL still be requested first and rendered above history (`PAGE-R-2` ordering is kept); only "never paginated" changes.

- **Scenario: admin first paint** — GIVEN an admin with 6,000 pending updates in the phase, WHEN the inbox opens, THEN P pending rows render AND a "Load more" control shows AND the history request still follows the `PAGE-*` rules.
- **Scenario: load more** — WHEN the user activates "Load more", THEN the next P rows append below the loaded ones, with no duplicates, AND the control disappears when `hasMore` is false.
- **Scenario: ordinary user** — GIVEN ≤P pending updates, THEN the inbox looks exactly as today (no control).
- **Scenario: error** — GIVEN a "Load more" request fails, THEN the loaded rows stay AND the control offers a retry (same pattern as history "Load more").
- **Scenario: phase change** — WHEN the phase changes, THEN loaded pending pages and cursors are discarded (`PAGE-R-5`).

**Before/after for `PAGE-AC-4`:** before, "350 pending rows → all 350 present". After, "350 pending rows → the first P are present, the total shows 350, and the rest arrive via Load more".

### PPG-R-6 — Admin received pending is paged too (Should)

`GET results/request/get/received?scope=pending` SHALL accept `limit`/`cursor` with the same contract as `PPG-R-4` (newest first by `(requested_date, share_result_request_id)`), and the inbox SHALL page it as in `PPG-R-5`. Without `limit`, the response stays as today.

- **Scenario** — GIVEN an admin with 418 pending requests in phase 8, WHEN the inbox opens, THEN P received-pending rows render with "Load more".
- AND IT MUST keep the `seen` tag on each returned row (`BRS`).

### PPG-R-7 — Tab counts stay exact (Should)

While any pending source has `hasMore`, the inbox's All / Needs decision / Info counts SHALL use server totals for the unloaded part, so a count never shows only the loaded rows.

- **Scenario** — GIVEN 6,000 pending updates with 50 loaded and no filters, THEN "All" counts all 6,000 pending updates (plus the other loaded sources), not 50.
- BUT when a client filter is active, counts reflect loaded rows only and `PPG-R-8` applies.

### PPG-R-8 — Partial-filter notice (Should)

When a client-side filter (search, program, center, project, type, funding, result type) is active and any pending source has `hasMore`, the inbox SHALL show a one-line notice: results cover only the loaded rows, and "Load more" fetches the rest. The copy goes through `internationalization/`.

- **Scenario** — GIVEN 50 of 6,000 loaded and a search term, THEN the notice shows. WHEN the filter is cleared or `hasMore` becomes false, THEN it hides.

### PPG-R-9 — Composite index (Must)

A migration SHALL add the index `notifications(target_user, read, created_date, notification_id)` with a working `down`. It MUST build without blocking writes on MySQL 8 (online DDL).

- **Scenario** — GIVEN the migration ran, WHEN the user runs `EXPLAIN` on the paged pending query for an admin, THEN the plan uses the new index and shows no filesort over that user's rows. *(HITL check, §3A.)*
- AND IT MUST pass `npm run migration:check`.

## 7. Non-Functional Requirements

| ID | Attribute | Requirement |
|---|---|---|
| PPG-NFR-1 | Payload bound | Bell: ≤10 rows per group + counts, independent of unread volume. Inbox first load: ≤P pending rows per paged source. |
| PPG-NFR-2 | Query plan | Paged pending-updates query and `unreadUpdates` count use the composite index (`PPG-R-9`). |
| PPG-NFR-3 | Compatibility | Legacy calls (no `limit`) return today's shape and content. |
| PPG-NFR-4 | Parity | Users with ≤10 per bell group and ≤P pending per source see no UI difference. |
| PPG-NFR-5 | Security | Counts and pages are scoped to the caller's own rows (`target_user`, own `seen`). Cursor is opaque and never logged (`.cursorrules`). |

## 8. Requirement ID Index

| ID | Priority | Modifies |
|---|---|---|
| PPG-R-1 Attention counts from server | Must | `BELL-R-1` data source |
| PPG-R-2 Bell downloads only what it shows | Must | `BELL-R-3` data source |
| PPG-R-3 Bell refreshes stay bounded | Must | — |
| PPG-R-4 Pending updates pageable | Must | — |
| PPG-R-5 Inbox pages pending updates | Must | `PAGE-R-2`, `PAGE-AC-4` |
| PPG-R-6 Admin received pending paged | Should | `PAGE-R-2` |
| PPG-R-7 Tab counts exact | Should | — |
| PPG-R-8 Partial-filter notice | Should | — |
| PPG-R-9 Composite index | Must | — |
| PPG-NFR-1..5 | — | — |
