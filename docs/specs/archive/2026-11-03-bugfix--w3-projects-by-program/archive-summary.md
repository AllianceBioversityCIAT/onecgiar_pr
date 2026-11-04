# Archive Summary — W3/bilateral projects by program (`WPP`)

**Outcome:** shipped and verified on PRTest.
- The 2026 "Contributing W3/Bilateral projects" dropdown now lists the Program's ToC-linked projects plus every CLARISA-approved project of the reporting year (SP09: 0 → 177).
- The CGIAR Centers block shows an error with Retry when the catalogue fails to load.
- The "No CGIAR Centers related…" note waits until the ToC KPI question is answered "Yes".
- Code is on `qa-development-2026-ss` and `performance-refactor` (PRTest). It is not yet on `staging` or `master`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/w3-projects-by-program` · Lite · Bug Mode |
| Ticket | Jira **P2-4042** · `[167167-1]` (Marc Schut feedback batch 1, item 1) |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete** — WPP-T-1..T-3 `[x]` |
| Commits | `717e5aed7` (code + spec docs), `cf8a2998a` (PRTest checks of 2026-10-31). The 2026-11-03 close-out and this archive are staged, not committed |

## 2. Original Spec Path

`docs/specs/bugfix/w3-projects-by-program/`

## 3. Requirements Delivered

| Requirement | Task | Evidence |
|---|---|---|
| WPP-R-1 by-program = ToC ∪ CLARISA-approved (ToC first, dedupe), year from the reporting version | T-1, T-3 #1 #2 | Service spec red → green; PRTest SP09 177 = Portfolio Overview `mapped` 177; all 13 SPs ≥ `mapped` |
| WPP-NFR-1 / NFR-2 bound SQL, P2-3313 approval rule | T-1 | Repository spec (bound params, `allocation > 0`, `cp.phase = ?`) |
| WPP-NFR-3 long list usable | T-3 #3 | PRTest: type-ahead, Center pills, both combined |
| WPP-R-2 Centers error + Retry | T-2, T-3 #4 | Zoneless spec; PRTest with DevTools blocking: alert + Retry, unblock + Retry → 200, alert gone |
| WPP-R-3 note only after "Yes"; dropdown stays | T-2, T-3 #5 | Zoneless spec (falsifier proven); PRTest result 12333 |

## 4. Files Changed Summary

| Area | Files |
|---|---|
| Server | `clarisa-projects.repository.ts` (+ spec) — `findApprovedProjectsByProgramCode`; `results-framework-reporting.service.ts` (+ spec) — merge; `results-framework-reporting.controller.ts` — Swagger text |
| Client | `rd-contributors-and-partners.component.{ts,html}`, `rd-contributors-and-partners.zoneless.spec.ts`, folder `CLAUDE.md` |

14 files, +867 / −6 in `717e5aed7` (spec docs included).

## 5. Test Evidence Summary

| Run | Result |
|---|---|
| Server service + repository, `-t "P2-3001\|findApprovedProjectsByProgramCode"` | 10 passed; full service file 122/122 (order-independence) |
| Client `rd-contributors-and-partners.zoneless` | 28/28; falsifier: reverting `@else if` fails exactly S-3.1 |
| eslint on touched files | clean |
| PRTest (WPP-T-3, read-only) | #1–#5 PASS (2026-10-31 and 2026-11-03) |

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. The user accepted archiving without them on 2026-11-03 (same practice as the other Lite bug specs). Substitutes: Reviewer verdicts per task (3 rounds) and the five PRTest checks.

## 7. Accepted Warnings Or Follow-Ups

| Follow-up | Priority |
|---|---|
| Promote to `staging` → `master`, then re-check #1 in prod (task disqualifier: PRTest mappings may differ) | High |
| Advisory T-1: a CLARISA query failure is not caught; the endpoint errors instead of degrading to ToC-only | Medium |
| Retry renders as a full-width dark button below the alert; candidate Spartan quick (small secondary button inside the alert). Optional `[loading]` on Retry | Low |
| Advisory T-1: the version-lookup catch swallows DB errors without a log line | Low |
| Jira P2-4042: comment 44532 (2026-10-31) covers #1 #2 #5; add the #3 #4 close-out | Low |

## 8. Historical Notes

- The root cause (proposal §9): the 2026 list read only `toc_result_projects`; SP09 has no ToC-linked projects while CLARISA holds 177 approved ones, so a required field blocked submission.
- On 2026-10-31 the browser tool could not type into the picker, so #3 stayed partial; it was completed on 2026-11-03.
- #4 needed the exact request URL: `clarisa/centers/get/all` has no `/api` prefix on PRTest, and Chrome now calls the blocking panel "Request conditions".
