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
| Final status | **PASS** (attempt 2 of 3 — one rework round) |
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

**Attempt 2 — PASS**

- Files changed: `cgspace-discovery/merge.ts` (union-find removed; `dedupe` now partitions DOI-bearing items by exact key₁, DOI-less items by key₂, and attaches a DOI-less group to a DOI group iff exactly one DOI group has a member with an equal key₂ — a tie leaves it on its own card; survivor/order/`alsoIn`/`dedupedCount` unchanged), `cgspace-discovery/merge.spec.ts` (+2 cases: the A/B/C bridge regression, the positive single-group attach; 20 tests), `design.md` §5 Dedup bullet (tie rule recorded: "Grouping is by key, not by pairwise/transitive closure … a DOI-less item joins a DOI group only when exactly one DOI group shares its key₂ — a tie leaves the DOI-less item on its own card").
- Red → green: red `dedupe › a DOI-less item sharing the title with two different-DOI items must NOT bridge them onto one card — Expected: >= 2, Received: 1 — Tests: 1 failed, 19 passed, 20 total` (against the attempt-1 closure); green `Tests: 20 passed, 20 total`. `npx tsc --noEmit -p tsconfig.json` clean; eslint clean after a prettier `--fix`.
- Implementer `Not Done / Assumptions`: none.
- Reviewer verdict (round 2): **PASS**. Summary: the key-based partition with the "exactly one candidate DOI group" rule makes the A→B→C bridge unreachable by construction, not merely untested; the two new red-first cases exercise the real bridge and the positive attach with normalization-dependent keys (case-varied titles, `https://doi.org/` prefix); the 18 earlier cases and all survivor/order/`alsoIn`/`dedupedCount` behaviour are unchanged; purity holds; `design.md` §5 records the tie rule. Round-1 FAIL closed.

**ADVISORY from Reviewer round 2 (recorded — no rework)**

- Reliability: `Math.min(...a)` in the group sort spreads a group's index array; safe at page-local sizes (< 30 items), would hit the argument limit if `dedupe` were reused over a full accumulated set. `a.reduce((m, i) => (i < m ? i : m))` removes the ceiling.

**Decisions / issues**: the grouping/tie rule was under-specified in the design; the Reviewer's remediation clause was adopted and written into `design.md` §5 (spec's own file, exempt from the shared-file discipline). **Budget:** 2 Reviewer rounds on this task (the mandate allows one round and escalation on a *second FAIL*; the second round PASSed, so no escalation). Gate: `auto-approved (pre-approved mode)`.

### Runtime note — 2026-09-10 14:27 (Bogota)

Both Implementers spawned for `KPM-T-4` and the `KPM-T-10` docs half were terminated by the harness with `HTTP 429 — session limit, resets 4:40pm (America/Bogota), model claude-sonnet-5` before writing any file (working tree verified clean). Per the `/akili-execute` runtime-failure fallback (retry once, then degrade by role) and the project's standing practice on sonnet rate limits, the retry uses the Implementer wrapper with a `model: opus` override; to preserve **author ≠ auditor**, the Reviewers for those tasks run on `fable` (session model, fresh context) instead of the wrapper's `opus`. Not a work FAIL; no rework attempt consumed.

### `KPM-T-10` — Config, docs, and HITL smoke on QA — **docs/config half** (task stays `[~]`)

| Field | Value |
|---|---|
| Status | **`[~]` — docs/config half PASS (attempt 1); HITL half owed after `KPM-T-8`/`T-9`** |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` on `opus` (sonnet 429 fallback, see runtime note), effort `low`, skill `aws-serverless` |
| Reviewer | `akili-reviewer` on `fable` (author ≠ auditor kept), lens checklist mode |
| Requirements covered (this half) | `KPM-R-13` (deploy-order independence documented), `KPM-R-10` (docs), design §11 Env; closes the content of `KPB` kaizen pending #1 (server guide env list) |

**Attempt 1 (docs/config half)**

- Files changed: `onecgiar-pr-server/serverless.yaml` (`MELSPACE_DISCOVERY_URL: ${env:…}`, `WORLDFISH_DISCOVERY_URL: ${env:…}` after the CGSpace line), `README.md` §Environment (three Discovery vars, `unconfigured` degradation), `docs/infrastructure.md` Env templates row, `onecgiar-pr-server/src/CLAUDE.md` (new "KP Discovery proxy" bullet), `onecgiar-pr-server/AGENTS.md` (new dependency-map row). `docs/trd/trd.md` untouched.
- Verification: `grep -n "MELSPACE_DISCOVERY_URL\|WORLDFISH_DISCOVERY_URL" onecgiar-pr-server/serverless.yaml README.md docs/infrastructure.md` → 3 files hit (`serverless.yaml:24,25`, `README.md:162`, `docs/infrastructure.md:101`); guides `src/CLAUDE.md:183`, `AGENTS.md:161`.
- Implementer `Not Done / Assumptions`: HITL half not done (owed by design); YAML checked by eye (no parser in sandbox); `docs/specs/kaizen/changes--kp-cgspace-browse.md` pending item #1 not flipped (outside the file list).
- Reviewer verdict: **PASS** (docs/config half). Summary: DoD items 1–3 met; `serverless.yaml` mirrors the CGSpace precedent; README/infrastructure/guide copy accurate to `KPM-R-13` and §10; no secrets; TRD untouched with the pending row recorded. Note: guides describe `unconfigured` ahead of `KPM-T-4` landing it — permitted by `tasks.md` ("docs half can run in parallel from the start"); the HITL half is the live proof.

**Pending (apply on the default branch — shared-file discipline)**

- `docs/trd/trd.md` integrations row → "DSpace Discovery proxy (CGSpace, MELSpace, WorldFish)".
- `docs/specs/kaizen/changes--kp-cgspace-browse.md` pending item #1 (server guide env list) → mark done (content now in both server guides).

**Still owed for `[x]`:** HITL smoke on QA with all three URLs set (MEL-only title, WorldFish-only title, DOI in two repositories, deselect to one chip, one URL blackholed → partial notice + retry, *Use this item* on a MEL item, visual vs mockup, keyboard pass) with screenshots + measured `sources[]` JSON. Pre-flight item "QA env has the two URLs" is a user/infra action (agents never deploy cloud).

### Runtime note — 2026-09-10 ~16:20 (Bogota)

Two Reviewers (`KPM-T-6`, `KPM-T-4` lens B) on `fable` were terminated by `HTTP 429 — session limit, resets 5:40pm (America/Bogota), model claude-fable-5-1` before producing a verdict. `KPM-T-4` lens A completed (PASS, below). At 16:44 the `sonnet` limit had reset; both reviews were relaunched on `sonnet` — the T-4/T-6 Implementers ran on `opus`, so author ≠ auditor holds. No rework attempt consumed.

### `KPM-T-4` — Parallel fan-out, per-source cache, statuses, telemetry, facet union

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3 — both lens Reviewers PASS) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` on `opus` (sonnet 429 fallback), effort `xhigh`, skills `nestjs-expert`, `error-handling-patterns`, `api-design-principles` (`tdd` not assigned — integration wiring against a fully specified test list) |
| Reviewers | parallel lens mode (effort `xhigh` + leak surface): lens A reliability/resilience on `fable` — **PASS**; lens B risk/security/readability — relaunched on `sonnet` after a 429 |
| Requirements covered | `KPM-R-8` (parallel, 8 s per source, own cache key, settled, no hostnames/bodies), `KPM-R-9`, `KPM-R-13`, `KPM-R-22`, `KPM-AC-4/7/9/11/16`; `KPM-DD-2`, `KPM-DD-6`, `KPM-DD-7`; scenario `KPM-R-8` four clauses |
| Ran in parallel with | `KPM-T-10` docs half, then `KPM-T-6` (client package) |

**Attempt 1**

- Files changed: `cgspace-discovery.service.ts` (fan-out `Promise.allSettled` over `searchOne`/`facetOne`; `SourceFailure` classification; ok-only per-source cache 600/60 with `repository` in both keys; merge via `interleave` + `dedupe`; page meta `totalElements = Σ ok − dedupedCount`; `sources[]`; 502 only when every source `timeout|error`, all-`unconfigured` → 200; facet union; telemetry renamed to `kp.discovery.*`; `applyYearFallback` for `KPM-DD-7`), `cgspace-discovery.service.spec.ts` (rewritten, 31 tests), `repositories.config.ts` (`translateParams` body, pure `escapeSolrQuery`), `dto/cgspace-item.dto.ts` (`CgspaceItemDto.repository` required; new `CgspaceMergedSearchPageDto`/`CgspaceMergedPageMetaDto` make `hasMore`/`sources` required at the `search` return boundary; Swagger to `@ApiProperty`), plus `results-knowledge-products.controller.spec.ts:203-204` (stale pre-T-2 `toBe('cgspace')` → `toEqual([...all three])`, Leader-approved fold-in — a T-2 escape: T-2's verification was folder-scoped and never ran the controller spec).
- Implementer verification: `npx jest … cgspace-discovery` → `Test Suites: 5 passed · Tests: 85 passed, 85 total` (stable over 4 runs); KP module `npx jest … results-knowledge-products` → `7 suites / 122 tests` green; `npx tsc --noEmit -p tsconfig.json` clean; eslint clean. Mutation gates (applied, run, reverted): `allSettled → all` → 8 failed incl. (b); cache the failed source → 1 failed ((e‴)/(g)); facet key without `repository` → 3 failed; log the caught Axios error → 3 failed ((f)).
- Implementer `Not Done / Assumptions` and Leader adjudication: (1) controller spec red — folded in (above). (2) `hasMore`/`sources` narrowed via the new Merged DTOs rather than tightened on the base classes (the mapper uses those classes per source) — accepted. (3) mixed `unconfigured` + `timeout|error` with no ok source → 200 — conformant per design §4.1/`KPM-DD-2`/`KPM-R-13` (lens A confirmed). (4) `escapeSolrQuery` moved to `repositories.config.ts`; an adapter without a center facet contributes `ok` with zero values — accepted. (5) `KPM-DD-7` post-filter implemented, untested (no adapter lacks a year facet) — advisory, not a gate (lens A).
- **Reviewer lens A (reliability/resilience) — PASS.** Summary: fan-out, classification, per-source ok-only caching, 502/200 rules, page arithmetic and facet union all match design.md §4.1/§5 and `KPM-R-8/9/13/20`; every (a)–(h) case is asserted by effect with per-call params and rejected-promise failures; mutation gates live. ADVISORY (recorded, no rework): telemetry `outcome` reads `'partial'` when zero sources are ok (mixed unconfigured + failed) — a distinct label such as `'degraded'` would read better on dashboards; `applyYearFallback` is dead code today with no test — a synthetic adapter case would cover it; `resolveRepositories` does not dedupe repeated keys on a direct service call (the DTO transform prevents it); `unionFacetValues` silently drops blank labels (not in design §4.1 — recorded here so the contract note stays accurate).
- **Reviewer lens B (risk/security/readability, `sonnet`) — PASS.** Summary: leak-clean — `classifyFailure`/`normalizeOutcome` reduce every caught Axios error to primitives before it reaches a `SourceFailure`, a body or a log; (c) numeric `upstreamStatus`, (d) once-per-process warn via a `Set`, (f)/(f2) full-response/full-log sweeps for the three hostnames and three env names; 502 copy and `unconfigured` path never name a host or variable (`resolveBaseUrl` logs only `adapter.key`); all five old `cgspace.*` events gone, the four new ones match design §9/§4.1 field-for-field; `escapeSolrQuery` byte-identical to the relocated logic; dead `?? 'cgspace'` fallback gone; controller-spec assertion correctly updated. ADVISORY (recorded, no rework): `kp.discovery.year_postfiltered` is a sixth telemetry event not in design §9 (payload = counts only, no leak surface, path unexercised today) — **pending spec sync for `/akili-archive`: add it to `design.md` §9's event list.**

**Decisions / issues**: parallel lens mode used (xhigh + security surface); Reviewer models diverged from the wrapper (`fable`, then `sonnet`) because of the rate limits — author ≠ auditor preserved in every round. Budget: 1 Reviewer round (two lenses). Gate: `auto-approved (pre-approved mode)`.


### `KPM-T-6` — Client: repository constants, API params, source strip with selection rules

| Field | Value |
|---|---|
| Final status | _in progress — Reviewer relaunched on `sonnet` after a 429_ |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` on `opus` (sonnet 429 fallback), effort `high`, skills `angular-developer`, `frontend-design` |
| Requirements covered | `KPM-R-1`, `KPM-R-2` (all clauses), `KPM-R-3` (client half), `KPM-R-6` (chip states), `KPM-R-11` (placeholder/idle), `KPM-R-14` (idle/loading), `KPM-R-21`, `KPM-AC-1/2/3`; `KPM-DD-8`, `KPM-DD-9` |
| Ran in parallel with | `KPM-T-4` (server package — disjoint files, separate `node_modules`) |

**Attempt 1**

- Files changed: `kp-cgspace-browse/kp-repositories.constants.ts` (new — `KpRepository`, `KpRepositoryStatus`, `KP_REPOSITORIES`, `ALL_KP_REPOSITORIES`, `KP_ITEM_HOSTS`, `kpRepositoryLabel`), `kp-cgspace-browse.component.ts` (`selectedRepositories`/`sources` signals, `repositoryChips` computed, `toggleRepository`, `selectAllRepositories`, `facetReload$` debounce, `repository` in `buildSearchParams`, `sources` set from every response, lucide icons via `provideIcons`), `.component.html` (source strip; generalized placeholder/idle/loading copy), `.component.spec.ts` (5 assertions updated, 7 tests added → 38), `shared/services/api/results-api.service.ts` (`GET_cgspaceFacet(name, prefix?, size?, repositories?)`).
- Implementer verification: component spec `Tests: 38 passed, 38 total`; mutation check (last-chip guard relaxed + `repository` dropped from params) → `6 failed, 32 passed`, restored → 38; `npx tsc --noEmit -p tsconfig.app.json` exit 0; `npx ng lint --quiet` → `All files pass linting.`; hosts + api-service suites `10 passed / 738 tests`.
- Implementer `Not Done / Assumptions`: placeholder/idle copy taken from `proposal.md`; loading string `Searching the selected repositories…` is the Implementer's (R-14 idle/loading is T-6's per the coverage map); facet re-run uses its own `facetReload$` debounce rather than the search pipeline; `KP_ITEM_HOSTS` defined for T-7, `ALLOWED_HOSTS` untouched; idle branches clear `sources()`; reset-on-close tested via `fixture.destroy()` + re-create (the pr-dialog body is under `@if (visible)`). Leader: all passed to the Reviewer for adjudication (facet-pipeline reading and reset test meaningfulness flagged explicitly).
- Reviewer: _pending._

