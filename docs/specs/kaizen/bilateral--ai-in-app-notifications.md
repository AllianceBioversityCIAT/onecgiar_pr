# Kaizen Entry — bilateral/ai-in-app-notifications

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/ai-in-app-notifications` |
| Date | 2026-09-18 |
| Branch | `qa-development-2026` |
| Archive Run | 1 |
| Approval Mode | gated |

---

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 | `tasks.md` |
| Reviewer FAIL rework attempts | 0 | `execution.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 0 | `execution.md` |
| Judgment-day severe findings | 0 | `design.md` |
| Validation FAIL / WARN | 0 / 0 | `archive-summary.md` |

Clean run: all tasks (`AIN-T-1`, `AIN-T-2`) completed and received `STATUS: PASS` on Attempt 1 with zero rework attempts.

---

## Lessons

Clean run — zero failures or rework attempts encountered. No new corrective lessons required.

---

## Noted, not a lesson

- **In-Platform vs Outbound Channel Decoupling:** When a client mandates the elimination of outbound email notifications for AI background jobs, suppressing the email dispatcher while maintaining database-persisted notifications preserves a seamless user experience. Users who navigate away still discover their results via the global navbar bell badge (`header-panel`) and direct deep links upon returning to PRMS.
- **Testing Bypassed Private Helpers:** Retaining `@deprecated` private methods (`sendTerminalMail`) in service classes avoids breaking class structure or creating dead-code lint warnings. Testing them directly via `(service as any).sendTerminalMail` verifies template compilation logic without re-enabling outbound calls in production flows.

---

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` §8 |
| Edit | Note that Bilateral AI job completion events deliver notifications strictly in-platform via `NotificationService.emitBilateralAiJobNotification()`, with Amazon SES terminal emails retired per client mandate. |
| Severity | Low |
| Status | pending |
