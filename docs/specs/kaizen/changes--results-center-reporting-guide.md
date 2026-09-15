# Kaizen Entry — changes/results-center-reporting-guide

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/results-center-reporting-guide` |
| Date | 2026-09-11 |
| Branch | qa-development-2026 |
| Archive Run | 1 |

## Metrics

| Signal | Value |
|---|---|
| Tasks executed | 4 / 5 (HITL deferred) |
| Reviewer FAIL rework | 0 |
| Pivots | 0 |
| Post-ship UX fix | Picker nested-scroll → single scroll region |

## Lessons

- **KZ-changes--results-center-reporting-guide-1 — Modal pickers need one scroll owner; never nest `overflow-y` on dialog body + inner list.** (Product, Medium)
  - Root cause: `pr-dialog` + body + 320px list all scrolled; wheel events stuck; first item clipped.
  - Evidence: owner HITL screenshot 2026-09-11; fixed with flex picker layout + `overflow: hidden` on dialog body.
  - Standardization: → P1

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Modal multi-step UIs: one scroll region per step; dialog shell `overflow: hidden`; footer/actions `flex-shrink: 0`. |
| Status | pending |
