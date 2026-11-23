# Archive Summary — 2026 result PDFs lose their type-specific section (PTS)

> **Outcome:** The DB function `resultFullDataByResultCode` now sends every P25-era reporting phase (phase year 2025 or later) to the P25 type-section builder, and assigns `char_lim` there. Reporting 2026 PDFs show their type block again (result 27926: Innovation Use → Actors). Reporting 2025 and older output is unchanged. Live on TEST (v36) and PROD (v8); the production PDFs of 27926 were checked on 2026-11-13.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/pdf-2026-type-section` (PTS), Lite, Bug Mode |
| Ticket | none (OQ-1) |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/bugfix/pdf-2026-type-section/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 3/3 tasks `[x]`.**

| Task | Result |
|---|---|
| PTS-T-1 premises and TEST baseline | PASS attempt 2 (attempt 1 FAIL: the Leader's record lacked the live-key query) |
| PTS-T-2 fix and apply on TEST | PASS; first TEST apply was a no-op save (old body), redone on attempt 2 |
| PTS-T-3 apply on PROD, confirm in the PDF | PASS attempt 2 (attempt 1 FAIL: a §5 test-plan row still had the old S1 rule) |

Budget: 3 tasks as planned. Review rounds: 4 plus a re-check against 3 planned; record lines 273 against about 180. The tripwire was stopped on and accepted by the user at the T-2 gate.

## 5. Requirements Delivered

| ID | Result |
|---|---|
| PTS-R-1 (2026 gets the P25 type keys) | PASS on TEST and PROD, 31/31 PROD rows. S1 was narrowed on 2026-11-12 by the user: the key set may differ from v6 only in ToC-block keys |
| PTS-R-2 (2025 and older unchanged) | PASS (MD5 "same output" hashes) |
| PTS-R-3 (`char_lim` assigned) | Done; observable after all (fresh connection starts at 1024) |
| PTS-R-4 (guards unchanged) | PASS (same 5 outputs as the baseline) |

## 6. Files Changed Summary

No repo code. Record copies in `sql/`: `resultFullDataByResultCode.before.sql` (TEST rollback), `before.prod.sql` (PROD rollback), `after.sql` (PROD script, definer `prmsadmin`), `after.body-only.sql` (DBeaver routine editor). Function change: 3 lines. Spec docs commit `8732bcb7f`. The `design.md` §11 Premise Ledger was synced at archive.

## 7. Test Evidence Summary

No `test-report.md`. Evidence is SQL results run by the user in DBeaver and recorded in `execution.md` (T-1 baseline hashes 20/20, T-2 TEST re-run, T-3 PROD 31/31). Falsifier samples of types 1, 2, 6 and 7 were red before and green after.

## 8. Validation Summary

No `validation-report.md`. HITL on PROD: the 2026 PDF of 27926 shows Innovation Use → Actors (Other, 513753) and no ToC block; the 2025 PDF shows Actors only plus its ToC block. Both are later than the 12 Nov files.

## 9. Accepted Warnings Or Follow-Ups

- [ ] **P-5 siblings (reported, not fixed, DD-6):** `resultFullDataByIPSRCode` lists years 2025, 2026, 2027, 2029, 2030 (2028 missing); `reportBasicInfoByResultCode` covers only 2022–2026.
- [ ] `{}` payloads, not caused by the fix: TEST v36 (9983, 10001, 10010, 10036, 10071, 10072) and PROD v8 (31195, 31205, 31206).
- [ ] 27926 has no 2026 ToC mapping (data the submitter enters); its 2026 bilateral project name reads `N-606015` against `N-606015-BIO-FORTIFICATION DEPLOYM` in 2025.
- [ ] OQ-1: no Jira ticket for this fix.
- [ ] Advisory: the `after*.sql` headers say "keeps the definer"; it should read "sets the connection user". The files are a record copy and are not edited after a PASS.

## 10. Historical Notes

- The proposal's PROD body paste was not in the repo; it was recovered from the specify transcript and copied to scratch.
- P-9 was refuted: the TEST body differs from PROD at the definer and at `= 34` vs `= 6`. Re-running the TEST file on PROD would have sent 2025 PDFs to the legacy builder, so T-3 captured `before.prod.sql`.
- Version ids differ by environment: Reporting 2025 / 2026 are 6 / 8 on PROD and 34 / 36 on TEST.
- The first TEST apply left the old body (DBeaver re-saved it). The routine editor's Source tab shows the whole function including `begin`/`end`, so the body-only file replaces only the text between the outer ones.

## 11. Diagrams

None.
