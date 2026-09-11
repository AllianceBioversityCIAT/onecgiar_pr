> **All tasks are FRONTEND (`onecgiar-pr-client/`).** There are no backend tasks in this change — no server code, no migrations, no git-state operations. PDF, email and Excel colour is explicitly out of scope (see `proposal.md`).
>
> Paths are relative to `onecgiar-pr-client/`. Contrast ratios are sRGB relative luminance, 4 dp.

## 1. Baseline (do not skip — nothing after this is trustworthy without it)

- [ ] 1.1 Run `npm run build` and archive `dist/onecgiar-pr-client/browser/styles.css` as the "before" bundle for byte comparison
- [ ] 1.2 Run `npm run lint`, `npm run test:coverage` and `npm run test:ct`; record the pass/fail set and the four coverage numbers (thresholds: branches 50 / functions 60 / lines 60 / statements 60). Note: plain `npm run test` is `jest --no-coverage` and does **not** enforce thresholds
- [x] 1.3 Capture "before" screenshots into `onecgiar_pr/.local-screenshots/` (gitignored) for: `/login` signed out · the global `header-panel` nav pills · the QA header · the completeness/status pill row on any results list · a `steper-navigation` active step · the RFR home hero · a Spartan `hlmBtn` in default and hover state
- [x] 1.4 Record the pre-change grep counts so completion is measurable: `grep -rEoin "#(6b6dc4|6461bc|5569dd|5457b0)" src/ | wc -l` (expected 103: 59 + 30 + 12 + 2)

## 2. L1 — canonical values in `src/styles/colors.scss`

- [x] 2.1 Replace the `--pr-color-primary-25..950` ramp with the approved 12 values from `docs/reporting-redesign/UI-RULES.md` §2.1, keeping every token name and the "`-300` is main" convention. Anchor `--pr-color-primary-300: #6b46e5`
- [x] 2.2 Update `--pr-color-primary-rgb` to `107, 70, 229` so the ~68 `rgba(var(--pr-color-primary-rgb), α)` consumers stay consistent with the hex
- [x] 2.3 Repoint `--pr-color-secondary-400` to `#271862` (design decision D5) so the ~17 legacy dark surfaces join the rebrand with no template edits
- [x] 2.4 **Decide and set `--pr-color-secondary-rgb`** — open question 2 in `design.md`. Recommended: the neutral shadow ink `25, 21, 36`, since its ~19 consumers are shadows and scrims (`src/styles.scss:305` at α 0.337, `src/styles/ipsr.scss:94` at α 0.745), not brand surfaces. Do not leave this to inherit by accident
- [x] 2.5 Verify no step was accidentally added or dropped: the per-family step coverage in this file is deliberately ragged (secondary has no 25; neutral runs 100..900 plus a non-standard 1000; red/yellow/orange carry an extra 75; green/blue start at 50). Confirm every step a consumer references still exists
- [ ] 2.6 Verify `git diff --stat` shows exactly one file changed, and that the rebuilt bundle still emits `.bg-brand-300 { background-color: var(--pr-color-primary-300) }` — proof the L2 bridge propagates without template edits

## 3. Semantic tokens

- [x] 3.1 Append the semantic token block from `UI-RULES.md` §2.2 to `colors.scss`: surfaces, borders (`--pr-border`, `--pr-border-strong`, `--pr-border-divider`), the text ramp, the on-dark sidebar family, the six fixed status fg/bg pairs, the 4-step chart scale, the three elevation levels, `--pr-scrim` and `--pr-focus-ring`
- [ ] 3.2 Verify in the browser that **every** new token resolves to a real colour. Any token resolving to `rgba(0, 0, 0, 0)` is silently broken — an invalid value disappears rather than erroring
- [ ] 3.3 Compute and record the contrast ratio of each status fg/bg pair; confirm each meets 4.5:1 for its chip text at 12px

## 4. L2 — Tailwind bridge and typeface

- [x] 4.1 Extend the existing `@theme inline` block in `src/styles.scss` (~line 18) with the surface / ink / sidebar aliases and `--font-mono` per `UI-RULES.md` §2.3. Do **not** create a `tailwind.config.js` — this project is Tailwind 4 CSS-first
- [x] 4.2 Add the JetBrains Mono `@import` to `src/styles/fonts.scss` per §2.4, alongside the existing Manrope import. Do not add Instrument Sans or Inter
- [ ] 4.3 Verify `bg-surface-app`, `text-ink-secondary`, `bg-sidebar` and `font-mono` are emitted in the rebuilt stylesheet and render correctly on a scratch element

## 5. L4 — Spartan/Helm wiring (the step that makes the rebrand visible in components)

- [x] 5.1 Re-value the raw shadcn vars in the **existing plain `:root`** in `src/styles.scss` (~lines 435-461) to reference the `--pr-*` canon: `--background`, `--foreground`, `--card(-foreground)`, `--popover(-foreground)`, `--primary(-foreground)`, `--secondary(-foreground)`, `--muted(-foreground)`, `--accent(-foreground)`, `--destructive`, `--border`, `--input`, `--ring`
- [x] 5.2 🛑 Confirm **no second `@theme` block** was added for these. Helm's preset already maps them via `@theme inline` (`node_modules/@spartan-ng/brain/hlm-tailwind-preset.css:106`); a plain `@theme` freezes resolution to `:root` and silently reverts the scoped dark sidebar to page colours (design decision D3)
- [x] 5.3 Wire the 8 `--sidebar*` vars to the sidebar palette, scoped on a selector that wraps the sidebar — **not** via `.dark`. `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.scss:10` already scopes on the `hlm-sidebar` host; preserve that mechanism
- [ ] 5.4 Verify a Spartan `hlmBtn`, `hlmInput` and the sidebar all render PRMS brand colours, and that **no shadcn slate default is visible anywhere** in the app
- [ ] 5.5 Verify scoped resolution works: an element inside the sidebar resolves the sidebar's `--sidebar` value while an element outside resolves the root value
- [x] 5.6 Check the sidebar separator: `--sidebar-border` must clear 3.0:1 against the sidebar surface. Also reconcile `reporting-nav-sidebar.component.scss:30`, which hardcodes `rgba(255, 255, 255, 0.55) !important` on `border-right` and would otherwise disagree with the token

## 6. Button recipe (`src/app/spartan/button/src/lib/hlm-button.ts` — vendored, ours to edit)

- [x] 6.1 Replace the default variant's `hover:bg-primary/80` (line 13) with an explicit darker stop. Rationale: `/80` compiles to `color-mix(in oklab, var(--primary) 80%, transparent)`, composing `#6b46e5` to `#896bea` — white text on it is **3.9217** (AA fail); the explicit 400 stop gives **7.8479**
- [x] 6.2 Add the `brand` and `brandSoft` cva variants per `UI-RULES.md` §3.3, extending the existing `buttonVariants` rather than creating new components
- [x] 6.3 Recompute white-on-hover for the default variant and confirm ≥ 4.5:1
- [ ] 6.4 Check the `secondary` variant at line 17 (`hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]`) still renders a visible hover once `--secondary` resolves to a hex-valued var — an external review flagged this as a possible failure; verify empirically in the browser rather than by reasoning
- [ ] 6.5 Verify the disabled state (`data-disabled:opacity-50` on the base recipe) still reads as inactive. It is WCAG-exempt, but record the ratio rather than leaving it unexamined

## 7. Bulk repoints — stops 100/200 misused as borders and focus rings (design decision D2)

> Run the read-only `grep` form of each pattern first and confirm the hit count before applying. Each pattern must be idempotent — running it twice changes nothing.

- [x] 7.1 **Focus rings (5 sites, one file).** `shared/components/ai-assistant/ai-assistant-panel.component.html` lines 4, 98, 143, 184, 239 use `focus-visible:ring-brand-200`. At `#ddd6fe` that ring is **1.3885** — effectively invisible. Repoint to the semantic focus token
- [x] 7.2 **Violet content borders (7 sites).** `border-color: var(--pr-color-primary-200)` at `pages/bilateral/components/bilateral-sp-selector/…scss:196`, `bilateral-reporting-way-selector/…scss:31`, `section-general-info/…scss:333`, `bilateral-result-level-selector/…scss:32`, `section-evidence/…scss:401` and `:513`, plus `pages/results/pages/result-creator/components/result-ai-assistant/components/ai-upload-file/…scss:9` (`2px dashed`). Per `UI-RULES.md` Rule 7 the resting border is neutral (`--pr-border`); only the **selected** state is violet and uses `-300`
- [x] 7.3 **Card hover borders (3 sites).** `hover:border-brand-200` at `pages/result-framework-reporting/pages/result-framework-reporting-home/result-framework-reporting-home.component.html:35`, `…/components/result-framework-reporting-center-card-item/…html:2`, `…/components/result-framework-reporting-card-item/…html:4` — same treatment as 7.2
- [x] 7.4 Confirm each pattern's applied hit count matches its pre-run grep count exactly, and that no pattern touched a spec file, a comment, a vendored `src/app/spartan/` source, a custom-property **name**, or a longer hex containing the target as a substring
- [x] 7.5 Leave `shared/components/premium-sidebar/premium-sidebar.component.scss:42` alone — `app-premium-sidebar` / `PremiumSidebarComponent` is never instantiated anywhere in `src/`. Confirm it is still dead rather than remediating it

## 8. Individual edits (each justified — no bulk pattern applies)

- [x] 8.1 **`shared/components/header-panel/header-panel.component.html:370-371`** — `text-brand-200` on the "Admin module" label at 12px is a live AA failure either way (**3.7761** under our computed ramp, **1.3885** under the approved tints). Repoint to `text-brand-300` (**5.7809**). Two lines
- [x] 8.2 **The four `header-panel` nav-pill gradients** at lines 127, 150, 164, 188 — each a hardcoded `linear-gradient(90deg,#6b6dc4,#6461bc,#6461bc)` with a matching hardcoded `rgba(100,97,188,0.4)` shadow. Resolve open question 3 in `design.md` (recommended: flatten to `#6b46e5`, since the approved design has no gradients — Rule 11). This is the global header on every screen: without this, the old violet sits beside its own newly-violet focus rings on the same element
- [x] 8.3 Sweep the remaining hardcoded brand hex in `header-panel.component.html` (~24 brand-ish literals in this one template) so the app's most visible surface is fully rebranded
- [x] 8.4 **The orphan `#5457b0`** — an old indigo present in no palette, at `pages/result-framework-reporting/pages/result-framework-reporting-home/result-framework-reporting-home.component.html:51` and `…/components/result-framework-reporting-galaxy/result-framework-reporting-galaxy.component.scss:44`. Both pair it with `var(--pr-color-primary-300)` inside a gradient, so it would render new violet → old indigo
- [x] 8.5 **`pages/bilateral/components/mds-progress-ring/mds-progress-ring.component.spec.ts:30,36`** — updates the asserted literal hex in the same commit as the value change, or the suite goes red. The component at `mds-progress-ring.component.ts:27-28` returns `'#19ae58'` and `'#6b6dc4'`
- [x] 8.6 Search for any other spec asserting a colour literal or an `rgb()` string across `src/` and update it in this same change; a missed one turns the suite red

## 9. Visual review of what no test can catch

- [ ] 9.1 Review the ~68 `rgba(var(--pr-color-primary-rgb), α)` overlays. The green channel drops ~45 %, so every 5-30 % tint shifts from desaturated indigo to saturated violet. Concentrations: login gradients, IPSR dashed borders, bilateral shadows, `shared/components/ai-assistant/ai-assistant-panel.component.scss:9,30,61`, `pages/results/pages/result-detail/panel-menu/panel-menu.component.scss:35,47,61-68`
- [ ] 9.2 Confirm the ~17 legacy dark surfaces now read as one coherent dark chrome with the sidebar: `shared/components/footer/footer.component.scss:13`, `pages/auth-cognito/auth-cognito.component.scss:10`, `shared/components/dynamic-panel-menu/…scss:4`, `shared/components/collapsible-container/…scss:8,9,46,47`, `shared/components/user-roles-info-modal/…scss:3,22`, `shared/components/page-alert/…scss:87`, `custom-fields/custom-fields.scss:346`, and the ~9 modals
- [ ] 9.3 Check `pages/locals/` — it has zero PRMS tokens and runs on stock Tailwind slate (`locals.component.html:64,71,73`). Resolve open question 4: rebrand now, defer, or leave alone
- [ ] 9.4 Confirm the `--pr-color-result-level-*` badges (semantic indirections at `colors.scss:142-145` into green/blue-other/red) do not clash with the new status chip palette where both render in one viewport — the results list and result-creator show them together

## 10. Documentation

- [ ] 10.1 Correct `CLAUDE.md` §1: the stack is **Angular 21.2 + Tailwind 4 + Spartan**, not "Angular 19 + PrimeNG 19". An agent reading the current text will generate PrimeNG into a codebase that deliberately removed it
- [ ] 10.2 Remove the 22 stale references to `src/app/theme/reportingTheme.ts` across `CLAUDE.md`, `src/CLAUDE.md` and `AGENTS.md` — the file and its directory were deleted in `50710ea38`. This includes the now-obsolete rule "update SCSS first and mirror it in the TS theme"
- [ ] 10.3 Reference `docs/reporting-redesign/UI-RULES.md` from `CLAUDE.md` and `AGENTS.md` as the authority for redesign surfaces
- [ ] 10.4 Update `docs/ux-ui/design.md` §5 (Theming / tokens) and §12 (Design Decisions) to match the new token layer
- [ ] 10.5 Record in `docs/reporting-redesign/MIGRATION-CONTEXT.md` which decisions were taken for the design's open questions

## 11. Gate

- [x] 11.1 `npm run lint` clean
- [ ] 11.2 `npm run test:coverage` green with coverage at or above the Step 1.2 numbers
- [ ] 11.3 `npm run test:ct` green (`custom-fields/` is excluded from Jest entirely, so this is the only gate covering it — including the checked checkbox/radio contrast)
- [ ] 11.4 Capture the "after" screenshots for every surface in 1.3 and diff against the "before" set
- [ ] 11.5 Verify eradication is real, not just grep-clean: `grep -rEoin "#(6b6dc4|6461bc|5569dd|5457b0)" src/` reaches 0 for in-scope files, with the out-of-scope exclusions (`export-tables.service.ts`, raster assets) listed explicitly rather than silently passing
- [ ] 11.6 Confirm the app has a page background — a broken `--background` resolves to transparent and `src/styles.scss` applies `bg-background` to `body`

## 12. Destructive step — last, isolated, only once 11 is clean

- [ ] 12.1 Remove the unreachable `:root.dark` block (`src/styles.scss:464-493`, 24 vars). Evidence it is dead: the selector is `:root.dark` not `.dark`, nothing in the app ever adds the class, and `color-scheme: light` is pinned at `:423`
- [ ] 12.2 Commit this separately from the colour work. It destroys information rather than re-valuing it — a `git revert` of the colour commit alone would not restore it

## 13. Blocked on the user

- [ ] 13.1 **Obtain the Jira ticket id.** Branch `performance-refactor` carries no `P2-XXXX`, and the commit convention `<emoji> <type>(<scope>) [ticket]: <description>` requires one. This blocks the first commit
