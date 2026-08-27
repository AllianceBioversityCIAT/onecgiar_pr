## 1. Floating bar + spacer (DONE)

- [x] 1.1 `header-panel.component.scss`: bar `position: fixed`, inset 10px, `border-radius: 18px`, height 56px, glass bg `rgba(secondary, 0.94)` + `backdrop-filter: blur`, border + shadow.
- [x] 1.2 Add `.header_spacer` (78px) in `header-panel.component.html` inside the `@if (!show_qa_full_screen)` block.
- [x] 1.3 `.header_hidden { transform: translateY(...) }` for the hidden state.

## 2. Hide-on-scroll (DONE)

- [x] 2.1 `header-panel.component.ts`: `isHidden` signal + `@HostListener('window:scroll')` with reveal zone (80px) and delta guard (8px).
- [x] 2.2 Bind `[class.header_hidden]="isHidden()"` on the bar.

## 3. Logo, user pill, nav active (DONE)

- [x] 3.1 Circular white logo chip.
- [x] 3.2 User trigger as white pill (dark text), avatar dark fill, popover `horizontalAlign="end"`.
- [x] 3.3 Nav typography (13px/500/+letter-spacing); active section as darker recessed box (`secondary-500` + inset shadow); hover brightens text.

## 4. Regressions found by exploration

- [x] 4.1 **Test-environment ribbon overlap** — move `test-environment-label` to `top: 60px` (below the bar) so it no longer covers the logo chip.
- [x] 4.2 **Verified (Playwright):** Result Detail sticky offsets align under the new spacer — `app-page-header` (top:79px) sits right below the bar, `.panel_menu` Sections aligned; no visible gap/overlap. Drift imperceptible.
- [ ] 4.3 **Verify (browser):** `global_information` banner active — no awkward gap/overlap with the floating bar. (Not triggered — banner flag off in this session.)
- [ ] 4.4 **Verify (browser):** P25 column drawer open/close — scroll-lock (`body.pr-p25-drawer-scroll-lock`) doesn't jump/break the fixed bar. (Edge case — not triggered.)
- [ ] 4.5 **Verify (browser):** wherever `app-dynamic-panel-menu` is used, its `top: 54px` sticky still aligns. (Separate context — not triggered.)
- [ ] 4.6 **Known limitation (documented):** hide-on-scroll does not fire inside `overflow-y:auto` routes (Result Detail / Results List); bar stays visible. Accepted for now; revisit if it bothers users.

## 5. Quality gates

- [x] 5.1 `header-panel.component.spec.ts` updated; `npm run test` for header-panel + navigation-bar passes (17/17).
- [x] 5.2 No hardcoded hex in touched SCSS (tokens only); no new inline `style="..."`.
- [x] 5.3 **Verified (Playwright):** hide-on-scroll-down + reveal-on-scroll-up (home + result detail, both window-scroll), user popover opens (click) with `aria-expanded=true`, chevron rotates, popover aligned right without overflow, full menu intact, ribbon below the bar. Screenshots in `.local-screenshots/`.
