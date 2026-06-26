## Why

The logged-in user's identity (name and email) is currently hidden behind the avatar popover in the top navigation bar: the user must click the `YZ` avatar to discover who they are signed in as. For a reporting platform where users switch between accounts, environments (prtest/staging/prod) and impersonation contexts, "who am I logged in as?" should be answerable at a glance, not after a click. This is the first increment of the broader platform navigation-bar redesign.

**Scope: frontend-only.** No backend changes. No Jira ticket assigned yet — this is part of the `front-redesign` exploratory branch; ticket to be linked when the redesign is formalized.

## What Changes

- Surface the **avatar + full name + email** always visible in the header bar's right-side `information` zone, next to the what's-new (rocket) and notifications (bell) icons.
- Add a **chevron (▾)** affordance next to the identity block that toggles the **existing** user popover menu (Science Programs/Accelerators list, Admin module link, Log out).
- The whole identity block (avatar + name/email + chevron) acts as the popover anchor and trigger — replacing the current "avatar-only" trigger.
- **Responsive:** on small screens (≤768px) collapse the identity block back to avatar-only to preserve space; name/email move into the popover at that breakpoint.
- Preserve everything else unchanged: logo block, navigation-bar sections, notifications bell + badge + animation, rocket/what's-new, and the full popover content and behavior (initiatives list, closed-initiative styling, admin link gating, logout).
- Accessibility preserved/extended: `aria-expanded`, `aria-haspopup`, `aria-controls`, and keyboard (Enter/Space) handlers on the new trigger; visible focus state using `--pr-color-primary-300`.
- Styling uses `--pr-*` tokens only — no hardcoded hex; inline `style="border-...transparent"` on header icons replaced with classes where touched.

## Capabilities

### New Capabilities
- `navbar-user-identity`: Display of the authenticated user's identity (avatar, name, email) in the top navigation bar and the trigger/menu affordance that exposes the user account popover (initiatives, admin, logout).

### Modified Capabilities
<!-- None: no existing OpenSpec capability spec governs the header-panel today. -->

## Impact

- **Component:** `onecgiar-pr-client/src/app/shared/components/header-panel/header-panel.component.{html,scss,ts}`.
- **Child component (unchanged):** `app-navigation-bar` (sections nav) — untouched.
- **Data sources (read-only):** `authSE.localStorageUser` (`user_name`, `email`), `getUserInitials()`, `getInitiativeSeparatedByPortfolio()`, `rolesSE.isAdmin`, notifications state — all already present in the component.
- **SDD baseline:** UI/UX decisions to be reflected in `docs/system-design/design.md` (§ navigation / header) once accepted.
- **No API, no server, no DB, no migration impact.**
- **Tests:** update `header-panel.component.spec.ts`; keep client coverage thresholds (50/60/60/60).
