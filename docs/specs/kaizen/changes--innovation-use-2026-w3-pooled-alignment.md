# Kaizen Entry — changes/innovation-use-2026-w3-pooled-alignment

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-2026-w3-pooled-alignment` |
| Date | 2026-11-26 |
| Branch | qa-development-2026-ss (Branch Context: spec; apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 0 (T-1 and T-2 PASS on attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | 0 | test-report.md |
| Judgment-day severe findings | 0 | design.md |
| Validation FAIL / WARN | 0 / 4 (3 closed by T-3; 1 outside the spec) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 (T-3 skip-eligible; manual HITL gate, no code) | execution.md |
| Escaped defects (§3) | 0 code defects. 1 design premise refuted at T-3 (P-7), no behavioural impact | execution.md IWA-T-3 |
| Drift attributable | none (no drift report covers this spec) | docs/specs/audits/ |

## Lessons

No new lesson. The only lesson-grade signal, P-7 being refuted, repeats an existing root cause and is recorded as a recurrence (P1).

## Noted, not a lesson

- **T-2 spec tension:** a Verification line required `git grep` → 0 hits while the same task required a `not.toContain` assertion that necessarily holds the phrases. Amended at the gate (scope `':!*.spec.ts' ':!*.md'`). First occurrence; it feeds the recurrence check for "negative-copy tasks: scope the grep to production code".
- **Tester harness friction:** the "type into a new row → tile updates" jest test hit `NG0100` in jsdom plus two failed `NgModel` lookups. The bounded loop (3 attempts) was exhausted and the scenario was routed to the manual check. On PRTest the console was clean, so this is not a product signal.
- **Live check limited by autosave:** the W3 centre editor autosaves on any row edit, so a "read-only" PRTest check cannot add rows on shared test results. Future W3 T-3s that need a populated row should name a disposable test result in `tasks.md`.
- **Worktree verification needs ignored env files:** `src/environments/*.ts` is gitignored, so a fresh worktree fails every suite that imports `environment` until the files are copied. Same root as follow-up F-2 (suites coupled to the local `environment.ts`).
- LOC budget overrun (+194/−38 vs ~180), accepted at the T-1 gate. It was mostly real-template specs.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--intermediate-outcome-aow-visibility--target-tooltip-1` |
| Edit | Add source spec `changes/innovation-use-2026-w3-pooled-alignment`. Recurrence: premise P-7 ("the W3 component also renders in result-detail") was "verified" by citing another spec's RISK note instead of grepping the selector's hosts (`app-type-innovation-use` is mounted only in `section-type-specific.component.html`). It was refuted on PRTest at IWA-T-3 (result-detail renders the pooled `innovation-use-form`). Impact Low here (layouts already agreed); keep severity High. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `.agents/leader.md`, `.agents/tester.md` |
| Edit | Run `akili doctor --agents --fix` on `staging`: `leader.md` → `primary-instructions` OUTDATED (matched 2.36.0; installed v2.44.0); `tester.md` → `context-alignment` CUSTOM-EDITED (review before fixing). Recorded in execution.md run notes; not editable from a spec branch. |
| Severity | Low |
| Status | pending |
