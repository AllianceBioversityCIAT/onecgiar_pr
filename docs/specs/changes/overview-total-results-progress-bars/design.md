# Design — Overview Total Results Progress Bars

Links: `requirements.md` (same folder) · `proposal.md` · `mockup/preview.html` (approved visual reference) · `docs/ux-ui/design.md` §10 · `colors.scss`.

## 1. Executive Summary

Restructure the "Total results" card's two plain-text lines into two panels with proportional two-segment progress bars, reusing existing `--pr-*` tokens (no new token family). All percentages are derived from already-computed `OverviewTotalResultsKpi` fields via one new pure helper — no new business figures, no server change.

## 2. Architecture Overview

Same file set as prior work on this card: `bilateral-overview.aggregate.ts` (new pure helper only, no new model fields), `bilateral-overview.component.html` (markup restructure), their specs, `bilateral-overview/CLAUDE.md`.

```
buildTotalResultsKpi(rows)          — UNCHANGED, no new fields
toBarSegmentPercents(a, b)          — NEW pure helper (aggregate.ts), used only by the template
  input: (w3Count, w1w2Count) or (leadCount, contributingCount)
  output: { aPercent: number; bPercent: number }  (0/0 when a+b === 0, guards OTR-R-7)
template: origin-split panel (bar + w1w2 breakdown) + role-split panel (bar + dots)
```

## 3. Data Model

None changed. `toBarSegmentPercents` is a pure presentation helper, not a KPI field — it is not added to `OverviewTotalResultsKpi` because it has no business meaning of its own (it is a view-layer ratio of two already-meaningful counts), consistent with keeping the interface additive-only per prior specs.

## 4. Frontend Component Architecture

- **No new Angular component** (`OTR-DD-2`) — inline markup in `bilateral-overview.component.html`, same precedent as `BOV-DD-3` (badges stayed inline; a progress-bar panel is even more specific to this one card).
- **Origin-split panel:** rounded container (`rounded-2xl`, semi-opaque `bg-white/10` fill, `ring-1 ring-white/10`, matching the mockup's inner-panel treatment which already uses only opacity modifiers of white — no new token). Contains: the existing "N W3/Bilateral · N W1/W2" text row, a 2-segment bar below it, and the existing W1/W2 contributing/lead breakdown line (relocated from its current position, not recomputed — `OTR-R-2`).
- **Role-split panel:** same container treatment. Contains: "N Lead · N Contributing" text row with colored dots, a 2-segment bar below it.
- **Bar track:** `bg-black/20` (opacity-modified black, same category of choice as the card's existing `bg-white/20` "Center" tag — not a new hue, not a hex literal).
- **Bar segments (origin split):** W3 segment `bg-white/90`; W1/W2 segment `bg-[var(--pr-color-primary-200)]` (light violet from the existing primary scale — stays on-brand without introducing a new hue).
- **Bar segments + dots (role split):** Lead `bg-[var(--pr-color-yellow-300)]` (existing "warnings/in-progress" token per `docs/ux-ui/design.md`); Contributing `bg-[var(--pr-color-blue-500)]` (existing status-blue token). Same tokens used for both the bar segment and its paired dot, so the legend and the bar always agree.
- **Bars are decorative:** `aria-hidden="true"` on both bar tracks (`OTR-DD-5`) — the numbers next to them already carry the information, and `OTR-R-6` requires the `aria-label` to keep covering every figure regardless of what's visually decorative.

## 5. Design Decisions

### `OTR-DD-1` — Token mapping (resolves `OTR-OQ-2` from the proposal)

- **Context:** the mockup used raw Tailwind defaults (`amber-400`, `sky-300`, `emerald-*`, `violet-300`) with no `--pr-*` equivalent declared.
- **Decision:** map by closest existing semantic role, not by closest hue: Lead → `--pr-color-yellow-300` (already "warnings, in-progress" per `docs/ux-ui/design.md` line 206), Contributing → `--pr-color-blue-500`, W1/W2 bar segment → `--pr-color-primary-200` (existing violet scale, one step lighter than the card's own gradient), W3 bar segment + track → opacity-modified white/black (no hue, no new token, matches the card's own existing `bg-white/20` precedent).
- **Alternatives considered:** propose 3 new tokens matching the mockup's exact hues — rejected, `docs/ux-ui/design.md` has no "chart/dot" token family yet and inventing one for a single card is disproportionate; revisit only if `OTR-OQ-1` extends this pattern to more cards.
- **Consequences:** the shipped bars will not be pixel-identical to the mockup's colors, only equivalent in role and contrast. This is expected and is what "approved mockup, not approved literal CSS" means for every spec that starts from a generated mockup.

### `OTR-DD-2` — No shared component, inline markup

- **Context:** same as `BOV-DD-3` — one card, no reuse benefit yet.
- **Decision:** inline in `bilateral-overview.component.html`.
- **Consequences:** if `OTR-OQ-1` later extends this to more cards, revisit extracting a shared progress-bar-panel component then (3+ call sites is the established threshold in this codebase, per `BOV-DD-3`'s own consequences note).

### `OTR-DD-3` — Percentage math lives in a pure aggregate helper, not the template or component.ts

- **Context:** `COV-DD-1` ("the page computes no figure itself") governs *business* figures computed from raw rows; a bar-segment percentage is a view-layer ratio of two already-computed, already-tested counts — but keeping it in a pure, unit-testable function is strictly better than inline template arithmetic (untestable, easy to typo `a/b` vs `a/(a+b)`).
- **Decision:** add `toBarSegmentPercents(a: number, b: number): { aPercent: number; bPercent: number }` to `bilateral-overview.aggregate.ts`, exported and unit-tested directly, called twice from the template (once per panel). Returns `{ aPercent: 0, bPercent: 0 }` when `a + b === 0` (`OTR-R-7` guard).
- **Alternatives considered:** compute inline in the template (`{{ (w3Count / count) * 100 }}%`) — rejected, untestable and repeats the divide-by-zero guard at every call site instead of once.
- **Consequences:** one new small pure function, unit tested like every other function in this file — no interface change, no new field.

### `OTR-DD-4` — Reversion challenge (Step 2.3)

N/A — this design restructures presentation, it does not remove, disable, or invert any already-shipped capability. Every figure currently visible (`OTR-R-6`) stays visible; the replicated/new badges are untouched (`OTR-R-5`); the W1/W2 breakdown is relocated, not removed (`OTR-R-2`).

## 6. Testing Plan

- `bilateral-overview.aggregate.spec.ts` — new `toBarSegmentPercents` test cases: normal split (matches `OTR-R-1`'s exact numbers), zero/zero guard (`OTR-R-7`), one-sided split (100/0).
- `bilateral-overview.component.spec.ts` — extend existing assertions: both panels render, bar segment widths reflect the fixture's counts (assert inline `style.width` or a computed class, whichever the Implementer's markup uses), `aria-label` still contains every prior figure (`OTR-AC-4`).
- **Token-literal check (no automated gate exists — per `requirements.md`'s defect-class table):** the Reviewer must grep the diff for `#[0-9a-f]{3,6}` / `rgb(` in the touched `.html`/`.scss` and FAIL if any appear outside an existing `var(--pr-*)` reference.
- **Visual/layout check (accepted risk, human at HITL):** screenshot the real 5-card deck at the 4 Cypress-tracked widths before merge, per `OTR-AC-5`.

## 7. Backwards Compatibility

Purely additive to the aggregate module (`toBarSegmentPercents` is a new export, no existing export changes signature). No migration, no flag.

## Budget (Step 2.4)

- **Expected tasks:** 1 (single focused task: aggregate helper + template restructure + both specs + `CLAUDE.md`, same shape as `BOV-T-1`/`BOV2-T-1`).
- **Expected LOC:** ~110-140 (≈15 helper + ≈20 helper spec, ≈50-60 template restructure, ≈30-40 component spec updates, ≈10 `CLAUDE.md`).
- **Expected review rounds:** 2 — this card's last two specs (`BOV-T-1`, `BOV2-T-1`) each needed a rework round on a visual-fidelity or documentation-length issue; budgeting 2 rounds up front for a bigger visual change is realistic, not pessimistic.

This roughly matches `Standard` depth (more than a 1-task Lite change, well short of a Full/cross-cutting change) — no re-sizing needed.
