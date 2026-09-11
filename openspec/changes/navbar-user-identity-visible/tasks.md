## 1. Template — identity trigger

- [x] 1.1 In `header-panel.component.html`, replace the avatar-only user button with a single identity trigger `<button class="user_identity">` that wraps: `p-avatar` (initials), a `.user_identity_text` column (name + email), and a chevron `<i class="material-icons-round">expand_more</i>`.
- [x] 1.2 Make the new trigger the `[satPopoverAnchor]="userInfoPopover"` and `(click)="userInfoPopover.toggle()"`; bind chevron rotation class to `userInfoPopover.isOpen()`.
- [x] 1.3 Add a11y to the trigger: `aria-haspopup="true"`, `aria-controls="user-info-popover"`, `[attr.aria-expanded]="userInfoPopover.isOpen()"`, `aria-label`, and `(keydown.enter)` / `(keydown.space)="$event.preventDefault(); ..."` handlers mirroring existing buttons in this file.
- [x] 1.4 Bind name to `authSE.localStorageUser?.user_name` and email to `authSE.localStorageUser?.email`; keep `getUserInitials()` for the avatar.

## 2. Styles

- [x] 2.1 In `header-panel.component.scss`, add `.user_identity` (flex row, gap, cursor, transparent borders class replacing the inline style) and `.user_identity_text` (flex column; name `pr-body-1`/600, email `pr-body-3`).
- [x] 2.2 Color text for the dark bar using tokens (`--pr-color-white` for name, `--pr-color-primary-100` for email); no hardcoded hex.
- [x] 2.3 Add `max-width` + `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on name/email to protect the layout.
- [x] 2.4 Add chevron rotate transition (`.chevron_open { transform: rotate(180deg); }` + `transition: transform .2s`).
- [x] 2.5 Add `:focus-visible` outline using `--pr-color-primary-300` for `.user_identity` (match existing focus rule).
- [x] 2.6 Add `@media (max-width: 768px)` rule to hide `.user_identity_text` (avatar + chevron only); confirm name/email still render inside the popover header.

## 3. Popover alignment

- [x] 3.1 Verify `#userInfoPopover` still aligns under the wider trigger; if it drifts off the right edge, switch `horizontalAlign` to `end`.

## 4. Verify & test

- [x] 4.1 Update `header-panel.component.spec.ts` selectors to target the new identity trigger; keep/extend coverage (client thresholds 50/60/60/60).
- [x] 4.2 `npm run test src/app/shared/components/header-panel/header-panel.component.spec.ts` passes.
- [ ] 4.3 Manual: `npm start`, sign in, confirm name+email visible on desktop, popover opens on click + keyboard, chevron rotates, logout works, and ≤768px collapses to avatar-only. Capture before/after screenshots to `.local-screenshots/`.
- [x] 4.4 No `style="..."` added; no hardcoded hex introduced (`grep` the touched files).
