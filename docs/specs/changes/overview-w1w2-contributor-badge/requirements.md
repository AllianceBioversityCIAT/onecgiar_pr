# Requirements — Overview W1/W2 Contributor Badge

## 1. Document Control

- **Module:** `bilateral`
- **Sub-feature:** Center Overview tab — "Total results" KPI hero (3rd badge)
- **Depth:** Lite
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** draft
- **Related spec:** `docs/specs/changes/overview-replicated-new-badges/` (`BOV-T-1`, just shipped) — this is a direct follow-up, adding the third pill anticipated in that spec's `design.md` §13.

## 2. Executive Summary

The Overview "Total results" card just gained two badges (replicated / new, `BOV-T-1`). This spec adds a third: a center-wide count of **W1/W2 results that contribute to the center** (not lead), mirroring the Reporting tab's third per-project pill (`bilateral-projects-panel.component.html:289-298`, `getProjectW1w2ContributorCount`) at the center level instead of per-project.

## 3. In Scope / Out of Scope

**In scope:**
- One new derived count, `w1w2ContributorCount`, in `OverviewTotalResultsKpi`.
- One new badge (pi-link icon, same conditional token pattern as the other two badges) on the same card.
- `aria-label` updated to include the new count.

**Out of scope:**
- Any change to `bilateral-projects-panel` (reference only).
- Any change to the existing `w3Count`/`w1w2Count` or `leadCount`/`contributingCount` lines — unchanged, additive only.
- Server/API — `source` and `is_leading_result` are already on every row.

## 4. Functional Requirements

- **`BOV2-R-1`** The system MUST compute `w1w2ContributorCount` — center-wide count of phase-filtered rows where `row.source !== 'API'` (W1/W2) AND `Number(row.is_leading_result) !== 1` (contributing, not lead) — in the same existing loop in `buildTotalResultsKpi`.
- **`BOV2-R-2`** The "Total results" card MUST render a third badge for this count, using the reference's `pi-link` icon and the same conditional token pattern already used by the replicated/new badges (`text-[var(--pr-color-secondary-400)]` when count > 0, else `text-[var(--pr-color-accents-4)]`), as a non-interactive `<span>`.
- **`BOV2-R-3`** The card's `aria-label` MUST include the new count.
- **`BOV2-R-4`** The existing `w3Count`/`w1w2Count`, `leadCount`/`contributingCount`, `replicatedCount`/`newCount` fields MUST remain unchanged in position and computation — additive only.

### Scenario: BOV2-R-1 main case

- GIVEN 8 phase-filtered rows: 3 with `source !== 'API'` AND `is_leading_result !== 1` (W1/W2 contributor), 5 others (mixed W3 and W1/W2-lead)
- WHEN `buildTotalResultsKpi` runs
- THEN `w1w2ContributorCount === 3`
- BUT it must NOT count a W3 row (`source === 'API'`) regardless of `is_leading_result`
- AND IT MUST NOT count a W1/W2 row where `is_leading_result === 1` (lead, not contributor)

## 5. Defect Classes & Gates

| Defect class | Gate |
|---|---|
| Wrong filter (counts W3 rows, or counts W1/W2-lead rows) | `bilateral-overview.aggregate.spec.ts` — fixture with all 4 combinations (W3/lead, W3/contributor, W1W2/lead, W1W2/contributor) |
| Badge visually diverges from reference (icon/token) | No automated check — human check at browser-verification step, same accepted-risk pattern as `BOV-T-1` |
| `aria-label` missing the count | `bilateral-overview.component.spec.ts` — presence assertion |

## 6. Requirement ID Index

`BOV2-R-1`, `BOV2-R-2`, `BOV2-R-3`, `BOV2-R-4`.
