# Reporting redesign — migration context

**Companion to [`UI-RULES.md`](./UI-RULES.md).** That file is the designer's deliverable and the
authority on *what the UI should be*. This file is what we found in the **existing code** when we
validated it, and it is the authority on *how to get there without breaking things*.

- **Branch:** `performance-refactor` (baseline `9dc66fa39`)
- **Written:** 2026-07-31
- **Related:** [`../design-system-violet-migration.md`](../design-system-violet-migration.md) (token research), [`../../../docs/design-references/prms-shell-CURRENT/`](../../../docs/design-references/prms-shell-CURRENT/) (**only** design reference — 2026-08-04 export)
- **Status:** design validated · **no code changed** · blocked on the SDD `propose`

---

## 1. Verdict on `UI-RULES.md` — adopted

The designer's palette (§2.1) was derived independently from ours, and **the two converged on the
load-bearing stops**: `300 = #6b46e5`, `400 = #5733c4`, `500 = #4a2bb8`, `700 = #33227a`,
`800 = #271862`. Independent convergence on the anchor is strong evidence it is right.

**Decision: ship the designer's 12 values verbatim.** Where our computed scale differed, the deltas
were either negligible or the designer's choice is defensible once §2.2's semantic tokens exist.

Measured deltas, for the record:

| Stop | Designer | Ours | Verdict |
|---|---|---|---|
| 600 | `#3f2499` | `#3a2789` | Negligible (10.92 vs 11.47 on white). Designer's. |
| 900 | `#1b1145` | `#1b1046` | Negligible (17.32 vs 17.37). Designer's. |
| 950 | `#0f0926` | `#0f0a24` | Negligible (19.31 vs 19.28). Designer's. |
| 100 / 200 | `#ede9fe` / `#ddd6fe` | `#c4b5fd` / `#8b6cf5` | **Real conflict — resolved below.** |

### 1.1 The one real conflict, and why the designer already solved it

`UI-RULES.md` §2.1 puts light tints at stops 100/200. That is the canonical shape of a colour ramp,
and for **new** redesign surfaces it is correct. But in the **existing** code those two stops are not
tints — they carry non-text UI roles, so a lighter value drops them under the WCAG 1.4.11 3:1 floor:

```
stop 200 as a border / focus ring, on white:
  #aaa9e0  (today)      2.2197  FAIL   ← already failing
  #ddd6fe  (designer)   1.3885  FAIL   ← 37% worse
  #8b6cf5  (ours)       3.7761  PASS
```

**The designer's own spec resolves this.** `UI-RULES.md` §2.2 defines
`--pr-focus-ring: 0 0 0 3px rgb(107 70 229 / 0.28)` — the focus indicator is built from the **300**,
not the 200 — and Rule 7 states *"Violet is navigation and actions. Content surfaces are neutral.
Inside the content area there must be no violet border"*.

So the legacy sites using stop 100/200 as a border or a focus ring are **already violating Rule 7**.
They should not be preserved; they should be repointed. That makes the designer's ramp correct **and**
fixes an accessibility defect, instead of trading one for the other.

### 1.2 The ~20 legacy sites to repoint (bulk, not file-by-file)

Two mechanical patterns cover almost all of it.

**(a) Focus rings → `--pr-focus-ring` (5 sites, all one file).**
`shared/components/ai-assistant/ai-assistant-panel.component.html` lines **4, 98, 143, 184, 239** use
`focus-visible:ring-brand-200`. At `#ddd6fe` that ring is 1.39:1 — effectively invisible. Repoint to
the semantic focus token.

**(b) Violet borders inside content → `--pr-border` (neutral) or `--pr-color-primary-300` (selected state).**
`border-color: var(--pr-color-primary-200)` at
`bilateral/components/bilateral-sp-selector/…scss:196`,
`bilateral-reporting-way-selector/…scss:31`,
`section-general-info/…scss:333`,
`bilateral-result-level-selector/…scss:32`,
`section-evidence/…scss:401` and `:513`,
plus `result-creator/…/ai-upload-file/…scss:9` (`2px dashed`).
Per Rule 7 the resting border is neutral; only the **selected** state is violet, and it uses 300.
`hover:border-brand-200` at `result-framework-reporting-home.component.html:35`,
`…center-card-item.component.html:2`, `…card-item.component.html:4` — same treatment.

**(c) Two individual text sites.** `header-panel.component.html:370-371` (`text-brand-200`, the
"Admin module" label at 12px) would be 3.78:1 under our ramp and **1.39:1 under the designer's** —
a live AA failure either way. Repoint to `text-brand-300` (5.78:1). Non-negotiable, it is 2 lines.

**(d) Dead code — do not spend time on it.** `shared/components/premium-sidebar/…scss:42` uses stop
200 as text, but `app-premium-sidebar` / `PremiumSidebarComponent` is never instantiated anywhere in
`src/`. Leave it or delete it; do not remediate it.

---

## 2. What the designer could not have known

None of this is a criticism of `UI-RULES.md` — it is code archaeology that only shows up from inside
the repo. All of it is verified.

### 2.1 The swap REPAIRS an existing AA violation

13 rule blocks render `color: primary-300` on `background: primary-50` (e.g.
`phase-management-table.component.scss:45`, `links-to-results-global.component.scss:159`,
`section-toc.component.scss:60`).

```
today     #6b6dc4 on #eaeaf8 = 3.8230  FAIL   ← shipping right now
designer  #6b46e5 on #f5f3ff = 5.2707  PASS
```

The rebrand is not an accessibility risk. It fixes something already broken. The primary itself goes
from 4.5556 → **5.7809** on white.

### 2.2 Blast radius of §1.1 ("one file, app-wide effect")

The claim is correct, and here is the size of it: **~340 files**, **736** `var(--pr-color-primary-*)`
references, **101** `*-brand-*` Tailwind utilities. `primary-300` alone has **404** direct consumers,
split across three roles simultaneously — 95 background fills (39 paired with white text), 65
border/outline declarations, 154 `color:` declarations — plus `.open_route`
(`src/styles/fonts.scss:18-22`), the app's universal inline link, at **126 occurrences across 68 files**.

Anchoring `#6b46e5` at stop 300 satisfies all of those at once, because contrast is direction-symmetric.
That is why the anchor is the whole ballgame.

### 2.3 🛑 Spartan is NOT branded today — Phase 1 is bigger than §2.1+§2.3

`src/styles.scss` lines ~435-461 hold the shadcn/Helm raw vars (`--primary`, `--background`,
`--border`, `--ring`, `--sidebar` + 7 siblings, …) and they are **still shadcn's slate defaults** in
`oklch()`. `--primary` is `oklch(0.208 0.042 265.755)` — no relationship to the PRMS brand.

Consequence: **every Spartan/Helm component renders in slate**, not violet, no matter what
`colors.scss` says. `UI-RULES.md` §2.3 extends the `@theme inline` bridge (correct, needed) but does
not touch this block, so Phase 1 must also repoint those raw vars at the `--pr-*` canon.

**The correct mechanism, verified:** Helm's own preset
(`node_modules/@spartan-ng/brain/hlm-tailwind-preset.css`, `@theme inline` block starting line 82,
`--color-primary: var(--primary)` at line 106) already owns the Tailwind side. So you only change the
**value** of the raw var, in the existing plain `:root`.

🛑 **Do NOT add a second `@theme` block for these.** Declaring `@theme { --color-primary: var(--primary) }`
*without* `inline` makes Tailwind emit `:root,:host{…}`, freezing the value to `:root`. Measured
in-browser: an element inside a scoped override computed the wrong colour. The page theme still looks
right, so **the dark sidebar silently reverts to page colours** — the classic "I wired it and it looks
broken". `@theme inline` resolves per element at runtime; plain `@theme` does not.

### 2.4 🛑 The Spartan button hover fails AA and no token value can fix it

`src/app/spartan/button/src/lib/hlm-button.ts:13` is
`'bg-primary text-primary-foreground hover:bg-primary/80'`. Tailwind compiles `/80` to
`color-mix(in oklab, var(--primary) 80%, transparent)` — the hover is the primary composited at 80%
over whatever is behind it, **not** a darker stop.

```
--primary #6b46e5  /80 over #ffffff → #896bea, white text = 3.9217  FAIL
--primary #6b46e5  /80 over #f7f7f9 → #8769e9, white text = 4.0173  FAIL
```

Every default `hlmBtn` in the app is affected the moment §2.1 lands.

**Fix:** change the recipe to an explicit stop — `hover:bg-brand-400` (`#5733c4`, white text
**7.8479**). One line, and `src/app/spartan/` is vendored into this repo, so it is our code to edit.
This aligns the Helm button with `UI-RULES.md` §3.3, where the `brand` variant already specifies
`hover:bg-[var(--pr-color-primary-400)]` — so the two just agree.

### 2.5 Hardcoded hex the value swap cannot reach

`UI-RULES.md` Rule 8 forbids hardcoded hex. The legacy code has plenty, and it will sit **next to**
the new violet until remediated:

- **`header-panel.component.html`** — the global header, on every screen: 4 nav-pill active states at
  lines **127, 150, 164, 188**, each a hardcoded `linear-gradient(90deg,#6b6dc4,#6461bc,#6461bc)` with
  a matching `rgba(100,97,188,0.4)` shadow, plus ~20 more brand-ish hex in that one template. Its own
  focus rings (`focus-visible:outline-brand-300`, ×6) *would* turn violet — mismatched on the same element.
  ⚠️ Note the mockup has **no gradient anywhere** (Rule 11) — it uses flat `#6b46e5`. Flattening these
  is both the rule-compliant and the cheap answer.
- **`#5457b0`** — an old indigo that appears in **no** palette and in no inventory we built first.
  `result-framework-reporting-home.component.html:51` and
  `…/result-framework-reporting-galaxy/…scss:44` pair it with `var(--pr-color-primary-300)` inside a
  gradient, so it would render **new violet → old indigo**. (Caught by an external review pass, not by us.)
- Counts of exact old-brand hex in `src/`: `#6b6dc4` ×59 · `#6461bc` ×30 · `#5569dd` ×12 · `#5457b0` ×2.
- **`mds-progress-ring.component.ts:27-28`** returns `'#19ae58'` and `'#6b6dc4'`, and
  `mds-progress-ring.component.spec.ts:30,36` **asserts those literals** — the spec goes red unless it
  is updated in the same commit.
- **`whats-new.service.ts:155-167`** has **7** hardcoded hex, not one.
- `dashboard-lab.component.ts:26-32,42,599` and `guided-creation.component.ts:492,498` hold TS colour
  literals; `phase-detail.component.html:104` and the impact-area dots take colour **from the API** —
  no token reaches those.

### 2.6 The RGB triplet drifts silently

`--pr-color-primary-rgb` is consumed as `rgba(var(--pr-color-primary-rgb), α)` in ~68 sites (login
gradients, IPSR dashed borders, bilateral shadows, the AI panel glow). Going `107,109,196 → 107,70,229`
drops ~45% of the green channel, so **every 5-30% overlay shifts hue** from desaturated indigo to
saturated violet. `UI-RULES.md` §2.1 updates the triplet correctly — just know that no test catches
the visual consequence, so these need eyes.

### 2.7 `--pr-color-secondary-400` is the dark-surface token, and it is still slate

`#2a2e45` with **289 references** paints every dark surface: `footer.component.scss:13`,
`auth-cognito.component.scss:10` (the login background), `dynamic-panel-menu.component.scss:4`,
`collapsible-container.component.scss:8,9,46,47`, `user-roles-info-modal.component.scss:3,22`,
`page-alert.component.scss:87`, `custom-fields.scss:346`, and ~9 modals.

`UI-RULES.md` §2.2 routes the sidebar through `--pr-color-primary-800`, which is right for the new
sidebar — but it leaves those ~17 legacy dark surfaces on slate, clashing with the violet chrome.
**Repointing `secondary-400` to `#271862` flips all of them with zero template edits** (white on it =
15.07:1 vs today's 13.33, so every light foreground improves). Recommend folding this into Phase 1.

### 2.8 Other traps worth knowing

- **`reportingTheme.ts` does not exist** — deleted in `50710ea38`. **22 stale references** remain in
  `CLAUDE.md`, `src/CLAUDE.md` and `AGENTS.md`, including the obsolete rule "update SCSS first and
  mirror it in the TS theme". `UI-RULES.md` §0 is right that the docs need fixing; this is a second item
  for that same Phase 0.
- **Dark mode is dead code.** The block is `:root.dark` (not `.dark`) at `styles.scss:464-493`, 24 vars,
  **zero entry points**, with `color-scheme: light` pinned at `:423`. Remove it in Phase 1 rather than
  branding 24 values nobody can reach. ⚠️ Sequence the deletion **after** visual verification — it
  destroys information a `git revert` of the colour commit will not restore.
- **Do NOT "fix" the unlayered `@import 'tailwindcss/utilities.css'`** at `styles.scss:11` by adding
  `layer(utilities)`. Unlayered declarations outrank **all** layered ones in CSS Cascade Level 5, so that
  change would make every Tailwind utility **lose** to legacy SCSS. The unlayered import is currently
  what protects them.
- **`npm run test` does not enforce coverage** — it is `jest --no-coverage`. Thresholds only run under
  `npm run test:coverage`. `custom-fields/` is excluded from Jest entirely; validate it with
  `npm run test:ct`.
- **`hlm-skeleton` and `hlm-separator` still call `classes()`** (`hlm.ts:42,80`), which installs a
  document-wide `MutationObserver`. `hlm-button.ts:62-64` documents why button/input were
  de-`classes()`-ed: on class-heavy pages it drives an infinite change-detection loop (the bug that froze
  `hlmInput`, fix `64d68f283`). Be careful using them on dense new surfaces.
- **`src/app/pages/locals/`** runs on stock Tailwind slate (`text-slate-700`, `text-slate-400`) with
  **zero** PRMS tokens. It is off the design system, so the rebrand will make it look foreign.
- **The Spartan MCP (`spartan-ui`) failed to resolve** in our sessions despite being registered in
  `.mcp.json`. `UI-RULES.md` §3.2 mandates consulting it — if it is still down, fall back to reading
  `src/app/spartan/**` and `node_modules/@spartan-ng/brain/`, and say so rather than working from memory.

---

## 3. Out of scope — decided by the owner, 2026-07-31

**Platform UI only.** Do not re-propose these:

| Excluded | Why it keeps the old brand |
|---|---|
| **PDF reports** | server-rendered; `pdf-reports.component.html:1` is just an `<iframe>`, templates live in the server's `platform-report` module in the DB |
| **Notification emails** | 7 server migrations hardcode `#5569dd`; templates are stored in the DB |
| **Excel exports** | `export-tables.service.ts:479` `argb: '5568DD'` (note: **one digit** off the `5569dd` most greps track) + zebra `:512` `'ECEFFB'`, pinned by `export-tables.service.spec.ts:882`. ⚠️ Client-side and a one-line change — excluded by choice, cheap to fold in later. |

⏸️ **Deferred, needs the designer** (indigo is baked into the pixels, unreachable by CSS):
`assets/favicon.png`, `assets/logos-login.png`, `assets/login-cover.png` (251 KB, tints 50% of the login
viewport), `assets/result-framework-reporting/header_img_v2.png` (132 KB, the landing surface of the
largest module). Not a blocker — screens ship first.

**State this in the proposal as an accepted, time-boxed inconsistency**, not as an unknown.

---

## 4. Phase 1 checklist (amends `UI-RULES.md` §6)

`UI-RULES.md` §6 Phase 1 is "colors.scss, fonts.scss, @theme inline, button cva variants". Based on the
above, Phase 1 must also include:

1. Repoint the **shadcn/Helm raw vars** in `styles.scss:435-461` to the `--pr-*` canon (§2.3). Without
   this, Spartan components stay slate and nothing looks rebranded.
2. Fix `hlm-button.ts:13` — `hover:bg-primary/80` → an explicit stop (§2.4).
3. Repoint `--pr-color-secondary-400` to `#271862` so the ~17 legacy dark surfaces join the rebrand (§2.7).
4. The ~20 stop-100/200 legacy repoints (§1.2) — 2 bulk patterns + 2 individual lines.
5. Update `--pr-color-primary-rgb` and flag the ~68 `rgba()` overlays for visual review (§2.6).
6. Update `mds-progress-ring.component.spec.ts:30,36` in the same commit or the suite goes red.
7. Remove the unreachable `:root.dark` block — **after** visual verification, not before.

**Gate for Phase 1** — `UI-RULES.md` says "no visual regression on legacy screens". Concretely, capture
before/after into `onecgiar_pr/.local-screenshots/` for: `/login` while signed out (logo + cover tint +
all three buttons), the global `header-panel` nav pills, the QA header
(`quality-assurance.component.scss:21`), the completeness/status pill row on any results list
(`styles.scss:249-267`), the `steper-navigation` active step, a checked checkbox/radio in
`custom-fields` (Cypress CT only), and the RFR home hero. Plus `npm run lint`, `npm run test:coverage`
and `npm run test:ct` green.

---

## 5. Open questions still ours to resolve

`UI-RULES.md` §8 lists 6 questions for the BA. Two more, from the code side:

1. **The four `header-panel` gradients** (§2.5) — flatten to `#6b46e5` per Rule 11, or keep a gradient
   as a token (`--pr-gradient-brand`)? The mockup has no gradients. Recommend flattening.
2. **Is `--pr-color-primary-200` allowed to remain a light tint** (designer's `#ddd6fe`) once the ~20
   legacy border/focus sites are repointed off it? Our reading: **yes** — that is exactly what §1.2
   delivers, and it is what makes the designer's ramp and Rule 7 consistent.
