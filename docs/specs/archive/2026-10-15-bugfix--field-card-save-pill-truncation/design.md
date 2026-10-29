# Module Spec — `bilateral/field-card-save-pill-truncation` — `design.md`

## 1. Summary

Raise the minimum column width in the Policy Change type-specific grid (`type-policy-change.component.html:47`) from `190px` to `390px`. **Pivot, 2026-10-15:** measurement proved 3 columns can never clear the pill's 380px collapse threshold below ~1180px of content width — ordinary desktop/laptop widths included; the user accepted a variable-column-count resolution over a fixed 3-up row. **Corrected, 2026-10-15 (Reviewer FAIL, attempt 2):** the first locked value (`360px`) was chosen from only 2 sampled widths and left squeeze zones (~760px, ~1120-1180px) where a tightly-packed column could still shrink to exactly the floor, below 380px. The robust fix needs no width sampling at all: CSS Grid's `auto-fit`/`minmax(F,1fr)` mathematically guarantees every rendered column is **≥ F**, so any `F > 380px` guarantees the pill never collapses, at *any* content width or resulting column count. `390px` (a small margin above the proven-sufficient 380px, against subpixel rounding) is the corrected, locked value. Column count now explicitly **varies with content width** (3 at ≥1210px, 2 between 800-1209px, 1 below 800px — exact boundaries: `N` columns fit when `W ≥ N×390 + (N−1)×20`) rather than being fixed at 2 — this is the correct realization of the same user-approved trade-off, not a new decision. **Corrected again, 2026-10-15 (Reviewer FAIL, attempt 3):** a bare `minmax(390px,1fr)` forces horizontal overflow below 390px of content width (a single track can't shrink below its fixed minimum) — a real regression of the old `190px` floor's phone-width behavior. Final value: `minmax(min(390px,100%),1fr)` — the standard CSS Grid pattern for this exact case: the floor shrinks to the container's own width once narrower than 390px, letting `app-field-card`'s own 380px/240px collapse rules act as the intended last resort below that point, same as everywhere else in the app. One file changed in production code; no shared SCSS touched.

Linked: `docs/specs/bugfix/field-card-save-pill-truncation/requirements.md`.

## 1A. Premise Ledger

**Count:** 6 verified, 0 `UNVERIFIED`. **Blast-radius triggers:** `shared-state` fires (the design changes a `minmax()` value read by a CSS Grid layout algorithm shared by three field-card instances in the same row) — row P-5 below. `consumer`/`live-path` do not fire — no exported symbol, DOM hook, event, or user-action dispatch chain changes; this is a single Tailwind arbitrary-value edit in one template.

| # | Premise | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `.field_card_header` is `display: flex` with `.fch_required` at `flex-shrink: 0` and `.fch_save` at `flex: none; white-space: nowrap` — neither shrinks or wraps, so all overflow falls on the title | `existence` | `field-card.scss:67-73` (header flex), `:104-105` (`.fch_required { flex-shrink: 0; ...}`), `:145-147` (`.fch_save { flex: none; margin-left: auto; ...}`), `:158` (`white-space: nowrap`) | `846fa3620` | No layout fix is needed here; the reported truncation would have a different mechanism — re-investigate before writing `FCT-T-1` | — |
| P-2 | `app-field-card` already has two narrow-container collapse rules: `@container (max-width: 380px)` hides `.fch_save`'s trailing text span; `@container (max-width: 240px)` collapses `.fch_required` to icon-only (`font-size: 0`) | `existence` | `field-card.scss:364-377` (380px rule, dated 15-sep-2026 per its own comment, predates this session), `:379-392` (240px rule) | `846fa3620` | The reported "bare dot" state would not be explained by these rules; the symptom needs a different root cause | — |
| P-3 | `PCP-T-1` (this session, already shipped and archived) set the Policy Change grid's column floor to `minmax(190px, 1fr)` | `location` | `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html:47`, comment `:38-46` citing `PCP-DD-1` | `846fa3620` | The regression's cause is not `PCP-T-1`'s grid; re-specify against the actual cause | — |
| P-4 | The same `grid-cols-[repeat(auto-fit,minmax(190px,1fr))]` utility string is used at 14 other call sites across the app (IPSR, `rd-partners`, `knowledge-product-info`, etc.), all unrelated to this symptom report | `shared-state` | `grep -rn "minmax(190px" --include="*.html" src/` → 15 total hits, 14 outside `type-policy-change.component.html` (command run this session; full file list on hand) | `846fa3620` | A fix scoped to `type-policy-change.component.html` alone would be insufficient only if one of those 14 sites also exhibits the symptom — no such report exists; out of scope per `requirements.md` §3 | — |
| P-5 | Of the three grouped fields, only Policy type carries `[required]="true"` (shows `.fch_required`); USD amount and Status carry `[required]="false"` (pill only, no badge) | `shared-state` | `type-policy-change.component.html:54` (`[required]="true"`), `:64`, `:75` (`[required]="false"`) | `846fa3620` | Policy type's column is the tightest of the three (title + badge + pill); the safe minimum width must be measured against Policy type specifically, not USD amount/Status | `FCT-T-1` (measurement step) |
| P-6 | With `repeat(auto-fit, minmax(F,1fr))`, the rendered width of every column is mathematically `≥ F` for the `N` chosen by the auto-fit algorithm (`N` = the largest integer with `N×F + (N−1)×gap ≤ W`) — this holds for ANY content width `W`, not just sampled ones | `other` | CSS Grid Level 1 §12.3 `auto-fit` track-sizing algorithm (spec-level fact, not project-specific; re-derived and confirmed numerically by the Reviewer's FAIL on attempt 2 — `execution.md`, squeeze zones at W≈760px and W≈1120-1180px under `F=360`) | `846fa3620` | A locked `F` chosen by testing only 2-3 sampled widths can miss a squeeze zone (exactly what happened with the rejected `F=360`); the correct, width-independent fix is `F > 380px` | — |

## 2. Architecture Overview

### 2.1 Where this lives

- **Client module touched:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/` — template only, one grid `class` attribute.
- **Shared component read, not modified:** `onecgiar-pr-client/src/app/custom-fields/pr-select/`, `pr-input/`, and `src/styles/field-card.scss` (P-1, P-2).

### 2.2 Interaction

No new interaction — this is a pure CSS layout change. The grid already uses native `auto-fit`; raising the `minmax()` floor changes how many columns fit at a given row width, nothing else.

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None — client-only.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Single component: `TypePolicyChangeComponent`.

### 6.2 Components & services

- `type-policy-change.component.html:47` — change `grid-cols-[repeat(auto-fit,minmax(190px,1fr))]` to `grid-cols-[repeat(auto-fit,minmax(min(390px,100%),1fr))]` — final corrected value (attempt 3's Reviewer FAIL): a bare `390px` floor is collapse-free at every width ≥390px (per P-6), but forces overflow below it; `min(390px,100%)` shrinks the floor to the container's own width once narrower, so sub-390px content falls through to `app-field-card`'s own 380px/240px collapse rules instead of overflowing. Column count at ≥390px content varies naturally: 1 below 800px, 2 from 800-1209px (Policy type + USD amount row 1, Status row 2), 3 from 1210px up (all three in one row again, safely, since each column is still ≥390px there).
- No new component, no new service, no new API method.

### 6.3 Design system usage

- No new tokens. `app-field-card`'s existing chrome (colors, pill, badge) is unchanged — only the column width that contains it changes.
- Responsive plan: `FCT-R-1`/`FCT-R-2` — at the raised floor (`390px`), column count varies naturally with content width: 1 column below 800px, 2 columns (Policy type + USD amount row 1, Status row 2) from 800-1209px, and **3 columns from 1210px up** — the original `PCP-T-1` grouping is preserved at sufficiently wide content, not permanently lost. All three counts are collapse-free by construction (`auto-fit`'s column-width guarantee, `design.md` P-6). No new breakpoint logic is written.
- A11y: unchanged — the pill's icon `title` and the badge's `sr-only` asterisk-equivalent (both pre-existing) are unaffected by the column width.
- i18n: none — no new strings.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

None — no auth surface touched.

## 8. Performance & Capacity

None — a static Tailwind arbitrary-value change, no runtime cost.

## 9. Observability

None.

## 10. Testing Plan (forward-looking)

- **Rendered measurement (Cypress, real browser), mounted from the PRODUCTION template** (attempt 2's Reviewer FAIL, issue 2: a test that hard-codes both grid-class literals cannot catch a revert) — cover:
  - The pre-fix baseline (`190px`) collapsing, at one representative width — historical/documentary, not the fix's gate.
  - The corrected floor (`390px`) at the **squeeze-zone widths that broke the rejected `360px` value**: ~760px (2-column tight-fit zone) and ~1150px (3-column tight-fit zone) — these are the widths that actually falsify an insufficiently-small `F`, not arbitrary round numbers.
  - A narrow width (<800px, e.g. 600px) asserting the single-column fallback (`FCT-AC-2`/`FCT-R-2`) — untested in attempt 2, per Reviewer issue 3.
  - Assert via computed style that neither `.fch_save`'s text span nor `.fch_required`'s text is collapsed at any of the above — not class presence, actual rendered state.
- No unit/Jest coverage needed — this is pure CSS geometry, which jsdom cannot evaluate (`src/CLAUDE.md` §9, Component tests section).

## 11. Backwards Compatibility & Migration Plan

Purely additive visual fix; no contract, no migration, no flag.

## 12. Design Decisions (ADRs)

### `FCT-DD-1` — Raise the grid's column floor, don't touch `field-card.scss`

- **Context:** The degraded icon-only state is `app-field-card`'s own designed fallback (P-2), not a bug in the shared component. The bug is that `PCP-T-1`'s grid (P-3) floors every column below both of that fallback's thresholds, making the fallback the everyday state instead of a rare edge case.
- **Decision:** Fix the grid's `minmax()` floor in `type-policy-change.component.html` only. Leave `field-card.scss` and its 14 other call sites untouched (`FCT-R-3`).
- **Alternatives considered:**
  1. **Redesign `field-card.scss`'s header to wrap onto two lines instead of collapsing text** — rejected: touches a shared file used across the whole app (blast radius well beyond this ticket), and the existing collapse-to-icon mechanism is a deliberate, working design for fields that are *genuinely* narrow elsewhere (P-2) — not broken, just mis-triggered here.
  2. **Abbreviate the pill/badge text instead of hiding it** — rejected: new i18n strings, a new visual pattern, and still shared-file scope; doesn't address the actual cause (columns too narrow), only hides the symptom further.
  3. **Revert `PCP-T-1`'s grouping entirely** — rejected: the user explicitly wants the grouping kept (confirmed this session).
- **Consequences (amended, Pivot 2026-10-15; corrected after attempt 2's Reviewer FAIL):** Originally framed as "fewer columns only at narrow viewports" — measurement in `FCT-T-1`'s attempt 1 proved this understated the trade-off: 3 columns cannot clear the pill's 380px collapse threshold below ~1180px of content width. The user (2026-10-15) accepted a variable-column-count resolution over the two alternatives considered (icon-only compromise; `field-card.scss` redesign) — see `execution.md`'s Pivot Record. Attempt 2 then locked `360px`, sampled at only 2 widths, which the Reviewer proved still collapses in two squeeze zones (~760px, ~1120-1180px). The corrected value, `390px`, is collapse-free at **every** width by construction (any `F>380px` is, per P-6) — and as a consequence, **the original 3-column grouping is preserved once content is ≥1210px wide**, not permanently given up: column count is 1 below 800px, 2 from 800-1209px (Policy type + USD amount row 1, Status row 2), 3 from 1210px up. `FCT-R-2`'s narrow-viewport fallback to 1 column is unchanged, native `auto-fit`, no new code.

**Step 2.3 Reversion Challenge:** This DD does not revert previously-delivered behavior — `PCP-T-1`'s grouping (sibling-row layout) is kept; only the per-column minimum width changes, and nothing currently relies on columns being exactly `190px` (no test pins that literal value — confirmed by the same grep in P-4, which returns the Tailwind class string, not a numeric assertion). Skipped per Step 2.3's Lite-depth exemption (no reverted behavior, no visible-surface regression other than the narrower-viewport column count, which is `FCT-R-2`'s explicit, accepted trade-off).

## 13. Open Gaps & Follow-ups

- `FCT-OQ-1` (from `requirements.md`) is resolved by `FCT-T-1` itself, as its first measurement step, before the value is locked into the template — not deferred past this spec.
- The separately-documented "Unsaved changes doesn't clear after save" architectural gap (`SaveButtonService.savedTick` never bumped by `triggerManualSave()`) remains out of scope, per `requirements.md` §3.

## Budget (Step 2.4)

- **Expected tasks:** 1
- **Expected LOC:** ~5 (one template attribute change) + ~40-60 (one new Cypress spec, or an addition to an existing one)
- **Expected review rounds:** 1 (`checklist`-depth Review — pure CSS, no shared symbol/migration/auth/payload change, per the same pattern used for `PCL-T-1`/`PCP-T-1` in this session's prior specs)

If execution trips past 2 review rounds or touches a second file beyond the template + its test, stop and escalate rather than continue silently (per the budget's tripwire purpose).

## Required cross-references

- `docs/specs/bugfix/field-card-save-pill-truncation/requirements.md` (same folder).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
- `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-position/` (the spec whose side effect this fixes).
