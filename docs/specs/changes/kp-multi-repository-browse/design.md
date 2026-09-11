# Design — Browse Knowledge Products across CGSpace, MELSpace and WorldFish

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-multi-repository-browse/` · Module code `KPM` |
| Type / Depth | Change · **Standard** (re-checked in §14) |
| Approval Mode | pre-approved (Phase 2 gate auto-approved, pre-approved mode; judgment-day run once per the standing mandate, see §15) |
| Status | approved (rev 2, 2026-09-10 — judgment-day round 1 fixes applied, see `judgment.md`) |
| Linked | `requirements.md` (KPM-R-*, KPM-AC-*), `proposal.md`, `mockup/browse-repositories.html|.png`, archived `KPB` design (`docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/design.md`) |
| Budget | **10 tasks · ~1,250 LOC incl. tests (server ~500, client ~430, hosts/copy/specs ~160, CT ~100, docs/config ~60) · 1 review round per task (max 1, escalate on a second FAIL)** |
| Skills (Skill Map) | `nestjs-expert`, `api-design-principles`, `error-handling-patterns` (server) · `angular-developer`, `frontend-design` (client) · `tdd` on adapters/merge/dedup |

## 1. Summary

The existing read-only proxy (`CgspaceDiscoveryService` + `CgspaceDiscoveryMapper`) becomes **repository-aware** through a static adapter registry (base URL env, item host, metadata field names, facet names, handle prefixes) for `cgspace`, `melspace`, `worldfish`. The search route accepts a `repository` list (default all), fans out in parallel with `Promise.allSettled`, maps each source with its adapter, deduplicates (DOI → title+type+year), interleaves round-robin and returns `items[] + page + sources[]`. The client `KpCgspaceBrowseComponent` gains a repository chip row driven by `sources[]`, a badge per card, an "Also in" note and a partial-results notice; its three hosts only change copy and read the repository name from the emitted item. Nothing after selection changes: MQAP sync, handle regex, year rule (`KPB-DD-2`, `KPB-DD-4`, `KPB-DD-6`). Biggest accepted constraint: **pagination and dedup are per merged page** (merged `totalElements` is dedup-aware, per-source totals stay raw in `sources[]`) — an item duplicated across a page boundary can appear twice (§13).

Links: `requirements.md` · `docs/prd.md` (US-S1, US-S5, G4, AC-3, AC-9) · `docs/ux-ui/design.md` §7 tokens, §8 component rules + `RFUX-R-5`, §9, §10 · `docs/trd/trd.md` (`results-knowledge-products`, `m-qap`).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/results-knowledge-products/cgspace-discovery/` — new `repositories.config.ts` (adapter registry + `KpRepository` enum), service (fan-out/merge/dedup), mapper (adapter-parameterized `toItem`), DTOs (`repository` list, `sources[]`, `repository` on item), `fixtures/` (+ MELSpace and WorldFish captures), specs. `ResultsKnowledgeProductsController` routes unchanged in path; Swagger updated. `ResultsKnowledgeProductsService.findOnCGSpace` — **message strings only** (messages at lines 635, 653, 682–686, 694–696; its spec's message assertions). `serverless.yaml` env allowlist + `README.md` §Environment + `docs/infrastructure.md` env row + `onecgiar-pr-server/src/CLAUDE.md` / `AGENTS.md` integrations line (env list) + `docs/trd/trd.md` integrations row (**recorded as pending, applied on the default branch** — shared-file write discipline).
- **Client modules touched:** `pages/result-framework-reporting/.../kp-cgspace-browse/` (component, template, spec, new `kp-repositories.constants.ts`, new `kp-cgspace-browse.cy.ts`), `shared/services/api/results-api.service.ts` (`repository` param on both calls), hosts `lab-report-form`, `aow-hlo-create-modal`, `report-result-form` (copy + banner binding, **and their specs**, which assert `'Browse CGSpace'` at `report-result-form.component.spec.ts:330`, `lab-report-form.component.spec.ts:624`, `aow-hlo-create-modal.component.spec.ts:458`), `lab-report-form/CLAUDE.md` (folder guide: stale "Browse CGSpace hidden" note → re-stamp), plus two copy-only siblings carrying `'Title retrieved from CGSpace'`: `result-creator.component.html:127`, `change-result-type-modal.component.html:74`.
- **External integrations touched:** Discovery API on three hosts (public, no key). MQAP unchanged. New env `MELSPACE_DISCOVERY_URL`, `WORLDFISH_DISCOVERY_URL`.

### 2.2 Sequence / interaction diagram

```
[Browse tab] chips {cgspace,melspace,worldfish} · query/filters ──debounce 400 ms / Enter──▶
  GET /api/results/results-knowledge-products/cgspace/search?query=maize&page=0&size=10&year=2026&repository=cgspace,melspace,worldfish
   └─ JwtMiddleware → Controller (per-route ValidationPipe; repository → string[] enum, default all)
        └─ CgspaceDiscoveryService.search(dto)
             ├─ for each repository (parallel, Promise.allSettled):
             │    ├─ cache hit (key = params + repository) → source result
             │    ├─ adapter.baseUrl missing → { status:'unconfigured' }  (warn once: kp.discovery.config.missing {repository})
             │    └─ HttpService.get(`${baseUrl}/discover/search/objects`, adapter-translated params, timeout 8 s)
             │         ├─ 2xx → mapper.toPage(hal, adapter) → items[] (each item.repository = key)
             │         └─ error/timeout → { status:'error'|'timeout' } (warn: kp.discovery.source_failed {repository,status}) — no host, no body
             ├─ merge: round-robin over sources in selection order, preserving each source's order
             ├─ dedup: DOI key → else title|type|year key; keep first by priority cgspace › melspace › worldfish; attach alsoIn[]
             ├─ every selected source timeout|error → legacy 502 wrapper (client KCSR retry path)   ← unchanged contract for total outage
             ├─ every selected source unconfigured → 200 { items:[], sources[] } (never 5xx, KPM-R-13)
             └─ else 200 { items, page{ number, size(per source), totalElements(Σ ok − dedupedCount), totalPages(max), hasMore(any) }, sources[] }
[Browse tab] paints chips from sources[] (count | unavailable), badges from item.repository, notice when some source failed
[Browse tab] "Use this item" ──▶ host: handler = item.itemUrl (host form accepted by regex) ; selectedKpRepository = item.repository
   └─ GET_mqapValidation()  (existing, unchanged)  → banner "Selected from {{ KP_REPOSITORIES[repository].label }}"
[Browse tab] "View details" ──▶ url = itemUrl || uri || handleUrl ; window.open(url, '_blank', 'noopener,noreferrer') iff url.hostname ∈ {cgspace.cgiar.org, repo.mel.cgiar.org, digitalarchive.worldfishcenter.org, hdl.handle.net}
[Filters] on init ──▶ GET …/cgspace/facets/itemtype|affiliation?repository=<selected>  → union per normalized label (cached 10 min per repository)
```

## 3. Data Model Changes

### 3.1 Entities
None. Discovery data is never persisted (`KPB-DD-2`).

### 3.2 Migrations
None. `npm run migration:check` unaffected.

### 3.3 CLARISA / external-data implications

Adapter registry (server, static, one entry per repository — values for MEL/WorldFish were **pinned by the fixture task `KPM-T-1`** against live captures in `cgspace-discovery/fixtures/{melspace,worldfish}-{search.hal,facets}.json`, 2026-09-10):

| Key | Display | Base URL env | Item host | Handle prefixes (informational¹) | Title | Type | Year | Authors | Affiliation (center) | DOI | URI | Facet: type | Facet: center | Year filter |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cgspace` | CGSpace | `CGSPACE_DISCOVERY_URL` | `cgspace.cgiar.org` | `10568` | `dc.title` | `dcterms.type` | `dcterms.issued` | `dc.contributor.author` | `cg.contributor.affiliation` | `cg.identifier.doi` | `dc.identifier.uri` | `itemtype` | `affiliation` | `f.dateIssued=[Y TO Y],equals` |
| `melspace` | MELSpace | `MELSPACE_DISCOVERY_URL` | `repo.mel.cgiar.org` | `20.500.11766` | `dc.title` | `dc.type` | `dcterms.available` | `dc.creator` + `dc.contributor` | `cg.contributor.center` (confirmed, `melspace-search.hal.json`) | `cg.identifier.doi` | `dc.identifier.uri` (confirmed) | `itemtype` (confirmed, `melspace-facets.json`) | `institute` (confirmed, `melspace-facets.json`) | `f.dateIssued=[Y TO Y],equals` (confirmed: constrains `totalElements` from 1157 to 89 on a same-query year probe) |
| `worldfish` | WorldFish | `WORLDFISH_DISCOVERY_URL` | `digitalarchive.worldfishcenter.org` | `20.500.12348` | `dc.title` | `dc.type` | `dc.date.issued` | `dc.creator` | `cg.contributor.affiliation` (confirmed, `worldfish-search.hal.json`) | `dc.identifier.doi` | `dc.identifier.uri` (confirmed) | `itemtype` (confirmed, `worldfish-facets.json`) | `institute` (confirmed, `worldfish-facets.json`) | `f.dateIssued=[Y TO Y],equals` (confirmed: constrains `totalElements` from 1946/6115 to 506 on a same-query year probe) |

¹ Informational only: runtime handle validation is the shared `kp-handle.validator.ts` (`items/<uuid>` host form, which *Use this item* always sends); widening prefixes is out of scope. Every cell above was pinned by `KPM-T-1` (search fixture + facet index per host); both MEL and WorldFish expose a center facet (`institute`) and a working year filter, so the "affiliation field that does not exist maps to `[]`" clause and the post-filter fallback (`KPM-DD-7`) are not exercised by either new host — kept for a future repository that may lack them.

Rules: `handleUrl` is always `https://hdl.handle.net/<handle>`; `itemUrl` is `https://<itemHost>/items/<uuid>`; a repository without a center facet is **unconstrained** by the Center filter (requirements `KPM-OQ-3`); a repository without a year facet is **post-filtered** on the mapped year so the non-admin lock (`KPB-R-12`) still holds for what is listed.

## 4. API Surface

### 4.1 New / changed endpoints

**Search (changed, additive)**

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/results-knowledge-products/cgspace/search` (path kept, `KPM-R-31`) |
| **Version / Auth / Role** | `api` · JWT (`JwtMiddleware`) · any authenticated user — unchanged |
| **Request DTO** | `CgspaceSearchQueryDto` — existing fields unchanged; `repository?: KpRepository[]` accepts `repository=a&repository=b` **and** `repository=a,b`. Transform normalizes three inputs — `undefined` → default all three; `string` → split on `,`; `string[]` (Express repeatable form) → flatten each element through the same split — then trim, lowercase, dedupe. Validators: `@IsArray()`, `@ArrayMinSize(1)`, `@IsIn(['cgspace','melspace','worldfish'], { each: true })`. Unknown value → 400 (`KPM-AC-10`). `size` (existing, 1–25, default 10) is **per source**: the merged page holds at most `size × selected` items (client sends 10 → ≤ 30). |
| **Response** | `{ response: CgspaceSearchPageDto, message, status }` through `ResponseInterceptor`. `CgspaceSearchPageDto` = `{ items: CgspaceItemDto[], page: { number, size, totalElements, totalPages, hasMore }, sources: SourceStatusDto[] }`. `CgspaceItemDto` gains `repository: KpRepository` and `alsoIn?: { repository, handle, handleUrl, itemUrl }[]`. `SourceStatusDto` = `{ repository, status: 'ok'|'timeout'|'error'|'unconfigured', total, hasMore }`. `page.number` = the shared per-source page index requested; `page.size` = the per-source size requested; `totalElements` = Σ ok sources' `totalElements` **minus `dedupedCount`** (dedup-aware, `KPM-AC-5`; raw per-source totals stay in `sources[].total`); `totalPages` = max over ok sources; `hasMore` = any ok source has a next page. |
| **Errors** | 400 validation · **502 only when every selected source ended `timeout` or `error`** (same wrapper as today, generalized copy: "Repository search is temporarily unavailable") · every selected source `unconfigured` → **200** with `items: []` and `sources[]` (`KPM-R-13`, never 5xx) · partial failure = 200 + `sources[]`. Never a hostname, env name or upstream body (`AC-9`). |
| **Telemetry** | `kp.discovery.search { repositories[], sources:[{repository,status,durationMs,total}], merged, dedupedCount, page, size, hasQuery, outcome }` · `kp.discovery.source_failed { repository, status, upstreamStatus? }` (warn) · `kp.discovery.config.missing { repository }` (warn, once per process) |

**Facets (changed, additive)**

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/results-knowledge-products/cgspace/facets/:name` — `name ∈ itemtype | affiliation` (logical names) |
| **Request DTO** | `CgspaceFacetQueryDto` + the same `repository` list field/transform |
| **Response** | `{ name, values: [{ label, value, count, repositories: KpRepository[] }], sources: SourceStatusDto[] }` — union keyed on the normalized label (trim, case-fold); `value` = the first seen raw value; `count` summed. A source failure drops that source from the union (200, status in `sources[]`). |
| **Cache** | per `(name, prefix, size, repository)` 10 min — sources cached independently |

### 4.2 Bilateral / platform-report impact
None.

## 5. Server Workflow / Business Rules

- **Controller:** unchanged routes; `ValidationPipe` options unchanged; Swagger `@ApiPropertyOptional` for `repository` (array, enum) and `sources`.
- **Adapter registry (`repositories.config.ts`):** `KP_REPOSITORIES: Record<KpRepository, RepositoryAdapter>`, `ALL_REPOSITORIES` order = priority order. `RepositoryAdapter` fields per §3.3 plus `translateParams(dto)` responsibilities: Solr-escaped `query`, `dsoType=item`, `page/size`, sort `dc.date.accessioned,DESC` when no query, `f.<typeFacet>`, `f.<centerFacet>` (skipped when the adapter has none), year filter per adapter. Base URLs read from `process.env` at call time (same as today).
- **Service.search:** resolve adapters for `dto.repository`; `Promise.allSettled(adapters.map(searchOne))`; `searchOne` = cache → env check (missing → **resolves** `{ status:'unconfigured' }`, no HTTP) → HTTP (timeout 8 s) → `mapper.toPage(hal, adapter)` → `{ status:'ok', items, page }`; an HTTP failure **rejects** with a classified `SourceFailure { repository, status, upstreamStatus? }` where `status = 'timeout'` when the Axios error `code ∈ { ECONNABORTED, ETIMEDOUT }` (or message contains `timeout`), else `'error'`; the settle handler maps each rejection to its `sources[]` row (so replacing `allSettled` with `all` really does fail the request — the gate in `requirements.md` §9 stays live). Upstream status is logged as a number only. **Only `status:'ok'` results enter the per-source cache** (60 s); failures and unconfigured are never cached, so a Retry inside the TTL re-queries the failed source while healthy sources are served from cache. Merge → dedup → page meta (`totalElements` = Σ ok − `dedupedCount`) → `sources[]`. Every selected source `timeout|error` → legacy 502 wrapper (keeps `KCSR-R-1` retry semantics for a total outage); every selected source `unconfigured` → 200 + empty list + `sources[]`. Load more: the client bumps one shared page index that is sent to every selected source; a source past its last page returns an empty page and is skipped by the interleave; `hasMore` = any ok source reports a next page (`KPM-R-20`).
- **Merge:** round-robin: take index 0 of each source in selection order, then index 1, …; sources shorter than others are skipped. No re-sorting.
- **Dedup:** key₁ = normalized DOI (`lowercase`, strip `https://doi.org/`, `http://dx.doi.org/`, `doi:`); key₂ = `${normTitle}|${type.toLowerCase()}|${year}` where `normTitle` = lowercase, NFKD, strip diacritics and punctuation, collapse whitespace. Two items collapse when key₁ matches, or when both lack a DOI-key match **and** key₂ matches (items with two different DOIs never collapse on title). Grouping is **by key, not by pairwise/transitive closure**: DOI-bearing items are partitioned by exact key₁; a DOI-less item joins a DOI group only when **exactly one** DOI group shares its key₂ — a tie (two or more qualifying DOI groups, e.g. a title-only match to two different-DOI items) leaves the DOI-less item on its own card, so a DOI-less intermediary can never bridge two different DOIs onto one card. Survivor = lowest priority index; the dropped item's `{repository, handle, handleUrl, itemUrl}` is pushed to `survivor.alsoIn`. `dedupedCount` = number of dropped items. Dedup runs on the merged page only (§13).
- **Mapper:** `toPage(hal, adapter)` / `toItem(node, adapter)` read `adapter.fields.*` for title, type, year, authors, affiliation, DOI and URI; authors = concat of the listed fields, de-duplicated; `year` = first 4 digits of the adapter's year field; `affiliations` from the adapter's affiliation field or `[]` when the adapter declares none (card then omits the center); `itemUrl` from `adapter.itemHost`; `repository = adapter.key`. Country field stays `cg.coverage.country` with a `[]` fallback for repositories that lack it.
- **Facets:** same fan-out; union per normalized label; `repositories[]` per value so the client can grey a value when the only repository carrying it is deselected (SHOULD, not required).
- **`findOnCGSpace` copy:** the four messages (lines 635, 653, 682–686, 694–696) become repository-neutral ("the repository"); logic untouched; the service spec's message assertions follow. The KP mapper file is `results-knowledge-products.mapper.ts`.
- Not part of W1..W8; lookup sibling of MQAP, as before.

## 6. Frontend Plan

### 6.1 Routes / modules
No route change. Standalone components, signals, OnPush as today.

### 6.2 Components & services

| Piece | Responsibility |
|---|---|
| `kp-repositories.constants.ts` (new, next to the component) | `KP_REPOSITORIES` client constant: key → `{ label, dotClass, badgeClass, host }` for the three repositories; `ALL_KP_REPOSITORIES` in priority order; `KP_ITEM_HOSTS` allow-list (`cgspace.cgiar.org`, `repo.mel.cgiar.org`, `digitalarchive.worldfishcenter.org`, `hdl.handle.net`). Imported by the browse component and the three hosts (labels for banners). |
| `KpCgspaceBrowseComponent` (modified) | New signals: `selectedRepositories: WritableSignal<KpRepository[]>` (init all), `sources: Signal<SourceStatusDto[]>` (from the last response), computed `chipModel` (per repository: selected, count, unavailable, disabled-as-last). `buildSearchParams` adds `repository` (comma-joined). `toggleRepository(key)` ignores the last selected one; `selectAllRepositories()`; both call `onFilterChange()` (same debounce/distinct path) — with `canSearch()` false they only update the strip. Template: source strip (`role="group" aria-label="Repositories to search"` + lead-in text exactly `Searching 3 CGIAR knowledge repositories` + chips as `<button aria-pressed>` + **Select all** when `< 3`), per-card badge + "Also in" note + secondary handles (`item.alsoIn`), counter `Showing N of M items · <label> a …` over ok sources, partial notice `@if (failedSources().length && items().length)` with **Retry <label>** buttons calling `retrySearch()` — Retry re-sends the **full current selection** (page 0, same params); healthy sources come back from the server cache, only the failed source is re-queried (§5), error state only when the response was the 502 wrapper (existing path) — copy names all selected repositories. `ALLOWED_HOSTS` → `KP_ITEM_HOSTS` (four exact hosts); `openItemDetails` keeps the `itemUrl → uri → handleUrl` fallback chain and `window.open(url, '_blank', 'noopener,noreferrer')`. *Load more* renders iff `page.hasMore` (`KPM-R-20`). The repository selection survives a Browse ↔ Manual switch because the panel stays mounted with `[hidden]` (`KPB-DD-5`) and resets with the existing drawer-close reset (`KPM-R-21`). The template's own overlay string "Retrieving metadata from CGSpace…" (`html:104`, asserted at `spec:483`) → "Retrieving metadata from {{ label }}…". Idle/empty copy generalized. Facet loads pass `repository` and re-run when the selection changes (debounced through the same pipeline). Status model unchanged (`idle | loading | empty | error | results`); "partial" is `results` + non-empty `failedSources()`. |
| `ResultsApiService` (modified) | `GET_cgspaceSearch(params)` unchanged signature (params carry `repository`); `GET_cgspaceFacet(name, prefix?, size?, repositories?: string[])` appends `repository`. |
| Hosts (`lab-report-form`, `aow-hlo-create-modal`, `report-result-form`) | `onCgspaceItemSelected(item)`: also store `selectedKpRepository.set(item.repository ?? 'cgspace')`; template banner `Selected from {{ repositoryLabel() }}`; "Retrieving metadata from CGSpace…" → "Retrieving metadata from {{ label }}…"; tab label **Browse repositories**; `'Invalid CGSpace URL'` → `'Invalid repository item URL'` (lab, report-result-form); `'Title retrieved from CGSpace'` (report-result-form :160, and the copy-only siblings `result-creator.component.html:127`, `change-result-type-modal.component.html:74`) → "Title retrieved from the repository". The three host specs that assert `'Browse CGSpace'` are updated to the new label; `lab-report-form/CLAUDE.md` "Pendiente" note about the hidden Browse tab is rewritten and re-stamped. No logic change; `handleSource`/`kpEntryMode` untouched. |

### 6.3 Design system usage
- **Tailwind-first** (`design.md` §7 rule 1); no new SCSS; `KPB-DD-8` scoped SCSS stays as is.
- **Chips:** `h-[30px] rounded-full border px-[10px] text-[12.5px] font-semibold` — selected: `border-[var(--pr-color-primary-300)] text-[var(--pr-color-primary-700)] bg-white` with a `check_circle` icon; unselected: `border-[var(--pr-border)] text-[var(--pr-text-secondary)]`; unavailable: dashed amber border (`border-amber-400 bg-amber-50 text-amber-800`) with `error_outline`; last-selected: `aria-disabled="true" cursor-not-allowed opacity-90` + `title`. Count badge `rounded-full bg-[var(--pr-color-primary-100)] text-[10.5px] font-bold tabular-nums`. Strip container `rounded-[10px] border border-[var(--pr-color-primary-100)] bg-[var(--pr-color-primary-25)] p-[10px] flex flex-wrap gap-[8px]`.
- **Badges (per repository):** text + 7 px dot; CGSpace = primary ramp (`bg-[var(--pr-color-primary-50)] text-[var(--pr-color-primary-700)]`), MELSpace = cyan-tinted informational (`bg-cyan-50 text-cyan-800 border-cyan-200`), WorldFish = blue informational (`--pr-color-blue-500` family per §7 "generic chips"). Never color-only (`§10`). "Also in" = neutral outlined badge with `call_split` icon.
- **Notice:** amber informational band (`border-amber-300 bg-amber-50 text-amber-900`), `role="status"`, retry buttons as outlined amber pills.
- **Icons:** `@ng-icons/lucide` for every new icon in this component (client guide `onecgiar-pr-client/CLAUDE.md` hard rule 21 narrows `design.md` §7's `material-icons-round`; child guide wins for client work — deviation recorded for the archive sync): circle-check (selected chip), triangle-alert (unavailable chip / notice), refresh-cw (retry), split (Also in), globe (lead-in); exact export names verified against `node_modules/@ng-icons/lucide/types` at implementation time. Existing `pi-*` usages in this component are left alone (pre-existing, out of scope).
- **Responsive (§9):** strip `flex-wrap`; at 375 px chips wrap to two rows; CT gate `KPM-AC-15`.
- **A11y (§10):** `role="group" aria-label="Repositories to search"`; chips `aria-pressed`; last chip `aria-disabled` + `title`; counter and notice inside the existing `aria-live="polite"` region; badges are text.
- **i18n:** strings inline like the rest of the component (no keys exist for this feature today; `design.md` §10 i18n rule is a known project gap `OG-*`, not introduced here).

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization
- JWT unchanged; no new role; no `.exclude()` change.
- Validation: `repository` enum list; existing limits; Solr escaping per source.
- Leak surface: adapter base URLs, env names, upstream bodies and hostnames never enter `response`, `message` or logs — the service catches everything per source (`error.exception.ts` never sees an Axios error), and the unit test asserts no adapter host string in any body/log (`KPM-AC-9/16`).
- Open redirect: `KP_ITEM_HOSTS` exact-host allow-list on `View details` (`KPM-R-15`).

## 8. Performance & Capacity
- Fan-out is parallel; latency ≈ slowest source; timeout 8 s per source keeps the bound.
- Up to 3 upstream calls per search (vs 1); volume < 1 rps; cache per source 60 s — `SEARCH_CACHE_MAX` 200 → **600** (three sources per user action keep the same effective depth), `FACET_CACHE_MAX` 20 → **60** (3 repositories × 2 facets × ~10 live prefixes); only `ok` results cached.
- Payload ≤ `size × selected` items (client: 10 × 3 = 30) × ~650 B ≈ 20 KB; the DTO maximum (25 × 3 = 75 items ≈ 50 KB) is reachable only by a hand-built request.
- No new dependencies server or client.

## 9. Observability
- `kp.discovery.search`, `kp.discovery.facets`, `kp.discovery.source_failed { repository, status, upstreamStatus? }` (replaces `cgspace.search.upstream_4xx` and `cgspace.facets.upstream_4xx`), `kp.discovery.config.missing { repository }` (§4.1). All five existing event names (`cgspace.config.missing`, `cgspace.search`, `cgspace.search.upstream_4xx`, `cgspace.facets`, `cgspace.facets.upstream_4xx`, service lines 63/240/258/353/367) are **renamed** in one change; no dashboard depends on them per TRD.
- Metric touchpoint `docs/prd.md` M4.2 (p95 hot endpoints).

## 10. Testing Plan (forward-looking)
- **Server unit (Jest, `--silent --reporters=summary --forceExit`, targeted paths):** mapper × 3 fixtures (captured MEL + WorldFish HAL, existing CGSpace); adapter `translateParams` per repository (exact `params`); DTO `repository` transform/validation; service: parallel fan-out with mocked `HttpService` (3 ok · one timeout · one 500 · one unconfigured · all failed → 502), no host string in body/logs, per-source cache keys; dedup unit cases (DOI variants, title+type+year, different years, two different DOIs, priority + `alsoIn`); merge round-robin; facet union.
- **Client unit (Jest):** chip rules (`KPM-AC-2/3`), `repository` in params, chips from `sources[]` (count / unavailable), badge + "Also in" rendering, counter text, partial notice + retry, error copy names repositories, `KP_ITEM_HOSTS` allow-list, facet calls carry `repository`. Hosts: banner label from `item.repository`, `POST_createResult` parity for a MELSpace `itemUrl`.
- **Cypress CT (new `kp-cgspace-browse.cy.ts`, stubbed `ResultsApiService`):** 1536 / 840 / 375 — no horizontal overflow, chip row wraps, notice renders, chips ≥ 24 px tall.
- **Existing specs to update (copy change):** `report-result-form.component.spec.ts:330`, `lab-report-form.component.spec.ts:624`, `aow-hlo-create-modal.component.spec.ts:458` (tab label), `kp-cgspace-browse.component.spec.ts:483` (overlay string), `cgspace-search-query.dto.spec.ts:105` (`should fail validation when repository is not "cgspace"` → unknown value `foo`), `cgspace-discovery.service.spec.ts` (event names, statuses), `results-knowledge-products.service.spec.ts` (messages).
- **Grep gate (script in the task, not a test file):** listed files contain no CGSpace-only phrasing outside the allow-list.
- **HITL (real Orca browser, QA with three URLs):** MEL-only title, WorldFish-only title, DOI in two repositories, one URL blackholed → partial notice; visual vs mockup; keyboard pass on chips.

## 11. Backwards Compatibility & Migration Plan
- Additive response fields; `items`/`page` shapes kept. Default `repository` widens from `cgspace` to all three — the only caller is the PRMS client (grep-verified). Rollback = revert PR(s); no DB, no flag.
- Env: add the two URLs to `serverless.yaml`, each environment, `README.md` §Environment, `docs/infrastructure.md` env row. Missing → `unconfigured` (no outage).

## 12. Design Decisions (ADRs)

### `KPM-DD-1` — Static adapter registry inside the existing service, no per-repository classes
- **Context:** three DSpace 7 hosts differ only in base URL, item host, metadata keys and facet names.
- **Decision:** one `RepositoryAdapter` config object per repository in `repositories.config.ts`; the service/mapper take the adapter as a parameter. Class and route names keep `cgspace` (`KPM-R-31`).
- **Alternatives:** one service class per repository behind an interface (3× boilerplate for data-only differences); DB-driven config (over-engineering for three static hosts).
- **Consequences:** adding a fourth repository = one config row + one fixture; a wrong key is caught by the fixture tests, not at runtime.

### `KPM-DD-2` — `Promise.allSettled` fan-out with per-source cache, 502 only on total failure
- **Context:** `KCSR-R-1` client retry keys on body status ≥ 400; partial failures must not trigger a full retry loop nor hide good results.
- **Decision:** settle all sources; return 200 + `sources[]` when ≥ 1 ok **or when every source is merely `unconfigured`**; keep the legacy 502 wrapper only when every source ended `timeout`/`error`, so the existing retry path still covers a total outage without turning a partial deployment into a 5xx (`KPM-R-13`). Cache per source, `ok` results only, so a slow or failed source never invalidates the others and Retry is never a cached no-op.
- **Alternatives:** `Promise.all` (one failure fails all — contradicts `KPM-R-7`); always 200 even on total failure (would silently disable the KCSR retry; **reversion challenge** below).
- **Consequences:** partial failures rely on the new per-repository retry button rather than the automatic retry — acceptable, the user sees results already.

### `KPM-DD-3` — Round-robin merge, no cross-source scoring
- **Context:** Solr scores are not comparable across indexes; a "newest first" merge needs an accessioned date the DTO does not expose.
- **Decision:** interleave sources in selection order preserving each source's own order.
- **Alternatives:** concatenate by repository (buries MEL/WorldFish under 10 CGSpace items); expose accessioned date and sort (more mapping, still not relevance).
- **Consequences:** predictable, cheap; the badge tells the user where each item lives.

### `KPM-DD-4` — Dedup keys DOI → title|type|year, priority CGSpace › MELSpace › WorldFish, page-local
- **Context:** Codeobia's advice; the same KP appears in two repositories under different handles; MQAP resolves either.
- **Decision:** as §5. Survivor = priority order; secondaries kept in `alsoIn[]` so nothing is hidden. Dedup is page-local; merged `totalElements` = Σ ok − `dedupedCount` (dedup-aware, `KPM-AC-5`), per-source totals stay raw in `sources[]`.
- **Alternatives:** DOI-only (misses items without DOI — reports, briefs); fuzzy title similarity (false positives, tuning burden); cross-page dedup (requires fetching all pages — defeats pagination).
- **Consequences:** an item straddling a page boundary can show twice after *Load more* (§13, accepted); the merged total is exact for the current page set only.

### `KPM-DD-5` — `repository` as an enum list with default = all
- **Context:** `KPB-R-30` reserved the field as a single enum with a 400 on anything but `cgspace`.
- **Decision:** array field (`@IsArray()`, `@ArrayMinSize(1)`, `@IsIn(…, { each: true })`), CSV and repeatable forms normalized by one transform (undefined → default all three), 400 on unknown values.
- **Alternatives:** separate endpoint per repository (client fan-out, three network round-trips, CORS-free but duplicate logic); keep single value (no "all at once").
- **Consequences:** **reverts** the `KPB-R-30` 400 for non-`cgspace` values — challenged in §15: nothing depends on that 400 except its DTO test (updated to `foo`); the only caller is the PRMS client.

### `KPM-DD-6` — Facet union keyed on normalized label, with `repositories[]` per value
- **Context:** MEL's center facet is probably `institute`; labels differ in case/acronym form.
- **Decision:** union after the existing `formatCenterLabel`-style normalization (server: trim + case-fold; client keeps its acronym formatting), counts summed, `repositories[]` recorded.
- **Alternatives:** per-repository filter dropdowns (UI sprawl); intersect (hides values unique to one repository).
- **Consequences:** a value shown may match zero items in some repositories — harmless.

### `KPM-DD-7` — Year filter per adapter with server-side post-filter fallback
- **Context:** the non-admin year lock (`KPB-DD-6`) must hold for every listed item; MEL/WorldFish year facet names unknown until captured.
- **Decision:** adapter declares its year filter; absent → post-filter mapped `year` for that source and log it.
- **Alternatives:** skip year for those repositories (lists ineligible items → guaranteed 422s); Solr `query` clause on the date field (syntax varies; fixture may show it works — then the adapter uses it).
- **Consequences:** post-filtered pages can be shorter than `size`; documented; the fixture task decides whether the fallback is ever used.

### `KPM-DD-8` — Chips as plain `<button aria-pressed>` in a `role="group"`
- **Context:** need multi-select with ≥ 1 invariant; `app-pr-radio-button segmented` is single-select; PrimeNG is gone (`design.md` §12).
- **Decision:** Tailwind-styled buttons; invariant enforced in the component; **Select all** link.
- **Alternatives:** checkbox list (heavier for three options); dropdown (hides the "3 repositories" message — rejected in the proposal).
- **Consequences:** ~40 lines of template; reusable pattern candidate for `design.md` §8 (archive step).

### `KPM-DD-9` — Repository display metadata shared through a client constant
- **Context:** the banner, badges and notices in four places need the same labels/colors.
- **Decision:** `kp-repositories.constants.ts` next to the component; hosts import it (no shared service, no new module).
- **Alternatives:** server sends labels (couples UI copy to the API); duplicate literals (drift).
- **Consequences:** one file to update when a repository is added or renamed.

### `KPM-DD-10` — Extend the `View details` allow-list instead of removing it
- **Context:** `ALLOWED_HOSTS` blocks MEL/WorldFish items today (scout finding).
- **Decision:** exact-host allow-list grows to the three item hosts + `hdl.handle.net`; no wildcard.
- **Alternatives:** drop the guard (open redirect from untrusted metadata `uri`); allow `*.cgiar.org` (still lets arbitrary CGIAR hosts through).
- **Consequences:** additive; the open-redirect test gains four positive cases (three item hosts + `hdl.handle.net`) and one negative; `window.open` keeps `'_blank', 'noopener,noreferrer'` and the `itemUrl → uri → handleUrl` fallback chain.

## 13. Open Gaps & Follow-ups
- Page-local dedup (`KPM-DD-4`): an item straddling a page boundary may show twice after *Load more*; accepted for volume (< 30 items typical). Follow-up if users report it: dedup against already-rendered handles client-side.
- `KPM-T-1` resolved the MEL/WorldFish facet and year-filter placeholders: both hosts expose a type facet (`itemtype`), a center facet (`institute`) and a working `f.dateIssued=[Y TO Y],equals` year filter — neither host lacks a center or year facet, so `KPM-OQ-3`'s "hide the Center filter" branch and `KPM-DD-7`'s server-side post-filter fallback are not needed for these two hosts (kept in the design for a future repository that may lack them).
- Rate limits unknown (asked); mitigated by cache + debounce.
- Component/route rename (`KPM-R-31`), `KPB-DD-8` SCSS removal, `pi-*` → `@ng-icons/lucide` migration of the pre-existing icons in this component — all deferred.
- Kaizen pending item from `KPB` (server guide env list) is naturally closed by the docs task here.
- **Execution follow-ups filed by `/akili-execute` (2026-09-10, `KPM-T-7/T-8/T-10` Reviewer and HITL findings):**
  - (a) CGSpace-only copy still reachable with a MEL/WorldFish handle outside `KPM-R-11`'s MUST list: `result-creator.component.html:101` ("Fetching metadata from CGSpace"), `change-result-type-modal.component.html:54,58,68` ("CGSpace link" ×2, "Fetching metadata from CGSpace"), server `_yearOutsideReportingPhasesMessage` (`results-knowledge-products.service.ts:861-876`). Candidate for a copy-only follow-up proposal.
  - (b) `empty` state with a failed source renders no partial notice and no Retry (§6.2 gates the notice on `items().length`); only the chip reads "unavailable". Decide whether the notice should also sit above the empty state.
  - (c) `onecgiar-pr-client/scripts/kp-copy-gate.sh` is not wired to `package.json` or CI; add an `npm run kp:copy-gate` alias so the gate keeps running.
  - (d) `normalizeDoi` strips only the three spec-listed prefixes (`https://doi.org/`, `http://dx.doi.org/`, `doi:`); `https://dx.doi.org/` and `http://doi.org/` would degrade a DOI match to a title match. Live captures show MEL/WorldFish items frequently without a DOI, so key₂ normalization carries most of the real dedup load.
  - (e) Two DOI-less items with empty title and type share key₂ `'||'` and collapse; consider treating an empty normalized title as non-matchable.
  - (f) In the AoW-indicator host (`aow-hlo-create-modal`), *Use this item* persists a draft Result and navigates to the editor immediately, so the "Selected from {{ label }}" banner (§2.2 / `KPM-AC-12`) has no observable state in that host; decide whether the AC is scoped to the `lab-report-form` / `result-creator` hosts or the AoW flow should pause on the synced banner. The banner clause is unverified live until the QA smoke runs it through `lab-report-form`.
  - (g) Idle strip renders the search input inside the strip panel; `mockup/browse-repositories.html` shows two separate boxes. Accept as-is or align at archive.
  - (h) `kp.discovery.year_postfiltered { repository, kept, dropped }` is a sixth telemetry event not listed in §9 (only the `KPM-DD-7` fallback path emits it); add it to §9.
  - (i) **`PRODUCT_BUG` (pre-existing `KPB` behaviour, found at the HITL):** the "Retrieving metadata from …" sync overlay uses `absolute inset-0` inside the results area (`kp-cgspace-browse.component.html` ~L150-161, container `class="relative mt-2 min-h-[160px]"`), so it covers only ~638→897 px of a 1260 px drawer — chips, search, filters and Cancel/Create stay interactive during the MQAP sync. Out of this spec's scope (T-7 only changed the string); fix = anchor the overlay to the panel root or disable the controls while `selecting()` is true.

## 14. Size check (Step 2.4)
Estimate: **10 tasks · ~1,250 LOC incl. tests · 1 review round per task** (rev 1 said ~1,150; judgment-day added the existing-spec updates, folder guide and two copy siblings). Standard holds: no DB/auth/payload-contract change (not Full), far more than one task (not Lite). The proposal estimated 8–10 tasks; the CT sweep and the allow-list finding added scope but not risk class. Tripwire for `/akili-execute`: > 12 tasks or > 1,500 LOC → stop and escalate.

## 15. Reversion challenge (Step 2.3)

| Reverted behavior | Question: what does removing this break? | Answer | Design response |
|---|---|---|---|
| `KPB-R-30`: 400 for any `repository` ≠ `cgspace` (`KPM-DD-5`) | Any caller relying on the 400? Any test? | Only the DTO spec case `should fail validation when repository is not "cgspace"` (`cgspace-search-query.dto.spec.ts:105`, updated to the unknown value `foo`); the PRMS client is the sole caller and never sent the param. | Keep 400 for unknown values; document the default widening in §11. |
| Automatic `KCSR` retry on every body status ≥ 400 now bypassed for partial failures (`KPM-DD-2`) | Does a partial failure now loop or silently hide items? | No: partial = 200 with items; total failure still returns the 502 wrapper, so the retry path is intact for the case it was built for (`KCSR-R-1`). | Per-repository **Retry** button covers the partial case (`KPM-R-7`). |
| `ALLOWED_HOSTS` two-host list (`KPM-DD-10`) | Does widening reopen the open-redirect guard? | No: exact hosts only; negative test kept. | Additive list; no wildcard. |

## 16. Judgment Day
Round 1 (2026-09-10, two blind `opus` judges): 5 confirmed severe findings fixed in this rev 2, 1 suspect corrected as wording, 21 INFO items (14 applied). Scoped re-judgment waived under the standing pre-approved mandate; details and sweep in `judgment.md`.
