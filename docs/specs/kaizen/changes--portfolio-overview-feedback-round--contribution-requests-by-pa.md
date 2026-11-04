# Kaizen Entry — changes/portfolio-overview-feedback-round/contribution-requests-by-pa

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Date | 2026-11-04 |
| Branch | qa-development-2026-ss (spec branch → items pending) |
| Archive Run | 1 |
| Mode | full |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks `[x]` | 4 / 4 | tasks.md |
| Reviewer FAIL (rework attempts) | 1 (T-3: phase chip missing) | execution.md |
| HALT / FATAL_FAIL / Pivot | 0 / 0 / 0 | execution.md |
| Review rounds vs budget | 5 vs 5 (T-3 = 2) | design.md §11 |
| LOC vs budget | ~1 640 code vs ~650 — tripwire fired, user accepted | execution.md |
| HITL rounds | V-1 needed 2 rounds (first compared prod SQL with the test-DB endpoint) | execution.md |
| Test / validation reports | none (absence accepted) | spec folder |

## Lessons

### CRP-L-1 — `npm run test:local` does not start Jest on Windows, so every agent improvises the test command (Product, recurrence)

- **Root cause:** `onecgiar-pr-client/scripts/run-jest-local.js:63` calls `spawnSync('npx', args)` without `shell: true`. On Windows `npx` is `npx.cmd` and does not resolve, and a `|` in `--testPathPattern` cannot pass through a shell. Jest never starts and nothing is printed, while the guides keep naming the wrapper as the RAM-safe route.
- **Evidence:** `execution.md` CRP-T-3 Issues; `kaizen/changes--portfolio-overview-feedback-round--funding-filter.md` "Noted" ("printed no Jest output for two agents"); `cleanup-and-approved/execution.md` PCA-T-1 advisory (3).
- **Standardization (pending):** P1 + P2.

### CRP-L-2 — `--findRelatedTests` on a hub file runs the whole client (Product)

- **Root cause:** the "findRelatedTests before push" rule does not account for hub files. `results-api.service.ts` (and the copy files) are imported by most of the client, so the related set is about the full suite, which breaks the "never a full suite" rule.
- **Evidence:** `execution.md` CRP-T-3 attempt 1: 451 suites, 12 240 tests, 745 s for 6 changed files.
- **Standardization (pending):** P3.

### CRP-L-3 — The LOC budget ignored the size of the sibling pattern the design told agents to copy (Methodology)

- **Root cause:** design §2 said "copy the W3/Bilateral projects pattern end to end", but §11 estimated ~650 LOC without measuring that pattern. The copy came out about 2.5× the budget, and the tripwire fired on a correct implementation.
- **Evidence:** `design.md` §2 and §11; `execution.md` budget tripwire before T-4 (~1 570 vs ~650).
- **Standardization (pending, upstream):** P4. The AKILI specify budget step should, when a design names an exemplar to copy, size LOC from the exemplar's actual files and tests (`git ls-files … | xargs wc -l`).

## Noted, not a lesson

- T-3 attempt 1 missed a design §8 element (phase chip) that no T-3 test line named. It was a one-off and the Reviewer caught it.
- The first V-1 ran in prod while the local stack reads a test DB (`DB_HOST` on a private host). The V-1 brief should name which DB the endpoint under test reads.
- The client cannot run plain `npx eslint` (ESLint 9 needs a flat config); `ng lint --lint-file-patterns` works. Already noted in PFF.
- A scripted region splice duplicated ~160 service lines during polish. It was caught by lint and the line count, and verified clean against HEAD.

## Pending Items

| ID | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| P1 | standardization | `onecgiar-pr-client/scripts/run-jest-local.js:63` (code, own quick change) | `spawnSync('npx', args, { stdio: 'inherit', cwd: …, shell: process.platform === 'win32' })` and quote the pattern argument, so `test:local -- --testPathPattern="a\|b"` runs on Windows | medium (recurrence ×3) | pending |
| P2 | standardization | `onecgiar-pr-client/CLAUDE.md` (test commands) | "If `npm run test:local` prints nothing, Jest did not start (Windows wrapper bug): use `npx jest --maxWorkers=2 <pattern> --no-coverage` and say so in the report." | low | pending |
| P3 | standardization | root `AGENTS.md` → agent-lean verification table note | "`--findRelatedTests` on hub files (`shared/services/api/results-api.service.ts`, `internationalization/*.copy.ts`) runs ~the whole client; for those, run the touched folders' specs by pattern instead." | medium | pending |
| P4 | standardization (Methodology, upstream) | AKILI `/akili-specify` Step 2.4 budget | "When the design names an exemplar to copy, size the LOC budget from the exemplar's actual source + spec line counts." | medium | pending (upstream) |
| P5 | digest-update | `docs/specs/kaizen-log.md` Active Lessons | Record CRP-L-1 as a recurrence of the `test:local` silence noted in PFF and PCA; raise severity. | low | pending |
