# Kaizen Entry — changes/multi-hlo-result-linking

## Metrics
- Reviewer FAIL rework attempts: `MHL-T-1` PASS on attempt 3 of 3 (2 rework rounds); `MHL-T-2`, `MHL-T-3`, `MHL-T-4` PASS on attempt 1.
- HALTs / FATAL_FAILs: 0
- Pivot Records: 0
- PRODUCT_BUG findings: 0
- Validation FAIL/WARN: 0 (several ADVISORY-only findings, none gating)
- `/akili-quick` escalations: 0
- Drift attributable to this spec: `tasks.md` top-level `Status:` header never flipped from `not-started` despite all four tasks reaching `[x]` — minor bookkeeping drift, noted for correction, not requiring a TRD/guide edit.

## Lessons

### L-1 (Product)
**Root cause:** `MHL-T-1` (server typology guard) needed 2 rework rounds and materially exceeded
`design.md`'s LOC budget (~120-180 estimated). The spec's own budget tripwire caught this, but the
budget itself was set before the guard's edge-case surface (typology mismatch across several call
paths) was fully scoped.
**Evidence:** `execution.md` summary table + "Budget tripwire" line: *"design.md budgeted ~120-180 LOC
and 1 review round; MHL-T-1 needed 3 attempts and materially more server LOC than estimated"*.
**Target:** Product (this project's estimation practice for server-side guard/validation tasks touching
several call sites).

## Noted, not a lesson
- Two client tasks (`MHL-T-2`, `MHL-T-3`) each disclosed skipping a `--coverage` run in favor of
  `--no-coverage`, and the Reviewer judged this non-gating both times with a specific technical
  justification (branch count strictly reduced / all real paths covered). Consistent, reasoned
  application of the existing verification rule — not a process gap.
- `tasks.md`'s stale top-level `Status:` header (never updated from `not-started`) is a cosmetic
  drift already corrected in this archive's summary; not worth a standardization item on its own.

## Pending Items
- `Kind: factual-sweep` — Severity: low. No stale claim identified in root guides attributable to
  this spec's scope (bilateral ToC linking, guard + two client fixes, no new module). Nothing to
  flag on apply.
- `Kind: trd-adr` — Severity: low. `MHL-DD-1` (reuse of `RESULT_TYPE_TO_INDICATOR_PATTERN`) was
  judged by the execution run as likely not needing TRD §11 promotion since it reuses an existing
  documented pattern rather than introducing a new architectural decision. Recorded here for the
  default-branch pass to confirm or promote; no ADR number allocated from this spec branch.
