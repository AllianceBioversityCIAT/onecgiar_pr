# Kaizen Entry — bugfix/field-card-save-pill-truncation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/field-card-save-pill-truncation` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 | tasks.md |
| Reviewer FAIL rework attempts | 2 (`FCT-T-1` attempts 2 and 3) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (`FCT-T-1` attempt 1 — width-sampling found no 3-column solution, user accepted variable column count) | execution.md — Pivot Record: FCT-T-1 |
| PRODUCT_BUGs | 0 | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | 0 / 0 | no standalone validation-report; folded into Reviewer rounds |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | n/a — both defects caught by the Reviewer before closure |

## Lessons

- **KZ-bugfix--field-card-save-pill-truncation-1 — A design correction responding to one Reviewer FAIL was verified against the reported counterexample, not the general behavior space, and introduced a new defect of the same class.** (Product + Methodology, High)
  - Root cause: attempt 2's `minmax(360px,1fr)` FAILed because it was picked by sampling only 2 widths (missed squeeze zones). The correction (attempt 3, `minmax(390px,1fr)`) fixed the sampling gap by deriving a general mathematical guarantee (`F>380px` is collapse-free at every width) — but checked only the "column too narrow → text collapses" failure mode of `auto-fit`/`minmax()`, not the second failure mode of the same mechanism ("floor can't shrink below itself → overflow at sub-floor widths"). The correction traded one counterexample-specific bug for another.
  - Evidence: `execution.md` — `FCT-T-1` attempt 2 FAIL (squeeze-zone collapse), attempt 3 FAIL (sub-floor overflow), both citing exact widths and measured pixel values.
  - Why High, not Medium: this is the second FAIL in the same task on the same root pattern — a Pivot correction's own verification scope was too narrow twice in a row, not once.
  - Standardization: → P1 (local, Product half: a CSS Grid gotcha note) and P2 (upstream, Methodology half: the rendered-measurement checklist should require both failure directions for any locked `minmax()` value).

## Noted, not a lesson

- The Implementer's recurring judgment call (all 4 attempts) to substitute Cypress CT evidence for a manual `ng serve` check was accepted each time without friction — not a lesson, but worth tracking: if this pattern recurs across specs, it may warrant promoting "Cypress CT with real production markup supersedes the manual-check DoD item for pure CSS-geometry tasks" into a standing rule rather than a per-task judgment call.
- Fourth occurrence this session of an Implementer/Leader correctly re-stamping a folder `CLAUDE.md` on first attempt (no FAIL on this convention this time) — the recurring miss flagged in 3 earlier specs this session did not recur here.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` (§19 styles or §21 patterns) |
| Edit | Add a CSS Grid gotcha note: "A `grid-cols-[repeat(auto-fit,minmax(Fpx,1fr))]` floor has two independent failure modes, not one: columns below `F` collapse into fewer tracks (fine), but a bare `F` cannot itself shrink below `F` — content narrower than `F` overflows instead of degrading. When raising `F` to fix a narrow-column defect (e.g. a child component's own CSS `@container` collapse threshold), prefer `minmax(min(Fpx,100%),1fr)` over a bare `minmax(Fpx,1fr)` so sub-`F` widths still degrade gracefully instead of overflowing. (`bugfix/field-card-save-pill-truncation`, `FCT-T-1` attempt 3.)" |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Propose adding to `/akili-specify`'s rendered-measurement checklist (Step 3.2, Falsifiability block, item 6): when a task locks a CSS Grid `minmax(F,1fr)` value (or any similar two-sided geometry constant), the Falsifier must prove BOTH directions the constant can fail — the direction the original defect report named, AND the opposite direction a naive fix is likely to introduce (e.g. raising a floor to fix a collapse can introduce an overflow; the reverse applies to lowering a ceiling). A single-direction falsifier that passes is evidence for half the claim, not the whole one. |
| Severity | High |
| Status | pending |
