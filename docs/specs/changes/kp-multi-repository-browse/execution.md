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
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` on `opus` (sonnet 429 fallback), effort `high`, skills `angular-developer`, `frontend-design` |
| Requirements covered | `KPM-R-1`, `KPM-R-2` (all clauses), `KPM-R-3` (client half), `KPM-R-6` (chip states), `KPM-R-11` (placeholder/idle), `KPM-R-14` (idle/loading), `KPM-R-21`, `KPM-AC-1/2/3`; `KPM-DD-8`, `KPM-DD-9` |
| Ran in parallel with | `KPM-T-4` (server package — disjoint files, separate `node_modules`) |

**Attempt 1**

- Files changed: `kp-cgspace-browse/kp-repositories.constants.ts` (new — `KpRepository`, `KpRepositoryStatus`, `KP_REPOSITORIES`, `ALL_KP_REPOSITORIES`, `KP_ITEM_HOSTS`, `kpRepositoryLabel`), `kp-cgspace-browse.component.ts` (`selectedRepositories`/`sources` signals, `repositoryChips` computed, `toggleRepository`, `selectAllRepositories`, `facetReload$` debounce, `repository` in `buildSearchParams`, `sources` set from every response, lucide icons via `provideIcons`), `.component.html` (source strip; generalized placeholder/idle/loading copy), `.component.spec.ts` (5 assertions updated, 7 tests added → 38), `shared/services/api/results-api.service.ts` (`GET_cgspaceFacet(name, prefix?, size?, repositories?)`).
- Implementer verification: component spec `Tests: 38 passed, 38 total`; mutation check (last-chip guard relaxed + `repository` dropped from params) → `6 failed, 32 passed`, restored → 38; `npx tsc --noEmit -p tsconfig.app.json` exit 0; `npx ng lint --quiet` → `All files pass linting.`; hosts + api-service suites `10 passed / 738 tests`.
- Implementer `Not Done / Assumptions`: placeholder/idle copy taken from `proposal.md`; loading string `Searching the selected repositories…` is the Implementer's (R-14 idle/loading is T-6's per the coverage map); facet re-run uses its own `facetReload$` debounce rather than the search pipeline; `KP_ITEM_HOSTS` defined for T-7, `ALLOWED_HOSTS` untouched; idle branches clear `sources()`; reset-on-close tested via `fixture.destroy()` + re-create (the pr-dialog body is under `@if (visible)`). Leader: all passed to the Reviewer for adjudication (facet-pipeline reading and reset test meaningfulness flagged explicitly).
- **Reviewer (`sonnet`) — PASS.** Summary: strip, selection rules and the `repository` param match `KPM-R-1/2/3/6/11/14/21`, `AC-1/2/3`, design §6.2/§6.3, `KPM-DD-8/9`; the 38 tests assert `aria-pressed`/`aria-disabled`/`title` via `getAttribute` and request payloads via `objectContaining`, every debounce case advances `tick(400)` including the no-request cases; mutation evidence confirms load-bearing tests. Adjudications: (1) separate `facetReload$` debounce is an acceptable reading of "debounced through the same pipeline" (same 400 ms + distinct policy; the search pipeline emits searches) — not a violation; (2) reset-on-close test is meaningful — verified `aow-hlo-create-modal.component.html:80-81` keeps the panel mounted with `[hidden]` across Browse ↔ Manual (`KPB-DD-5`) while `pr-dialog.component.html:1` `@if (visible)` destroys the tree on close; (3) chip classes and lucide icons conform to §6.3. ADVISORY (recorded, no rework): strip container uses `gap-x-[10px] gap-y-[8px]` vs the design's `gap-[8px]` (cosmetic, 2 px); the 400 ms debounce constant is now duplicated between the search pipeline and `facetReload$`.

**Decisions / issues**: none. Budget: 1 Reviewer round (after one runtime 429 kill). Gate: `auto-approved (pre-approved mode)`.


## Budget Tripwire — 2026-09-10 (after `KPM-T-6`)

`design.md` §14 / `tasks.md` Document Control: **10 tasks · ~1,250 LOC incl. tests · tripwire > 12 tasks or > 1,500 LOC → stop and escalate.**

| Measure | Budget | Actual after T-1..T-6 + T-10 docs half | Delta |
|---|---|---|---|
| Tasks | 10 | 10 (6 `[x]`, 1 `[~]`, 3 `[ ]`) | 0 |
| LOC (code + tests, JSON fixtures excluded) | ~1,250 · tripwire 1,500 | committed spec commits: +3,817 / −812 → **≈ 3,000 net** | **+1,750 net over budget, +1,500 over the tripwire** |
| of which production code | (server ~500 + client ~430 estimated) | ≈ 800 net (server ~600, client ~250 so far) | within estimate |
| of which tests | (implied ~300) | ≈ 2,200 net (`cgspace-discovery.service.spec.ts` alone +1,572 / −460) | **the overrun** |
| Remaining estimate | — | T-7 ~200 · T-8 ~160 · T-9 ~100 · T-10 HITL 0 → ≈ +460 | final ≈ 3,450 net |

**Cause:** test volume. Every task's verification list mandated a large enumerated case set with disqualifiers (T-4 alone: cases (a)–(h) plus (e′)/(e″)/(e‴), four mutation gates; T-5: 20 red-first cases; T-6: 38 tests with a mutation check). The production code tracks the estimate; the tests are 6–7× the implied test budget. Reviewer rounds: 8 rounds over 7 tasks (T-5 needed a rework round) — within the ≤ 1-round mandate except T-5, which PASSed on round 2 without escalation.

**Leader action:** per `/akili-execute` Step 2.4, execution stops here for the user's decision. Working tree is clean for spec files; every completed task is committed with PASS evidence. Next eligible task on resume: `KPM-T-7` (client badges, notice, retry, allow-list, Load more).

**User decision (2026-09-10):** *Continue as-is* — overrun accepted as mandated test volume; T-7, T-8 ∥ T-9, then the T-10 HITL proceed under the original briefs. Budget note kept for the archive kaizen.

### `KPM-T-7` — Client: badges, "Also in", counter, partial notice with retry, error copy, allow-list, Load more

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 of 3 — one rework round, test-only) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `high` → `xhigh` on retry, skills `angular-developer`, `frontend-design` |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-R-4`, `KPM-R-5` (client), `KPM-R-6`, `KPM-R-7` (all clauses), `KPM-R-11`, `KPM-R-14`, `KPM-R-15`, `KPM-R-20`, `KPM-R-23`, `KPM-AC-5/7/8/17`; scenario `KPM-R-7` (client) |

**Attempt 1 — FAIL (verification gap only)**

- Files changed: `kp-cgspace-browse.component.ts` (`failedSources()`, `resultsCounterText()`, `hasMore` from `page.hasMore`, `retrySearch()` re-sends the full selection at page 0, `ALLOWED_HOSTS = KP_ITEM_HOSTS`, `openItemDetails` chain kept with `'_blank','noopener,noreferrer'`, `alsoIn` on the client DTO, `lucideSplit`/`lucideRefreshCw` provided, internal `CGSpace proxy error` → `Repository proxy error`), `.component.html` (per-card badge dot + label, "Also in <label>" + secondary handles, counter over ok sources, amber `role="status"` notice with one `Retry <Label>` pill per failed source, generalized empty/error copy with Manual entry link, overlay `Retrieving metadata from {{ label }}…`, Load more iff `hasMore()`), `.component.spec.ts` (46 tests: 38 + 8; three pre-existing copy assertions and the Load-more fixtures updated for the new contract).
- Implementer verification: `Tests: 46 passed, 46 total`; `npx tsc --noEmit -p tsconfig.app.json` clean; `npx ng lint --quiet` → `All files pass linting.`; `grep -n CGSpace` over the component `.ts`/`.html` → only the idle enumeration line (`html:177`).
- Copy: counter `Showing N of M items · <label> <count> …` (ok sources only); notice `<failed labels> did not respond. Results below exclude it|them.`; error `Repository search is temporarily unavailable` / `<selected labels> did not respond — use Manual entry.`; empty `No items found in the selected repositories for this search. Try different terms or use Manual entry.`.
- Implementer `Not Done / Assumptions`: `ALLOWED_HOSTS` kept as a `readonly` alias of `KP_ITEM_HOSTS`; three pre-existing copy assertions plus the Load-more fixtures updated for the new contract; internal error string generalized for the T-8 gate; retry buttons all call `retrySearch()` (server decides what is re-queried). Leader: accepted.
- Reviewer verdict: **FAIL** (1 issue). Confirmed PASS on the seven Leader judgment points: error only on the 502 wrapper (`ts:542`), mixed ok/failed stays `results`; counter exact `Showing 2 of 24 items · CGSpace 18 · MELSpace 6` via `toBe`; allow-list four positive + one negative with `noopener,noreferrer`; Load more gates on `hasMore()` alone; no CGSpace-only copy left; counter and notice inside the single `aria-live="polite"` region; badges render dot + text. Issue: **Discovered Issue** — the primary repository badge is rendered but never asserted (`grep kp-item-badge` in the spec → nothing); the `KPM-R-5` test covers 2 of the scenario's 3 clauses; a regression dropping the badge keeps 46 tests green. **Violated Rule** — `KPM-R-4` ("Every card MUST carry a repository badge"), scenario `KPM-R-5` ("the CGSpace badge"), `KPM-AC-5`, §7 Accessibility ("badges carry text, not color alone"). **Remediation** — assert `[data-test="kp-item-badge-cgspace"]` exists with text containing `CGSpace` in the `KPM-R-5` test; no production change.
- Leader adjudication: FAIL upheld (a test gap on a MUST clause). Rework attempt 2 spawned with the report verbatim plus: assert every card's badge text in the mixed test; verify the `data-test` name against the template; prove the assertion with a template mutation (red → green).

**ADVISORY from Reviewer round 1 (recorded — no rework, no new task)**

- Resilience (**design-level gap, carry to the `KPM-T-10` HITL**): with `sources = [cgspace ok / 0 items, worldfish timeout]` the panel shows `empty` with **no notice and no retry** — only the chip reads "unavailable". This follows design §6.2 verbatim (`@if (failedSources().length && items().length)`); candidate follow-up proposal: render the notice above the empty state too.
- Readability: `ALLOWED_HOSTS` is now a pure alias of `KP_ITEM_HOSTS`; a rename or a one-line comment would stop a future host being added in the wrong place.
- Reliability: `hasMore` defaults to `false`, so a response lacking `page.hasMore` hides Load more — correct per `KPM-R-20`, noted for the HITL.
- Readability: `role="status"` inside an `aria-live="polite"` ancestor (both mandated by design §6.3) may announce twice on some screen readers — noted for the HITL a11y pass.

**Attempt 2 — PASS**

- Files changed: `kp-cgspace-browse.component.spec.ts` only — badge assertions added: `KPM-R-5` dedup test asserts `[data-test="kp-item-badge-cgspace"]` present with text containing `CGSpace`; `KPM-R-7`/`AC-7` mixed test asserts both `kp-item-badge-cgspace` (`CGSpace`) and `kp-item-badge-melspace` (`MELSpace`). No production code changed (template restore verified byte-identical).
- Mutation evidence: `@if (item.repository)` → `@if (false)` around the badge → `Tests: 2 failed, 44 passed, 46 total`; restored → `Tests: 46 passed, 46 total`. `npx tsc --noEmit -p tsconfig.app.json` clean; `npx ng lint --quiet` → `All files pass linting.`
- Reviewer verdict (round 2, same Reviewer, context intact): **PASS**. Summary: the round-1 issue is closed with text assertions (not `badgeClass`), so `KPM-R-4`, the badge clause of scenario `KPM-R-5`/`KPM-AC-5` and §7 "text, not colour alone" are behaviourally covered; the 2-failure mutation proves the checks are not vacuous; every round-1 PASS finding stands. Round-1 advisories carried unchanged (recorded above).

**Decisions / issues**: none beyond the test gap. **Budget:** 2 Reviewer rounds (round 2 PASSed — no escalation). Gate: `auto-approved (pre-approved mode)`.

### `KPM-T-9` — Cypress CT sweep of the browse component (chip row wraps, no overflow, notice renders)

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 of 3 — one rework round) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `medium` → `high` on retry, skill `angular-developer` |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-AC-15`; NFR Responsiveness / Accessibility (`requirements.md` §7); `design.md` §6.3 responsive line |
| Ran in parallel with | `KPM-T-8` (hosts + server copy; Jest only — CT dev server on port 8091 is this task's alone) |

**Attempt 1 — FAIL**

- File added: `kp-cgspace-browse/kp-cgspace-browse.cy.ts` — mounts `KpCgspaceBrowseComponent` with a `useValue`-stubbed `ResultsApiService` (sources cgspace ok/18, melspace ok/6, worldfish timeout/0; two CGSpace items, one with `alsoIn` melspace; facets empty), types `maize`, waits on `[data-test="kp-results-counter"]`, sweeps 1536 / 840 / 375 with the exemplar's `assertEffectiveWidth` (≤ 4 px).
- Command: `CT_DEV_SERVER_PORT=8091 ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.cy.ts`
- Run output (verbatim):
  ```
  KpCgspaceBrowseComponent — Cypress CT (KPM-T-9)
    effective 1536px — desktop
      ✓ KPM-AC-15: no horizontal document overflow at 1536px (772ms)
      ✓ KPM-R-7: the partial notice names WorldFish and the repository badges render (602ms)
    effective 840px — tablet
      ✓ KPM-AC-15: no horizontal document overflow at 840px (584ms)
      ✓ KPM-R-7: the partial notice names WorldFish and the repository badges render (581ms)
    effective 375px — mobile
      ✓ KPM-AC-15: no horizontal document overflow at 375px (589ms)
      ✓ KPM-R-7: the partial notice names WorldFish and the repository badges render (593ms)
      ✓ KPM-AC-15: the chip row wraps at 375px — strip height exceeds one chip, every chip >= 24px tall (603ms)
  7 passing (5s)
  ✔ All specs passed! 7 7 - - -
  ```
  Primeicons / `TS2322 ct-utils` noise present (known, non-blocking); run reached "All specs passed" — conclusive. `assertEffectiveWidth` ≤ 4 px held at all three widths. `npx tsc --noEmit -p tsconfig.app.json` clean (CT spec outside that program, confirmed via `--listFiles`); `npx ng lint --quiet` clean.
- Implementer `Not Done / Assumptions`: the `flex-nowrap` mutation probe was not run (the Leader's brief forbade editing the component; the task's "you may prove it" is optional).
- Reviewer verdict: **FAIL** (2 issues). Checklist PASS on effective-width guard, document-level overflow assertion, visible-by-text notice/badges, real `results` state with a failed source, no HTTP, exemplar conventions. Reviewer's mutation reasoning: the *overflow* gate is failure-capable under `flex-nowrap` (min-content ≈ 520 px vs 355 px, no clipping ancestor); the *wrap* gate is not. **Issue 1 — Discovered Issue:** the 375 px wrap assertion compares strip height to one chip height; with `p-[10px]` on the strip and `h-[30px]` chips an unwrapped row measures 50 px and already passes; it would pass at 1536 px and under `flex-nowrap`; the `>= 24` chip check is satisfied by the literal `h-[30px]`. **Violated Rule:** `KPM-AC-15` "chip row wraps", §7 Responsiveness, design §6.3 "at 375 px chips wrap to two rows", §10 CT bullet. **Remediation:** assert row occupancy — distinct rounded `top` values across the chips ≥ 2 at 375 and exactly 1 at 1536. **Issue 2 — Discovered Issue:** DoD requires the run output pasted into `execution.md`; no `KPM-T-9` entry existed at review time. **Violated Rule:** `tasks.md` § `KPM-T-9` DoD. **Remediation:** append the verbatim summary and the port-8091 command (done above by the Leader — the entry is written at finalize by design; recorded here so the trail shows the Reviewer's check).
- Leader adjudication: issue 1 upheld (tautology on a MUST clause — the exact pattern project memory warns about); issue 2 is the Leader's own finalize step, satisfied by this entry. Rework attempt 2 spawned with the report verbatim; row-occupancy form required, with the instruction to report measured `top` values rather than loosen the assertion if the harness does not wrap the chips.

**Attempt 2 — PASS**

- File changed: `kp-cgspace-browse.cy.ts` only. Wrap gate replaced by row occupancy over the three `[data-test^="kp-repo-chip-"]` buttons: `tops = chips.map(c => Math.round(c.getBoundingClientRect().top)); rowCount = new Set(tops).size` → 375 px `expect(rowCount).to.be.at.least(2)`; new 1536 px inverse `expect(rowCount).to.eq(1)`; `>= 24 px` chip check kept in the shared helper. Scope decision documented in-file: the lead-in span and the conditional `ml-auto` Select-all are excluded (design §6.3 "chips wrap to two rows"). `cy.log` inside `.should()` threw (`CypressError: invoked a command inside the callback`) → `Cypress.log` + `console.log`.
- Measured (temporary diagnostic, reverted): 1536 px → `tops=[11,11,11] rows=1`; 375 px → `tops=[38,38,76] rows=2` — the third chip drops to a second row; wrap observed, not assumed.
- Run (same port-8091 command as attempt 1): `8 passing (5s)`, 0 failing — the 7 attempt-1 cases plus the 1536 px inverse. `npx ng lint --quiet` → `All files pass linting.`
- Reviewer verdict (round 2, same Reviewer): **PASS**. Summary: the tautology is closed — `rowCount` changes only when chips land on different lines; the 375 `>= 2` / 1536 `=== 1` pair proves the breakpoint in both directions and is failure-capable under `flex-nowrap` and under an always-wrap regression without touching the component; measurements consistent with the 30 px chip + 8 px `gap-y` geometry; scope exclusion accepted and documented; round-1 items 1, 2, 4–7 unchanged; issue 2 resolved by this entry. ADVISORY: refresh the pasted run output to the attempt-2 count — done above (`8 passing`).

**Decisions / issues**: `flex-nowrap` mutation probe not run (component edit forbidden while T-8 ran); the row-occupancy form is failure-capable by construction per the Reviewer. **Budget:** 2 Reviewer rounds (round 2 PASSed — no escalation). Gate: `auto-approved (pre-approved mode)`.

### `KPM-T-8` — Hosts and server copy: banner by repository, generalized strings, grep gate

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 2 of 3 — one rework round, test-only) |
| Date | 2026-09-10 |
| Implementer | `akili-implementer` (`sonnet`), effort `medium` → `high` on retry, skills `angular-developer`, `nestjs-expert` |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `KPM-R-11` (all surfaces), `KPM-R-12` (all clauses), `KPM-AC-12`, `KPM-AC-14`; scenario `KPM-R-12` |
| Ran in parallel with | `KPM-T-9` (CT sweep) |

**Attempt 1 — FAIL**

- Files changed: `lab-report-form.component.{ts,html,spec.ts}` + `lab-report-form/CLAUDE.md` (stale "Browse CGSpace oculta" note rewritten, `Verified:` re-stamped), `aow-hlo-create-modal.component.{ts,html,spec.ts}`, `report-result-form.component.{ts,html,spec.ts}`, `result-creator.component.html`, `change-result-type-modal.component.html` ("Title retrieved from the repository"), server `results-knowledge-products.service.ts` (four `findOnCGSpace` messages → repository-neutral; prettier reflow at `:1468-1471`, formatting only) + `.spec.ts`, new `onecgiar-pr-client/scripts/kp-copy-gate.sh`. Hosts: `selectedKpRepository` (default `cgspace`), banner `Selected from {{ label }}`, `Retrieving metadata from {{ label }}…`, tab **Browse repositories**, `Invalid repository item URL`; `report-result-form` `kpAlertDescription` "added in CGSpace" → "added in the repository" (in-scope host).
- Server messages before → after: "Only handles from CGSpace can be reported." → "Only handles from a supported repository can be reported."; "No knowledge product was found in CGSpace for handle…" → "…in the repository for handle…"; "…review this information in CGSpace.<br><br>" / "…field in CGSpace when…" → "…in the repository…"; "…review this information in CGSpace." → "…in the repository.".
- Gate: case-sensitive `CGSpace` literal over the browse component + three hosts (full scan), the two siblings (one named phrase each), and the `findOnCGSpace` body (server); allow-list `MELSpace|async findOnCGSpace\(|getDataFromCGSpaceHandle`. Pre-edit tree reconstructed with `git show HEAD:<path>` (HEAD = pre-task baseline for every touched file) → **non-zero**, hits: `Browse CGSpace`, `Selected from CGSpace`, `Retrieving metadata from CGSpace…` (three hosts), `Invalid CGSpace URL` (lab, report-result-form), `Title retrieved from CGSpace` (report-result-form + both siblings), four `findOnCGSpace` messages. Post-edit `bash scripts/kp-copy-gate.sh` → exit 0.
- Implementer verification: `lab-report-form.component.spec.ts` 92/92; `aow-hlo-create-modal.component.spec.ts` 62/62; `report-result-form.component.spec.ts` 90/90; `npx tsc --noEmit -p tsconfig.app.json` clean; `npx ng lint --quiet` clean; server `results-knowledge-products.service.spec.ts` 19/19; eslint on the service exit 0 (pre-existing prettier error at `:1471` fixed — forward pointer from T-2 closed).
- Implementer `Not Done / Assumptions`: generalized `kpAlertDescription` beyond the named lines (in-scope host); deliberately left the siblings' other CGSpace copy ("Fetching metadata from CGSpace", "CGSpace link") and the server `create()`/`_yearOutsideReportingPhasesMessage` path untouched (design named one phrase per sibling and only `findOnCGSpace`); the aow spec `it()` description text at old line 458 unchanged (descriptive only). Leader: accepted; the untouched copy is passed to the Reviewer as a possible spec gap.
- Reviewer verdict: **FAIL** (1 issue). Judgments PASS: gate not disqualified (case-sensitive literal + explicit identifiers + enumeration heuristic = the `KPM-AC-14` buckets; demonstrably falsifiable; reconstructed red run acceptable; `sed` range 599→726 contains all four messages); sibling/server scoping faithful to design §2.1/§6.2 (a full-file scan would go red on copy the spec deliberately left alone); `handleSource`/`kpEntryMode`/`findOnCGSpace` logic untouched; prettier hunk semantics identical; folder guide rewritten and re-stamped. **Issue 1 — Discovered Issue:** the `report-result-form` parity test (`spec:358-383`) cannot fail — Flow B never leaves the Browse state (same `mqapJson`, same handler/title), and `onSaveSection` sends `result_data: this.resultLevelSE.resultBody` — the **same object reference** in both captured calls, so `toEqual` is true by identity; a leaked Discovery field would pass. `lab-report-form` (real `clearSelectedKpItem()` → manual `validateHandle()`, fresh payload) and `aow-hlo-create-modal` (second fixture) are genuine. **Violated Rule:** `KPM-R-12` + scenario (four clauses, incl. "must NOT persist any Discovery field other than the handle"); `tasks.md` `KPM-T-8` verification. **Remediation:** Flow B → `clearSelectedKpItem()`, set `handler = melItem.itemUrl`, run the manual `GET_mqapValidation()`, then `onSaveSection()`; snapshot both captures at capture time; add a "no Discovery-only field" assertion.
- Leader adjudication: FAIL upheld (aliasing tautology on a MUST clause). Rework attempt 2 spawned with the report verbatim plus a mutation proof (leak a Discovery field → red → restore → green) and a distinct-objects assertion.

**Spec gap recorded (Reviewer, not gated — follow-up for `design.md` §13 / a new proposal):** copy reachable with a MEL/WorldFish handle still reads CGSpace-only outside `KPM-R-11`'s MUST list — `result-creator.component.html:101` "Fetching metadata from CGSpace"; `change-result-type-modal.component.html:54,58,68` ("CGSpace link" ×2, "Fetching metadata from CGSpace"); server `_yearOutsideReportingPhasesMessage` (`results-knowledge-products.service.ts:861-876`: "according to CGSpace", "Kindly check that the CGSpace link…", "…review this information in CGSpace").

**ADVISORY from Reviewer round 1 (recorded — no rework)**

- Reliability: the `MELSpace`-same-line allow rule is line-scoped; a CGSpace-only clause added inside an already-enumerating line would be invisible — an explicit phrase set would close it.
- Risk: `scripts/kp-copy-gate.sh` is not referenced by any `package.json` script or CI step; an `npm run kp:copy-gate` alias would keep it biting.
- Readability: the gate hard-codes four deep paths + a `../onecgiar-pr-server/…` hop; a moved folder exits 1 with `MISSING FILE` (right failure mode, reads as a copy defect).

**Attempt 2 — PASS**

- File changed: `report-result-form.component.spec.ts` only. Flow B now: `POST_createWithHandle.mockClear()` → `component.clearSelectedKpItem()` (asserted `selectedKpRepository() === 'cgspace'`) → `resultBody.handler = melItem.itemUrl` → `component.GET_mqapValidation()` (the `kp-manual-sync` handler) → `onSaveSection()`; both captures deep-cloned at capture time; assertions `not.toBe`, `toEqual`, `not.toHaveProperty('repository')` on the body and on `result_data`.
- Mutation proof: `report-result-form.component.ts:279` temporarily `this.mqapJson = { ...resp.response, repository: item.repository }` → `toEqual` failed with `+ "repository": "melspace"`; reverted (git diff on the `.ts` shows attempt-1 content only) → `Tests: 90 passed, 90 total`. `npx tsc --noEmit -p tsconfig.app.json` clean; `npx ng lint --quiet` clean.
- Reviewer verdict (round 2, same Reviewer): **PASS**. Summary: Flow B genuinely leaves the Browse state and re-enters through the real Manual-entry sync handler, so the second body is re-derived, not re-read; deep clones + `not.toBe` close the `result_data` aliasing hole; the `not.toHaveProperty('repository')` pairs cover the scenario clause "must NOT persist any Discovery field other than the handle"; the mutation is the right falsification; component confirmed restored; every round-1 PASS finding unchanged. `KPM-T-8` complete.

**Decisions / issues**: none beyond the test gap. **Budget:** 2 Reviewer rounds (round 2 PASSed — no escalation). Forward pointer from T-2 (prettier error at service `:1471`) closed here. Gate: `auto-approved (pre-approved mode)`.

## Constitution Impact: KPM-T-2 / KPM-T-4 / KPM-T-6 / KPM-T-10

- **Module reshaped (no new module):** `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/` gained `repositories.config.ts` (adapter registry — the one file to edit for a fourth repository) and `merge.ts` (pure merge/dedup); the service is now a three-source fan-out. Public surface of `GET results-knowledge-products/cgspace/search|facets/:name` widened additively (`repository` list param, `sources[]`, `items[].repository`, `alsoIn[]`, `page.hasMore`, facet `values[].repositories`). Routes and class names deliberately keep `cgspace` (`KPM-R-31`).
- **Client:** `kp-cgspace-browse/kp-repositories.constants.ts` is the single source of repository labels/colours/hosts (`KPM-DD-9`), imported by the browse component and the three hosts.
- **Child guides:** `onecgiar-pr-server/src/CLAUDE.md` and `onecgiar-pr-server/AGENTS.md` updated in `KPM-T-10` (Discovery proxy row + three env vars). `lab-report-form/CLAUDE.md` re-stamped in `KPM-T-8`. No new child guide needed; `onecgiar-pr-client/src/CLAUDE.md` does not enumerate this component — nothing stale there.
- **Parent index:** no `## Module Guides` change required (no new guide file).
- **CodeGraph re-index pending** (new `repositories.config.ts`, `merge.ts`, `kp-repositories.constants.ts`, `kp-cgspace-browse.cy.ts`, `scripts/kp-copy-gate.sh`; service/mapper/DTO signatures changed).

## Pending syncs for `/akili-archive` (shared-file discipline — apply on the default branch)

| Target | Change | Source |
|---|---|---|
| `docs/trd/trd.md` integrations row | "DSpace Discovery proxy (CGSpace, MELSpace, WorldFish)" | `KPM-T-10` docs half |
| `docs/specs/kaizen/changes--kp-cgspace-browse.md` pending #1 | mark done — server guide env list now carries the three Discovery vars | `KPM-T-10` docs half |
| `design.md` §9 event inventory | add `kp.discovery.year_postfiltered { repository, kept, dropped }` (sixth event, `KPM-DD-7` path) | `KPM-T-4` lens B advisory |
| `design.md` §8 (ux-ui) component rules | promote the chip-row source-selector pattern (`KPM-DD-8`) — as planned in `tasks.md` §8 | `KPM-T-6` |
| `.agents/model-routing.md` registry | T1 Architect row still says `opus`; the Leader ran on a newer generation — refresh the row | Step 0 model checkpoint |
| `design.md` §13 follow-ups | (a) CGSpace-only copy reachable with a MEL/WorldFish handle outside `KPM-R-11`'s list: `result-creator.component.html:101`, `change-result-type-modal.component.html:54,58,68`, server `_yearOutsideReportingPhasesMessage` (`results-knowledge-products.service.ts:861-876`); (b) `empty` state with a failed source shows no notice/retry (design §6.2 literal); (c) `scripts/kp-copy-gate.sh` not wired to `package.json`/CI; (d) `normalizeDoi` covers only the three spec-listed prefixes; (e) DOI-less items with empty title/type share key₂ `'||'` | `KPM-T-7`, `KPM-T-8`, `KPM-T-5` advisories |
| Fixture docs | `fixtures/README.md` §7 says MEL DOI on "2 of 5" items — the capture has 3 of 5; `design.md` §3.3 row 70 carries an unsourced `/6115` | `KPM-T-1` advisory |

### `KPM-T-10` — HITL smoke half (local stack, 2026-09-10 ~17:50–18:20 Bogota)

| Field | Value |
|---|---|
| Status | HITL executed on the **local stack**; the QA-environment run stays owed (see below). Reviewer audit of the evidence pending. |
| Tester | `akili-tester` (`sonnet`), skill `orca-cli`; Orca embedded browser with the existing PRMS session on `http://localhost:4200`; backend `nest start --watch` from this worktree on `:3400` with all three Discovery URLs in `.env` (Leader added the two new ones; backend restarted via a transient `main.ts` edit, reverted byte-identical) |
| Evidence | `docs/specs/changes/kp-multi-repository-browse/hitl/hitl-report.md` + 7 PNG + 3 `sources[]` JSON (no tokens/cookies; grep for `eyJ`/`Bearer`/`auth` → nothing) |
| Entry point | Reporting → "Where to report" → AOW03 → Knowledge-product indicator → Report → drawer **Browse repositories** tab |

**Run A — all three URLs configured (search behaviour)**

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Idle strip vs mockup | PASS | `runA-01-idle.png` — lead-in + three pressed chips; only cosmetic difference: search input shares the panel with the strip (mockup shows two boxes) |
| 2 | MEL-only title → MEL badge | PASS | `runA-02-mel-badge.png`, `runA-sources-mel.json` → `cgspace ok/1 · melspace ok/1 · worldfish ok/0` |
| 3 | WorldFish-only title → WorldFish badge | PASS | `runA-03-worldfish-badge.png`, `runA-sources-worldfish.json` → `cgspace ok/3 · melspace ok/0 · worldfish ok/2` |
| 4 | DOI/title in two repositories → "Also in" card | **NOT OBSERVED** | three live queries (`wheat`, `climate resilient agriculture`, `genebank durum wheat diversity`, 25/source); one same-title MEL pair with different `type` correctly not collapsed. Mechanism covered by `merge.spec.ts` (20) and the T-7 client tests |
| 5 | Deselect to one chip | PASS | `runA-04-single-repo.png` — last chip `aria-pressed="true" aria-disabled="true" title="At least one repository must stay selected"`, **Select all** shown, requests carried `repository=cgspace,melspace` then `repository=cgspace` |
| 6 | *Use this item* (MEL) → handle / MQAP / banner | **PARTIAL** | MQAP called with `https://repo.mel.cgiar.org/items/53d67b9b-…` (regex-valid, `KPM-AC-12`); title/authors/type synced from MELSpace; the AoW drawer **auto-created draft Result #9146** (EDITING, unsubmitted) and navigated to the editor, so the "Selected from MELSpace" banner was not observed live (host unit tests assert it). Draft left in the local dev DB; "Submit" never clicked |
| 7 | *View details* (WorldFish) | PASS | `runA-05-view-details-worldfish.png`; instrumented `window.open("https://digitalarchive.worldfishcenter.org/items/39293cf0-…", "_blank", "noopener,noreferrer")` |
| 8 | Keyboard pass | PASS | Shift+Tab from search: WorldFish → MELSpace → CGSpace chip → Manual entry tab → Browse tab; Tab forward: Filter by type → Filter by center; chips toggle with Space and Enter |
| 9 | Badge contrast | PASS | CGSpace 11.60:1 · MELSpace 6.94:1 · WorldFish 8.01:1 (canvas-resolved oklch); notice contrast judged visually against the amber tokens, not measured |

**Run B — `WORLDFISH_DISCOVERY_URL` blackholed (`http://10.255.255.1/server/api`) — tests `KPM-R-7`/`KPM-AC-7`, kept separate from Run A**

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Env change + watch-mode restart (main.ts transient edit, reverted) | PASS | new pid both times, `/api` 200 |
| 2 | Search → WorldFish unavailable + notice + Retry | PASS | `runB-02-partial.png`, `runB-sources-timeout.json` → HTTP 200 (not the 502 wrapper), 8050 ms, `cgspace ok/485 · melspace ok/29 · worldfish timeout/0`; chip "unavailable"; notice "WorldFish did not respond. Results below exclude it." + **Retry WorldFish**; other items rendered |
| 3 | Retry → one new request, identical params | PASS | network log: same `repository=cgspace,melspace,worldfish&query=wheat&year=2026` |
| 4 | Restore URL → count returns | PASS | `runB-03-restored.png` — chip "WorldFish 5". `unconfigured` (unset var) not exercised live (covered by server unit tests T-4 (d)/(e′)) |

Environment restored: `.env` carries the three real URLs; `onecgiar-pr-server/src/main.ts` byte-identical to HEAD.

**Still owed for the task as written:** the same smoke against **QA** once this branch is deployed there with `MELSPACE_DISCOVERY_URL` / `WORLDFISH_DISCOVERY_URL` set (pre-flight item; a user/infra action — agents never deploy cloud). **Operational note for the user:** draft Result #9146 (Knowledge Product, EDITING) was auto-created in the dev database the local backend points at; delete it if that database is the shared dev instance.

## Run summary (2026-09-10)

| Task | Status | Attempts / Reviewer rounds | Commit |
|---|---|---|---|
| KPM-T-1 fixtures | PASS | 1 / 1 | `149759fc8` |
| KPM-T-2 registry + DTOs | PASS | 1 / 1 | `88d1c9a18` |
| KPM-T-3 mapper | PASS | 1 / 1 | `6fb44c691` |
| KPM-T-5 merge/dedup | PASS | 2 / 2 (transitive-closure defect) | `078a44e3f` |
| KPM-T-4 fan-out | PASS | 1 / 1 (two lenses) | `2d290607b` |
| KPM-T-6 source strip | PASS | 1 / 1 | `745ce785a` |
| KPM-T-7 badges/notice | PASS | 2 / 2 (badge assertion gap) | `947ce9e5c` |
| KPM-T-9 CT sweep | PASS | 2 / 2 (tautological wrap gate) | `2a4d965e9` |
| KPM-T-8 hosts + gate | PASS | 2 / 2 (aliased parity test) | `d47af7412` |
| KPM-T-10 docs half | PASS | 1 / 1 | `f0939c926` |
| KPM-T-10 HITL half | local stack done; QA owed | — | this entry |

Final regression after the last worker (tree quiet): server `npx jest … results-knowledge-products` → `7 suites / 122 tests` green, eslint + tsc clean; client KP suites (browse component, three hosts, api service) → `7 suites / 603 tests` green, `tsc --noEmit -p tsconfig.app.json` clean, `ng lint` clean, `bash scripts/kp-copy-gate.sh` exit 0; Cypress CT `8 passing`. Runtime: five worker kills by model rate limits (sonnet 16:40 reset, fable 17:40) handled by model rotation with author ≠ auditor preserved; no rework attempt consumed by them. Budget tripwire raised after T-6 and accepted by the user (test volume).

