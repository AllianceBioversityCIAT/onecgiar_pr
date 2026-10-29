# Archive Summary — Portfolio Overview: CGIAR Centers block, W3 only, New vs Replicated

**Outcome:** delivered. The CGIAR Centers block counts W3/Bilateral rows only (712 on P25, was 1284), the W3/Bilateral card splits into New 548 + Replicated 164, and New / Replicated filter the donut and tiles together with the status filter. Committed `a91e9ad39` on `qa-development-2026-ss`.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/portfolio-overview-revamp/centers-new-vs-replicated/` |
| Parent | `changes/portfolio-overview-revamp` (family #3) |
| Archive Date | 2026-10-15 |
| Final Status | **Done** — 4 / 4 tasks `[x]` |
| Branch | `qa-development-2026-ss` (spec branch; default is `master`) |
| Kaizen entry | `docs/specs/kaizen/changes--portfolio-overview-revamp--centers-new-vs-replicated.md` |

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| CNR-1 W3 only | T-1 `isW3Row`, T-2 load-time filter | Mixed-fixture spec; browser 712 |
| CNR-2 New / Replicated, reconciles | T-1, T-2, T-3 | Encoding matrix + invariant; browser 548 + 164 = 712 |
| CNR-3 origin filters donut + tiles | T-2, T-3 | Spec 2; browser Replicated → 164 / 158 / 0 / 2 / 0, card unchanged |
| CNR-4 filters compose | T-2, T-3 | Spec 3; browser "New · Pending review" |
| CNR-5 accessible | T-3 | `<button aria-pressed>`; browser Tab / Enter / Space, ring visible |
| CNR-6 honest copy | T-3 | Grep 0; new subtitle in the served bundle |
| CNR-7 link | T-2, T-3 | `funding=bilateral&status=5` under All; hidden under an origin |
| CNR-N1..N5 | T-2, T-3 | No `/api/` request on filter clicks; late-load + retry specs; skeletons; tokens; `PO/CLAUDE.md` re-stamped |

## Files Changed

| File | Change |
|---|---|
| `centers-block.aggregate.ts` (+ spec) | Classifiers `isW3Row`, `isReplicatedRow`, `byOrigin`, `originCounts`; header comment |
| `centers-block.component.ts` (+ spec) | `w3Rows`, `origin`, `viewRows`, `toggleOrigin`, `clearFilters`, `activeFilterLabel`, `showResultsCenterLink`; `kpis()` adds New / Replicated |
| `centers-block.component.html` | Separator + origin buttons; strip and link rules |
| `internationalization/portfolio-centers-block.copy.ts` | Subtitle; `originNew`, `originReplicated`, `filterSeparator` |
| `portfolio-overview/CLAUDE.md` | W3-only note, origin filter, DD-4; 120 lines |

Total: 9 files, +585 / −96 (incl. spec docs). Code + specs ≈ 495 changed vs a 240 estimate — the 320 tripwire was raised before T-3 and the user lifted it.

## Test Evidence

| Check | Result |
|---|---|
| Jest `centers-block` (`--maxWorkers=2`) | 53 / 53 green (3 suites); every new spec red first |
| `npm run build:dev` | OK |
| Lint | T-1 / T-2 `ng lint --lint-file-patterns` clean; T-3 recipe rejected → ESLint substitute on TS files, clean |
| Browser (T-H, local) | Pass at 1280 + 375 / 768 (iframes); evidence in `execution.md` |

## Validation Summary

No `test-report.md` / `validation-report.md`: the spec ran Leader → Implementer → Reviewer per task plus the T-H browser check, and the user approved archiving with that evidence (2026-10-15). 3 Reviewer PASSes on attempt 1; 0 FAIL, 0 HALT, 0 pivot.

## Accepted Warnings / Follow-ups

- [x] PRTest smoke after the commit reaches `performance-refactor` (reference 712 = 548 + 164). Done 2026-10-16, read-only: card 725 = New 561 + Replicated 164 (New grew, invariant holds), 15 / 16 Centers, 6.1 % approved; Replicated filter → donut 164 (Editing 158, Approved 2).
- [ ] Optional: skeleton on the card total while loading (shows "0 results · 0 % approved").
- [ ] Optional readability items from the T-2 / T-3 Reviewers (`execution.md` ADVISORY blocks).
- [ ] Shell topbar still overflows at 375 px (outside this spec).
- [ ] `codegraph sync`.
- [ ] OQ-1: a replicated filter in Results Center (separate request).

## Historical Notes

- The block now intentionally differs from the Center Overview page (which mixes W1/W2 + W3): CNR-DD-1.
- CNR-P-6 (assumed at specify time) was confirmed by CNR-T-2 Step 0 against #7's committed code.
