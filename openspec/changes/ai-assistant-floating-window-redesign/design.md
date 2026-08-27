## Context

The assistant renders from `AiAssistantPanelComponent` (standalone, OnPush, signals) and reads all state from `AiAssistantService`. Before this change the panel was a fixed right-docked `<section>` toggled with `translate-x` classes. The component only owned `draft`, `downloadMB`, and `progressPct`; everything else was service-driven. Styling was Tailwind-only (utilities + brand tokens exposed through `@theme` in `styles.scss`). The project imports `@angular/cdk` and Tailwind 4, and the app runs light-mode only.

A project-specific quirk shapes the visual fix: `fonts.scss` auto-generates `.text-neutral-*` utility classes from the PRMS `--pr-color-neutral-*` ramp, which is violet/mauve-tinted — so Tailwind's neutral grays are shadowed by tinted ones for `text-*` (but not `bg-*` / `border-*`, which fall through to Tailwind defaults). The real neutral grays are the `accents` ramp (`--pr-color-accents-1..8`, `#fafafa → #111`) and the ink is `--pr-color-secondary-400`.

## Goals / Non-Goals

**Goals:**
- Make the assistant a movable, resizable floating window with persisted geometry.
- Keep 60fps during drag/resize with no new dependencies.
- Bring the FAB and chat up to the navy + violet design line with correct contrast.
- Preserve every existing state (detecting / unsupported / needs-optin / downloading / error / chat) and all service wiring.

**Non-Goals:**
- No changes to the assistant engine, tool registry, model tiers, WebGPU/WebLLM flow, or data.
- No keyboard-driven resize (mouse/pointer only for now).
- No dark mode (app is light-only).
- No multi-window or docking presets beyond the single reset-to-corner.

## Decisions

- **Pointer events over CDK DragDrop.** `CdkDrag` moves via transform and does not compose cleanly with an 8-way resize plus viewport clamping and persistence. A small pointer-event manager (`pointerdown` on header/handles → `pointermove`/`pointerup` on `window`) gives full control of both gestures with zero added bundle. Alternative considered: CDK — rejected for the resize/clamp mismatch.
- **`requestAnimationFrame` batching.** `pointermove` fires faster than paint; the handler stores a `pending` rect and commits it to the `win` signal once per frame. Keeps the single OnPush component re-rendering at most once per frame. Alternative: write styles imperatively outside Angular — rejected as it fights the `[style]` signal binding.
- **Geometry as one `WritableSignal<{x,y,w,h}>`.** Bound to the window via a `computed` style map. Initialized from `localStorage` (clamped to the current viewport) or a bottom-right default; persisted on gesture end and on viewport resize. Reset writes the default and persists.
- **`setPointerCapture` is best-effort.** Wrapped in try/catch — an inactive/synthetic pointer id throws `InvalidPointerId`; capture failing must not abort the gesture.
- **Window rendered with `@if (isOpen())`.** Re-mounting replays the pop-in animation and keeps off-screen handles from being interactive when closed. The FAB stays mounted and scales/fades out while open.
- **Color tokens, not `text-neutral-*`.** Body/heading text uses `text-accent-*` and `text-secondary-400`; `bg-*` / `border-*` neutrals are kept (they resolve to real grays). Role identity: assistant = violet (`--pr-color-primary-*`), user = navy (`--pr-color-secondary-400`).
- **Component `.scss` for what Tailwind can't express.** Keyframes (twinkle / halo / pop), resize-handle cursors and hit-areas, layered FAB shadow, chat wash, and the `prefers-reduced-motion` reset live in a component stylesheet; everything else stays Tailwind utilities.

## Risks / Trade-offs

- [Window dragged partly off-screen after a viewport shrink] → `window:resize` handler re-clamps size and position and re-persists.
- [Stale/malformed `localStorage` value] → read is wrapped in try/catch and validated (all of x/y/w/h numeric) before use; falls back to the default rect.
- [Resize handles overlapping scroll/content near edges] → handles are thin (≈9px edges, ≈18px corners) with their own `z-index` above content, inset slightly over the frame.
- [Pointer capture edge cases across browsers] → capture is best-effort; the gesture is driven by `window`-level listeners regardless, so it still completes without capture.
- [No keyboard resize] → accepted; the window is fully usable at any size and content scrolls, default size covers the common case.

## Migration Plan

Additive and self-contained. Ships on `front-redesign-fields`. Rollback = revert the three component files; the `localStorage` key is inert if unused. No data or API migration.

## Open Questions

- Should result-card status pills use PRMS semantic status colors (green "Quality Assessed", blue "Submitted") instead of the single violet accent? Deferred pending Yeck's call.
