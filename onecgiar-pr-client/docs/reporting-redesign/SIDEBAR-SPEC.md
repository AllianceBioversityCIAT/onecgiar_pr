# Sidebar — exact spec extracted from the mockup

> ⚠️ **Line numbers below point at the LEGACY export.** The sidebar shipped from these values and
> is verified in the browser, so the spec is accurate; only the `:NNN` anchors are stale. Current
> reference: [`../../../docs/design-references/prms-shell-CURRENT/`](../../../docs/design-references/prms-shell-CURRENT/).


**Source:** `docs/design-references/legacy-prms-reporting-tool-mockup/Resultados.dc.html` lines **28-197**
(the `<nav>` element). Every value below was read from the markup, not interpreted from a screenshot.

**Target component:** `src/app/shared/components/reporting-nav-sidebar/` (615-line template, 580-line
TS, 569-line spec). Extend it — do not replace it. Its data model already supports this structure.

> ⚠️ **The reference contradicts itself.** `screenshots/reporting-table.png` shows a *different*
> sidebar (single-program context: `SP01 / Breeding for Tomorrow` · WORK · Overview / My work /
> Reporting / Results explorer). **Decision (Yeck, 2026-07-31): implement the HTML version** — the
> multi-programme one specified here. The screenshot variant is a separate, later phase because it
> changes information architecture and routing, not just presentation.

---

## 1. Structure, top to bottom

```
HEADER                    64px
  [PR] 32×32              PRMS 16/600  ·  Reporting 11/500
──
MY SCIENCE PROGRAMS       label 11/600 uppercase
  ● SP01  name        ✓   44px card, bordered
  ● SP02  name            44px card
⌄ OTHER SCIENCE PROGRAMS  32px toggle, count right-aligned in mono
    ● SP03 name           30px row (collapsed list, max-height 196px, scrolls)
──
MY CGIAR CENTERS          label 11/600 uppercase   (only when the user has centers)
  ◆ CIAT                  44px card, diamond marker
──  divider 1px, margin 16px 0
PLATFORM                  label 11/600 uppercase
  ⌕ Results Center        36px
  ▢ Innovation Packages   36px
  ⛨ Quality Assurance     36px
  ☰ Bilateral Results     36px
  ⚙ Administration     ⌄  36px, expands
──
EXTRAS                    label 11/600 uppercase, padding-top 16px
  ▤ Release notes         36px
```

**Ordering note:** the mockup places programmes **above** the platform links, separated by a divider.
Today the app nests programmes *inside* "Results planned in your 2026 ToC". Lifting them to the top
level is the main structural change.

---

## 2. Exact values

### Container

| Property | Value |
|---|---|
| Background | `#271862` → `--pr-sidebar-bg` |
| Right border | `1px solid rgba(255,255,255,.10)` → `--pr-sidebar-border` |
| Height | `100vh`, `flex-direction: column` |
| Width transition | `width 200ms ease` |

### Header (64px)

| Element | Spec |
|---|---|
| Row | `height: 64px`, `flex: none`, `align-items: center`, `gap: 10px`, `padding: 0 6px` |
| `PR` mark | `32×32`, `border-radius: 8px`, `background: rgba(255,255,255,.12)`, `font-size: 13px`, `font-weight: 700`, `letter-spacing: .02em`, `color: #FFFFFF` |
| Title | `16px / 600`, `letter-spacing: -.01em`, `#FFFFFF` |
| Subtitle | `11px / 500`, `#9C8FD8` → `--pr-sidebar-fg-muted`-ish |

### Section labels (all of them)

`font-size: 11px` · `font-weight: 600` · `letter-spacing: .08em` · `text-transform: uppercase` ·
`color: #9C8FD8` · `padding: 8px 8px 6px` (the `MY CGIAR CENTERS` label uses `14px 8px 6px`, and
`EXTRAS` uses `16px 8px 6px` — extra top space where a new block starts).

### Programme card — "my" programmes (44px)

| Property | Value |
|---|---|
| Box | `height: 44px`, `gap: 8px`, `width: 100%`, `padding: 0 10px`, `border: 1px solid <state>`, `border-radius: 8px`, `text-align: left` |
| Hover | `background: #3A2789` → `--pr-color-primary-700` |
| Dot | `8×8`, `border-radius: 999px`, colour per programme |
| Code | **`JetBrains Mono`**, `12px / 600`, `color: #C4B5FD` → `--pr-sidebar-accent` |
| Name | `14px`, weight varies by active state, `color: #E9E4FA` → `--pr-sidebar-fg`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis` |
| Active marker | 13×13 check SVG, `stroke: #C4B5FD`, `stroke-width: 1.7` |

### "Other science programmes" toggle (32px) and its list (30px rows)

| Element | Spec |
|---|---|
| Toggle | `height: 32px`, `gap: 6px`, `margin-top: 10px`, `padding: 0 8px`, `border: none`, `border-radius: 6px`, `background: transparent`; hover `rgba(255,255,255,.07)` |
| Toggle chevron | 12×12, `stroke: #A79BD4`, `stroke-width: 1.4`, rotates |
| Toggle label | same 11/600 uppercase `.08em` `#9C8FD8` as a section label |
| Count | **`JetBrains Mono`**, `11px / 500`, `font-variant-numeric: tabular-nums`, `#A79BD4` |
| List container | `gap: 1px`, `max-height: 196px`, `overflow-y: auto` |
| Row | `height: 30px` (`min-height: 30px`, `flex: none`), `gap: 8px`, `padding: 0 8px`, `border: none`, `border-radius: 6px`; hover `rgba(255,255,255,.07)` |
| Row dot | `6×6`, `border-radius: 999px` |
| Row code | **`JetBrains Mono`**, `11px / 500` |
| Row name | `13px / 400`, ellipsised |
| Empty state | `height: 30px`, `13px / 400`, `#A79BD4`, text `"No program matches."` |

### CGIAR centre card (44px)

Same box as a programme card, except the marker is a **rotated square**:
`8×8`, `transform: rotate(45deg)`, no border-radius. Hover changes `border-color` to `#8B6CF5`
(→ `--pr-color-primary-200` in the approved ramp). No code column — name only, `14px`.

### Divider

`height: 1px` · `background: rgba(255,255,255,.10)` · `margin: 16px 0`.

### Platform link (36px)

| Property | Value |
|---|---|
| Box | `height: 36px`, `gap: 10px`, `padding: 0 8px`, `border-radius: 8px` |
| Text | `14px / 500`, `color: #E9E4FA` |
| Icon | `15×15`, `color: #A79BD4`, `stroke-width: 1.75` |
| Hover | `background: rgba(255,255,255,.07)`, `color: #FFFFFF` |
| Active | `background` + `box-shadow` per state, **plus a left rail**: `position: absolute; left: -6px; top: 10px; bottom: 10px; width: 3px; border-radius: 0 2px 2px 0; background: #6B46E5` |
| Badge dot | `6×6`, `border-radius: 999px`, `background: #6B46E5`, positioned `top: 8px; right: 8px` (collapsed rail) |

### Collapsed rail

| Element | Spec |
|---|---|
| Programme / centre button | `32×32`, `border-radius: 8px`, `border: 1px solid <state>`; marker 8×8 centred |
| "Other programmes" button | `32×32`, `border: 1px dashed rgba(255,255,255,.24)`, `background: transparent`, `color: #A79BD4`, plus-icon 14×14 |
| Divider | `width: 32px`, `height: 1px`, `margin: 12px 0` |
| Nav item | `44×44`, `border-radius: 8px`; active left rail as above |
| Nav icon | `20×20` |
| Tooltip | `position: absolute; left: 52px; top: 11px; z-index: 50`, `padding: 5px 10px`, `border-radius: 8px`, `background: #0F0A24` (→ `--pr-color-primary-950`), `12px / 400`, `#FFFFFF`, `white-space: nowrap`, `pointer-events: none` |

### Footer — user chip

From the same markup region (`Resultados.dc.html:266-273`, rendered in the topbar in the mockup but
specified here because the app puts it in the sidebar footer):

| Element | Spec |
|---|---|
| Avatar | `28×28`, `border-radius: 999px`, `background: #EDE9FE`, `color: #5733C4`, `11px / 600`, initials |
| Name | `14px / 500` |
| Chevron | 12×12, `stroke: #9691A8`, `stroke-width: 1.4` |

⚠️ On the dark sidebar the avatar pair (`#EDE9FE` bg / `#5733C4` fg) still measures **6.6100:1**
internally, so it is safe — but the *name* colour must come from `--pr-sidebar-fg`, not the mockup's
`#191524`, which was specified for a white topbar.

---

## 3. What the app has that the mockup does not

These exist in the current sidebar and are **not** in the mockup's markup. They are not covered by
"make it exact" — a decision is needed per item rather than silent deletion:

- **`Testing environment` badge** — environment-gated, genuinely useful. Recommend keeping.
- **`Text size`** (`FontScaleService`) — an accessibility control (WCAG 1.4.4). Recommend keeping;
  `EXTRAS` is the natural home.
- **`Notifications`** — the mockup puts notifications in the **topbar**, not the sidebar
  (`Resultados.dc.html:239-263`). Moving it is a topbar change → Phase 4.
- **`My Admin`** vs **`Admin module`** — the mockup has one `Administration` entry. The app has two
  distinct role-gated surfaces. Needs a product decision.
- **Result-detail section links** (`resultSections`) — the app nests the open result's sections in
  the sidebar. The mockup has no equivalent; it uses a drawer (Phase 6).

## 4. What the mockup has that the app does not

- **Programmes at the top level**, above the platform links, rather than nested under "Results
  planned in your 2026 ToC".
- **`MY CGIAR CENTERS` as its own labelled block** with the diamond marker (the app has
  `My CGIAR Centers` as a link inside the RFR box).
- **Mono programme codes** (`SP01`) beside every programme name.
- **The 3px left rail** on the active item (the app uses a filled gradient pill instead).
- **`Other science programmes` count** in mono, tabular.

---

## 5. Implementation notes

- The TS already exposes what is needed: `programGroups` (`{key, label, items: SPProgress[]}` with a
  `'mine'` group), `sections`, `myAdminLinks`, `adminModuleLinks`, `openGroups`, `isCollapsed`,
  `iconFlyout`, `userMenuOpen`. **No new data plumbing is required for the structural move** — this
  is largely a template reorder plus exact sizing.
- Every colour must come from the token layer (`--pr-sidebar-*`, `--pr-color-primary-*`). The old
  hardcoded `#1f2233` / `#6b6dc4` values were already removed in the token-layer commit.
- Type sizes are **px, not rem**: `html` is 12px, so `text-sm` = 10.5px. Use `text-[14px]`,
  `text-[11px]`, `text-[13px]` (UI-RULES §1.3).
- Mono comes from Tailwind `font-mono`, wired to JetBrains Mono in the token-layer commit.
- `reporting-nav-sidebar.component.spec.ts` is **569 lines** and asserts structure. It must be
  updated in the same change or the suite goes red.
- Icons: Lucide only (`@ng-icons/lucide`). The mockup's inline SVGs map to
  `lucideSearch` (Results Center), `lucideBriefcase`/`lucideBox` (Innovation Packages),
  `lucideShieldCheck` (Quality Assurance), `lucideMenu`/`lucideList` (Bilateral Results),
  `lucideSettings` (Administration), `lucideFileText` (Release notes). Confirm each against the
  Spartan/ng-icons registry before use — do not invent names.
