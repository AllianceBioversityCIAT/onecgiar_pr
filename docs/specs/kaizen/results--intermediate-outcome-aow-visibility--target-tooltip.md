# Kaizen Entry — results/intermediate-outcome-aow-visibility/target-tooltip

## Document Control

| Field | Value |
|---|---|
| Spec Path | `results/intermediate-outcome-aow-visibility/target-tooltip` |
| Date | 2026-08-27 |
| Branch | qa-development-2026 (spec branch — default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (`RES-T-1`, `RES-T-2`) | tasks.md |
| Reviewer FAIL rework attempts (code re-delegated) | 0 (the one FAIL triggered a Pivot, not rework) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (`RES-T-1` — false design premise about `PrTooltipDirective` keyboard reachability) | execution.md — `## Pivot Record: RES-T-1` |
| `/akili-quick` escalations into this spec | 1 (`RES-T-2`'s scope amendment — correctly declined as non-trivial, routed here) | execution.md — `## 3. Scope Amendment` |
| PRODUCT_BUGs | N/A (no `test-report.md` — testing embedded in execution) | — |
| Validation FAIL / WARN | N/A (no `validation-report.md`) | — |
| Drift attributable to this spec | none found | — |

## Lessons

- **KZ-results--intermediate-outcome-aow-visibility--target-tooltip-1 — A design decision asserted an existing shared component "already does X" without verifying it against that component's source.** (Product, High)
  - Root cause: `design.md` §6.3 claimed the new tooltip would match `achievedTooltip`'s "existing keyboard-reachable pattern," and `requirements.md`'s `RES-AC-1`/`RES-R-10` were written on top of that claim. The claim was never checked against `pr-tooltip.directive.ts`'s actual source — which has never handled focus/blur, hover/click only — so the false premise reached execution before the Reviewer caught it, triggering a full Pivot (spec amendment, re-review round) instead of being caught during `/akili-specify`.
  - Evidence: `execution.md` — `## Pivot Record: RES-T-1` ("Source inspection of `pr-tooltip.directive.ts` shows `PrTooltipDirective` has never been keyboard-reachable... a premise verified false against source").
  - Standardization: → P1

- **KZ-results--intermediate-outcome-aow-visibility--target-tooltip-2 — A Pivot's correction-closure sweep searched only the literal changed term, missing synonym sites that kept asserting the superseded claim.** (Methodology, Medium)
  - Root cause: after the Pivot amended `RES-AC-1`/`RES-R-10`/`design.md` §6.3 to drop the keyboard-reachability claim, the mandated two-direction sweep grepped only the literal word "keyboard." Two other sites (`requirements.md` §8, `design.md` §2.2) restated the same superseded claim using "focus"/"Tab-focus" instead, survived the sweep, and were only caught by a second, docs-only Reviewer pass.
  - Evidence: `execution.md` — Re-review (Attempt 2) Issue 1/2 and "Root cause" note ("the correction-closure sweep above searched only for the literal word `keyword`; neither survivor uses that word... search `focus|Tab|keyboard` together, not `keyword` alone").
  - This is a methodology (AKILI Pivot Protocol) root cause, not project-specific — no local edit proposed. Recommend upstreaming: the Pivot Protocol's two-direction sweep instruction should search a synonym set for the corrected concept, not the literal changed word alone.

## Noted, not a lesson

- `RES-T-2`'s `/akili-quick` escalation was handled correctly (declined as non-trivial, routed to a spec amendment per the user's choice) — process working as designed, not a defect.
- Two delegations for `RES-T-2`'s single attempt (closing a Not-Done gap before Review) is the Leader's designed behavior, not rework — no lesson.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to the Design Decisions (ADR) guidance: "A design decision that claims an existing shared component 'already does X' (a UX pattern, an accessibility affordance, a behavior) MUST cite verified evidence from that component's own source file — never assume from observed UI behavior or memory alone." |
| Severity | High |
| Status | pending |
