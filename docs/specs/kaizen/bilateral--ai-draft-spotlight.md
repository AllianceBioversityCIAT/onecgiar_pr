# Kaizen Entry — bilateral/ai-draft-spotlight

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/ai-draft-spotlight` |
| Date | 2026-10-27 |
| Branch | qa-development-2026-mc-2 (Branch Context: **spec**; the apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |
| Archive | `docs/specs/archive/2026-10-27-bilateral--ai-draft-spotlight/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (3 planned + 1 added by the pivot) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 1 (ADS-T-3: tall-card header under the app bar at 375 px; overlays stacking after start; overlay colour) | execution.md — ## Pivot Record: ADS-T-3 |
| PRODUCT_BUGs | n/a (no `test-report.md`) | — |
| Judgment-day severe findings | resolved before approval (3 rounds) | judgment.md |
| Validation FAIL / WARN | 0 / 3 (2 resolved before archive) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 1: ADS-T-3, `inline` (HITL, no code) | execution.md — ## REVIEW_WAIVED: ADS-T-3 |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 2, both found at HITL in ADS-T-2's code (Reviewer PASS, not skipped): HITL-F1 and HITL-F2 | execution.md — ADS-T-3 |
| Budget | LOC +1 332 against ≈ 530 planned (tripwire 600), accepted by the user. Tests about 3× their estimate | execution.md — ADS-T-2 summary |

## Lessons

- **KZ-bilateral--ai-draft-spotlight-1 — A premise about where a library scrolls an element was verified against the library alone, never against the app shell's sticky chrome.** (Product, High)
  - Root cause: Premise P-10 cited driver.js's `scrollIntoView({ block: 'start' })` correctly. But the design's "Tall card" row (§6.4) concluded "so the header is visible" without accounting for the sticky `.app-shell-header`, which is about 170 px tall at 375 px because the test-environment banner wraps. A window-targeted scroll lands under that header. The mocked unit tests could not see it; only the 375 px HITL run did.
  - Evidence:
    - `execution.md` — ADS-T-3, H-6 at 375 px (FAIL), HITL-F1.
    - `design.md` §6.4 "Tall card" (rev. 3 wording) and DD-10 (the fix).
    - `bugfix--evidence-modal-sticky-actions.md` KZ-EVM-2 is the same `.app-shell-header`, but with a different failure mode (paint order), so this is not a recurrence.
  - Standardization: → P1

- **KZ-bilateral--ai-draft-spotlight-2 — A "never shown at the same time" requirement was designed as a precondition on one side only.** (Product + Methodology, High)
  - Root cause: ADS-AC-6a's BUT ("two dimming layers MUST NOT be shown at the same time") is an invariant over both orderings. The design's clash guard (§6.4) gated only "the spotlight starts while a layer is open", plus the reverse for the tour alone. "A layer opens while the spotlight is active" (for example, a toast action opening the drawer) was never specified. The Reviewer flagged it as advisory in ADS-T-2 (lens B, resilience), and HITL W-1 confirmed it.
  - Evidence:
    - `execution.md` — ADS-T-2 ADVISORY "B, resilience"; ADS-T-3 watch item and HITL-F2.
    - `design.md` DD-11.
  - Standardization: → P2 (local), P3 (upstream)

## Noted, not a lesson

- **A Reviewer advisory predicted HITL-F2.** It was routed to "watch at HITL" rather than escalated as a spec gap, and the pivot followed one task later. That was within the rules ("Advisory Never Becomes A Task"), but note it if an advisory naming an unmet `BUT` clause recurs.
- **The Leader misjudged dimming from a downscaled screenshot.** The page was correctly dimmed, and pixel sampling settled it. For overlay and contrast claims in HITL, sample pixels instead of eyeballing.
- **The ADS-T-3 `skip-eligible` claim ("no file changes outside `execution.md`") was not earned**, because the screenshots went under `hitl/`. HITL tasks that record screenshots should not claim "no files".
- **Self-reported counts drifted.** The Leader logged "4 rounds / 5 verdicts" where the record shows 3 / 4, and the validator caught it (WARN-3).
- **Two existing issues at 375 px surfaced** (horizontal scroll, `?job=` reload not scrolling). Neither is a lesson for this spec; they are a follow-up ticket.
- **Constitution and graph sync (archive Step 3) produced no items:**
  - **Guide sync:** the only Constitution Impact note (ADS-T-2: the new `DraftSpotlightService` in `pages/bilateral/services/`) needs no child guide. Its contract lives in `my-draft-results/CLAUDE.md`, which is already updated, and no `## Module Guides` entry changes.
  - **Factual sweep:** root `CLAUDE.md` and `AGENTS.md` make no claim this spec falsified.
  - **TRD:** no ADR was overturned.
  - **CodeGraph:** a re-index is recommended (`codegraph sync`).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §9 "Verifying in a REAL browser" (gotcha list) |
| Edit | "**Window-targeted scrolls land under the sticky `.app-shell-header`** (≈170 px at 375 px, banner wraps): any `scrollIntoView` / library auto-scroll (driver.js `block:'start'`) needs `scroll-margin-top` ≥ the header's bottom, and a design premise 'element visible after scroll' must be HITL-checked at 375 px." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (interaction-rules / overlay guidance) |
| Edit | "For every requirement of the form 'A and B MUST NOT be shown at the same time', the design states both orderings: A starting while B is open, and B opening while A is active — a start-time guard alone covers half the invariant." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Template rule for AKILI `general-setup/design.md`: mutual-exclusion invariants ("MUST NOT … at the same time") must be designed for both orderings, not as a one-sided precondition; `/akili-specify` Correction Closure should flag a single-sided guard against such a clause. Source: KZ-bilateral--ai-draft-spotlight-2. |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add source spec `bilateral/ai-draft-spotlight`. Production was about 290 LOC against about 220 planned (≈ 1.3×). Tests were about 1 040 LOC against about 310 (≈ 3.4×), for 35 numbered tests plus falsifier-driven fixtures, a one-shot / settle / re-arm harness and a 4th pivot task. Same shape as ADN, COT and RDR: size test LOC from scenarios × harness setup. Recurrence after ADN; raise severity to High if apply finds ≥ 3 recurrences since the last standardization. |
| Severity | Medium |
| Status | pending |
