# Gap analysis — new mockup export (2026-08-06) vs implementation

> **Scope (agreed with Yeck):** sidebar + the screen you land on when you open a Science Program
> (`/result-framework-reporting/entity-details/:code`). Nothing else was audited.
>
> **New reference:** `PRMS Reporting.dc.html`, export date **2026-08-06** (zip supplied by Yeck).
> **Previous reference in repo:** `docs/design-references/prms-shell-CURRENT/PRMS-Shell.dc.html`, export **2026-08-04**.
> **Method:** both exports rendered in a browser side by side with the running app (localhost:4200,
> branch `performance-refactor`), computed styles diffed element by element, plus an independent
> pass by a second agent (Grok) over the markup.

---

## 0. What is actually new in this export

Only two things changed between the 08-04 export already in the repo and this 08-06 one. Everything
else listed further down was **already** in the old reference — it is implementation debt, not new scope.

| # | New in 08-06 | Where |
|---|---|---|
| N1 | **Third tab `Results`** on the programme shell — full results table for the programme: `Results` h1, `Columns` + `Export CSV`, search "Search results or indicators…", filters Section / Status / Category / **Origin**, count strip (`8 results · 6 In progress · 1 Submitted · 1 In QA · 0 Approved`), columns CODE · RESULT (title + indicator below) · SECTION (AoW badge + name) · INDICATOR CATEGORY · STATUS chip · UPDATED · `···`. | absent |
| N2 | **Page heading on the Reporting tab**: `Report results linked to the programme's 2026 ToC` — 20px/700, letter-spacing −0.2px, `margin-bottom: 16px`, sits above the toolbar. | absent |

Verification: `grep '>Results<'` → 3 hits in the new export, **0** in the 08-04 one; `Report results linked to…` → 1 hit new, 0 old.

---

## 1. Sidebar

Implementation: `src/app/shared/components/reporting-nav-sidebar/`.

### 1.1 Structural / content gaps

| # | Reference | Current | Where |
|---|---|---|---|
| S1 | `Bilateral Results` is the 4th item of PLATFORM | **Missing.** `PLATFORM_ORDER` includes `'bilateral'`, but the route carries `prHide: true`, so `sections()` filters it out | `routing-data.ts:116`, `reporting-nav-sidebar.component.ts:210-238` |
| S2 | Pin / favourites on "Other science programs": star toggle, max 5, tooltip "You can pin up to 5 programs.", pinned block + divider, and pinned programmes also show on the collapsed rail | **Not implemented** (no pin UI, rail shows `mySPsList()` only) | `reporting-nav-sidebar.component.html:123-142`, `.ts:256` |
| S3 | Groups are `My science programs` + `Other science programs` | Extra third group **`Other projects`** | `reporting-nav-sidebar.component.ts:262-267` |
| S4 | EXTRAS holds **only** `Release notes` | `Release notes` + `Notifications` (with red badge) + `Text size` | `reporting-nav-sidebar.component.html:373-413` |
| S5 | One `My Admin` entry opening 5 children (General results report · Tickets dashboard · Phase management · Knowledge products · User management) | Split into `My Admin` (1 child) + `Admin module` (4 children, admin-only) | `reporting-nav-sidebar.component.ts:173-187` |
| S6 | Child labels `Tickets dashboard`, `Knowledge products` | `Tickets Dashboard`, `Knowledge Products` (title case) | `reporting-nav-sidebar.component.ts:183-186` |
| S7 | Collapse control lives **only** in the topbar | Topbar toggle **+** an in-sidebar expand button **+** an invisible `hlmSidebarRail` edge | `reporting-nav-sidebar.component.html:32-41, 460` |
| S8 | No children panel while collapsed (tooltip only) | 260px hover flyout for My Admin / Admin module | `reporting-nav-sidebar.component.html:464-531` |
| S9 | No result metadata in the sidebar | White "Result metadata" card pinned at the bottom in result-detail | `reporting-nav-sidebar.component.html:422-457` |

### 1.2 Measurements

| # | Reference | Current | Where |
|---|---|---|---|
| S10 | Expanded width **260px** | **280px** (`sidebarWidth="280px"`; the programme route even declares `sidebar: { width: 300 }`) | `app.component.html:7`, `routing-data.ts:573,581` |
| S11 | Collapsed width **64px**, programme buttons 32×32 on `#33227A` with `1px rgba(255,255,255,.10)` border | **~40px** — icons crammed against the edge, brand mark clipped; inactive buttons transparent/borderless | `app.component.html:7` (`sidebarWidthIcon`), `.scss:380-402` |
| S12 | Section labels `#8B7CC4` | `#a79bd4` (`--pr-sidebar-fg-muted`) | `colors.scss:209-210` |
| S13 | Brand = 32×32 tile, radius 8, `rgba(109,75,226,.42)`, letters **"PR"** 13px/700; different tile background when collapsed | `assets/brand/prms-logo.png` in both states | `reporting-nav-sidebar.component.html:9` |
| S14 | "Other…" rows contiguous (no gap); bottom fade always visible while open | `gap: 1px`; fade only when `items.length > 6` | `.scss:566-571`, `.html:139-141` |
| S15 | Platform icons are bespoke inline SVG — Results Center = 2×2 grid, Bilateral = exchange arrows, My Admin = sliders, Release notes = document | Lucide set — `lucideFileText`, `lucideHandshake`, `lucideSettings`, `lucideRocket` | `reporting-nav-sidebar.component.ts:160-166`, `.html:387` |
| S16 | No divider between PLATFORM and EXTRAS (only the label's `padding-top: 20px`) | `hlmSidebarSeparator` line at `rgba(255,255,255,.12)` | `.html:371`, `.scss:278-280` |
| S17 | Rail tooltips: custom dark `#191524`, 12px/500, `left: 42px` | Native `title` on programmes, Spartan BrnTooltip on nav | `.html:63-64` |
| S18 | Centre diamond fixed `#2FA396`; no centre diamonds on the collapsed rail | Per-centre colour from `programDotColor()`; centres do appear on the rail | `.html:68-81,166`, `.ts:593-600` |
| S19 | Scrollbar thumb `rgba(255,255,255,.16)` | `rgba(255,255,255,.22)` | `.scss:94-101` |

> ⚠️ **S12 is a deliberate deviation, not a bug.** `colors.scss:210` records that `#8b7cc4` **fails
> AA contrast** on both sidebar surfaces, which is why the token was raised to `#a79bd4` (6.2:1).
> Matching the mockup here would knowingly break accessibility — decide, don't just "fix".

---

## 2. Science Program screen

Route `entity-details/:entityId` is served by **`dashboard-lab`** (`routing-data.ts:576-583`); the old
`entity-details.component.*` is retired and no longer routed. Relevant components:
`components/reporting-program-band/`, `components/program-overview/`, `components/reporting-aow-table/`.

### 2.1 Shell (band + tabs)

| # | Reference | Current | Where |
|---|---|---|---|
| P1 | Three tabs: Overview · Reporting · **Results** | Two tabs; `activeTab` is typed `'overview' \| 'reporting'` | `reporting-program-band.component.html:106-129`, `.ts:56` |
| P2 | Programme title box height **41px** (descenders breathe) | ~~30px, the "g" of "Breeding" clipped~~ **FIXED 2026-08-11** — `leading-none` → `leading-[1.35]`, box now 41px | `reporting-program-band.component.html:38` |
| P3 | Eyebrow `SP01` 11px/600, letter-spacing 0.88px | 12px/500, letter-spacing 0.96px | band markup |
| P4 | On scroll the band **collapses into a sticky compact bar**: dot + programme name + the three tabs + `Report emerging result`, topbar stays fixed | ~~Both scrolled out of view~~ **FIXED 2026-08-11** — the sticky sat on boxes only as tall as themselves (`app-shell-topbar` host = 56px; the band's host = band + toolbar). Moved to the topbar host, and `display: contents` on the band host so its sticky resolves against the page column; band pinned at `top-[56px]`. Both now hold. **Still missing: the compact/condensed variant** — the band stays at full 136px height | `shell-topbar.component.scss:6-14`, `reporting-program-band.component.scss:1-8`, `.html:18` |
| P5 | Topbar carries the reporting-cycle chip `2026 · P25 ⌄` and the user's **full name** next to the avatar | No cycle chip (deferred), avatar initials only | `shell-topbar.component.html:25` |

### 2.2 Overview tab

| # | Reference | Current | Where |
|---|---|---|---|
| P6 | Status legend, in order: **Not started · In progress · Submitted · In QA · Approved** | **In QA · Submitted · Pending · In progress** — `Not started` and `Approved` never render, `Pending` is invented | `dashboard-lab.component.ts:36-68,715-729` |
| P7 | Segment colours `#F3F4F6 / #FEF3C7 / #DBEAFE / #CFFAFE / green`, legend dots `#6B7280 · #B45309 · #1D4ED8 · #0E7490 · #047857`, bar height 44px with the count inside the segment | Different token set (e.g. not-started fg `#4b5563`); narrow segments overlap their numbers ("1 1" printed on top of each other) | `colors.scss:217-226` |
| P8 | Reporting pace copy: *"At this pace you'll finish 16 days after the deadline."* + *"You need 2.9 results per week to close on time. Current pace: 2.2."* | *"5% of 40 results are quality-assessed or submitted this phase."* + *"32 still editing · 1 in QA · 1 submitted."* | `dashboard-lab.component.ts:809-819` |
| P9 | Pace sparkline is data-driven (area + line + dashed projection + deadline marker) | **Hard-coded SVG paths** (`M8 72 L96 64 L150 52 …`) — identical for every programme | `program-overview.component.html:57-96` |
| P10 | `Needs attention`: 4 typed items with a per-type 16px SVG icon (stale drafts, AoW with no results, emerging results awaiting submission, results missing evidence) | Generic 10×10 dot; the list repeats `AOWxx has no results reported yet` three times | `program-overview.component.html:167-170` |
| P11 | `Impact so far → Countries reached`: count + per-country ranked bars | Component never receives `[countries]` → permanent empty state "Country reach is not available yet for this program." | `dashboard-lab.component.html:1155-1163`, `program-overview.component.html:214` |
| P12 | Cross-cut rows read `Intermediate outcomes` / `2030 outcomes` (lowercase) | `Intermediate Outcomes` / `2030 Outcomes` | data-driven, `program-overview.component.html:139` |
| P13 | AoW rows sorted by completion ascending (0%, 25%, 33%, 50%…) | Sorted by AoW code | `dashboard-lab.component.ts` grouping |

### 2.3 Reporting tab

| # | Reference | Current | Where |
|---|---|---|---|
| P14 | h1 `Report results linked to the programme's 2026 ToC` above the toolbar | Absent (N2) | `reporting-program-band.component.html:135-138` |
| P15 | Filters are custom dropdowns (40px pill + panel). **`Section` is multi-select** — checkboxes grouped under "Areas of work" / "Programme-level", trigger reads "N sections"; `Type` / `Category` / `Status` are single-select panels with the active option tinted `#F5F3FF` / `#5733C4` | ~~Raw `<select>` ×4~~ **FIXED 2026-08-11** — new `app-pr-filter-select` (single, sibling of the existing `app-pr-filter-multiselect`) for Type/Category/Status; Section now uses the grouped multiselect with `countLabel="sections"`. Pills styled like the Results Center toolbar | `pr-filter-select/`, `reporting-program-band.component.html:155-200`, `.scss:9-80` |
| P16 | `Category` lists indicator categories (Innovation development, Capacity sharing…) | ~~**164 options that are indicator names**~~ **FIXED 2026-08-11** — the options and the match both fell back to `type_name`, which carries the indicator's own name; now `result_type_name` only → 5 real categories | `dashboard-lab.component.ts:1276-1281, 1409-1417` |
| P17 | Toolbar on one row (search + 4 filters + Grouped/All indicators) | ~~Wrapped to two rows at 1440px~~ **FIXED 2026-08-11** as a side effect of P15 — the pills are narrower than the old selects, everything fits on one row | `reporting-program-band.component.html:136-137` |
| P18 | AoW cards **all start collapsed** | Cards are already separate and correctly styled; only the **first one loads expanded** | `reporting-aow-table.component.html` |
| P19 | Long KPI titles clamp with an inline **`Show more`** | Truncated with ellipsis, no affordance | `reporting-aow-table.component.html` |
| P20 | KPI subtitle = the indicator name ("Number of knowledge products published and quality-assured") | Subtitle = the category ("Knowledge product"). The payload **does** carry the name in `type_name` — `typologyOf()` deliberately picked the category because the reference was read as "short KPI name, which we don't get" | `reporting-aow-table.component.ts:181-183` |
| P21 | `Achieved` shows `—` when there is no value | Shows `0` | `reporting-aow-table.component.html:194-205` |
| P22 | Bucket chip reads `Intermediate outcomes` | Chip reads `Intermediate` | `reporting-aow-table.component.ts:331` |
| P23 | `Columns` control on the "All indicators" view (optional Parent / Center columns) | Absent | — |

**Already matching** (checked, no action): AoW badge (12px/500 JetBrains Mono, `#5733C4` on `#EDE9FE`, radius 6, padding 3/8), `HIGH LEVEL OUTPUTS · N KPIs` band, search box 320×36, selects 40px tall, `Grouped | All indicators` labels, content pad 32px, 12-col grid gap 16, `done/total` format on Overview, card radius 12 and border colour.

---

## 2.4 Status — what shipped on 2026-08-11

Everything below was implemented and verified in the browser on this branch (uncommitted). Full gate
after the work: **5379 Jest tests / 428 suites green, `ng lint` clean, `ng build` succeeds.**

**Sidebar** — S1 (Bilateral Results now in PLATFORM: the route's `prHide` was hiding it, and the only
other consumer of that flag, the legacy top nav, is dead code) · S2 (pin/favourites, cap 5,
localStorage, pinned block + collapsed rail) · S6 · S10 (260px) · S11 (64px rail, 36×36 buttons,
reference colours — plus a follow-up fix: the 36×36 unlayered rule beat Helm's layered
`group-data-[collapsible=icon]:hidden`, so every label came back clipped to one letter) · S13 ("PR"
tile) · S14 · S16 · S19.

**Program shell** — P2 · P3 (root cause: `.pr-code` is unlayered SCSS and beats the Tailwind
utilities beside it — the same trap exists anywhere else that class meets `text-[…]`) · P4 (sticky +
compact band, scroll listener outside the Angular zone) · P14 · P17.

**Overview** — P6/P7 (fixed slot order, `Not started` + `Approved` always rendered, number hidden in
segments ≤8% wide) · P8/P9 (the cycle end date **does** exist — `GET /api/versioning` carries
`start_date`/`end_date` per phase and the SP payload's `versionId` is that phase — so the pace card
projects for real and degrades honestly when the cycle hasn't opened) · P10 (icon per type, the N
empty-AoW lines collapsed into one) · P12 · P13 (was already correct).

**Reporting table** — P18 · P19 (the "Show more" existed but lived *inside* the clamped paragraph, so
the clamp hid it — now outside, with a regression test on its DOM position) · P20 · P21 · P22.

### Still open

| Item | Why |
|---|---|
| **N1 — Results tab** | Needs backend: no endpoint returns a programme's results with their **section/AoW** or an **updated** date. `/results-framework-reporting/dashboard` returns counts only; `/results/get/all/roles/filter/…` has neither column. |
| **P11 — Countries reached** | Needs backend: no aggregate country endpoint. Cheapest path is adding `SELECT country, COUNT(DISTINCT r.id) … GROUP BY country` to `getDashboardStats` (`results-framework-reporting.service.ts:899`), then binding `[countries]`. |
| **P21 — `—` vs `0`** | prtest returns `0` for every `achieved`, never `null`. The reference treats `0` as unreported and prints `—`; we kept the `0` with muted colour + "Nothing reported yet" tooltip. One-line change if you prefer the reference verbatim. |
| **P23 — `Columns` control** | Not built. |
| **S12 — label colour** | `#a79bd4` kept on purpose: `#8B7CC4` fails AA on both sidebar surfaces. |
| **S3/S4/S5** | "Other projects", Notifications + Text size in EXTRAS, My Admin / Admin module split — extra vs the mockup, left in place: removing shipped functionality is a product call. |
| **P5 — cycle chip in topbar** | Deferred by design (no cycle picker in the shell yet). |
| **Two alert types** | "emerging results waiting for submission" and "results missing evidence links" have no data in the component's payloads; their icons are registered so they light up when the data lands. |

---

## 3. Suggested order of work

1. **P4** (sticky band/topbar) — everything else on this screen is judged while scrolling.
2. **P16** (Category filter serving 164 indicator names) — functional bug.
3. **P15** (native `<select>` → design-system dropdowns) — biggest visual break and a rule violation.
4. **P6 / P7** (status set, order and colours) — the Overview reads wrong today.
5. **P18 / P19 / P20 / P21** — Reporting tab detail.
6. **S1, S10, S11, S13** — sidebar: missing Bilateral entry, widths, collapsed rail, brand tile.
7. **P8 / P9 / P11** — pace copy + real sparkline + countries binding (needs data plumbing).
8. **N1 / N2** — the genuinely new scope (Results tab + Reporting heading).
9. Polish: S3–S9, S14–S19, P2, P3, P10, P12, P13, P22, P23.

Decisions needed from Yeck before touching: **S12** (contrast vs mockup), **S3/S4/S5** (extra sidebar
items that the mockup does not have — keep or drop), **P5** (cycle chip in the topbar was deferred on purpose).
