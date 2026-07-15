# Tasks

> Frontend-only change. No backend/server tasks, no migrations, no git state changes.
> The control was built UI-first on `front-redesign-fields` and verified in-browser; items
> already done are checked, closing items remain open.

## 1. CSS lever + global utility (frontend)

- [x] 1.1 In `src/styles.scss` `:root`, add `--pr-font-scale: 1` and `zoom: var(--pr-font-scale, 1)` (the whole-app scale lever), with a comment explaining why `zoom` (not root font-size) is used.
- [x] 1.2 In `src/styles.scss`, add a `.sr-only` utility (Tailwind preflight is not imported), for the control's `aria-live` announcement.

## 2. Persistence + flash-free bootstrap (frontend)

- [x] 2.1 Create `src/app/shared/services/font-scale.service.ts` — `FontScaleService` with `scale = signal<FontScale>()`, a constructor `effect()` that writes `--pr-font-scale` on `document.documentElement` and persists to `localStorage['pr.a11y.fontScale']`; `set()` / `reset()` / `currentLabel()`; storage failures swallowed. Export `FontScale` type + `FONT_SCALE_OPTIONS` (default 1.0 / large 1.15 / larger 1.30 / largest 1.50).
- [x] 2.2 In `src/index.html` `<head>`, add the inline `<script>` that reads `pr.a11y.fontScale` and sets `--pr-font-scale` before first paint (mirrors the service factors).

## 3. Text-size control in the header (frontend)

- [x] 3.1 In `src/app/shared/components/header-panel/header-panel.component.ts`: inject `FontScaleService`, add `settingsMenuOpen` signal + positions, `viewChildren('fontRadio')`, and `selectFontScale` / `onFontRadioKeydown` (roving tabindex: Arrow/Home/End) / `closeSettingsAndRefocus`. Import `A11yModule`.
- [x] 3.2 In `src/app/shared/components/header-panel/header-panel.component.html`: add the trigger button (`format_size`, `aria-label="Text size"`, `aria-haspopup="menu"`, `aria-expanded`, `cdkOverlayOrigin`) and the `cdkConnectedOverlay` panel — `role="radiogroup"` of 4 `role="radio"` options (growing "A" preview + label, `aria-checked`, roving `tabindex`), "Reset to default", `aria-live` region, `cdkTrapFocus`, Escape → close + refocus.

## 4. Navbar action-icon labels (frontend)

- [x] 4.1 In `header-panel.component.html`, convert the Search, What's new, Alerts, and Text size action buttons to vertical icon+label (20px icon + 9px label), preserving active/hover states; ensure the Text size control uses the `format_size` glyph (not `more_vert`).

## 5. Verification (UI)

- [x] 5.1 In the running app (`npm start`), open the Text size control: confirm the 4 options render, selecting each sets `--pr-font-scale` to 1 / 1.15 / 1.3 / 1.5 and the whole app (including this page's overlays) scales.
- [x] 5.2 Confirm persistence: pick "Largest", reload — the app renders at 1.5× with no flash and "Largest" shown selected. Then "Reset to default" returns to 1.
- [x] 5.3 Confirm keyboard/ARIA: ArrowRight moves focus + selection across radios; Escape closes and refocuses the trigger; `aria-checked` tracks the selection.
- [x] 5.4 Confirm no page-level horizontal overflow at 1440px and 1024px with the new navbar labels.
- [x] 5.5 Add Jest unit tests for `FontScaleService` — `font-scale.service.spec.ts`, 13 tests: default read, persisted read, invalid-value fallback, `getItem`/`setItem` unavailable no-throw, effect writes `--pr-font-scale` + localStorage per step (1/1.15/1.3/1.5), `reset`, `currentLabel`. All green (uses `TestBed.tick()`).

## 6. Housekeeping

- [ ] 6.1 Assign the P2 Jira ticket for this shell/accessibility work and reference it in the commit (`<emoji> feat(header-panel) P2-XXXX: …`).
- [x] 6.2 Promote the text-size / navbar-label pattern into `docs/system-design/design.md`: added §10 a11y row (User text-size control), **DD-11** (whole-app scaling via root `zoom`), and **OG-9** (deferred px→rem baseline). Archive with `/opsx:archive` once the P2 ticket (6.1) lands in the commit.
