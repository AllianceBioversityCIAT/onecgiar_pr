# Execution Log — Contribution requests by Program/Accelerator (CRP)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Branch | `qa-development-2026-ss` (no commit without explicit user go-ahead) |
| Approval Mode | `gated` |
| Leader | Claude Code session model (opus) |
| Implementer / Reviewer | `akili-implementer` (sonnet, T2) / `akili-reviewer` (opus, T3) |
| Started | 2026-11-04 |

## 2. Task Execution History

### CRP-T-1 — Repository facts query — PASS (2026-11-04)

| Field | Value |
|---|---|
| Attempts | 1 |
| Skills / effort | `nestjs-expert` · medium (as listed; no deviation) |
| Files | `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.repository.ts` (+64: `PortfolioContributionRequestFact` interface + `getPortfolioContributionRequestFacts(versionId)`), `share-result-request.repository.spec.ts` (+63, 3 tests) |
| Verification | `npx jest --runInBand --testPathPattern=share-result-request.repository --silent --reporters=summary --forceExit` → 1 suite, 23 tests passed. eslint on both files clean (one prettier fix via `--fix`) |
| Reviewer | **PASS** — all 5 §5 filters present, columns verified against the entity, `versionId` bound, error path via `returnErrorRepository`; Reviewer traced both "must fail" mutations (status 4 allowed, type filter dropped) through the assertions |
| Requirements | CRP-R-1 BUT clause + phase scenario (presence only; behaviour → V-1 in T-4) |

**Decisions:** Jest ran with `--runInBand` instead of `--maxWorkers=2` because free RAM was 3.3 GB (< 4 GB) at start — machine rule 1 (global CLAUDE.md). Received side = `approving_inititiative_id` (CRP-DD-1).

**Issues:** red-first check not executed by hand; Reviewer substituted a mutation trace.

**ADVISORY (4R, non-gating):**
- Reliability: recorded command differs from the Done line (`--runInBand` vs `--maxWorkers=2`) — explained above.
- Readability: `requestedDate: Date | string | null` is loose → convert to ISO once in T-2.
- Risk: the `not.toMatch(/IN\s*\([^)]*4[^)]*\)/)` guard scans the whole SQL; scope it to the `request_status_id` clause if an unrelated `IN (…4…)` list is ever added.

**Forward pointers → CRP-T-2:** convert `requestedDate` to an ISO string in the service mapping (design §6 `requestedDate (ISO)`); consume `PortfolioContributionRequestFact` from the repository file.

### CRP-T-2 — Service aggregation + endpoint + DTO — PASS (2026-11-04)

| Field | Value |
|---|---|
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `api-design-principles`, `tdd` · medium (as listed) |
| Files | `onecgiar-pr-server/src/api/results-framework-reporting/` — `dto/portfolio-contribution-requests.dto.ts` (new, 106), `results-framework-reporting.service.ts` (+154), `.controller.ts` (+40), `.service.spec.ts` (+209), `.controller.spec.ts` (+55). Additions only |
| Verification | Red: both suites failed to compile before the method existed. Green: `npx jest --runInBand --testPathPattern="results-framework-reporting\.(service\|controller)\.spec" --silent --reporters=summary --forceExit` → 2 suites, 203 tests passed. `--findRelatedTests` on service/controller/dto → 9 suites, 230 tests passed. eslint on 5 files clean |
| Reviewer | **PASS** — totals once per request (sent+received mutation would give pending 3, test expects 2), SP09 zero row, non-seed request in totals + pending, pending = status 1 with the 6 §6 fields, role/guard metadata equal to `portfolio/bilateral-projects`, coercion and seed query copied from sibling, no user fields in payload |
| Requirements | CRP-R-1 (counts, once in totals, zero rows), CRP-R-2 (server side), CRP-R-5 |

**Decisions:** `ShareResultRequestRepository` injected into the RFR service (module already imports `ShareResultRequestModule` — no wiring change). `requestedDate` → ISO in one `toIso` helper (T-1 forward pointer closed). Test pattern narrowed from `results-framework-reporting` to the service/controller specs (the folder pattern matches many unrelated sub-module specs); `--findRelatedTests` covered consumers. Jest `--runInBand` because free RAM was ~4.0 GB. Diff handed to the Reviewer as a scratchpad file (564 lines) instead of inline; content identical to `git diff`.

**ADVISORY (4R, non-gating):**
- Risk: `toIso` parses zone-less strings in the server's local zone; correct while servers run UTC. A TZ change would shift `requestedDate` and the client's "days waiting"; the test cannot catch it (expected value built the same way).
- Reliability: `!== null` check lets `undefined` through (lookup safely misses via `NaN`); `!= null` would state intent.
- Readability: `statusKey` / `emptyCounts` / `toIso` are per-call closures; module-level pure functions would be directly testable.
- Reliability: `byProgram` relies on every seed id being pre-registered (always true).

**Forward pointers → CRP-T-3:** client interface must mirror `dto/portfolio-contribution-requests.dto.ts` exactly; `requestedDate` arrives as ISO string or `null` — `daysWaiting` must tolerate `null`.

### CRP-T-3 — Client block, API method, format helpers — PASS (2026-11-04, attempt 2)

**Attempt 1 — FAIL (2026-11-04)**

| Field | Value |
|---|---|
| Skills / effort | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` · medium |
| Files | new: `shared/interfaces/portfolio-contribution-requests.interface.ts`, `portfolio-overview/components/contribution-requests-block/` (`.component.ts/.html/.spec.ts`, `contribution-requests.format.ts/.spec.ts`); modified: `results-api.service.ts` (+11), `portfolio-overview.copy.ts` (+36), `portfolio-filters.ts` (+4/-2), `portfolio-filters.spec.ts` (+7). 880 insertions / 2 deletions |
| Verification | `npx jest --maxWorkers=1 contribution-requests --no-coverage` → 2 suites, 28 passed; `npx jest --maxWorkers=1 portfolio-filters --no-coverage` → 50 passed; `npx ng lint --quiet --lint-file-patterns <files>` → pass; `--findRelatedTests` on 6 non-spec files → 451 suites, 12240 passed (745 s) |

Reviewer FAIL (verbatim):
1. **Discovered Issue:** The header has no phase chip. The template shows only the `h2` title, the subtitle and the not-affected text. `readonly year = computed(() => this.data()?.phaseYear ?? '')` in `contribution-requests-block.component.ts` is never used in the template. The CRP-T-3 block spec does not test for the chip.
   - **Violated Rule:** `design.md` §8, Header row: "Title "Contribution requests by Program/Accelerator", phase chip, one-line subtitle …".
   - **Remediation Suggestion:** Add a neutral phase chip next to the title using the sibling pattern in `centers-block.component.html` L14-23 (`rounded-full border border-[var(--pr-border)] bg-[var(--pr-surface-card)] px-3 py-1 text-[12px] text-[var(--pr-text-muted)]`, label + value); bind to `year()`, show only when `status() === 'ready'` (or skeleton while loading); add label to the `contributions` copy group (e.g. `phaseLabel: 'Phase'`); add a test asserting the chip shows `2026` from `payload().phaseYear`, testid `contributions-phase`.

ADVISORY (attempt 1, non-gating): (a) Program filter with no matching row reuses the "No contribution requests in this phase" copy under non-zero totals — contradictory, spec silent; (b) `versionId` defaults to `null` and fetches immediately → T-4 must mount under `@if (!data.loading())` or the block makes 2 calls (R-3); (c) `aria-controls` points at elements present only when expanded; (d) nested pending table is plain `<table>`, not `hlmTable`; (e) `pendingClass` uses `--pr-status-submitted-fg` on card surface instead of its paired `-bg` (UI rule 9).

**Issues:** test command deviation — `npm run test:local -- --testPathPattern="a|b"` does not start Jest on Windows (`spawnSync('npx')` without shell; `|` breaks it), so Jest ran directly with `--maxWorkers=1` (free RAM ~2 GB). `npx eslint` unusable in the client (ESLint 9 needs flat config) → `ng lint --lint-file-patterns`. Leader brief asked for `--findRelatedTests` on `results-api.service.ts`, which fans out to almost the whole client (451 suites) — contrary to the scoped-tests rule; brief error, not Implementer error.

**Budget tripwire:** actual ~1 570 LOC (server ~690, client ~880) vs budget ~650 after 3 of 4 tasks → escalated to the user before T-4.

**Attempt 2 — PASS (2026-11-04)**

| Field | Value |
|---|---|
| Effort | high (bumped on rework) |
| Files | `contribution-requests-block.component.html` (phase chip next to title, testid `contributions-phase`, ready-only, Centers-block classes; table `@empty` → `copy.noMatch`), `portfolio-overview.copy.ts` (+`phaseLabel`, +`noMatch`), block spec (+2 tests) |
| Verification | `npx jest --maxWorkers=1 contribution-requests --no-coverage --silent --reporters=summary` → 2 suites, 30 passed; `ng lint --lint-file-patterns` → pass. No `findRelatedTests` this time |
| Reviewer | **PASS** — issue 1 fixed (chip uses existing tokens, `year()` now bound, tested absent-while-loading / `Phase 2026` when ready); empty-phase state unchanged (R-3); copy stays in the copy file |
| Requirements | CRP-R-2 (list, oldest first, link new tab), CRP-R-3 (states, one call per version/Retry, no `%`, empty), CRP-R-4 (all clauses, non-empty programs in test), CRP-R-6 |

**Decisions:** chip shows the phase year (payload has `phaseYear`, no phase name; design §8 does not fix the content). Leader let attempt 2 also take advisory (a) — the `noMatch` copy for a Program filter with no rows — as an optional two-line change inside the task's own block; recorded here as a scope deviation from "advisory never grows a task" (no new task, no new file).

**Open ADVISORY (non-gating):** `aria-controls` targets exist only when expanded; inner pending table not `hlmTable`; `pendingClass` uses status `-fg` on card surface (UI rule 9).

**Forward pointers → CRP-T-4:** mount under `@if (!data.loading())` so `versionId` is resolved before mount (otherwise null-then-number = 2 calls, breaks R-3); pass `notAffectedBy('contributions', selection, ['funding'])`; browser check must cover the 8-column table at 390 px (`hlmTableContainer` scrolls horizontally — confirm no page-level horizontal scroll).

**Budget tripwire decision (2026-11-04):** user chose "Continue with T-4" — overrun (~1 570 vs ~650 LOC) accepted; cause = size of the copied sibling pattern, about half tests.

### CRP-T-4 — Mount on the page, guide, V-1 — code PASS, HITL pending (2026-11-04)

| Field | Value |
|---|---|
| Attempts | 1 |
| Skills / effort | `angular-developer` · medium |
| Files | `portfolio-overview/portfolio-overview.component.html` (+8: block under `@if (!data.loading())`, outside `hasFigures()`, after Projects, before Results detail), `.component.ts` (+4: import + `contributionsNotAffected = notAffectedBy('contributions', selection, ['funding'])`), `.component.spec.ts` (+43: DOM order, present with 0 rows + exactly one request, absent while loading + no request), `portfolio-overview/CLAUDE.md` (+7: data path, mount rule, filter rule, received = must answer) |
| Verification | `npx jest --maxWorkers=2 portfolio-overview.component --no-coverage --silent --reporters=summary` → 17 suites, 413 passed; `ng lint --lint-file-patterns` 3 files → pass; Leader template type-check `npx ngc -p tsconfig.app.json --noEmit` → exit 0, no errors (warnings only, none in touched files) |
| Reviewer | **PASS** — position + DOM-order spec, own `@if` slot, one request at page level with 0 rows, no request while loading, T-3 forward pointers honoured, CRP-R-7 four items present |
| Requirements | CRP-R-3 (position, rest of page intact), CRP-R-4 (wiring), CRP-R-7 |

**ADVISORY (non-gating):** re-stamp the guide's `**Verified:**` header with this spec before commit (client CLAUDE.md §10 convention); align the endpoint prefix to `api/results-framework-reporting/...` like the Projects section; the 0-rows spec does not pin whether `versionId` is null or a number.

**Status:** `[~]` — Done line also needs V-1 (user, prod SQL inline) and the read-only browser check (1280 px / 390 px). Not marked `[x]` until both are recorded here.

**HITL round 1 (2026-11-04):**
- V-1: user ran the inline SQL in **prod** → totals pending 492, no status 2/3 rows; per P/A only status 1 (e.g. SP02 received 52 / sent 85). Local block (local stack, phase 2026) shows Pending 616 / Accepted 29 / Declined 9, SP02 received 319 / sent 35. **Not comparable:** the local server reads a non-prod DB (`DB_HOST` on a 192.x private host, not the prod DB), so prod SQL vs local endpoint are different data sets. Not evidence until rerun against the same DB the endpoint reads. Internal consistency of the block: received-pending sum = 616 = Pending total.
- Browser check (Leader, read-only, no clicks besides sidebar navigation): DOM order `projects-block → contribution-requests-block → results-detail` ✔; phase chip "Phase 2026" ✔; rows sorted by received Pending desc ✔; no page horizontal scroll at 2560 px (scrollWidth 2545). `resize_window` could not shrink the maximized window → 1280 px / 390 px not verified.

**HITL round 2 (2026-11-04) — T-4 PASS:**
- **V-1 = equal.** User reran the inline SQL on the DB the local server reads (DBeaver `prdb` on the test host, `@v = 36`, phase 2026). Totals: pending 616 / accepted 29 / declined 9 = block KPI row. Per P/A (received P/A/D · sent P/A/D), SQL = block: SP02 319/5/3 · 35/0/0; SP01 156/4/2 · 101/8/1; SP09 35/3/1 · 55/2/2; SP04 29/3/1 · 38/1/0; SP03 23/1/0 · 95/1/1; SP06 11/2/1 · 40/3/0; SP07 10/2/0 · 24/1/0; SP08 9/0/0 · 2/2/0; SP05 3/3/0 · 52/1/0; SGP-02 2/0/0 · 3/0/0; SP10 1/0/0 · 27/1/0. SQL also shows 13 requests with NULL requester code (4 pending / 6 accepted / 3 declined): they count in totals but in no P/A row, as design §7 says. Round-1 numbers (492 pending only) were from another DB and are void as evidence.
- **Browser check, 1280 / 390 px** (Leader, read-only same-origin iframe at fixed width, nothing clicked, no storage touched): 1280 → page scrollWidth 1267 ≤ 1280, table fits (932/932). 390 → page scrollWidth 377 ≤ 390, block 350 px wide, table scrolls inside its own container (263 visible / 746, `overflow-x: auto`). No page-level horizontal scroll at either width.
- Open question for the user (not a gate): in the first DB queried, the open phase had no accepted/declined rows at all. A diagnostic SQL (status × is_active) was handed over to rule out accepted requests being deactivated.

## 3. Summary

| Task | Result | Attempts |
|---|---|---|
| CRP-T-1 Repository facts query | PASS | 1 |
| CRP-T-2 Service + endpoint + DTO | PASS | 1 |
| CRP-T-3 Client block | PASS | 2 (phase chip missing in attempt 1) |
| CRP-T-4 Mount + guide + V-1 + browser | PASS | 1 (+2 HITL rounds) |

Budget: ~1 640 LOC vs ~650 planned (overrun accepted by the user at the tripwire); review rounds within budget (T-3 = 2). Nothing committed. Open before commit: re-stamp the `**Verified:**` line of `portfolio-overview/CLAUDE.md` (advisory). Open advisories are in each task entry. Process notes for kaizen: `npm run test:local -- --testPathPattern="a|b"` does not start on Windows; `npx eslint` is unusable in the client (use `ng lint --lint-file-patterns`); `--findRelatedTests` on `results-api.service.ts` runs ~the whole client.

## Post-execution polish — PASS (2026-11-04, user-authorized)

User asked to "adjust whatever is needed so everything comes out right"; the Leader scoped that to the open Reviewer advisories only (no new behaviour, no new task).

| # | Change | File |
|---|---|---|
| 1 | `**Verified:**` stamp names this spec; endpoint written with the `api/` prefix | `portfolio-overview/CLAUDE.md` |
| 2 | `aria-controls` bound only while the controlled element is rendered (row expand + All pending) | block `.html` |
| 3 | Nested pending table uses Spartan helm table directives | block `.html` |
| 4 | `pendingClass` → `font-bold text-[var(--pr-text-heading)]` (UI rule 9; KPI cards keep their fg+bg pairs) | block `.ts` |
| 5 | `!= null` id checks; helpers moved to module-level `contributionStatusKey` / `emptyContributionCounts` / `contributionToIso` (no behaviour change) | RFR service |
| 6 | Status-4 guard scoped to the `request_status_id IN (…)` clause | repository spec |

**Verification:** client Jest (`contribution-requests|portfolio-overview.component`, `--maxWorkers=2`) → 17 suites, 413 passed; `ng lint` → pass; Leader `ngc -p tsconfig.app.json --noEmit` → exit 0; server Jest (service, controller, repository specs) → 3 suites, 226 passed; eslint + prettier clean.
**Issue:** the Implementer's first scripted move duplicated ~160 lines in the service, then repaired it. Leader check: service diff vs HEAD = 155 additions, 0 deletions, each portfolio method once. Reviewer confirmed no leftover or dead code.
**Reviewer:** PASS — all 6 correct, in spec, behaviour-neutral where claimed.
**Remaining before commit:** none from the advisories. Server `toIso` time-zone advisory (T-2) kept as is: servers run UTC and the driver returns `Date` objects; recorded, not changed.
