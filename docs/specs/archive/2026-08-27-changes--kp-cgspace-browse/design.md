# Design — Browse CGSpace when reporting a Knowledge Product

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-cgspace-browse/` · Module code `KPB` |
| Type / Depth | Change · **Standard** (re-checked in §13) |
| Approval Mode | gated |
| Status | approved (rev 2, 2026-08-26 — Judgment Day round 1 fixes applied, see `judgment.md`) |
| Linked | `requirements.md` (KPB-R-*, KPB-AC-*), `proposal.md`, `judgment.md`, `dspace-discovery-api-notes.md`, `mockup/browse-cgspace.png` |
| Budget | **9 tasks · ~780 LOC incl. tests (server ~300, client ~420, docs/config ~60) · 1–2 review rounds** |

## 1. Summary

A new read-only server sub-service, **`CgspaceDiscoveryService`**, proxies the CGSpace DSpace-7 Discovery API and maps HAL responses into a slim `CgspaceItemDto`. The client's `aow-hlo-create-modal` gains a two-tab KP section — **Browse CGSpace** (new `KpCgspaceBrowseComponent`) and **Manual entry** (today's markup moved verbatim). Selecting an item sets the handle and invokes the existing `GET_mqapValidation()`; persistence is untouched. The biggest constraint accepted: the server rejects KPs outside the active reporting-phase year for non-admins, so Browse **locks the Year filter to the phase year** for non-admins (`KPB-R-12`) — search results are always sync-eligible.

Links: `requirements.md` · `docs/prd.md` (US-S1, US-S5, G4/M4.2, AC-3, AC-9) · `docs/ux-ui/design.md` §7–§10, §12 · `docs/trd/trd.md` (`results-knowledge-products`, `m-qap`).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/results-knowledge-products/` — new folder `cgspace-discovery/` (`cgspace-discovery.service.ts`, `cgspace-discovery.mapper.ts`, `dto/`, `fixtures/`, specs). `ResultsKnowledgeProductsController` gains two `GET` routes. `ResultsKnowledgeProductsModule` registers `CgspaceDiscoveryService` and `CgspaceDiscoveryMapper` as providers (`HttpModule` already imported).
- **Client modules touched:** `pages/result-framework-reporting/.../aow-hlo-table-create-modal/` (+ new child `components/kp-cgspace-browse/`), `shared/services/api/results-api.service.ts`, `tests/mocks/spartanBrainMock.ts` (add `BrnTabs*` stubs).
- **External integrations touched:** CGSpace Discovery `GET {CGSPACE_DISCOVERY_URL}/discover/search/objects` and `GET {CGSPACE_DISCOVERY_URL}/discover/facets/{name}` (public, no key). MQAP unchanged. `serverless.yaml` env allowlist gains `CGSPACE_DISCOVERY_URL`.

### 2.2 Sequence / interaction diagram

```
[Browse tab] query/filter change ──debounce 400 ms (or Enter: immediate)──▶
  GET /api/results/results-knowledge-products/cgspace/search?query=maize&page=0&size=10&year=2026[&type&center]
   └─ JwtMiddleware → Controller (@Query(new ValidationPipe({transform,whitelist})) dto)
        └─ CgspaceDiscoveryService.search(dto)
             ├─ bounded TTL cache hit (60 s) → return
             └─ HttpService.get(Discovery, {timeout: 8000})
                  ├─ 2xx → CgspaceDiscoveryMapper.toPage(HAL) → { items[], page }
                  └─ any error → { response:{}, message:'CGSpace search is temporarily unavailable', status:502 }  (no URL/body)
        └─ return { response: page, message: 'CGSpace search results', status: 200 }  → ResponseInterceptor envelope
[Browse tab] "Use this item" ──▶ createResultBody.handler = item.handleUrl ; handleSource='browse'
   └─ GET_mqapValidation()  (existing)
        ├─ MQAP ok → mqapJson → title → … → POST_createResult (existing, unchanged)
        ├─ existing result returned (validateExisting) → existing "already reported" UI (KPB-R-13)
        └─ 422 year mismatch (admin who changed Year) → existing mqapUrlError message
[Browse tab] "View details" ──▶ window.open(safeUri, '_blank', 'noopener,noreferrer')
[Filters] on init ──▶ GET …/cgspace/facets/itemtype | affiliation?prefix= (cached 10 min) ; Year list = phaseYear (non-admin) | phaseYear-10..phaseYear (admin)
```

## 3. Data Model Changes

### 3.1 Entities
None. No new or changed entities.

### 3.2 Migrations
None. `npm run migration:check` must stay green with zero new files.

### 3.3 CLARISA / external-data implications
- No CLARISA change.
- CGSpace metadata keys (verified live 2026-08-26; the research notes' `dc.date.issued`/`dc.type`/`cg.contributor.center` are **wrong** for CGSpace): `dc.title`, `dc.contributor.author[]`, `dcterms.issued`, `dcterms.type`, `cg.contributor.affiliation[]`, `dc.identifier.uri`, `cg.identifier.doi`, `cg.coverage.country[]`. The fixture task records the real keys for DOI and country from a live response; if they differ, the mapper constant table is the single place to change.
- HAL traversal (pinned): `_embedded.searchResult._embedded.objects[]` → each `{ _embedded.indexableObject: { uuid, handle, name, metadata } }`; page at `_embedded.searchResult.page`.
- Facets: `itemtype`, `affiliation` (discrete values, `GET /discover/facets/{name}?prefix=&size=`). `dateIssued` is a **range facet** in DSpace and is **not** used for the Year dropdown; Year is a client-side fixed list (§2.2) applied upstream as a Solr range on `dcterms.issued` (`query` addend `dateIssued:[YYYY TO YYYY]` via the filter `f.dateIssued=YYYY-01-01T00:00:00Z,YYYY-12-31T23:59:59Z,equals` — the exact accepted form is verified in the fixture task; the design pins the intent, not the string).
- Sort: `dc.date.accessioned,DESC` (attested in notes) when `query` is empty; relevance (Discovery default, **no `sort` param**) when `query` is present.

## 4. API Surface

### 4.1 New / changed endpoints

**Search**

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/results-knowledge-products/cgspace/search` (router: `main.routes.ts` `api` → `modules.routes.ts` `results` → `results.routes.ts` `results-knowledge-products`) |
| **Version** | `api` |
| **Auth** | JWT via `JwtMiddleware` (route not in the `.exclude()` list of `app.module.ts`) |
| **Role** | any authenticated user (same as `GET mqap`) |
| **Request DTO** | `CgspaceSearchQueryDto` — `query?: string` (3–200; required unless `type`/`center`/`year` present), `page: int ≥ 0 = 0`, `size: int 1–25 = 10`, `type?: ≤100`, `year?: /^\d{4}$/`, `center?: ≤100`, `repository: 'cgspace' = 'cgspace'` (enum, R-30). Validated per-route with `new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` — there is no global pipe in `main.ts`. Cross-field rule "query or filter" via a custom `@ValidateIf`. |
| **Response** | Service returns `{ response: CgspaceSearchPageDto, message, status: 200 }`; `ResponseInterceptor` emits `{ response, statusCode, message, timestamp, path }`. `CgspaceSearchPageDto = { items: CgspaceItemDto[], page: { number, size, totalElements, totalPages } }` |
| **`CgspaceItemDto`** | `uuid`, `handle` (`10568/128401`), `handleUrl` (`https://hdl.handle.net/10568/128401`), `itemUrl` (`https://cgspace.cgiar.org/items/<uuid>`), `title`, `type`, `year: int\|null`, `authors: string[]`, `affiliations: string[]`, `countries: string[]`, `doi: string\|null`, `uri` |
| **Errors** | 400 validation (class-validator messages) · 502 `{ message: 'CGSpace search is temporarily unavailable' }` for timeout (> 8 s), network error, missing env, upstream ≥ 500 · upstream 4xx → 502 same message but logged at `warn` as `cgspace.search.upstream_4xx {status}` so caller-side defects are diagnosable |
| **Telemetry** | `cgspace.search {queryLength, page, size, hasType, hasCenter, year, durationMs, total, outcome}` — never the URL, query text or upstream body |

**Facets**

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/results-knowledge-products/cgspace/facets/:name` |
| **Params** | `name` enum `itemtype \| affiliation`; query `prefix?: ≤100`, `size: int 1–100 = 50` (own DTO + per-route `ValidationPipe`) |
| **Response** | `{ response: { name, values: [{ label, value, count }] }, message, status }` |
| **Cache** | 10 min per `(name, prefix, size)` |
| **Errors** | 400 unknown facet · 502 as above |
| **Note** | `affiliation` list is truncated to `size`; the client uses `prefix` type-ahead so CGIAR centers are reachable (UX consequence recorded). |

### 4.2 Bilateral / platform-report impact
None. Read-only additive endpoints; no change-log entry in `bilateral-result-summaries.en.md`.

## 5. Server Workflow / Business Rules

- **Controller:** two thin routes on `ResultsKnowledgeProductsController` (`cgspace/search`, `cgspace/facets/:name` — no collision with `get/:id`, `find/by-handle`, `mqap`). Each applies its own `ValidationPipe`. Returns the service's `{response, message, status}` wrapper (class-wide `ResponseInterceptor` reads `data.response`).
- **`CgspaceDiscoveryService`:** builds Discovery params — `dsoType=item`, `page`, `size`, `query` (Solr-escaped: `\` `+ - && || ! ( ) { } [ ] ^ " ~ * ? :` escaped; leading `*`/`?` stripped; max 200 chars), `f.itemtype=<v>,equals`, `f.affiliation=<v>,equals`, year range on `dcterms.issued` (§3.3), `sort` per §3.3. Wraps `HttpService` with `timeout(8000)` and `catchError` → returns the 502 wrapper (never throws raw Axios errors, so the global exception filter never sees the upstream host). Missing `CGSPACE_DISCOVERY_URL` → same 502 + one `warn` `cgspace.config.missing` (no value echoed).
- **Cache:** private bounded TTL map in the service (`Map<key,{expires,value}>`, max 200 search entries / 20 facet entries, oldest evicted on insert, TTL 60 s / 10 min). No new dependency — the shared `global-parameter-cache` has no TTL and `@nestjs/cache-manager` is not installed (`KPB-DD-3`).
- **`CgspaceDiscoveryMapper`:** pure HAL → DTO (§3.3 path). Multi-valued metadata → arrays; missing keys → `[]`/`null`; `year` = first 4 digits of `dcterms.issued`; `handleUrl`/`itemUrl` derived.
- **No transactions, no side effects, no notifications.** Not part of W1..W8 — a lookup sibling of MQAP.
- **Year gate awareness:** `findOnCGSpace` (`service.ts:604-673`) throws 422 for non-admins when the KP year ≠ active phase year, and returns the existing result when the handle is already reported (`validateExisting=true`). The Browse tab prevents the first case by construction (R-12) and surfaces the second through the existing client handling (R-13). The server side of this spec does **not** change `findOnCGSpace`.
- **Config:** `CGSPACE_DISCOVERY_URL` (e.g. `https://cgspace.cgiar.org/server/api`) read via `process.env` like `MQAP_URL`; added to `serverless.yaml` env allowlist and to the local `.env` example / `docs/infrastructure.md` §6 env list (task).

## 6. Frontend Plan

### 6.1 Routes / modules
No route change. Only `aow-hlo-create-modal` (standalone, OnPush, signals) and its new child are touched.

### 6.2 Components & services

| Piece | Responsibility |
|---|---|
| `AowHloCreateModalComponent` (modified) | Adds `kpEntryMode = signal<'browse'\|'manual'>('browse')`, `handleSource = signal<'browse'\|'manual'>('manual')`. Tabs render iff `currentResultIsKnowledgeProduct()` (indicator KP **or** category KP chosen — matches R-1 rev 2). Existing handle+Sync markup moves under the Manual panel unchanged. `onCgspaceItemSelected(item)` → `handler = item.itemUrl` (the `cgspace.cgiar.org/items/<uuid>` form, **already accepted by the existing regex** — no guard relaxation needed, `KPB-DD-4`), `handleSource='browse'`, then `GET_mqapValidation()`. Existing handling of `resp.response` (title, existing-result, 422 message) is reused untouched. Manual edits to the handle input reset `handleSource='manual'`. Browse panel is kept mounted with `[hidden]` (R-21, `KPB-DD-5`); state resets on drawer close. |
| `KpCgspaceBrowseComponent` (new, standalone, OnPush) | Inputs: `busy` (parent is creating/validating — only **Use this item** buttons disable; search inputs stay enabled per R-11), `phaseYear: number`, `isAdmin: boolean`. Output: `itemSelected(CgspaceItemDto)`. Signals: `query`, `type`, `center`, `year` (init `phaseYear`; locked when `!isAdmin`), `page`, `items`, `total`, `status: 'idle'\|'loading'\|'empty'\|'error'\|'results'`. Search pipeline: `toObservable(searchParams)` → `debounceTime(400)` → `distinctUntilChanged` → `switchMap`; **Enter** calls `runSearch()` immediately (bypasses debounce, cancels pending); text < 3 chars with no filter → no call + hint (AC-8). Filters: `app-pr-select` with clear (×) → value `null` → param omitted. Load more appends page+1. Card content per R-4: title; meta line `type · year · firstAuthor et al. · affiliation[0]`; ≤ 3 country chips; monospace handle; counter text exactly `Showing {items.length} of {total} items from CGSpace`. Empty copy: `No items found in CGSpace for this search. Try different terms or use Manual entry.` Error copy: `CGSpace search is temporarily unavailable — use Manual entry.` (R-10 scenario) with a link that switches the tab. `View details`: opens `itemUrl` only if host is `cgspace.cgiar.org` or `hdl.handle.net`, `'_blank','noopener,noreferrer'`. |
| `ResultsApiService` (modified) | `GET_cgspaceSearch(params)` → `${apiBaseUrl}results-knowledge-products/cgspace/search`, `GET_cgspaceFacet(name, prefix?, size?)` (base `apiBaseUrl` = `…/api/results/`). |
| `EntityAowService` | Unchanged; the modal reads `phaseYear` from `api.dataControlSE.reportingCurrentPhase.phaseYear` and admin flag from the existing user/role signal used elsewhere in RFR. |

### 6.3 Design system usage
- **Tabs:** `@spartan-ng/brain/tabs` (`BrnTabsDirective`, `BrnTabsList`, `BrnTabsTrigger`, `BrnTabsContent`) — recorded as `KPB-DD-7` (deviates from the ux-ui §8 inventory, which predates PrimeNG removal in §12). Styled with **Tailwind utilities only** (ux-ui §12 rule): pill container `bg-[--pr-color-gray-100] rounded-full p-1`, active trigger `bg-white text-[--pr-color-primary-300] shadow-sm rounded-full`. No local SCSS beyond `:host`.
- **Inputs/selects/buttons:** `app-pr-input` (search, icon), `app-pr-select` ×3, `app-pr-button` primary (`--pr-color-primary-300 #6b46e5`) for **Use this item**, link-style button for **View details**. Country chips reuse the existing chip style (no remove icon).
- **Tokens:** `src/styles/colors.scss` — `--pr-color-primary-300` (primary), `--pr-color-gray-*` for meta text and pill background; typography from `src/styles/fonts.scss`; handle in `font-mono text-xs`.
- **Responsive (§9):** filters `flex flex-wrap gap-2`; card grid `grid-cols-[1fr_auto]` → single column under `md`.
- **A11y (§10):** brain tabs provide `role=tablist/tab/tabpanel` + arrow keys; `aria-live="polite"` region for counter / empty / error; **Use this item** `aria-label="Use this item: {title}"`; locked Year chip has `aria-disabled="true"` and a visible "(reporting cycle)" hint.
- **i18n:** the modal uses bare literals and `src/app/internationalization/` is a terminology service (no key files) → new copy is authored as literals, consistent with the surrounding component. Decision recorded; no implementer discretion.

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization
- JWT enforced by `JwtMiddleware` for `api/*`; the new routes are **not** added to the `.exclude()` list in `app.module.ts`.
- No new role; audience = same as `GET mqap`. Admin detection for the Year lock is client-side UX only; the server's own 422 remains the enforcement.
- Throttling: default `ThrottlerExcludeBilateralGuard` behaviour applies; no exclusion.
- Validation: per-route `ValidationPipe` (transform + whitelist) on both routes; `repository` enum; Solr escaping of `query` (§5).
- Secrets/leaks: no key; `CGSPACE_DISCOVERY_URL` never logged; all upstream errors are caught inside the service and converted to the fixed 502 wrapper so `error.exception.ts` (which echoes `exception.response` and logs stacks) never receives an Axios error (AC-9).
- Open redirect: `View details` host allow-list (§6.2).

## 8. Performance & Capacity
- Load: < 1 rps aggregate; each search = 1 upstream call (≤ 8 s timeout, typically < 1 s).
- Bounded in-memory TTL cache (§5): max 200 + 20 entries, per Lambda instance; worst-case memory ≈ 220 × 15 KB ≈ 3.3 MB.
- No new dependencies server or client; Lambda bundle unaffected.
- Payload ≤ 25 items × ~600 B ≈ 15 KB.

## 9. Observability
- Structured logs `cgspace.search`, `cgspace.facets`, `cgspace.search.upstream_4xx {status}`, `cgspace.config.missing` (§4.1/§5). No DynamoDB log (read-only).
- Metric touchpoint: `docs/prd.md` **M4.2** (p95 latency on hot endpoints) — target ≤ 2 s for this route; 502s here are isolated from result-write error budget (filter by route).

## 10. Testing Plan (forward-looking)
- **Server unit:** mapper vs recorded HAL fixture (`fixtures/cgspace-search.hal.json`, ≥ 2 items, one lacking DOI/country); service with mocked `HttpService`: success, timeout, 500, 404 (→ 502 + `upstream_4xx` warn), missing env; assert returned wrapper + every logger call contain no `cgspace.cgiar.org`; Solr escaping; cache TTL/eviction; DTO validation (`size=100`, 201-char query, no query+no filter, bad `repository`, bad facet name) through the same `ValidationPipe` options as the controller.
- **Client unit (Jest):** extend `tests/mocks/spartanBrainMock.ts` with `BrnTabs*` stubs first (prerequisite task). `KpCgspaceBrowseComponent`: debounce/min-length, Enter bypass, state transitions, filter clear omits param, non-admin always sends `year=phaseYear`, admin can clear, `itemSelected` emits, error copy + tab-switch link, host allow-list. `AowHloCreateModalComponent`: tabs only when KP (indicator or category 6), non-KP DOM snapshot unchanged, `onCgspaceItemSelected` sets `itemUrl` + calls sync (regex passes), `POST_createResult` body equality vs Manual path with mocked MQAP, existing-result response path.
- **Manual (HITL):** live smoke vs CGSpace (facet names, year filter form, a `10947/…` item through MQAP — evidence for JD-21); visual check vs mockup; keyboard pass on tabs.
- Coverage: new files ≥ 80 % lines; package thresholds unaffected.

## 11. Backwards Compatibility & Migration Plan
- Additive endpoints; no DB; no flag. Rollback = revert PR(s).
- `CGSPACE_DISCOVERY_URL` must be added to `serverless.yaml` env allowlist and to each environment before deploy; absent var degrades to Manual entry (R-10), so deploy order is not critical.

## 12. Design Decisions (ADRs)

### `KPB-DD-1` — Server-side proxy instead of direct client calls
- **Context:** Discovery HAL is verbose and repository-specific; CORS/rate limits unknown; MELSpace may follow.
- **Decision:** Proxy in `results-knowledge-products` with a slim DTO.
- **Alternatives considered:** direct client call (brittle, no fail-soft control); local harvested catalog (sync jobs + staleness for a search box).
- **Consequences:** one new service + 2 routes; a single place to add repositories/dedup later; PRMS owns the contract.

### `KPB-DD-2` — Selection reuses the MQAP path; Discovery data is never persisted
- **Context:** MQAP is the validated metadata source (FAIR, authors, institution mapping).
- **Decision:** Browse only yields a handle; downstream is the existing sync/create, including its existing-result and 422 handling.
- **Alternatives considered:** pre-fill title from Discovery (divergence risk); skip MQAP for browsed items (loses FAIR/institution mapping).
- **Consequences:** one extra round-trip after selection; body-equality test (AC-5) guarantees parity.

### `KPB-DD-3` — Bounded in-service TTL cache, no new dependency
- **Context:** the shared `global-parameter-cache` has no TTL; `@nestjs/cache-manager` is not installed; typing/pagination repeats identical queries.
- **Decision:** private `Map` with TTL + max-entries eviction inside `CgspaceDiscoveryService`.
- **Alternatives considered:** add `@nestjs/cache-manager` (new dep for one consumer); no cache (impolite to CGSpace); Redis (not in stack).
- **Consequences:** per-instance cache only; ~3 MB worst case; trivial to swap for cache-manager later.

### `KPB-DD-4` — Browsed items use the `cgspace.cgiar.org/items/<uuid>` URL; no regex change
- **Context:** the existing client regex accepts `{cgspace|repo.mel|worldfish}/items/<uuid>`, `hdl.handle.net/(10568|20.500.11766|20.500.12348)/…`, `cgspace.cgiar.org/handle/(10568|20.500.11766)/…`. Legacy `10947/…` handles fail only in `hdl.handle.net` form; the DTO carries `uuid`.
- **Decision:** set the handle to `itemUrl` (uuid form). Manual entry regex untouched. `handleSource` is kept for telemetry/reset only.
- **Alternatives considered:** bypass the regex for browse-sourced handles (relaxes a guard — rev 1 choice, overturned by JD-19); widen the regex globally (touches four KP surfaces).
- **Consequences:** no guard reversion → the Step 2.3 reversion challenge no longer applies. Residual risk: MQAP resolving uuid URLs for `10947` items is verified in the HITL smoke (JD-21).

### `KPB-DD-5` — Keep Browse panel mounted (`[hidden]`)
- **Context:** R-21 state persistence across tabs. **Decision:** hide, don't destroy; reset on close. **Alternatives:** `@if` + external store (more code). **Consequences:** hidden DOM stays in the drawer; negligible.

### `KPB-DD-6` — Year locked to the reporting-phase year for non-admins
- **Context:** `findOnCGSpace` 422s non-admins on year mismatch (JD-3); `phaseYear` is always available via `dataControlSE.reportingCurrentPhase`.
- **Decision:** non-admin: Year fixed = `phaseYear`, shown as a locked chip; admin: editable list `phaseYear-10..phaseYear`, clearable. Year is applied upstream as a `dcterms.issued` range.
- **Alternatives considered:** SHOULD-level default (rev 1 — lets users reach guaranteed failures); pre-flight client check after selection (still wastes a round-trip and shows a confusing error).
- **Consequences:** search space for non-admins is the current cycle only — by design, since nothing else is reportable.

### `KPB-DD-7` — `@spartan-ng/brain` tabs + Tailwind, superseding the proposal's "PrimeNG tabs"
- **Context:** PrimeNG was removed from the client (ux-ui §12); `@spartan-ng/brain@^1.1.0` ships a `tabs` entrypoint; no `hlm-tabs` wrapper exists yet.
- **Decision:** use brain tabs primitives styled with Tailwind; extend the Jest brain mock with `BrnTabs*` stubs.
- **Alternatives considered:** hand-rolled `role=tab` buttons (re-implements keyboard nav); a segmented control via `app-pr-button` group (no tablist semantics).
- **Consequences:** first tabs usage in the app — becomes the reference; mock extension is a prerequisite task.

### `KPB-DD-8` — Accepted deviation: scoped SCSS overrides for `app-pr-select` inside the Browse component
- **Context:** the Type/Center filters reuse the shared `app-pr-select`, whose dropdown width/hover/focus styles cannot be reached with Tailwind utilities from the consumer template. The implementation shipped `kp-cgspace-browse.component.scss` (`:host ::ng-deep … !important`) restyling `.custom_select` only within this component.
- **Decision:** accept the deviation from ux-ui §12 (Tailwind-only) for this component; verified working in HITL by the user. Everything else in the component stays Tailwind-only.
- **Alternatives considered:** extend `app-pr-select` with size/width inputs (touches a shared component used across the app — out of this spec's scope); rewrite the filters without `app-pr-select` (loses shared behaviour).
- **Consequences:** coupling to `pr-select` internal markup; a future `pr-select` refactor must re-check this file. Follow-up recorded in §13 to promote the needed knobs into `app-pr-select` and delete the SCSS.

## 13. Open Gaps & Follow-ups
- Follow-up: add width/variant inputs to `app-pr-select` so `kp-cgspace-browse.component.scss` can be removed (`KPB-DD-8`).
- Follow-up spec: apply `KpCgspaceBrowseComponent` to `result-creator`, `bilateral-result-creator`, `lab-report-form`.
- Follow-up: MELSpace/WorldFish via `repository` param + dedup (proposal OQ-4).
- Verify in the fixture task: exact metadata keys for DOI/country, accepted `dateIssued` filter form, MQAP resolution of a `10947` uuid URL (JD-17/JD-21).
- Accepted risk: facet `affiliation` truncation mitigated by prefix type-ahead.

## 14. Size check (Step 2.4)
Estimate: **9 tasks · ~780 LOC including tests · 1–2 review rounds** (rev 1 said 8 / ~650 excluding tests; the mock-extension task and Year-lock logic were added by Judgment Day). Still **Standard** — no data/auth change for Full, too large for Lite.

## Required cross-references
- `docs/specs/changes/kp-cgspace-browse/requirements.md`
- `docs/prd.md` — US-S1, US-S5, G4 / M4.2, AC-3, AC-8, AC-9
- `docs/ux-ui/design.md` — §7 tokens, §8 components, §9 responsive, §10 a11y, §12 Tailwind/PrimeNG-removal rule
- `docs/trd/trd.md` — `results-knowledge-products` module, `m-qap` integration
- `docs/infrastructure.md` §6 — env var registration
- `docs/specs/changes/kp-cgspace-browse/judgment.md` — round-1 findings and dispositions
