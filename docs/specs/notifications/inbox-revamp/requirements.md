# Notifications Inbox Revamp — Requirements

## 1. Document Control

- **Module:** `notifications`
- **Sub-feature:** `inbox-revamp`
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Depth:** Standard
- **Type:** Change
- **Approval Mode:** gated
- **Ticket(s):** none yet
- **Proposal:** `docs/specs/notifications/inbox-revamp/proposal.md` (approved; approval-chain view dropped from scope per user decision, 2026-09-29)

---

## 2. Executive Summary

Revamp the existing Notifications inbox (`onecgiar-pr-client`, `pages/results/pages/results-outlet/pages/results-notifications/`) so a user can triage requests by decision urgency, and open a side detail panel from any row — not just pending contribution requests — to see the result and its metadata, keeping the existing bilateral Align/ToC-mapping step exactly where it is today. This is a UI/interaction revamp of a shipping feature, not a new module: it refines **US-S3** ("share / request access to a result so the right Initiative collaborators can contribute", `docs/prd.md`) and builds directly on `contribution-request-drawer` (`docs/specs/changes/contribution-request-drawer/`, shipped 2026-09-25).

No approval-chain / multi-program status view ships in this pass (explicitly out of scope — see §3).

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Notification row** | One entry in the Received or Sent list (`components/notification-item/`). |
| **Decision notification** | A row that requires the current user to Accept/Decline — today this is a single real shape: a pending Received contribution request (`request_status_id === 1`). |
| **Informational notification** | A row that only reports a fact (CG Center tagged, bilateral project tagged, a resolved decision update). |
| **Detail panel** | The side panel opened by clicking a row; generalizes today's `contribution-request-drawer` to every request type. |
| **ToC / indicator mapping ("Align")** | The real mapping step already implemented in `contribution-request-drawer` for **bilateral** contribution requests: a planned-result question + `app-cp-multiple-wps` indicator picker, submitted inside the same `acceptOrReject()` PATCH via `result_toc_result`. **Correction (design phase, 2026-09-29):** there is no standalone "AOW selector" component and no `AOW01`–`AOW06` checklist in the codebase — the reporting-aow-table (`pages/result-framework-reporting/.../reporting-aow-table`) is a different, unrelated dashboard widget. Earlier drafts of this spec referred to a generic "AOW mapping checklist"; that was speculative and is superseded by this entry. |
| **Approval chain** | A per-contributing-program accept/decline history view. Explicitly **out of scope** for this spec (see Non-Goals in the proposal). |

---

## 4. System Context & Scope

### In scope

- Redesign of the Received/Sent list: **All / Needs your decision / For your information** tabs, **Today / This week / Earlier** recency grouping, request-type chip + funding-window tag per row.
- A shared **side detail panel**, opened on row click (excluding the person-name and result-title links), covering every request type currently rendered by the list.
- Generalizing or retiring `contribution-request-drawer` in favor of the shared panel (final call in `design.md`, per proposal Option B).
- The existing inline **Align (ToC/indicator mapping) step** for bilateral contribution requests, carried into the generalized detail panel unchanged (see corrected `NOTIF-R-6`).
- Preserving existing filter coverage (`filter-notification-by-search/-center/-initiative/-phase/-bilateral-project`) and the Received/Sent split. *(Amended 2026-09-29, `NOTIF-DD-6`: "the Received/Sent split" is preserved as an in-list toggle inside the unified tab view, not as separate routed pages — the routed `requests`/`updates` pages are retired and replaced by the unified view; see `design.md` §6.1.)*

### Out of scope

- Any approval-chain / multi-program decision-history view (dropped from proposal scope).
- Changes to `api/notification` endpoints, notification types, or `email-notification-management` — this spec only reshapes how already-returned data is presented; a confirmed data gap becomes a follow-up spec, not silent scope creep. **Narrow exception added 2026-09-30 (`NOTIF-R-13`):** widening two existing `select`/`relations` objects inside `notification.service.ts` (additive fields only, same endpoint, same response envelope) is explicitly IN scope — approved by the user specifically for that one widening, not a general reopening of this Non-Goal.
- The unrelated IPSR notifications feature (`pages/ipsr/.../innovation-packages-notification/`).
- `user-notification-settings` (Settings tab) beyond incidental visual consistency.
- Accept/Decline business logic itself (only its presentation changes; the Align/ToC-mapping step is carried over unchanged, not redesigned).
- **CRD-DD-10 coexistence rule.** The row-level Accept/Decline popups and the inline ToC block for pending contribution requests stay exactly as `contribution-request-drawer`'s spec (2026-09-25) settled them, per the product owner's explicit request. This spec extends the drawer to informational rows; it does not reopen that decision.

---

## 5. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result submitter** (Initiative / Center staff) | Primary persona. Sees clearer decision-vs-info grouping, opens a detail panel for any request type, keeps the existing bilateral Align/ToC-mapping step exactly where it is today. |
| **PMU / portfolio lead** | Same inbox, benefits from the same triage clarity when tagged as a contributing/primary program. |
| **Platform admin** | No functional change; only inherits shared visual tokens if a consistency pass touches the Settings tab. |
| **QA reviewer** | Not directly affected — QA review notifications are a separate flow (`quality-assurance`), unchanged here. |

---

## 6. User Stories

Refines **US-S3** (`docs/prd.md` §6, Result submitter).

- **NOTIF-US-1** — As a result submitter, I want notifications split into "needs your decision" vs. "for your information", so I can triage what actually requires action.
- **NOTIF-US-2** — As a result submitter, I want to open a detail panel for any notification type without leaving the list, so I can see the result and its metadata before deciding.
- **NOTIF-US-3** — As a result submitter reviewing a bilateral contribution request, I want to keep completing the Align/ToC-mapping step in the same panel while I decide, so contribution and ToC alignment stay one step instead of two — exactly as `contribution-request-drawer` already does.
- **NOTIF-US-4** — As a result submitter, I want the Received/Sent split preserved, so I can track what I've requested independently of what's been sent to me.

---

## 7. Functional Requirements

### Required (MUST)

- **NOTIF-R-1** The system MUST classify every notification row into exactly one of two decision states — "Needs your decision" (a Received, pending, `request_status_id === 1` row from `request/get/received`) or "For your information" (every Sent row, every resolved Received row, and every row from `notification/updates`) — and MUST let the user filter the merged list by **All / Needs your decision / For your information**. *(Clarified 2026-09-29: Requests and Updates remain two separate backend calls today — see `design.md` DD on client-side merge — this requirement governs the merged presentation, not a new unified endpoint.)*
- **NOTIF-R-2** The system MUST group notification rows by recency (**Today / This week / Earlier**) within each filter view, preserving the semantics of the existing `group-notifications-by-recency` pipe.
- **NOTIF-R-3** The system MUST render a request-type indicator per row using only real values: a single **"Contribution request"** chip for every pending Requests-tab row (there is no backend distinction today between "primary program", "contributor", or "CG Center" request sub-types — the mockup's five-way DECISION-chip taxonomy does not exist in the data model and MUST NOT be recreated client-side), and the matching `NotificationType` label (`shared/constants/notification-type.constants.ts`: Result Center Tagged, Result Bilateral Project Tagged, Result Contribution Accepted/Declined, Bilateral Result Approved/Rejected, Result QAed, Result Submitted/Unsubmitted, Announcement) for every informational Updates-tab row. *(Corrected 2026-09-29 — supersedes the original five-chip taxonomy for DECISION rows specifically.)* **Second correction, 2026-09-30 (user feedback + data re-verification — see `execution.md`):** the 2026-09-29 correction over-reached — it correctly ruled out inventing a 3-way sub-type for decision rows (Contribution/Primary-program/Contributor request genuinely share one `ShareResultRequest` shape with no discriminator column), but it did NOT mean the mockup's OTHER per-row badges are fictional. Re-verified against the actual server code (`share-result-request.service.ts` `getRequestRelations()`): Requests-tab rows (Received/Sent) already carry `obj_result.source_name` (`'W1/W2'` | `'W3/Bilaterals'`, derived from `obj_result.source`), `obj_result.obj_result_type`, `obj_result.obj_result_level`, and `obj_result.obj_result_by_project.obj_clarisa_project` (bilateral project name) — all in the SAME response the client already receives, unused. See `NOTIF-R-12`–`NOTIF-R-14` below.
- **NOTIF-R-4** WHEN a user clicks anywhere on a notification row **except** the person's name or the linked result title, the system MUST open a side detail panel for that notification without navigating away from the list.
- **NOTIF-R-5** The detail panel MUST show, at minimum: the notification's decision/info status, a result card (result code + title, linking to the result), and a metadata grid built only from fields the real API response provides for that notification type — a field with no confirmed data source MUST be omitted, not shown empty or fabricated.
- **NOTIF-R-6** WHEN the underlying notification is a **bilateral** contribution request, the detail panel MUST keep offering its existing inline "Align" step (planned-result question + `app-cp-multiple-wps` indicator picker) exactly as `contribution-request-drawer` (`CRD-DD-3`) already implements it — submitted together with the decision via the existing `result_toc_result` payload on `PATCH request/update`. This spec does not add a new mapping mechanism; it only carries the existing one into the generalized panel. *(Corrected 2026-09-29 — see Glossary; supersedes the original "AOW checklist" wording.)*
- **NOTIF-R-7** The detail panel MUST support the row's existing action(s) (Accept / Decline / Accept as primary / etc.) inline, without requiring the panel to close first.
- **NOTIF-R-8** The system MUST keep Received and Sent as independent contexts; the detail panel MUST close when the user switches between them. *(Amended 2026-09-29 — Pivot Record, `NOTIF-DD-6` in `design.md`: "independent contexts" is satisfied by an **in-list Received/Sent toggle** inside the unified All/Needs-decision/For-info view, not by separate routes/pages. The original wording predates the decision that the new tab row replaces the routed Requests/Updates split — "independent contexts" no longer means "independent routes." The panel-closes-on-switch behavior is unchanged in intent.)*
- **NOTIF-R-9** The system MUST NOT display a per-program approval-chain / multi-step decision-history view anywhere in the detail panel.

### Should (SHOULD)

- **NOTIF-R-10** The system SHOULD preserve every filter currently available via the five `filter-notification-by-*` pipes (search, center, initiative, phase, bilateral project) in the redesigned toolbar, falling back to today's filter UI for any filter whose new presentation is not yet confirmed.
- **NOTIF-R-11** The system SHOULD let the user close the detail panel either via its close control or by clicking the same row again (toggle), so no dead-end state requires a page reload to escape.

### New this pass — added 2026-09-30 (user feedback + data re-verification, real fields confirmed)

- **NOTIF-R-12 (MUST)** For every Requests-tab row (Received/Sent, all statuses), the system MUST render a **funding-window tag** (`W1/W2` or `W3/Bilateral`, from `obj_result.source_name`) and the **result level + type** (e.g. "Output · Innovation Development", from `obj_result.obj_result_level`/`obj_result.obj_result_type`) alongside the existing request-type chip — using only these already-returned fields, never fabricated. Updates-tab rows omit these badges until `NOTIF-R-13`'s backend widening lands (never shown blank/fabricated in the meantime — same "omit, don't fake" rule as `NOTIF-R-5`/`NOTIF-AC-7`).
- **NOTIF-R-13 (MUST)** The system MUST widen `notification.service.ts`'s Updates-tab select/relations (`getNotificattionSelect()`/`getNotificationRelations()`) to additionally return `obj_result.source` (for the same `source_name` derivation as Requests-tab rows), `obj_result.obj_result_type`, `obj_result.obj_result_level`, and `obj_result.obj_result_by_project.obj_clarisa_project` — an additive, non-breaking widening of an existing endpoint's response shape (no new endpoint, no field removed). This is a **narrow, explicit exception** to this spec's original Non-Goal ("no `api/notification` changes this pass") — approved by the user 2026-09-30 specifically for this widening, not a general reopening of that Non-Goal.
- **NOTIF-R-14 (MUST)** — **Corrected 2026-09-30 (user feedback: the first implementation put this on EVERY row, not just the actual tagging event).** `obj_result.obj_result_by_project` is a per-RESULT list of every bilateral project ever tagged to it — NOT tied to any specific notification event. `NOTIF-T-9`'s original reading (render the project name as a generic caption whenever this list is non-empty, on any row type) was wrong: it produced misleading text on unrelated rows (e.g. a plain contribution-request row for a result that happens to have an unrelated bilateral project tagged at some point). The CORRECT behavior (already partially built by `RESULT_BILATERAL_PROJECT_TAGGED`'s existing server-composed `notification.text`, per the comment at `notification-type.constants.ts` line ~167): WHEN a notification's `NotificationType` IS **Result Bilateral Project Tagged** specifically, the system MUST render the tagged project's name **as part of that notification's own message text** — format: `"{emitter name} from {Science Program code} has tagged project {project name} as contributor to result {result_code} - {result_title}"` — never as a separate generic caption bolted onto other row types. No other row type ever shows a bilateral-project-name caption.
- **NOTIF-R-15 (SHOULD)** The three tab badges (`All` / `Needs your decision` / `For your information` counts) SHOULD render as subtle circular pill badges matching the mockup's visual weight (small, muted background, not a bold/heavy chip) — a visual-only correction, no new design tokens (`docs/ux-ui/design.md` §7 / this spec's `design.md` §6.3 still apply: reuse existing tokens).
- **NOTIF-R-16 (SHOULD)** The filter toolbar SHOULD add, alongside the five already-preserved filters (`NOTIF-R-10`), the mockup's remaining filters where a real field now backs them: **Type** (the row's rendered type chip/label — `NotificationType` ∪ `{"Contribution request"}`), **Funding** (`source_name`, `NOTIF-R-12`/`R-13`), **Result type** (`obj_result_type`). **Program / Accelerator** is deferred — re-verify at task time whether it's a real duplicate of the existing Initiative filter or a genuinely separate field before building a redundant control.

### Could / Nice-to-have (MAY)

- **NOTIF-R-20** The system MAY mark a notification as read when its detail panel is opened, consistent with `PATCH_readNotification` semantics already in use.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | New detail panel MUST meet WCAG 2.1 AA (`docs/ux-ui/design.md` §10): focus MUST move into the panel on open and return to the triggering row on close; the panel MUST be operable by keyboard alone; row click targets MUST NOT shrink below existing touch/click target sizing. |
| **Responsive** | The list + detail panel layout MUST remain usable down to standard mobile widths — panel behavior (side-by-side vs. stacked/overlay) MUST be specified in `design.md`, not left implicit. |
| **Internationalization** | All new strings (tab labels, chip labels, panel section headers) MUST go through `src/app/internationalization/` — no hardcoded UI strings. |
| **Performance** | Opening the detail panel MUST NOT trigger a new network round-trip when the row's data already contains everything the panel needs; if a field requires a new call, `design.md` MUST say so explicitly and bound its latency. |
| **Security** | The panel MUST only ever render data the user is already authorized to see via existing `api/notification` authorization; no new cross-user data exposure. |
| **Backwards compatibility** | Existing contribution-request flows (accept/decline, navigation to the result) MUST keep working through and after `contribution-request-drawer` is generalized or retired. |
| **Observability** | No new logging requirement beyond what `api/notification` already emits; this is a presentation-layer change. |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `NOTIF-AC-1` | A user with 2 pending contribution requests and 1 informational tag notification | They open the **All** tab | Both kinds appear, grouped by recency, and the **Needs your decision** tab shows a count of 2. |
| `NOTIF-AC-2` | The Received list is open | The user clicks a row's body text (not the person's name, not the result-title link) | The side detail panel opens for that row's notification; no page navigation occurs. |
| `NOTIF-AC-3` | The same row | The user clicks the person's name or the result-title link instead | The detail panel does **NOT** open; the existing link navigation fires as it does today. |
| `NOTIF-AC-4` | A **bilateral** contribution-request notification's detail panel is open, in `decide` mode | The user completes the existing Align step and clicks Accept | The acceptance and the Align/ToC-mapping payload (`result_toc_result`) are recorded in the same existing `PATCH request/update` call — unchanged from today's `contribution-request-drawer` behavior. |
| `NOTIF-AC-5` | The detail panel is open for notification A | The user clicks notification B | The panel updates to B's content; any of A's transient in-progress state (e.g., an unsubmitted Align selection) is discarded, not silently merged into B. |
| `NOTIF-AC-6` | The Received side's detail panel is open (Received/Sent is now an in-list toggle within the unified view, `NOTIF-DD-6`, not a separate route/tab) | The user switches to Sent | The panel closes. |
| `NOTIF-AC-7` | A notification whose real API response omits one of the metadata-grid fields (e.g., no `reporting center` value) | Its detail panel renders | That field is omitted from the grid — never shown as a blank placeholder or invented value. |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization, `AC-6` Evidence and ToC alignment at submit (the existing Align step feeds this, unchanged by this spec), `AC-8` Observability and notifications, `AC-9` Security and secrets.

---

## 10. Defect Classes & Verification Coverage

| Defect class | Example failure | Catching command / check |
|---|---|---|
| Wrong decision/info classification or count | A decision-required row shows under "For your information" | Unit test on the classification function/pipe + `NOTIF-AC-1` scenario test (client Jest) |
| Click-target regression (link click wrongly opens panel, or row click wrongly navigates) | Clicking a person's name opens the panel instead of navigating | Component test asserting `NOTIF-AC-2` / `NOTIF-AC-3` (client Jest, event-target assertions) |
| Fabricated or blank metadata field | Panel shows "Reporting center: –" when the API never returned that field at all | Component test with a mocked API response missing the field, asserting the field is absent from the DOM (`NOTIF-AC-7`) — **this class has no automated check today because the real API response shape is unconfirmed (see Open Questions); `design.md` MUST confirm the shape before this test can be written meaningfully** |
| Panel state leaking across rows | An in-progress Align selection for A survives into B's panel | Component test per `NOTIF-AC-5` |
| Visual/layout regression (responsive breakpoints, WCAG contrast/focus order) | Panel unusable at mobile width, or focus doesn't move on open | **No automated check in client Jest/Cypress for this class** — requires a manual/HITL visual pass at the design review gate, or a T6 multimodal review if available. Recorded as an accepted gap until then. |

---

## 11. Dependencies & Assumptions

### Upstream dependencies

- `api/notification` (client: `results-notifications.service.ts` → `resultsApiService.GET_allRequest`, `GET_sentRequest`, `GET_requestUpdates`, `GET_notificationsPopUp`).
- `notification_type` entity / `shared/constants/notification-type.constants.ts` (label source of truth).
- Existing Align/ToC-mapping step inside `contribution-request-drawer` (`result_toc_result`, `app-cp-multiple-wps`) — not the unrelated `reporting-aow-table` dashboard widget.
- `contribution-request-drawer` (`docs/specs/changes/contribution-request-drawer/design.md`, shipped 2026-09-25) — the component being generalized, and the source of truth for `CRD-DD-*` decisions this spec must not silently reopen.
- The five `filter-notification-by-*` pipes and `group-notifications-by-recency` pipe.

### Downstream consumers

- `shared/components/header-panel/components/pop-up-notification-item/` (bell popup) — may or may not adopt the new panel as its click-through target; see Open Questions. **Amended 2026-09-29 (`NOTIF-DD-6`):** regardless of that open question, the popup's existing click-through target (wherever it navigates today — the old `requests`/`updates` routes) MUST be repointed at the merged `results-notifications` route once those routes are removed, or the popup will 404 / dead-link. This is a mechanical consequence of the Pivot, not a reopening of `NOTIF-OQ-3`/`NOTIF-DD-5`.
- `shared/services/notification-navigation.service.ts` — click-to-navigate logic that must keep working for name/result-title links.

### Assumptions — resolved 2026-09-29 (see `design.md` for the full data-shape reference)

- ~~Metadata fields unconfirmed~~ **Confirmed:** `request/get/received|sent` already returns result type, phase/version, reporting center, and the single owner/requester initiative pair inline. A full **contributing-programs list** (plural, beyond the one requester+owner pair) is NOT returned by this endpoint — the metadata grid MUST omit that field rather than fabricate it (still governed by `NOTIF-R-5`/`NOTIF-AC-7`).
- ~~AOW selector embeddable~~ **Superseded** — there is no AOW selector; see the corrected `NOTIF-R-6` and the Glossary entry.

---

## 12. Open Questions

- ~~`NOTIF-OQ-1` — exact fields returned~~ **Resolved (2026-09-29):** see the corrected Assumptions section above and `design.md`'s data-shape reference.
- ~~`NOTIF-OQ-2` — combined AOW call vs. two sequential calls~~ **Resolved (2026-09-29):** `acceptOrReject()` already submits the decision and the ToC/indicator mapping in one `PATCH request/update` call via `result_toc_result`; this spec reuses that call unchanged.
- `NOTIF-OQ-3` — Should the bell popup (`pop-up-notification-item`) also open the new detail panel, or keep its current click-through navigation to the full inbox? Flagged in the proposal; resolve in `design.md` or explicitly defer to a follow-up spec.

---

## 13. Out-of-Band Notes

- Visual reference: `https://claude.ai/artifact/LuWqk2rVQHqw3r5GQoNapY` (private artifact) — directional only; the approval-chain section shown there is explicitly excluded from these requirements.
- Recommend exporting a static copy of the mockup under `docs/specs/notifications/inbox-revamp/mockup/` before `design.md` locks visual decisions, so the reference survives outside the artifact link.
- Sibling specs to read for terminology consistency: `docs/specs/notifications/bilateral-review-decision/`, `docs/specs/notifications/bilateral-contributor-tagging/`.

---

## 14. Requirement ID Index

| ID | Title | Priority |
|---|---|---|
| NOTIF-R-1 | Decision-state classification + tab filter | MUST |
| NOTIF-R-2 | Recency grouping preserved | MUST |
| NOTIF-R-3 | Request-type indicator from real data only | MUST |
| NOTIF-R-4 | Row click opens detail panel (excluding name/result links) | MUST |
| NOTIF-R-5 | Detail panel content: status, result card, metadata grid (real fields only) | MUST |
| NOTIF-R-6 | Keep the existing bilateral Align/ToC-mapping step, carried into the generalized panel | MUST |
| NOTIF-R-7 | Inline Accept/Decline in panel | MUST |
| NOTIF-R-8 | Received/Sent independence; panel closes on switch | MUST |
| NOTIF-R-9 | No approval-chain view | MUST |
| NOTIF-R-10 | Preserve existing filter coverage | SHOULD |
| NOTIF-R-11 | Panel closable via close control or row re-click | SHOULD |
| NOTIF-R-20 | Mark-as-read on panel open | MAY |

---

## Required cross-references

- `docs/prd.md` — US-S3, §5 In-scope (AoW tracking), AC-3, AC-6, AC-8.
- `docs/ux-ui/design.md` — top-bar notifications bell (lines ~144–165), DD-10 (dual-channel notifications, lines ~454–456), §10 accessibility.
- `docs/trd/trd.md` — `Notification` module row (line ~164), `results` page dependency on `api/notification` (line ~191), W4. Notifications (lines ~338–342).
- `docs/specs/notifications/bilateral-review-decision/design.md`, `docs/specs/notifications/bilateral-contributor-tagging/` — sibling notification-type specs; terminology source.
