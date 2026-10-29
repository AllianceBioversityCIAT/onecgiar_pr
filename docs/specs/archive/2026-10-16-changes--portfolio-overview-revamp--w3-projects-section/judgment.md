# Judgment Day — w3-projects-section `design.md`

| Field | Value |
|---|---|
| Target | `design.md` (draft, Phase 2), against `requirements.md` + `proposal.md` |
| Date | 2026-10-16 |
| Judges | 2 blind, read-only (`akili-reviewer`, Sonnet; author was Opus) |
| Round | 1 |
| Verdicts | Judge A: PASS · Judge B: PASS |
| Severe (CRITICAL) confirmed by both | **0** |
| Status | **APPROVED** — user chose "Fix only" (no re-judgment). JD-1..JD-8 fixed in `design.md`; JD-9..JD-16 absorbed as premises / notes; JD-17 at the Phase 3 gate |

## Corroborated by both judges (WARNING / SUGGESTION, info per contract)

| Ledger | Judge IDs | Severity | Finding | Resolution |
|---|---|---|---|---|
| JD-1 | A-1, B-2, B-14 | WARNING | Version resolution under-specified. Reusing `$_findPhase` accepts an IPSR id; `$_findActivePhase` 404s a closed phase. The repository receives the raw optional `versionId` (undefined on the open path) instead of the resolved, coerced id | fixed in design.md |
| JD-2 | A-2, B-3 | WARNING | DI wiring: `ClarisaProjectsRepository` is not provided or imported in `ResultsFrameworkReportingModule`; no `ClarisaCenter` repository is injected. WPS-P-2 overstates | fixed in design.md |
| JD-3 | A-3, B-1 | WARNING | §10 bind order does not match the §5 SQL. Raw `query()` uses positional `?`, not `:name`; the sources are binds too | fixed in design.md |
| JD-4 | A-4, B-13a | WARNING / SUGG | The alias map has **10** entries, not 11 (`requirements.md` A-3) | fixed in design.md |
| JD-5 | A-5, B-12 | SUGGESTION | Center label source unpinned: institution acronym vs the client catalogue acronym; alias-only code label | fixed in design.md |
| JD-6 | A-6, B-7 | SUGGESTION | `TRIM(status) IN (…)` is case-insensitive under the collation; the in-memory rule is case-sensitive | fixed in design.md |
| JD-7 | A-8, B-9 | SUGGESTION | Three adjacent violets are hard to tell apart as series | fixed in design.md |
| JD-8 | A-9, B-13c | SUGGESTION | Divergence from the proposal (client service file, depth Standard → Full) is not recorded in DD-1 | fixed in design.md |

## Single-judge (suspect, info)

| Ledger | Judge ID | Finding |
|---|---|---|
| JD-9 | B-4 | `isActive` is tinyint and may hydrate as `0`, so the Center Overview's `!== false` may count inactive projects. P-4 should be "assumed"; check at T-6 |
| JD-10 | B-5 | A page skeleton slot inside `isLoading()` sits above Centers, while the block mounts below → layout jump |
| JD-11 | B-6 | `status_id` is nullable; `<> 4` drops NULL |
| JD-12 | B-8 | The resolver applies the alias even when the org is set but unmatched; `getProjectsByCenter` applies it only on a NULL org |
| JD-13 | B-10 | The `results_by_projects(project_id)` index is not verified |
| JD-14 | B-11 | "~15" vs "≈ 16" Centers; there are at least 17 codes |
| JD-15 | B-15 | Footnote singular/plural |
| JD-16 | A-7 | Closed phase with zero rows → the server 404 shows as an error, not the empty state; the mount guard is not stated |
| JD-17 | A-10 | `family.md` has no #8 "specified" row yet |

## Contradictions between judges

None.
