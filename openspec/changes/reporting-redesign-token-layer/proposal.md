## Why

The Reporting redesign has been approved and its visual reference is now in the repo, but **the app cannot render it**: the brand ramp is still the old muted indigo (`#6b6dc4`), and every Spartan/Helm component renders shadcn's slate defaults because the raw `--primary` / `--sidebar` / `--border` variables in `src/styles.scss` were never pointed at PRMS brand values. Nothing downstream — sidebar, program band, Reporting table, result drawer — can be built on a token layer that does not exist yet, which is why `docs/reporting-redesign/UI-RULES.md` §6 makes this Phase 1 and a hard prerequisite for Phases 2-9.

It is also a live accessibility fix, not only a rebrand. Three defects ship today and are measured, not estimated:

- 13 rule blocks render `color: primary-300` on `background: primary-50` at **3.82:1** — below WCAG AA (4.5). The approved palette takes the same pair to **5.27:1**.
- Stop 200 is used as a border and as a focus ring in ~20 places at **2.22:1**, under the WCAG 1.4.11 non-text floor of 3.0.
- `hlm-button`'s default hover is `bg-primary/80`, which composites to **3.92:1** with white text — every default Spartan button in the app.

**Change type: frontend-only.** No server work is required or included. Every file touched is under `onecgiar-pr-client/`.

⚠️ **No Jira ticket yet.** Branch `performance-refactor` carries no `P2-XXXX` id, and the commit convention requires one. **The user must supply the ticket before the first commit.**

## What Changes

- **Replace the `--pr-color-primary-*` values in `src/styles/colors.scss`** with the approved 12-stop violet ramp (`UI-RULES.md` §2.1), keeping every token name and the "`-300` is main" convention. Anchor: `--pr-color-primary-300: #6b46e5`. Because token names do not change, ~736 `var(--pr-color-primary-*)` references and 101 `*-brand-*` Tailwind utilities across ~340 files inherit the new brand with **zero template edits**.
- **Add the semantic token set** from `UI-RULES.md` §2.2: surfaces, borders, the violet-tinted text ramp, on-dark sidebar tokens, the six fixed status fg/bg pairs, the 4-step chart scale, and the three elevation levels plus scrim and focus ring.
- **Extend the existing `@theme inline` block** in `src/styles.scss` (§2.3) so the semantic tokens are reachable as Tailwind utilities (`bg-surface-app`, `text-ink-secondary`, `bg-sidebar`, `font-mono`). No `tailwind.config.js` is created — this project is Tailwind 4 CSS-first.
- **Add JetBrains Mono** (§2.4) for codes and figures only. Manrope stays as the display and UI face; Instrument Sans and Inter are explicitly not adopted.
- **Add `brand` and `brandSoft` variants** to `hlm-button`'s existing cva (§3.3) rather than creating new button components.
- **Point the shadcn/Helm raw variables at the `--pr-*` canon** (`src/styles.scss` `:root`, ~lines 435-461). Without this, Spartan components stay slate no matter what `colors.scss` says. The values are re-valued in place; **no second `@theme` block is added** — Helm's preset already maps `--color-primary: var(--primary)` via `@theme inline`, and declaring a plain `@theme` for these would freeze resolution to `:root` and silently break the scoped dark sidebar.
- **Fix `hlm-button`'s default hover** — replace `hover:bg-primary/80` with an explicit darker stop, taking white-on-hover from 3.92:1 to **7.85:1**. This also makes the Helm button agree with the `brand` variant defined in §3.3.
- **Repoint `--pr-color-secondary-400` to `#271862`** so the ~17 legacy dark surfaces (footer, unauthenticated Cognito background, `dynamic-panel-menu`, `collapsible-container`, ~9 modals) join the rebrand with **zero template edits**. White on it goes 13.33:1 → 15.07:1, so every light foreground improves.
- **Repoint ~20 legacy consumers of stops 100/200** that use them as borders or focus rings, per `UI-RULES.md` Rule 7 ("no violet border inside the content area"): 5 focus rings in `ai-assistant-panel.component.html` move to the semantic `--pr-focus-ring`; 7 violet content borders in `bilateral/` and `ai-upload-file` become neutral (`--pr-border`) or `-300` for selected state; 3 `hover:border-brand-200` card borders get the same treatment; 2 text sites at `header-panel.component.html:370-371` move to `text-brand-300`. Delivered as 2 bulk patterns plus 2 individual lines.
- **Update `--pr-color-primary-rgb`** to match the new anchor, and flag the ~68 `rgba(var(--pr-color-primary-rgb), α)` overlays for visual review — the green channel drops ~45%, so low-alpha tints shift hue and no automated test detects it.
- **Update `mds-progress-ring.component.spec.ts:30,36`**, which assert literal hex, in the same commit — otherwise the suite goes red.
- **Remove the unreachable `:root.dark` block** (`src/styles.scss:464-493`, 24 vars, zero entry points, `color-scheme: light` pinned at `:423`). Sequenced **after** visual verification, because unlike every other step it destroys information a revert of the colour commit would not restore.
- **Correct the stale stack documentation** that would actively mislead an agent: `CLAUDE.md` §1 still says "Angular 19 + PrimeNG 19" (reality: Angular 21.2 + Tailwind 4 + Spartan, PrimeNG removed), and 22 references across `CLAUDE.md`, `src/CLAUDE.md` and `AGENTS.md` point at `src/app/theme/reportingTheme.ts`, a file deleted in `50710ea38`.

**Not breaking for consumers**, but visually app-wide: no public API, route, or payload changes; every screen changes colour.

### Explicitly out of scope

Accepted as staying on the old brand, by owner decision — to be stated as a time-boxed inconsistency, not an unknown:

- **PDF reports** — server-rendered; the client holds only an `<iframe>`, templates live in the server's `platform-report` module in the database.
- **Notification emails** — 7 server migrations hardcode the old brand; templates are DB-stored.
- **Excel exports** — `export-tables.service.ts:479` (`argb: '5568DD'`, one digit off the commonly-grepped `5569dd`) plus its zebra tint; client-side and a one-line change, excluded by choice.
- **4 raster assets with indigo baked into the pixels** — `favicon.png`, `logos-login.png`, `login-cover.png`, `result-framework-reporting/header_img_v2.png`. Deferred pending new files from the designer; unreachable by CSS.

Also out of scope: adding `layer(utilities)` to the unlayered Tailwind import at `src/styles.scss:11` (unlayered declarations outrank all layered ones, so that edit would make Tailwind utilities lose to legacy SCSS), raising the 12px root font-size, and reintroducing dark mode.

## Capabilities

### New Capabilities

- `design-tokens`: The canonical colour and typography token layer for the PRMS client — the `--pr-*` variable contract in `colors.scss`, its exposure to Tailwind 4 via `@theme inline`, its wiring into the Spartan/Helm shadcn variables, the accessibility floors each token pair must satisfy, and the rule that components consume semantic tokens rather than ramp stops or raw hex.

### Modified Capabilities

None. The 8 existing specs under `openspec/specs/` (`alert-display-behavior`, `auto-lead-assignment`, `evidence-*`, `p25-lead-contact-mandatory`, `toc-centers-reactive-preload`) govern behaviour, not presentation; none states a requirement about colour, and none of their requirements change.

## Impact

**SDD baseline.** `docs/system-design/design.md` is the standing UI/UX authority, but for redesign surfaces `docs/reporting-redesign/UI-RULES.md` supersedes it (stated in that file's preamble); `design.md` §5 (Theming/tokens) and §12 (Design Decisions) must be updated to match once this phase merges. `docs/prd.md` and `docs/detailed-design/detailed-design.md` are unaffected — no product scope or technical architecture changes. No module spec under `docs/specs/` is affected.

**Files changed.**

- `src/styles/colors.scss` — the primary ramp, `secondary-400`, the RGB triplet, and the appended semantic token block.
- `src/styles.scss` — the `@theme inline` extension, the shadcn/Helm raw `:root` block, and the removal of `:root.dark`.
- `src/styles/fonts.scss` — the JetBrains Mono `@import`.
- `src/app/spartan/button/src/lib/hlm-button.ts` — the hover fix plus the `brand` / `brandSoft` cva variants (vendored into this repo, so it is ours to edit).
- ~20 legacy consumer sites across `shared/components/ai-assistant/`, `pages/bilateral/`, `pages/results/…/ai-upload-file/`, `pages/result-framework-reporting/`, `shared/components/header-panel/`.
- `pages/bilateral/components/mds-progress-ring/mds-progress-ring.component.spec.ts`.
- Docs: `CLAUDE.md`, `src/CLAUDE.md`, `AGENTS.md` (stale stack + dead `reportingTheme.ts` references).

**Inherited with no edit — the point of the approach.** ~736 `var(--pr-color-primary-*)` references, 101 `*-brand-*` utilities, ~340 files, the ~17 legacy dark surfaces, and every Spartan/Helm component.

**Dependencies.** One new webfont (JetBrains Mono, Google Fonts). No npm packages added or removed.

**Risk concentration.** `shared/components/header-panel/` is the global header on every screen and holds ~24 hardcoded brand-ish hex, including four `linear-gradient(90deg,#6b6dc4,…)` nav-pill states with matching hardcoded shadows. A value swap does not reach them, so the header would show the old violet beside its own newly-violet focus rings. The approved design has **no gradients** (Rule 11), so flattening them to `#6b46e5` is both rule-compliant and the cheap answer — but it is an individual edit, and it is the single most visible surface in the app.

**Verification.** A green build proves nothing here. Phase gate is before/after screenshots into `onecgiar_pr/.local-screenshots/` for `/login` while signed out, the `header-panel` nav pills, the QA header, the completeness/status pill row, the `steper-navigation` active step, a checked checkbox/radio in `custom-fields`, and the RFR home hero — plus `npm run lint`, `npm run test:coverage` (note `npm run test` is `jest --no-coverage` and does **not** enforce the 50/60/60/60 thresholds) and `npm run test:ct` (`custom-fields/` is excluded from Jest entirely).
