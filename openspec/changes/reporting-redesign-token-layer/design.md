## Context

The client on `performance-refactor` runs **Angular 21.2 + Tailwind CSS 4.3 (CSS-first, no `tailwind.config.js`) + Spartan/Helm**, with PrimeNG fully removed. Colour reaches the screen through six layers, and only two of them are correct today:

| Layer | Where | State |
|---|---|---|
| L0 Tailwind defaults | `node_modules/tailwindcss/theme.css`, imported `src/styles.scss:4` | upstream, untouched |
| **L1 PRMS canon** | `src/styles/colors.scss` — `--pr-color-*` | ⚠️ old indigo `#6b6dc4` |
| **L2 Brand→Tailwind bridge** | `src/styles.scss:18-33`, `@theme inline` | ✅ correct — needs no value edits |
| L3 Helm preset | `node_modules/@spartan-ng/brain/hlm-tailwind-preset.css`, `@theme inline` from line 82 | ✅ upstream, maps `--color-primary: var(--primary)` |
| **L4 Helm raw vars** | `src/styles.scss` `:root` ~435-461, plus `:root.dark` 464-493 | 🛑 **still shadcn slate defaults in `oklch()`** |
| L5 Global SCSS entries | 10 files after `styles.scss` in `angular.json` | consumers |

L2 being already `@theme inline` with `var()` values is what makes this change cheap: it compiles to `.bg-brand-300 { background-color: var(--pr-color-primary-300) }`, so **re-valuing L1 propagates to all 101 `*-brand-*` utility sites with zero template edits**. L4 being unbranded is what makes it necessary: no `colors.scss` edit alone can make a Spartan component leave slate.

**Consumption flow** (the analogue of a data flow for a styling change — there is no API involved):

```
colors.scss (L1 literal values)
   ├─→ var(--pr-color-*) directly in SCSS/templates ......... ~736 refs, ~340 files
   ├─→ @theme inline (L2) → bg-/text-/border-brand-* ........ 101 utility sites
   └─→ plain :root (L4) → Helm preset (L3) → bg-primary,
       bg-sidebar, border-border, ring-ring ................. every Spartan component
```

**Scale of the surface.** `--pr-color-primary-300` alone has **404** direct consumers across three simultaneous roles — 95 background fills (39 paired with white text), 65 border/outline declarations, 154 `color:` declarations — plus `.open_route` (`src/styles/fonts.scss:18-22`), the app's universal inline link, at **126 occurrences in 68 files**. `--pr-color-secondary-400` has **289** references and paints every dark surface.

**Baseline defects, measured with sRGB relative luminance (4 dp):**

| Pair | Today | Threshold | Status |
|---|---|---|---|
| `primary-300` text on `primary-50` (13 rule blocks) | **3.8230** | 4.5 | 🛑 fails now |
| `primary-200` as border/focus ring (~20 sites) | **2.2197** | 3.0 | 🛑 fails now |
| `hlm-button` default hover, white text | **3.9217** | 4.5 | 🛑 fails now |
| white on `primary-300` fill | 4.5556 | 4.5 | passes by 0.06 |

The approved palette (`docs/reporting-redesign/UI-RULES.md` §2.1) was produced by the designer and, independently, by our own analysis; both converged on `300 = #6b46e5`, `400 = #5733c4`, `500 = #4a2bb8`, `700 = #33227a`, `800 = #271862`. That convergence is the strongest evidence available that the anchor is right.

## Goals / Non-Goals

**Goals:**

- Make the approved palette render app-wide by **changing variable values, not files** — this is the owner's explicit requirement and the reason the change is tractable at ~340 consuming files.
- Bring Spartan/Helm components onto the PRMS brand, finishing a wiring the Spartan migration left incomplete.
- Fix the three measured AA failures above rather than carrying them forward.
- Establish the semantic token vocabulary (`UI-RULES.md` §2.2) that Phases 2-9 will build against, so later phases never reach into a numbered ramp stop.
- Keep every edit reviewable: mechanical patterns with stated hit counts, and a short, justified list of individual edits.

**Non-Goals:**

- Any server change. PDF templates, notification email templates, and their migrations stay as they are.
- Excel export colour (`export-tables.service.ts`) — client-side and a one-liner, excluded by owner decision.
- The four raster assets with indigo baked into the pixels — deferred pending new files from the designer.
- Raising the 12px root font-size. It would fix the rem/px trap globally but resize every legacy screen at once.
- Adding `layer(utilities)` to the unlayered Tailwind import at `src/styles.scss:11`.
- Reintroducing dark mode.
- Building any redesign screen. This change is the token layer only.

## Decisions

### D1. Re-value the ramp in place; keep stop names and the "`-300` is main" convention

`--pr-color-primary-300: #6b46e5`, with the remaining eleven stops per `UI-RULES.md` §2.1.

**Why the anchor sits at 300 and not 400.** Stop 300 carries three conflicting roles at once. Contrast is direction-symmetric, so a single value discharges all of them:

| Role | Pair | Ratio | Threshold |
|---|---|---|---|
| fill + white text (95 sites) | `#ffffff` on `#6b46e5` | **5.7809** | 4.5 ✅ |
| text on white (154 sites + `.open_route`) | `#6b46e5` on `#ffffff` | **5.7809** | 4.5 ✅ |
| border / outline (65 sites) | `#6b46e5` on `#ffffff` | **5.7809** | 3.0 ✅ |
| text on `primary-50` (13 blocks) | `#6b46e5` on `#f5f3ff` | **5.2707** | 4.5 ✅ |

**Alternative rejected — put `#6b46e5` at 400 and a lighter violet at 300.** An earlier iteration did exactly this, reasoning from Tailwind-utility counts (`focus-visible:outline-brand-300` ×13, `text-brand-300` ×10) that 300 was a light accent. It is not: the 95 SCSS fills and 154 text declarations were invisible to a utility-only tally. White on the lighter `#8b6cf5` measures **3.7761** — an AA failure on every primary CTA in the app, including the login button. Rejected on measurement.

**Alternative rejected — renumber the ramp.** Cleaner semantically, but 404 direct consumers of `primary-300` would each need auditing. In-place re-valuing is one file with an app-wide effect.

### D2. Adopt the designer's light tints, and repoint the ~20 legacy sites that misuse them

`UI-RULES.md` §2.1 puts tints at 100 (`#ede9fe`) and 200 (`#ddd6fe`). In the legacy code those stops are borders and focus rings, where `#ddd6fe` measures **1.3885** on white — 37 % worse than today's already-failing 2.2197.

**The designer's own spec resolves this**, which is why the ramp is adopted unchanged rather than distorted:

- §2.2 defines `--pr-focus-ring` from the **300**, not the 200 — focus indicators were never meant to come from a tint.
- Rule 7 states *"Violet is navigation and actions. Content surfaces are neutral… no violet border inside the content area."*

So those sites are **already rule violations**. Repointing them makes the designer's ramp correct *and* clears a WCAG 1.4.11 failure, instead of trading one for the other.

**Alternative rejected — keep `#8b6cf5` at 200** (our computed value, 3.7761, passes as a border). It preserves the legacy misuse, contradicts Rule 7, and leaves the redesign without a usable light tint at that stop.

### D3. Re-value the Helm raw vars in the existing plain `:root`; add no second `@theme` block

Helm's preset already owns the Tailwind side (`--color-primary: var(--primary)` at `hlm-tailwind-preset.css:106`). Only the raw variable's **value** changes.

🛑 **The failure mode this avoids.** Declaring `@theme { --color-primary: var(--primary) }` *without* `inline` makes Tailwind emit `:root,:host{--color-primary:var(--primary)}` and utilities reference `var(--color-primary)`, freezing resolution to `:root`. Measured in-browser: an element inside a scoped override computed the wrong colour. The page-level theme still looks right, so **the dark sidebar silently reverts to page colours** — the classic "I wired it and it looks broken". `@theme inline` resolves per element at runtime; plain `@theme` does not.

**Colour space: keep hex, supplied via `var(--pr-color-*)`.** Verified against this repo's own `@tailwindcss/postcss` 4.3.2: `bg-primary/50` compiles to `color-mix(in oklab, var(--primary) 50%, transparent)` and a hex source resolves correctly there. Converting the canon to `oklch()` is not required for correctness and would obscure diff review. What *does* break, silently and invisibly, is a bare channel triplet (`107 70 229` resolves to `rgba(0,0,0,0)`) or a mistyped var chain — so every raw var must be verified to resolve, not merely to be present.

**Dark sidebar on a light page:** scope the `--sidebar*` family on a selector that wraps the sidebar, **not** via `.dark`. The sidebar family exists precisely so dark chrome is expressible without a theme switch.

### D4. Replace `hlm-button`'s composited hover with an explicit stop

`hlm-button.ts:13` is `'bg-primary text-primary-foreground hover:bg-primary/80'`. The `/80` composites the primary over its backdrop:

| `--primary` | composite over white | white text on it |
|---|---|---|
| `#6b46e5` | `#896bea` | **3.9217** 🛑 |
| `#6b46e5` (over `#f7f7f9`) | `#8769e9` | **4.0173** 🛑 |
| explicit `#5733c4` (stop 400) | — | **7.8479** ✅ |

**Why not raise `--primary` until `/80` passes.** Setting `--primary: #5733c4` fixes the hover but makes the resting Spartan button darker than the mockup's `#6b46e5` — the component would disagree with the design it is meant to implement.

**Chosen:** point the hover at the 400 stop explicitly. `src/app/spartan/` is vendored into this repo, so this is our code to edit, and it makes the Helm button agree with the `brand` cva variant in `UI-RULES.md` §3.3, which already specifies `hover:bg-[var(--pr-color-primary-400)]`.

### D5. Repoint `--pr-color-secondary-400` to `#271862`

That single value paints all ~17 legacy dark surfaces — `footer.component.scss:13`, `auth-cognito.component.scss:10` (the unauthenticated background), `dynamic-panel-menu.component.scss:4`, `collapsible-container.component.scss:8,9,46,47`, `user-roles-info-modal.component.scss:3,22`, `page-alert.component.scss:87`, `custom-fields.scss:346`, and ~9 modals.

Leaving it at slate `#2a2e45` while the sidebar turns violet puts two different dark chromes on screen. Re-valuing it flips all of them with **zero template edits**, and because `#271862` is darker, every light foreground improves (white: 13.3318 → **15.0723**). Verified there are no dark foregrounds on those surfaces.

⚠️ **`--pr-color-secondary-rgb` must be decided separately.** It has ~19 consumers and drives shadows, scrims, and some translucent surfaces. Tracking `secondary-400` and tracking the shadow ink (`25, 21, 36`) produce visibly different scrims at the alphas in use (`styles.scss:305` at 0.337, `ipsr.scss:94` at 0.745). One value must be chosen deliberately, not inherited by accident.

### D6. Bulk mechanics over file-by-file migration

The owner's requirement. Three tiers, in order of preference:

1. **Value change** — covers ~736 token references and 101 utilities. No edit.
2. **Bulk pattern** — a single scoped, idempotent command per concern, with its expected hit count obtained by running the read-only grep form first. Two patterns cover the D2 repoints.
3. **Individual edit** — only where no alias or pattern applies; each justified.

**Guards on every bulk pattern:** it must be idempotent; the near-miss must be named and checked (for example `5568DD` differs from `5569dd` by one digit, and a naive case-insensitive hex replace can hit a substring of a longer token); and it must never touch a spec asserting a literal, the RGB comma triplets, the semantic `--pr-color-result-level-*` indirections, or vendored sources it was not aimed at.

### D7. Sequence destructive steps last

Removing `:root.dark` (24 values, `styles.scss:464-493`) destroys information rather than re-valuing it — a `git revert` of the colour commit alone will not restore it. It is genuinely dead: the selector is `:root.dark` (not `.dark`), nothing in the app ever adds the class, and `color-scheme: light` is pinned at `:423`. It is removed **after** visual verification, in its own commit.

## Risks / Trade-offs

**`header-panel/` shows old and new violet side by side** → It is the global header on every screen, with ~24 hardcoded brand-ish hex including four `linear-gradient(90deg,#6b6dc4,#6461bc,#6461bc)` nav-pill states and matching hardcoded shadows. A value swap cannot reach them, while its own six `focus-visible:outline-brand-300` rings *do* change — mismatched on the same element. **Mitigation:** flatten the gradients to `#6b46e5`. The approved design has no gradients anywhere (Rule 11), so this is rule-compliant, and it is the first surface on the screenshot gate.

**An orphan hex nobody inventoried** → `#5457b0` appears in no palette, in two places, both pairing it with `var(--pr-color-primary-300)` inside a gradient: `result-framework-reporting-home.component.html:51` and `…/result-framework-reporting-galaxy/…scss:44`. It would render new violet → old indigo. **Mitigation:** it is in the individual-edit list; the verification grep covers `#5457b0` alongside `#6b6dc4` (×59), `#6461bc` (×30) and `#5569dd` (×12).

**~68 `rgba()` overlays shift hue with no test coverage** → `rgba(var(--pr-color-primary-rgb), α)` loses ~45 % of its green channel, so every 5-30 % tint moves from desaturated indigo to saturated violet. **Mitigation:** listed explicitly for visual review; not claimed as automatically verified.

**A silently-transparent token** → An invalid raw-var value resolves to `rgba(0,0,0,0)` and simply disappears; `styles.scss` applies `bg-background` to `body`, so a broken `--background` costs the app its page background. **Mitigation:** verify each raw var resolves in-browser after wiring, not merely that the declaration exists.

**A green build proves nothing** → `npm run test` is `jest --no-coverage` and does not enforce the 50/60/60/60 thresholds; `custom-fields/` is excluded from Jest entirely. **Mitigation:** the gate is `npm run lint` + `npm run test:coverage` + `npm run test:ct`, plus screenshots.

**A spec turns the suite red** → `mds-progress-ring.component.spec.ts:30,36` assert literal hex. **Mitigation:** updated in the same commit as the value change.

**`hlm-skeleton` / `hlm-separator` still call `classes()`** → It installs a document-wide `MutationObserver`; `hlm-button.ts:62-64` documents that on class-heavy pages this drove an infinite change-detection loop (the bug that froze `hlmInput`, fix `64d68f283`). Not triggered by this change, but relevant to Phases 2-9. **Mitigation:** recorded in `MIGRATION-CONTEXT.md`; no new usage introduced here.

**Stale docs will mislead the next agent** → `CLAUDE.md` §1 still says "Angular 19 + PrimeNG 19", and 22 references point at `src/app/theme/reportingTheme.ts`, deleted in `50710ea38`. An agent reading them will generate PrimeNG into a codebase that removed it. **Mitigation:** corrected as part of this change.

**Trade-off accepted** → PDFs, notification emails, Excel exports, and four raster assets keep the previous brand until separately addressed. Stated in the proposal as a time-boxed inconsistency so it is a known state rather than a discovered bug.

## Migration Plan

Each step is independently verifiable. **Step 0 is not optional** — nothing after it is trustworthy without a baseline.

0. **Baseline.** Build and archive `dist/onecgiar-pr-client/browser/styles.css`. Record the `lint` / `test:coverage` / `test:ct` pass-fail set and the coverage numbers. Capture the "before" half of the screenshot gate.
1. **L1 values.** Rewrite the `--pr-color-primary-*` ramp, `--pr-color-secondary-400`, and `--pr-color-primary-rgb` in `colors.scss`. Decide `--pr-color-secondary-rgb` explicitly (D5). *Verify:* `git diff --stat` shows one file; the compiled bundle's `.bg-brand-300` still resolves through `var()`.
2. **Semantic tokens.** Append the §2.2 block to `colors.scss`. *Verify:* every new token resolves in-browser to a real colour, none to `rgba(0,0,0,0)`.
3. **L2 bridge + mono face.** Extend `@theme inline` per §2.3; add the JetBrains Mono `@import` per §2.4. *Verify:* `bg-surface-app`, `text-ink-secondary`, `bg-sidebar`, `font-mono` exist in the built stylesheet.
4. **L4 Helm wiring.** Re-value the raw shadcn vars in the existing plain `:root`; scope the `--sidebar*` family for the dark sidebar. *Verify:* a Spartan button, input, and the sidebar all render brand colours; a scoped override resolves differently inside than outside.
5. **Button recipe.** Fix `hover:bg-primary/80` (D4) and add the `brand` / `brandSoft` cva variants (§3.3). *Verify:* recompute white-on-hover ≥ 4.5:1.
6. **Bulk repoints.** Apply the two D2 patterns. *Verify:* hit counts match the pre-run grep exactly; re-running changes nothing.
7. **Individual edits.** The `header-panel` gradients, `#5457b0` ×2, `header-panel.component.html:370-371`, and `mds-progress-ring.component.spec.ts:30,36`. *Verify:* the old-brand grep (`#6b6dc4|#6461bc|#5569dd|#5457b0`) reaches 0 in scope, with the out-of-scope exclusions listed rather than silently passing.
8. **Docs.** Correct `CLAUDE.md` §1 and the 22 `reportingTheme.ts` references; reference `UI-RULES.md` from `CLAUDE.md` and `AGENTS.md`; update `docs/ux-ui/design.md` §5 and §12.
9. **Full gate.** `lint` + `test:coverage` + `test:ct` green; capture the "after" screenshots and diff against Step 0.
10. **Remove `:root.dark`** (D7), in its own commit, only once Step 9 is clean.

**Rollback.** Steps 1-8 are value and reference changes — reverting the commit restores the previous appearance exactly. Step 10 is the only irreversible one, which is why it is last and isolated.

## Open Questions

1. **Jira ticket.** Branch `performance-refactor` carries no `P2-XXXX`, and the commit convention requires one. **Blocks the first commit** — the user must supply it.
2. **`--pr-color-secondary-rgb`** (D5): track `secondary-400` (`39, 24, 98`, a violet scrim) or the shadow ink (`25, 21, 36`, a neutral scrim)? They differ visibly at the alphas in use. Recommend the neutral ink, since the token's consumers are shadows and scrims, not brand surfaces — but this is a design call.
3. **The four `header-panel` gradients:** flatten to `#6b46e5` per Rule 11, or preserve a gradient as a token (`--pr-gradient-brand`)? The mockup has no gradients. Recommend flattening.
4. **`src/app/pages/locals/`** has zero PRMS tokens and runs on stock Tailwind slate (`text-slate-700`, `text-slate-400`). The rebrand will make it look foreign. In scope for this phase, a later phase, or deliberately left alone?
