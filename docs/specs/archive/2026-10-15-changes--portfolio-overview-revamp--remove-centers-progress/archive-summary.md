# Archive Summary — CGIAR Centers block: remove "Progress by Center" (`RCP`)

**Outcome:** delivered. The CGIAR Centers block on `/portfolio-overview` no longer shows the "Progress by Center" card (table, chart, search, sort). Its error recovery moved into the Reporting status card: a partial note in a `role="status"` region, and one "Retry failed Centers" button that re-requests only the failed Centers. When the catalogue is empty, the card says "Nothing to show.". The KPIs, donut and tiles show the same figures as before. Both tasks passed on their first attempt.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-overview-revamp/remove-centers-progress` |
| Parent family | `changes/portfolio-overview-revamp` (child #7) |
| Branch | `qa-development-2026-ss` |
| Implementation commit | `92bd0aa5b` |
| Archived by | `/akili-archive` (Claude Code) |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-revamp/remove-centers-progress/`

## 3. Archive Date

2026-10-15

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 2 / 2 `[x]` (RCP-T-1 code + specs, RCP-T-2 doc + browser check) |
| Reviewer verdicts | RCP-T-1 PASS on attempt 1. RCP-T-2 doc was skip-eligible; its visual part is HITL evidence |
| HALT / Pivot / FATAL_FAIL | None |
| Budget | 2 tasks, 1 review round, about +149 / −413 LOC (estimate: about +60 / −260). Within the tripwire |
| `test-report.md` | **Absent, accepted.** Scoped Jest red→green and build:dev, per task |
| `validation-report.md` | **Absent, accepted.** The user asked to archive directly after the browser check (2026-10-15) |

## 5. Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| RCP-1: card removed | T-1, T-2 | New absence spec. In the browser, at 1280 and 768: block order header → KPIs → status, no "Progress by Center" |
| RCP-2: figures unchanged | T-1 | The "KPI cards show…" spec passes unchanged; aggregate, `centerTotals`, `segments` and `kpis` are untouched |
| RCP-3: tile filter without a table | T-1, T-2 | Rewritten tile spec. In the browser, the Editing tile is pressed and the link has `?status=1`; a second click clears it |
| RCP-4: failed Centers recoverable | T-1 | Specs: note and button on failure, only the failed Center retried, one request for two clicks, both gone after recovery, absent when all Centers are OK |
| RCP-5: empty catalogue message | T-1 | `centers-empty` spec, with no per-Center call |
| RCP-N1..N3, N5 | T-1 | Reviewer audit: no dead code, client only, copy in the copy file, real `<button>` plus `role="status"` |
| RCP-N4: folder doc | T-2 | `portfolio-overview/CLAUDE.md` re-stamped, block contents updated, "Removed on purpose" entry added |

## 6. Files Changed Summary

All files are in `onecgiar-pr-client/src/app/`:

| File | Change |
|---|---|
| `internationalization/portfolio-centers-block.copy.ts` | 12 keys deleted, `partialTotal` reworded, `retryFailedCenters` added |
| `.../centers-block/centers-block.component.{html,ts}` | Detail card, state, handlers and icons deleted. Retry-failed note and button, and the empty state, added |
| `.../centers-block/centers-block.charts{,.spec}.ts` | `buildShareOption` / `buildRowsTable` deleted |
| `.../centers-block/centers-block.component.spec.ts` | Every row of design §8.5 applied (24 tests green across 3 suites) |
| `.../portfolio-overview/CLAUDE.md` | RCP-N4 |

## 7. Test Evidence Summary

| Check | Result |
|---|---|
| Red run (new cases on the old code) | 4 failed, 11 passed, as expected |
| Scoped Jest `--testPathPattern=centers-block --maxWorkers=2` | 24 / 24 |
| `npm run build:dev` | Green (only the existing Sass `@import` warning) |
| Lint | `ng lint --lint-file-patterns` clean. `npx eslint` cannot run: the client has no flat config (recurrence, see the kaizen entry) |
| Browser, read-only | 1280 and 768 (768 via a same-origin iframe); 4 local screenshots listed in `execution.md` |

## 8. Validation Summary

There was no `/akili-validate` run. The user accepted the RCP-T-2 browser evidence and asked to archive.

## 9. Accepted Warnings Or Follow-Ups

| Item | Kind | Owner / next step |
|---|---|---|
| The `role="status"` region also wraps the Retry button, so a screen reader may read the button label along with the note | 4R advisory | Optional polish: `role="status"` on the note only |
| Neither Retry button has a visible focus ring (`--pr-focus-ring`) | 4R advisory, inherited | Optional polish |
| At 768 the page scrolls horizontally because of the global topbar (right edge 840) | Pre-existing, out of scope | User agreed to fix it next as a separate change (`/akili-quick` candidate) |
| `family.md` child #3 `centers-new-vs-replicated` is now unblocked on `centers-block/` | Family sequencing | Next child |

## 10. Historical Notes

- The Center Overview shortcut (the per-Center name links) was removed together with the table. It is still reachable from the header of the W3/Bilateral module page (design §10).
- 1440 px cannot be reached on this machine (DPR 1.5 caps the Chrome viewport at 1280). The 768 check used a same-origin iframe because resizing the window had no effect.
