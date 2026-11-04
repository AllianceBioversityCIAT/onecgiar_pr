# Kaizen Entry — bugfix/w3-projects-by-program

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/w3-projects-by-program` |
| Date | 2026-11-03 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (2 code, 1 manual) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-1: test case 5 missing, mock state leaked across describes) | execution.md — WPP-T-1 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| Budget | ~180 LOC planned; 3 review rounds vs ≤2 per task | tasks.md §5, execution.md |
| Manual check friction | #3 needed 2 sessions (browser tool could not type); #4 needed 4 user round-trips (panel renamed, wrong URL pattern) | execution.md — WPP-T-3 entries |
| PRODUCT_BUGs / Validation | none (no test or validation report; absence accepted) | archive-summary.md §6 |

## Lessons

- **KZ-bugfix--w3-projects-by-program-1 — A manual DevTools blocking step that names only a path fragment fails silently.** (Product, Medium)
  - Root cause: WPP-T-3 #4 said "Block `clarisa/centers/get/all` in DevTools". The Leader turned it into `https://prtest-back.ciat.cgiar.org/*/clarisa/...`, assuming an `/api` prefix. PRMS back-end paths are mixed (`/api/...`, `/v2/api/...`, and `/clarisa/...` with no prefix), so the pattern matched 0 requests and the page loaded normally. Chrome's current DevTools also renamed "Network request blocking" to "Request conditions", so the documented command was not found either. Only the panel's "0 affected" counter exposed the miss.
  - Evidence: execution.md — WPP-T-3 close-out, row #4; tasks.md WPP-T-3 check 4.
  - Standardization: → P1

## Noted, not a lesson

- **T-1 mock leak.** `mockVersionRepository.findOne` implementations leaked across `describe` blocks, so a test passed or failed by run order. The Reviewer caught it and the fix was `mockReset()` in the outer `beforeEach`. This was a one-off slip in a large legacy spec file, so no rule change.
- **Browser tool could not type (2026-10-31).** A tool problem, not app evidence; the 2026-11-03 run typed normally.
- **Selected items pinned under every Center pill** (`L-AGR003` shown under WorldFish). This is existing P2-3860 behaviour, not a defect of this spec.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (manual verification task section) |
| Edit | Add: "A manual step that blocks or throttles a request gives the full request URL as the browser shows it (host + path, copied from the Network tab), names the Chrome panel 'Request conditions', and states the check that the rule matched ('N affected' > 0 / status `(blocked:devtools)`)." |
| Severity | Medium |
| Status | pending |
