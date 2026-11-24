# Archive Summary — Portfolio Overview graphs clarity (PGC)

> **Outcome:** shipped to qa-dev and PRTest, verified on PRTest 2026-11-23. Per P/A, "With W3/Bilateral results" now counts the projects whose W3 results name that P/A; the projects chart has three distinct colours; the Typology key, the Center footnote and the projects subtitle explain what the user sees. Every other figure is unchanged (totals 991 / 133 / 0).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-graphs-clarity` (PGC) |
| Ticket | INC-168764 (Freshservice, Nicoleta Trifa) |
| Depth / mode | Lite · gated |
| Owner | Santiago Sanchez |
| Archived on branch | `pgc/portfolio-graphs-clarity` (worktree `D:\PRMS\onecgiar_pr-pgc`), a spec branch → shared-file sync recorded as pending items |

## 2. Original Spec Path

`docs/specs/changes/portfolio-graphs-clarity/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 4/4 tasks `[x]`**, one attempt each, four Reviewer `PASS`, every evidence re-run `VERIFIED`. No HALT, pivot, waiver or skip.

## 5. Requirements Delivered

| ID | What | Task | Proof |
|---|---|---|---|
| PGC-R-1 | Typology key line for one-bar rows | T-3 | Jest (rendered DOM) + PRTest Chrome |
| PGC-R-2 | Center tab footnote in plain words | T-3 | Jest + PRTest Chrome |
| PGC-R-3 | Projects series purple / green / orange (stripes on W1/W2) | T-2 | Jest + PRTest screenshots (both tabs) |
| PGC-R-4 | Per-P/A "With W3/Bilateral results" by named P/A | T-1 | Jest + PRTest SQL + endpoint (13/13 P/As equal) |
| PGC-R-5 | Every other figure unchanged | T-1 | Jest parity literals + PRTest totals 991 / 133 / 0 |
| PGC-R-6 | Subtitle and caption explain the rule (6.2 Center-tab subtitle, amendment) | T-2, T-4 | Jest + PRTest Chrome |
| NFR-1..4 | Same response shape, one round trip, copy file only, tokens only | T-1, T-2 | Reviewer + 216 ms on PRTest |

## 6. Files Changed Summary

| Commit | Scope |
|---|---|
| `9d2ac1791` ✨ | Server: `clarisa-projects.repository.ts` (+spec) `named_program_codes`; `results-framework-reporting.service.ts` (+spec); `dto/portfolio-bilateral-projects.dto.ts` |
| `d666de926` 🎨 | Client: `projects.charts.ts` (+spec), `projects-block.component.ts` (+spec), `typology-block.component.html` (+spec), `portfolio-overview.copy.ts`, portfolio-overview `CLAUDE.md` |
| `87804e2c4` 🎨 | Client: projects subtitle per tab (`centerSubtitle`, template, spec) |
| `f965ca5f3`, `d95c93055` 📝 | Spec docs and execution log |
| Merges | `performance-refactor` `365225a96`, `c7a1e7928` |

About 465 LOC in all, most of it test fixtures (budget ~260; tripwire recorded and approved by the owner).

## 7. Test Evidence Summary

No `test-report.md` (`/akili-test` not run). Accepted at archive because each task carried its own falsifier, executed red and quoted in `execution.md`, plus a non-author re-run:

- Server: `--findRelatedTests` 78 suites / 2550 tests (worktree), 81 / 2633 on the merged `performance-refactor` tree.
- Client: 39 / 1299 (T-2), 38 / 1288 (T-3), 38 / 1289 (T-4); merged tree 39 / 1314 and 38 / 1303; `tsc --noEmit` exit 0.

## 8. Validation Summary

No `validation-report.md` (`/akili-validate` not run). Accepted at archive on the strength of the PRTest checks recorded in `execution.md`:

- Owner SQL (P-10, P-11): the repository SQL runs on MySQL; per-P/A old vs new table; 2 W3 results named only through role 2.
- Endpoint: 216 ms; totals 991 / 133 / 0; all 13 P/A values equal the SQL.
- Browser (owner screenshots + Leader in Chrome, read-only): colours on both tabs, legend, caption, Typology key line, Center footnote only on the Center tab, subtitle per tab.

## 9. Accepted Warnings Or Follow-Ups

- [ ] Promote to `staging` → `master` (Cristian), then reply to Nicoleta on INC-168764 with the four points and the rule change.
- [ ] `codegraph sync` after merge.
- [ ] Advisory (not done, readability only): service-spec fixture comment gives wrong old-rule values (old SP01 1, SP02 1, SP05 1, SP09 0); repository-spec comment about `r.status_id` matches is misleading.
- Dark mode: N/A, the app has none.

## 10. Historical Notes

- Executed in a git worktree because the main checkout held other sessions' uncommitted edits on the same server files. The gitignored `onecgiar-pr-client/src/environments/` had to be copied by the owner (the agent copy was denied); eslint there needs `ESLINT_USE_FLAT_CONFIG=false`.
- PGC-T-4 is an execute-time amendment (Scenario 6.2) added after the PRTest look; `/akili-quick` refused it because it adds a template conditional.
- One Implementer run (T-4 red) executed the whole client suite by mistake; no impact, recorded.

## 11. Diagrams

None (no `diagrams/` folder; no baseline diagram slot made stale).
