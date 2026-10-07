# Kaizen Entry — bilateral/resubmit-rejected-result

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-rejected-result` |
| Date | 2026-10-06 |
| Branch | qa-development-2026-ss (a spec branch: `Default Branch: master`, `Integration Branch: staging`) |
| Archive Run | 1 |
| Approval Mode | gated |
| Archive | `docs/specs/archive/2026-10-06-bilateral--resubmit-rejected-result/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 of 7 | tasks.md |
| Reviewer FAIL rework attempts | 2. T-4 ×1: duplicate subnationals, because the writers ran in parallel after the reset. T-5 ×1: lead investment lost under DD-5 | execution.md RSB-T-4, RSB-T-5 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots and spec amendments | 2. `## Pivot Record: RSB-T-3`: the DD-7 stored-lead fallback conflicted with the T-4 reset, which produced `RSB-R-23`. DD-5 amended at T-5: an inactive role-1 row carries the investment, decided by Juan David Delgado | execution.md |
| PRODUCT_BUGs | 0 (`/akili-test` not run) | — |
| Review rounds | T-4 and T-5 used 2 each (as budgeted); the other tasks used 1 each | execution.md |
| Validation FAIL / WARN | no `validation-report.md` (accepted by the user); T-7 live run PASS | execution.md RSB-T-7 |
| Runtime interruptions | 1. The T-3 Implementer hit HTTP 429 and was resumed with its context | execution.md RSB-T-3 |
| Pre-existing defects surfaced | 3: password hashes in the bilateral GET; readers showing inactive role-1 rows; primary-request card copy | design.md §13 |

## Lessons

- **KZ-bilateral--resubmit-rejected-result-1 — A design decision that suppresses or deactivates a row did not inventory the tables keyed on that row.** (Product + Methodology, Medium)
  - **Root cause:** DD-5 suppressed the requested SP's role-1 `results_by_inititiative` row until acceptance. The Premise Ledger never listed what hangs off that row. `result_initiative_budget.result_initiative_id` does, so the lead-program investment was silently dropped on the changed-owner branch. A Reviewer found this at T-5, and it needed a user decision plus a rework round.
  - **Evidence:** execution.md RSB-T-5 attempt 1 (Reviewer A FAIL #1); design.md §3 (no premise on dependent tables); design.md DD-5 "Amended 2026-10-06".
  - **Standardization:** → P1.
- **KZ-bilateral--resubmit-rejected-result-2 — A preflight check validated state that a later step of the same pipeline rewrites.** (Product + Methodology, Medium)
  - **Root cause:** DD-7 checked allocation against the *stored* lead project. Separately, the T-4 reset deactivated `results_by_projects`, and `ppr.request()` re-read the lead after the writers. Each decision was sound in isolation. Nobody asked "does what the preflight reads still exist after the reset?" The answer was no, which produced a refusal after writes (an R-8 violation) and a pivot.
  - **Evidence:** execution.md `## Pivot Record: RSB-T-3`; RSB-T-3 Reviewer A ADVISORY (RISK).
  - **Standardization:** → P2.
- **KZ-bilateral--resubmit-rejected-result-3 — A manual rollout task for an external API had no runbook: base URL, auth header and where its credential comes from, platform ownership, and a ready payload.** (Product, Low)
  - **Root cause:** RSB-T-7 said "create through the API → reject → resubmit" but gave no operational detail. The live run therefore spent many turns on discovery:
    - where the `x-api-key` comes from (CLARISA, per platform);
    - which platform owns which result (403);
    - that the GET read shape is not the `create` shape;
    - the `scope_code` enum (400);
    - a test result of the right type for the amount check.
  - **Evidence:** execution.md RSB-T-7 "Live probes on PRTest" and "Re-plan".
  - **Standardization:** → P3.

## Noted, not a lesson

- **Concurrent AKILI session in the same checkout** (`notifications/bell-read-state`). This is a recurrence of `KZ-MRF-3`. Explicit pathspecs and forbidden-file lists in every brief held: no foreign file was committed. See P4.
- **Leader brief error.** The first T-1 Reviewer brief carried an unfilled `<<DIFF>>` placeholder. It was corrected by message before the review ran. This is one occurrence; if it recurs, check briefs for unfilled placeholders before sending.
- **Concurrent Jest runs.** The T-5 attempt-1 Implementer ran two Jest commands at the same time, against the machine rule. The brief for attempt 2 restated the rule and it held.
- **Parallel writers become order-sensitive once the rows they race on are deactivated first.** `handleSubnationals` used `Promise.all` and was only safe while rows stayed active (T-4 FAIL). A single case; it is close to lesson 2's class.
- **Model honesty in the in-memory DB.** Rollback, save-as-update and `matches()` all over-promise compared with MySQL (T-4 and T-5 advisories). Worth hardening before the helper is reused elsewhere.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Premise Ledger guidance) |
| Edit | Add: "When a decision suppresses, deactivates or defers a row, add one premise per table that references that row (FK fan-out) and state what happens to its data." |
| Severity | Medium |
| Status | pending |
| Upstream | Methodology: recommend the same line for the AKILI design template |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Reversion challenge / design decisions) |
| Edit | Add: "For every preflight or validation check, name the rows it reads and confirm no later step in the same flow deactivates or rewrites them; if one does, validate against the payload, not the stored state." |
| Severity | Medium |
| Status | pending |
| Upstream | Methodology: recommend the same line for the AKILI design template |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (rollout / manual task fields) |
| Edit | Add: "Manual tasks against an external API list the base URL, the auth header and where its credential is issued, which caller owns the test data, and a ready-to-send payload." |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-MRF-3` |
| Edit | Add `bilateral/resubmit-rejected-result` as a source. Recurrence: a concurrent AKILI session in one checkout, contained by explicit pathspecs and per-brief forbidden-file lists. Keep the severity. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §4 "Transactions" |
| Edit | Replace "the create call is wrapped in a single ACID transaction. Sub-entity helpers (…) accept an injected `EntityManager`." with "the create call is **not** transactional: its manager is unused and each writer autocommits (design `RSB-P-1`). Only the resubmission's final step (`commitResubmission`: primary request + status CAS + RESUBMIT history) runs in one real transaction." |
| Severity | Medium |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` §2 folder map + §4 handlers |
| Edit | Under `services/`, add `bilateral-resubmission.service.ts — resubmission of a Rejected result through create (lock, preflight, reset, writers, final transaction)`. In the handler interface list, add `resolveAndValidate?(context)` — "pure validation extracted from `afterCreate`; the resubmission preflight calls it before any write." |
| Severity | Low |
| Status | pending |
