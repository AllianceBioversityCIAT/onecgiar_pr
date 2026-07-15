# Tasks

> Implemented on branch `front-redesign-fields` (commit `8e4b54977`). Boxes reflect actual state.

## 1. Window state & geometry (component TS)

- [x] 1.1 Add a `WritableSignal<{x,y,w,h}>` for window geometry with a `computed` style map
- [x] 1.2 Initialize geometry from `localStorage` (validated + clamped to viewport) or a bottom-right default
- [x] 1.3 Persist geometry on gesture end and re-anchor to default on first open when nothing is stored
- [x] 1.4 Re-clamp geometry on `window:resize` and re-persist

## 2. Drag & resize interaction (component TS)

- [x] 2.1 Start a drag on header `pointerdown` (ignore presses on header controls)
- [x] 2.2 Start a resize on handle `pointerdown` for the 8 directions (n/s/e/w + corners)
- [x] 2.3 Drive `pointermove`/`pointerup` on `window`; compute new rect with min-size and viewport clamping
- [x] 2.4 Batch updates with `requestAnimationFrame`; commit to the signal once per frame
- [x] 2.5 Make `setPointerCapture` best-effort (try/catch) and restore `user-select` on release
- [x] 2.6 Add a `resetWindow()` that writes the default rect and persists

## 3. Floating window markup (template)

- [x] 3.1 Render the window with `@if (isOpen())` and bind the geometry style
- [x] 3.2 Add 8 resize handles (edges + corners) with pointer bindings
- [x] 3.3 Header as drag handle with visible reset + close controls and a grip affordance
- [x] 3.4 Preserve all existing states (detecting / unsupported / needs-optin / downloading / error / chat)

## 4. Launcher FAB redesign (template + scss)

- [x] 4.1 Layered violet-tinted shadow, top highlight, pulsing halo, twinkling sparkle
- [x] 4.2 Hide/scale-out the FAB while the window is open

## 5. Chat surface redesign (template + scss)

- [x] 5.1 Role avatars with distinct colors: robot/violet for assistant, person/navy for user
- [x] 5.2 Replace `text-neutral-*` with real ink/gray tokens (`text-secondary-400`, `text-accent-*`)
- [x] 5.3 Redesign result cards (icon badge, status pill, chevron) and action chips
- [x] 5.4 Add the subtly washed chat background
- [x] 5.5 Style the thinking/loading state as an avatar + dots/activity bubble

## 6. Motion & accessibility (scss)

- [x] 6.1 Define keyframes for twinkle / halo / pop-in
- [x] 6.2 Add a `prefers-reduced-motion: reduce` alternative that disables the animations

## 7. Local verification

- [x] 7.1 Verify FAB, open/close, drag (moves + clamps), and resize (grows/min) in the browser
- [x] 7.2 Verify chat rendering (avatars, readable text, cards, chips) via representative messages
- [x] 7.3 Confirm geometry persists to `localStorage` and re-clamps on viewport resize
