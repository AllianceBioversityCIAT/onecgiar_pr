# Proposal — Contribution Request Drawer

> **Answer first:** clicking a pending "contribution request" notification row (Received tab) opens a right-side drawer showing the result, its Theory-of-Change alignment (Level, HLO/Outcome, Outcome statement, Indicator typology, Unit of measurement, Target, Contribution target), an "Align to your Theory of Change" indicator picker, and Accept/Decline actions — replacing today's always-expanded inline block and the separate confirm/prompt/mapping dialogs with one sheet.

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `contribution-request-drawer` — derived from free-text argument |
| Module | `notifications` (client only; `pages/results/pages/results-outlet/pages/results-notifications/`) |
| Type | Change |
| Approval Mode | gated |
| Status | approved (Santiago Sanchez, 2026-09-25) |
| Related code (verified) | `components/notification-item/` (`.ts` L1-439, `.html` L1-429, `CLAUDE.md`), `pages/requests/pages/received-requests/` |
| Visual source | User-provided mockup screenshots (drawer, two variants) + local file `PRMS Reporting.dc.html` (not yet opened — see Open Question OQ-1) |

## 2. Intent

Today, a submitter deciding on a contribution request reads everything inline in the notification row/card and, for bilateral requests, goes through up to three separate popups (reject-confirm dialog, ToC "map now?" prompt, ToC mapping dialog). The mockup wants this consolidated into **one right-side drawer**, opened by clicking the notification, that shows the result + its ToC alignment read-only fields, offers the ToC indicator picker inline, and carries the Accept/Decline actions in its sticky footer.

## 3. Problem / Current Behavior

| Today | Mockup |
|---|---|
| ToC alignment fields (`toc_review` block in `notification-item.component.html` L111-128) render **inline, always expanded**, and **only** when `notification.is_map_to_toc && tocReview.length` (i.e. only requests whose ToC mapping travelled with them) | Same fields render inside a drawer, opened on click, for the "Contribution request" case generally (mockup shows both a ToC-mapped request and a plain "Test emerging" result with the same field set, all `—`) |
| Accept/Decline buttons live on the row itself (`.notification_content_actions_buttons`) | Accept/Decline live in the drawer's sticky footer |
| Bilateral accept flow is **3 separate `app-pr-dialog` popups**: reject-confirm, "Map to ToC?" prompt, mapping step (`app-cp-multiple-wps`) | Mockup shows **one** "Align to your Theory of Change" indicator dropdown inside the drawer body — no separate prompt/mapping popups |
| Clicking the notification row does nothing (no navigation, no expand) — the row is a flat list item | Clicking the row opens the drawer |

## 4. Proposed Outcome

- Clicking a **pending** ("Requested"/status 1) notification row in Received Requests opens a right-side drawer (Hard Rule #2: no modal-on-modal — a Spartan sheet, following the `bilateral-create-drawer` pattern already in the codebase).
- The drawer header repeats the row's summary sentence ("X from SPxx has asked SPyy to contribute to result NNNN – Title").
- Drawer body: a "RESULT" card (code + title, clickable to the result) and a "WHERE IT CONTRIBUTES" table reusing the exact 7 fields already computed by `tocReview`/`tocTypologyOf()` (Level, High level output/outcome, Outcome statement, Indicator typology, Unit of measurement, Target, Contribution target) — rendered even when `tocReview` is empty, with `—` placeholders (mockup's "Test emerging" example has all dashes).
- "ALIGN TO YOUR THEORY OF CHANGE" section: one indicator `pr-select` (or equivalent Spartan combobox), replacing the current two-dialog prompt+mapping flow — "You can do this later" copy makes it explicitly optional, matching AC3/AC5 (an unfinished mapping never blocks acceptance).
- Sticky footer: Decline / Accept contribution buttons, reusing `acceptOrReject()`/`onAcceptContribution()` semantics.
- Non-pending rows (status 2/3, "Accepted"/"Declined") keep the current flat row and do not open the drawer (OQ-2 resolved).

## 5. Scope

- Client only, `notification-item` + `received-requests` (and by extension `sent-requests`, since they share the module's pipes — no behavior change intended there beyond "no drawer on sent rows" unless OQ-2 says otherwise).
- New drawer component under `pages/results-notifications/components/` (e.g. `contribution-request-drawer/`), following the `bilateral-create-drawer` composition pattern (Spartan sheet, sticky header/footer, single scroll region — Hard Rules #2/#3).
- Reuse existing data (`tocReview`, `tocTypologyOf()`) and existing decision logic (`acceptOrReject`, `invalidateRequest`, `isQAed`) — no new backend contract expected (see OQ-3 on the ToC-picker payload).
- Collapse the reject-confirm dialog and the two ToC dialogs (`showConfirmRejectDialog`, `showTocPromptDialog`, `showTocMappingDialog`) into the drawer's own body/footer once the drawer ships; the row's inline `toc_review` block (`.html` L111-128) is retired in favor of the drawer.

## 6. Non-Goals

- No change to the request data model, the accept/decline API contract, or `PATCH_updateRequest`.
- No change to Sent Requests' presentation beyond staying consistent (sent rows show no actions today and won't gain a drawer unless decided otherwise).
- No redesign of the notification bell/toast, Updates tab, or notification settings.
- No change to the ToC mapping logic (OQ-3): `app-cp-multiple-wps` is hosted inside the drawer as-is, not re-authored as a single dropdown. The single-selector simplification and multi-item mapping are deferred to a follow-up spec.
- No drawer for accepted/declined rows (OQ-2).

## 7. Affected Users, Systems, And Specs

- **Result submitter** (contribution requester/responder) — primary flow change.
- Code: `notification-item.component.{ts,html,scss}`, its `CLAUDE.md`, `received-requests.component.html`, `results-notifications.service.ts` (if drawer open/close state needs a shared flag), new drawer component + module.
- No server-side spec exists for this UI; no bilateral payload change.

## 8. Visual Reference

- Source: User-provided screenshots (2 drawer states: a ToC-mapped bilateral request "9377 – Varietal turnover monitoring…", and a plain result "9400 – Test emerging" with all fields `—`) + a local static mockup file the user pointed at: `C:\Users\santiagosanchez\Downloads\PRMS Reporting_Tool_interface_(1)\PRMS Reporting.dc.html`.
- Location: not yet read by this session (path is outside the repo, under the user's Downloads folder) — see **OQ-1**.
- Notes: covers the "Received Requests" notification list → drawer flow only. No other screens shown.

## 9. Requirement Delta Preview

### ADDED Requirements

- Clicking a pending Received-request row opens a right-side drawer with Result / Where-it-contributes / Align-to-ToC / Accept-Decline sections.
- The "Where it contributes" 7-field table renders inside the drawer for every contribution request (not gated on `is_map_to_toc`), with `—` for absent values.

### MODIFIED Requirements

- Accept/Decline move from the row into the drawer's footer for the pending case.
- The reject-confirmation step and the ToC "map now?" prompt + mapping step move into the drawer instead of separate `app-pr-dialog` popups. Mapping behavior and payload are unchanged (OQ-3).

### REMOVED Requirements

- The always-expanded inline `toc_review` block below the row (`.html` L111-128) is removed once the drawer ships (its content moves inside the drawer).

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — New drawer component, row click opens it, existing dialogs retired incrementally (recommended)** | Build `contribution-request-drawer` as a sibling to `bilateral-create-drawer`; `notification-item` emits a "row clicked" event with the notification; `received-requests` (or a shared service) holds `selectedNotification` + `drawerOpen` signal. Keep `acceptOrReject`/`invalidateRequest` as-is, called from the drawer. | Smallest safe path: reuses all existing decision logic and data; only the presentation layer moves. Requires deciding the ToC-picker's final shape (OQ-3) before the mapping dialogs can be retired. |
| B — Keep dialogs, add a read-only "preview" drawer on top | Row click opens a drawer that only *previews* the same info already in the inline block; Accept/Decline and ToC mapping stay where they are today (row buttons + existing 3 dialogs). | Less code, ships faster, but doesn't match the mockup (which puts Accept/Decline and the ToC picker inside the drawer) and leaves the "modal on top of a drawer" risk if a dialog opens while the drawer is open (violates Hard Rule #2). |
| C — Full replace: drawer becomes the *only* way to act on a request, remove row-level Accept/Decline entirely | Row becomes purely a summary; every decision happens in the drawer. | Cleanest end-state and closest to the mockup, but is a bigger behavior change (removes a currently-visible affordance) — needs explicit user sign-off before `/akili-specify` locks it in. |

## 11. Recommended Approach

**Option A**, converging toward **Option C**'s end state once OQ-2/OQ-3 are answered: build the drawer first (new component, wired to the existing accept/decline/ToC data and methods), keep it additive (row still works if the drawer isn't opened) for the first cut, then remove the now-redundant inline block and popups in the same spec's tasks once the drawer covers their function. This is the smallest change that ships the mockup's core ask (click → drawer with all fields + actions) without a second migration later.

## 12. Risks, Dependencies, And Open Questions

- **OQ-1 — Mockup file unread.** The referenced `PRMS Reporting.dc.html` lives outside the repo (`C:\Users\santiagosanchez\Downloads\...`) and this session has not opened it. `/akili-specify` MUST read it (or the user re-supplies it inside the repo/workspace) before finalizing field order, copy, and drawer chrome — the screenshots given are enough for this proposal's scope, not for pixel-level design.md work.
- **OQ-2 — RESOLVED (Santiago Sanchez, 2026-09-25):** accepted/declined rows (status 2/3) do **not** open the drawer. They stay as today's flat rows with the decision chip. Only pending rows (status 1) are clickable.
- **OQ-3 — RESOLVED (Santiago Sanchez, 2026-09-25): the accept flow's behavior stays as it is today.** The "Align to your Theory of Change" section keeps the current mapping logic and payload: optional, planned/unplanned question plus `app-cp-multiple-wps` with a single tab (`[hidden]="true"`), and the mapping travels with the same accept PATCH (`buildTocMappingPayload()`). The only change is where it lives: inline in the drawer body instead of the `showTocPromptDialog` / `showTocMappingDialog` popups. **Deferred to a follow-up spec:** collapsing it into the mockup's single "Select an indicator" dropdown, and deciding whether one accept can map one or several items. Until then, record this as a deliberate deviation from the mockup in `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`.
- **Risk:** `notification-item` currently self-contains all decision state (`showConfirmRejectDialog`, etc.) per-row; moving Accept/Decline into a drawer shared across rows means that state (and `requestingAccept`/`requestingReject`) needs to live where the drawer lives (new drawer component or a shared service) — a refactor, not just new markup.
- **Dependency:** none on other in-flight specs. `Depends on: none`. `Parallel-safe: yes` (touches only `results-notifications`, no shared module/migration/API contract with other active specs).

## 13. Success Criteria

- Clicking a pending Received-request row opens the drawer with the Result + Where-it-contributes fields matching the mockup's field set and order.
- Accept/Decline from the drawer produce the same `PATCH_updateRequest` call and same success/error toasts as today.
- No modal-on-modal state is reachable (Hard Rule #2) — verified by a Cypress/Jest test opening the drawer and, where applicable, its ToC sub-step.
- Existing notification-item Jest spec plus a new drawer spec stay green; coverage thresholds (50/60/60/60) hold.

## 14. Next Step

```text
/akili-specify changes/contribution-request-drawer
```

(Standard depth — Change track. `/akili-specify` should open OQ-1's mockup file directly, since it lives outside the repo and this proposal could only work from the screenshots, OQ-2 and OQ-3 are resolved. See §12.)
