## Why

The in-browser AI assistant shipped as a fixed right-docked panel that covers the same slice of the screen no matter what the user is doing, and its chat surface was visually unfinished: purple-tinted unreadable body text, near-invisible header icons, flat launcher, and undifferentiated message bubbles. Users could not move it out of the way while comparing it against page content, and the look did not match the platform's navy + violet redesign line.

## What Changes

- Replace the right-docked slide-in panel with a **free-floating window** the user can:
  - **Drag** anywhere by its header.
  - **Resize** from any edge or corner (8-way handles), bounded by a minimum size and clamped inside the viewport.
  - **Reset** to the default bottom-right corner via a header control.
- **Persist** window geometry (position + size) to `localStorage` so it reopens where the user left it; re-clamp on viewport resize.
- Redesign the **launcher FAB**: violet-tinted layered depth, pulsing halo, twinkling sparkle; it hides while the window is open.
- Redesign the **chat surface** to the navy + violet line:
  - Distinct avatars/colors per role — robot + violet for the assistant, person + navy for the user.
  - Readable text using the project's real ink/gray tokens (`--pr-color-secondary-*` / `--pr-color-accents-*`) instead of the auto-generated `text-neutral-*` utilities, which are violet-tinted in this project.
  - Richer result cards (icon badge, status pill, chevron), action chips, and a subtly washed chat background.
- Make the **header icons** (reset, close) clearly visible; honor `prefers-reduced-motion` for every animation.

No changes to the assistant's engine, tool registry, model tiers, or data flow — this is a presentation + window-management change only.

## Capabilities

### New Capabilities
- `ai-assistant-window`: The assistant's window-management behavior — floating placement, drag, resize, viewport clamping, geometry persistence, and reset.

### Modified Capabilities
<!-- No existing archived spec owns the assistant chat presentation; its spec still lives inside the un-archived add-ai-assistant-chatbot change, so there is no delta to author here. -->

## Impact

- **Code:** `onecgiar-pr-client/src/app/shared/components/ai-assistant/ai-assistant-panel.component.ts` (window state, pointer-driven drag/resize, persistence), `ai-assistant-panel.component.html` (floating window markup, resize handles, redesigned FAB + chat), `ai-assistant-panel.component.scss` (new file: FAB depth, chat wash, resize-handle cursors, keyframes, reduced-motion).
- **Dependencies:** none added — pointer events + `requestAnimationFrame`, no CDK drag-drop.
- **APIs / backend:** none.
- **Storage:** adds one `localStorage` key (`prms-assistant-window`).
- **Gating:** unchanged — still behind `environment.aiAssistant.enabled`.
