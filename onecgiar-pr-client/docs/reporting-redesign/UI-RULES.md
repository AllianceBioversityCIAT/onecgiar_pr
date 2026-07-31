<!--
PROVENANCE — delivered by the designer on 2026-07-31 for the Reporting redesign on branch
`performance-refactor`. Stored verbatim; this is their deliverable, not our edit surface.

Our validation of it, the reconciliation with what the existing code actually does, and the
migration plan live in a SEPARATE file so this one stays authoritative and traceable:
  → ./MIGRATION-CONTEXT.md

If you are about to "correct" something here, read MIGRATION-CONTEXT.md first — the discrepancies
we found are already recorded there with computed evidence, and §1.1/§2.1 of this file were
independently confirmed correct.
-->

# PRMS Reporting — UI Rules

**Target branch:** `performance-refactor`
**Scope:** Reporting redesign (sidebar, program band, Reporting, Overview, Results Center, result drawer)
**Suggested location:** `onecgiar-pr-client/docs/reporting-redesign/UI-RULES.md`, referenced from `onecgiar-pr-client/CLAUDE.md` and `AGENTS.md`.

> This file is the **single source of truth for the Reporting redesign UI**. Where it conflicts with `docs/system-design/design.md`, this file wins for redesign surfaces; update `design.md` to match once each phase merges.

---

## 0. Stack reality check

`CLAUDE.md` says "Angular 19 + PrimeNG 19". **That is out of date.** On `performance-refactor` the actual stack is:

| Item | Reality on this branch |
|---|---|
| Angular | **21.2** |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`, `@theme inline` in `styles.scss` — there is **no** `tailwind.config.js`) |
| UI primitives | **Spartan NG** — `@spartan-ng/brain` + local Helm components in `src/app/spartan/` |
| Variants | `class-variance-authority` (cva) + `clsx` + `tailwind-merge` via the `hlm()` util |
| Icons | **Lucide** (`@ng-icons/lucide`) — `primeicons` is legacy, do not add new usages |
| PrimeNG | **Removed.** 0 imports remain. Do not reintroduce. |
| Font | **Manrope** (replaced Poppins), `html/body` at **12px** |
| Charts | `chart.js` + `chartjs-plugin-datalabels` |
| Tokens | `src/styles/colors.scss` as `--pr-color-*`, exposed to Tailwind as `brand-*` |
| Tests | Jest + Cypress. Thresholds: branches 50 / functions 60 / lines 60 / statements 60 |

**Fix `CLAUDE.md` §1 before starting.** An AI agent reading "PrimeNG 19" will generate PrimeNG components into a codebase that deliberately removed them.

Already present and aligned with the redesign: `shared/components/reporting-nav-sidebar/` (uses `HlmSidebar` + Lucide + a `ProgramGroup` model), `FontScaleService`, `ResultsNotificationsService`, and the `result-framework-reporting` module with `entity-aow`, `entity-details` and `result-framework-reporting-home`. Build on these, don't replace them.

---

## 1. Three decisions to close before writing code

### 1.1 Color — replace the primary ramp in place

The current brand is `#6b6dc4` (muted violet-blue). The redesign uses `#6B46E5` (saturated violet) plus a dark sidebar that has no token today.

**Decision: rewrite the values of `--pr-color-primary-*` in `colors.scss`, keeping the token names and the "`-300` is main" convention.** Every existing `bg-brand`, `text-brand-400`, `border-brand-200` picks up the new brand automatically. One file, app-wide effect, zero renames.

The sidebar colors fall naturally into the `-700` / `-800` stops, so the dark chrome is part of the same ramp rather than a bolted-on set.

### 1.2 Typography — keep Manrope, add JetBrains Mono, drop the rest

The mockups specify Instrument Sans (display) + Inter (UI) + JetBrains Mono (codes). The repo ships Manrope.

**Decision: Manrope covers display and UI. Add JetBrains Mono for codes and figures only. Do not add Instrument Sans or Inter.**

Rationale: Manrope is already the PRMS brand face on this branch, it is a grotesque with enough character at 700 + tight tracking to carry display sizes, and this drops three new webfonts to one. What makes the design read as designed is the **hierarchy** — sizes, weights, tracking, the mono/sans split — not the specific sans.

### 1.3 Root font-size — the biggest trap in this codebase

`html, body { font-size: 12px }`. Tailwind's type utilities are **rem-based**, so on this codebase:

```
text-sm  = 0.875rem = 10.5px   (not 14px)
text-base = 1rem    = 12px     (not 16px)
```

Every size in the mockups is in **px**. If an agent writes `text-sm` expecting 14px, the whole UI comes out 25% small.

**Decision: in redesign surfaces, never use rem-based Tailwind type utilities. Use explicit arbitrary px values** (`text-[14px]`, `leading-[1.45]`). Same for `size-*`/`w-*`/`h-*` where the spec gives px. Changing the root to 16px would fix this globally but would resize every legacy screen at once — out of scope here, log it as tech debt.

---

## 2. Token layer

### 2.1 `src/styles/colors.scss` — replace the primary ramp

```scss
:root {
  // ── Primary — PRMS violet. -300 is the action color (convention preserved).
  --pr-color-primary-25:  #faf9fe;
  --pr-color-primary-50:  #f5f3ff;
  --pr-color-primary-100: #ede9fe;
  --pr-color-primary-200: #ddd6fe;
  --pr-color-primary-300: #6b46e5; // Main — primary actions, links, focus
  --pr-color-primary-400: #5733c4; // Hover / active
  --pr-color-primary-500: #4a2bb8;
  --pr-color-primary-600: #3f2499;
  --pr-color-primary-700: #33227a; // Sidebar elevated surface
  --pr-color-primary-800: #271862; // Sidebar base surface
  --pr-color-primary-900: #1b1145;
  --pr-color-primary-950: #0f0926;

  --pr-color-primary-rgb: 107, 70, 229;
}
```

### 2.2 Semantic tokens — append to `colors.scss`

Components must consume **semantic** tokens, never raw hex and never ramp stops directly.

```scss
:root {
  // ── Surfaces
  --pr-surface-topbar:  #ffffff;
  --pr-surface-band:    #f7f4fd;  // program band
  --pr-surface-app:     #f7f7f9;  // content background — NEUTRAL, not tinted
  --pr-surface-card:    #ffffff;
  --pr-surface-subtle:  #f7f7f9;  // HLO / outcome group headers

  // ── Borders
  --pr-border:          #e3e3e8;
  --pr-border-strong:   #d5d5dc;  // AoW header bottom border
  --pr-border-divider:  #eeeef1;  // row separators

  // ── Text (violet-tinted neutral ramp)
  --pr-text-heading:    #191524;
  --pr-text:            #2b2838;
  --pr-text-secondary:  #5d5872;
  --pr-text-muted:      #6b6580;
  --pr-text-subtle:     #9691a8;

  // ── Sidebar (on-dark)
  --pr-sidebar-bg:        var(--pr-color-primary-800);
  --pr-sidebar-elevated:  var(--pr-color-primary-700);
  --pr-sidebar-active:    var(--pr-color-primary-300);
  --pr-sidebar-fg:        #e9e4fa;
  --pr-sidebar-fg-muted:  #a79bd4;
  --pr-sidebar-fg-subtle: #8b7cc4;
  --pr-sidebar-accent:    #c4b5fd;
  --pr-sidebar-border:    rgb(255 255 255 / 0.10);
  --pr-sidebar-hover:     rgb(255 255 255 / 0.07);

  // ── Report status — fixed fg/bg pairs, never recombined
  --pr-status-not-started-fg: #6b7280;  --pr-status-not-started-bg: #f3f4f6;
  --pr-status-in-progress-fg: #b45309;  --pr-status-in-progress-bg: #fef3c7;
  --pr-status-submitted-fg:   var(--pr-color-blue-700);
  --pr-status-submitted-bg:   var(--pr-color-blue-100);
  --pr-status-in-qa-fg:       #0e7490;  --pr-status-in-qa-bg:       #cffafe;
  --pr-status-approved-fg:    #047857;  --pr-status-approved-bg:    #d1fae5;

  // ── Chart scale — violet, 4 steps. Status colors are NOT for charts.
  --pr-chart-1: #4a2bb8;
  --pr-chart-2: #6b46e5;
  --pr-chart-3: #9270f0;
  --pr-chart-4: #c4a0f7;

  // ── Elevation — only these three exist
  --pr-shadow-1:      0 1px 2px rgb(25 21 36 / 0.06);
  --pr-shadow-2:      0 8px 24px rgb(25 21 36 / 0.10);
  --pr-shadow-drawer: -12px 0 32px rgb(25 21 36 / 0.12);
  --pr-scrim:         rgb(25 21 36 / 0.32);
  --pr-focus-ring:    0 0 0 3px rgb(107 70 229 / 0.28);
}
```

### 2.3 `src/styles.scss` — expose to Tailwind v4

Extend the existing `@theme inline` block (do not create a `tailwind.config.js`):

```scss
@theme inline {
  /* existing --color-brand-* stay as they are */

  --color-surface-topbar: var(--pr-surface-topbar);
  --color-surface-band:   var(--pr-surface-band);
  --color-surface-app:    var(--pr-surface-app);
  --color-surface-card:   var(--pr-surface-card);
  --color-surface-subtle: var(--pr-surface-subtle);

  --color-ink-heading:   var(--pr-text-heading);
  --color-ink-body:      var(--pr-text);
  --color-ink-secondary: var(--pr-text-secondary);
  --color-ink-muted:     var(--pr-text-muted);
  --color-ink-subtle:    var(--pr-text-subtle);

  --color-sidebar:          var(--pr-sidebar-bg);
  --color-sidebar-elevated: var(--pr-sidebar-elevated);
  --color-sidebar-fg:       var(--pr-sidebar-fg);
  --color-sidebar-fg-muted: var(--pr-sidebar-fg-muted);

  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Gives `bg-surface-app`, `text-ink-secondary`, `bg-sidebar`, `font-mono`.

### 2.4 `src/styles/fonts.scss` — add the mono face

```scss
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
```

### 2.5 Type scale (redesign surfaces)

All px. `tracking` in em. `.pr-code` and `.pr-figure` are the only mono classes.

| Role | Spec | Where |
|---|---|---|
| Page title | 28 / 700 / Manrope, `-0.02em` | Results Center, program name |
| Section title | 20 / 600 / Manrope, `-0.01em` | Card headers, drawer indicator |
| AoW name | 16 / 600 / Manrope | AoW group header |
| Row title | 15 / 600 / Manrope, `lh 1.45` | Result title |
| Body | 14 / 400 / Manrope, `lh 1.5` | Textareas, descriptions |
| Nav item | 14 / 500 / Manrope | Sidebar |
| Metadata | 13 / 400 / Manrope | KPI name, secondary line |
| Chip / label | 12 / 500 / Manrope, `0.01em` | Status chips, field labels |
| Timestamp | 12 / 400 / Manrope | "Edited 2 days ago" |
| Eyebrow | 11 / 600 / Manrope, `uppercase`, `0.08em` | Section groups |
| **Code** | 12 / 500 / **JetBrains Mono** | `SP01`, `AOW01`, `HLO4.AOW1.IO1`, result codes |
| **Figure** | 18 / 500 / **JetBrains Mono**, `tabular-nums` | Target / Achieved values |
| **Big figure** | 32 / 700 / **JetBrains Mono**, `tabular-nums` | Overview metrics |

---

## 3. Component inventory

### 3.1 Already in `src/app/spartan/` — use as-is

| Redesign element | Component |
|---|---|
| Result drawer (720px, right) | `hlm-sheet` — `side="right"`, width override |
| Sidebar shell + collapse | `hlm-sidebar` + `HlmSidebarService` |
| Tooltips | `hlm-tooltip` |
| Buttons | `hlm-button` (cva variants) |
| Text inputs | `hlm-input` |
| Loading states | `hlm-skeleton` |
| Dividers | `hlm-separator` |

### 3.2 To generate — `npx nx g @spartan-ng/cli:ui <name>`

`popover` · `table` · `tabs` · `select` · `badge` · `command` · `checkbox` · `accordion` · `menu` · `progress` · `avatar`

**Generate them. Do not hand-author.** Per `onecgiar-pr-client/CLAUDE.md`, querying the **Spartan MCP** for the live component contract before writing any UI is mandatory — no exceptions, no working from memory.

### 3.3 Button variants — extend `hlm-button`'s cva

Add to the existing `buttonVariants` rather than creating new components:

```ts
variant: {
  // ...existing
  brand:    'bg-[var(--pr-color-primary-300)] text-white hover:bg-[var(--pr-color-primary-400)] shadow-[var(--pr-shadow-1)]',
  brandSoft:'bg-white border border-[var(--pr-color-primary-200)] text-[var(--pr-color-primary-400)] hover:bg-[var(--pr-color-primary-50)]',
}
```

`brand` = the one primary per screen. `brandSoft` = row-level `Report` / `Continue`.

---

## 4. UI Rules

Hard rules. A PR that breaks one does not merge.

### Structure

1. **One `brand` button per screen.** Everything else is `brandSoft`, `outline` or `ghost`.
2. **Never a modal on top of a modal.** Inside the drawer, secondary pickers are anchored popovers or a nested view within the same sheet with a `← Back` affordance.
3. **One vertical scroll per view.** The drawer's header and footer are sticky; only its body scrolls.
4. **`Escape` closes** drawer, command palette, popovers and menus. Every interactive control has a visible focus ring (`--pr-focus-ring`).
5. **Empty states max 160px tall**: one line of 14/400 `--pr-text-secondary` + one ghost button. Never a full-height empty card.
6. **Respect `prefers-reduced-motion`** — all durations to 1ms.

### Color

7. **Violet is navigation and actions. Content surfaces are neutral.** Inside the content area there must be no violet border and no tinted background — the only exceptions are the program band, brand chips, and the primary button.
8. **No hardcoded hex in components.** Only `var(--pr-*)` or the Tailwind aliases from §2.3.
9. **Status fg/bg pairs are fixed.** Never recombine a foreground with another background, never invent a sixth status color.
10. **Max two elevation levels per screen.** Cards separate with `--pr-border`, not shadow.
11. **No gradients on large surfaces.**
12. **Color only on semantic icons.** Decorative icons stay neutral; only the active nav icon is violet.

### Data display

13. **Numeric values are `font-mono` + `tabular-nums`, right-aligned.** Column alignment is what makes the table scannable; losing it defeats the layout.
14. **`Target` / `Achieved` are the only nomenclature.** Not "reported", not "progress", not "contribution". The year prefix follows the cycle selector.
15. **Never a segmented progress meter on an indicator value.** Targets can be financial (`$1.2M`) or large-scale. Continuous bars only on group headers, where the number is a count of results and therefore a true proportion.
16. **Long text is clamped, never broken.** Row title: `line-clamp-2` + inline `Show more`. HLO header: `line-clamp-1` + tooltip. Drawer: `line-clamp-3` + `Show more`. A 40-word tooltip is worse than truncation.
17. **Row action reflects state:** `Report` when not started, `Continue` when in progress, no button once submitted.
18. **No per-field "mandatory" badges.** Required-ness is communicated once, aggregated, in the drawer footer.

### Code

19. **Tailwind-first.** New styling goes as utilities in the template. SCSS only for `@keyframes`, complex pseudo-elements, `:host` box setup, or projected third-party DOM.
20. **No rem-based type utilities on redesign surfaces** (see §1.3). `text-[14px]`, not `text-sm`.
21. **Icons from `@ng-icons/lucide` only.** No new `primeicons`. No inline SVG for anything Lucide already has.
22. **Standalone components + signals.** Follow the existing `reporting-nav-sidebar` pattern: `inject()`, `signal()`, `computed()`, `toSignal()`. No NgRx.
23. **API methods keep the `HTTP_METHOD_descriptiveName` convention** and the custom `auth` header — never `Authorization: Bearer`.
24. **Never log tokens, keys, webhook URLs or credentials** (`.cursorrules`, hard rule).
25. **Run only the touched module's specs**, never the full suite: `npm run test -- --testPathPattern="<file>.spec"`.

---

## 5. Screen map

| Screen | Route | Module |
|---|---|---|
| Program shell (band + tabs) | `result-framework-reporting/:programId` | `result-framework-reporting/` |
| Overview | `…/:programId/overview` | new page under that module |
| Reporting | `…/:programId/reporting` | `entity-aow` (extend) |
| Results Center | `results/results-outlet/results-list` | existing, rebuild table |
| Result drawer | overlay, not a route | shared component, used by both Reporting and Results Center |
| CGIAR center | `…/center/:centerId` | `center-report-stub` (Juan David) |

**The drawer is one shared component consumed from two surfaces.** Do not fork it — that is what makes both entry points behave identically.

### Layout skeleton

```
┌────────────┬──────────────────────────────────────────┐
│  SIDEBAR   │  TOPBAR 56px — surface-topbar            │
│  full      ├──────────────────────────────────────────┤
│  height    │  PROGRAM BAND — surface-band             │
│  bg-       │   88px identity + 48px tabs              │
│  sidebar   │   sticky, collapses to 48px on scroll    │
│  260 ↔ 64  ├──────────────────────────────────────────┤
│            │  CONTENT — surface-app, padding 32px     │
│            │                          ┌───────────────┤
│            │                          │ SHEET 720px   │
└────────────┴──────────────────────────┴───────────────┘
```

The sidebar spans full height and contains the logo. The topbar starts where the sidebar ends. The sheet overlays with `--pr-scrim`; it does not push content.

### Reporting group hierarchy

```
AoW header   64px · bg-surface-card · border-b --pr-border-strong · name 16/600
  HLO header 44px · bg-surface-subtle · eyebrow "HLO" 11/600 + name 13/500
    Row      88px min · bg-surface-card · border-b --pr-border-divider
```

First level carries **typographic weight**, second level carries **fill**. They must not compete on the same variable. No vertical spine lines.

Row grid: `36px` status icon · `1fr` text (max 620px) · `110px` Target · `110px` Achieved · `120px` action · `40px` menu.

---

## 6. Migration order

Each phase is independently mergeable and independently reviewable.

| Phase | Content | Gate |
|---|---|---|
| **0** | Fix `CLAUDE.md` §1 (stack), add this file, reference it from `CLAUDE.md` + `AGENTS.md` | Docs only |
| **1** | Token layer: `colors.scss`, `fonts.scss`, `@theme inline`, button cva variants | No visual regression on legacy screens |
| **2** | Generate the missing Spartan components (§3.2) | They render in isolation |
| **3** | Sidebar: dark chrome, My/Other programs, favorites, CGIAR centers, collapse | Extends `reporting-nav-sidebar`, doesn't replace it |
| **4** | Topbar + program band + tabs + cycle selector | Band sticky/collapse works |
| **5** | Reporting: three-level grouping, aligned columns, view toggle | Long titles don't break layout |
| **6** | Result drawer: sections, autosave, footer validation, submit + report-next | Shared by both surfaces |
| **7** | Overview: status funnel, pace, progress by AoW, needs attention, gaps, impact | Every aggregate navigates to its detail |
| **8** | Results Center: table, filters, columns, bulk selection, export | Reuses the same drawer |
| **9** | Popovers: program/AoW descriptions, target details, reported results | No modal-in-modal |

**Phase 1 first, always.** Every later phase depends on the tokens existing.

---

## 7. PR checklist

Paste into the PR template for redesign work.

```
Structure
□ One brand button on the screen
□ No modal inside a modal
□ One vertical scroll
□ Escape closes overlays; focus ring visible on every control
□ Empty states ≤160px

Color
□ No hardcoded hex — only var(--pr-*) or Tailwind aliases
□ No violet inside the content area (band / chips / primary button excepted)
□ Status fg/bg pairs unmodified
□ ≤2 elevation levels; no gradients on large surfaces

Data
□ Figures use font-mono + tabular-nums, right-aligned
□ Nomenclature is "Target" / "Achieved"
□ No segmented meters on indicator values
□ Long text clamped with Show more / tooltip
□ Row action matches state (Report / Continue / none)

Code
□ Tailwind utilities, no new .pr-* SCSS blocks
□ No rem-based type utilities (text-[14px], not text-sm)
□ Lucide icons only
□ Standalone + signals
□ Spartan MCP consulted for every component used
□ Only the touched module's specs were run
□ Commit format: <emoji> <type>(<scope>) [ticket]: <description>
```

---

## 8. Open questions — resolve with the BA before the affected phase

1. **`Submitter` vs `Created by`** — the legacy table shows a program code (`SP09`) under Submitter and a person under Created by, but the filter is labelled `Submitter(s)`. Which is it? *(Blocks phase 8.)*
2. **`Portfolio`** — appears as a filter and inside `Phase – Portfolio`, never as a standalone field. Is it distinct from Phase? *(Blocks phase 8.)*
3. **Intermediate Outcomes / 2030 Outcomes reporting cadence** — same cycle as HLOs, or a longer horizon? If different, they need visual separation from work that closes this cycle. *(Blocks phase 5.)*
4. **Innovation Packages scope** — platform-level or program-level? If program-level it becomes a third tab and the platform nav drops to three modules. *(Blocks phase 4.)*
5. **Quality Assurance scope** — reviewer module, or the program's own QA state? May need both, split by role. *(Blocks phase 4.)*
6. **Per-row PDF** — daily action or occasional? Daily earns a column; occasional stays in the `⋯` menu. *(Blocks phase 8.)*
