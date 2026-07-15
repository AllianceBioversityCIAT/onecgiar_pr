## Why

The PRMS client sets a **12px** base font size — below the 16px web-standard body minimum (NN/g, MDN, WCAG, Material Design 3, Apple HIG) — and offers **no way for low-vision users to enlarge text**, a WCAG 2.2 §1.4.4 (Resize Text) gap. This change ships a user-controlled text-size control immediately, with **zero visual regression at the default**, while deferring the deeper baseline fix to a separate future change.

This is a **frontend-only** change. No backend work is required.

Part of the `front-redesign-fields` shell/navbar redesign effort (no dedicated P2 ticket yet — to be assigned before merge; the branch is not named after a single ticket).

## What Changes

- Add a **"Text size" control** to the top navigation (`header-panel`) using a `format_size` icon. It opens a CDK overlay panel with a WCAG 2.2 **radiogroup** of 4 discrete steps: **Default (1.0), Large (1.15), Larger (1.3), Largest (1.5)**.
- The control scales the **whole app** via a single lever: a CSS custom property `--pr-font-scale` on `:root`, consumed by `html { zoom: var(--pr-font-scale) }` in `styles.scss`. `zoom` is used (not a root `font-size`) because the type scale is authored across ~212 hardcoded `px` sites that a root font-size lever would not cascade to; `zoom` scales px/em/rem **and** CDK overlays/dialogs uniformly. Native browser zoom still stacks on top (so WCAG 1.4.4's 200% remains reachable).
- Add a **`FontScaleService`** (Angular signal + effect) that writes the CSS var and **persists** the choice to `localStorage` (`pr.a11y.fontScale`). A small **flash-free inline script** in `index.html` applies the saved value before first paint.
- Add a `.sr-only` utility to `styles.scss` (Tailwind's preflight is intentionally not imported, so it is not otherwise available) for the control's `aria-live` announcement.
- **Navbar UX:** the header action icons (Search, What's new, Alerts, Text size) now show a **small text label beneath each icon** so their purpose is clear.
- **Decision captured (not code scope here):** the 12px base **stays** for now to preserve the intended dense layout; a full `px→rem` migration to raise the default baseline (body ~14–16px, tables 13–14px) is a **separate deferred future change**.

## Capabilities

### New Capabilities
- `shell-accessibility`: shell-level accessibility affordances in the app chrome — starting with a user-controlled, persisted text-size (font scaling) control in the top navigation, its keyboard/ARIA contract (WCAG 2.2), and the navbar action-icon labelling that supports it.

### Modified Capabilities
<!-- None — no existing capability's requirements change. -->

## Impact

- **Frontend only.** Files touched:
  - `src/styles.scss` — `--pr-font-scale` + `html { zoom: … }` lever + `.sr-only` utility.
  - `src/index.html` — inline flash-free bootstrap script.
  - `src/app/shared/services/font-scale.service.ts` — **new** service (signal + localStorage).
  - `src/app/shared/components/header-panel/header-panel.component.{ts,html}` — text-size control (CDK overlay radiogroup), navbar icon labels, `A11yModule` import.
- **Dependencies:** uses existing `@angular/cdk` (`OverlayModule` already in use; adds `A11yModule` for `cdkTrapFocus`). No new packages.
- **Stack:** Angular 21 + Tailwind v4 + Spartan, zoneless.
- **Browser support:** relies on CSS `zoom` (all current engines incl. Firefox 126+); acceptable for this internal enterprise app.
- **SDD baseline:** aligns with `docs/system-design/design.md` §10 (a11y — visible focus rings via `--pr-color-primary-300`, never remove outlines) and the "no dark mode / light only" stance (unaffected). No backend or API contract impact.
- **No backend changes.**
