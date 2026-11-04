# Kaizen Entry — bugfix/toc-kpi-optional-green-check

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/toc-kpi-optional-green-check` |
| Date | 2026-10-31 |
| Branch | qa-development-2026-ss (spec branch — no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (2 code, 1 manual on PRTest) | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (no validation-report.md; accepted) | archive-summary.md |
| Budget | 3 tasks, ~220 LOC + spec, 1 review round per task | design.md §1 |
| Merge conflicts at promotion | 1 (QA catalog snapshot: revision 31 taken on both sides) | archive-summary.md §4 |

## Lessons

- **KZ-bugfix--toc-kpi-optional-green-check-1 — The QA catalog revision was bumped from the spec branch's own base, so two branches both claimed 2026.31 for different content.** (Product, Medium)
  - Root cause: tasks.md TKG-T-2 fixed "revision 30 → 31" at specify time from `qa-development-2026-ss`. P2-4040 (another branch) had already taken 31 on `performance-refactor`. The snapshot conflicted, and `versions.ts` plus the 3 revision specs merged silently to a wrong 31. The fix needed a manual reconcile to 32.
  - Evidence: archive-summary.md §4; the merge `ff95c902a` / `4e1268cf3` "reconcile QA catalog to 2026.32".
  - Standardization: → P1
- **KZ-bugfix--toc-kpi-optional-green-check-2 — An Implementer that has handed back can stay alive on an idle background shell for hours; nothing in the Leader loop stops it.** (Methodology, Low)
  - Root cause: the TKG-T-2 implementer reported through its hand-back but kept a background child running. The Leader moved on to review and did not stop it, and the user saw "1 shell · 7h" in the status bar.
  - Evidence: archive-summary.md §7.
  - Standardization: none locally. Suggested for AKILI upstream: in `/akili-execute` Step 2.3, the Leader stops the Implementer task as soon as its report is received.

## Noted, not a lesson

- `npm run migration:check` opens a DB connection, so agents cannot run it. TKG-NFR-3 had to be handed to the user, and TKG-T-1 sat at `[~]` until then. If this recurs, specs should assign it to the user from the start.
- Regression spec advisories are not done: pin the gate's THEN line, widen the selector regex, pick the class by shape, cache the file scan.
- PRTest browser checks: the Chrome tool lost screenshots and keyboard input on heavy pages. Read-only API calls from the page context worked reliably.
- A parallel session (`sp-reporting-entry`) did the promotion merge in the same checkout and included its own commits. The cross-session idle notice fired before that session's last commits.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/CLAUDE.md` (QA catalog notes) |
| Edit | Before bumping `CATALOG_VERSIONS[year].revision`, take the max revision across `staging`, `performance-refactor` and the working branch, then add 1. On a merge where both sides bumped, set it to max + 1 and regenerate the snapshot with `npm run qa-catalog:snapshot`. |
| Severity | Medium |
| Status | pending |
