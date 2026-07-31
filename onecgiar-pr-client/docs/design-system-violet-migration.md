# Violet design-system migration — working context

> ## 🔀 SUPERSEDED IN PART — read the redesign docs first
>
> On **2026-07-31** the designer delivered [`reporting-redesign/UI-RULES.md`](./reporting-redesign/UI-RULES.md).
> **That file is now the authority on the palette, typography, tokens and UI rules** — its §2.1 scale is
> the approved one (it converged independently with ours on every load-bearing stop).
> The migration plan, the reconciliation with legacy code, and the Phase-1 checklist live in
> [`reporting-redesign/MIGRATION-CONTEXT.md`](./reporting-redesign/MIGRATION-CONTEXT.md).
>
> **This file remains valid as the research record** — the layer map, the measured blast radius, the
> adversarial-review findings (§5) and the contrast arithmetic. Do not treat its §1 scale as the target;
> use `UI-RULES.md` §2.1.

**Status: RESEARCH COMPLETE, NOTHING IMPLEMENTED.** No production file has been modified. This
document is the handoff so a fresh session can continue without re-deriving anything.

- **Branch:** `performance-refactor` (baseline commit `9dc66fa39`)
- **Date of research:** 2026-07-31
- **Visual reference:** [`../../docs/design-references/prms-reporting-tool-mockup/`](../../docs/design-references/prms-reporting-tool-mockup/) — read its `README.md` first
- **Companion docs:** [`spartan-tailwind-foundation.md`](./spartan-tailwind-foundation.md), [`refactor-angular21-spartan-migration.md`](./refactor-angular21-spartan-migration.md)

**Two deliverables are in scope:**

1. Replace the brand colour scale with the unified violet palette from the mockup, wired correctly
   through Tailwind 4 **and** Spartan/Helm.
2. Add a new internal page at **`/ui/colors`** that renders the live design tokens dynamically, so
   the palette can never silently desync from `colors.scss`.

---

## 0. SCOPE — decided 2026-07-31, do not re-litigate

**This change is the platform UI only: the Angular client's screens, navigation and design tokens.**

🛑 **Explicitly OUT of scope** (owner decision, not an oversight — the adversarial review surfaced these
as *mixed-state* risks, never as requirements):

| Excluded | Why it came up | Why it is out |
|---|---|---|
| **PDF reports** | every exported result/IPSR PDF keeps the old brand | server-rendered — templates live in `onecgiar-pr-server` `platform-report`, stored in the DB. Client cannot reach them. |
| **Notification emails** | 7 server migrations hardcode `#5569dd` | server + a new DB migration. Different repo area, different QA. |
| **Excel exports** | `export-tables.service.ts:479` `argb: '5568DD'` (+ spec at `:882`) | ⚠️ **this one IS client-side and is a one-line change** — excluded by choice, not by dependency. Cheap to fold in later. |

⏸️ **Deferred, needs the designer (cannot be done in code):** the four raster assets with indigo baked
into the pixels — `assets/favicon.png`, `assets/logos-login.png`, `assets/login-cover.png`,
`assets/result-framework-reporting/header_img_v2.png`. They are client assets and they *are* platform UI,
but they must be re-exported by whoever owns the brand files. **Not a blocker**; the screens ship first
and these land when the new files arrive.

**Consequence to state plainly in the proposal:** until the excluded items are addressed, a user who
exports a PDF, receives a notification email, opens an Excel export, or looks at the browser tab still
sees the previous brand. That is an **accepted, time-boxed inconsistency**, not an unknown.

---

## 1. The extracted palette (authoritative)

Extracted from the mockup by counting real usage in the inline styles. **Single violet family**
(hue ≈ 262) — the sidebar and the primary button are two stops of the *same* scale, not two colours.

### Violet scale

| Stop | Hex | Role in the mockup |
|---|---|---|
| 25 | `#F5F3FF` | soft lilac surface / hover row (20 uses) |
| 50 | `#EDE9FE` | avatar background, ">30 days" chip background |
| 100 | `#DDD6FE` | — |
| 200 | `#C4B5FD` | mono codes + checks in the sidebar |
| 300 | `#8B6CF5` / `#9270F0` | border hover |
| **400** | **`#6B46E5`** | **PRIMARY** — buttons, progress bars, active indicator (40 uses) |
| **500** | **`#5733C4`** | button hover **and** avatar/chip foreground (36 uses) |
| 600 | `#4A2BB8` | active / pressed |
| 700 | `#3A2789` | sidebar item hover |
| 750 | `#33227A` | — |
| **800** | **`#271862`** | **SIDEBAR BACKGROUND** |
| 900 | `#0F0A24` | tooltip background |

Focus ring: `0 0 0 3px rgba(107,70,229,.28)` (the primary at 28 %).

### Sidebar foregrounds (on `#271862`)

`#E9E4FA` primary text · `#C4B5FD` mono codes/checks · `#9C8FD8` uppercase labels ·
`#A79BD4` icons/secondary · borders `rgba(255,255,255,.10)` · hover `rgba(255,255,255,.07)`.

### Avatar (`Resultados.dc.html:268`)

28 × 28 px, `border-radius: 999px`, background `#EDE9FE`, foreground `#5733C4`, 11 px / weight 600.
Adjacent name `#191524` 14 px / 500. Container hover `#EFECF8`. Chevron `#9691A8`.

### Cycle chips — 4 states (logic at `Resultados.dc.html:2689-2692`)

| Condition | Background | Foreground |
|---|---|---|
| `> 30` days left (e.g. "48 days left") | `#EDE9FE` | `#5733C4` |
| `15–30` days left | `#FEF3C7` | `#B45309` |
| `< 15` days left | `#FEE2E2` | `#B91C1C` |
| cycle closed | `#EEEEF1` | `#5D5872` |

Note the `>30` pair is **identical** to the avatar pair — it is one semantic token reused, not a
coincidence. It should become a named token rather than a repeated literal.

### Neutrals

`#F7F7F9` app background · `#FFFFFF` cards · `#FAFAFB` subtle · `#EEEEF1` neutral fill / tracks
(34 uses) · **`#E3E3E8` default border (75 uses — no token exists for this today)**.

Text ramp: `#191524` heading · `#2B2838` body · `#5D5872` secondary (63 uses, the single most
frequent colour declaration) · `#6B6580` tertiary · `#9691A8` muted.

Shadows all derive from `rgba(25,21,36, α)` — i.e. `#191524`, **not** pure black.

### Semantic states

green `#047857` on `#D1FAE5`/`#B7F0D3` · red `#B91C1C`, `#DC2626` on `#FEE2E2` ·
amber `#B45309`, `#F59E0B` on `#FEF3C7`/`#FDE7A9` · blue `#1D4ED8` on `#DBEAFE`/`#CBDDFE` ·
cyan `#0E7490`, `#0891B2` on `#CFFAFE`.

---

## 2. Findings that change how this must be done

Everything below was verified against the actual code or measured in a browser. Where a claim
corrects existing documentation, that is called out.

### 2.1 There are SIX token layers, not three

| Layer | Where | Note |
|---|---|---|
| L0 | Tailwind's own `@theme` default (`node_modules/tailwindcss/theme.css`, imported `src/styles.scss:4`) | supplies the default palettes every utility derives from |
| L1 | `src/styles/colors.scss` | canonical `--pr-color-*`. Current primary-300 `#6b6dc4`, primary-400 `#6461bc`, secondary-400 `#2a2e45` |
| L2 | `src/styles.scss` `@theme inline` (~line 18) | maps `--color-brand-*` → `--pr-color-primary-*`, plus `--color-brand` and `--color-ink` |
| L3 | Helm's own preset (`node_modules/@spartan-ng/brain/hlm-tailwind-preset.css:82-110`) | a single `@theme inline` mapping `--color-primary: var(--primary)` etc. |
| L4 | `src/styles.scss` plain `:root` (~lines 435-461) | the raw shadcn vars — **still shadcn defaults, not PRMS brand** |
| L5 | the 10 global SCSS entries listed in `angular.json` | loaded after `styles.scss`; see the cascade bug below |

### 2.2 Tailwind utilities are UNLAYERED — but do NOT "fix" it by adding `layer(utilities)`

`src/styles.scss:11` is `@import 'tailwindcss/utilities.css';` **without `layer(utilities)`**, even
though line 3 declares `@layer theme, base, components, utilities;`. Line 13
(`@import "@spartan-ng/brain/hlm-tailwind-preset.css";`) is **also** unlayered.

Verified in the compiled bundle (`dist/onecgiar-pr-client/browser/styles.css`): only `@layer base`,
`@layer theme` and `@layer properties` are emitted — **no `@layer utilities`**.

🛑 **Correction — the obvious fix is backwards.** In CSS Cascade Level 5, **unlayered** normal
declarations outrank **all** layered ones. So moving the utilities into `@layer utilities` would make
them **lose** to every unlayered legacy SCSS rule unconditionally, regardless of specificity or source
order. It also cannot beat `!important`: `src/styles.scss:379-406` emits `margin-top: #{$i}px !important`
(the `generate-margin-right-classes(100)` generator), and unlayered `!important` still beats layered
non-important — so `.mt-4` would stay 4 px either way.

**Therefore:** the unlayered import is what currently *protects* Tailwind utilities from the legacy
SCSS. It is a latent inconsistency worth recording, **not** a prerequisite to fix before the colour
work, and gating the swap on it would add app-wide cascade risk in the name of removing it. The real
prerequisite is namespacing or deleting the `!important` margin generator — a separate change.

**Style load order, verified** (`angular.json` `styles` array): `primeicons.css`, `styles.scss`,
`ipsr.scss`, `fonts.scss`, **`colors.scss` (entry #5)**, `transitions.scss`, `containers.scss`,
`table-custom-styles.scss`, `custom-fields.scss`, `custom-alert.scss`, `filters-list.scss`,
`ymz-directives.scss`. Note L1's `:root` is parsed *after* L4's `:root` in `styles.scss:422` — harmless
for `var()` (resolved at use time) but confusing when bisecting a token that resolves to nothing.

### 2.3 The correct way to brand Spartan — measured, not assumed

**Assign the brand values to the raw shadcn vars in the existing plain `:root`. Do NOT add another
`@theme` block for them.**

Helm's preset already owns the Tailwind side (`--color-primary: var(--primary)`, `--color-sidebar:
var(--sidebar)`, …). The only thing left to change is the *value* of the raw var.

🛑 **Worst failure mode, measured in-browser:** declaring `@theme { --color-primary: var(--primary) }`
*without* `inline` makes Tailwind emit `:root,:host{--color-primary:var(--primary)}`, freezing the
value to `:root`. An element inside a scoped override computed `rgb(255,0,0)` instead of
`rgb(0,0,255)`. The page-level theme still looks right, so **the dark sidebar silently reverts to
page colours** — the classic "I wired it and it looks broken".

**Dark sidebar on a light page:** scope the raw `--sidebar*` vars on a selector wrapping the
sidebar. **Not** via `.dark`.

**Colour space:** hex and `var()` are both safe; oklch is preferable but not required. Verified with
this repo's own `@tailwindcss/postcss` 4.3.2 — `bg-primary/50` compiles to
`color-mix(in oklab, var(--primary) 50%, transparent)`, and a hex source resolves there correctly.
What *does* break silently is a bare channel triplet (`107 109 196` → `rgba(0,0,0,0)`) or a typo'd
var chain.

### 2.4 Blast radius of an in-place swap

- **340 files** touched.
- **736** `var(--pr-color-primary-*)` references · **101** `*-brand-*` Tailwind utilities.
- `--pr-color-primary-300` alone has **404 direct consumers** + 44 `brand-300` utilities.

🛑 **The "keep the `25..950` numbering as-is" decision was REFUTED — see §5.1.** The L\*-overlay
argument is real but insufficient: it ignores what stop 300 is actually *used for*.

**🛑 Highest single risk — `src/app/shared/components/header-panel/`** (the global app header, present
on every screen): 42 token refs + 23 `brand-*` utilities + **24 hardcoded brand-ish hex** in one
template. Four nav-pill active states (`header-panel.component.html:127, 150, 164, 188`) are each a
hardcoded `linear-gradient(90deg,#6b6dc4,#6461bc,#6461bc)` with a matching hardcoded
`rgba(100,97,188,0.4)` shadow. **A token swap does not reach them**, so the header would keep the old
violet while its own focus rings (`focus-visible:outline-brand-300`, ×6) turn the new colour —
mismatched side by side on the same element.

### 2.5 Contrast audit (computed, not eyeballed)

| Pair | Ratio | Verdict |
|---|---|---|
| `#5733C4` on `#EDE9FE` (avatar + >30d chip) | 6.61:1 | ✅ AA normal + large |
| `#5733C4` on `#FFFFFF` | 7.85:1 | ✅ AA |
| `#5733C4` on `#F5F3FF` | 7.16:1 | ✅ AA |
| `#B45309` on `#FEF3C7` (15–30d chip) | **4.51:1** | ⚠️ passes AA normal **by 0.01** — zero margin. Any future darkening of the chip background fails it. |

The full audit covers every fg/bg pair in the palette; see §4 for where the rest lives.

### 2.6 Corrections to existing documentation

- **`src/app/theme/reportingTheme.ts` does not exist.** It was deleted in commit `50710ea38`
  ("refactor(primeng): remove PrimeNG entirely"). The directory is gone. **22 stale references
  remain** in `CLAUDE.md`, `src/CLAUDE.md` and `AGENTS.md`, including the rule "update SCSS first and
  mirror it in the TS theme" — that rule is now obsolete and should be removed.
- **Dark mode is unreachable.** The block is `:root.dark` (not `.dark`) at `src/styles.scss:464-493`,
  redefining 24 shadcn vars, with **zero entry points** in the app. Proposal: **remove it**, do not
  brand it. Reintroducing dark mode is a separate change (it needs a scopable selector, a toggle, a
  persisted preference, 24 dark values and its own contrast audit).
- The app ships **Manrope** (`src/styles/fonts.scss:5`), with `Poppins` kept only as a fallback
  alias. Docs that say "Poppins" are out of date. The mockup uses `Instrument Sans` / `Inter` /
  `JetBrains Mono` — **typography is out of scope here**; this work covers colour only.

---

## 3. The `/ui/colors` page

**Purpose:** a living guardrail, not a poster. It renders the palette from the **live** CSS tokens,
and flags drift — e.g. "17 of 20 Spartan tokens are still shadcn defaults".

### Route registration

Add a `PrRoute` to `routingApp` in `src/app/shared/routing/routing-data.ts`, immediately **before**
the `**` wildcard at line 121. Recommended gating: **`prHide: true` + `canActivate: [CheckLoginGuard]`**.

⚠️ **`onlyTest` is not access control.** Both consumers
(`navigation-bar.component.ts:81`, `reporting-nav-sidebar.component.ts:503`) implement it purely as a
nav-visibility predicate; the route stays reachable by typing the URL in production.

### Page pattern to copy

`src/app/pages/locals/locals.component.ts:1-40` — the most Tailwind-first-compliant page in the tree
(standalone, `OnPush`, signals, **no** `styleUrls`).

No design-system / showcase / style-guide page exists yet (verified by case-insensitive grep across
all of `src/`).

### Reading tokens at runtime — the verified mechanism

**Discovery works.** Measured empirically: the existing build was served over `127.0.0.1` and probed
in Chrome via Playwright — `/styles.css` is a single same-origin bundle and `sheet.cssRules` returned
**3 832 rules with no SecurityError**. Four external sheets (`src/index.html:9,10,11` plus the
Manrope `@import` at `src/styles/fonts.scss:5`) are cross-origin and must be skipped gracefully.

**🛑 Resolution via `getPropertyValue` is the trap.** On an *unregistered* custom property it returns
the **substituted token stream**, not a resolved colour. So a value like
`--sidebar-accent: color-mix(in oklab, var(--pr-color-primary-300) 22%, transparent)` comes back as
that literal string — it fails on exactly the tokens the page exists to police. The design has a
workaround; see the page plan.

**jsdom limits the testing split** (verified against the client's jsdom 20.0.3): the CSSOM rule-walk
*does* work in Jest, so **discovery is unit-testable**. `var()` substitution is **not** implemented
in jsdom, so **resolution must be covered by Cypress CT**, not Jest.

---

## 4. State of the work / next steps

| Step | Status |
|---|---|
| Extract palette from the mockup | ✅ done — §1 |
| Map token layers, consumers, Spartan contract, routing | ✅ done — §2, §3 |
| Token plan + contrast audit | ⚠️ done, then **partially refuted** — see §5 |
| `/ui/colors` page design | ⚠️ done, then **partially refuted** — see §5 |
| Adversarial review (technical + completeness) | ✅ done — verdicts **UNSOUND** and **SOUND_WITH_FIXES** |
| **Revise the plan against §5, then OpenSpec `propose`** | ⏳ **not started — this is the next action** |
| Implementation | ⏳ blocked by the SDD gate until the change exists |

### Mandatory before implementing

- **SDD gate:** `onecgiar_pr` is in scope, so `/opsx:propose` must run before any code edit.
- **Spartan MCP + skill are mandatory** for any UI work (see `CLAUDE.md`). ⚠️ The MCP `spartan-ui`
  (registered in `.mcp.json`) **failed to resolve** during this research — `ToolSearch` returned no
  `spartan_*` tools. The `spartan` skill did load. If the MCP is still down, fall back to reading the
  installed sources under `src/app/spartan/` and `node_modules/@spartan-ng/brain/`.
- **Order of operations:** fix the cascade bug (§2.2) **first**, then swap colour. Not the reverse.
- **Verification is visual.** A green build proves nothing here. The header-panel (§2.4), the login
  page and every unauthenticated surface need screenshot comparison. Non-CSS carriers of brand colour
  that a token swap cannot reach — SVG icon components, `assets/` images, Chart.js colour configs,
  `pages/pdf-reports/` styling, exceljs export styling, the `theme-color` meta — must be swept
  explicitly.

### Known open question

Not yet decided: whether the header-panel's four hardcoded gradients become a token
(`--pr-gradient-brand`) or are replaced by a flat fill, since the mockup has **no gradient anywhere**
— it uses flat `#6B46E5`. This is a design call, not a technical one.

---

## 5. Adversarial review — what survived and what did not

Two independent reviewers were run against the plan with instructions to refute it. Verdicts:
**UNSOUND** (technical) and **SOUND_WITH_FIXES** (completeness). Both converged on the same central
defect. Everything below is code-verified.

### 5.1 🛑 BLOCKER — stop 300 is the button fill, not a light accent

The plan kept `#8B6CF5` in slot 300 and put `#6B46E5` in slot 400, reasoning from a Tailwind-utility
tally (`focus-visible:outline-brand-300` ×13, `text-brand-300` ×10) that 300 is "the light-but-legible
accent". **That is empirically false.** Measured in SCSS:

- **95** `background`/`background-color: var(--pr-color-primary-300)` — **39** of them immediately
  followed by `color: var(--pr-color-white)`
- **65** border/outline declarations
- **154** `color:` declarations (plus 6 runtime `[style.color]` bindings)

Stop 300 is simultaneously **the fill, the border and the text stop**.

**The failure:** white on `#6b6dc4` = **4.56:1** (AA pass today) → white on `#8b6cf5` = **3.78:1**
(**AA FAIL** for normal text). Confirmed regressions: the **login `.signin-btn`**
(`login.component.scss:104,130`), the **entire QA header** (`quality-assurance.component.scss:21,23`),
`save-button.component.scss:143`, `add-button.component.scss:26,32`, `steper-navigation.component.scss:51`,
`.toc_button` (`styles.scss:270`), `.completeness-submitted` (`styles.scss:250`, paired with white at
10 px italic), and the Tailwind sites `result-framework-reporting-home.component.html:34` +
`result-framework-reporting-center-card-item.component.html:15` (`bg-brand-300 text-white text-xs`).

**Plus `.open_route`** — the app's universal inline link (`fonts.scss:18-22`, weight 600, **126
occurrences across 68 files**) resolves to **primary-300**, not 400. The plan audited the wrong token
and reported a PASS where the code produces **3.78:1** at the 12 px base size.

**Consequence for the plan:** the numbering decision must be reworked. Whatever lands in slot 300 has
to preserve roughly today's L\* (`#6b6dc4`, L\*≈49.6) so white-on-300 stays ≥ 4.5:1 — i.e. **`#6B46E5`
belongs in slot 300**, or all three roles must be remediated explicitly (~375 sites, not the 16
Tailwind utilities the plan scoped).

### 5.2 🛑 BLOCKER — Spartan's button hover is `bg-primary/80`, unaudited

`src/app/spartan/button/src/lib/hlm-button.ts:13` is
`'bg-primary text-primary-foreground hover:bg-primary/80'`. With `--primary: #6b46e5`, Tailwind emits
`color-mix(in oklab, var(--primary) 80%, transparent)`, composited over white ≈ `#896bea`; white text
on that = **3.92:1** (over the `#f7f7f9` canvas **4.02:1**). **Both fail AA for normal text.** The plan
audited `#FFFFFF` on `#5733C4` (7.85:1) — a colour Spartan's button hover never uses. **Every default
`hlmBtn` in the app is affected the moment the layer-3 wiring lands.**

### 5.3 🛑 BLOCKER — the border-token dedupe makes accessibility worse

`--pr-color-neutral-1000` (`#d9d9d9`) is the real boundary of live form controls
(`custom-fields.scss:73,277`, `pr-select.component.scss:72`, `lead-contact-person-field.component.scss:101,138`,
`search-user-select.component.scss:26`). Aliasing it to `#e3e3e8` makes them **lighter**: 1.412:1 → **1.279:1**
on white. The plan's own remedy (`--pr-border-control: #918ba4`) is never wired to a single one of those
sites. Also, the plan's STEP 5 re-declares `--pr-color-accents-2` and `--pr-color-secondary-50` as
literals, which **undoes** the three-way dedupe that was the whole reason for `--pr-border-default`.

### 5.4 Brand colour the client swap can NEVER reach

> **These were RULED OUT OF SCOPE — see §0.** Kept here as the record of what will stay on the old
> brand and why, so nobody rediscovers it as a surprise. The rows below are findings, not open work.

| Carrier | Evidence | Consequence |
|---|---|---|
| **Excel exports** | `export-tables.service.ts:479` `fgColor: { argb: '5568DD' }` (note: **5568DD**, one digit off the tracked `5569dd`) + zebra tint `:512` `'ECEFFB'`; pinned by `export-tables.service.spec.ts:882` | Every export (user-management, user-report, completeness-status, evidences, bilateral, init-general-results-report) keeps the pre-rebrand brand. The plan's exit grep returns 0 while this is still live. |
| **Notification emails** | **7** `#5569dd` hits across server migrations (`1760593657037`, `1764594729968`, `1765805047192`, `1771276023098`, `1771381453824`) — templates stored **in the DB** | Fixing needs a new server migration. Out of a client-only change. |
| **PDF reports** | `pdf-reports.component.html:1` is only an `<iframe>`; URL comes from the API. Zero `@media print` in the client. Templates live in the server's `platform-report` module (DB-stored) | Every exported result/IPSR PDF stays on the old brand **indefinitely**. Must be recorded as an accepted regression, not omitted. |
| **Raster assets with baked indigo** | `assets/favicon.png` (old periwinkle "PR" mark) · `assets/logos-login.png` (**the only unauthenticated brand surface**) · `assets/login-cover.png` (251 KB, indigo duotone wash over 50 % of the login viewport) · `assets/result-framework-reporting/header_img_v2.png` (132 KB, deep-indigo gradient burned in — the landing surface of the largest module) | Unreachable by CSS. The first brand impression stays old while the buttons beside it turn new. |
| **Server- and TS-supplied colour** | `phase-detail.component.html:104` `[style.background-color]="program.color"` (from API) · impact-area dots bind `impactAreaItem?.color` · `dashboard-lab.component.ts:26-32,42,599` STATUS_COLOR + `FALLBACK_ACCENT '#f2660d'` · `whats-new.service.ts:155-167` — **7** hardcoded hex, not the 1 the plan lists · `mds-progress-ring.component.ts:27` also returns `'#19ae58'` | No token reaches these. |
| **Icon with `@Input` colour** | `pdf-icon.component.html:6` `[attr.fill]="hexadecimalColor"`, default `'var(--pr-color-secondary-400)'` | An SVG `[attr.fill]` — invisible to a CSS-diff verification pass. |

Also missed: `--pr-color-secondary-400` still paints **~17 dark surfaces** (`footer`, `auth-cognito`
background, `collapsible-container` gradient, 6 modals, …). The plan claimed that role "moves to
`primary-800`" but no step re-points any of them. And `reporting-nav-sidebar.component.scss:30` has a
second hardcoded `rgba(255,255,255,0.55) !important` sidebar border that no step touches.

### 5.5 Corrections to the `/ui/colors` page design

1. **The runtime probe was validated against a DEV build.** `dist/` has 465 `.map` files and
   **unhashed** `styles.css`, but `angular.json` production sets `outputHashing: "all"` and leaves
   `optimization` at its `true` default — which enables `inlineCritical`/critters. In production the
   link is rewritten to a deferred `media="print"` form plus an inlined critical `<style>`, so at
   `afterNextRender` the full sheet **may not be in `document.styleSheets`**. The proposed
   `MutationObserver` on `<head>` `childList` does **not** fire for an `onload` media flip on an
   already-present `<link>`.
2. **The "broken token" heuristic false-positives on 13 healthy tokens.** Probing
   `background-color: var(<name>)` returns `rgba(0,0,0,0)` for any non-colour token — which is exactly
   how `colors.scss` deliberately stores its comma triplets (`--pr-color-*-rgb` at lines 16, 31, 60, 76,
   92, 107, 130, 131, consumed via `rgba(var(...), α)` in 40 files), plus `--radius`, `--font-sans`,
   `--pr-font-scale`, `--sidebar-width{,-icon}`.
3. **`hlm-skeleton` and `hlm-separator` still call `classes()`**, which installs a document-wide
   `MutationObserver` (`hlm.ts:42,80`). `hlm-button.ts:62-64` documents why button/input were
   de-`classes()`-ed: on class-heavy pages it drives an **infinite change-detection loop** (the bug that
   froze `hlmInput`, fix `64d68f283`). `/ui/colors` is by design the most class-dense page in the app.
4. **Tailwind's JIT scans raw source text.** Shipping "copy-paste-ready" snippet strings containing
   literal `bg-brand-300` inside `data/token-roles.ts` would **emit those utilities** and permanently
   destroy the page's own orphan detector. Today's baseline is genuinely clean, so the poisoning would
   be irreversible without git archaeology.
5. **`npm run test` does NOT enforce the coverage thresholds** — `package.json` has
   `"test": "jest --no-coverage"` and `collectCoverage: false`. Thresholds only run under
   `npm run test:coverage`. Any gate phrased as "`npm run test` green with coverage ≥ …" is unachievable.
6. **jsdom splits the testing.** The CSSOM rule-walk works in Jest (discovery is unit-testable), but
   `var()` substitution is not implemented — **resolution must be Cypress CT**.
7. **No rollback for the destructive steps.** Deleting the 24-value `:root.dark` block and the
   `fonts.scss` 96-class generator destroys information rather than re-valuing it; a `git revert` of the
   colour commit alone will not restore them. Sequence them **after** visual verification.

### 5.6 What the reviewers tried to refute and could not

- **The contrast arithmetic is sound** — 7 ratios independently recomputed, all matched to 4 dp
  (`#5733C4`/`#EDE9FE` = 6.6100 · `#B45309`/`#FEF3C7` = 4.5097 · `#E9E4FA`/`#271862` = 12.1601 · …).
- **The layer-3 mechanism is correct** — the Helm preset is `@theme inline`, so re-valuing raw vars in
  plain `:root` propagates per element at runtime; "never add a second `@theme` block" holds. Hex
  verified working with `/NN` modifiers (`bg-destructive/10` with `--destructive: #b91c1c` composites to
  `#f8e8e8`, `text-destructive` on it = 5.45:1).
- **Layer 2 needs no edits** — already `@theme inline` with `var()` values.
- **`--color-ink` genuinely has 0 consumers.**
- **Removing `:root.dark` holds** — it can only match `<html>`, `color-scheme: light` is pinned at
  `:root`, and the variant is the descendant selector `&:is(.dark *)`, so `dark:` utilities could never
  target the `.dark` element itself.
- **`src/app/theme/` does not exist**, confirmed independently.

### 5.7 Minor factual corrections

- `.result-list-state` **does not exist** — the only occurrence in the repo is the doc line
  `src/CLAUDE.md:86`. A phantom class carried forward from stale docs.
- `--pr-color-result-level-*` are indirections, not literals (`colors.scss:142-145`). They survive the
  swap intact — which creates a **new** conflict: introducing `--pr-status-{success,danger,info}` at
  `#047857`/`#b91c1c`/`#1d4ed8` puts a second green, red and blue on screen beside result-level-1
  (`#19ae58`), -3 (`#b30319`) and -2/-4 (`#173f5f`/`#2891be`). The results list renders both families in
  one viewport.
- `assets/backgrounds/sidebar-texture.jpg` (114 KB) has **zero references** — free to delete on a
  branch whose deliverable is bundle size.
- Helm preset citation slips: the `dark` custom-variant is at line **20** (not 32); the `@theme inline`
  block starts at **82** with `--color-primary: var(--primary)` at **106**.
- `src/app/pages/locals/` has **zero** PRMS tokens — it runs on stock Tailwind slate
  (`text-slate-700`, `text-slate-400`, `text-slate-600`). It is off the design system entirely, so the
  swap will make it look foreign. Ironically it is also the page recommended as the pattern to copy.

### 5.8 Verification that cannot be done from a browser screenshot

Four of these are not reachable from the SPA at all, and without them the change cannot honestly be
called done: **(1)** an actual Excel export opened in a spreadsheet app (header row fill) ·
**(2)** an actual generated PDF from `/reports/result-details/:id` · **(3)** a received notification
email · **(4)** the browser tab favicon. Add to the screenshot gate: `/login` unauthenticated (logo
lockup + cover tint + all three buttons), the QA header, the completeness/status pill row, the
`steper-navigation` active step, checked checkbox/radio in `custom-fields` (Cypress CT only — the folder
is excluded from Jest coverage), and the RFR home hero banner.
