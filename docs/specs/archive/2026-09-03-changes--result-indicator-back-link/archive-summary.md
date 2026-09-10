# Archive Summary — Clickable Area of Work on Result Detail

Result Detail’s identity strip now shows the owning **Area of Work** and links it to By AOW. **Submitter** still opens program home. **Back to results** still opens the Results Center list.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/result-indicator-back-link/` |
| Archive date | 2026-09-03 |
| Final status | **Done** — `RIBL-T-1` and `RIBL-T-2` `[x]` PASS |
| Approval mode | gated (`proposal.md`); Standard |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Ticket | none |
| Judgment Day | none |

## Original Spec Path

`docs/specs/changes/result-indicator-back-link/`

## Archive Date

2026-09-03

## Final Status

**Shipped on `qa-development-2026`.** Both required tasks complete after Pivot P1. `test-report.md` and `validation-report.md` absent — **accepted**: Standard execute evidence is in `execution.md` (scoped Jest **61 passed**); `/akili-test` and `/akili-validate` were never run. Owner confirmed paint on result **8989** and closed R-7.

## Requirements Delivered

| ID | Outcome |
|---|---|
| `RIBL-R-1` / AC-1 | Strip shows `AOW01` (or `{code} - {name}`) without ⓘ. Live 8989 resolves via catalog `wp_short_name` |
| `RIBL-R-2` / AC-2 | Same-tab `routerLink` to `entity-details/{code}?tocView=byAow&tocAow={aow}` |
| `RIBL-R-3` / AC-3 | Missing official code / WP / catalog / unmapped / sentinel → no node; no `tocAow=undefined` |
| `RIBL-R-4` / AC-4 | Submitter stays program home without `tocAow`; Back to results unchanged |
| `RIBL-R-5` / AC-5 | Derived from Contributors GET + catalog, not referrer |
| `RIBL-R-6` / AC-6 | `aria-label="Area of Work: {value}"`; Tab after Submitter |
| `RIBL-R-7` / AC-7 | Wrap owner-closed; strip is `flex-wrap` under title / PDF / ⋮ |
| `RIBL-R-10` / AC-8 | `kpi=` only when exactly one indicator id |
| `RIBL-R-11` | Inline muted label + primary link, same as Submitter |

## Files Changed Summary

| Area | Files |
|---|---|
| Production | `result-header.component.html` — strip item after Submitter; `result-header.component.ts` — WP mapper + `GET_tocLevelsByconfig` fallback (P1) |
| Tests | `result-header.component.spec.ts` — T-1 red cases, T-2 green, multi-HLO, catalog cases |
| Spec | `design.md` §5 field order + catalog fallback; `execution.md` Pivot P1 |

No server, no migration, no `LabReportFormComponent` edit. Header does not call `getSectionInformation`.

## Test Evidence Summary

- Scoped Jest: `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - T-1: 32 existing PASS; 3 new AOW cases **FAIL** (no node)
  - T-2 attempt 2: **54/54 PASS**
  - T-2 attempt 3 (P1): **61/61 PASS**
- Full client Jest **not** run (repo rule).

## Validation Summary

No `validation-report.md`. T-2 attempt 1 Reviewer **FAIL** (clause coverage) remediated on attempt 2 (**PASS**). HITL on 8989 found missing AOW → Pivot P1 → owner confirmed paint. R-7 closed by owner, not by an agent two-width session.

## Accepted Warnings Or Follow-Ups

- Agent could not resize an authenticated Result Detail session. Owner closed R-7 after confirming 8989 paints.
- Filter restore and exact scroll without `kpi=` deferred.
- Center-contributor ToC ignored this slice.
- i18n for “Area of Work” deferred while the header hardcodes English.
- `test-report.md` / `validation-report.md` never authored — accepted at archive.
- `result-detail/CLAUDE.md` header row still omits Area of Work — `guide-sync` pending (apply on `master`).

## Historical Notes

- Locked Option A: second strip item; Submitter stays program home; `kpi` optional; no return URL on create.
- Fixture lock: Jest/AC use **SP04** + **AOW01**. `SP09` is screenshot-only.
- Live V2 GET row is `{ toc_result_id, toc_level_id, indicators[] }` — no `work_package_code`. AOW code is catalog `wp_short_name` (`GET_tocLevelsByconfig`), the same source Contributors uses to paint HLO **AOW01**.
- Live surface is `app-result-header` (`KZ-changes--kp-report-modal-auto-create-1`).
- Commits: `54f271e5f` (red test), `002d9de5c` (strip), `8ae3928b2` (pivot note), `9dfcb8775` (catalog).
- `proposal.md` is historical; `requirements.md` + `design.md` supersede it.
