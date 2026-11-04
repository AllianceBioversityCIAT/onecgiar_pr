# Execution Log — Discard several AI draft results at once (`ABD`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-drafts-bulk-discard/` |
| Approval Mode | gated (pause after every task) |
| Branch | `qa-development-2026-ss` (base `27d6336e8`); tasks.md says "from `staging`" — owner re-invoked `/akili-execute` on the current branch, no branch created |
| Started | 2026-10-27 |
| Leader | Claude Code `opus` (T1) |
| Pre-flight | Owner re-invoked `/akili-execute` after the spec walkthrough → spec treated as approved, ABD-OQ-1/OQ-2 defaults adopted. **ABD-OQ-3 SQL check not reported** → cap 100 kept as accepted gap until the owner runs the max-drafts-per-job query |
| Concurrency note | Another session (`center-overview-pa-contribution`) is active in the same checkout. Foreign working-tree changes seen during T-1 (not ABD's): client `bilateral-overview/*`, `bilateral-query-params*`, `bilateral-result-filter*`, `bilateral-center-result.interface.ts`, `bilateral-results-list.component.ts`; server `results/result.repository{,.spec}.ts`. **Stage explicit paths only when committing ABD** |

## 2. Task Execution History

### ABD-T-1 — Bulk discard endpoint + transactional single discard (server)

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-10-27 |
| Attempts | 1 |
| Implementer | `akili-implementer`, effort `high`; skills `nestjs-expert`, `api-design-principles`, `error-handling-patterns`, `tdd` (as listed in tasks.md, no deviation) |
| Reviewers | 2 parallel lens reviewers (`akili-reviewer`, effort `high`) — task touches auth + data-loss surfaces: (a) spec conformance + readability/reliability, (b) risk/resilience + baseline conformance. Both **PASS** |
| Requirements covered | ABD-R-5 (S-5.1 … S-5.5), ABD-R-8 (S-8.1), ABD-NFR-4, ABD-NFR-5 |

**Attempt 1**

Files changed (all `onecgiar-pr-server/src/api/bilateral-ai/`):
- `dto/discard-bilateral-ai-drafts.dto.ts` (new) — `IsArray`, `ArrayNotEmpty`, `ArrayMaxSize(100)`, `IsInt({each})`, `Min(1,{each})`; exports `BULK_DISCARD_MAX_DRAFTS = 100`
- `dto/discard-bilateral-ai-drafts.dto.spec.ts` (new)
- `services/bilateral-ai.service.ts` — private `discardOne` (`getDraftRaw(…,'act')` then `draftRepository.manager.transaction` with tx repositories for `BilateralAiDraft` + `Result`), private `toBulkDiscardFailureReason`, public `discardDrafts` (dedupe, sequential loop, per-id try/catch, one summary log line), `discardDraft` delegates to `discardOne` (response/message unchanged)
- `services/bilateral-ai.service.spec.ts`
- `bilateral-ai.controller.ts` — `@Post('drafts/discard')`, `@HttpCode(200)`, `@ApiOperation`, `@ApiBody`, `@UserToken()`, per-route `ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })` on `@Body()`
- `bilateral-ai.controller.spec.ts`

Diff: ~110 prod LOC + ~410 spec LOC (frozen copy reviewed: session scratchpad `abd-t1.diff`, 777 lines).

Verification (Implementer, verbatim):
```
npx jest --maxWorkers=1 --silent --reporters=summary --forceExit --coverage=false --findRelatedTests src/api/bilateral-ai/services/bilateral-ai.service.ts src/api/bilateral-ai/bilateral-ai.controller.ts src/api/bilateral-ai/dto/discard-bilateral-ai-drafts.dto.ts
Test Suites: 11 passed, 11 total
Tests:       224 passed, 224 total
Snapshots:   0 total
Time:        47.573 s, estimated 136 s
npx eslint src/api/bilateral-ai --quiet → eslint_exit=0
```
Earlier run at `--maxWorkers=2`: 11 suites / 225 tests passed (one redundant single-discard test trimmed afterwards). Final run used `--maxWorkers=1` because free RAM was 3.0 GB (< 4 GB machine rule). Red-first: service spec failed to compile before `discardDrafts` existed.

Clause → test:
| Clause | Evidence |
|---|---|
| S-5.1 | 3 ids → 3 discarded; tx draft + tx result update per id; root repos never called |
| S-5.2 | ids 21/24 ok, 22 `not_found`, 23 (other center) `forbidden`; writes exactly [21,24]/[201,204]; nothing for 23/203 |
| S-5.3 | result update rejects for 31 → `error`; 32 still succeeds; 31's draft write issued on tx repository; log has id only (no error text / email) |
| S-5.4 | DTO spec: missing, non-array, empty, string/float/null, <1, 101 (fail), 100 (pass). Service `[5,5]` → one transaction. Supertest (no global pipe in harness): empty / `'x'` / 101 / missing field → 400, service never reached |
| S-5.5 | non-member admin → all `forbidden`, no transaction; `UnauthorizedException` → `forbidden` |
| S-8.1 / NFR-4 | existing single-discard test keeps response assertion, write assertions moved to tx stubs; `DELETE /center/ai/drafts/4` still reaches `discardDraft` |
| DD-3 | max in-flight transactions = 1; results in request order |
| Routing | `POST drafts/discard` reaches `discardDrafts`, not `promoteDraft`/`discardDraft` |
| NFR-5 | no migration, no column |

Reviewer (a) — spec conformance: **STATUS: PASS** — "The ABD-T-1 diff meets the spec. Every T-1 clause has a test that would fail if its behaviour broke. The diff touches exactly the 6 listed files, with no migration (NFR-5)."

Reviewer (b) — risk/resilience: **STATUS: PASS** — entitlement `'act'` runs before any write; both writes only via the tx manager; per-id isolation; pipe rejects before the service (`"5"` not coerced: no `enableImplicitConversion`/`@Type`); logs clean; new route under the same `JwtMiddleware` chain (matches no exclusion / public route); `result_id` non-nullable so the null case cannot occur (fail-safe if it did).

**ADVISORY (4R — recorded, non-gating, no rework):**
- (a) Readability: controller spec adds mock members (`discardDrafts`, `discardDraft`, `promoteDraft`) and `mockReset` in `afterEach` to existing scaffolding — additive, no existing test behavior changed (within T-1 disqualifier).
- (a) Reliability: `Bulk discard failed for draft N` drops all diagnostics; logging the error class name (e.g. `QueryFailedError`) would leak nothing and help PRTest/PROD triage.
- (a) Readability: summary log `requested=` counts ids after dedupe, not raw length (design §7 ambiguous).
- (a)/(b) Risk: `assertCenterEntitlement` throws `NotFoundException('Center not found.')` → reported as `not_found`, not `forbidden`; still fails closed. Client copy must not say "already discarded" for every `not_found`.
- (b) Risk: atomicity proof is mock-level only (accepted gap per tasks.md disqualifier / requirements §8). Closing it needs an integration test on a disposable DB, never shared prdb.
- (b) Resilience: draft update is unconditional (no `is_discarded: false` predicate) → two concurrent discards of one id both report success; idempotent, pre-existing behavior.
- (b) Resilience: DB fully down → 200 with every id `error` (DD-4). **Forward pointer to ABD-T-2/T-3:** treat "all ids failed with `error`" like a request error (ABD-S-6.3), not a normal partial result. *(Leader note: this is the Reviewer's suggestion, not a spec clause — carry into the T-2 brief as a question for the Implementer to surface, not as new scope.)*

Decisions:
- Per-route `ValidationPipe` added: the server has no global pipe, so without it ABD-S-5.4 could never return 400. Mirrors `bilateral-center.controller.ts`. `createJob` in the same controller also lacks validation — outside T-1, not touched.
- `@HttpCode(200)` on the POST (Nest default is 201; design DD-4 says 200).
- Error log carries draft id only (design §6 / `.cursorrules`).

Issues encountered:
- Implementer runtime ~1 h 50 min (66 tool calls): `--findRelatedTests` on `bilateral-ai.service.ts` pulls 11 suites / 224 tests; final run at 1 worker due to low free RAM.
- **Budget:** T-1 alone ≈ 520 LOC vs ~220 estimated for T-1 and ~520 for the whole spec (design §1). Cause: clause tests (DTO matrix, supertest 400/routing, DD-3 probe). Review rounds 1 (≤ 2 budget). Escalated to the owner at the T-1 gate.

Accepted gap: real MySQL rollback not exercised (mock-level proof).

Final verification: PASS (11 suites / 224 tests, eslint clean). Not committed.

Gate: owner said "sigue hasta que termines" (2026-10-27) → remaining tasks run without per-task pause; HALT / pivot / tripwire and the T-4 manual check still stop.

### ABD-T-2 — Client API + `BilateralAiService.discardDrafts`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2) |
| Date | 2026-10-27 |
| Attempts | 2 |
| Implementer | `akili-implementer`, effort `medium` → `high` on rework; skills `angular-developer`, `error-handling-patterns`, `tdd` (tasks.md list, no deviation) |
| Reviewer | `akili-reviewer`, effort `high`, lens checklist mode (single reviewer; no auth/data-loss surface on the client) |
| Requirements covered | ABD-R-6 (S-6.1 … S-6.3 service side), ABD-NFR-1 |

**Attempt 1** — files (all `onecgiar-pr-client/src/app/`):
- `shared/services/api/bilateral-api.service.ts` — `POST_bilateralAiDraftsDiscard(draftIds)` → one POST `api/bilateral/center/ai/drafts/discard`, body `{ draftIds }`
- `shared/services/api/bilateral-api.service.spec.ts`
- `pages/bilateral/services/bilateral-ai.service.ts` — `discardDrafts(draftIds): Observable<BulkDiscardDraftsResponse | null>`: optimistic removal (ids `Number()`-normalized), restore `failed` ids on success, clear `currentDraft` only if discarded, one toast ("N draft result(s) discarded" + ". M could not be discarded", severity `warn` on partial); on error restore snapshot, one generic error toast ("Failed to discard drafts"), emit `null`; no navigation
- `pages/bilateral/services/bilateral-ai.service.spec.ts`
- `pages/bilateral/services/bilateral-ai.interfaces.ts` — `BulkDiscardDraftsResponse`

Diff ≈ +104/−3 (≈49 prod, ≈58 spec). Within T-2 estimate (~125).

Verification (verbatim):
```
npx jest --maxWorkers=1 --silent --reporters=summary --no-coverage --findRelatedTests src/app/shared/services/api/bilateral-api.service.ts src/app/pages/bilateral/services/bilateral-ai.service.ts
Test Suites: 441 passed, 441 total
Tests:       11837 passed, 11837 total
Snapshots:   12 passed, 12 total
Time:        783.342 s, estimated 1071 s
```
1 worker: free RAM ≈ 2.8 GB. Run includes `BilateralAiService` consumers (disqualifier satisfied).
Lint: tasks.md `npx eslint …` cannot run in the client (no `eslint.config.*`, ESLint 9). Substitute accepted by Reviewer: `npx ng lint --quiet --lint-file-patterns "src/app/shared/services/api/bilateral-api.service*.ts" --lint-file-patterns "src/app/pages/bilateral/services/bilateral-ai.*.ts"` → `All files pass linting.`

Reviewer attempt 1: **STATUS: FAIL**
1. Discovered Issue: The "only" half of the `currentDraft` row is untested. The single test (S-6.1) sets `currentDraft` to `{id:5}` with 5 discarded and expects `null`. That proves the clear happens, not that it is conditional. If `this.currentDraft.set(null)` ran unconditionally, every test would stay green. The Implementer's notes admit this.
   Violated Rule: docs/specs/bilateral/ai-drafts-bulk-discard/tasks.md §ABD-T-2, Clause ownership row "`currentDraft` cleared only if discarded | service spec". Also design.md §8.3, row `currentDraft`: "Cleared only if its id is in `discarded`".
   Remediation Suggestion: Add a service spec where `currentDraft` is set to a draft that is not discarded, and assert it is kept (`toEqual` the same object). The best case is the S-6.2 setup: `currentDraft = { id: '7' }` as a string, so it also exercises the `Number()` normalisation, and the response has `failed: [{ id: 7 }]`. Optionally add a second case where `currentDraft` belongs to a draft outside the batch. Confirm the new test goes red under the unconditional-clear mutation.
All other clause rows PASS (NFR-1 `expectOne` POST + body; S-6.1 no navigate; S-6.2 `Number()` restore; S-6.3 snapshot + generic toast; one toast per outcome; naming; consumers).

**Attempt 2** — only `bilateral-ai.service.spec.ts` (+9): test "keeps currentDraft when its id (string, as TypeORM sends bigint) is among the failed" (`currentDraft = {id:'7'}`, `discarded:[5,6]`, `failed:[{id:'7'}]`, `toBe(current)`). Prod file byte-identical to attempt 1 (Leader `cmp` of the hunk).
Mutation (unconditional clear): `Test Suites: 1 failed, 1 total / Tests: 1 failed, 47 passed, 48 total`. Reverted: `Test Suites: 1 passed, 1 total / Tests: 48 passed, 48 total`. ng lint on spec: `All files pass linting.`

Reviewer attempt 2: **STATUS: PASS** — "With S-6.1 (a discarded `currentDraft` is cleared) and this new test (a non-discarded `currentDraft` is kept), the tasks.md §ABD-T-2 row "`currentDraft` cleared only if discarded" and design.md §8.3 … are now covered in both directions."

**ADVISORY (recorded, non-gating):**
- Reliability: `catchError` after `tap` — a throw in the success side effects (e.g. toast) restores the snapshot and shows a second error toast; server-discarded rows would reappear.
- Resilience: success restore rebuilds from the pre-request snapshot — a `draftList` reload during the request is overwritten with stale data.
- Reliability: optimistic removal runs on call, not on subscribe — a caller that never subscribes leaves the list mutated with no request. **Forward pointer to T-3: the component must always subscribe.**
- Readability: toast copy inline in the service (design §9 asks for one-place constants).
- Readability: the attempt-2 test does not assert `draftList()` after restoring the string id, so dropping `Number(f.id)` would go unnoticed.
- From T-1 forward pointer: DB fully down → 200 with all ids `error` → shown as `warn` "Partially discarded … 0 draft results discarded. N could not be discarded"; no hard error toast. Not in spec — owner decision (raised as owner's point 3).

Decisions: on request error `discardDrafts` emits `null` and swallows the error (spec silent) → **T-3 component reads `null` as "request failed, keep selection"**. Service owns the single toast (§8.3) → **component must not add another**.

Final verification: PASS. Not committed.

### ABD-T-3 — Selection UI, action bar and bulk dialog on `my-draft-results`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2) |
| Date | 2026-10-27 |
| Attempts | 2 |
| Implementer | `akili-implementer`, effort `medium` → `high` on rework; skills `angular-developer`, `spartan` (Spartan MCP consulted for `hlm-checkbox`), `tailwind-design-system`, `tdd` (tasks.md list, no deviation) |
| Reviewer | `akili-reviewer`, effort `high`, lens checklist mode |
| Requirements covered | ABD-R-1 (S-1.1…1.3), R-2 (S-2.1…2.3), R-3 (S-3.1, 3.2), R-4 (S-4.1, 4.2), R-6 (S-6.1…6.4 component side), R-7 (S-7.1), NFR-2/3 (automated layer), NFR-6 |

**Attempt 1** — files: `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,html,spec.ts}`.
- State: `selectedIds` (`Set<number>`, `Number()`-normalized), `selectedCount`, `isBulkDiscarding`, `showBulkDiscardDialog`; `cardSelectionState(group)` / `toggleCard(group)` over `group.drafts` (built from filtered `drafts()`, never `allDrafts()`).
- Template: member-only `hlm-checkbox` per row (`aria-label="Select draft: {title}"`) in a new leading column (`w-[44px]`); select-all with indeterminate; sticky action bar ("N selected", "Discard selected" `hlmBtn` outline, "Clear selection" ghost); second `app-pr-dialog` (existing pattern) with `BULK_COPY` constants; confirm disabled + early-return guard in flight.
- Result handling: always subscribes to `discardDrafts()`, no component toast; selection = failed ids / empty; `null` keeps selection; flag and dialog released in every case.
- Clearing effect reads `drafts()`, project/search/created-by filter signals and `ctx.centerId()` before any early return; clears on filter-key change, center change, or a selected id no longer visible; skips the visibility check while a request is in flight (rows are optimistically removed by the service; otherwise S-6.3 selection would be wiped).
- Diff ≈ 110 prod + 115 spec LOC (frozen copy: session scratchpad `abd-t3.diff`, 421 lines).

Verification (verbatim):
```
npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts
Test Suites: 21 passed, 21 total
Tests:       806 passed, 806 total
Snapshots:   0 total
Time:        29.078 s, estimated 37 s
npx ng lint --quiet --lint-file-patterns "src/app/pages/bilateral/pages/my-draft-results/**/*.ts" --lint-file-patterns "src/app/pages/bilateral/pages/my-draft-results/**/*.html"
All files pass linting. exit=0
```

Declared deviations and Reviewer adjudication:
1. Existing spec "renders colgroup with fixed column classes" 5 → 6 `<col>`, indices shifted — **accepted** (column-count form of the allowed row-count exception; NFR-6 specs untouched).
2. Spec stubs `@spartan/checkbox` with a `<button role="checkbox">` because `tests/mocks/spartanBrainMock.ts` lacks `BrnCheckbox` — **accepted** (tests still click the rendered element through `(checkedChange)`; stub contract matches `hlm-checkbox.ts:81-100` and Brain `toggle()`).
3. Select-all placed in `<thead>` checkbox cell instead of card header — **rejected** (issue 1).
4. `[disabled]` + `[attr.disabled]` — **accepted** (existing pattern html:566).
5. `w-[44px]` column, no SCSS — **accepted** (layout is T-4 manual gate).
6. Effect skips visibility check while in flight — **accepted, and needed**; signals read before early return, selection read `untracked`.

Reviewer attempt 1: **STATUS: FAIL**
1. Discovered Issue: The select-all checkbox is in the table's header row (`<thead>` cell of the checkbox column). It is not in the card header. The card header is the `.mdr-session-header` block that holds the session hash (html:247-253), and it has no checkbox.
   Violated Rule: `requirements.md` ABD-R-2: "Each upload card header SHALL have a checkbox that selects or clears every visible draft of that card". `design.md` §8.2, Header checkbox row: "In the card header, before the hash; `checked` = all, `indeterminate` = some; `aria-label="Select all drafts of this upload"`".
   Remediation Suggestion: Move the `hlm-checkbox` (same bindings and `aria-label`, still inside `@if (isCenterMember())`) into `.mdr-session-header`, before the `smart_toy` icon and hash span. Keep a matching first cell in the header row so the 6 columns still line up (e.g. `<th scope="col"><span class="sr-only">Select</span></th>`). Point the spec's `cardBox()` selector at `.mdr-session-header [role="checkbox"]`. If the column-aligned placement is preferred, that is a change to the spec. The Leader would need to amend design §8.2 and R-2 with the owner's approval. The Implementer cannot make that call as a deviation.
Leader adjudication: follow the spec (no spec amendment).

**Attempt 2** — `.html` + `.spec.ts` only (`.ts` byte-identical): select-all `hlm-checkbox` moved into `.mdr-session-header` before `smart_toy` + hash (same bindings, member-only); thead first cell → `<th scope="col"><span class="sr-only">Select</span></th>`; spec `cardBox()` selector → `.mdr-session-header [role="checkbox"]`. `.mdr-session-header` has no click handler → no `stopPropagation` needed. Leader verified the delta against the frozen diff (session scratchpad `abd-t3-a2.diff`).
Verification (verbatim): `Test Suites: 21 passed, 21 total / Tests: 806 passed, 806 total / Time: 37.421 s`; scoped ng lint → `All files pass linting. exit=0`.

Reviewer attempt 2: **STATUS: PASS** — "ABD-T-3 attempt 2 fixes the one FAIL issue from attempt 1 … This meets ABD-R-2 … and design §8.2 ("In the card header, before the hash")."

**ADVISORY (recorded, non-gating):**
- Reliability: the "S-6.3: a null result keeps the selection" test cannot catch removal of the in-flight skip (mock never removes rows, answers sync `of(null)`). Fix: `mockImplementation` that removes ids from `draftList`, returns a `Subject`, `detectChanges()` while pending, then restore + emit `null`, assert selection kept.
- Readability: S-2.2 never selects anything in card B before clearing card A, so "clears that card only" isn't directly asserted.
- Risk: R-7 lists "draft list reload" as a clear trigger; the effect follows design §8.1 (clears only when a selected id disappears or filter/center changes). A reload returning the same ids (e.g. `loadAllDrafts` after a job completes, service:445) keeps the selection. R-7's title guarantee holds — **owner to confirm the design's reading**.
- Risk: "Discard selected" is plain `outline`; design §8.2 says "destructive outline" (S-3.2 satisfied either way).
- Resilience: bulk dialog Cancel stays enabled in flight (harmless).
- Not verified: production template compile — `ng lint` does not type-check templates; run `npm run build` before the PR.
- T-4 manual check additions: header checkbox alignment inside the session header at 1280 px incl. indeterminate look.
- Follow-up outside spec: add `BrnCheckbox` to `tests/mocks/spartanBrainMock.ts` so the spec stub can go.

Final verification: PASS. Not committed.

### ABD-T-4 — Folder docs + manual HITL check

| Field | Value |
|---|---|
| Final status | **`[~]` — docs PASS (attempt 2); manual HITL layout/keyboard check pending (owner)** |
| Date | 2026-10-27 |
| Attempts | 2 (docs) |
| Implementer | `akili-implementer` on `haiku` (T5), effort `low` → `medium` on rework; skill `cognitive-doc-design` |
| Reviewer | `akili-reviewer` (default model, ≠ Implementer), effort `medium` |
| Requirements covered | Docs layer of the spec; NFR-2 / NFR-3 manual layer **pending** |

File: `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md` (no server `bilateral-ai` guide exists → nothing to update there).

**Attempt 1** — re-stamped `Verified:`, added ~30-line bulk contract block, closed the "select several drafts" pending line (bulk promote still not built). File 120 → 142 lines.
Reviewer attempt 1: **STATUS: FAIL** — all new facts verified true against code;
1. Discovered Issue: The folder doc is now 142 lines. Before this diff it was exactly 120 lines (the old hunk `@@ -116,5` ended at line 120), so the diff added 22 net lines and pushed the file over the cap.
   Violated Rule: `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4, "Hard cap **120 lines**. …" The package guide `onecgiar-pr-client/CLAUDE.md` §10 ("Folder docs") binds every folder `CLAUDE.md` to this convention.
   Remediation Suggestion: Bring the file back to 120 lines or fewer without losing any of the verified facts ((a) shorten bulk block, (b) shorten `Verified:` history, (c) condense older narrative; no second file).

**Attempt 2** — 116 lines (Leader `wc -l`), +28/−32: `Verified:` = "2026-10-27 · qa-development-2026-ss · ABD-T-3 (bulk select + discard). Prior: AIQ-T-7, 2026-09-29."; bulk block 9 lines; option (c): `?job=` paragraph 13→5, scroll trap 9→3, queryParamMap trap 6→2 (P2-3853 kept); "a search box," removed from Pending (template has "Search drafts").
Reviewer attempt 2: **STATUS: PASS** — cap met; new statements true; condensed pre-existing traps keep every load-bearing rule (never `scrollIntoView`, `scrollWithinNearestScrollContainer`, never `queueMicrotask`, `afterNextRender(cb,{injector})`, clear-timer inside callback; live `queryParamMap`; both signals read before early return; AIQ-R-9 D / P-19, P2-3853).

**ADVISORY (recorded, non-gating):** `?job=` paragraph lost the `COV-T-7` reference (`parseBilateralQueryParams` still named); queryParamMap trap no longer mentions `PrmsRouteReuseStrategy` only special-cases `result-detail/:id`.

**Pending to close T-4 (owner, HITL):** local stack or PRTest, center with ≥ 2 uploads, 1280 px — checkbox column does not squeeze title / no horizontal scroll; card-header select-all aligned before the hash, indeterminate visible; sticky bar does not overlap the last row; Tab/Space reach checkboxes and bar, focus ring visible. **Never confirm a discard on real drafts locally (shared prdb + prod mailer)**; real bulk discard only on PRTest with throwaway drafts. Also recommended before PR: client `npm run build` (template type-check not covered by `ng lint`).

#### ABD-T-4 — HITL rework (2026-10-27, after push `7075736c9`)

**HITL findings (Leader, localhost:4200, Bioversity (Alliance) My Drafts, no write clicks):** (1) `mdr-bulk-bar` is `sticky` but renders at the end of the full list (rect top 3851 px vs viewport 1249 px) — the document scrolls, not `#workArea`, so the owner saw "no button"; (2) row/header `hlm-checkbox` 14 px with a faint border, nearly invisible. The 7→6 drop on card `#fedca9e2` was the owner accepting draft 214 into a result (`is_discarded=1`, result status 1) — not a defect.

| Field | Value |
|---|---|
| Implementer | `akili-implementer`, effort `medium` → `high` on retry; skills angular-developer, tailwind-design-system, spartan |
| Reviewer | `akili-reviewer` (≠ Implementer), effort `high` |
| Files | `my-draft-results.component.{html,spec.ts}`, folder `CLAUDE.md` |

**Attempt 1** — bar → viewport-`fixed` wrapper (`bottom-[12px]`, `left: var(--sidebar-width)` from 900 px, `z-30`), 72 px spacer, `aria-live="polite"`; checkboxes `size-[16px] border-[var(--pr-text-muted)]` + indeterminate `bg-primary`; destructive tint `--pr-color-red-*` on "Discard selected" (advisory from T-3). Jest 90/90, lint clean.
Reviewer attempt 1: **STATUS: FAIL**
1. Discovered Issue: indeterminate and checked now look identical — `data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground` paints the same filled primary box as `data-checked:bg-primary`, and the helm template renders the same `lucideCheck` for both states (`hlm-checkbox.ts:58-62`).
   Violated Rule: `requirements.md` ABD-S-2.2 (header shows the indeterminate state); `requirements.md:201` (indeterminate visuals under manual check).
   Remediation Suggestion: keep `data-[state=indeterminate]:border-primary`, replace the fill with something distinct (e.g. `bg-[var(--pr-color-primary-50)] text-primary`); drop indeterminate classes from the row checkbox.
ADVISORY folded into attempt 2: collapsed rail keeps `--sidebar-width` 260 → use `--sidebar-width-icon`; bar offset from 900 px vs sidebar from 768 px → align on `md:`; re-stamp folder doc.

**Attempt 2** — header indeterminate `border-primary bg-[var(--pr-color-primary-50)] text-primary`; row checkbox `size-[16px] border-[var(--pr-text-muted)]` only; wrapper `md:left-[var(--sidebar-width,260px)] md:group-has-[[data-collapsible=icon]]/sidebar-wrapper:left-[var(--sidebar-width-icon,64px)]`; folder doc re-stamped (116 lines). Jest `my-draft-results.component` 90/90 (`--maxWorkers=1`, free RAM 3.7 GB), `ng lint` on touched files clean.
Reviewer attempt 2: **STATUS: PASS** — FAIL resolved; `--pr-color-primary-50` exists (`colors.scss:17`); `data-collapsible="icon"` on `hlm-sidebar` only when collapsed and non-mobile, `group/sidebar-wrapper` is an ancestor of the outlet; collapsed variant specificity (0,2,0) beats `md:left-[...]` (0,1,0) inside the same media query (derived from the Tailwind v4 variant shape, not from compiled CSS).

**ADVISORY (recorded, non-gating):** class-presence tests cannot prove layout → HITL re-check at 1280 px, rail expanded and collapsed; `focusMode()` / `show_qa_full_screen` hide the sidebar but the bar keeps the 260 px offset (cosmetic); **approved deviation** — `design.md` §8.2 says "Sticky at the bottom of … `#workArea`", the code is viewport-`fixed` because the document scrolls → sync `design.md` at `/akili-archive`.

**HITL re-check (Leader, localhost:4200, 2026-10-27, Bioversity (Alliance), selection only — no Discard/Confirm clicks; Chrome window at 2560 CSS px, page zoom ≈ 1.15):**
- Bar: 2 rows ticked → `mdr-bulk-bar` in viewport (rect bottom 1291 / innerHeight 1305), wrapper `position: fixed`, left 246px = `--sidebar-width` (expanded) and 64px with the rail collapsed (`data-collapsible="icon"`), never over the rail; "Discard selected" red `rgb(208,4,22)`. ✓
- Checkboxes: 16 px, border `--pr-text-muted` `rgb(107,101,128)` on the inner `button[role=checkbox]`; header indeterminate = `data-state="indeterminate"`, bg `rgb(245,243,255)` (primary-50), border `rgb(107,70,229)` — visibly distinct from checked (solid). ✓
- Keyboard: Tab/Shift+Tab reach the row checkbox; `:focus-visible` 3 px ring (`ring-ring/50`); Space toggled it (2 → "1 selected"). ✓
- No horizontal scroll at 2560 (doc −15, card tables 0). **1280 px not measured** — `resize_window` does not change the viewport on this machine (maximized window); owner to confirm with DevTools device toolbar.
- Selection cleared afterwards; the rail toggle was restored to expanded.

## 3. Summary (automated tasks complete; T-4 awaiting HITL)

| Task | Status | Attempts | Notes |
|---|---|---|---|
| ABD-T-1 server endpoint + atomic single discard | `[x]` | 1 | 2 parallel lens reviewers, both PASS |
| ABD-T-2 client API + service | `[x]` | 2 | FAIL: missing "kept" `currentDraft` test |
| ABD-T-3 selection UI | `[x]` | 2 | FAIL: select-all placement → moved to card header |
| ABD-T-4 docs + HITL | `[~]` | 2 (docs) | FAIL: 120-line cap → 116; manual check pending |

**Budget (design §1: 4 tasks · ~520 LOC · ≤ 2 review rounds/task):** tasks 4 ✓; review rounds max 2 ✓; **LOC exceeded** — ≈ 520 (T-1) + ≈ 115 (T-2) + ≈ 225 (T-3) + docs ≈ net −4 → ≈ 860 vs ~520. Cause: clause-level tests (T-1 DTO matrix + supertest). Escalated to the owner at the T-1 gate; owner chose to continue ("sigue hasta que termines").

**Open items for the owner:** (1) HITL check above; (2) commit with explicit ABD paths only (foreign changes from another session in the tree); (3) decide whether "all ids failed with `error`" should show a hard error toast instead of the `warn` partial toast (not in spec); (4) ~~ABD-OQ-3 max-drafts-per-job SQL check~~ **closed 2026-10-27**: owner ran it on prod — max 36 drafts/job, avg 9.6, 8 jobs (the 36-draft job has all 36 still active) → cap 100 kept, no change to `BULK_DISCARD_MAX_DRAFTS`; (5) R-7 reading: list reload with the same ids keeps the selection (design §8.1 reading) — confirm; (6) advisories above (destructive tint on "Discard selected", S-6.3 test strength, `catchError`/`tap` order, stale snapshot restore, `BrnCheckbox` mock).
