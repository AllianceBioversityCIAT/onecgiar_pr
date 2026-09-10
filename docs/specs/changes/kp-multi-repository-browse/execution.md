# Execution Log — Browse Knowledge Products across CGSpace, MELSpace and WorldFish

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-multi-repository-browse/` · Module code `KPM` |
| Linked | `requirements.md` · `design.md` · `tasks.md` · `judgment.md` |
| Approval Mode | pre-approved (routine gates logged `auto-approved (pre-approved mode)`; HALT / Pivot / tripwire / `FATAL_FAIL` / `PRODUCT_BUG` stop) |
| Budget (design.md §14) | 10 tasks · ~1,250 LOC incl. tests · ≤ 1 Reviewer round per task; tripwire > 12 tasks or > 1,500 LOC |
| Leader | Claude Fable 5.1 (session model; registry T1 row still says `opus` — newer session model passes silently, registry row flagged for update at archive) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (`sonnet`) / `.claude/agents/akili-reviewer.md` (`opus`) — author ≠ auditor by wrapper binding |
| Branch / checkout | `qa-development-2026` (shared worktree — explicit-path commits only) |
| Started | 2026-09-10 |
| Status | in-progress |

### Pre-flight (2026-09-10)

- Discovery hosts reachable from the dev machine: CGSpace, MELSpace, WorldFish all answer HTTP 200 on `discover/search/objects`.
- No other active spec under `docs/specs/` references `results-knowledge-products` or `kp-cgspace-browse` (checklist item ticked by the Leader).
- Local `onecgiar-pr-server/.env` carries `CGSPACE_DISCOVERY_URL` only; the two new URLs are not needed for `KPM-T-1` (captures use `curl` against the public hosts) and are owed before the `KPM-T-10` HITL.
- Working tree carries unrelated modifications from other sessions (dashboard-lab, shell-topbar, spartan sidebar, styles). This run commits by explicit path only.

## Task Execution History

### `KPM-T-1` — Capture MELSpace and WorldFish Discovery fixtures and pin the adapter table

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `medium`, skills `nestjs-expert` (task list followed; `tdd` not assigned — fixture/config task) |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-R-10`, `KPM-AC-13` (fixture half); feeds `KPM-DD-1`, `KPM-DD-6`, `KPM-DD-7` |

**Attempt 1**

- Files changed: `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/fixtures/melspace-search.hal.json` (new, raw capture, 5 items), `worldfish-search.hal.json` (new, raw capture, 5 items), `melspace-facets.json` + `worldfish-facets.json` (new; three raw captures each — facet index, `itemtype`, `institute` — nested under fixed keys by a script, values untouched), `fixtures/README.md` (§7 added: commands, UTC timestamp, hosts, confirmed keys), `fixtures/fixtures-keys.spec.ts` (new, 4 tests), `design.md` §3.3 rows 69–70 pinned + §13 bullet.
- Implementer verification: `npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products/cgspace-discovery/fixtures` → `Test Suites: 1 passed, 1 total · Tests: 4 passed, 4 total`; `npx eslint "src/api/results/results-knowledge-products/cgspace-discovery/**/*.ts" --quiet` → clean.
- Implementer `Not Done / Assumptions`: (1) the two `-facets.json` files are not byte-identical to a single `curl` call — the task names one filename per host but asks for three endpoint captures per host; the three raw captures were parsed and nested under `facetsIndex` / `itemtypeFacet` / `instituteFacet` without editing any value. (2) MEL affiliation field is `cg.contributor.center`, not the design's guess `cg.contributor.affiliation`.
- Leader adjudication: (1) accepted — the disqualifier targets hand-edited values; the Reviewer confirmed the nesting is visible only as compaction and every README count matches the bytes. Not scope owed. (2) is the task doing its job (pin from captures); design.md §3.3 updated accordingly.
- Reviewer verdict: **PASS**. Summary: the four fixtures are faithful live captures — every README §7.1/§7.2/§7.3 claim checked against the bytes matches, the search files retain raw untrimmed DSpace HAL, and the disclosed facet nesting is visible only as compaction. `design.md` §3.3 is fully pinned; the `cg.contributor.center` correction is provably right (MEL has no `cg.contributor.affiliation` at all); no disqualifier triggers.

**Pinned adapter values (for `KPM-T-2`/`T-3`)**

| Cell | MELSpace | WorldFish |
|---|---|---|
| Affiliation field | `cg.contributor.center` | `cg.contributor.affiliation` |
| URI field | `dc.identifier.uri` | `dc.identifier.uri` |
| Type facet / Center facet | `itemtype` / `institute` | `itemtype` / `institute` |
| Year filter | `f.dateIssued=[Y TO Y],equals` (works) | `f.dateIssued=[Y TO Y],equals` (works) |
| `KPM-DD-7` post-filter fallback | not needed | not needed |

**ADVISORY (4R, recorded — no rework, no new task)**

- Readability/Reliability: README §7.1 row 1 and §7.2 say MEL carries `cg.identifier.doi` on "2 of 5" items; the fixture has it on 3 of 5 (items 1, 3, 5). A DOI-less MEL item still exists, so no downstream gate breaks.
- Readability: `design.md` §3.3 row 70 records the WorldFish year probe as "from 1946/6115 to 506"; the `/6115` figure is not sourced by any capture.
- Risk (low): `fixtures-keys.spec.ts` never asserts the *absence* of `cg.contributor.affiliation` on MEL; a negative assertion would make the design-guess reversion fail a test.

**Decisions / issues**: none beyond the adjudication above. Budget: 1 Reviewer round (within the ≤ 1 mandate). Gate: `auto-approved (pre-approved mode)`.

### `KPM-T-2` — Adapter registry and DTO contract (`repository` list, `sources[]`, item `repository`/`alsoIn`)

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `medium`, skills `nestjs-expert`, `api-design-principles` (task list followed) |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-R-8` (contract + validation clauses), `KPM-AC-10`; `KPM-DD-1`, `KPM-DD-5`; design §15 row 1 (reversion challenge closed) |

**Attempt 1**

- Files changed: `cgspace-discovery/repositories.config.ts` (new — `KP_REPOSITORY_VALUES`, `KpRepository`, `ALL_REPOSITORIES`, `RepositoryAdapter`, `KP_REPOSITORIES` filled from the pinned §3.3 table, `normalizeRepositoryParam`, `translateParams` skeleton), `dto/cgspace-search-query.dto.ts`, `dto/cgspace-facet-query.dto.ts` (`repository?: KpRepository[]` with Transform + `@IsArray/@ArrayMinSize(1)/@IsIn(each)`; `size` documented per source), `dto/cgspace-item.dto.ts` (`repository?`, `alsoIn?`, `CgspaceAlsoInDto`, `SourceStatusDto`, `page.hasMore?`, `sources?`), `dto/cgspace-search-query.dto.spec.ts` (reversion case → `foo`; six cases through the controller's `ValidationPipe`), `results-knowledge-products.controller.ts` (Swagger text only).
- Implementer verification: `npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products/cgspace-discovery` → `Test Suites: 4 passed, 4 total · Tests: 48 passed, 48 total`; `npx tsc --noEmit -p tsconfig.json` → clean; `npx eslint "src/api/results/results-knowledge-products/**/*.ts" --quiet` → one **pre-existing** prettier error at `results-knowledge-products.service.ts:1471` (file untouched by this task; Leader confirmed via `git diff`).
- Implementer `Not Done / Assumptions`: (1) `CgspaceItemDto.repository`, `CgspacePageMetaDto.hasMore`, `CgspaceSearchPageDto.sources` typed **optional** so mapper/service compile unchanged (their files belong to T-3/T-4). (2) `translateParams` is a skeleton (dsoType/page/size) per the task wording; body lands in T-4.
- Leader adjudication: both accepted as staging decisions, not scope owed. **Forward pointer → `KPM-T-3`/`KPM-T-4`:** tighten `repository`, `hasMore`, `sources` to required once populated.
- Reviewer verdict: **PASS**. Summary: registry reproduces `design.md` §3.3 rows 68–70 cell-for-cell; the CGSpace row reproduces today's live param names; the `repository` list contract matches `KPM-R-8`, `KPM-AC-10`, §7 and `KPM-DD-5`; the six new cases run through a real `ValidationPipe` with the controller's exact options, so the disqualifier does not trigger. Route paths untouched.

**ADVISORY (4R, recorded — no rework, no new task)**

- Reliability: the three rejection cases use bare `.rejects.toThrow()`; `toThrow(BadRequestException)` would pin the 400 that `KPM-AC-10` names.
- Reliability — **forward pointer → `KPM-T-4`:** `cgspace-discovery.service.ts` `buildFacetCacheKey` keys on `(name, prefix, size)` only; design §4.1 facets Cache row requires `(name, prefix, size, repository)`. T-4's verification list never asserts the facet key — add that assertion.
- Reliability — **forward pointer → `KPM-T-4`:** `buildSearchCacheKey` now serializes an array with a dead `?? 'cgspace'` fallback; replace with the per-source key.
- Readability: `cgspace-item.dto.ts` repeats the literal `['cgspace','melspace','worldfish']` in four Swagger enums instead of importing `KP_REPOSITORY_VALUES`.

**Other pre-existing finding (not this task's):** prettier error at `results-knowledge-products.service.ts:1471` — **forward pointer → `KPM-T-8`** (the only task that edits that file) to fix in passing.

**Decisions / issues**: none. Budget: 1 Reviewer round. Gate: `auto-approved (pre-approved mode)`.

