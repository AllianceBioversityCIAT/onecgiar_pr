# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `notifications` (client-side, `results-notifications`)
- **Sub-feature:** `notifications-revamp` — visual redesign of the **Requests** tab (Received/Sent) and the header bell
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Ticket(s):** none yet
- **Depth:** Standard (visual/interaction rebuild over existing data; no DB/API change)

---

## 2. Context

The Requests tab (`results-notifications/pages/requests/`) pre-dates the 2026 brand redesign (DD-12, `docs/ux-ui/design.md`). It works — pending/done split, Accept/Decline, the full ToC-mapping flow (P2-3187) — but its visual language (plain text-link tabs, flat unstyled lists, always-visible filter row) doesn't match the approved mockup or the project's current Tailwind/Spartan brand line.

This spec makes the Requests tab **look and group like the mockup** (`docs/specs/changes/notifications-revamp/mockups/`) while reusing 100% of the existing data and business logic: `results-notifications.service.ts` (`get_section_information`, `get_sent_notifications`), `notification-item.component.ts` (accept/decline, ToC mapping dialogs), and the filter pipes. The header bell (`shell-topbar.component.html`) gets a smaller alignment pass against the same mockup.

Relates to: `docs/prd.md` G1/G2 (indirectly — faster, clearer decisions on contribution requests), `docs/ux-ui/design.md` §6 (Layout Patterns → Listing screens), §7 (Design Tokens), §12 DD-12 (2026 brand line). Visual reference: `docs/specs/changes/notifications-revamp/mockups/README.md`.

**Explicitly out of scope (confirmed with the user 2026-09-25):** the **Updates** tab and the **Settings** tab (siblings of Requests under the same `results-notifications` shell) are untouched — not covered by the mockup, left exactly as they are today, to be revamped in a later chunk.

---

## 3. In Scope / Out of Scope

### In scope

- `results-notifications.component.html` — the shared filter row above Received/Sent (Phase, Program/Entity, Search, Clear filters) **only while the Requests tab is active**: restyle as a Filter-button-triggered panel + chips, per the mockup, without removing the Phase filter (mockup has no phase concept but this app is phase-scoped — Phase stays, folded into the same panel).
- `requests.component.html` — Received/Sent header: plain `<a>` links → segmented control.
- `received-requests.component.html` / `sent-requests.component.html` — regroup from "Pending / Done" sections into **Today / This week / Earlier** time buckets (derived from `requested_date`, already present).
- `notification-item.component.html` — restyle the row shell (avatar/icon, mono result code, single-line text, action area) to the mockup's compact row look; **add** a decision-state chip (Accepted/Declined) as an alternative rendering of the existing `request_status_id` 2/3 branches. **All existing logic, dialogs (reject-confirm, ToC prompt, ToC mapping step) and PATCH calls are reused unchanged** — this is a template/CSS change on top of existing `@switch (notification?.request_status_id)` branches, not a logic rewrite.
- New Center / Bilateral-project filter facets (data already present on bilateral rows) added alongside the existing Program/Entity facet, inside the same filter panel.
- `shell-topbar.component.html` bell/badge — verify and align hover/tooltip/badge visuals against the mockup; not a rebuild.

### Out of scope

- `pages/updates/` and `pages/settings/` (siblings under `results-notifications/`) — untouched.
- Any change to `results-notifications.service.ts` method signatures, the accept/decline PATCH contract, ToC mapping payloads, or `onecgiar-pr-server/src/api/notification/*`.
- Sockets/Pusher, email microservice, `user-notification-settings` business rules.
- Dark mode (client is light-only).
- Sidebar/nav chrome.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees a clearer, grouped Requests inbox (Today/This week/Earlier), a segmented Received/Sent switch, and a filter panel instead of always-visible dropdowns. Accept/Decline and the ToC-mapping flow behave identically. |
| QA reviewer | No functional change; may notice the same visual refresh if they also use the Requests tab. |
| PMU lead | No change (does not typically use this tab). |
| Platform admin | No change. |
| Bilateral consumer (downstream) | No change — no payload touched. |

---

## 5. User Stories

- **`NOTIF-US-1`** — As a result submitter, I want the Received/Sent requests grouped by recency (Today/This week/Earlier), so that I can triage what needs a decision without scanning a flat list. *(Refines US-S3, US-S4.)*
- **`NOTIF-US-2`** — As a result submitter, I want a single Filter control with Program, Center, and Bilateral project facets, so that I can narrow a long request list without four permanently-open dropdowns.
- **`NOTIF-US-3`** — As a result submitter, I want to see at a glance whether I already Accepted or Declined a request, so that I don't reopen a decided item by mistake.

---

## 6. Functional Requirements

### Required (MUST)

- **`NOTIF-R-1`** The Requests tab MUST render "Received" and "Sent" as a segmented control (single active state, not two independent link styles), replacing the current two plain `<a>` tabs.
- **`NOTIF-R-2`** Within Received and within Sent, the system MUST group visible requests into **Today**, **This week**, and **Earlier** buckets, computed client-side from each request's `requested_date`, with a per-group count. A bucket with zero matching requests MUST NOT render.
- **`NOTIF-R-3`** Each request row MUST render, while `request_status_id = 1` (pending): an avatar/initials or entity icon, the requester/result text with the result code in `font-mono`, and the existing **Accept contribution** / **Decline contribution** actions — unchanged behavior.
- **`NOTIF-R-4`** Each request row MUST render, while `request_status_id` is `2` or `3` (already decided): a status chip reading **Accepted** or **Declined** respectively, in place of the action buttons, using the existing decision data (`request_status_id`, `obj_approved_by`, `aprovaed_date`) — no new field.
- **`NOTIF-R-5`** The filter row MUST expose Phase, Program (existing "Entity" filter), Center, and Bilateral project as facets inside one Filter control with an active-count indicator, instead of four always-visible controls in a row.
- **`NOTIF-R-6`** Active filters MUST render as removable chips with a "Clear all" action, equivalent to today's "Clear filters" button.
- **`NOTIF-R-7`** The existing text search (`searchFilter`, `appFilterNotificationBySearch`) MUST remain available and visually match the mockup's search field.
- **`NOTIF-R-8`** The header bell (`shell-topbar`) MUST keep its current unread-count badge and hover tooltip behavior; only their sizing/spacing/color MUST be reconciled with the mockup.
- **`NOTIF-R-9`** All existing accept/decline logic, the reject-confirmation dialog, and the bilateral ToC-mapping dialogs (P2-3187 AC4) in `notification-item.component.ts` MUST remain functionally unchanged — this spec is additive/visual on top of them, per the notification-item `CLAUDE.md` traps list.

### Should (SHOULD)

- **`NOTIF-R-10`** The Filter panel SHOULD keep Program/Center/Bilateral-project as checkbox multi-select lists (per the mockup), falling back to the existing single-select Program dropdown if multi-select proves out of budget for this chunk (see `design.md` budget).

### Could / Nice-to-have (MAY)

- **`NOTIF-R-20`** The info ("i") popover explaining the Requests tab MAY be added next to the page title, reusing the description text already shown in `results-notifications.component.html` (`request_description`) — it already matches the mockup's popover copy near-verbatim. **Deferred** — not scheduled to any task in this chunk's `tasks.md` (see design.md §13 Open Gaps); the existing always-visible `request_description` paragraph already conveys the same text, so this is a pure nice-to-have, not a gap in coverage.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | New segmented control, filter panel, and chips MUST meet WCAG 2.1 AA per `docs/ux-ui/design.md` §10 — keyboard-operable tabs, `aria-expanded` on the Filter button, accessible labels on chip remove buttons (mirrors the mockup's own `aria-label="Remove filter"`). |
| **Internationalization** | All new/changed copy (segmented labels, group headers, chip labels, "Accepted"/"Declined") MUST go through `src/app/internationalization/` if it varies P22/P25, else stay structural English per existing convention. |
| **Visual consistency** | Zero new hardcoded hex; every color traces to `--pr-*` tokens or Tailwind `brand-*`/status aliases (`onecgiar-pr-client/CLAUDE.md` §5). |
| **Performance** | Client-side grouping/filtering over already-fetched lists MUST NOT introduce a new network round-trip; bucketing is a pure function over data already in `receivedData`/`sentData`. |
| **Backwards compatibility** | No `results-notifications.service.ts` method signature, DTO, or server contract changes (`AC-1..AC-9` project ACs unaffected — this is presentation-layer only). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `NOTIF-AC-1` | The Requests tab is open with both pending and resolved requests across different dates | The user views Received | Requests appear under Today/This week/Earlier headers with a count pill, in `requested_date` descending order within each group. |
| `NOTIF-AC-2` | A pending request row | The user clicks **Accept contribution** or **Decline contribution** | The existing PATCH flow fires exactly as today (including the ToC-mapping dialogs for bilateral requests); on success the row re-renders with the Accepted/Declined chip instead of the action buttons. |
| `NOTIF-AC-3` | The Filter panel is open | The user checks a Program, Center, or Bilateral project option | An active-filter chip appears, the list narrows to matching rows, and the Filter button shows an active-count badge. |
| `NOTIF-AC-4` | Any active filters are set | The user clicks "Clear all" | All facets reset and the full list (per current Phase selection) reappears — equivalent to today's `clearAllFilters()`. |
| `NOTIF-AC-5` | The Requests tab is active | The user switches Updates ↔ Requests via the parent shell tabs | Updates renders exactly as it does today (unchanged) — confirms this spec did not regress the sibling tab. |
| `NOTIF-AC-6` | The header bell has unread notifications | The user hovers/looks at the bell | The badge count and tooltip render with the mockup's spacing/sizing, using the same `hasUnread`/`unreadCount` data already wired. |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization (no change — same guards), `AC-8` Observability and notifications (no change — same PATCH/notification triggers), `AC-9` Security and secrets (no new logging surface).

---

### Defect Classes & Verification Gates

| Defect class this spec can produce | Command that catches it |
|---|---|
| Recency-bucketing off-by-one (wrong Today/This week/Earlier boundary) | `npx jest --testPathPattern=group-notifications-by-recency.pipe.spec` (fixed-clock unit test) |
| Filter facet returns wrong/no rows (Program/Center/Bilateral project) | `npx jest --testPathPattern="filter-notification-by-(center|bilateral-project|initiative).pipe.spec"` |
| Accept/Decline or ToC-mapping logic regressed by a template restyle | Existing `notification-item.component.spec.ts` suite — any failure here is a stop signal, not a test-update signal (see `tasks.md` `NOTIF-T-7` Disqualifier) |
| Deep link to `/requests/received` or `/requests/sent` breaks after the segmented-visual restyle | `npx jest --testPathPattern=requests.component.spec` + manual navigation check |
| **Visual misalignment against the mockup** (bell spacing, chip sizing, row density) | **No automated gate exists** — `axe`/Jest cannot evaluate pixel spacing against a reference screenshot. Substitute: manual browser check at desktop + tablet width (`tasks.md` `NOTIF-T-8`), recorded as done in the PR description. Accepted as a documented gap, not silently skipped. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `results-notifications.service.ts` (`get_section_information`, `get_sent_notifications`) — data source, unchanged.
- `notification-item.component.ts` — accept/decline + ToC-mapping business logic, unchanged.
- Existing pipes: `filterNotificationByInitiative`, `appFilterNotificationBySearch`, `filterNotificationByPhase`.
- Spartan/Helm primitives (segmented control / tabs, popover, checkbox) via the Spartan MCP + skill.

### Downstream consumers

- None outside this UI — no other module reads Requests-tab presentation state.

### Assumptions

- **`NOTIF-P-1`** Center and Bilateral-project data needed for the new filter facets is present on bilateral-kind rows already rendered today (`obj_result.result_center_array[0].clarisa_center_object.clarisa_institution`, and the bilateral project code shown in `notification-item.component.html`'s bilateral branch). Non-bilateral (W1/W2) rows simply won't match those two facets — expected, not a defect.
- Multi-select checkbox filtering (mockup) is achievable within the Standard budget; if `design.md`'s sizing pass says otherwise, the single-select Program dropdown is kept (see `NOTIF-R-10`).

---

## 10. Open Questions

All resolved before moving to `design.md`:

- ~~`NOTIF-OQ-1` Does the payload carry enough data for time-bucketing and decision chips?~~ **Resolved** — yes, `requested_date` and `request_status_id` are already present (verified in `results-notifications.service.ts` / `notification-item.component.ts`), no backend gap.
- ~~`NOTIF-OQ-2` Is Updates/Settings in scope?~~ **Resolved** — no, confirmed out of scope by the user 2026-09-25.

---

## 11. Out-of-Band Notes

None — this is a single, non-chunked spec (no `family.md`).

---

## Required cross-references

- `docs/prd.md` — US-S3, US-S4 (share/collaborate, review history visibility).
- `docs/ux-ui/design.md` — §6 Layout Patterns (Listing screens), §7 Design Tokens, §12 DD-12 (2026 brand line).
- `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, tokens) and `onecgiar-pr-client/src/CLAUDE.md` §3.3 (`results-outlet` structure), §21.7 (Spartan MCP for interactive controls).
- `docs/specs/changes/notifications-revamp/proposal.md` and `mockups/README.md` — approved intent and visual reference.
- `onecgiar-pr-client/.../notification-item/CLAUDE.md` — traps this spec must not violate (AC4 ToC flow, single-PATCH accept, never reopen `<app-share-request-modal>`).
