# Proposal — Browse CGSpace when reporting a Knowledge Product

## Document Control

| Field | Value |
|---|---|
| Slug | `kp-cgspace-browse` — derived from free-text argument ("mapear un KP … buscar tal como está en el mockup Browse CGSpace or manual entry") |
| Spec path | `docs/specs/changes/kp-cgspace-browse/` |
| Type | Change |
| Approval Mode | gated |
| Depends on | none |
| Parallel-safe | yes (new integration module + one client modal; no shared migrations) |
| Status | approved (2026-08-26) |
| Date | 2026-08-26 |
| Author | Juan Carlos Cadavid |
| Baseline | `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md` |

## Intent

When a user reports a result against a **"Number of knowledge products"** indicator in Result Framework Reporting (`/result-framework-reporting/entity-details/<SP>?tocView=aows` → *Report*), let them **search CGSpace by title, author or DOI and pick the item** instead of having to already know and paste the handle. The current paste-handle + Sync flow stays as **Manual entry**.

## Problem / Current Behavior

- The *Report result* drawer for a KP shows a single path: `Repository link/handle` → **Sync** (`aow-hlo-create-modal.component.ts:266 GET_mqapValidation`), which validates the URL with a regex (CGSpace / MELSpace / WorldFish) and resolves metadata through **MQAP** (`onecgiar-pr-server/src/api/m-qap/m-qap.service.ts`, `results-knowledge-products.controller.ts:37 GET mqap`).
- Users often do not have the handle at hand; they know the title/author. They must leave PRMS, search CGSpace, copy the link, and come back.
- MQAP is a handle → metadata **lookup**, not a catalog, so no in-app search is possible today (see `dspace-discovery-api-notes.md`).

## Proposed Outcome

Inside the same drawer, a two-tab switch **Browse CGSpace | Manual entry** (mockup `mockup/browse-cgspace.png`):

| Tab | Behaviour |
|---|---|
| **Browse CGSpace** (default) | Search box ("Search by title, author or DOI…"), filters **Type / Year / Center**, counter "Showing N of M items from CGSpace", paginated result cards (title · type · year · first author et al. · center · countries · handle) with **Use this item** and **View details** (opens the CGSpace record). |
| **Manual entry** | Exactly today's flow: paste handle → Sync. |

**Use this item** fills the handle and runs the same MQAP sync that Manual entry runs → the rest of the form (title retrieved from repository, contribution, centers, programmes…) behaves identically. **No change to what gets persisted.**

## Scope

- **Server:** new read-only integration `GET /api/results/results-knowledge-products/cgspace/search` (Discovery API proxy: `query`, `page`, `size`, `type`, `year`, `center`) returning a slim PRMS DTO (handle, title, type, year, authors, center/affiliation, countries, doi, uri). Server-side because CGSpace CORS/rate-limits and to keep the payload shape stable for the client.
- **Client:** tab switch + search UI in `aow-hlo-create-modal` (RFR flow) with the KP-only guard `currentResultIsKnowledgeProduct()`.
- Unit tests both sides; spec for the DTO contract.

## Non-Goals

- Multi-repository merge/dedup (MELSpace, WorldFish) — CGSpace only in this change; the endpoint takes a `repository` param reserved for later.
- Replacing MQAP: MQAP remains the metadata source of truth after selection.
- Applying the Browse tab to the other KP creation surfaces (`result-creator`, `bilateral-result-creator`, `lab-report-form`) — candidate follow-up once the component is proven here.
- Caching/harvesting a local KP catalog.

## Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Users | Science-programme reporters (SP leads, center focal points) reporting KPs in RFR. |
| Client | `pages/result-framework-reporting/.../aow-hlo-table-create-modal/*` (+ `resultsSE` API service). |
| Server | New `cgspace` sub-service under `results-knowledge-products` (or `api/dspace-discovery` module); `HttpService`; env var for the Discovery base URL. |
| External | CGSpace DSpace 7 Discovery API `https://cgspace.cgiar.org/server/api/discover/search/objects` (public, no key). |
| Specs | None existing. Cites TRD integrations section (MQAP) — this adds a sibling integration. |

## Visual Reference

- Source: User-provided mockup (image) + current-state screenshot
- Location: `docs/specs/changes/kp-cgspace-browse/mockup/browse-cgspace.png` (target), `mockup/current-manual-entry.png` (today)
- Notes: Covers the drawer's KP section only. Tab tokens/components must follow `docs/ux-ui/design.md` §7–8 (existing `@spartan-ng/brain` tabs primitive + Tailwind segmented-control styling, chips, buttons — PrimeNG is no longer in the client (ux-ui §12)).

## Requirement Delta Preview

### ADDED Requirements
- Tab switch **Browse CGSpace / Manual entry** in the KP report drawer; Browse is default.
- Free-text search (title/author/DOI) against CGSpace with Type / Year / Center filters, pagination, and result count.
- **Use this item** → populates handle + triggers existing sync; **View details** → opens `dc.identifier.uri` in a new tab.
- Server endpoint proxying Discovery API with error fail-soft (CGSpace down → message + Manual entry still usable).

### MODIFIED Requirements
- The handle input + Sync move under the *Manual entry* tab (same validation, same MQAP call).

### REMOVED Requirements
- None.

## Findings from live validation (2026-08-26)

Verified against `cgspace.cgiar.org` — the research notes' field names are **partly wrong for CGSpace** and the spec must use these instead:

| Notes say | CGSpace actually exposes | Facet name (for filters) |
|---|---|---|
| `dc.date.issued` | `dcterms.issued` | `dateIssued` |
| `dc.type` | `dcterms.type` | `itemtype` |
| `cg.contributor.center` | `cg.contributor.affiliation` | `affiliation` |
| `dc.description.abstract` | `dcterms.abstract` | — |
| `cg.coverage.country` | present as facet `country` | `country` |

Filters can be applied with Discovery's `f.<facet>=<value>,equals` (e.g. `f.itemtype=Journal Article,equals`, `f.dateIssued=2026,equals`); facet values for the dropdowns come from `GET /server/api/discover/facets/<name>`.

## Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| A | Client calls CGSpace Discovery directly | No server work | CORS/availability risk, HAL parsing in the client, brittle to DSpace changes, no place to add MELSpace later |
| B | **Server proxy endpoint with slim DTO + client tabs (recommended)** | Stable contract, fail-soft handled once, room for multi-repo & caching later, testable with mocked HTTP | One new NestJS service + env var |
| C | Harvest CGSpace into a local catalog table | Fast, offline-tolerant | Sync jobs, staleness, storage; over-engineered for the ask |

## Recommended Approach

**Option B.** Smallest path that keeps the persisted KP flow untouched: the Browse tab only *finds a handle*; everything downstream reuses `GET_mqapValidation` and `POST_createResult` as-is.

## Risks, Dependencies, And Open Questions

| Kind | Item |
|---|---|
| Risk | Discovery API is public & unauthenticated but unthrottled use from PRMS could be rate-limited → debounce search (≥400 ms), `size=10`, server-side short cache (60 s) per query. |
| Risk | Handle formats: CGSpace results include `10568/…` and legacy `10947/…` prefixes; the current client regex only accepts `10568` / `20.500.11766` → **the regex must be relaxed for items chosen from CGSpace** (or bypass regex when the handle comes from Browse). |
| Dependency | Env var for the Discovery base URL in all environments (`docs/infrastructure.md`). |
| OQ-1 | Should the Year filter use publication year (`dateIssued`) or upload year (`dc.date.accessioned`)? Proposal: `dateIssued`, defaulting to the reporting year. |
| OQ-2 | Should the *Center* filter be pre-set to the user's center / the indicator's contributing centers? |
| OQ-3 | Should Browse also be rolled out to `result-creator`, `bilateral-result-creator`, and `lab-report-form` in this change, or as a follow-up? Proposal: follow-up (Non-Goals). |
| OQ-4 | Is MELSpace/WorldFish search needed for P25 reporting? If yes, chunk as a second proposal. |

## Success Criteria

- A KP reporter can find and select an item from CGSpace by title/author/DOI without leaving PRMS, and the created result is byte-for-byte equivalent to one created via Manual entry with the same handle.
- Search responds < 2 s p95 for a 10-item page; CGSpace outage degrades to a visible message with Manual entry still working.
- Jest coverage on the new server service (mocked Discovery HAL payload) and on the modal tab/search behaviour; client thresholds unchanged.

## Next Step

```text
/akili-specify changes/kp-cgspace-browse
```
