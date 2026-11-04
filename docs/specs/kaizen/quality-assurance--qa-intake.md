# Kaizen Entry — quality-assurance/qa-intake

## Document Control

| Field | Value |
|---|---|
| Spec Path | `quality-assurance/qa-intake` |
| Date | 2026-11-04 |
| Branch | `JuanGuzman-io/p2-4040-qa-intake` (spec branch; apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 (7 planned + T-4b added by pivot) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-1: migration `timestamp(6) DEFAULT CURRENT_TIMESTAMP`) | execution.md — QIN-T-1, attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 2 (T-5: client swallowed the 409 message · T-4b: CLARISA did not refuse keys on unlisted routes) | execution.md — ## Pivot Record: QIN-T-5, ## Pivot Record — QIN-T-4b |
| Budget tripwires | 1 (LOC about 1.6× at T-3; about 1.9× at close; owner accepted) | execution.md — ## Budget tripwire: QIN-T-3 |
| PRODUCT_BUGs | n/a (no test-report.md; owner accepted) | — |
| Validation FAIL / WARN | n/a (T-7 live HITL instead: 9 of 9 PASS) | execution.md — QIN-T-7 |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 | execution.md — QIN-T-7 |
| Drift attributable | none (no drift report in `docs/specs/audits/`) | — |

## Lessons

- **KZ-quality-assurance--qa-intake-1 — An authorization premise that depends on an external service was verified by reading our own code, never by calling the service with a key that should be refused.** (Product + Methodology, High)
  - **Root cause:**
    - Design P-2 settled "the CLARISA guard identifies the caller" by code location only (`clarisa-api-key.guard.ts:51`).
    - The ticket assumed "one new permission per route". Nothing in design or T-4 probed whether CLARISA actually refuses a valid key on a route outside its grant.
    - It did not. Every valid key, the bilateral one included, passed the guard on the QA write routes.
    - T-4 closed on a Reviewer PASS with that hole open. It surfaced only at the rollout probe.
  - **Evidence:** execution.md — `## Pivot Record — QIN-T-4b added`, the "Trigger" bullet (`valid: true` for `/zzz/nada` and `/api/bilateral/result/create`); design.md §11 P-2.
  - **Standardization:** → P1 (local) + P2 (upstream).

- **KZ-quality-assurance--qa-intake-2 — A new table's `created_date` combined `@CreateDateColumn` with an explicit `CURRENT_TIMESTAMP` default, producing DDL that MySQL rejects; no verification step executes migration DDL.** (Product, Medium)
  - **Root cause:**
    - `@CreateDateColumn` defaults to precision 6. The explicit `default: () => 'CURRENT_TIMESTAMP'` drops the `(6)` from the default but keeps it on the type, which gives `ER_INVALID_DEFAULT`.
    - `tsc`, Jest and `migration:check` (which only counts pending migrations) cannot see it. Only the Reviewer's SQL reading caught it.
  - **Evidence:** execution.md — QIN-T-1, attempt 1, Reviewer FAIL (verbatim, `result-qa-intake-log.entity.ts:49-54`).
  - **Standardization:** → P3.

## Noted, not a lesson

- **T-5 pivot:** the premise "the server's 409 message reaches the user" was false, because both unsubmit modals discard `err`. The design had marked it UNVERIFIED-High (P-13), and the Implementer's hard rule stopped at step 1 before any code was written. The mechanism worked, so this is not a lesson. It is close to `KZ-bilateral--resubmit-followups-1` (consumer-visible effects not traced); watch for recurrence.
- **Budget:** LOC came in at about 1.9×. The overrun was driven by disqualifiers that forbid stubbing `classify`. That forced two in-memory SQL fixture runners, and T-3 duplicated T-2's. Below the lesson bar; feeds the recurrence check for estimate calibration on lock/transaction tasks.
- **CLARISA validate always hits prod,** in every PRMS environment. A CLARISA change cannot be tested from Reporting test until CLARISA prod has it. This cost one probe cycle (false "not working" read). It is captured in agent memory, not as a lesson.
- **Migration `down` never executed.** The apply/revert check was deferred to the pipeline by the owner. The pipeline applied `up` (confirmed in T-7); `down` stays text-verified only.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (premises / verification table guidance) |
| Edit | Add: "A premise that an external service (CLARISA, Cognito, a partner API) enforces an authorization or contract rule must be settled by a live negative probe — a call that the rule should refuse, with its response quoted — never by reading our own calling code." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-specify` premise table: a premise of kind "external enforcement" (authz, rate limit, validation done by another system) is only `Verified` with a quoted negative probe against that system; a code-location citation alone leaves it `UNVERIFIED — High`. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/CLAUDE.md` §5 (Migration scripts) |
| Edit | Add: "New tables: write `created_date` as `@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })` (as in `result-ip-step-three-evidence.entity.ts`). `@CreateDateColumn` with an explicit `CURRENT_TIMESTAMP` default generates `timestamp(6) DEFAULT CURRENT_TIMESTAMP`, which MySQL rejects (`ER_INVALID_DEFAULT`); `migration:check` cannot catch it." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/trd/trd.md` §7 (APIs) |
| Edit | Add a row for the QA write surface: `POST /api/qa/results/intake` and `/release`, CLARISA key guard with the per-endpoint grant (`endpoint_allowed`), excluded from the JWT middleware. Write boundary: `result.in_qa`, `result.status_id` 3→2 for `qaed` only, and `result_qa_intake_log`. Unsubmit guard: 409 while In QA in an open phase. (Carried from execution.md `## Pending shared-file items`.) |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-server/CLAUDE.md` §2 (Module map) and `onecgiar-pr-server/src/CLAUDE.md` module table |
| Edit | Add the row: `` `api/qa-catalog/` `` · `` `/api/qa/*` `` · "QA Platform surface (CLARISA key + per-endpoint grant, JWT-excluded): field catalog, results feed and details, intake/release of results into QA (writes `in_qa`, `status_id` 3→2, `result_qa_intake_log`)." |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/CLAUDE.md` §3 "Exclusions (per `app.module.ts`)" and `onecgiar-pr-server/src/CLAUDE.md:83` |
| Edit | Stale: the exclusion list names only `/api/platform-report/*` and `/api/bilateral/*`. Replacement: add `/api/qa/*` (catalog, results, results/details, results/intake, results/release, per `app.module.ts:154-158`), guarded by the CLARISA API key instead of the JWT. |
| Severity | Low |
| Status | pending |
