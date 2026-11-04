# Kaizen Entry — changes/portfolio-overview-feedback-round/funding-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/funding-filter` |
| Date | 2026-11-04 |
| Branch | qa-development-2026-ss (spec branch → items pending) |
| Archive Run | 1 |
| Mode | full |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks `[x]` | 3 / 3 | tasks.md |
| Reviewer FAIL (rework attempts) | 1 (T-3) | execution.md |
| HALT / FATAL_FAIL / Pivot | 0 / 0 / 0 | execution.md |
| Review rounds vs budget | 4 vs 3 | design.md §1 |
| Test / validation reports | none (absence accepted) | spec folder |

## Lessons

### PFF-L-1 — Trimming a folder guide to its line cap drops rules silently (Product, recurrence)

- **Root cause:** the guide-sync task asks for "≤ 120 lines" and "no rule lost", but nothing makes the author account for each removed sentence, so deleting a whole section reads as condensing.
- **Evidence:** `execution.md` → PFF-T-3 attempt 1 FAIL (deleted "Where it is used", lost the `entity-details/:code/results` navigation). Same cap caused rework in `bilateral/ai-drafts-bulk-discard` ABD-T-4 ("FAIL: 120-line cap → 116", archive-summary §4).
- **Standardization (pending):** see P1.

## Noted, not a lesson

- `npm run test:local` printed no Jest output for two agents; `npx jest --maxWorkers=2` used instead. Check `scripts/run-jest-local.js` if it repeats.
- Plain `npx eslint` needs `ESLINT_USE_FLAT_CONFIG=false` in the client (only `.eslintrc.json` exists).

## Pending Items

| ID | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| P1 | standardization | `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" | "When condensing a folder guide to fit its line cap, list every removed sentence in the report and name where its rule now lives (or why it is obsolete); deleting a section is not condensing." | medium (recurrence: ABD-T-4) | pending |
| P2 | digest-update | `docs/specs/kaizen-log.md` Active Lessons | Record PFF-L-1 as a recurrence of the guide line-cap rework seen in ABD-T-4; raise severity. | low | pending |
