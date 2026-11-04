# Design — Overview W1/W2 Contributor Badge

Links: `requirements.md` (same folder) · `docs/specs/changes/overview-replicated-new-badges/` (`BOV-DD-1..5`, reused below).

## 1. Executive Summary

Add a third derived count (`w1w2ContributorCount`) to the same `buildTotalResultsKpi` function `BOV-T-1` already extended, and render a third badge next to the replicated/new pair — same markup family, `pi-link` icon, same conditional token pattern.

## 2. Architecture Overview

Same file set as `BOV-T-1`: `bilateral-overview.aggregate.ts` (+ spec), `bilateral-overview.component.html` (+ spec), `bilateral-overview/CLAUDE.md`. No server change.

```
buildTotalResultsKpi(rows)   ← same single loop, one more counter
  returns { ...existing, w1w2ContributorCount }
template: badge row gains a 3rd <span> (pi-link)
aria-label: gains the 3rd figure
```

## 3. Design Decisions

### `BOV2-DD-1` — Reuse `BOV-DD-2`/`BOV-DD-4`/`BOV-DD-5` as-is

Same single-loop extension (no parallel function), same non-interactive `<span>` (card is already one `<a>`), same plain-English label ("results" / "W1/W2 contributor" — pick short label matching pill width; reference uses `{{count}} result(s)`, singular/plural — mirror that exactly, it's the only new copy nuance).

### `BOV2-DD-2` — Revisit `BOV-DD-3` (inline markup): stays inline

`design.md` §13 of `overview-replicated-new-badges` flagged "3rd pill → revisit shared component." Decision: **stay inline.** Three call sites across two files (Overview: 3 spans in one template; Reporting: 3 spans in another template) is still below the threshold that justifies a shared component's abstraction cost, and the two templates' surrounding markup (one is a link-wrapped hero card, one is a project card with buttons) differs enough that a shared component would need props for interactivity anyway. Revisit again only if a 4th pill or a 3rd screen appears.

### `BOV2-DD-3` — Reversion challenge (Step 2.3)

N/A — this spec adds a badge, reverts nothing.

## 4. Budget (Step 2.4)

- **Expected tasks:** 1.
- **Expected LOC:** ~35-45 (≈6 in `aggregate.ts`, ≈10 in `.component.html`, ≈15-20 across 2 spec files, ≈5 in `CLAUDE.md`).
- **Expected review rounds:** 1 (Lite, single reviewer pass; the token-fidelity lesson from `BOV-T-1`'s attempt 1 FAIL is passed to the Implementer up front this time, reducing rework risk).

Matches `Lite` depth — no re-sizing needed.
