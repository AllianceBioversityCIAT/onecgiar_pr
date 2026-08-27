## Context

The header-panel (`shared/components/header-panel/`) renders the top bar: logo block (left), `<app-navigation-bar>` (center sections), and an `information` flex zone (right) with what's-new (rocket), notifications (bell + `sat-popover`), and a user avatar `p-avatar` that anchors a second `sat-popover` (`#userInfoPopover`). The user popover already contains name, email, initiatives list, admin link, and logout. Today only the avatar is in the bar; identity is hidden until the popover opens.

All data needed is already in the component: `authSE.localStorageUser.user_name` / `.email`, `getUserInitials()`, `getInitiativeSeparatedByPortfolio()`, `rolesSE.isAdmin`. No new service calls.

## Goals / Non-Goals

**Goals:**
- Show avatar + name + email inline in the bar, always visible on desktop.
- Make the whole identity block the popover trigger, with a chevron that reflects open/closed state.
- Preserve the existing popover content/behavior verbatim.
- Keep a11y (aria-expanded/haspopup/controls + keyboard) and add a visible focus state.
- Collapse to avatar-only ≤768px.
- Tokens only, no hardcoded hex.

**Non-Goals:**
- No change to navigation-bar sections, notifications, rocket, or logo.
- No change to popover contents (initiatives/admin/logout) beyond moving the anchor.
- No broader bar refresh (spacing/divider/token sweep) — that is a separate increment.
- No backend, API, or routing changes.

## Decisions

- **Trigger element:** wrap avatar + identity text + chevron in a single `<button>` (or `<div role="button">`) that is the `satPopoverAnchor` and calls `userInfoPopover.toggle()`. This replaces the avatar-only button as the anchor. Keeps one accessible control instead of several.
- **Chevron:** material-icons-round `expand_more`, rotated 180° when `userInfoPopover.isOpen()` via a class binding; CSS `transition: transform` for the rotate.
- **Identity text layout:** name (`pr-body-1`/600 weight) over email (`pr-body-3`, `--pr-color-primary-100`/muted on the dark bar), in a flex column; `max-width` + `text-overflow: ellipsis` to protect the layout. Text color must read on the `--pr-color-secondary-300` bar background (use white / primary-100).
- **a11y:** trigger gets `aria-haspopup="true"`, `aria-controls="user-info-popover"`, `[attr.aria-expanded]="userInfoPopover.isOpen()"`, `aria-label` fallback, and `(keydown.enter)` / `(keydown.space)` handlers mirroring existing patterns in this file. Add `:focus-visible` outline with `--pr-color-primary-300` (matches the file's existing focus rule).
- **Responsive:** `@media (max-width: 768px)` hides `.user_identity_text` and the chevron stays with the avatar; name/email remain in the popover header (already rendered there).
- **Styling hygiene:** the inline `style="border-bottom/top: 4px solid transparent"` repeated on the rocket/notifications/avatar buttons — for the user trigger, replace with a class while we're here; leave the other two as-is to keep the diff focused.

## Risks / Trade-offs

- **Header crowding:** adding text to the right zone could crowd narrow desktop widths. Mitigated by max-width + ellipsis and the 768px collapse; verify at ~1024px.
- **Trigger semantics:** nesting the `p-avatar` inside a button is fine, but ensure no nested interactive elements (avatar is presentational). Keep it a single control.
- **Popover anchor move:** `sat-popover` alignment (`horizontalAlign="center"`) is relative to the anchor; moving the anchor from the small avatar to the wider block may shift the popover position. Verify it still aligns under the identity block; adjust `horizontalAlign` to `end` if it drifts off-screen on the right edge.
- **Tests:** `header-panel.component.spec.ts` may assert the avatar trigger; update selectors to the new identity trigger. Keep coverage ≥ thresholds.
