## Context

The PRMS client (`onecgiar-pr-client`, Angular 21 + Tailwind v4 + Spartan, zoneless) sets `html, body { font-size: 12px }` in `src/styles/fonts.scss` and authors its type scale (`$pr-typography` map) and ~212 component font-sizes in **absolute px**. Research (NN/g, MDN, WCAG 2.2, Material 3, Apple HIG) puts the body-text floor at 16px; 12px is defensible only for dense data UI, and even then the app must let users enlarge text (WCAG 2.2 §1.4.4). Today there is no in-app control and no font scaling of any kind.

The shell chrome lives in `src/app/shared/components/header-panel/`, which already renders overlays (user menu, notifications) via `@angular/cdk` `cdkConnectedOverlay`. That is the natural home for the control.

## Goals / Non-Goals

**Goals:**
- Give users a persisted, keyboard-accessible control to enlarge the whole app (WCAG 2.2 §1.4.4), from a single insertion point.
- Zero visual regression at the default setting.
- Make the navbar action icons self-explanatory (labels + a size-indicating icon for the control).

**Non-Goals:**
- Changing the 12px default baseline or the authored type scale (deferred `px→rem` migration is a separate future change).
- Font-only scaling (we scale the whole UI, see Decisions).
- Dark mode, density modes, or any other shell preference (the control's panel is scoped to "Text size" only, though the pattern can host more later).
- Backend changes (none).

## Decisions

**1. Mechanism: `zoom` on `:root`, not root `font-size`.**
The textbook accessible-resize approach (root `font-size` + rem everywhere) does not work here: with ~212 hardcoded px font-sizes, a root `font-size` lever cascades to almost nothing. The only single insertion point that scales the whole app across the px/em/rem mix — **and** CDK overlays/dialogs rendered at document level — is CSS `zoom` on the root:
```
:root { --pr-font-scale: 1; zoom: var(--pr-font-scale, 1); }
```
`zoom` is also *safer* than font-only scaling in a dense app: containers grow with their text, so fixed-height rows/buttons don't clip. `transform: scale()` was rejected (breaks layout flow, needs width compensation). Native browser zoom stacks multiplicatively on top, so WCAG's 200% remains reachable and is never disabled.

**2. Four discrete named steps, not a slider.** Default 1.0 / Large 1.15 / Larger 1.30 / Largest 1.50 — a WCAG `radiogroup`, matching GOV.UK/USWDS-style stepped controls. Capped at 1.5 (12px already small ⇒ no step below 1.0; browser zoom covers beyond).

**3. State: a signal service + effect (zoneless-friendly).** `FontScaleService` holds `scale = signal<FontScale>()`; a constructor `effect()` writes `--pr-font-scale` on `document.documentElement` and persists to `localStorage['pr.a11y.fontScale']` on every change. Storage failures are swallowed (private mode).

**4. Flash-free apply.** A tiny inline `<script>` in `index.html` reads the saved key and sets `--pr-font-scale` **before first paint**, so a returning "Largest" user never sees a 1.0→1.5 jump. The service re-applying the same value on init is a harmless no-op.

**5. Control housing + a11y.** A trigger button in `header-panel` (icon `format_size`, `aria-label="Text size"`, `aria-haspopup="menu"`, `aria-expanded`) opens a `cdkConnectedOverlay` panel: a `role="radiogroup"` (aria-label "Text size") of 4 `role="radio"` buttons (each shows a growing "A" preview + label), roving `tabindex`, Arrow/Home/End keyboard nav, `aria-checked`, an `aria-live="polite"` announcement, `cdkTrapFocus`, and Escape → close + refocus trigger. Requires importing `A11yModule` (for `cdkTrapFocus`). A `.sr-only` utility is added to `styles.scss` because Tailwind's preflight is intentionally not imported.

**6. Navbar labels.** The header action icons become vertical icon+label buttons (Search / What's new / Alerts / Text size), 20px icon + 9px label, keeping the existing active/hover states. Improves comprehension and supports the new control's discoverability.

## Risks / Trade-offs

- **`zoom` scales layout, not just type.** Accepted deliberately: for a dense app this avoids the clipped-label / fixed-height class of bugs that font-only scaling causes, at the cost of "font-only" purity. Documented so the deferred px→rem change can revisit if true font-only scaling is ever wanted.
- **`zoom` browser support.** Standardized and shipping in all current engines (incl. Firefox 126+). Acceptable for an internal enterprise app on modern browsers; not a public site targeting legacy browsers.
- **Compounding with browser zoom.** Intended (they multiply, never conflict). QA must check dense tables, sticky headers, and overlays at each step **and** at 200% browser zoom on top — cells should scroll in their own container, not the page body (WCAG 1.4.10 Reflow).
- **Navbar width.** Labels widen the action buttons slightly; verified no page overflow at 1440 and 1024. On very narrow widths the existing responsive behavior (user-pill truncation) still applies.
- **Does not fix the real baseline.** 12px stays; this is an opt-in mitigation, not the cure. The follow-up px→rem migration is called out in the proposal so it isn't forgotten.
