# Proposal — Notifications Inbox Revamp

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `notifications/inbox-revamp` |
| Slug derivation | `inbox-revamp` — derived from free-text argument ("Revamp de la sección de Notificaciones…"). Placed under `docs/specs/notifications/` rather than the default `changes/` bucket because `docs/specs/notifications/bilateral-review-decision` and `docs/specs/notifications/bilateral-contributor-tagging` already establish that module folder — this change is a sibling in the same taxonomy, not an unrelated one-off. |
| Type | Change |
| Approval Mode | gated |
| Owner | Santiago Sanchez |
| Status | Approved for `/akili-specify` — approval-chain view dropped from scope per user decision |
| Parent Spec | none (not produced by Scope Chunking) |

## 2. Intent

Redesign the PRMS Notifications inbox (`onecgiar-pr-client`) — the page reachable from the header bell — so a user can understand and act on a request without leaving the list: clearer grouping, request-type chips, and a click-to-open side detail panel that surfaces the result, its metadata, and (for contribution/tagging requests) the Theory of Change mapping.

## 3. Problem / Current Behavior

The inbox already exists in code (it is not a greenfield feature) at `pages/results/pages/results-outlet/pages/results-notifications/`, with:

- `results-notifications.component.ts` — page shell + tabs (Received/Sent, Updates, Settings).
- `pages/requests/` (received-requests, sent-requests) — the request list sub-tabs.
- `components/notification-item/` — list row rendering.
- `components/contribution-request-drawer/` — an existing side drawer for contribution requests.
- `pipes/`: `filter-notification-by-search`, `-by-center`, `-by-initiative`, `-by-phase`, `-by-bilateral-project`, and `group-notifications-by-recency`.

Current pain points driving this proposal (from user feedback while reviewing a recreated reference mockup of the page):

- Row density and grouping don't make it easy to scan what needs a decision vs. what's informational at a glance.
- The existing `contribution-request-drawer` only covers contribution requests; other request types (primary-program tagging, CG Center tagging, bilateral-project tagging, contributor tagging) have no equivalent "see more" surface.
- There is no inline **Theory of Change (AOW) mapping** step at decision time — the AOW selector already exists elsewhere in the product (`pages/results/.../reporting-aow-table` and `pages/results/intermediate-outcome-aow-visibility/aow-selector` on the frontend) but is not connected to the notifications inbox today.

> **Scope note:** an earlier version of this proposal also included a per-program **approval chain** view (who has accepted/declined/is still pending across contributing programs). The user decided to drop it from scope for this pass — see Non-Goals.

## 4. Proposed Outcome

- A revamped notifications list: tabs for **All / Needs your decision / For your information**, grouped by **Today / This week / Earlier**, with a request-type chip, funding-window tag, and result-type/date meta line per row — replacing or extending the current grouping/filter pipes rather than duplicating them.
- Clicking anywhere on a row **except** the person's name or the linked result title opens a **side detail panel** (not a modal) showing: decision/info status, the result card, a metadata grid (reporting center, result type, primary Science Program, contributing programs, submitted by, phase), and, when the underlying data supports it, an AOW/Theory-of-Change mapping checklist. No approval-chain view (out of scope — see Non-Goals).
- This generalizes and likely replaces `contribution-request-drawer`, extending detail-panel coverage to every request type the list already renders (see Requirement Delta Preview).
- Received/Sent stay separate contexts; opening a row's detail closes when switching between them or navigating away.

## 5. Scope

- Angular client only: `results-notifications` feature module, its sub-pages/components/pipes listed above, and the header bell popup (`shared/components/header-panel/components/pop-up-notification-item/`) only to the extent its click-through target changes.
- Visual and interaction redesign of the list (tabs, filters, grouping, row anatomy) and introduction/generalization of the side detail panel.
- Confirming which of the mockup's detail-panel fields (result/metadata grid, AOW mapping) map to real data already returned by `api/notification` and related endpoints, vs. which require new backend fields — this confirmation is scope for `/akili-specify`, not resolved yet.

## 6. Non-Goals

- No changes to `api/notification` endpoints, notification types, or the email microservice (`email-notification-management`) in this pass — this is a client presentation-layer revamp; any backend gap found during `/akili-specify` becomes its own explicit requirement, not an assumed given.
- No changes to the unrelated IPSR notifications feature (`pages/ipsr/.../innovation-packages-notification/`).
- No changes to `user-notification-settings` (the Settings tab) beyond whatever visual consistency pass follows from the shared design tokens.
- Accept/Decline business logic and the underlying decision workflow are out of scope — only how the option is *presented* changes, not what happens when it's pressed.
- **No approval-chain / multi-program status view.** Dropped from scope per user decision (2026-09-29). The detail panel does not show per-program accept/decline history across contributing programs in this pass; it may be proposed again as a separate, future change once it has a confirmed backend data source.

## 7. Affected Users, Systems, And Specs

| Area | Path | Note |
|---|---|---|
| Notifications page | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/` | Primary surface being redesigned |
| Contribution drawer | `.../results-notifications/components/contribution-request-drawer/` | Likely superseded/generalized by the new side detail panel |
| List row | `.../results-notifications/components/notification-item/` (+ `skeleton-notification-item/`) | Row anatomy changes |
| Filter/grouping pipes | `.../results-notifications/pipes/*.pipe.ts` | Reused where possible; extended if new filters are needed |
| Bell popup | `shared/components/header-panel/components/pop-up-notification-item/` | Click-through target only |
| Navigation service | `shared/services/notification-navigation.service.ts` | May need updating if the detail panel changes what "open" means |
| Sibling specs | `docs/specs/notifications/bilateral-review-decision/`, `docs/specs/notifications/bilateral-contributor-tagging/` | Narrow notification-*type* additions already shipped; this spec is the first pass at the *inbox UI* itself — read both before `/akili-specify` so terminology stays consistent |
| Affected users | Any PRMS user with pending contribution/tagging/decision requests (all personas with a Science Program or CG Center) | |

## 8. Visual Reference

- Source: Generated mockup (self-contained HTML artifact, built directly in-session from a Claude Design canvas the user shared)
- Location: `https://claude.ai/artifact/LuWqk2rVQHqw3r5GQoNapY` (private artifact; not a repo path — recommend exporting a static copy under `docs/specs/notifications/inbox-revamp/mockup/` before `/akili-specify` so the visual reference survives outside the artifact link)
- Notes: Covers the full-page inbox (tabs, filters, Today/This week/Earlier grouping, request-type chips, Accept/Decline actions, Received/Sent toggle) and the click-to-open side detail panel (status pill, result card, metadata grid, AOW checklist). The panel's approval-chain section, shown in the artifact, is **not** part of this spec's scope (dropped per user decision). **This mockup is a first pass — the user is iterating; treat it as directional, not final, when `/akili-specify` converts it into requirements.**

## 9. Requirement Delta Preview

### ADDED Requirements

- A side detail panel opens on row click (excluding the person-name and result-title links) for **every** request type in the list, not just contribution requests.
- The detail panel offers an inline "Map to your Theory of Change" (AOW) step for requests where accepting creates/changes a program's contribution to a result.

### MODIFIED Requirements

- List grouping and filtering (currently split across five `filter-notification-by-*` pipes) is redesigned into the All / Needs your decision / For your information tab split, while keeping Today/This week/Earlier recency grouping.
- Row anatomy (`notification-item`) gains a request-type chip and a funding-window tag alongside existing content.
- `contribution-request-drawer` is either generalized into the new shared detail panel or retired in its favor — to be decided in `/akili-specify` once the real data shape for non-contribution request types is confirmed.

### REMOVED Requirements

- The approval-chain section shown in the reference mockup is explicitly excluded from this spec's requirements (user decision, 2026-09-29).
- Beyond that, no other UI element the mockup drops (vs. current inbox) has been identified yet; anything else should be confirmed as intentional during `/akili-specify`, not assumed.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A — Generalize the existing drawer | Extend `contribution-request-drawer` into a shared detail panel that branches its content by request type | Reuses existing plumbing and state management; requires refactoring a component that's tightly coupled to the contribution-request shape today |
| B — New shared detail-panel component, deprecate the old drawer | Build one new component driven by a per-request-type content config (mirrors the mockup's `DETAILS` map), migrate contribution requests onto it, then remove the old drawer | Cleaner long-term shape, avoids fighting the old component's assumptions; more upfront work and a migration step |
| C — Keep both, panel only for new request types | Leave `contribution-request-drawer` as-is for contribution requests, add a separate panel for everything else | Fastest to ship; leaves the inbox with two visually different detail surfaces, which contradicts the point of this revamp |

## 11. Recommended Approach

**Option B.** The mockup's value is precisely that every request type gets the same detail-panel treatment (result card, metadata grid, optional AOW step) — Option C reintroduces the inconsistency this revamp exists to fix, and Option A risks bending a component built around one request shape to fit five. `/akili-specify` should confirm real backend data availability per field (see Risks) before committing to the panel's exact content per request type.

## 12. Risks, Dependencies, And Open Questions

- **Data availability is unconfirmed.** The mockup's result card, metadata grid, and "Map to your Theory of Change" section were built as plausible UI, not against a verified API response. Before `/akili-specify` locks requirements, confirm against `api/notification` and related endpoints which fields are already returned, which need a backend addition (out of this spec's scope per Non-Goals), and which should be dropped from the panel if genuinely unavailable.
- **Design is still moving.** The user has already said the current mockup needs corrections and is iterating in small steps ("vamos corrigiendo las cosas en el transcurso") — the approval-chain removal is the first such correction. Expect more adjustments during `/akili-specify`; treat the mockup as directional, not pixel-final.
- **Terminology consistency.** "Contribution request", "primary program request", "CG Center tagged", "bilateral project tagged", "contributor request" are the mockup's own labels — `/akili-specify` must reconcile these against the real `notification_type` entity values (`shared/constants/notification-type.constants.ts` on the client, `notification_type.entity.ts` on the server) so the UI never shows a label the data can't back.
- **Component migration risk.** Generalizing/retiring `contribution-request-drawer` (Option B) touches a component already in production use; needs a regression pass on existing contribution-request flows, not just new request types.
- Open question: does the detail panel replace the bell popup's own click-through behavior, or only the full inbox page? (Affects `notification-navigation.service.ts` scope.)

## 13. Success Criteria

- Every request type rendered in the inbox list opens the same shared detail-panel component on row click (except name/result-title links, which keep their own navigation).
- The AOW mapping section renders only fields confirmed available from real data — no placeholder or fabricated content ships to production. No approval-chain view ships in this pass.
- Existing contribution-request flows (accept/decline, navigation to the result) keep working after `contribution-request-drawer` is generalized or retired.
- The revised grouping/filtering preserves every filter currently available via the five `filter-notification-by-*` pipes (no silent feature loss).

## 14. Next Step

```text
/akili-specify notifications/inbox-revamp
```
