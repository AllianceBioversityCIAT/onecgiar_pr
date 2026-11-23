# Kaizen Entry — bugfix/p2-4129-innovation-use-level-threshold

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-4129-innovation-use-level-threshold` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (spec branch: integration pin is `staging`; no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| Budget | ~300 LOC vs ~200 expected (tripwire 320, not hit) | execution.md — ULT-T-1 running totals |
| PRODUCT_BUGs | 0 (`/akili-test` not run) | — |
| Validation FAIL / WARN | 0 / 4 (all accepted; W-3 closed by a user query → 0 affected results; W-4 post-deploy smoke pending) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects | 0 | validation-report.md |
| Spec corrections at validate | 4 documents (P-5 UNVERIFIED → verified) | validation-report.md §8 |

## Lessons

- **KZ-bugfix--p2-4129-innovation-use-level-threshold-1 — A one-query data-env premise that decides real-world impact was marked "non-blocking" and stayed unverified until validation, two specs running.** (Product + Methodology, Low)
  - **Root cause.** P-5 (the `clarisa_innovation_use_levels` id/level layout per environment) was handed to the user as "impact only, non-blocking" because the fix was needed either way. The same open item had already been carried through P2-3939 and archived as a WARN. P-5 was settled only at `/akili-validate`, from the user's `SELECT`, and it changed the impact story:
    - In prod, the explanation was already right: id = level + 1, so `id >= 6` ⇔ `level >= 5`.
    - The only prod-visible change is study links moving from level 5 to level 6, including immediate hiding on GET.
    - The design's reversion challenge had only examined the save side (W-3).
  - **Evidence:**
    - design.md §11 P-5 (before the validation correction), tasks.md pre-flight P-5
    - validation-report.md §2 "What P-5 tells us about real impact", §8 W-3
    - archived P2-3939 validation-report.md W-3
  - **Standardization:** → P1 (local), P2 (upstream)

## Noted, not a lesson

- **Spawn size overrun (recurs from P2-3939, T-1 140 calls).** The Implementer ran 71 tool calls (~183k tokens) without a checkpoint, above the persona's 60-call bound.
- **Mutation evidence not captured verbatim (W-1).** The Implementer piped output through `head`, and the final read-back for (a1)–(a3) was missing. The Reviewer's fixture trace stood in. A future brief could say "capture each mutation's jest summary line verbatim".
- **Implementer report vs diff.** The report claimed a new-row `<6` clause that was not in the diff; the Reviewer caught it. That is the triad working as designed; noted for recurrence.
- **Budget after the P2-3939 pricing lesson.** The budget priced tests as 4 pairs × 3 branches + 2 reads (~160 lines); the spec came to 238. That is still under the tripwire, so the KZ-bugfix--p2-3939-qa-catalog-level-numbers-1 pricing helped but ran about 50 % low on test lines per case. No new lesson yet.
- **Leader persona drift.** `akili doctor --agents` reports `leader.md` `primary-instructions` OUTDATED (2.36.0). Fix on `staging` with `akili doctor --agents --fix`.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md` |
| Edit | `- Catálogo `clarisa_innovation_use_levels` (leído 23-nov-2026): PRPROD ids 1–10 = niveles 0–9 (id = nivel + 1, sin repetidos); PRTEST además 13–20 = niveles 2–9. Un cambio que compare id vs nivel se comporta distinto en cada entorno.` |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-specify` Premise Ledger: a `data-env` premise that a single read-only user query can settle, and whose answer changes the impact or reversion analysis, is asked at the proposal/specify gate, not handed off as "non-blocking". "Needed either way" justifies the fix, not leaving the impact unmeasured. |
| Severity | Low |
| Status | pending |
