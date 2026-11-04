# Proposal — Overview Total Results Progress Bars

## 1. Document Control

- **Type:** Change
- **Depth:** Standard
- **Approval Mode:** gated
- **Owner:** santiago.sanchez@cgiar.org
- **Related specs:** `docs/specs/changes/overview-replicated-new-badges/`, `docs/specs/changes/overview-w1w2-contributor-badge/` (both shipped, both touch the same card — this proposal supersedes their visual layout, not their computed fields)

## 2. Intent

Redesign the Overview tab's "Total results" KPI hero card from plain stacked text lines to a card with two-segment horizontal progress bars (origin split, role split) plus an inline W1/W2 contributing/lead breakdown — following a mockup the user reviewed and approved.

## 3. Problem / Current Behavior

The current card (after `overview-w1w2-breakdown-inline`) shows four independent classifications as plain text lines and two badge pills:

```
135 W3/Bilateral · 77 W1/W2 (60 contributing · 17 lead)
130 lead · 82 contributing
🔄 21 replicated   ➕ 191 new
```

This reads correctly (validated against the real DB) but is visually flat — the two lines with 4 numbers apiece give no visual weight to proportion, and the origin/role splits look identical to a skimming reader despite measuring different things. The user liked a mockup that uses width-proportional progress bars to make each split's proportions legible at a glance, with colored dots distinguishing segments.

## 4. Proposed Outcome

The "Total results" card shows, in order: total count, an origin-split panel (W3/Bilateral vs W1/W2, progress bar + the existing W1/W2 contributing/lead breakdown), a role-split panel (Lead vs Contributing, progress bar + colored dots), and the existing replicated/new pill badges — all using approved `--pr-*` tokens.

## 5. Scope

- Visual/layout redesign of the "Total results" card only, in `bilateral-overview.component.html` (+ `.scss` if needed).
- Map the mockup's raw colors (slate, violet, amber, sky, emerald) to existing `--pr-*` tokens — no new tokens unless truly none fit (see Open Questions).
- Preserve every existing computed field from `OverviewTotalResultsKpi` (no aggregate.ts changes expected) — this is presentation only.
- Preserve the `w1w2ContributorCount`/`w1w2LeadCount` inline breakdown (just shipped, DB-validated) — re-house it inside the new layout, don't revert it.
- Update `bilateral-overview.component.spec.ts` for the new markup/testids.
- Update `bilateral-overview.cy.ts` if the card's height changes at any of the 4 tracked breakpoints.
- Update `bilateral-overview/CLAUDE.md` in the same commit (touched-folder convention).

## 6. Non-Goals

- The other 4 cards in the KPI deck (Pending review, Approved, Needs attention, Projects covered) are explicitly **out of scope** for this proposal — see Open Question `OTR-OQ-1` on whether they should follow later for visual consistency.
- No change to `buildTotalResultsKpi`'s computed fields or any business logic.
- No change to the card's link/navigation behavior (`resultsLink()`, `deepLinkParams()`) or `aria-label` semantics beyond what the new layout requires to stay accurate.
- No new design token family unless `OTR-OQ-2` concludes one is genuinely needed.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| PMU / portfolio lead (`US-P1`) | Same information, presented with visual proportion cues instead of only numbers |
| `bilateral-overview.component.html/.scss/.spec.ts` | Primary edit surface |
| `bilateral-overview.cy.ts` | Possible height/layout assertion update |
| `bilateral-overview/CLAUDE.md` | Must document the new card structure and token mapping |
| `docs/ux-ui/design.md` | No existing "progress bar in a hero card" pattern — if this ships, it becomes the first instance and should be considered for promotion to §12 Design Decisions per the client's own SDD workflow (`onecgiar-pr-client/CLAUDE.md` §11 step 6) |

## 8. Visual Reference

- Source: Self-contained HTML mockup (generated in-session, refined with the user through 2 rounds of live preview)
- Location: Published Artifact `https://claude.ai/artifact/DFoaXNM4UhtB3ZyuXzoYMg`; source file also at the session scratchpad (`preview.html`) — **not committed to the repo**, must be captured under `docs/specs/changes/overview-total-results-progress-bars/mockup/` at `/akili-specify` time so it survives past this session
- Notes: covers only the "Total results" card in isolation (purple gradient background, two inner panels with progress bars, pill badges footer). Does not show the card inside the real 5-card deck — Approach Options below flags this as a real risk, not yet checked

## 9. Requirement Delta Preview

### ADDED Requirements

- Origin-split panel: rounded inner container, two-segment progress bar sized by `w3Count`/`w1w2Count` proportion, with the existing W1/W2 contributing/lead breakdown line inside it.
- Role-split panel: rounded inner container, two-segment progress bar sized by `leadCount`/`contributingCount` proportion, with colored dot indicators per segment.

### MODIFIED Requirements

- The card's internal layout changes from 2 flat text lines to 2 bordered/filled panels — height and visual density both increase; must be re-validated against `bilateral-overview.cy.ts`'s 4 tracked widths.
- Tooltips added in `quick/overview-top-line-tooltips` (on W3/Bilateral, W1/W2, lead, contributing) need a new home in the panel markup — decide whether they move to the panel container, the bar segment, or the number itself.

### REMOVED Requirements

- None — this is additive/restructuring, not removing a stated capability.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Total results only (recommended)** | Redesign only this one card; the other 4 KPI cards keep their current plain style | Smallest, fastest, lowest risk. Creates a visual inconsistency within the same deck (1 card looks different from its 4 siblings) until/unless a follow-up extends the pattern |
| **B — All 5 cards** | Extend the progress-bar treatment to every KPI card that has a meaningful split (Pending review's over-age split, Approved's approval rate, etc.) | Consistent deck, but ~4-5x the scope, requires designing bar semantics for cards that don't have an obvious two-segment split (e.g. "Approved" is a single percentage, not two counts) |
| **C** — Keep current text-only card, abandon the mockup | No work | User explicitly liked the mockup — rejected |

**Recommended: Option A.** Validate the pattern on one card, in the real deck (not isolation), before deciding whether it is worth extending — this defers the Option B scope decision to a natural follow-up once A is live and the visual-inconsistency question has real data (a screenshot of the actual deck) instead of a guess.

## 11. Risks, Dependencies, And Open Questions

- **`OTR-OQ-1`** — Should the other 4 KPI cards eventually get the same treatment, or is a "1 fancy card + 4 plain cards" deck the intended final state? Recommend punting this to a follow-up proposal once Option A ships and can be screenshotted in the real deck.
- **`OTR-OQ-2`** — Token mapping: the mockup's `amber-400`/`sky-300`/`emerald` dot colors have no exact `--pr-*` equivalent on the current violet/secondary/red/yellow/green/blue palette (`colors.scss`). Nearest candidates: amber → `--pr-color-yellow-300`, sky → `--pr-color-blue-500`, emerald → `--pr-color-green-500`. Needs an explicit design-time decision (not left to the Implementer) since `docs/ux-ui/design.md` §12 doesn't yet cover this token family for chart/dot-style use inside a KPI card.
- **Risk — deck layout.** The mockup was designed and approved in isolation (a single card on a slate background), not inside the actual 5-card grid (`grid-cols-1 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-5`). A taller/denser "Total results" card breaks row alignment with its 4 siblings at every breakpoint where they share a row. `/akili-specify` MUST render this against the real deck (or a faithful CT screenshot) before implementation, not just the isolated mockup.
- **Risk — `min-h-[120px]`.** The card currently has a documented minimum height for grid alignment; the new layout will very likely exceed it. Explicit height requirement needed in `design.md`.
- **Dependency** — must not regress `overview-replicated-new-badges` (`BOV-T-1`) or `overview-w1w2-contributor-badge` (`BOV2-T-1`)'s already-shipped, DB-validated computed fields; this is presentation-only.
- **Active Lesson check** — no entry in `docs/specs/kaizen-log.md` Active Lessons table applies to this change's domain at proposal time.

## 12. Success Criteria

- The redesigned card renders correctly inside the real 5-card KPI deck at all 4 tracked Cypress breakpoints, with no row-alignment regression for the other 4 cards.
- All `--pr-*` tokens used are either already-approved or explicitly added to `colors.scss` + `docs/ux-ui/design.md` via a real design decision, never a raw hex/Tailwind-default color.
- `w1w2ContributorCount`/`w1w2LeadCount` remain visible and correct inside the new layout.
- Existing Jest/Cypress suites pass with updated assertions; no computed-field regression in `bilateral-overview.aggregate.spec.ts`.

## 13. Next Step

```text
/akili-specify changes/overview-total-results-progress-bars
```
