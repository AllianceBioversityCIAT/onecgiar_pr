## ADDED Requirements

### Requirement: User identity is visible in the navigation bar

The top navigation bar (header-panel) SHALL display the authenticated user's avatar, full name, and email in the right-side information zone, always visible without requiring a click, on viewports wider than 768px.

#### Scenario: Identity shown on load

- **WHEN** an authenticated user loads any page that renders the header-panel on a desktop viewport (> 768px)
- **THEN** the header bar shows, in the information zone, the user avatar (initials), the user's `user_name`, and the user's `email`, alongside the existing what's-new and notifications icons

#### Scenario: Long name or email does not break the layout

- **WHEN** the user's name or email is long
- **THEN** the identity block constrains its width (truncating with ellipsis) so the header bar height and the logo/sections/icons remain unaffected

### Requirement: Identity block toggles the existing account menu

A chevron affordance next to the identity block SHALL toggle the existing user account popover, and the existing popover content and behavior SHALL be preserved.

#### Scenario: Open the menu

- **WHEN** the user clicks the identity block (avatar, name/email, or chevron)
- **THEN** the existing user popover opens, showing the Science Programs/Accelerators list, the Admin module link (only when the user is admin), and Log out — identical in content and behavior to the previous avatar-triggered popover

#### Scenario: Chevron reflects open state

- **WHEN** the popover is open
- **THEN** the chevron indicates the expanded state (e.g. rotates), and `aria-expanded` on the trigger is `true`; when closed it returns to the collapsed indication and `aria-expanded` is `false`

#### Scenario: Logout still works

- **WHEN** the user opens the menu and selects Log out
- **THEN** the session is logged out exactly as before

### Requirement: Identity trigger is accessible

The identity trigger SHALL be operable by keyboard and expose correct ARIA semantics.

#### Scenario: Keyboard operation

- **WHEN** the identity trigger has focus and the user presses Enter or Space
- **THEN** the popover toggles, and the trigger exposes `aria-haspopup`, `aria-controls` pointing to the popover, and an `aria-expanded` state that matches whether the popover is open

#### Scenario: Visible focus state

- **WHEN** the identity trigger receives keyboard focus
- **THEN** a visible focus indicator using `--pr-color-primary-300` is shown

### Requirement: Identity block is responsive

On small viewports the identity block SHALL collapse to avatar-only to preserve header space.

#### Scenario: Compact on small screens

- **WHEN** the viewport width is 768px or less
- **THEN** the header shows the avatar (with chevron) only; the name and email are not shown inline but remain available inside the popover

### Requirement: Identity styling uses design tokens

The identity block SHALL use `--pr-*` design tokens for all colors and SHALL NOT introduce hardcoded hex values.

#### Scenario: No hardcoded colors

- **WHEN** the identity block styles are authored
- **THEN** every color references a `--pr-color-*` token and no raw hex literal is added in the touched styles
