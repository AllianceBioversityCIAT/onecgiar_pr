# Kaizen Entry — changes/kp-program-accelerator-match

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-program-accelerator-match` · Prefix `KPAM` |
| Date | 2026-09-15 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |
| Outcome | 4/4 tasks PASS; Science program accelerator match & soft-boost badge live on `qa-development-2026` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 planned; 4 PASS | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 1 (Attempt 1 T-4 caught dropped tags in dedup; Attempt 2 fixed and PASS) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | — |
| Validation FAIL / WARN | n/a | — |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none | — |
| Subagent availability | Flash hit 503 limit during T-3; direct implementation with Pro reviewer | execution.md |
| Scoped Jest (archive) | 7 suites / 253 PASS | archive run 2026-09-15 |

## Lessons

- **KZ-changes--kp-program-accelerator-match-1 — Multi-source deduplication must merge collection-level metadata arrays across survivors and dropped duplicates.** (Product, High)
  - Root cause: When deduplicating items across multiple repositories (CGSpace, MELSpace, WorldFish), `dedupe()` previously kept only the survivor record's properties. If the survivor was selected from a repository that lacked `programAccelerators`, the tags present on the duplicate record were dropped.
  - Evidence: Caught during Reviewer audit of `merge.ts` in `KPAM-T-4` Attempt 1. Fixed in Attempt 2 by unioning `programAccelerators` across all group items via a `Set`.
  - Standardization: Add checklist item in `design.md` template for deduplication functions to assert field preservation across merged variants.

## Noted, not a lesson

- Angular strict template type-checking (`strictTemplates`) enforces exact casing matching interface definitions (`shortName` vs `short_name`). Fixed in `aow-hlo-create-modal.component.html` during `KPAM-T-3`.
- Flash tier model occasionally hits API 503 capacity limits; falling back cleanly to direct execution with independent Pro reviewer preserved review integrity (`author ≠ auditor`).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/CLAUDE.md` |
| Edit | Note that `merge.ts` `dedupe()` unions `programAccelerators` across duplicate group items to ensure metadata tags are never lost when merging across heterogeneous repositories. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to Data Layer / Merging checklist: "When designing multi-source record deduplication, ensure collection-level attributes and tags are unioned rather than discarded from non-survivor duplicates." |
| Severity | Medium |
| Status | pending |
