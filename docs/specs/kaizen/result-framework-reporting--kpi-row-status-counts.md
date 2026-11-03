# Kaizen Entry — result-framework-reporting/kpi-row-status-counts

## Document Control

| Field | Value |
|---|---|
| Spec Path | `result-framework-reporting/kpi-row-status-counts` (INC-167164) |
| Date | 2026-11-03 |
| Branch | qa-development-2026-ss (spec branch, no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (T-1..T-5) | tasks.md |
| Reviewer FAIL rework attempts | T-1 attempt 1 (404); T-3 attempts 1–3 (placement, P-7 layouts, folder stamp); T-5 #4 two text FAILs (separator, stale tasks/JSDoc) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 3 (#2 grouping + button, #3 drawer line withdrawn, #4 tint) | execution.md Pivot Records |
| Budget tripwire | re-baselined 4×: 320 → 650 → 1,200 → 1,400 → 1,600 net LOC | execution.md |
| Findings after code PASS | the user found "1 submitted" next to an Approved bilateral result; the grey vs yellow pills were unreadable | Pivot Records #2, #4 |
| Validation | n/a (accepted by Santiago) | archive-summary.md |

## Lessons

- **KZ-result-framework-reporting--kpi-row-status-counts-1 — A summary chip grouped statuses under a word that the list it opens does not use, so an Approved bilateral result read as "submitted".** (Product, Medium)
  - Root cause: KRC-R-1 folded status 6 into "Submitted" as the OQ-1 default. The drawer the chip opens labels each row with its real status name (Approved, Pending Review). The design never checked the chip's vocabulary against that list.
  - Evidence: execution.md — Pivot Record #2 (trigger: Mali-CBBP `1 submitted` vs drawer #9861 Approved).
  - Standardization: → P1
- **KZ-result-framework-reporting--kpi-row-status-counts-2 — Status was carried by a whole-pill tint with no legend, and the user could not tell what grey vs yellow meant.** (Product, Low)
  - Root cause: design §8 tinted the entire chip by its "most important segment". Colour then described the row, not the word next to it, and nothing on screen explained the neutral state.
  - Evidence: execution.md — Pivot Record #4 (Chrome check, Santiago's question).
  - Standardization: → P2

## Noted, not a lesson

- Spec text was not swept after the mid-execute amendments, so tasks.md and a JSDoc still showed the old separator and tint. That cost two extra review rounds. The Correction Closure rule already covers this (sweep every spec file, tasks.md included); it was not applied. If it recurs, raise it as a digest-update.
- The budget was re-baselined four times. Every overrun came from a user-approved redesign after a visual check, not from mis-sizing. A visual check before T-3 would have moved those pivots earlier.
- Windows merge checkout (`autocrlf=true`): `dashboard-lab.kpi-status-chip.spec` and `qa-catalog.snapshot.spec` fail only on CRLF, because they compare exact text with hard-coded `\n`. CI uses LF. Normalising `\r\n` in such specs would remove the false red.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §8 (components) |
| Edit | A chip or badge that summarises statuses must use the same status names as the list or drawer it opens (never fold Approved into "submitted"); any grouping must be visible in the label. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §8 (components) |
| Edit | Put status colour only on the word it explains (e.g. the `● N editing` badge), never on a whole multi-status control; neutral controls use the surface/border tokens. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` |
| Edit | Mark the KRC-T-3 chip bullet (~L245, `[editing] [submitted] [pendingReview]`, tokens 1/3/5) "(superseded by KRC-T-5)" and translate the KRC-T-5 bullet to Spanish to match the section. |
| Severity | Low |
| Status | pending |
