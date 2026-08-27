# Archive Summary: `changes/american-english-copy`

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/american-english-copy/` |
| Archive Date | 2026-08-27 |
| Final Status | **Done — all tasks PASS, committed** (`a32779ef2`) |
| Depth / Type | Lite · Change · gated |
| Owner | j.cadavid@cgiar.org |

## 2. Outcome

All rendered user-facing copy in `onecgiar-pr-client` respelled from British to American English (client-wide sweep, not programme-only). Confirmed replaced pairs: `programme(s) → program(s)` (incl. possessives), `licence → license` (display copy only), `centre → center`. Copy-only: zero identifier, route, file/folder, storage-key, or data-contract changes.

## 3. Requirements Delivered

| ID | Summary | Evidence |
|---|---|---|
| AEC-R-1 | American spelling in all rendered copy (full stem list) | AEC-T-2 audit: 0 unclassified hits; reported label now "…the program's 2026 ToC"; KP heading "License:" |
| AEC-R-2 | Copy-only; no structural/field/persisted-key change | Guard count 74 = 74 baseline; `pr.programmeResults.visibleColumns` and `s7_kp_licence` verbatim |
| AEC-R-3 | Pinned tests updated, suite green | 478/478 suites, 6,728 tests passed; lint clean |

## 4. Files Changed Summary

14 client files (see `execution.md` AEC-T-1 for the full list): dashboard-lab (reporting-program-band + spec, lab-report-form, program-overview), programme-results (component + html + spec, service + spec), bilateral (section-contributors, type-innovation-dev), shared fields-manager.service, KP review drawer kp-content, results-list-filters. Commit `a32779ef2` on `qa-development-2026`.

## 5. Test Evidence Summary

- Full client Jest: **478 suites / 6,728 tests green** (`npx jest --silent --reporters=summary --no-coverage`).
- Lint: all files pass (`npx ng lint --quiet`).
- Classified audit (AEC-AC-1): every remaining British hit falls in an allowlist category (comments, test block descriptions, identifiers, data-coupled contracts, proper nouns).
- Identifier/field guard (AEC-DD-2): pre/post grep count 74 = 74; contract strings verbatim.
- HITL diff review (AEC-AC-3): no new pipes/transforms on interpolated data.

## 6. Validation Summary

No standalone `validation-report.md` — Lite-depth spec; validation evidence embedded in `execution.md` (AEC-T-2 audit + guard + HITL, all PASS). Absence accepted at archive time.

## 7. Accepted Warnings / Follow-Ups

| Item | Disposition |
|---|---|
| DB-stored copy (section descriptions, notification templates) outside the repo | Accepted risk — separate data-fix spec if QA reports instances |
| British word outside the ~50-stem list | Recorded residual risk — follow-up spec if QA reports one |
| Rollout §6: PR to `qa-development-2026`, CI, staging spot-check | Standard release-flow follow-up (dashboard-lab heading, KP "License:" heading, export filter label) |

## 8. Historical Notes

- Spec was **generalized mid-propose** (2026-08-27): user widened intent from "programme → program" to all British spellings; slug `programme-to-program` retired in favor of `american-english-copy`.
- The per-hit (not per-file) classification was decisive: `licence` is both display copy and a CGSpace data contract in the same files — the sweep changed the label and preserved the field.
- Triad: Leader (Antigravity Orchestrator), Implementer Flash, Reviewer Pro; both tasks PASS on attempt 1.
