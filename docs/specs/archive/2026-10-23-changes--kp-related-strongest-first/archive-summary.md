# Archive Summary — KP related: strongest first (`KRS`)

> **Outcome:** all three INC-166020 gaps are closed and accepted on PRTest.
> - The strongest matches come first on each page.
> - An opt-in "Only related KPs" filter shows real counts (P-1486: 3849 → 468).
> - Labels show a numeric cue, "N of 3", with no percentage.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/kp-related-strongest-first/` |
| Archive path | `docs/specs/archive/2026-10-23-changes--kp-related-strongest-first/` |
| Archive date | 2026-10-23 |
| Branch | `qa-development-2026-ss` (spec branch; default branch is `master`) |
| Final status | **Done**: T-1..T-4 `[x]` |
| Source | INC-166020 (Nicoleta Trifa) |
| Depends on | `changes/kp-related-relevance-ranking` (KRR, archived 2026-10-22) |

## Requirements Delivered

| Req | Delivered by | Evidence |
|---|---|---|
| R-1 strongest first, per page, stable; earlier pages never move | T-2 | Jest literal vectors; PRTest step 2 (page 1 unmoved after load more) |
| R-2 related-only toggle, filter, linked excluded, filters kept, byte-identical off | T-1, T-3 | Literal + byte-identity tests; live probe on 3 hosts; PRTest steps 4, 6, 7 |
| R-3 request-wide gate, untrimmed block only, echo `relatedOnly` | T-1, T-3 | DD-4 fixture test; unavailable-state tests |
| R-4 "· N of 3", no `%`, tooltip kept | T-2 | Jest label tests; PRTest step 3 |
| R-5 ranked proxy note copy | T-3 | Exact-copy tests for the ranked and unranked paths |
| NFR-1..NFR-4 | T-1, T-3, T-4 | Call-count test; < 2000 encode test; additive fields; `aria-pressed` with keyboard on PRTest |

## Files Changed Summary

| Commit | Scope |
|---|---|
| fd483d517 | Server `cgspace-discovery/`: `project-relevance.ts` (filter mode), `repositories.config.ts` (gate and filter query), service (echo and cache key), 2 DTOs, 4 specs |
| 4863c1088 | Client `kp-cgspace-browse` `.ts`/`.html`/`.spec.ts`: tier sort, label suffix, toggle, note |
| 3c749e6e9 | Spec docs |

Total: about 710 LOC (prod about 200, tests about 510).

## Test Evidence Summary

| Check | Result |
|---|---|
| Server `--findRelatedTests` | 17 suites, 340/340 |
| Client `--findRelatedTests` | 58 suites, 2633/2633 |
| Lint (touched files), `tsc`, `build:dev` | clean / OK |
| Live probe (T-1), 3 hosts × 2 projects | Filtered < unfiltered on every row; linked ∩ filtered = ∅ |
| PRTest browser acceptance (T-4) | 7/7 checks pass on P-1486 and iSPARK |

No separate `test-report.md`. Tests ran inside each task's verification.

## Validation Summary

There is no `validation-report.md`. The user accepted archiving without `/akili-test` or `/akili-validate` ("si ya está completa y testeada archivemos", 2026-10-23). Every task has an independent Reviewer PASS, and T-4 is the live acceptance.

## Accepted Warnings Or Follow-Ups

| Item | Status |
|---|---|
| The "Not available for this search" tooltip sits on a non-focusable wrapper around the disabled toggle (NFR-4 spirit). Not exercised on PRTest | Follow-up candidate, outside scope |
| Readability advisories: T-1 JSDoc placement and duplicated weights; T-2 " · " separator in code, not copy | Recorded, not acted on |
| Accepted residual: a few "No direct match" cards on the filtered list (P-1486 1/22, iSPARK 3/30) | Design §10, by design |
| LOC about 40% over budget, all in tests | Escalated at the end of the run; no scope added |

## Historical Notes

- T-3 needed one rework. Attempt 1 added an "applied" line that design §8 never defined, and it over-promised given the stemming residual. Attempt 1 also checked the unranked note by substring instead of the full text.
- Live filtered totals differ from the T-1 probe because the probe approximated project inputs and PRTest uses real CLARISA data.
- The KRR archive was committed separately as 806b3739b.
