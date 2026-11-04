# Requirements — Overview Total Results Progress Bars

## 1. Document Control

- **Module:** `bilateral` — Overview tab, "Total results" KPI hero card
- **Depth:** Standard
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** draft
- **Proposal:** `docs/specs/changes/overview-total-results-progress-bars/proposal.md` (approved)

## 2. Executive Summary

Replace the "Total results" card's plain-text figure lines with two panels, each showing a width-proportional two-segment progress bar, following the user-approved mockup (`mockup/preview.html`). Presentation-only: no change to `OverviewTotalResultsKpi` or `buildTotalResultsKpi`.

## 3. Glossary

| Term | Meaning |
|---|---|
| Origin split | W3/Bilateral (`w3Count`) vs W1/W2 (`w1w2Count`) |
| Role split | Lead (`leadCount`) vs Contributing (`contributingCount`) |
| W1/W2 breakdown | `w1w2ContributorCount`/`w1w2LeadCount` — already shipped, must be preserved |

## 4. System Context & Scope

**In scope:** `bilateral-overview.component.html` (+ `.scss` if needed), its spec, `bilateral-overview.cy.ts` if height changes trip any existing assertion, `bilateral-overview/CLAUDE.md`.

**Out of scope:** `bilateral-overview.aggregate.ts` (no new computed fields expected), the other 4 KPI cards (Option A per proposal), any component outside this folder.

## 5. Stakeholders / Personas

PMU/portfolio lead (`US-P1`) — same audience as the cards being redesigned; no new persona.

## 6. Functional Requirements

- **`OTR-R-1`** The "Total results" card MUST render an origin-split panel with a two-segment horizontal progress bar whose segment widths are proportional to `w3Count`/`w1w2Count` out of `count`.
- **`OTR-R-2`** The origin-split panel MUST include the existing W1/W2 contributing/lead breakdown (`w1w2ContributorCount`/`w1w2LeadCount`) inline — this is a relocation of the already-shipped `quick/overview-w1w2-breakdown-inline` fix, not a new computation.
- **`OTR-R-3`** The "Total results" card MUST render a role-split panel with a two-segment horizontal progress bar whose segment widths are proportional to `leadCount`/`contributingCount` out of `count`, each segment paired with a colored dot indicator.
- **`OTR-R-4`** All colors used (bar segments, dots) MUST come from already-approved `--pr-*` tokens (`docs/ux-ui/design.md` / `colors.scss`) — no raw hex, no unmapped Tailwind default color (`amber-400`, `sky-300`, `emerald-*` from the mockup are not approved tokens and MUST be mapped per `OTR-DD-1`).
- **`OTR-R-5`** The replicated/new pill badges (`BOV-T-1`) MUST remain unchanged in position, computation, and markup — this spec only restructures the two lines above them.
- **`OTR-R-6`** The card's `aria-label` MUST continue to include every figure it includes today (total, replicated, new, W1/W2 total, W1/W2 contributing, W1/W2 lead) — the visual restructuring MUST NOT reduce accessible-name content.
- **`OTR-R-7`** Zero-count edge case: when a segment's count is `0`, its progress-bar segment width MUST be `0%` (not a rendering error, not `NaN%`) and the panel MUST still render (no divide-by-zero when `count === 0` — guard per `BOV-AC-4`, the empty-phase state already hides the whole KPI deck before this card renders).

### Scenario: OTR-R-1 proportional widths

- GIVEN `w3Count = 135`, `w1w2Count = 77`, `count = 212`
- WHEN the origin-split bar renders
- THEN the W3 segment width is `(135/212)*100 ≈ 63.7%` and the W1/W2 segment width is `(77/212)*100 ≈ 36.3%`
- AND the two segment widths sum to `100%` (within floating-point rounding)

### Scenario: OTR-R-7 zero-count guard

- GIVEN `count = 0` is never reached by this card (the empty-phase `@else` branch hides the whole KPI deck, `BOV-AC-4`)
- BUT IF a future caller renders this card with `count = 0` anyway (defensive requirement)
- THEN both segments render at `0%` width, not `NaN%` or a thrown error

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | Presentation-only; no new HTTP call, no new computed loop — widths are simple arithmetic on already-computed counts, evaluated in the template or a small pure helper |
| Accessibility | `OTR-R-6`; bar segments are decorative (the numbers carry the information) — `aria-hidden="true"` on the bar track itself, per WCAG 2.1 AA (`docs/ux-ui/design.md` §10) |
| Responsive | Card must not introduce horizontal scroll or break the deck's column-count assertions at any of the 4 Cypress-tracked widths (1280×720, 1280×1000, 900×800, 375×800) |
| Design system | `OTR-R-4`; no new token family added to `colors.scss` unless `OTR-DD-1` concludes no existing token fits |

**Defect classes this spec can produce, and their gate:**

| Defect class | Catching command |
|---|---|
| Wrong proportional width (arithmetic error, wrong denominator) | New unit test asserting bar-width percentage for known count fixtures, including the `OTR-R-1` scenario's exact numbers |
| Divide-by-zero / `NaN%` when a count is 0 | Unit test with `count: 0` fixture (`OTR-R-7`) |
| `aria-label` regression (a figure silently dropped) | `bilateral-overview.component.spec.ts` — presence assertion for every figure, extending the existing test |
| Visual token misuse (raw hex sneaks in) | `npx ng lint --quiet` does NOT catch this (no hex-literal lint rule in this repo) — **accepted gap, substituted by manual code review at the HITL pause**: the Reviewer must grep the diff for `#[0-9a-f]{3,6}` and `rgb(` literals in the touched files and FAIL the task if any appear outside an existing token reference |
| Card breaks deck layout at a tracked breakpoint | `bilateral-overview.cy.ts` — the existing column-count + horizontal-scroll assertions already cover this; confirmed at spec-time that no CT assertion pins KPI card height equality, so height growth alone won't trip an existing test — but the deck's *visual* row alignment across differently-sized siblings is unmeasured by any current gate. **Accepted risk, human check at browser-verification step** (screenshot the real 5-card deck at all 4 widths before merge) |
| Visual-parity vs the approved mockup (does it actually look like what was approved) | No automated check — human check at browser-verification, same accepted-risk pattern already used for `BOV-T-1`/`BOV2-T-1` |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `OTR-AC-1` | A center/phase with `w3Count=135, w1w2Count=77, count=212` | The card renders | Origin-split bar shows two segments at the computed proportional widths, summing to 100% |
| `OTR-AC-2` | Same scenario | The card renders | Role-split bar shows two segments (lead/contributing) at proportional widths, with a colored dot per segment |
| `OTR-AC-3` | Same scenario | The card renders | The W1/W2 contributing/lead breakdown text is still visible inside the origin-split panel |
| `OTR-AC-4` | Same scenario | A screen reader reads the card | The `aria-label` still contains all figures it contained before this spec |
| `OTR-AC-5` | The real 5-card KPI deck, viewed in a browser at 1280×720 / 1280×1000 / 900×800 / 375×800 | Human visual check | No card overlap, no horizontal scroll, row alignment is acceptable (subjective, recorded as accepted risk if not pixel-perfect) |

## 9. Dependencies & Assumptions

- Upstream: `OverviewTotalResultsKpi` fields (`w3Count`, `w1w2Count`, `leadCount`, `contributingCount`, `w1w2ContributorCount`, `w1w2LeadCount`, `replicatedCount`, `newCount`) — all already shipped, no changes needed.
- Assumption: the mockup's visual intent (rounded inner panels, proportional bars, colored dots) is the approved direction; exact colors are re-derived from `--pr-*` tokens per `OTR-DD-1`, not copied literally from the mockup's Tailwind defaults.

## 10. Open Questions

- **`OTR-OQ-1`** (carried from proposal) — Should the other 4 KPI cards get the same treatment later? Deferred to a follow-up proposal once this ships.

## 11. Required cross-references

- `docs/prd.md` — `US-P1`
- `docs/ux-ui/design.md` §10 (accessibility), `colors.scss` (token source)
- `docs/specs/changes/overview-replicated-new-badges/` (`BOV-T-1`) — badges preserved unchanged
- `docs/specs/changes/overview-w1w2-contributor-badge/` (`BOV2-T-1`) — breakdown preserved, relocated
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md`
