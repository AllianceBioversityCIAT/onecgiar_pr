# Kaizen Entry — bugfix/toc-unmapped-orange-notes

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-unmapped-orange-notes` |
| Date | 2026-08-29 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (`TOC-T-1`, `TOC-T-2`) | tasks.md |
| Reviewer FAIL rework attempts | 3 total: `TOC-T-1` FAILed attempts 1 and 2 (PASS on attempt 3); `TOC-T-2` FAILed attempt 1 (PASS on attempt 2) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| Budget tripwire triggered | 1 (`TOC-T-1` exceeded design.md's 1-expected-review-round budget, escalated to the user for a 3-way choice) | execution.md — "Decision point" |
| Cross-session coordination episode | 1 (negotiated combined guard with concurrent `lead-center-full-catalog` session over `rd-contributors-and-partners.component.html:163`) | execution.md — "Cross-session negotiation" |
| PRODUCT_BUGs / Validation FAIL / WARN | n/a (no `test-report.md`/`validation-report.md`) | — |

## Lessons

- **KZ-bugfix--toc-unmapped-orange-notes-1 — A design's "Consequences: None negative" analysis for a template-gate change did not enumerate sibling conditionals keyed off the same underlying state, causing 2 of 3 `TOC-T-1` review rounds to FAIL.** (Product + Methodology, Medium)
  - Root cause: `TOC-DD-1`'s gate change (extending `isCP2026()` with `planned_result !== false`) was applied directly to the Centers/Science blocks, but a separately-gated sibling block (the "Other(s)" auto-activation at L163, keyed off the same `!hasReferenceCenters()` state that the edit newly made true in the unmapped case) was not accounted for in the design's consequence analysis. This produced a duplicate-labeled-field regression only discovered by attempt-2's Reviewer, one round past the design's own stated budget (1 expected review round).
  - Evidence: `execution.md` — `TOC-T-1` attempt 1 FAIL (Science section made unreachable) and attempt 2 FAIL (Violated Rule: `design.md` `TOC-DD-1` Consequences "None negative" — L163's independent gate not accounted for).
  - Standardization: → P1 (local, `docs/specs/general-setup/design.md`) + upstream methodology recommendation (see Pending Items).

## Noted, not a lesson

- A result that saves "Other" partners while mapped **Yes**, then switches to **No**, keeps those entries in `allSelectedPartners`'s count with no visible chip or removal path — pre-existing state this spec doesn't address; flagged for the manual QA pass in `tasks.md` §6, not a code change (`execution.md` — `TOC-T-2` attempt 2 ADVISORY).
- In the escape-hatch state negotiated for L163/168, both Centers controls carry the identical label `'Contributing CGIAR Centers'` — accepted cost of not hiding the auto-added chip; cheaply improvable later by keying the label off which branch is flat vs. auto-activated (`execution.md` — `TOC-T-1` attempt 3 ADVISORY). Below the lesson bar; feeds recurrence.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | Add to the Decision/Consequences section checklist: "When a design decision changes a conditional gate on shared UI/component state, the Consequences analysis MUST enumerate every other conditional in the same file keyed off that same underlying state or signal — not only the block being directly edited." |
| Severity | Medium |
| Status | pending |

### P2 (methodology upstream recommendation, no local edit)

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology repository — general design-template guidance (upstream, not this repo) |
| Edit | Recommend the same "enumerate sibling conditionals on shared state" checklist item be added to AKILI's own `design.md` template — this is a generic template-review gap, not specific to this project's stack. |
| Severity | Medium |
| Status | pending |
