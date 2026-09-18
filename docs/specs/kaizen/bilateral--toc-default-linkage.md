# Kaizen Entry — bilateral/toc-default-linkage

## Metrics
- Reviewer FAIL rework attempts: 0 (T-3 reviewer PASS on attempt 1; no other Reviewer verdicts logged)
- HALTs / FATAL_FAILs: 0
- Pivot Records: 0
- PRODUCT_BUG findings: 0
- Validation FAIL/WARN: 0 (no standalone validation-report.md; embedded checks all green)
- `/akili-quick` escalations: 0
- Drift attributable to this spec: none noted

## Lessons

### L-1 (Product)
**Root cause:** `TOC_CATEGORY_LEVEL_MAP` (introduced in T-3, `bilateral-center.service.ts`) hardcoded
non-canonical level labels (`'Work package Output'` / `'Work package Outcome'`) instead of reusing
the naming already established in `result.repository.ts` (~L3940) and `toc-level.service.ts`. Neither
`design.md` nor `execution.md` cross-checked the new map against existing naming conventions before
implementation.
**Evidence:** `execution.md`, "Root cause" note near L-40, self-caught and fixed post-delivery with a
regression test (`bilateral-center.service.spec.ts`, "1c. node level_name uses the canonical PRMS
naming").
**Target:** Product.

## Noted, not a lesson
- Two user-requested follow-on UX iterations (toggle layout, hub redesign adapted from an external
  mockup) were folded into this spec rather than split into new ones. Reasonable given they refined
  the same just-delivered component before archive; not a process gap.

## Pending Items
- `Kind: factual-sweep` — Severity: low. No specific stale claim identified in root `CLAUDE.md`/`AGENTS.md`
  during this pass; sweep was performed but found nothing to flag. No action needed on apply.
- `Kind: standardization` — Severity: medium. Proposed edit: add a one-line rule to
  `onecgiar-pr-server/CLAUDE.md` (or the relevant module guide) — "When adding a new label/category
  map with domain terminology (result levels, categories, statuses), grep existing repositories/
  services for the canonical wording first (e.g. `result.repository.ts`, `toc-level.service.ts`)."
  Status: pending (recorded on spec branch `qa-development-2026-ss`; awaiting default-branch apply).
