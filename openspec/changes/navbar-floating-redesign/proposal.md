## Why

The top navigation bar looked dated: a full-width 80px sticky strip. As part of the `front-redesign` effort we modernized it into a compact, floating bar with a clearer visual hierarchy. This change documents and validates the visual overhaul that was iterated and approved with the user in the browser.

**Scope: frontend-only.** No backend, API, routing, or data changes. No Jira ticket assigned yet (exploratory `front-redesign` branch). Builds on the earlier `navbar-user-identity-visible` change (name+email now live inside the user trigger).

## What Changes

- **Floating compact bar:** `header-panel` goes from `position: sticky; height: 80px; full-width` to `position: fixed` with a 10px inset on all sides, `border-radius: 18px`, height **56px**, subtle border + shadow. A new in-flow `.header_spacer` (78px) reserves the vertical space the fixed bar no longer occupies — it lives inside the same `@if (!show_qa_full_screen)` block so QA full-screen reserves none.
- **Glass / dark look:** translucent dark background `rgba(secondary, 0.94)` + `backdrop-filter: blur` (glassmorphism), tunable.
- **Hide-on-scroll:** scrolling down past an 80px reveal zone slides the bar up (hidden); scrolling up reveals it. Implemented via `@HostListener('window:scroll')` toggling an `isHidden` signal bound to `.header_hidden` (CSS transform transition). 8px delta guard against jitter.
- **Circular logo:** the PR logo is shown inside a white circular chip.
- **User as white pill:** the user trigger (avatar + name + email + chevron) is a white rounded pill with dark text; avatar gets a dark fill for contrast. Popover anchor switched to `horizontalAlign="end"` so it doesn't overflow the right edge.
- **Nav items modernized:** smaller type (13px / 500 / +letter-spacing), full-bar-height items; the **active section** shows a darker recessed box behind the text (same bar color, darker `secondary-500` + inset shadow). Hover brightens the text.

## Capabilities

### New Capabilities
- `navbar-appearance`: Visual presentation and scroll behavior of the top navigation bar — floating/fixed layout + spacer, glass background, hide-on-scroll, logo chip, user pill, and active-section indicator.

### Modified Capabilities
<!-- None at the requirement level: navbar-user-identity-visible still holds (name+email visible + popover). This change only restyles it. -->

## Impact

- **Files:** `header-panel.component.{html,scss,ts}` and `navigation-bar.component.scss`. Test updated: `header-panel.component.spec.ts`.
- **Cross-cutting risk (sticky → fixed):** any page that assumed an 80px sticky header for its own offsets, sticky sub-headers, or scroll-into-view math. The accompanying exploration validates this; findings drive `design.md` / `tasks.md`.
- **`global_information` banner** (sibling above the header in `app.component.html`): potential overlap with the fixed bar — to be verified.
- **Hide-on-scroll** assumes window-level scrolling; routes with their own scroll container would not trigger it — to be verified.
- **No API / server / DB / migration impact.** Client coverage thresholds (50/60/60/60) preserved.
