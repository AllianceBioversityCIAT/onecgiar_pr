# Kaizen Entry — changes/rir-breeding-exclusion

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-breeding-exclusion` |
| Date | 2026-11-26 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 (6 code, 2 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 1 (RBX-T-1: the v2 Center copy missed the RCF migration's edit) | execution.md — RBX-T-1 Attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (P-1 — stakeholder answers to RBX-OQ-1/4; external, not planning waste) | execution.md — ## Pivot P-1 |
| PRODUCT_BUGs | 0 | test-report.md |
| Validation FAIL / WARN | 0 / 2 (design not amended for P-1; copy HITL) — both closed | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 | test-report.md / validation-report.md |
| Process deviation | 1 — Leader drafted RBX-T-6/T-7 code before writing the Pivot and getting approval; the user flagged it | execution.md — Pivot P-1, "Process deviation" |

## Lessons

- **KZ-changes--rir-breeding-exclusion-1 — The migration-timestamp premise was checked at specify time and went stale before the commit.** (Product + Methodology, Low)
  - Root cause: a parallel spec (`changes/innovation-use-2026-total-and-new-users`) landed `1793600000000-…` on the integration branches the same day; the pre-flight check ran only once, on 2026-11-25 at specify time.
  - Evidence: execution.md — "Pre-commit finding: migration timestamp shared with IU26". Adjudicated safe (TypeORM keys on name), so no rework, but only by luck of disjoint tables.
  - Standardization: → P1 (local), P2 (upstream)

- **KZ-changes--rir-breeding-exclusion-2 — When stakeholder answers changed a default mid-execution, the Leader drafted code before writing the Pivot.** (Methodology, Medium)
  - Root cause: the Leader persona says when a Pivot is required but not that the Pivot record and its approval come *before* any draft; new stakeholder input felt like "continue", not "stop".
  - Evidence: execution.md — Pivot P-1, "Process deviation (recorded, not hidden)"; the user's "espero que lo estés haciendo con akili".
  - Standardization: → P3 (local persona line), P4 (upstream)

## Noted, not a lesson

- RBX-T-1 attempt 1 FAIL: the frozen v2 copy was taken from the seed text, not from the latest migration in the chain (RCF). One occurrence; watch for recurrence on any "freeze template text" task.
- `replicated-innovation-reminders.module.spec.ts` fails to load (`@nestjs/jwt` prototype) before and after this spec — pre-existing test debt.
- `.agents/leader.md` `primary-instructions` OUTDATED (2.36.0) and tester `context-alignment` CUSTOM-EDITED per `akili doctor --agents` — run `akili doctor --agents --fix` on `staging`.
- Codegraph: `.codegraph/` exists — run `codegraph sync` after these changes land.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` |
| Edit | In the pre-flight checklist: "Migration timestamps: re-list `src/migrations/` on the integration branches (`staging`, `performance-refactor`) right before the commit, not only at specify time." |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | tasks.md template pre-flight: any premise about ordered identifiers (migration timestamps, sequence numbers) must be re-checked against the integration branch at commit time, because parallel specs move it. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (append-only) |
| Edit | "When new stakeholder input changes a recorded default mid-execution, write the `## Pivot Record` and get approval before any Implementer draft — no code first, even as a draft." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Leader persona: a stakeholder answer that changes a default is a Pivot trigger; the Pivot record and its approval precede any draft. |
| Severity | Medium |
| Status | pending |
