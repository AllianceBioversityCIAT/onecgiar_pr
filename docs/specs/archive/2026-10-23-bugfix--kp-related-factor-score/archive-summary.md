# Archive Summary — KP related: rank by factor count (`KFS`)

> **Outcome:** Related KPs are now ranked by tier at the source. On T-PJ-003161 (the reproduction), the first Strong moved from position 90 to position 1, and page 1 went from 0 Strong / 0 Partial to 4 / 8. Totals and text precedence are unchanged.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/kp-related-factor-score` (Lite, Bug Mode, gated) |
| Ticket | INC-166020 follow-up ("display the strongest matches first") |
| Archived by | `/akili-archive`, 2026-10-23, branch `qa-development-2026-ss` |

## 2. Original Spec Path

`docs/specs/bugfix/kp-related-factor-score/`

## 3. Archive Date

2026-10-23

## 4. Final Status

| Task | Result |
|---|---|
| KFS-T-1: server constant-score clauses, regression test, live probe | ✅ PASS, attempt 2. Two user-approved Pivots |
| KFS-T-2: PRTest acceptance, read-only | ✅ PASS, confirmed by the user |

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| KFS-R-1 | Solr score equals the factor count (`^=` per factor, keywords grouped). Boost and filter forms both |
| KFS-R-2 | Set, totals and text precedence unchanged: 24/24 probe rows had old == new totals. Linked, plain and browse queries are byte-identical |
| KFS-R-3 (Pivot) | `matchesCenter` uses whole-word phrase containment, the same semantics as the Solr phrase clause |
| NFR-1..3 | No new upstream calls. Encoded query is 473–793 chars, under 2000. No DTO or UI change; labels change only through R-3 |

## 6. Files Changed Summary

| Commit | Content |
|---|---|
| af5cdfc81 | `cgspace-discovery/`: `project-relevance.ts` and `repositories.config.ts` (prod ~43 LOC), plus 3 specs (~246 LOC) |
| 56929266f, 75428b3ae | Spec docs and execution log |

All three commits are on `qa-development-2026-ss` and `performance-refactor` (PRTest).

## 7. Test Evidence Summary

- **Red then green:** literal regression test (`repositories.config.spec.ts:945`) and the DD-5 center tests (`project-relevance.spec.ts:680`).
- **Jest:** scoped suites 326/326, `--findRelatedTests` 359/359. Lint clean.
- **Live probe:** real `clarisa_projects` inputs, 3 hosts × 3 projects × 2 forms, plus "potato". Table is in `execution.md`.
- **`test-report.md`:** not produced. Its absence was accepted (Lite bug spec): T-1 Jest plus the live probe and the T-2 acceptance are the test evidence.

## 8. Validation Summary

`validation-report.md` was not produced; its absence was accepted. The Reviewer passed T-1 twice, and on attempt 2 checked every rising pair in the probe. The user confirmed the T-2 PRTest check.

## 9. Accepted Warnings Or Follow-Ups

| Item | Status |
|---|---|
| Stemming residual: Solr stems subjects, the label folds plurals only, so the label sequence can rise on MEL, WorldFish and iSPARK | Accepted (requirements §6), same as KRR §8 / KRS §10 |
| The center factor has the same stemming residual ("…Agricultures") | Advisory; candidate one-liner for requirements-level docs |
| `boundPhrase` 60-char Center cap is not mirrored in the label | Edge case for names over 60 chars only |
| iSPARK toggle-on first card not independently confirmed on PRTest (the total was) | Low |
| CodeGraph re-index | Recommended |
| Kaizen pending items | See `docs/specs/kaizen/bugfix--kp-related-factor-score.md` |

## 10. Historical Notes

- **Pivot 1:** design §7 claimed "order and label agree by construction". A placeholder smoke disproved it, because Solr's center clause is a phrase match while the label required name equality. DD-5 aligned them.
- **Pivot 2:** the strict "non-increasing on every host" probe criterion collided with the stemming residual that KRR had already accepted. The user accepted the residual, and the criterion became strict on CGSpace for the reproduction plus per-pair attribution elsewhere.
- **Probe inputs:** real records, read-only from the PRMS DB through the server `.env`, with the user's go-ahead ("puedes probar en local").
