# Kaizen Entry — bugfix/policy-change-usd-amount-layout

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/policy-change-usd-amount-layout` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 (spec branch — not apply-capable; `staging` is) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (`PCL-T-1`, `PCL-T-2`) | tasks.md |
| Reviewer FAIL rework attempts | 1 (`PCL-T-2`, attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — no `test-report.md` (Lite depth; test evidence folded into `execution.md`) | — |
| Judgment-day severe findings | n/a — not run | — |
| Validation FAIL / WARN | n/a — no `validation-report.md` (Lite depth; Reviewer conformance audit served as the gate) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 — both tasks' `Consumers` field was non-`none`, so Review intensity (Step 2.3) was never met; both got a full conformance Reviewer | execution.md, tasks.md |
| Escaped defects (§3) | 0 | execution.md |

Not a clean run (1 rework attempt) — full Learn pass below.

## Lessons

**0 lessons distilled.** Both candidate signals from this spec trace to root causes the methodology already institutionalizes at a higher level than a digest entry — see below.

## Noted, not a lesson

- **`PCL-T-2` attempt 1's FAIL was an instance of the already-canonical "Expressible falsifier" rule (`/akili-specify`'s Falsifiability block, point 1), not a new gap.** Root cause: this spec's own `tasks.md` wrote `PCL-T-2`'s `Falsifier` field to cover only the *collapsed*-toggle state (USD Amount/Status present without expanding "Complete full metadata") and never named the *expanded*-toggle state as a required falsifier branch for `PCL-AC-3`'s exclusivity claim ("only the related-to question remains"). The Implementer wrote a test matching exactly what the Falsifier field asked for; the Reviewer correctly caught that an unscoped "contains the question text" assertion passes on both the pre-fix and post-fix templates, because the pre-fix template also showed the question (alongside USD amount/Status) once expanded. This is precisely the "fixture on which the named mutation leaves the reading unchanged is no gate" failure mode the Falsifiability block already names with prior-incident citations (`changes--toc-center-guard` KZ-2, `bugfix--other-fields-toc-visibility` KZ-OTV-2). The rule that would have prevented this is already live in the template; what was missing was the Specifier (prior session, same spec) applying it to *every* state a toggle-scoped exclusivity claim can be in, not just the default one. Recording here as a recurrence data point rather than a new `digest-update` (no existing `KZ-id` tracks this specific rule — it lives directly in the command template, already at maximum institutionalization) and rather than a new lesson (the fix is "apply the existing rule more completely," not a new rule).
- **A Leader-composed Reviewer brief for `PCL-T-2` attempt 1 shipped with a literal `{{PASTE THE DIFF HERE}}` placeholder instead of the actual diff** — a one-time drafting error (not re-reading the fully assembled prompt before sending), self-caught before the Reviewer could act on it meaningfully, corrected via an immediate follow-up message with the real diff. No task-level harm (no attempt consumed, no incorrect verdict issued). Already filed as model-behavior product feedback through the dedicated channel; not a candidate for a project-guide or template edit, since no persona rule would reliably have caught a one-off composition slip of this kind.

## Pending Items

None. The Constitution & Graph Sync sweep (factual-claims check of root `CLAUDE.md`/`AGENTS.md`) found no stale claims attributable to this spec. No new module/package was created and no module boundary moved, so no `## Constitution Impact` block exists to action. The one component-folder doc this spec touched (`type-policy-change/CLAUDE.md`) was already updated and re-stamped during task execution itself (confirmed by the Reviewer) — it is a component-folder doc, not a shared file, so it was not gated by Branch Context and needed no separate pending item here. `.codegraph/` exists in this repo — a fresh `codegraph sync`/index is recommended (not urgent; the change is two small template edits, no new symbols of note) per `/akili-archive` Step 3 item 6.
