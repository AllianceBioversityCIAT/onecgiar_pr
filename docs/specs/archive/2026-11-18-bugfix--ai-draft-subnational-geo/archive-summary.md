# Archive Summary — `bugfix/ai-draft-subnational-geo`

**Outcome:** delivered. Promoting a Sub-national AI draft now saves scope 5, its countries and the resolved subnational areas. When no code resolves, it falls back to country level (4 or 3) instead of saving no scope. 2/2 tasks passed on the first attempt; validation passed with 2 accepted warnings.

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | INC-168504 |
| Type / Depth | Bug · Lite |
| Branch | `qa-development-2026-ss` (base `385d46e44`) |
| Commit | Not committed at archive time (root `AGENTS.md` §6: commit only on explicit user request) |

## 2. Original Spec Path

`docs/specs/bugfix/ai-draft-subnational-geo/`

## 3. Archive Date

2026-11-18 → `docs/specs/archive/2026-11-18-bugfix--ai-draft-subnational-geo/`

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | 2/2 `[x]`, 1 attempt each, 0 HALT / Pivot / waiver / skip |
| Tests | PASS — 14 targeted, 1806/1806 in the `bilateral` suites |
| Validation | PASS, 0 FAIL / 2 WARN |

## 5. Requirements Delivered

ADS-FR-1..FR-6, ADS-AC-1..AC-5, NFR performance (at most one extra CLARISA query) and NFR observability (one warn naming the result id and the dropped codes).

## 6. Files Changed Summary

| File | Change |
|---|---|
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` | +64 / −3 — private `resolveAiSubnationalAreas` + scope-5 branch in `populateResultFromExtractedMds` |
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` | +330 — describe `populateResultFromExtractedMds — Sub-national geo (INC-168504)`, cases a–m |

Shared handlers, DTOs and `bilateral-result-summaries.en.md` are unchanged. No migration.

## 7. Test Evidence Summary

Cases a–g came from the author's red→green run; h–m were added by `/akili-test`. A mutation check killed h, j and k. P-7 (AI codes match CLARISA codes byte for byte) was verified on the QA DB: CO and KH samples, with `KH-12` absent from CLARISA, which ADS-FR-3 covers. Full detail is in `test-report.md`.

## 8. Validation Summary

PASS. No FAIL. The production code was audited by a model other than its author; tests h–m were written and audited by the same session, which the report notes. Full detail is in `validation-report.md`.

## 9. Accepted Warnings Or Follow-Ups

| # | Item | Owner / next step |
|---|---|---|
| W-1 | LOC budget ~200 in `design.md` / `tasks.md` against ~397 actual (the tripwire fired after T1; the user accepted ~280; `/akili-test` added 111 lines) | Recorded in the Kaizen entry as a recurrence |
| W-2 | No DB-backed test. Manual check after deploy: promote `bilateral_ai_drafts.id = 1` (KH) and expect scope 5, a KH country row and KH-20 / KH-6 / KH-21 / KH-2 | User, on QA after deploy |
| F-1 | Case sensitivity of codes / `iso_alpha_2` (advisory) | Optional `/akili-quick` (`toUpperCase()`) |
| F-2 | `handleSubnationals` writes every area to every country. This is pre-existing, but now reachable from the AI path for multi-country drafts | Separate ticket (requirements §3) — worth prioritizing |
| F-3 | OQ-2: backfill of results promoted before the fix | Not in this spec; decision for the user / product |

## 10. Historical Notes

- The budget tripwire fired at T1 on test volume. The user chose to accept the overrun and continue (`execution.md`).
- The user pre-approved routine gates for an unattended run on 2026-11-17; exceptions still stopped the run.
- Another session left unrelated working-tree changes (portfolio-overview client files, `results-framework-reporting.*`, `result.repository.*`) throughout the run. None of them were touched.

## 11. Diagrams

There is one inline Mermaid flow in `design.md` §3. The spec has no `diagrams/` folder, and no baseline diagram slot is stale: the change is a private helper and shows up at no C4 level.
