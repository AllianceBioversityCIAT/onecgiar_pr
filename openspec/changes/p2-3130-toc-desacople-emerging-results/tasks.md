# Tasks: P2-3130 — ToC decoupling for alignment = NO

## 1. OpenSpec & analysis
- [x] 1.1 Fetch Jira P2-3130 AC; confirm decoupling applies to C&P when `planned_result === false` (emerging results path).
- [x] 1.2 Compare with P2-3114 planned popup — out of scope; decoupling is C&P-only.

## 2. Implementation — C&P parent
- [x] 2.1 Add `isTocDecoupled` computed (`isCP2026 && planned_result === false`).
- [x] 2.2 Gate Centers split UI, info note, and Other dropdown on `!isTocDecoupled`.
- [x] 2.3 Add decoupled Science Programs single full-list dropdown block.
- [x] 2.4 Gate Science Programs split UI on `!isTocDecoupled`.
- [x] 2.5 Skip `preselectCentersEffect` / `preselectScienceEffect` when decoupled.
- [x] 2.6 Add decoupled save branch (`from_toc: false` for centers, SP, partners).

## 3. Implementation — External Partners child
- [x] 3.1 Add `isTocDecoupled` to `normal-selector`; gate split UI and Other dropdown.
- [x] 3.2 Skip `preselectPartnersEffect` when decoupled.

## 4. Tests
- [x] 4.1 Unit tests: `isTocDecoupled` truth table.
- [x] 4.2 Unit tests: decoupled save payload tags `from_toc: false`.
- [ ] 4.3 Manual QA: Entity Details → Report Emerging result → C&P → No → verify full dropdowns, no notes.

## 5. Verification
- [x] 5.1 Run Jest on touched spec files (49/49 pass).
- [x] 5.2 OpenSpec artifacts complete (proposal, design, specs, tasks).
