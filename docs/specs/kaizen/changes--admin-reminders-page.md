# Kaizen Entry — changes/admin-reminders-page

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-reminders-page` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated, routine gates pre-approved by the owner on 2026-11-17 |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 6 (5 planned + T-6 owner decision) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-1 x1, T-2 x1) | execution.md — ARP-T-1, ARP-T-2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (PRTest HITL in execution.md) | execution.md — ARP-T-5, PRTest check 2026-11-23 |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 1 (T-5, manual check) | execution.md — REVIEW_SKIPPED: ARP-T-5 |
| Escaped defects (§3) | 0 | execution.md |
| Budget tripwire | 1 (after T-2; revised ≈850 → ≈1,450 LOC) | execution.md — BUDGET TRIPWIRE |

## Lessons

- **KZ-changes--admin-reminders-page-1 — A Spartan overflow menu with `[autoFocus]="false"` cannot be reached by keyboard.** (Product, Medium)
  - Root cause: `hlm-popover` content renders in a body-level CDK overlay; with autoFocus off, focus stays on the trigger and Tab skips the menu, so Preview / Change date / Cancel were unreachable for keyboard users. Jest's inline popover stub cannot show it.
  - Evidence: execution.md — ARP-T-2 attempt 1 Reviewer FAIL issue 2 (Violated Rule: requirements.md ARP-NFR-1).
  - Standardization: → P1

## Noted, not a lesson

- T-2 gave new elements the moved component's old `rir-*` test-id prefix instead of `arp-*` (ARP-NFR-4); fixed in attempt 2. First occurrence.
- T-1 FAIL was most likely a Reviewer reading a stale snapshot (the fix was already in the tree); no code change on attempt 2.
- Finished T-6 code stayed uncommitted for 5 days in the shared checkout and blocked pulls for other specs.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` (Spartan / a11y notes) |
| Edit | `- Spartan menus: never set [autoFocus]="false" on hlm-popover used as a menu; focus must enter the overlay on open and return to the trigger on close (KZ-changes--admin-reminders-page-1).` |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None: no new module; root guide factual sweep found no falsified claim from this spec; no TRD decision overturned. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |
