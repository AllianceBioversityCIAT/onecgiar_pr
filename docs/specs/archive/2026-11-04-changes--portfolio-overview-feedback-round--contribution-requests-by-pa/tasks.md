# Tasks — Contribution requests by Program/Accelerator (CRP)

## 1. Scope

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` |
| Requirements / Design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Budget | 4 tasks · ~650 LOC · 1 review round per task (T-3 max 2) |
| Branch | `qa-development-2026-ss` (no commit without explicit user go-ahead) |
| Order | T-1 → T-2 (server) ∥ T-3 can start on a fixture after T-2's contract is fixed → T-4 |

## 2. Pre-flight

- [ ] Free RAM ≥ 4 GB before Jest; **`--maxWorkers=2`**, scoped `--testPathPattern` only, one test run at a time; before push, `--findRelatedTests` on changed files.
- [ ] Read `portfolio-overview/CLAUDE.md` (Projects block mount rule, `spartanBrainMock`, `CentersService` mocked in page specs).
- [ ] Browser checks hit the shared prdb: read-only, never click write buttons; never clear browser storage.

## 3. Task list

### CRP-T-1 — Repository facts query

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S (~80 LOC) |
| Depends on | none |
| Requirements | CRP-R-1 (BUT clause: drafts / inactive / inactive result / primary; phase scenario) |
| Design | §5, CRP-DD-1, CRP-DD-3 |
| Skills | `nestjs-expert` |

**Scope:** `ShareResultRequestRepository.getPortfolioContributionRequestFacts(versionId)` + spec. One parameterised SQL per design §5; errors through `_handlersError.returnErrorRepository` like the file's other methods.

**Tests:** query text contains each rule (`request_type = 'contribution'`, `request_status_id IN (1, 2, 3)`, `srr.is_active > 0`, `r.is_active > 0`, `r.version_id = ?`) and `versionId` is passed as a parameter, not interpolated; error path rethrows the handled error.

**What it cannot prove:** that the SQL returns the right rows (presence-assertion only). Behaviour is proven by **V-1** (T-4). Input that must fail: query text with status `4` allowed or without the type filter.

**Done:** `npx jest --maxWorkers=2 --testPathPattern=share-result-request.repository` green; eslint on changed files clean.

### CRP-T-2 — Service aggregation + endpoint + DTO

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~170 LOC) |
| Depends on | CRP-T-1 |
| Requirements | CRP-R-1 (counts, "once in totals", zero-row P/A), CRP-R-2 (server side: pending only, fields), CRP-R-5 |
| Design | §3, §6, §7, CRP-DD-2 |
| Skills | `nestjs-expert`, `api-design-principles`, `tdd` |

**Scope:** `getPortfolioContributionRequests(versionId?)` in RFR service (resolve version → seed P/As → facts → aggregate); route `GET portfolio/contribution-requests` with `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)`, `ValidRoleGuard`, the same `versionId` coercion and Swagger docs; `dto/portfolio-contribution-requests.dto.ts`.

**Tests (red first), fixture:** seed SP01, SP05, SP09; facts: SP01→SP05 pending, SP05→SP01 accepted, SP01→SP05 declined, SP01→X (non-seed) pending.
- SP01 sent pending 2 / declined 1; SP05 received pending 1 / declined 1; SP05 sent accepted 1; SP01 received accepted 1; SP09 all zeros (R-1 zero-row).
- `totals.pending === 2` (each request once, incl. the non-seed one) — **input that must fail:** totals computed as sum of sent + received (would give 3+).
- `pending` has exactly the 2 status-1 requests with code/title/both P/A codes/date (R-2 "must NOT list accepted or declined").
- Unresolvable version → handled error, same shape as `getPortfolioBilateralProjects`.
- Controller: role metadata equals the sibling route's; `versionId` `''`, `'abc'`, `'-1'` → `undefined`.

**Done:** `npx jest --maxWorkers=2 --testPathPattern=results-framework-reporting` green; eslint clean.

### CRP-T-3 — Client block, API method, format helpers

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | L (~330 LOC incl. specs) |
| Depends on | CRP-T-2 (contract) |
| Requirements | CRP-R-2 (list, oldest first, link new tab), CRP-R-3 (states, one request per version/Retry, no `%`, empty scenario), CRP-R-4 (all clauses), CRP-R-6 |
| Design | §8, §9, CRP-DD-4 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` |

**Scope:** interface; `GET_PortfolioContributionRequests` in `results-api.service.ts` (same shape as `GET_PortfolioBilateralProjects`); `contribution-requests.format.ts` + spec; block component `.ts/.html` + spec; copy group `contributions`; `portfolio-filters.ts` section `contributions` (+ spec line).

**Tests:**
- format: sort by received pending desc then code (R-6); `filterByPrograms` keeps only selected codes; `pendingFor('SP05')` returns requests where SP05 is requester **or** approver; pending oldest first; `daysWaiting` with a fixed `now`.
- block: skeleton → ready; error + Retry → second call; changing `programs` input does **not** call the API again (R-4); versionId change → one new call; empty response → empty message, no table (R-3 empty); `textContent` has no `%` (R-3 BUT); totals unchanged + "whole portfolio" note when a program is selected (R-4 IT MUST); not-affected text lists Funding when active (`notAffectedBy('contributions', sel, ['funding'])`); expand button toggles `aria-expanded`; result link has `target="_blank"`.

**Disqualifier:** a spec that mocks `programs` as empty only cannot prove R-4 → FAIL the evidence. Input that must fail: a filter change that triggers `GET_PortfolioContributionRequests` twice.

**Not covered by jsdom:** table layout, column fit at phone width → T-4 browser check.

**Done:** `npm run test:local -- --testPathPattern="contribution-requests|portfolio-filters"` green; eslint clean.

### CRP-T-4 — Mount on the page, guide, V-1

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S (~70 LOC) |
| Depends on | CRP-T-3 |
| Requirements | CRP-R-3 (position, rest of page intact), CRP-R-4 (wiring), CRP-R-7; V-1 for CRP-R-1 |
| Design | §3, §9, CRP-DD-5 |
| Skills | `angular-developer` |

**Scope:** page `.html` mounts the block under `@if (!data.loading())` after Projects, before Results detail; `.ts` adds `contributionsNotAffected`; page spec: block present after Projects and before Results detail, present with 0 result rows; `portfolio-overview/CLAUDE.md` new section (data path, mount, filter rule, received = must answer).

**V-1 (HITL, user runs in prod, SQL pasted inline in chat):** pending/accepted/declined counts per side for one P/A with many requests, plus totals, for the open version — must equal the endpoint response. If they differ, the number is not evidence until explained; report the diff.

**Browser check (read-only, HITL):** block renders after Projects, table readable at 1280 px and 390 px, no horizontal page scroll.

**Done:** page spec green (`--testPathPattern=portfolio-overview.component`); V-1 equal or explained; browser check recorded in `execution.md`.

## 4. Coverage closure

| Clause | Task |
|---|---|
| R-1 counts per side · zero rows · once in totals | T-2 |
| R-1 BUT drafts / inactive / primary · phase scenario | T-1 (presence) + T-4 V-1 (behaviour) |
| R-2 fields · pending only | T-2 |
| R-2 oldest first · link new tab · expand | T-3 |
| R-3 states · one call · no `%` · empty | T-3 |
| R-3 position · rest of page intact | T-4 |
| R-4 all clauses | T-3 (block) + T-4 (wiring) |
| R-5 | T-2 |
| R-6 | T-3 |
| R-7 | T-4 |
