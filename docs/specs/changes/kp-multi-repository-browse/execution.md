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

### `KPM-T-5` — Merge (round-robin) and dedup (DOI → title|type|year) as pure functions, TDD

| Field | Value |
|---|---|
| Final status | _in progress — see attempts below_ |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `xhigh` (algorithmic core; Leader raised from the `medium` default), skill `tdd` (`nestjs-expert` dropped — pure functions, no Nest surface) |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-R-4` (ordering), `KPM-R-5` (all clauses), `KPM-AC-5`, `KPM-AC-6`, scenario `KPM-R-5`; `KPM-DD-3`, `KPM-DD-4` |
| Ran in parallel with | `KPM-T-3` (disjoint files: `merge.ts`/`merge.spec.ts` vs mapper + spec) |

**Attempt 1 — FAIL**

- Files changed: `cgspace-discovery/merge.ts` (new), `cgspace-discovery/merge.spec.ts` (new, 18 tests). Exports `interleave<T>`, `normalizeDoi`, `normalizeTitle`, `dedupe(items, priorityOrder) → { items, dedupedCount }`.
- Red → green evidence: red `TS2307: Cannot find module './merge' or its corresponding type declarations.` (spec written before `merge.ts` existed); green `Tests: 18 passed, 18 total`. `npx tsc --noEmit -p tsconfig.json` clean; eslint clean after a prettier `--fix`.
- Implementer design note: `dedupe` grouped items with a union-find over the pairwise match rule "so an indirect chain merges transitively".
- Reviewer verdict: **FAIL** (2 issues). Full report:
  1. **Discovered Issue:** `dedupe` merges items with different DOIs through a DOI-less intermediary. With A `{doi 10.1/x, title T, type/year equal}`, B `{doi null, title T}`, C `{doi 10.1/y, title T}`, the union-find in `merge.ts:127-149` produces a single group; A and C collapse into one card and one of them is hidden behind an "Also in" note, so *Use this item* can hand the primary handle of a genuinely different publication to the submitter. `dedupedCount` is also inflated, which propagates to `totalElements = Σ ok − dedupedCount` in `KPM-T-4`. **Violated Rule:** `requirements.md` scenario `KPM-R-5` clause "two items whose titles match and whose DOIs are both present and different must NOT collapse"; `design.md` §5 Dedup "items with two different DOIs never collapse on title"; `tasks.md` `KPM-T-5` verification "same title, both DOIs present and different → two". **Remediation:** drop the transitive closure; group by key — (a) partition DOI-bearing items by exact key₁; (b) group DOI-less items among themselves by key₂; (c) attach a DOI-less group to a key₁ group iff exactly one key₁ group contains a member with an equal key₂; two or more candidates → attach to none. Record the tie rule in `design.md` §5. Keep survivor selection, group ordering, `alsoIn`, `dedupedCount`.
  2. **Discovered Issue:** the 18 tests never contain a DOI-less item sharing key₂ with two different-DOI items, so the green run is not evidence for the clause. **Violated Rule:** `tasks.md` `KPM-T-5` Implements "`KPM-R-5` (all clauses)… scenario all four clauses". **Remediation:** add a red-first case A `{cgspace, doi '10.1000/first'}`, B `{melspace, doi null}`, C `{worldfish, doi 'https://doi.org/10.2000/SECOND'}` with equal key₂; assert A and C are never united.
  - Verified clean: `normalizeTitle` steps, `normalizeDoi` prefixes, `interleave` order, survivor priority, `alsoIn` shape, purity, no input mutation, disqualifier satisfied.
- Leader adjudication: FAIL upheld (the Leader had raised the same hypothesis in the Reviewer brief; the Reviewer traced it independently in the code). Rework attempt 2 spawned with the report verbatim plus one extra positive case (DOI-less item attaches to the single matching DOI group). Effort kept at `xhigh`: the routing rule forbids `max` on a T2 model, and moving the Implementer to `opus` would collapse author ≠ auditor.

**ADVISORY from Reviewer round 1 (recorded — no rework, no new task)**

- Reliability: the no-mutation test uses two items that never collapse, so the only mutating branch (`survivor.alsoIn`) is never executed.
- Readability: `tasks.md` names `dedupKey1/2`; the module exports neither (`dedupKey2` private, key₁ is `normalizeDoi`).
- Resilience: `normalizeDoi` strips only the three spec-listed prefixes; `https://dx.doi.org/` and `http://doi.org/` would degrade a DOI match to a title match.
- Risk: the mapper falls back to `''` for absent title/type, so two DOI-less items with no metadata share key₂ `'||'` and collapse. Candidate for a follow-up proposal, not this spec.

### `KPM-T-3` — Adapter-parameterized mapper

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `medium`, skills `nestjs-expert`, `tdd` (fixture-driven red → green, per the design Skills row) |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-R-8` clauses "metadata mapped with that repository's field names" and "`handleUrl`/`itemUrl` built from that repository's host"; `KPM-AC-13`; `KPM-DD-1` |
| Ran in parallel with | `KPM-T-5` (disjoint files) |

**Attempt 1**

- Files changed: `cgspace-discovery.mapper.ts` (`toPage(hal, adapter)` / `toItem(node, adapter)` read `adapter.fields.*`, `adapter.itemHost`, `adapter.key`; `mapAuthors` ordered concat + de-dup; `affiliations → []` when the adapter declares none; `handleUrl` always `hdl.handle.net`; `countries` stays `cg.coverage.country`), `cgspace-discovery.mapper.spec.ts` (rewritten: pre-change CGSpace snapshot constants + MEL/WorldFish concrete assertions, 12 tests), `cgspace-discovery.service.ts` (one-line call site `toPage(res.data, KP_REPOSITORIES.cgspace)`).
- Red → green: red `error TS2554: Expected 1 arguments, but got 2` × 11 call sites (new spec against the old mapper); green `Tests: 12 passed, 12 total`.
- Implementer verification: whole folder `npx jest --silent --reporters=summary --forceExit …/cgspace-discovery` → `Test Suites: 5 passed · Tests: 71 passed, 71 total` (includes T-5's attempt-1 spec); `npx tsc --noEmit -p tsconfig.json` clean; eslint clean.
- Implementer `Not Done / Assumptions`: the CGSpace regression asserts pre-change fields unchanged **plus** the new `repository: 'cgspace'` field rather than a literal deep-equal. Leader adjudication: the work order mandates `repository = adapter.key`, so the additive field is the spec's requirement; accepted, not scope owed.
- Reviewer verdict: **PASS**. Summary: mapper fully adapter-parameterized per `KPM-DD-1`; the CGSpace snapshot was re-derived by the Reviewer from the fixture bytes through the old hardcoded keys and matches field by field (only delta = mandated `repository`); every MEL/WorldFish assertion re-derived from the fixture bytes is correct; the named failing input (`dc.date.issued` on MEL, absent from the fixture) is caught; no stale single-argument call site remains.

**ADVISORY (4R, recorded — no rework, no new task)**

- Reliability: MEL item 0 also carries `dcterms.issued` with the same value as `dcterms.available`, so a mutation of `melspace.fields.year` to `dcterms.issued` would pass; asserting `items[2].year === 2016` (an item with no `dcterms.issued`) would close it.
- Readability: `CGSPACE_PRE_CHANGE_ITEMS` does not name the fixture/capture date it was derived from.

**Decisions / issues**: none. Budget: 1 Reviewer round. Gate: `auto-approved (pre-approved mode)`.

