# Proposal — notifications/bell-read-state

> **In one line:** make the bell behave like an e-mail inbox. Unread items are bold and counted.
> Clicking one or pressing "Mark as read" makes it visibly read and lowers the badge, down to 0.
> Pending decisions stay reachable in the **Decide** tab, but stop holding the badge at `99+`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `notifications/bell-read-state` |
| Type | Change. Angel reported "Mark as read does nothing", but the code does what `BELL-R-1` specifies (diagnosis in §3.1). |
| Approval Mode | gated |
| Status | **Approved** by Santiago Sanchez, 2026-10-06 (Option A with a per-user, per-request "seen" table). |
| Source | Voice feedback from Angel (product), 2026-10-06, transcribed into this proposal. **No Jira ticket** (confirmed 2026-10-06). |
| Builds on | `archive/2026-10-06-notifications--bell-quick-inbox` (`BELL-R-1`, `BELL-R-9`, `BELL-T-10`, `BELL-OQ-1`) |
| Depends on | `quick/topbar-labelled-actions`, committed and pushed as `9824c44b5` (2026-10-06). |
| Parallel-safe | no. It touches `shell-topbar`, `pop-up-notification-item`, `results-notifications.service` and `api/notification`. |
| Date / Owner | 2026-10-06 · Santiago Sanchez |

## 2. Intent

Angel liked the redesign: the count in the bell, the popover, the drawer, and "processing finished" taking him to My Drafts. He asked for two things:

1. **Outlook-style read state.** Unread rows look bold. A row you clicked turns lighter, the way a read e-mail does.
2. **"Mark all as read" must visibly work.** He pressed it, "and nothing happened". If the badge says `99+` and you mark everything read, it should drop to `0`.

## 3. Problem / Current Behavior

| What Angel expects | What the bell does today | Why |
|---|---|---|
| Read rows stay listed and look lighter | Read updates **disappear** from the bell | The bell fetches only `scope=pending` (`refreshBell()`). Read updates are never loaded, so there is no "read look" to show. |
| Unread rows are bold | Every row has the same weight (`font-medium`) | There is no read/unread styling in `pop-up-notification-item`. |
| "Mark as read" → badge `0` | The badge stays at `99+` | The badge counts **pending decisions + unread updates** (`BELL-R-1`). "Mark as read" only clears updates (`BELL-T-10`: "decisions untouched"). |
| Pressing "Mark as read" changes the list | The visible rows do not change | Decisions are listed first and the list is capped at 10 rows (`BELL-R-3`). With ≥ 10 pending decisions, the updates that were marked read were never on screen. |

### 3.1 Why "nothing happened" (confirmed in code; Angel's numbers still to check)

- `PATCH notification/read-all` works. It marks every row with `target_user = user, read = false` read (`notification.service.ts:667`). Every source the bell reads for updates is filtered on `target_user`, so unread updates do go to 0.
- What remains is the **decisions**. `bellCount = bellReceived().length + bellUpdates().length` (`results-notifications.service.ts:181`). For an admin, `bellReceived` is every pending request on the platform (`BELL-OQ-1`: "same as inbox rows… revisit if the number is unusable"). That is how the badge reaches `99+` and stays there.
- **Angel's profile (confirmed 2026-10-06):** Guest at the application level, with roles in several Science Programs and several Centers. He is not an admin, so `BELL-OQ-1` is not the cause. His pending decisions are the requests addressed to all of those SPs and Centers together, which is enough to fill the 10 visible rows and push the badge past 99.
- On screen, the only things that change are the "N new" chip and the "Mark as read" button, and both disappear. The 10 visible rows (all decisions) and the badge stay the same, which reads as "nothing happened".
- **Still to verify in the browser (`OQ-1`):** open Angel's inbox (or impersonate his profile in TEST) and confirm that his pending decisions are ≥ 10. The mechanism is confirmed in code. Only his numbers are pending.

The code is not broken. The product meaning of the badge ("waiting for you") does not match how users read it ("unread"). Angel's feedback is the "revisit" that `BELL-OQ-1` anticipated.

## 4. Proposed Outcome

- **Badge = unread.** It counts unread updates plus decisions the user has **not seen yet**. Opening the bell is not "seeing" (`BELL-R-2` stands). Only "Mark as read", or opening a specific decision, marks a decision as seen.
- **"Seen" is per person.** A contribution request is one shared row that every member of the receiving SP or Center can decide on. Juan David, Santiago and Angel having seen it must not make it read for Juan Carlos. Updates already have one row per recipient (`notification.target_user`), so their existing `read` flag is per person.
- **Rows show read state.** Unread rows are bold and carry an unread dot. Read rows are lighter. Clicking a row marks it read in place.
- **The bell also shows recent read updates**, dimmed, below the unread rows, so a clicked row does not vanish.
- **"Mark as read" visibly works.** Every row turns read-style, the badge goes to `0`, and the chip and button disappear.
- **Decisions still need a decision.** A seen decision stays listed in the **Decide** tab with its "Requires decision" chip and Accept/Decline. It just stops counting on the badge. A small "N to decide" count on the tab keeps the work visible.

## 5. Scope

- Bell popover (`shell-topbar`): badge source, tab counts, "Mark as read" behavior and feedback.
- Bell rows (`pop-up-notification-item`): unread vs. read styling, unread dot, mark-read on click (already exists for updates, `BELL-R-9`).
- `ResultsNotificationsService`: the bell snapshot also loads the first history page of updates (read, dimmed). Unread count and seen-decision count are tracked separately.
- Server: a new **seen table**, one row per (request, user), written when a user opens one request or presses "Mark as read". The received-requests payload flags each pending request `seen` for the calling user. Needs one migration.
- Inbox page "Mark all as read" (`results-notifications.component.html:277`): same meaning as the bell's, so the two never disagree (`BELL-R-11`).

## 6. Non-Goals

- Changing who receives which notification, or the admin's visibility of all requests. That is a separate `BELL-OQ-1` decision (see `OQ-2`).
- Marking a decision as decided without deciding it. "Seen" never accepts or declines anything.
- E-mail notifications, notification settings, real-time push.
- The inbox page's own row redesign. It only adopts the shared "seen" meaning.
- Dark mode (not supported).

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Every user of the bell | The badge drops to 0 after "Mark as read". Read rows remain visible and dimmed. |
| Admins / PMU (`BELL-OQ-1`) | The biggest change. Their badge stops sitting at `99+`. |
| Center Users (P2-3157) | AC5 still holds: clicking an update lowers the badge. |
| `notifications/bell-quick-inbox` (archived) | Amends `BELL-R-1` (count meaning), `BELL-R-3` (list also shows read updates) and `BELL-T-10` ("Mark as read" also marks decisions as seen). |
| `notifications/inbox-revamp`, `inbox-paginated-load` | Reuses `scope=history`. Inbox "Mark all as read" aligns with the bell. |
| Server schema | One new table: who saw which pending request, and when. No change to `users` or `share_result_request`. **Do not reuse `users.last_pop_up_viewed`:** it is `ON UPDATE CURRENT_TIMESTAMP(6)` (migration `1725650935514`), so any write to the user row (for example `updateLastLogin`) would silently move it. A single timestamp also cannot express "saw #9821 but not the older #9790". |

## 8. Visual Reference

- Source: Self-contained HTML mockup (interactive), approved to generate on 2026-10-06.
- Location: `docs/specs/notifications/bell-read-state/mockup/bell-read-state.html`
- Notes: covers the popover only: unread rows bold with a dot, read rows light and kept in place under "Earlier", "N to decide" on the Decide tab, the badge going to `0` after "Mark as read", Accept/Decline removing a request, and a new request or update arriving after "Mark as read". Existing tokens: `--pr-text-heading` (unread), `--pr-text-secondary` / `--pr-text-subtle` (read), `--pr-color-primary-300` (dot). No new token expected.

## 9. Requirement Delta Preview

### ADDED
- A row has a visible **unread / read** state (weight + dot). Clicking an unread row marks it read **in place**.
- The bell lists the most recent **read updates** (first history page), dimmed, after the unread ones.
- A per-user, per-request **seen record**. A pending request with no record for the calling user is "unseen" (bold, counted on the badge). Opening that request creates its record. "Mark as read" creates records for every request pending for that user at that moment.
- The Decide tab shows how many decisions are waiting, separately from the badge.

### MODIFIED
- `BELL-R-1`: the badge counts **unread updates + unseen decisions**, not "everything waiting". Still all phases, `99+`, hidden at 0.
- `BELL-T-10` "Mark as read": marks all updates read **and** records every pending request as seen by this user. Afterwards the badge is `0` and every row is in read style.
- Inbox "Mark all as read": same two effects, so bell and inbox agree (`BELL-R-11`).

### REMOVED
- None. Decisions stay listed and actionable. Only their weight on the badge changes.

## 10. Approach Options

| | Option | How | Pros | Cons |
|---|---|---|---|---|
| **A** | **Server seen table + read rows in the bell** | New table of (request, user, seen date), unique per pair (migration). Opening a request writes its row. `read-all` also writes rows for every request pending for the user. The received-requests payload flags each request `seen` for the caller. The client counts unseen requests plus unread updates. The bell also loads `scope=history` page 1 for dimmed read rows. | Same answer on every device. Bell and inbox agree. Fits Angel's mental model exactly. | Backend + migration. More moving parts in one spec. |
| B | Client-only marker | Same UX, but the "seen" timestamp lives in `localStorage`. | No backend, faster. | Per browser: a new laptop shows `99+` again. Bell and inbox can disagree. Breaks `BELL-R-11` across devices. |
| C | Keep "waiting" meaning, explain it better | Relabel the button "Mark updates as read". Show "N to decide" separately. Optionally exclude admin-wide requests from the badge (`BELL-OQ-1`). | Smallest change. No new state. | Does not give Angel the "goes to 0" behavior. Read rows still vanish, so there is no Outlook feel. |

## 11. Recommended Approach

**Option A.** This is the smallest change that delivers both of Angel's asks and keeps the bell and the inbox consistent on every device. It reuses what exists: `read-all`, `scope=history`, mark-read-on-click (`BELL-R-9`), the tabs and the count. The new pieces are one small table, the writes that fill it (open one request / `read-all`), a `seen` flag on the received-requests payload, and the read/unread styling.

A per-user timestamp was considered and dropped: it handles "Mark as read" but cannot mark one request seen without also marking every older one.

Suggested slicing for `/akili-specify` (one spec, ordered tasks):
1. Server: migration for the seen table + "mark one request seen" endpoint + `read-all` records pending requests + `seen` flag on the received payload (+ tests).
2. Client service: unread/unseen counts and the history page in the bell snapshot (+ tests).
3. Row styling: unread bold + dot, read dimmed, mark read in place (+ tests).
4. Popover: Decide tab count, "Mark as read" visible outcome. Inbox button aligned.

If the backend must wait, **B** can ship first behind the same UI and be swapped for A later. The trade-off is that "seen" is per browser.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| `OQ-1` | **Partly answered.** Angel is Guest with roles in several SPs and Centers, not an admin. Still to confirm: his pending decisions are ≥ 10 (browser check). |
| `OQ-2` | **Admins (`BELL-OQ-1`).** Should an admin's Decide tab still list every pending request on the platform? Not the cause of Angel's case and out of scope here, but still open for admins. |
| `OQ-3` | **Answered (2026-10-06): decisions count on the badge AND in the Decide tab.** An unseen request counts on the badge. The Decide tab counts every request still waiting, seen or not. "Seen" is per person (seen table). |
| `OQ-4` | **Answered: no Jira ticket.** Traceability goes through `[SPEC:notifications/bell-read-state]`. Angel will tell Nicoleta about the notification adjustments. |
| Risk | **Contradicts an approved, archived requirement (`BELL-R-1`).** The amendment must be explicit in the new spec, not silent. |
| Risk | Read rows add one more request per bell refresh (`scope=history`, page 1). It is keyset-paged and already used by the inbox. Measure it, but low risk. |
| Risk | New table → `migration:check:ci`. Jenkins applies migrations on deploy (server `CLAUDE.md` §5), so no defensive code for a missing table. Growth is a few rows per request (one per member who saw it). Old rows can stay; they only matter while the request is pending. |
| Risk | "Mark as read" writes one row per pending request, which can be 100+. Use one bulk insert that ignores pairs already recorded. |
| Dependency | `quick/topbar-labelled-actions` is committed (`9824c44b5`). |

## 13. Success Criteria

- With 140 pending decisions and 5 unread updates, after "Mark as read" the badge shows **no badge (0)**, every listed row is in read style, and the Decide tab still lists the 140 with Accept/Decline.
- Clicking an unread update navigates as today (`BELL-R-9`). Back in the bell, that row is still listed, dimmed, and the badge dropped by 1.
- A new decision arriving after "Mark as read" shows bold and makes the badge `1`.
- Three members of an SP saw request #9821 and a fourth did not: the request is light for the three and bold (counted) for the fourth.
- The same user on another browser sees the same badge (Option A).
- The bell and the inbox show the same unread / seen state after either "Mark all as read".

## 14. Next Step

Approved 2026-10-06. `OQ-1` (Angel's numbers) is confirmed during specify. Next:

```text
/akili-specify notifications/bell-read-state
```
