## Context

`header-panel` is the app shell's top bar, rendered once in `app.component.html` (sibling after the optional `global_information` banner, before `router-outlet`). It was `position: sticky; top: 0; height: 80px; width: 100%`. This change makes it a floating fixed bar and adds a `.header_spacer` to preserve flow height. The bar also auto-hides on scroll-down via a `window:scroll` listener.

An impact exploration (read-only) validated the sticky→fixed switch across the client. Findings are folded into Decisions / Risks below.

## Goals / Non-Goals

**Goals:**
- Modern compact floating bar (fixed + inset + radius + glass), hide-on-scroll, circular logo, white user pill, darker recessed active-section box.
- Keep page content correctly offset (spacer) and not break the QA full-screen mode.
- Address the concrete regressions the exploration surfaced.

**Non-Goals:**
- No refactor of how scrolling works app-wide (window vs internal containers) — see the known limitation below.
- No change to nav routing, popover contents, or any backend.
- No re-theming beyond the navbar.

## Decisions

- **Fixed + spacer over sticky.** A `.header_spacer` (78px = 10 inset + 56 bar + 12 breathing) inside the `@if (!show_qa_full_screen)` block reserves flow space; QA full-screen renders neither bar nor spacer. Validated correct by the exploration.
- **Color iteration (final state).** Background started as glass (`rgba(secondary,.94)` + blur), tried dark-purple tokens, and landed on a **dark primary gradient** `primary-700 → primary-950` (opaque, on-brand). The active-section indicator went underline → recessed dark box (`secondary-500`) → **primary gradient box** `primary-400 → primary-300` + soft glow. The temporary `--pr-color-purple-dark-*` tokens were removed once the purple variant was dropped.
- **Hide-on-scroll on `window:scroll`.** Toggles an `isHidden` signal → `.header_hidden` transform. Reveal zone 80px, 8px jitter guard.
- **Test-environment ribbon moved below the bar.** `test-environment-label` was `fixed; top:0; z-index:1000` and now overlaps the floating bar's white logo chip. Fixed by moving it to `top: 60px` (below the bar). Chosen over raising the header z-index, which risks covering modals/drawers.
- **Sticky offsets left as-is (verify).** `result-detail.component.scss` `app-page-header { top: 79px }` and `.panel_menu { top: 144px }` were tuned to the old 80px sticky header; the new spacer is 78px (≈ same), so drift is ~1–2px — keep unless visual check shows misalignment.

## Risks / Trade-offs

- **🛑→⚠️ Hide-on-scroll only fires on window scroll (KNOWN LIMITATION).** Routes that scroll inside an `overflow-y:auto` container (Result Detail sections, Results List filters, panel-menu) won't auto-hide the bar — it simply stays visible (safe default, not broken). A full fix means observing those containers too; deferred. Documented, not silently dropped.
- **⚠️ `global_information` banner** (when active) sits above a now-floating bar — possible visual gap. Verify when the banner is enabled.
- **⚠️ P25 drawer scroll-lock** (`styles.scss body.pr-p25-drawer-scroll-lock`) was written "so the sticky app header is not broken by overflow:hidden". With a fixed header the lock should still hold (fixed is viewport-relative), but verify drawer open/close doesn't jump the bar.
- **⚠️ `dynamic-panel-menu` `top: 54px`** is its own sticky context; verify wherever it's used that 54px still aligns.
- **Glass `backdrop-filter`** has minor cost on low-end GPUs; acceptable for a single small element. `-webkit-` prefix included for Safari.
