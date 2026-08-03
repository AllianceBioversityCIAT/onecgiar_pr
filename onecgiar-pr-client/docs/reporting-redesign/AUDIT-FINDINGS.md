# Static audit — violet token + sidebar refactor

**Scope:** commits `9dc66fa39..deabc7855` on `performance-refactor` (token layer + sidebar restructure).
**Method:** static code analysis only — no browser, no dev server. 6 parallel auditors, then adversarial
verification of every candidate. **29 candidate findings, 26 confirmed or partially confirmed.**
**Date:** 2026-08-01

⚠️ **Coverage gap:** 2 of 6 auditors (`sidebar-logic`, `contrast`) died mid-run on an API error. Their
dimensions were partly covered by the others, but **this audit is not exhaustive on sidebar logic or
on the full contrast matrix**. Re-run those two before treating the list as complete.

The suite is green (5205 tests, coverage 82/75/78/83) and `ng lint` is clean, so **everything below is
invisible to the current gate**.

---

## P1 — introduced by this refactor, visibly wrong

### 1. The colour sweep injected literal spaces into 10 Tailwind arbitrary values

**Files:** `header-panel.component.html:127,150,164,188` · `navigation-bar.component.html:51` ·
`result-framework-reporting-home.component.html:51` · `dashboard-lab.component.html:620,636,693` ·
`lab-report-form.component.html:194`

The sed replaced `rgba(107,109,196` (no spaces) with `rgba(107, 70, 229` (**with** spaces). An HTML
`class` attribute is tokenised on whitespace, so `shadow-[0_4px_12px_rgba(87, 51, 196,0.4)]` becomes
three garbage tokens. No CSS selector can contain a space, so **the declaration can never apply** —
regardless of what Tailwind emits. Verified: the same grep against `9dc66fa39` returns 0 hits, so the
sweep caused it. No `tailwind.config.*` and no `safelist` exist to rescue it.

**Effect:** ten box-shadow / hover-border declarations are dead. Active header and nav pills lose their
violet glow and top highlight (they read flat); Dashboard Lab AoW rows lose the hover border; the lab
report submit CTA and the RFR Home CTA lose their elevation.

**Fix:** strip the spaces (`rgba(87,51,196,0.4)`) or use `_`, which Tailwind converts to a space.
Then add a lint guard forbidding `, ` inside a class-attribute `[...]`.

**Severity note:** one verifier downgraded this to P2 — every lost declaration is decorative; nothing
becomes unreadable or non-functional.

---

### 2. The active-programme checkmark is painted the exact colour of the card it sits on

**File:** `reporting-nav-sidebar.component.html:71`

The icon uses `text-sidebar-accent` → `--sidebar-accent` → `--pr-sidebar-elevated` →
`--pr-color-primary-700` = **`#33227a`**. The active card's background is
`.pr-nav-program-card--active { background: var(--pr-color-primary-700) }` = **`#33227a`**.

**Contrast: 1.0000:1 — literally invisible.**

This is a token-name collision I walked into: `--sidebar-accent` (Helm's elevated *surface*) versus
`--pr-sidebar-accent` (the lilac `#c4b5fd` *foreground*). One character of difference, opposite roles.

**Effect:** the user cannot see which programme is selected — the only other cue is a subtle border.

**Fix:** `class="text-[var(--pr-sidebar-accent)]"` (lilac `#c4b5fd` on `#33227a` ≈ 7.4:1), or drop the
Tailwind alias and use the `--pr-*` token directly to avoid the name collision entirely.

---

### 3. `--background` and `--muted` resolve to the same hex, so the `outline` button has no hover

**File:** `styles.scss:490` and `:503` (values at `colors.scss:184`, `:186`)

```
--background: var(--pr-surface-app)    → #f7f7f9
--muted:      var(--pr-surface-subtle) → #f7f7f9   ← identical
```

Helm's `outline` variant is `bg-background hover:bg-muted`. Both sides are the same colour, so
**hovering an outline button changes nothing**.

**Fix:** point `--muted` at a distinct step (e.g. `--pr-color-primary-25` `#faf9fe` for a brand-tinted
hover, or introduce a neutral `--pr-surface-hover`). `--secondary` has the same value and needs the
same review.

---

### 4. Ghost buttons inside the dark sidebar hover to a near-white pill

**File:** `hlm-button.ts:24`, consumed by `hlm-sidebar-trigger.ts:11`

`ghost` is `hover:bg-muted`, and `--muted` is now the light `#f7f7f9`. Inside the sidebar
(`#271862`) that is **14.09:1 against the surface** — a white slab appears under the cursor.

**Effect:** the sidebar collapse trigger and any ghost button in the sidebar flash a white pill on hover.

**Fix:** scope a dark `--muted` inside `hlm-sidebar` alongside the other `--sidebar*` overrides, so
Helm's own recipes stay correct in that subtree.

---

## P2 — mixed old/new brand, or a state that lost its meaning

| # | Finding | File |
|---|---|---|
| 5 | **Hover and selected collapsed into the same border** on the bilateral result-level cards after the 200→300 repoint — the hover no longer previews anything | `bilateral-result-level-selector.component.scss:31-40` |
| 6 | **Guided-creation CTA: rest is new violet, hover is the retired indigo** `#4a4c9c` (stale `--gc-brand-ink`) | `guided-creation.component.scss:19` (declared), `:73` (consumed) |
| 7 | **Admin-module menu hover became a no-op** — the 200→300 repoint made rest and hover identical | `header-panel.component.html:370-371` |
| 8 | **`rfr-explanation` mixes new violet with a stale old-indigo accent** (`--x-violet-2`), used in 10 places | `rfr-explanation.component.scss:8` |
| 9 | **Galaxy's `LEVEL_ACCENT.program = '#8a8ce0'`** was missed by the sweep (a TS literal, not a hex the sed matched) | `result-framework-reporting-galaxy.component.ts:51` |
| 10 | **Focus ring on any `hlmBtn` inside the dark sidebar is 2.61:1** (1.60:1 at the `/50` alpha the recipe actually uses) — under the 3:1 non-text floor | `hlm-button.ts:9` |
| 11 | **`programDotColor()` has zero tests** and is fed `center_id` — a string it was not designed for | `reporting-nav-sidebar.component.ts:575-583` |
| 12 | **`custom-fields/` appearance changed** (focus rings, checked states, borders) and is excluded from Jest entirely — only `npm run test:ct` can see it | `custom-fields.scss:48,202,305-306,324,328` |
| 13 | **`ai-assistant-panel` is globally mounted, was restyled, and has no spec of any kind** | `ai-assistant-panel.component.html:1` |

### Pre-existing, not caused by this refactor (but now worth fixing)

| # | Finding | File |
|---|---|---|
| 14 | **Five `var()` references dead-end** — `--pr-color-error`, `--pr-color-error-light`, `--pr-color-blue-200-rgb`, `--p-tieredmenu-*`, `--primary-blue-600`, `--text-color-secondary`. The last four were injected by PrimeNG, which is gone. Declarations are dropped: the Result Creator validation error renders as ordinary body text with a transparent panel. | `report-result-form.component.scss:82,85` · `step-n4-partner-co-investment-table.component.scss:20` · `entity-details.component.scss:123-124` · `result-ai-item.component.scss:240` · `pr-radio-button.component.scss:17` |

---

## P3 — dead code and debt

| # | Finding | File |
|---|---|---|
| 15 | **`togglePlanned()` / `plannedExpanded` orphaned** by the restructure — and **4 tests still certify them**, giving false confidence | `reporting-nav-sidebar.component.ts:265,380-384,394-399` |
| 16 | **`count(sp)` orphaned** by the new programme cards — 3 tests certify unreachable code | `reporting-nav-sidebar.component.ts:497-501` |
| 17 | **Dead SCSS** left by the restructure: `.pr-nav-rfr-box`, `.pr-nav-rfr-box--rail`, `.pr-nav-rfr-group-label`, `.pr-nav-rfr-programs` | `reporting-nav-sidebar.component.scss:135-183` |
| 18 | **Sidebar user-chip role badge still on the retired `primary-100`** `#d5d5f0` | `reporting-nav-sidebar.component.scss:397` (and `:131`) |
| 19 | **`brandSoft` renders as a borderless white ghost on white cards** — its `border-brand-200` is 1.39:1 after the ramp change | `hlm-button.ts:35` |
| 20 | **`:root.dark` still holds shadcn slate.** Nothing applies a `dark` class today, but if one is ever added every Spartan component reverts to grey-blue | `styles.scss:535-564` |
| 21 | **`mds-progress-ring` spec is now a tautology** — the sweep rewrote both the implementation and its assertion, so the test verifies nothing it did not already assume | `mds-progress-ring.component.spec.ts:30,36` |
| 22 | **The 178-line sidebar restructure has zero DOM coverage** — the spec renders a blank template, so no markup change can fail it | `reporting-nav-sidebar.component.spec.ts:54` |
| 23 | **Sweep restyled `premium-sidebar`**, a component with zero consumers and zero tests | `premium-sidebar.component.scss` |

---

## Recommended order

1. **Fix #2 first** — invisible selection state is the only finding that costs a user information.
2. **#3 and #4 together** — both are the `--muted` wiring; one edit region.
3. **#1** — mechanical, 10 sites, plus the lint guard so it cannot recur.
4. **#5-#9** — the stale-colour sweep residue; each is a one-line repoint.
5. **#10, #19** — the two remaining contrast gaps in `hlm-button`.
6. **#15-#17, #21-#22** — dead code and the tests that certify it. Deleting orphaned code and its tests
   *lowers* the test count while *raising* confidence.
7. **#14** — pre-existing, but the Result Creator error state is genuinely broken today.

## What was checked and is fine

- The two rewritten SVGs (`PR_logo.svg`, `feather_upload-cloud.svg`) — the sweep only touched brand fills.
- Both `:root` blocks in `colors.scss` are syntactically closed; nothing was orphaned outside a selector.
- The `@theme inline` bridge propagates correctly; `bg-brand-*` utilities resolve through `var()`.
- Not declaring `--color-sidebar` / `--color-sidebar-foreground` was correct — Helm's preset owns them.
- The programme cards' hrefs, the centre cards' hrefs and the content pane's scroll were verified.

## Still to verify

- **Re-run the two dimensions that died:** full sidebar logic (collapsed rail reachability, `@for` track
  keys, zoneless `getMyCenters()` in the template) and the complete contrast matrix.
- **Browser round** (deliberately deferred from this audit, per the owner): confirm each P1/P2 visually
  once fixed.
