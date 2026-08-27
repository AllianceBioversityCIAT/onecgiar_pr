# Execution Log — `changes/kp-cgspace-browse`

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/kp-cgspace-browse/` (requirements rev 2, design rev 2, tasks) |
| Approval Mode | gated |
| Budget (design §14) | 9 tasks · ~780 LOC incl. tests · 1–2 review rounds |
| Started | 2026-08-26 |
| Branch | `qa-development-2026` (worktree) |
| Triad | Leader: session model (T1) · Implementer: `.claude/agents/akili-implementer.md` (sonnet, T2) · Reviewer: `.claude/agents/akili-reviewer.md` (opus, T3) |
| Standing rule | **Never run a package's full Jest suite locally** (user instruction 2026-08-26) — verification is always `jest <spec-scoped path>`; CI owns the full-suite gate. |

## Task Execution History

### Concurrency incident (2026-08-26, before first task landed)
At Leader start the tree was clean; by the time `tasks.md` was written the working tree already held a near-complete implementation of this spec (server `cgspace-discovery/*`, controller/module, `serverless.yaml`, client `kp-cgspace-browse`, modal changes, api service, snapshots, brain mock spec) **plus unrelated edits in `api/feedback/*`**, authored by another session in the same checkout (violates `.agents/leader.md` concurrency protocol). User decision: **audit the existing work as attempt 1 of each task**; `feedback.*` changes are out of scope and left untouched. Leader's own spawns: `impl-t1` re-captured the fixture (overwrote the untracked one; same 3 items, specs still green), `impl-t5` added click/hidden behaviour to the pre-existing `BrnTabs*` mock block.

### `KPB-T-1` — Record live CGSpace HAL fixture — **PASS** (2026-08-26)
- Attempts: 1 (impl-t1, sonnet, effort medium; skills nestjs-expert, api-design-principles).
- Files: `cgspace-discovery/fixtures/cgspace-search.hal.json`, `fixtures/README.md`.
- Verification: python key check → `679513e4-… 10568/74449 [cg.contributor.affiliation, cg.coverage.country, cg.identifier.doi, dc.contributor.author, dc.identifier.uri, dc.title, dcterms.issued, dcterms.type]`; scoped jest cgspace-discovery 3 suites / 38 tests.
- Findings recorded: accepted year filter forms `f.dateIssued=YYYY,equals` / `[Y TO Y],equals` (ISO timestamp pair → 0 hits); facet values expose `label` (no `value`); DOI comes as full `https://doi.org/…`.
- Not done: MQAP `10947` uuid-URL check inconclusive locally (401 invalid key) → HITL T-9 (JD-21 open).
- Reviewer (rev-server, opus): PASS — fixture captured not fabricated; README cites 10 paths + date; no secrets.

### `KPB-T-2` — Mapper + DTOs — **PASS** (2026-08-26)
- Attempts: 1 (external session; audited as attempt 1).
- Files: `cgspace-discovery/cgspace-discovery.mapper.ts`, `dto/*.ts`, `*.spec.ts`.
- Verification (Leader, scoped): jest results-knowledge-products 4 suites / 56 tests; eslint clean.
- Reviewer: PASS — traversal and keys match design §3.3; DTO rules incl. query-or-filter, size 1–25, repository enum; DTO spec uses `plainToInstance`+`validate()`.

### `KPB-T-3` — CgspaceDiscoveryService — **PASS** (2026-08-26)
- Attempts: 1 (external session; audited as attempt 1).
- Files: `cgspace-discovery/cgspace-discovery.service.ts`, `.spec.ts`.
- Verification: as T-2.
- Reviewer: PASS — fail-soft 502 wrapper for network/500/404/missing env; no-leak asserted on serialized wrapper + logger args; Solr escaping; bounded TTL cache 200/20 with eviction tests; year filter `f.dateIssued=[Y TO Y],equals` (verified form).
- ADVISORY (recorded, no action): fail-soft `response` is `{items:[],page}` not `{}` (deliberate stable shape — client must not branch on `{}`); no explicit ECONNABORTED case (generic catch covers it); caches `public readonly` for tests; Solr `/` not escaped; no `@akili-spec` comments (no repo convention).

### `KPB-T-4` — Controller routes, wiring, env — attempt 1 **FAIL** (2026-08-26)
- Attempt 1 (external session): routes + per-route ValidationPipe, providers, serverless.yaml, infrastructure.md present and correct.
- Reviewer FAIL issues (verbatim in rework brief): (1) controller spec calls `pipe.transform()` directly — would pass without the route's `@Query(new ValidationPipe)`; (2) no Swagger decorators on the new routes; (3) `CGSPACE_DISCOVERY_URL` missing from `README.md` §Environment (line ~162), making the infrastructure.md statement false.
- ADVISORY: 401 curl evidence pending HITL; `ResponseInterceptor` logs `request.url` on 502 (pre-existing).

### `KPB-T-5` / `KPB-T-6` / `KPB-T-7` — client half — attempt 1 **FAIL** (2026-08-26)
- Attempt 1: external session (T-6/T-7 and base of T-5) + impl-t5 (click/hidden behaviour in mock). Leader scoped verification: jest modal folder + mock spec → 3 suites / 60 tests / 1 snapshot; scoped eslint clean.
- Reviewer (rev-client, opus) FAIL — blocking: [T-6] sub-3-char query sent whenever a filter is active (admin default year counts as filter) → server `@Length(3,200)` 400 on first keystrokes (R-2, AC-8, R-10/R-11); [T-6] Center facet fetched once without `prefix` → no type-ahead, list truncated to 50 (R-3, design §4.1). Non-blocking, to fix in same round: [T-6] aria-live wraps only the counter; `doi.org` added to host allow-list undocumented; missing tests for clear-Type→param absent and non-admin has no year control; no `distinctUntilChanged`. [T-7] existing modal spec text rewritten (DoD "existing specs unchanged"); snapshot embeds jsdom `id="root2"` (brittle in isolation); tabs lack `brnTabsContent` panels (no `tabpanel`, dangling `aria-controls`). [T-5] mock exports non-existent `*Directive` aliases.
- Reviewer verified OK: tabs only for KP, Manual panel unchanged vs HEAD, non-KP DOM identical to HEAD (empirically, diff only jsdom id), itemUrl uuid form + regex untouched, body-equality + no Discovery keys, R-13 path, debounce/Enter with fakeAsync, non-admin year lock, copies, chips, allow-list, Tailwind-only, API naming.
- Full report saved: see rework brief (verbatim) in Leader transcript; summary above.

### `KPB-T-4` — attempt 2 **PASS** (2026-08-26)
- Rework (Implementer, sonnet): controller spec now boots a real Nest app (`createNestApplication` + supertest) and hits `GET /cgspace/search` and `GET /cgspace/facets/:name` — `size=100`/`size=101`, non-whitelisted param and `query=ab` → 400 with the service not called; valid calls → 200 with `response.items` and DTO instances/defaults. Mutation proof: with bare `@Query()` the 7 route tests fail. `@ApiTags`/`@ApiOperation`/`@ApiParam` on both routes, `@ApiPropertyOptional` on every DTO field; `CGSPACE_DISCOVERY_URL` added to `README.md` §Environment.
- Verification (Reviewer re-run, scoped): jest results-knowledge-products 4 suites / 56 tests; eslint clean.
- Reviewer (rev-server, opus): PASS. ADVISORY: README wording "defaults to … when unset" is inaccurate — the service has no in-code fallback (unset → `cgspace.config.missing` + 502); reword to "required, no fallback".

### Closure (2026-08-26)
- `KPB-T-5`..`KPB-T-7` (client) and `KPB-T-8`/`KPB-T-9` (gates, HITL): **accepted by the user as working without a further validation pass** ("no es necesario que hagas otra validación, veo que está funcionando bien"). Attempt-1 Reviewer findings for T-5..T-7 (above) are carried as follow-ups in `archive-summary.md` §9; no `test-report.md` / `validation-report.md` was produced. JD-21 (MQAP resolution of a `10947` uuid URL) remains open.

### `KPB-T-4` — attempt 2 **PASS** (2026-08-26)
- Attempt 2 (impl-t4, sonnet, effort high): controller spec rewritten as supertest e2e over a real Nest app (7 route tests: 200 with DTO defaults; 400 for size=100, non-whitelisted, query=ab; facets defaults/size=101); mutation proof — bare `@Query()` fails exactly those 7; Swagger `@ApiTags/@ApiOperation/@ApiParam` + `@ApiPropertyOptional` on both DTOs; `CGSPACE_DISCOVERY_URL` added to `README.md` §Environment.
- Verification: scoped jest results-knowledge-products 4 suites / 56 tests; scoped eslint clean; tsc clean.
- Reviewer (rev-server): PASS, no regression vs design §4.1/§7. ADVISORY: README wording "defaults to … when unset" is false (no in-code fallback → 502) — fix phrase before merge.
- Runtime note: rev-server and impl-client sessions terminated afterwards with "weekly limit" — impl-client (T-5/6/7 rework attempt 2) died mid-work; state assessed below.

### `KPB-T-5` / `KPB-T-6` / `KPB-T-7` — attempt 2 **PASS (Reviewer waived)** (2026-08-27)
- Attempt 2 split: concurrent session resolved the two blocking items (min-length gating `MIN_QUERY_LENGTH=3`, Center prefix type-ahead + `distinctUntilChanged`) and restored the original modal spec text. Leader applied the remaining items inline **with explicit user approval** (subagent usage limit): `doi.org` removed from `ALLOWED_HOSTS` (+ test updated), `BrnTabs*Directive` aliases removed from mock + spec, snapshot switched to `innerHTML` and regenerated scoped (no `id="rootN"`), `brnTabsContent="browse|manual"` on both panels, `aria-live="polite"` on empty/error blocks.
- SCSS overrides for `app-pr-select` kept — recorded as accepted deviation `KPB-DD-8` in design.md.
- Verification (scoped): jest modal folder + mock spec → 3 suites / 62 tests / 1 snapshot; scoped eslint: only the pre-existing `spartanBrainMock.ts:168` `no-input-rename` error (BrnDialogContent, not this spec).
- Reviewer: **re-audit waived by user** ("está funcionando bien"); rev-client's round-1 findings all addressed or recorded (DD-8). Author ≠ auditor not satisfied for attempt 2 — recorded as accepted risk.

### `KPB-T-8` — Scoped gate — **PASS** (2026-08-27)
- Server: jest results-knowledge-products 4 suites / 56 tests; scoped eslint clean; `migration:check` 0 pending (run after T-4 attempt 2; server files unchanged since).
- Client: 3 suites / 62 tests / 1 snapshot; scoped eslint (1 pre-existing error outside spec).
- Coverage thresholds: CI (accepted local gap per user rule).

### `KPB-T-9` — HITL — **PASS (user-declared)** (2026-08-27)
- User verified the feature functionally in the local stack ("veo que está funcionando bien"). Not individually evidenced: DB-row parity Browse vs Manual, dead-host error state, keyboard pass, screenshot vs mockup, MQAP `10947` uuid URL (JD-21). Recorded as accepted gaps for the PR reviewer.

## Summary
All 9 tasks closed on 2026-08-27. Budget: 9 tasks (= budget), LOC well above the ~780 estimate because the concurrent session's implementation is larger (client spec alone +450 lines) — tripwire noted post hoc, not escalated since the user reviewed the result. Review rounds: server 2, client 1 + waived re-audit.

## Constitution Impact: KPB-T-3 / KPB-T-6
- New server sub-module `api/results/results-knowledge-products/cgspace-discovery/` (service, mapper, DTOs, fixtures) — `onecgiar-pr-server/src/CLAUDE.md`/`AGENTS.md` integrations list should mention the CGSpace Discovery proxy next to MQAP.
- New client component `aow-hlo-table-create-modal/components/kp-cgspace-browse/` — first `@spartan-ng/brain/tabs` usage in the app (ux-ui §8 inventory update, `KPB-DD-7`).
- New env var `CGSPACE_DISCOVERY_URL` (serverless.yaml, README, infrastructure.md).
- CodeGraph re-index pending.
