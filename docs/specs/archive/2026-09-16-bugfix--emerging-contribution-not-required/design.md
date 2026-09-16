# Design — Emerging results should not require "Contribution to indicator target" (Lite, Bug Mode)

## 1. Document Control
- Spec: `bugfix/emerging-contribution-not-required`
- Depth: Lite
- Delegation: none (single-file logic fix, no scout/design agent needed)

## 2. Executive Summary
Add a single guard (`!this.isEmerging()`) to the existing `contribution_to_indicator_target` check inside `missingFields()` in `lab-report-form.component.ts`. No new files, no template changes, no data-model or API changes.

## 3. Architecture Overview
No architectural change. This touches one `computed()` signal in one standalone Angular component. `isEmerging()` already exists (`emergingMode() || !!emergingCategory()`, L225) and is already used by sibling branches (`needsCategoryChoice`, `needsResultLevelChoice`) in the same `missingFields()`/requiredness contract — this fix follows that existing pattern rather than introducing a new one.

## 4. Design Decisions

**DD-1 — Guard placement: inside the existing conditional, not a new branch.**
Change:
```
if (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === '')
  missing.push('Contribution to indicator target');
```
to:
```
if (!this.isEmerging() && (body.contribution_to_indicator_target == null || `${body.contribution_to_indicator_target}`.trim() === '')))
```
(exact parenthesization to be finalized at implementation; logically: skip the whole check when `isEmerging()` is true).
- **Why:** smallest possible diff; consistent with how `needsCategoryChoice()`/`needsResultLevelChoice()` already special-case emerging mode in this same file.
- **Reversion challenge (Step 2.3):** this DD does not revert any already-delivered behavior — it narrows an existing requiredness rule for one already-distinguished mode (`isEmerging()`), it does not remove the rule for the non-emerging path. No challenge needed.

**DD-2 — Field stays visible/editable for emerging results.**
- **Why:** proposal explicitly scopes this to requiredness only ("no debe ser obligatorio", not "hide it"). Card 2 ("Target Contribution") already renders unconditionally except for the KP-entry-mode gate (`html:325`) — untouched.

## 5. Budget (Step 2.4)
- **Expected tasks:** 1
- **Expected LOC:** ~2 (one conditional line changed) + ~15-25 LOC of new test code
- **Expected review rounds:** 1

This is far below `Lite`'s normal ceiling — appropriately so; a genuinely single-conditional bugfix. No split, no depth change needed.

## 6. Frontend Component Architecture
No new components. No template changes. No new design tokens.

## 7. Rollback
Revert the one-line conditional change; no data/migration to unwind.
