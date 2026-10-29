# Kaizen Entry — bugfix/bilateral-save-draft-footer

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-save-draft-footer` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | tasks.md |
| Reviewer FAIL rework attempts | 1 (`BSF-T-2`, attempt 1 → Evidence-section gap) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (`BSF-T-1` — premise disproven after 2 screenshot-verified attempts) | execution.md — Pivot resolution section |
| PRODUCT_BUGs | 0 | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | 0 / 0 | no standalone validation-report; folded into Reviewer rounds |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | n/a — `BSF-T-1`'s non-defect was caught before closure, not after |

## Lessons

- **KZ-bugfix--bilateral-save-draft-footer-1 — A Premise Ledger row citing a secondary source (a changelog note) instead of an independently-run measurement can assert a defect that doesn't exist.** (Product + Methodology, High)
  - Root cause: `design.md`'s Premise Ledger rows for `BSF-T-1` (footer "Save draft" button clipping) cited `bilateral-result-creator/CLAUDE.md`'s 2026-10-08 changelog note — a narrative about a *different*, already-fixed overflow bug — instead of a fresh, independently-run measurement of the actual reported symptom. Two separate Implementer attempts then spent real effort (12 column widths, screenshots, pre-fix and post-fix SCSS, a freshly-built `ng serve`) and could not reproduce any clipping at any width, because the premise was never true for the component the spec named.
  - Evidence: `execution.md` — "Pivot resolution — `BSF-T-1` reclassified (2026-10-15)" section; the original `design.md` Premise Ledger rows P-2/P-3.
  - Why this is High, not Medium: it did not just cost rework inside the task — it sent two full Implementer attempts at the *wrong component* before the user's own screenshots revealed the real defect (`app-field-card` save-pill truncation, a genuine regression from this same session's `bugfix/policy-change-usd-amount-position`). A citation discipline gap at specify time silently became a correctness gap at execute time.
  - Standardization: → P1 (local, Product half) and P2 (upstream, Methodology half — see [[kaizen]] skill's Premise Ledger citation rules).

## Noted, not a lesson

- `BSF-T-2`'s single Reviewer FAIL (Evidence section bypassing the new scoped-error-check mechanism) is the Premise Ledger's own flagged risk ("Assumed, not independently re-verified") materializing exactly as anticipated and being caught by the Reviewer's independent re-verification — this is the methodology working as designed, not a gap.
- Third occurrence this session (after `bugfix/bilateral-status-dropdown-overlay` and one earlier spec) of an Implementer's first attempt missing the folder-`CLAUDE.md` re-stamp convention — not raised to a lesson here since it was already captured by a prior spec's kaizen entry; recorded again in case recurrence crosses the digest-promotion threshold.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | In the Premise Ledger section, add: "A citation to another document's changelog/narrative note is not a verification — it is a pointer to someone else's claim. Before a Premise Ledger row is marked verified, the cited behavior MUST be independently reproduced (a command run, a screenshot taken, a direct code read) against the *actual* reported symptom, not against a similarly-worded past incident." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Propose adding to `/akili-specify`'s Premise Ledger citation rules (Phase 1/2, "claims about current behavior cite or mark" block): an explicit prohibition on satisfying a Premise Ledger citation with a secondary source (another doc's changelog/narrative entry) when the row's claim is about current, reproducible behavior — such a row must cite a primary, independently-run verification instead, or carry the `UNVERIFIED` marker. |
| Severity | High |
| Status | pending |
