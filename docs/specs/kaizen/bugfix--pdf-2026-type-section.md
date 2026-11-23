# Kaizen Entry — bugfix/pdf-2026-type-section

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/pdf-2026-type-section` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-1 attempt 1, T-3 attempt 1; both in Leader-written text) | execution.md — PTS-T-1, PTS-T-3 Review |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (PROD 31 rows: 30 PASS + 1 spec-clause FAIL resolved by amending S1) | execution.md — PTS-T-3 step 4 |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 | execution.md |
| Budget tripwires | 1 (review rounds 4 plus a re-check vs 3; record lines 273 vs about 180), accepted by the user | execution.md — Gate after PTS-T-2 |
| Failed DB apply | 1 (first TEST apply kept the old body) | execution.md — PTS-T-2 |

## Lessons

- **KZ-bugfix--pdf-2026-type-section-1 — A DB-function spec did not carry the DBeaver routine-editor apply rule, and the first TEST apply silently kept the old body.** (Product, Low)
  - Root cause: the routine editor's Source tab shows the whole function (header, `begin`, body, `end`), while the spec shipped a body-only file with no instruction on where it goes. The first save re-stored the old body with a schema-qualified header. The 20/20 hash and body checks caught it only because (b) compared the live body to `before.sql`. A second spec (`changes/remove-innovation-team-diversity`, "Noted") hit a related DBeaver paste problem.
  - Evidence: execution.md — PTS-T-2, TEST apply attempt 1 evidence (b) and the "Disqualifier applied" lines; "Note for T-3 / kaizen" (Source tab includes `begin`/`end`); kaizen/changes--remove-innovation-team-diversity.md, "Noted, not a lesson".
  - Standardization: → P1

## Noted, not a lesson

- Both Reviewer FAILs were in text the Leader wrote: T-1 (a spec edit pointed to a query that `execution.md` did not contain) and T-3 (after S1 was narrowed, one §5 row still stated the old rule). The correction-closure sweep exists; it missed the §5 table. First occurrence of the table-row miss. Related to `KZ-bugfix--inc-168459-portfolio-overview-data-1` (Leader text asserting an unchecked fact): watch for a third.
- The Leader proposed measuring `@@global.group_concat_max_len` (1024 on TEST) and found PTS-R-3 observable although the spec said it was not. A claim of "not observable" was settled by a probe, not assumed. Routine.
- The `after*.sql` headers say "keeps the definer" (it sets the connection user). Advisory, files are a record copy.
- A hand-run DB apply returned only a screenshot; the route used (body-only editor vs full script) was not stated (execution.md PTS-T-3 step 3). Checks (b)-(e) made it irrelevant.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (DB-function / hand-applied SQL tasks) |
| Edit | `- DBeaver apply of a function: the routine editor's Source tab shows header + begin + body + end. Name the exact lines the body-only file replaces, and gate the task on comparing the live body to the expected one (SHOW CREATE FUNCTION) before any other check (KZ-bugfix--pdf-2026-type-section-1).` |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — |
| Edit | None: no repo code, no new module, no guide changed or falsified. |
| Severity | Low |
| Status | applied (2026-11-23, nothing to write) |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/src/api/results/results.controller.ts:636` (not a guide) |
| Edit | The spec found a stale API description string that mentions `resultFullData` (design.md P-6 citation). Not edited here (outside the spec). Candidate for a later cleanup. No guide claim was falsified. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` (platform-report PDF data, DB functions) |
| Edit | Record DD-1: `resultFullDataByResultCode` routes by `version.phase_year >= 2025` (read by PK; NULL goes to legacy) instead of a hard-coded version id, matching the export's P25 rule 2025–2030. Siblings with their own year lists are known and unfixed: `resultFullDataByIPSRCode` (no 2028), `reportBasicInfoByResultCode` (2022–2026). No ADR number (allocated at apply time). |
| Severity | Low |
| Status | pending |
