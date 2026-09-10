# Archive Summary — `changes/result-submitter-back-link`

Result Detail’s identity strip shows the primary Science Program as **Submitter** and links it to program home. **Back to results** still goes to the Results Center list.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/result-submitter-back-link/` |
| Archive date | 2026-09-02 |
| Final status | **Done** — `RSBL-T-1` and `RSBL-T-2` `[x]` PASS |
| Approval mode | gated (`proposal.md`); Standard |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Ticket | none |
| Judgment Day | 1 pass, Fix only — no re-judge (`judgment.md`) |

## Original Spec Path

`docs/specs/changes/result-submitter-back-link/`

## Archive Date

2026-09-02

## Final Status

**Shipped on `qa-development-2026`.** Both required tasks complete. `test-report.md` and `validation-report.md` absent — **accepted**: Standard execute evidence is in `execution.md` (scoped Jest **32 passed**); `/akili-test` and `/akili-validate` were never run. Owner archived with `commit and archive`.

## Requirements Delivered

| ID | Outcome |
|---|---|
| `RSBL-R-1` / AC-1 | Strip shows `{code} - {name}` from `currentResult` (fixture `SP04 - Multifunctional Landscapes`); no ⓘ |
| `RSBL-R-2` / AC-2 | Same-tab `routerLink` to `/result-framework-reporting/entity-details/{code}`; no query |
| `RSBL-R-3` / AC-3 | Missing / empty / whitespace-only official code → no Submitter; no `entity-details/undefined` |
| `RSBL-R-4` / AC-4 | **Back to results** still `/result/results-outlet/results-list` |
| `RSBL-R-5` / AC-5 | Derived from `currentResult` only — no referrer / return URL |
| `RSBL-R-6` / AC-6 | `aria-label="Submitter: {value}"`; Tab/focus ring HITL owner-closed |
| `RSBL-R-7` / AC-7 | Wrap at 900px / ~1100px HITL owner-closed |
| `RSBL-R-10` | Inline muted label + primary link; not legacy chips |

## Files Changed Summary

From `execution.md` (T-1, T-2):

| Area | Files |
|---|---|
| Production | `result-header.component.html`, `result-header.component.ts` — `officialCode` / `submitterValue` getters; strip item after funding, before status |
| Tests | `result-header.component.spec.ts` — T-1 red cases then green; absence / code-only / `SGP-02` |
| Spec visuals | `visual/current-header-no-submitter.jpg`, `visual/legacy-submitter-chip.jpg`, `visual/report-from-indicator.jpg` |

No server, no migration, no `LabReportFormComponent` edit.

## Test Evidence Summary

- Scoped Jest: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - T-1: 24 existing PASS; 3 new Submitter cases **FAIL** (no node)
  - T-2: **32/32 PASS**
- Full client Jest **not** run (repo rule).

## Validation Summary

No `validation-report.md`. No unresolved FAIL findings. Conformance evidence: two Reviewer **PASS** verdicts in `execution.md` (author ≠ auditor). HITL for R-7 / AC-7 closed by the owner’s archive instruction, not by an agent session.

## Accepted Warnings Or Follow-Ups

- Agent could not open Result Detail (`:4200` / login). Owner closed R-7 without a written two-width note.
- Option C (exact AOW restore) deferred.
- Center-as-submitter for W3/Bilateral deferred (`RSBL-OQ-2` locked to primary SP).
- i18n for “Submitter” deferred while the header hardcodes English.
- `test-report.md` / `validation-report.md` never authored — accepted at archive.
- `result-detail/CLAUDE.md` header row still says “tira de identidad” without Submitter — `guide-sync` pending (apply on `master`).

## Historical Notes

- Locked Option A: program home, keep **Back to results**, inline link (not Image 2 chips), primary SP.
- Fixture lock (Judgment C-1, Fix only): Jest/AC use **SP04 / Multifunctional Landscapes**. `SP09` is screenshot-only.
- Live surface is `app-result-header` after Result Detail navigation (`KZ-changes--kp-report-modal-auto-create-1`).
- Commits on this branch: `71f678a35` (red test), `63d749989` (strip).
- `proposal.md` is historical; `requirements.md` + `design.md` supersede it.
