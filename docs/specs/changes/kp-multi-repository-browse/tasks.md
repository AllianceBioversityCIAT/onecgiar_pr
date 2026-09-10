# Tasks — Browse Knowledge Products across CGSpace, MELSpace and WorldFish

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-multi-repository-browse/` · Module code `KPM` |
| Linked | `requirements.md` (KPM-R-*, KPM-AC-*) · `design.md` (KPM-DD-*, §3.3 adapter table, §4.1 contract) · `proposal.md` · `mockup/` |
| Approval Mode | pre-approved (Phase 3 gate auto-approved, pre-approved mode) |
| Status | in-progress (T-1 done 2026-09-10) |
| Owner / driver | Juan Carlos Cadavid · AKILI Leader |
| Budget (from `design.md` §14) | 10 tasks · ~1,250 LOC incl. tests · ≤ 1 Reviewer round per task; tripwire > 12 tasks or > 1,500 LOC → stop and escalate |

### Execution constraints (inherited — standing mandate 2026-09-02)

- Routine gates auto-pass and are logged `auto-approved (pre-approved mode)`; HALT / Pivot / tripwire / `FATAL_FAIL` / `PRODUCT_BUG` still stop.
- **One Reviewer round per task**; a second FAIL escalates, never loops. Never relay a Reviewer `ADVISORY` into a rework brief unexamined.
- Verification is **targeted**: `npx jest --silent --reporters=summary --forceExit <path>` (server) · `npx jest --silent --reporters=summary --no-coverage <path>` (client) · `CT_DEV_SERVER_PORT=8091 npx cypress run --component --spec <file>` (~1–2 min) · `npx ng lint --quiet` · `npx tsc --noEmit -p tsconfig.app.json` after every client task (ts-jest hides missing type imports). Never `npm test` for the whole client.
- Leader posts one plain-language progress line at every task boundary (closed / running / minutes).
- Skills per task from the Skill Map: server `nestjs-expert`, `api-design-principles`, `error-handling-patterns`, `tdd`; client `angular-developer`, `frontend-design`; CT: `playwright-cli` not used — Cypress CT per `project-cypress-ct-harness-quirks`.

## 1. Scope of this task list

- **Module / feature:** `results` · multi-repository KP discovery (server proxy + client browse component + three hosts + docs/config).
- **Sprint / target phase:** Reporting cycle 2026 (P25).
- **Status:** not-started.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (rev 1, auto-approved pre-approved mode).
- [x] `design.md` approved (rev 1 + judgment-day fixes, see `judgment.md`).
- [x] Open questions resolved (`KPM-OQ-1..3` in `requirements.md` §11; §13 of `design.md` lists accepted gaps).
- [x] No CLARISA dependency.
- [x] No conflicting in-flight spec touching `results-knowledge-products` or the KP browse component (Leader `git status` + `docs/specs/` grep at start; `KZ-KPB-3`).
- [x] No migration (`npm run migration:check` unaffected).
- [ ] QA environment has `MELSPACE_DISCOVERY_URL` and `WORLDFISH_DISCOVERY_URL` set before the HITL smoke (`KPM-T-10`); local `.env` gets both for `KPM-T-1`.

## 3. Task list

### [x] `KPM-T-1` — Capture MELSpace and WorldFish Discovery fixtures and pin the adapter table

- **Type:** `server` (fixtures) + `docs`
- **Description:** With the two hosts reachable, capture — via a documented `curl` per call, never hand-written — one `discover/search/objects` response (query with ≥ 2 items) and the facet listings (`/discover/facets` index + the type and center facets) for MELSpace and WorldFish; store under `cgspace-discovery/fixtures/` (`melspace-search.hal.json`, `worldfish-search.hal.json`, `melspace-facets.json`, `worldfish-facets.json`) and update `fixtures/README.md` (command, timestamp, host, which keys were confirmed). Then fill the *capture* / *confirm* cells of `design.md` §3.3 (affiliation/center metadata field, URI field, type facet, center facet, year filter form) and record any host lacking an affiliation field, a center facet or a year facet (`KPM-OQ-3`, `KPM-DD-7`). Add one Jest spec that loads each fixture and asserts the adapter's metadata keys are present on at least one item (`dc.title`, `dc.type`, `dcterms.available` / `dc.date.issued`, `dc.creator`, `cg.identifier.doi` / `dc.identifier.doi`, `dc.identifier.uri`, and the captured affiliation key when one exists).
- **Implements:** `KPM-R-10`, `KPM-AC-13` (fixture half); feeds `KPM-DD-1`, `KPM-DD-6`, `KPM-DD-7`.
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/fixtures/*`, `fixtures/README.md`, `fixtures/fixtures-keys.spec.ts`, `docs/specs/changes/kp-multi-repository-browse/design.md` (§3.3 cells only).
- **Depends on:** — · **Blocks:** `KPM-T-2`, `KPM-T-3`
- **Estimate:** S · ~120 LOC (JSON excluded from the budget)
- **Verification:** `npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products/cgspace-discovery/fixtures`. **Input that fails it:** a fixture whose items lack `dc.type` → key assertion fails. **Disqualifiers:** README without the exact command + UTC timestamp; fewer than 2 items in a search fixture; a fixture edited by hand (JSON not byte-identical to the capture) — report as inconclusive, do not pass.
- **Definition of done:**
  - [x] Four fixtures + README committed (`🧪 test(cgspace-discovery) [KPM-T-1]: …`).
  - [x] `design.md` §3.3 has no *capture* placeholder left; any missing facet recorded in §13.
  - [x] No hostnames in test names or logs beyond the README (fixtures are data, allowed).

### `KPM-T-2` — Adapter registry and DTO contract (`repository` list, `sources[]`, item `repository`/`alsoIn`)

- **Type:** `server`
- **Description:** Add `repositories.config.ts` (`KpRepository` enum/union, `RepositoryAdapter` type, `KP_REPOSITORIES` registry filled from §3.3, `ALL_REPOSITORIES` priority order, `translateParams(dto, adapter)` helper skeleton). Extend `CgspaceSearchQueryDto` and `CgspaceFacetQueryDto` with `repository?: KpRepository[]` (one Transform handling `undefined` → default all three, `string` → split `,`, `string[]` → flatten through the same split; then trim, lowercase, dedupe; validators `@IsArray()`, `@ArrayMinSize(1)`, `@IsIn(..., { each: true })`). `size` stays 1–25 and is documented as **per source** in Swagger. Extend `cgspace-item.dto.ts` with `repository`, `alsoIn?`, `SourceStatusDto`, `page.hasMore`, `sources`. Swagger annotations. Keep route paths (`KPM-R-31`).
- **Implements:** `KPM-R-8` (contract + validation clauses "any other value MUST return 400", "repeatable or comma-separated", "default all three"), `KPM-AC-10`; `KPM-DD-1`, `KPM-DD-5`.
- **Files (expected):** `cgspace-discovery/repositories.config.ts` (new), `dto/cgspace-search-query.dto.ts`, `dto/cgspace-facet-query.dto.ts`, `dto/cgspace-item.dto.ts`, `dto/cgspace-search-query.dto.spec.ts`, `results-knowledge-products.controller.ts` (Swagger only).
- **Depends on:** `KPM-T-1` · **Blocks:** `KPM-T-3`, `KPM-T-4`, `KPM-T-5`, `KPM-T-6`
- **Estimate:** S · ~140 LOC
- **Verification:** DTO spec through the same `ValidationPipe({ transform, whitelist, forbidNonWhitelisted })` options as the controller: `cgspace,foo` → 400; `repository=melspace&repository=worldfish` → `['melspace','worldfish']`; `CGSpace` → `cgspace`; omitted → all three; `cgspace,cgspace` → `['cgspace']`; empty string → 400. **Input that fails it:** removing `{ each: true }` makes `cgspace,foo` pass → test fails. **Disqualifier:** tests that call `plainToInstance` without `validate()` prove nothing about the 400 — they do not count.
- **Definition of done:** DTO spec green; lint clean; Swagger shows the array enum; existing case `should fail validation when repository is not "cgspace"` (`dto.spec.ts:105`) updated to the unknown value `foo` (reversion challenge `design.md` §15 row 1).

### `KPM-T-3` — Adapter-parameterized mapper

- **Type:** `server`
- **Description:** `CgspaceDiscoveryMapper.toPage(hal, adapter)` / `toItem(node, adapter)` read title, type, year, authors, affiliation, DOI and URI keys, item host and repository key from the adapter (`affiliations` → `[]` when the adapter declares no affiliation field); authors = ordered concat of `adapter.fields.authors[]` de-duplicated; `year` = first 4 digits of the adapter's year field; `handleUrl` always `hdl.handle.net`; `countries` from `cg.coverage.country` with `[]` fallback; `repository = adapter.key`. Existing CGSpace behavior byte-identical (regression on the existing fixture).
- **Implements:** `KPM-R-8` (clause "metadata mapped with that repository's field names", "handleUrl and itemUrl built from that repository's host"), `KPM-AC-13`; `KPM-DD-1`.
- **Files (expected):** `cgspace-discovery.mapper.ts`, `cgspace-discovery.mapper.spec.ts`.
- **Depends on:** `KPM-T-2` · **Blocks:** `KPM-T-4`
- **Estimate:** S · ~110 LOC
- **Verification:** mapper spec × 3 fixtures: MEL item → `type` from `dc.type`, `year` from `dcterms.available`, authors include a `dc.contributor` value, `doi` from `cg.identifier.doi`, `itemUrl` starts with `https://repo.mel.cgiar.org/items/`; WorldFish → `dc.date.issued`, `dc.identifier.doi`, `digitalarchive.worldfishcenter.org`; CGSpace fixture output deep-equals the pre-change snapshot. **Input that fails it:** point the MEL adapter's year at `dc.date.issued` → `year` null → assertion fails. **Disqualifier:** a test that only checks `typeof year === 'number'` on a fixture where the field is absent proves nothing; assert the concrete value from the fixture.
- **Definition of done:** spec green; no behavior change for CGSpace (snapshot equality); lint clean.

### `KPM-T-4` — Parallel fan-out, per-source cache, statuses, telemetry, facet union

- **Type:** `server`
- **Description:** `CgspaceDiscoveryService.search`: resolve adapters from `dto.repository`; `Promise.allSettled` over `searchOne(adapter)` (cache → env check → `HttpService.get(baseUrl + '/discover/search/objects', translateParams, { timeout: 8000 })` → mapper); `searchOne` resolves `{ status:'unconfigured' }` when the env URL is missing and **rejects** with a classified `SourceFailure` (`timeout` when Axios `code ∈ {ECONNABORTED, ETIMEDOUT}` or message contains `timeout`, else `error`) so the settle handler maps rejections to `sources[]`; **only `ok` results are cached** (key includes `repository`); assemble `page` (`number`/`size` echo the per-source request, `totalElements` = Σ ok − `dedupedCount`, `totalPages` max, `hasMore` any) and `sources[]`; **every source `timeout|error` → legacy 502 wrapper** with generalized message; **every source `unconfigured` → 200 + empty items + `sources[]`**; else 200. `SEARCH_CACHE_MAX` 200 → 600. `facets(name, dto)`: same fan-out, union per normalized label (trim + case-fold), counts summed, `repositories[]` per value, `sources[]`; facet cache max raised to 60. Telemetry per `design.md` §4.1/§9: rename all five `cgspace.*` events (`config.missing`, `search`, `search.upstream_4xx`, `facets`, `facets.upstream_4xx`) to `kp.discovery.search`, `kp.discovery.facets`, `kp.discovery.source_failed`, `kp.discovery.config.missing` (once per process); update the service spec's event-name assertions. Merge/dedup are called from here but implemented in `KPM-T-5` (interface agreed in §5).
- **Implements:** `KPM-R-8` (clauses: parallel, own 8 s timeout, own cache key, "one failing source MUST NOT fail the others", no hostnames/bodies), `KPM-R-9`, `KPM-R-13`, `KPM-R-22`, `KPM-AC-4`, `KPM-AC-7` (server half), `KPM-AC-9`, `KPM-AC-11`, `KPM-AC-16`; `KPM-DD-2`, `KPM-DD-6`, `KPM-DD-7` fallback; scenario `KPM-R-8` all four clauses.
- **Files (expected):** `cgspace-discovery.service.ts`, `cgspace-discovery.service.spec.ts`, `repositories.config.ts` (`translateParams` body).
- **Depends on:** `KPM-T-3`, `KPM-T-5` (interface only — may proceed in parallel and integrate last) · **Blocks:** `KPM-T-6` (contract frozen after this task)
- **Estimate:** M · ~260 LOC
- **Verification:** service spec with a mocked `HttpService`: (a) three ok → three upstream calls, each with its adapter's `f.<facet>` names and base URL, `sources.length === 3`; (b) one source rejects with a timeout code → 200, `status:'timeout'`, others' items present; (c) one 500 → `status:'error'`, `upstreamStatus` logged as a number only; (d) `WORLDFISH_DISCOVERY_URL` unset → `status:'unconfigured'`, one `warn`; (e) all three `timeout`/`error` → `{ status: 502 }` wrapper; (e′) all three `unconfigured` → HTTP 200, `items: []`, three `unconfigured` rows; (e″) merged `totalElements` equals Σ ok totals − `dedupedCount` for a fixture with one cross-source duplicate; (e‴) after a mixed outcome the failed source is re-queried on the next identical call while the ok source hits the cache; (f) **every** `response`, `message` and every logger call argument stringified contains none of the three hostnames nor the env var names; (g) cache: second identical call hits cache for the ok source only after a mixed outcome; (h) facets union: two sources with `Journal Article` / `journal article` → one value, counts summed, `repositories: ['cgspace','melspace']`; one facet source failing → union of the others, 200. **Input that fails it:** replace `allSettled` with `all` → (b) rejects (the per-source call rejects by design); cache the failed source → (e‴) serves the cached failure → fails; log the caught Axios error object → (f) finds `repo.mel.cgiar.org` in the message. **Disqualifiers:** asserting only `toHaveBeenCalledTimes(3)` without inspecting per-call params does not prove translation; mocking `HttpService.get` to resolve synchronously hides the timeout branch — use a rejected promise with `code: 'ECONNABORTED'`.
- **Definition of done:** spec green; `npx jest` for the whole `cgspace-discovery/` folder green; no hostname in any log string; lint clean.

### `KPM-T-5` — Merge (round-robin) and dedup (DOI → title|type|year) as pure functions, TDD

- **Type:** `server`
- **Description:** `cgspace-discovery/merge.ts` (or inside the service as pure exported functions): `interleave(sourcesInSelectionOrder)`; `normalizeDoi`, `normalizeTitle` (lowercase, NFKD, strip diacritics/punctuation, collapse whitespace), `dedupKey1/2`, `dedupe(items, priorityOrder)` → survivors with `alsoIn[]` + `dedupedCount`. Red-green (`tdd` skill).
- **Implements:** `KPM-R-4` (ordering clause), `KPM-R-5` (all clauses incl. "DOI match MUST win over a title mismatch", "title match without equal type or year MUST NOT collapse", secondary handles kept), `KPM-AC-5`, `KPM-AC-6`; scenario `KPM-R-5` all four clauses; `KPM-DD-3`, `KPM-DD-4`.
- **Files (expected):** `cgspace-discovery/merge.ts` (new), `cgspace-discovery/merge.spec.ts` (new).
- **Depends on:** `KPM-T-2` (types) · **Blocks:** `KPM-T-4` integration
- **Estimate:** S · ~150 LOC
- **Verification:** `merge.spec.ts`: DOI `10.1000/abc` vs `https://doi.org/10.1000/ABC` → one survivor (CGSpace) with `alsoIn[0].repository==='melspace'`; same title+type, years 2025/2026 → two; same title, both DOIs present and different → two; no DOI, same title/type/year → one; priority: MEL first in selection order but CGSpace survives; round-robin `[a1,b1,c1,a2,b2,a3]` for sizes 3/2/1; `totalElements` per source untouched. **Input that fails it:** drop the year from key₂ → the 2025/2026 pair collapses → fails. **Disqualifier:** tests that construct both items from the same object literal (identical everything) do not exercise normalization — vary case/prefix/punctuation explicitly.
- **Definition of done:** red-then-green evidence in `execution.md` (first run fails, second passes); spec green; functions pure (no logger/HTTP imports).

### `KPM-T-6` — Client: repository constants, API params, source strip with selection rules

- **Type:** `client`
- **Description:** Add `kp-repositories.constants.ts` (`KP_REPOSITORIES`, `ALL_KP_REPOSITORIES`, `KP_ITEM_HOSTS`). `ResultsApiService.GET_cgspaceFacet(name, prefix?, size?, repositories?)` appends `repository`; `GET_cgspaceSearch` unchanged (params carry it). `KpCgspaceBrowseComponent`: `selectedRepositories` signal (init all), `sources` signal from the last response, computed chip model (selected / count / unavailable / disabled-as-last), `toggleRepository`, `selectAllRepositories`, `repository` in `buildSearchParams`, facet loads pass the selection and re-run on change through the existing debounced pipeline; `canSearch()` false → strip updates only. Template: source strip per `design.md` §6.3 (lead-in text exactly `Searching 3 CGIAR knowledge repositories`, `role="group" aria-label="Repositories to search"`, `<button aria-pressed>` chips, `@ng-icons/lucide` icons only (client guide rule 21), count badge, unavailable style + `title`, last chip `aria-disabled` + `title`, **Select all** when `< 3`). Generalized placeholder + idle copy. Selection resets with the rest of the state on drawer close (existing reset path).
- **Implements:** `KPM-R-1`, `KPM-R-2` (all clauses incl. "last selected chip MUST be non-interactive", "Select all MUST appear", "with nothing searchable it only updates the strip", reset on close), `KPM-R-3` (client half: options union consumed, `repository` sent), `KPM-R-6` (chip states), `KPM-R-11` (placeholder/idle), `KPM-R-14` (idle/loading unchanged with chips enabled), `KPM-R-21`, `KPM-AC-1`, `KPM-AC-2`, `KPM-AC-3`; scenario `KPM-R-2` all four clauses; `KPM-DD-8`, `KPM-DD-9`.
- **Files (expected):** `kp-cgspace-browse/kp-repositories.constants.ts` (new), `kp-cgspace-browse.component.ts|.html|.spec.ts`, `shared/services/api/results-api.service.ts`.
- **Depends on:** `KPM-T-4` (frozen contract §4.1; may start against the design contract with mocked responses) · **Blocks:** `KPM-T-7`
- **Estimate:** M · ~220 LOC
- **Verification:** `npx jest --silent --reporters=summary --no-coverage <component spec>` + `npx tsc --noEmit -p tsconfig.app.json`: on open three chips `aria-pressed="true"` and no request; deselect MELSpace → one `GET_cgspaceSearch` with `repository: 'cgspace,worldfish'`; deselect down to one → last chip `aria-disabled="true"` with a non-empty `title`, click → no request; **Select all** appears when < 3 and restores three with exactly one request; with query `ab` and a chip toggle → no request, strip updated; facet call carries `repository`; close/reset → three selected. **Input that fails it:** allow toggling the last chip → `aria-disabled` assertion fails; forget `repository` in `buildSearchParams` → param assertion fails. **Disqualifiers:** asserting chip *classes* (presence) instead of `aria-pressed`/`aria-disabled` and the request payload; a test that never advances the fake timers past 400 ms cannot observe the debounced request — report as inconclusive.
- **Definition of done:** spec green; `tsc` clean; lint clean; strings match `requirements.md` `KPM-R-11`.

### `KPM-T-7` — Client: badges, "Also in", counter, partial notice with retry, error copy, allow-list, Load more

- **Type:** `client`
- **Description:** Card badge from `item.repository` (`KP_REPOSITORIES` classes + dot + text), "Also in <label>" note and secondary handles from `item.alsoIn`; counter `Showing N of M items · <label> a …` over ok sources; `failedSources()` computed → partial notice (`role="status"`, one **Retry <label>** per failed source calling `retrySearch()` — full selection, page 0, same params; the server serves healthy sources from cache); error state copy names all selected repositories and keeps the Manual entry link; empty copy generalized; `ALLOWED_HOSTS` → `KP_ITEM_HOSTS` (four exact hosts), `openItemDetails` keeps the `itemUrl → uri → handleUrl` chain and `'_blank', 'noopener,noreferrer'`; *Load more* shown iff `page.hasMore`; the template's own overlay string "Retrieving metadata from CGSpace…" (`html:104`) → repository label, and its assertion at `spec:483` updated; counter and notice inside the existing `aria-live` region.
- **Implements:** `KPM-R-4` (badge, counter), `KPM-R-5` (client rendering: badge, "Also in", secondary handles, primary handle used by *Use this item*), `KPM-R-6` (counts after search), `KPM-R-7` (all clauses incl. "error state MUST render only when every selected repository failed"), `KPM-R-11` (empty/error/counter), `KPM-R-14` (results / results+partial / empty / error), `KPM-R-15`, `KPM-R-20`, `KPM-R-23`, `KPM-AC-5` (UI half), `KPM-AC-7` (UI half), `KPM-AC-8`, `KPM-AC-17`; scenario `KPM-R-7` all four clauses (client side).
- **Files (expected):** `kp-cgspace-browse.component.ts|.html|.spec.ts`.
- **Depends on:** `KPM-T-6` · **Blocks:** `KPM-T-8`, `KPM-T-9`
- **Estimate:** M · ~200 LOC
- **Verification:** component spec with mocked responses: mixed response (2 ok + 1 timeout) → items rendered, WorldFish chip text "unavailable", notice text contains "WorldFish", one retry button, clicking it calls `GET_cgspaceSearch` once with identical params, status stays `results`; 502 wrapper → status `error`, copy lists the three selected names, Manual entry link present; deduplicated item → one card with "Also in MELSpace" and the secondary handle text; `onSelect` emits the item whose `itemUrl` is the primary; counter equals `Showing 3 of 24 items · CGSpace 18 · MELSpace 6` for the fixture; `openItemDetails` opens each of the four allowed hosts (`cgspace.cgiar.org`, `repo.mel.cgiar.org`, `digitalarchive.worldfishcenter.org`, `hdl.handle.net`) with `'_blank', 'noopener,noreferrer'` and refuses `https://evil.example/items/x`; `hasMore:false` → no Load more. **Input that fails it:** render the notice when `failedSources().length === 0` → the "no notice on 3 ok" assertion fails; keep the two-host list → WorldFish open assertion fails. **Disqualifier:** checking the notice by CSS class only; the test must assert the repository *names* in the text and the retry request payload.
- **Definition of done:** spec green; `tsc` clean; lint clean; no `CGSpace`-only string left in the component (pre-check for `KPM-T-8`'s gate).

### `KPM-T-8` — Hosts and server copy: banner by repository, generalized strings, grep gate

- **Type:** `client` + `server` (copy only)
- **Description:** In `lab-report-form`, `aow-hlo-create-modal`, `report-result-form`: `onCgspaceItemSelected` stores `selectedKpRepository` (default `cgspace`); banner `Selected from {{ label }}`; "Retrieving metadata from CGSpace…" → repository label; tab label **Browse repositories**; `'Invalid CGSpace URL'` → `'Invalid repository item URL'`; `'Title retrieved from CGSpace'` → "Title retrieved from the repository" in `report-result-form.component.html:160` **and** the copy-only siblings `result-creator.component.html:127`, `change-result-type-modal.component.html:74`. Update the three host specs that assert `'Browse CGSpace'` (`report-result-form.component.spec.ts:330`, `lab-report-form.component.spec.ts:624`, `aow-hlo-create-modal.component.spec.ts:458`). Rewrite the stale "Pendiente / Browse CGSpace oculta" note in `lab-report-form/CLAUDE.md` (the tab is live, `kpBrowseEnabled = true`) and re-stamp its `Verified:` line. Server `findOnCGSpace` messages at lines 635, 653, 682–686, 694–696 → repository-neutral wording (update `results-knowledge-products.service.spec.ts` message assertions) (logic untouched; the regex message at `aow-hlo-create-modal.component.ts:415` / `report-result-form.component.ts:513` already lists the three repositories — keep). Add `scripts/kp-copy-gate.sh` (or an npm script) that greps the browse component, the three hosts, the two copy-only siblings and `results-knowledge-products.service.ts` for CGSpace-only phrasing with an allow-list regex (repository enumerations, env names, route paths, class/file names, `center.from_cgspace`).
- **Implements:** `KPM-R-11` (all surfaces), `KPM-R-12` (host wiring unchanged, parity test for a MEL `itemUrl`), `KPM-AC-12`, `KPM-AC-14`; scenario `KPM-R-12` all four clauses.
- **Files (expected):** `lab-report-form.component.ts|.html|.spec.ts`, `lab-report-form/CLAUDE.md`, `aow-hlo-create-modal.component.ts|.html|.spec.ts`, `report-result-form.component.ts|.html|.spec.ts`, `result-creator.component.html`, `change-result-type-modal.component.html`, `results-knowledge-products.service.ts` (+ its spec message assertions), `onecgiar-pr-client/scripts/kp-copy-gate.sh` (new).
- **Depends on:** `KPM-T-7` · **Blocks:** `KPM-T-10` (HITL)
- **Estimate:** M · ~160 LOC (existing spec updates included)
- **Verification:** host specs: emitting a MEL item (`itemUrl = https://repo.mel.cgiar.org/items/<uuid>`) → regex passes, `GET_mqapValidation` called with that URL, banner text "Selected from MELSpace", and the `POST_createResult` body deep-equals the Manual-entry body for the same URL (extend the existing parity test); server spec: the four messages contain no "CGSpace". Gate: `bash scripts/kp-copy-gate.sh` exits 0. **Input that fails it:** leave "Selected from CGSpace" literal in one host → gate exits 1; hard-code `'cgspace'` in the banner → MEL banner assertion fails. **Disqualifier:** an allow-list broad enough to match the whole word `CGSpace` (e.g. `/CGSpace/i`) makes the gate incapable of failing — the allow-list must be an explicit set of phrases, and the task must show the gate failing on the pre-change tree (run it once before editing and record the non-zero exit).
- **Definition of done:** three host specs + server spec green; gate green after edits **and** demonstrably red before; `tsc` + `ng lint` clean.

### `KPM-T-9` — Cypress CT sweep of the browse component (chip row wraps, no overflow, notice renders)

- **Type:** `tests`
- **Description:** New `kp-cgspace-browse.cy.ts` mounting `KpCgspaceBrowseComponent` with a stubbed `ResultsApiService` (fixture: 2 ok sources + 1 timeout, one deduplicated item). Sweep 1536 / 840 / 375 px: `documentElement.scrollWidth <= clientWidth`; chip row (`[role=group]`) height at 375 > one chip height (wrapped) and every chip `getBoundingClientRect().height >= 24`; notice visible; badges visible; requested viewport measured (`assertEffectiveWidth` pattern from `bilateral-review.cy.ts`).
- **Implements:** `KPM-AC-15`; NFR Responsiveness / Accessibility (`requirements.md` §7); `design.md` §6.3 responsive line.
- **Files (expected):** `kp-cgspace-browse/kp-cgspace-browse.cy.ts` (new).
- **Depends on:** `KPM-T-7` · **Blocks:** `KPM-T-10`
- **Estimate:** S · ~100 LOC
- **Verification:** `CT_DEV_SERVER_PORT=8091 ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.cy.ts` — all green. **Input that fails it:** add `flex-nowrap` to the strip → 375 px overflow assertion fails. **Disqualifiers:** the primeicons / `TS2322 ct-utils` noise is known and non-blocking (`project-cypress-ct-harness-quirks`) — but a run that never reaches "passing" output is inconclusive, not green; a viewport whose measured `clientWidth` differs from the request by > 4 px invalidates that width's measurements (the 375 shave symptom) — report the spread, do not pass.
- **Definition of done:** CT file committed; run output (passing/failing counts) pasted into `execution.md`.

### `KPM-T-10` — Config, docs, and HITL smoke on QA

- **Type:** `infra` + `docs` + `rollout`
- **Description:** `serverless.yaml` env allowlist + `README.md` §Environment + `docs/infrastructure.md` env row for `MELSPACE_DISCOVERY_URL` / `WORLDFISH_DISCOVERY_URL`; `onecgiar-pr-server/src/CLAUDE.md` + `AGENTS.md` integrations line for the discovery proxy and its three env vars (closes `KPB` kaizen pending #1); `docs/trd/trd.md` integrations row → "DSpace Discovery proxy (CGSpace, MELSpace, WorldFish)" — **recorded as pending, applied on the default branch** per the shared-file discipline. Then the HITL smoke in the Orca browser against QA with all three URLs configured: a MEL-only title, a WorldFish-only title, a DOI present in two repositories (one card, "Also in"), deselect down to one chip, one URL blackholed → partial notice + retry, *Use this item* on a MEL item → sync + banner; visual check vs `mockup/browse-repositories.png`; keyboard pass over chips → search → filters. Evidence (screenshots + measured `sources[]`) into `execution.md`.
- **Implements:** `KPM-R-13` (deploy-order independence), `KPM-R-10` (docs), NFR Observability; live confirmation of `KPM-AC-4`, `KPM-AC-7`, `KPM-AC-9`, `KPM-AC-12`, `KPM-AC-17`; the "no automated gate" rows of `requirements.md` §9 (real-API drift, visual fidelity, keyboard order).
- **Files (expected):** `onecgiar-pr-server/serverless.yaml`, `README.md`, `docs/infrastructure.md`, `onecgiar-pr-server/src/CLAUDE.md`, `onecgiar-pr-server/AGENTS.md`, `docs/specs/changes/kp-multi-repository-browse/execution.md`; `docs/trd/trd.md` (pending, default branch).
- **Depends on:** `KPM-T-8`, `KPM-T-9` (HITL half); docs half can run in parallel from the start · **Blocks:** —
- **Estimate:** S · ~60 LOC docs + HITL session
- **Verification:** `grep -n "MELSPACE_DISCOVERY_URL\|WORLDFISH_DISCOVERY_URL" onecgiar-pr-server/serverless.yaml README.md docs/infrastructure.md` → 3 files hit; HITL checklist all ticked with evidence. **Input that fails it:** MEL-only title returns nothing with MEL selected → adapter/facet mismatch → open a `PRODUCT_BUG`, do not tick. **Disqualifier:** a smoke run while the QA env lacks one URL is a test of `KPM-R-13`, not of the search — record which, never both from one run; screenshots without the measured `sources[]` JSON are not evidence of statuses.
- **Definition of done:** config in three places; guides updated; TRD row recorded as pending; HITL evidence in `execution.md`; any drift filed as a follow-up in `design.md` §13.

## 4. Dependency graph

```
KPM-T-1 (fixtures, pins §3.3)
   └── KPM-T-2 (registry + DTOs)
         ├── KPM-T-3 (mapper) ──┐
         ├── KPM-T-5 (merge/dedup, pure, TDD) ──┤   (T-3 ∥ T-5)
         │                                       └── KPM-T-4 (fan-out, cache, statuses, facets)  ← contract frozen
         │                                                 └── KPM-T-6 (client strip + params)   ← may start early against §4.1 with mocks
         │                                                       └── KPM-T-7 (badges, notice, retry, allow-list)
         │                                                             ├── KPM-T-8 (hosts + server copy + grep gate)
         │                                                             └── KPM-T-9 (CT sweep)          (T-8 ∥ T-9)
         └── KPM-T-10 docs/config half (∥ from the start) ─────────────────── HITL half after T-8 and T-9
```

Parallel-friendly: `T-3 ∥ T-5`; `T-6` may start against the frozen §4.1 contract while `T-4` integrates; `T-8 ∥ T-9`; `T-10` docs half anytime. Server and client are separable worktrees if two Implementers run (different packages).

## 5. Coverage map (scenario / clause level)

| Requirement / scenario clause | Owned by |
|---|---|
| R-1 strip + lead-in + three chips selected on open | T-6 |
| R-2 toggle; ≥ 1; last chip `aria-disabled` + reason; **Select all**; re-run via debounce; `canSearch()` false → strip only; reset on close | T-6 (all clauses) |
| Scenario R-2: two deselections re-run; last chip disabled; click does nothing; Select all restores + one request | T-6 |
| R-3 one request across selection; facet union consumed; server translation; zero contribution when a value is missing | T-4 (server), T-6 (client) |
| R-4 one list; badge; counter over ok sources; round-robin order | T-7 (badge, counter), T-5 (order) |
| R-5 DOI normalization; title+type+year; primary priority; "Also in" + secondary handles; primary handle used; DOI wins; no collapse on type/year mismatch | T-5 (rules), T-7 (rendering + primary handle) |
| Scenario R-5: DOI variants → one card; Use this item = CGSpace `itemUrl`; two different DOIs never collapse; `totalElements` untouched | T-5, T-7 |
| R-6 counts per chip; unavailable never "0"; tooltip; still toggleable | T-6 (states), T-7 (counts after search) |
| R-7 partial notice + per-repo retry; error only when all failed; error copy names repos + Manual link | T-7 |
| Scenario R-7: list + unavailable chip + notice; counter lists only answered; not error state; no hostname anywhere | T-7 (UI), T-4 (no hostname) |
| R-8 list param (CSV/repeatable/default/400); `size` per source; `sources[]`; parallel; 8 s each; own cache key; ok-only cache; settled; per-repo fields/hosts; no hostnames/bodies | T-2 (param/400/size doc), T-4 (fan-out/cache/statuses/leak), T-3 (fields/hosts) |
| Scenario R-8: two upstream calls with translation; `items[].repository` + `sources[]`; `cgspace,foo` → 400 without upstream; 200 + `error` status on one 500 | T-4, T-2 |
| R-9 facet union + per-repo facet names + failure tolerance | T-4 |
| R-10 captured fixtures before adapters | T-1 |
| R-11 tab label, placeholder, idle, empty, error, counter, overlay string, banners, host strings, copy-only siblings, sync messages, grep gate | T-6 (placeholder/idle), T-7 (empty/error/counter/overlay), T-8 (hosts, siblings, folder guide, server messages, gate) |
| R-12 `itemUrl` set; regex passes; same MQAP sync; identical `POST_createResult`; banner names repo | T-8 |
| Scenario R-12: WorldFish URL accepted; banner; nothing persisted but the handle; body parity | T-8 |
| R-13 unconfigured → `sources[]`, 200, no env name | T-4; live in T-10 |
| R-14 idle/loading/results/results+partial/empty/error; inputs and chips enabled while loading | T-6 (idle/loading), T-7 (rest) |
| R-15 allow-list of four hosts; other hosts refused | T-7 |
| R-20 Load more while any `hasMore` | T-4 (`hasMore`), T-7 (button) |
| R-21 selection persists across tab switch, resets on close | T-6 |
| R-22 telemetry fields; no URLs/query text | T-4 |
| R-23 live region announces counter + notice | T-7 |
| NFR responsiveness 375 px; a11y roles | T-9, T-6 |
| §9 rows with no automated gate (real-API drift, visual fidelity, keyboard) | T-10 HITL |
| AC-1..AC-17 | AC-1/2/3 → T-6 · AC-4 → T-4 (+T-10 live) · AC-5/6 → T-5 (+T-7 UI) · AC-7 → T-4 + T-7 · AC-8 → T-7 · AC-9 → T-4 · AC-10 → T-2 · AC-11 → T-4 · AC-12 → T-8 · AC-13 → T-1 + T-3 · AC-14 → T-8 · AC-15 → T-9 · AC-16 → T-4 · AC-17 → T-7 |

No clause is discharged by citing a different requirement; R-30/R-31 (MAY) are deliberately unowned in this release.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPM-TEST-1` | unit (server) | R-10, AC-13 keys | `cgspace-discovery/fixtures/fixtures-keys.spec.ts` |
| `KPM-TEST-2` | unit (server) | R-8 param/400, AC-10 | `cgspace-discovery/dto/cgspace-search-query.dto.spec.ts` |
| `KPM-TEST-3` | unit (server) | R-8 fields/hosts, AC-13 | `cgspace-discovery/cgspace-discovery.mapper.spec.ts` |
| `KPM-TEST-4` | unit (server) | R-8, R-9, R-13, R-22, AC-4/7/9/11/16 | `cgspace-discovery/cgspace-discovery.service.spec.ts` |
| `KPM-TEST-5` | unit (server, TDD) | R-4 order, R-5, AC-5/6 | `cgspace-discovery/merge.spec.ts` |
| `KPM-TEST-6` | unit (client) | R-1, R-2, R-3, R-6, R-11, R-14, R-21, AC-1/2/3 | `kp-cgspace-browse.component.spec.ts` |
| `KPM-TEST-7` | unit (client) | R-4, R-5 UI, R-6, R-7, R-11, R-14, R-15, R-20, R-23, AC-7/8/17 | `kp-cgspace-browse.component.spec.ts` |
| `KPM-TEST-8` | unit (client + server) | R-11, R-12, AC-12, AC-14 | three host specs, `results-knowledge-products.service.spec.ts`, `scripts/kp-copy-gate.sh` |
| `KPM-TEST-9` | cypress CT | AC-15, NFR responsive | `kp-cgspace-browse.cy.ts` |
| `KPM-TEST-10` | manual HITL | AC-4/7/9/12/17 live, §9 no-gate rows | `execution.md` evidence |

Server coverage thresholds (5/20/35/40) and client (50/60/60/60) unaffected; new files target ≥ 80 % lines.

## 7. Rollout & verification

- [ ] PR strategy (recommended, ~1,250 LOC): **PR 1 — server** (`T-1..T-5` + `T-10` config/docs half; review first: `merge.ts`, then the service fan-out, then DTO/mapper; out of scope: any UI). **PR 2 — client** (`T-6..T-9`; review first: chip invariant and `buildSearchParams`, then the notice/retry, then hosts; links PR 1 as prerequisite; out of scope: server behavior). Both bodies follow `cognitive-doc-design` review-empathy rules.
- [ ] CI green (lint, jest, build, `migration:check:ci` unaffected, SonarCloud).
- [ ] Env vars set on QA before the HITL; on TEST/PROD before merging PR 1 (missing → `unconfigured`, no outage).
- [ ] HITL smoke (`T-10`) evidence recorded.
- [ ] Telemetry: `kp.discovery.search` visible in logs after deploy; no hostname strings.

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `/akili-archive` promotes the chip-row pattern (`KPM-DD-8`) to `design.md` §8 and the TRD integrations row (pending list).
- [ ] Follow-ups from `design.md` §13: page-local dedup, component/route rename (`KPM-R-31`), `KPB-DD-8` SCSS removal, `pi-*` icon migration, Codeobia rate-limit answer.

## 9. Roll-back plan

1. Revert PR 2 (client) then PR 1 (server) — or PR 1 alone: the client sends `repository` which the old DTO rejects with 400 → **revert both together** if PR 2 is already live.
2. No migration, no flag. Env vars may stay (unused).
3. Verify `GET cgspace/search` returns the pre-change shape (fixture comparison) and the Browse tab reads "Browse CGSpace" again.
