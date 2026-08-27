## Why

P2-3106 (reporter Santiago Sanchez): small UX updates to the Notifications tab and the contributor-request accept flow, to improve context and streamline reporting. Frontend-only.

Jira ticket: **P2-3106** (parent P2-2338).

## What Changes

- **AC1 — Helper text (Requests sub-tab):** replace the existing "In this section, there are requests…" description with the new collaboration-requests text (Programs/Accelerators or W3/Bilateral).
- **AC2 — Default phase selection:** the "Phases" dropdown auto-selects the current active reporting phase on render (instead of the "Select phase" placeholder), and the dependent "Entity" dropdown updates accordingly. Respect an explicit phase passed via query params.
- **Button rename:** in the notification item, "Map and accept" → **"Accept contribution"** and "Reject" → **"Decline contribution"** (unify across cases; bilateral already uses these).
- **Dynamic Accept validation (ToC alignment Yes/No) in the contributor-request modal:**
  - "No" (default): Accept enabled, no ToC fields required.
  - "Yes": ToC selection fields shown and mandatory; Accept disabled until they are filled.

## Capabilities

### New Capabilities
- `notifications-tab-ux`: the Notifications Requests helper text, the default-phase behavior of the Phases/Entity filters, the accept/decline button labels, and the ToC-alignment-driven enable/disable rule of the Accept action in the contributor-request modal.

### Modified Capabilities
<!-- none -->

## Impact

- `results-notifications.component.html` / `.ts` — helper text + default phase selection (+ entity refresh).
- `notification-item.component.html` — button labels.
- `share-request-modal.component.ts` (`validateAcceptOrReject`) — make the ToC requirement apply only when planned_result is Yes; scope to the notifications flow (`dataControlSE.inNotifications`) so the result-detail share flow is unaffected.
- Possibly the modal's default `planned_result` (No) in the notifications context.
- No backend. Shared `share-request-modal` is used by both notifications and result-detail share — the validation change MUST be scoped so result-detail behavior is unchanged.
