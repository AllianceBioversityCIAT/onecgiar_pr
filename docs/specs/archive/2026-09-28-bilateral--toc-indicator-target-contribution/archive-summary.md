# Archive Summary — ToC indicator, target and contribution on the bilateral contract

**Outcome:** delivered and merged into `performance-refactor` (`db1317995`). Every ToC mapping of the enriched bilateral result (webhook, `POST /create` response, `GET` detail) now carries `indicators[]` with the indicator's description, type, target and contribution. The push accepts an optional `toc_mapping.target_contribution`, stored in place of the constant `1`.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bilateral/toc-indicator-target-contribution/` |
| Archive Date | 2026-09-28 |
| Branch | `JuanGuzman-io/validate-push-contribution-indicator` (spec branch) |
| Final Status | **Done**. 3/3 tasks `[x]`, each Reviewer PASS on attempt 1 |
| Depth | Lite · Change |

## Requirements Delivered

| Req | Status | Proof |
|---|---|---|
| `BTC-R-1` `indicators[]` on each ToC mapping; `[]` when none; `null`s without target; no row multiplication | ✅ | Jest (6 cases, red on pre-change code) + TEST-DB run: old/new outer rows 2 = 2, mappings 2/2, `indicators` populated |
| `BTC-R-2` optional `target_contribution` stored (absent → `1`; invalid → 400; unattachable → dropped + warn) | ✅ | Jest (4 falsifier cases, each mutation observed red) |
| `BTC-R-3` change-log row in `bilateral-result-summaries.en.md` | ✅ | Per-key grep against the code + Reviewer |

## Files Changed

| Task | Commit | Files |
|---|---|---|
| `BTC-T-1` | `67bfd9736` | `src/api/results/result.repository.ts`, `result.repository.spec.ts` |
| `BTC-T-2` | `bf2c5002e` | `src/api/bilateral/dto/create-bilateral.dto.ts`, `bilateral.service.ts`, `bilateral.service.spec.ts` |
| `BTC-T-3` | `edc000538` | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |

No entity, migration, endpoint or client change.

## Test Evidence

- No `test-report.md` (`/akili-test` not run) — **absence accepted** by the user (re-ran `/akili-archive` after being told it was missing).
- Stand-in evidence in `execution.md`: per-task Jest red → green, Leader non-author re-runs (VERIFIED ×3), and the post-merge run on `performance-refactor`: 4 suites / 276 tests green + `tsc --noEmit` clean.

## Validation

- No `validation-report.md` (`/akili-validate` not run) — **absence accepted**, same as above. No FAIL/WARN findings to carry.

## Accepted Warnings / Follow-Ups

Recorded as advisory, not scheduled:

| Item | Where |
|---|---|
| DTO has no upper bound vs `decimal(12,2)`: a value ≥ 1e10 creates the result without a target row (error logged, no 400) — `@Max` would close it | `execution.md` → BTC-T-2 ADVISORY |
| T-2 branches without a test: title-only, `number_target: null`, `0` stored as `0` | `execution.md` → BTC-T-2 ADVISORY |
| Pre-existing duplicate `toc_mappings[]` entries on TEST (two identical mappings per initiative for the checked result) — not introduced by this spec; for the ticket comment | `execution.md` → BTC-T-1 manual check |
| `bilateral-result-summaries.en.md:95` does not list `indicators[]` (incomplete, not wrong) | `execution.md` → BTC-T-3 ADVISORY |
| Fetcher declares `target_contribution` as `integer`; widen to `number` only if STAR needs decimals | `design.md` → BTC-DD-3 |

## Historical Notes

- Requested by STAR; STAR was sent the push and webhook shapes on 2026-09-28 and asked to test.
- The ToC sub-select uses the `Integration_information.` prefix like the rest of the function, not `${env.DB_TOC}` (see `execution.md` → BTC-T-1 decisions).
