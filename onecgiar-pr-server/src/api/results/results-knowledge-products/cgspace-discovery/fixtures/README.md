# Discovery API fixtures — metadata contract (CGSpace, MELSpace, WorldFish)

Live-captured fixtures from the three public DSpace 7 Discovery APIs PRMS's Knowledge Product
Browse tab reads from. §1–6 below pin the original CGSpace fixture (task `KPB-T-1`). §7 pins the
MELSpace and WorldFish fixtures added by task `KPM-T-1`, consumed by
`fixtures-keys.spec.ts` and the adapter registry (`docs/specs/changes/kp-multi-repository-browse/design.md`
§3.3).

- **Captured:** 2026-08-26 (task `KPB-T-1`), with `curl -m 30`, no auth, no key.
- **Base URL:** `https://cgspace.cgiar.org/server/api` (public host; the runtime value comes from `CGSPACE_DISCOVERY_URL`).
- **File:** `cgspace-search.hal.json` (~12 KB).

## 1. Requests used (all returned HTTP 200)

| # | Path (relative to base URL) | Purpose | Result |
|---|---|---|---|
| 1 | `/discover/search/objects?dsoType=item&query=maize&size=3` | baseline search | `totalElements=32055`; items `10947/4262`, `10947/4573`, `10947/2810` |
| 2 | `/discover/search/objects?dsoType=item&query=maize&size=3&f.itemtype=Journal%20Article,equals` | type filter | `totalElements=6776`; all items `dcterms.type=Journal Article` |
| 3 | `/discover/search/objects?dsoType=item&query=maize&size=3&f.dateIssued=2024-01-01T00:00:00Z,2024-12-31T23:59:59Z,equals` | year range, ISO form | **200 but `totalElements=0`** — form accepted, does not match |
| 4 | `/discover/search/objects?dsoType=item&query=maize%20AND%20dcterms.issued:%5B2024%20TO%202024%5D&size=3` | year via query addend | `totalElements=2497`; all `dcterms.issued` start with `2024` |
| 5 | `/discover/search/objects?dsoType=item&query=maize&size=3&f.dateIssued=2024,equals` | year as facet value | `totalElements=2495`; all `dcterms.issued` start with `2024` (also checked `page=50`) |
| 6 | `/discover/search/objects?dsoType=item&query=maize&size=3&f.dateIssued=%5B2024%20TO%202024%5D,equals` | year as bracketed range | `totalElements=2495`; same result set as #5 |
| 7 | `/discover/search/objects?dsoType=item&query=maize&size=5&f.dateIssued=2020,equals` | constraint cross-check | `totalElements=1425`; all items dated `2020-…` |
| 8 | `/discover/search/objects?dsoType=item&query=maize&size=5&f.dateIssued=%5B2020%20TO%202024%5D,equals` | multi-year range | `totalElements=9460`; items dated 2020–2024 |
| 9 | `/discover/facets/itemtype?size=5` | facet values | see §4 |
| 10 | `/discover/facets/affiliation?prefix=Inter&size=5` | facet prefix type-ahead | see §4 |

## 2. Fixture composition (not hand-written)

The three `objects[]` entries are verbatim `indexableObject`s captured from requests #2, #1 and #5
above, chosen so the mapper spec covers every branch:

| index | handle | uuid | from request | DOI | country |
|---|---|---|---|---|---|
| 0 | `10568/74449` | `679513e4-eeba-4a06-a017-015862e7b9b3` | #2 (`f.itemtype=Journal Article`) | yes | `Kenya` |
| 1 | `10947/4262` | `8914c5a5-2102-4eae-954d-3cfcce27246c` | #1 (baseline, legacy `10947` prefix) | **absent** | **absent** |
| 2 | `10568/159697` | `5dcef492-2ed6-4453-9745-f2d66d87b501` | #5 (`f.dateIssued=2024,equals`) | absent | `Malawi` |

Trimming applied (values untouched, nothing added):
- Top level keeps `type` and `_links.self` only (`id/scope/query/appliedFilters/sort/configuration` dropped).
- `searchResult` keeps `page`, `_links.self`, `_embedded.objects`. Because the three items come from
  three requests, **`page` is normalised to `{number:0,size:3,totalElements:3,totalPages:1}`** — the
  only non-captured value in the file; the real `page` shapes are in §1.
- Each object keeps `type`, `_links.indexableObject`, `_embedded.indexableObject` (`hitHighlights` dropped).
- `indexableObject` keeps `id`, `uuid`, `name`, `handle`, `entityType`, `type`, `metadata`
  (`inArchive/discoverable/withdrawn/lastModified/_links` dropped).
- `metadata` restricted to the 8 keys in §3. Every value keeps DSpace's
  `{value, language, authority, confidence, place}` shape.

## 3. Metadata contract (HAL → `CgspaceItemDto`)

HAL traversal: `_embedded.searchResult._embedded.objects[]._embedded.indexableObject`; page at
`_embedded.searchResult.page`. Every metadata key is an **array** of `{value, language, authority, confidence, place}`.

| DTO field | Source key | Sample value (fixture) | Notes |
|---|---|---|---|
| `uuid` | `indexableObject.uuid` | `679513e4-eeba-4a06-a017-015862e7b9b3` | also duplicated as `id` |
| `handle` | `indexableObject.handle` | `10568/74449`, `10947/4262` | `10947` = legacy CGIAR prefix, still served by CGSpace |
| `title` | `dc.title[0].value` | `Effect of Lablab purpureus L. cover crop …` | single-valued, `language: "en"` |
| `authors` | `dc.contributor.author[].value` | `["Mwangi, H.W.", "Kihurani, A.W.", …]` | multi-valued, ordered by `place`; corporate authors appear here too (`CGIAR Research Program on Maize`) |
| `type` | `dcterms.type[0].value` | `Journal Article`, `Proposal`, `Presentation` | values match the `itemtype` facet labels exactly |
| `year` | first 4 chars of `dcterms.issued[0].value` | `2015-06` → 2015, `2016-04` → 2016, `2024-11` → 2024 | granularity varies: `YYYY`, `YYYY-MM`, `YYYY-MM-DD` |
| `affiliations` | `cg.contributor.affiliation[].value` | `["Kenya Agricultural Research Institute", …, "International Institute of Tropical Agriculture"]` | multi-valued; values match the `affiliation` facet labels |
| `doi` | `cg.identifier.doi[0].value` | `https://doi.org/10.1016/j.cropro.2015.02.013` | **full URL form**, not bare DOI; absent on items 1 and 2 → `null` |
| `countries` | `cg.coverage.country[].value` | `["Kenya"]`, `["Malawi"]` | absent on item 1 → `[]`; `cg.coverage.iso3166-alpha2` exists upstream but is not kept |
| `uri` | `dc.identifier.uri[0].value` | `https://hdl.handle.net/10568/74449` | `https://hdl.handle.net/<handle>` for all captured items |
| `handleUrl` | derived | `https://hdl.handle.net/10568/74449` | — |
| `itemUrl` | derived | `https://cgspace.cgiar.org/items/<uuid>` | — |

Confirmed **wrong** for CGSpace (absent from live responses): `dc.date.issued`, `dc.type`,
`cg.contributor.center`, `dc.identifier.doi`, `dc.coverage.country`.

## 4. Filter and facet contract

- **Type:** `f.itemtype=<label>,equals` (request #2, 200, constrained).
- **Affiliation/center:** `f.affiliation=<label>,equals` — this is the exact form the facet endpoint
  itself advertises in `_embedded.values[]._links.search.href`.
- **Year — accepted form:** `f.dateIssued=YYYY,equals` (#5, #7). Equivalent bracketed forms
  `f.dateIssued=[YYYY TO YYYY],equals` (#6) and `[YYYY1 TO YYYY2],equals` (#8) also work. The query
  addend `dcterms.issued:[YYYY TO YYYY]` (#4) works too but couples the year to the free-text
  `query`. **Recommended:** `f.dateIssued=<year>,equals` — simplest and orthogonal to `query`.
- **Year — rejected form:** the ISO-timestamp pair `f.dateIssued=2024-01-01T00:00:00Z,2024-12-31T23:59:59Z,equals`
  returns 200 with **0 results** (#3); do not use it. The design's `dateIssued:[YYYY TO YYYY]`
  intent is satisfied by the recommended form.
- **Facets** `GET /discover/facets/{itemtype|affiliation}?prefix=&size=` return:
  `{ name, facetType: "text", facetLimit, prefix, page: {number,size}, _links: {self,next},
  _embedded: { values: [ { label, count, authorityKey: null, type: "discover", _links: { search: { href } } } ] } }`.
  There is **no separate `value` field** — `label` is the filter value (`label` → DTO `label`/`value`,
  `count` → `count`). Samples: `itemtype` → `Journal Article` (41738), `Report` (19040), `Brief` (11541),
  `Book Chapter` (10447); `affiliation?prefix=Inter` → `International Livestock Research Institute` (16588),
  `International Institute of Tropical Agriculture` (10620), `International Center for Tropical Agriculture` (9464).
- **Sort:** not exercised here; design §3.3 pins `dc.date.accessioned,DESC` for empty `query`.

## 5. MQAP resolution of a `10947` item via the uuid URL (design §13 / JD-21)

**Not verified locally — HITL T-9.** `MQAP_URL`/`MQAP_KEY` are present in the local `.env`, but
`POST` with `{ "link": "https://cgspace.cgiar.org/items/8914c5a5-2102-4eae-954d-3cfcce27246c" }`
(the `10947/4262` item), and the control links `https://hdl.handle.net/10947/4262` and the
`10568/74449` uuid URL, all returned `401 { "message": "Invalid API-key" }` on 2026-08-26 — the
local key is not accepted by that MQAP environment, so nothing can be concluded about uuid-URL
resolution. The HITL smoke must run the same three links with a valid key and record whether the
`10947` uuid URL returns a `Handle`.

## 6. Security note

Public repository metadata only. No credentials, keys or non-public hosts are present in this
directory; env var names are cited, values never.

## 7. MELSpace and WorldFish fixtures (task `KPM-T-1`)

Pins the *capture*/*confirm* cells of `docs/specs/changes/kp-multi-repository-browse/design.md` §3.3
for the `melspace` and `worldfish` adapter rows.

- **Captured:** 2026-09-10 (`date -u` → `Thu Sep 10 18:46:xx UTC 2026`), with `curl -s -m 30`, no auth,
  no key.
- **Base URLs:** `https://repo.mel.cgiar.org/server/api` (`MELSPACE_DISCOVERY_URL`),
  `https://digitalarchive.worldfishcenter.org/server/api` (`WORLDFISH_DISCOVERY_URL`).
- **Files:** `melspace-search.hal.json`, `worldfish-search.hal.json` (each one untrimmed HAL search
  response, byte-identical to its `curl` output — no pretty-print, no manual edits), `melspace-facets.json`,
  `worldfish-facets.json` (each an object with keys `facetsIndex` / `itemtypeFacet` / `instituteFacet`,
  built by parsing the three raw `curl` captures below with a small Python script that only nests the
  parsed objects under those keys — no value was hand-typed or edited).

### 7.1 Requests used (all returned HTTP 200)

| # | Host | Path (relative to base URL) | Purpose | Result |
|---|---|---|---|---|
| 1 | MEL | `/discover/search/objects?dsoType=item&query=wheat&size=5&f.itemtype=Journal%20Article,equals` | search fixture | `totalElements=1157`; 5 items, all `Journal Article`; 2 of 5 carry `cg.identifier.doi` |
| 2 | MEL | `/discover/facets` | facet index | `facetsIndex`; 15 facets incl. `itemtype` (text), `institute` (text), `dateIssued` (date) |
| 3 | MEL | `/discover/facets/itemtype?size=20` | type facet | `itemtypeFacet`; top value `Journal Article` (4258) |
| 4 | MEL | `/discover/facets/institute?size=20` | center facet | `instituteFacet`; top value `International Center for Agricultural Research in the Dry Areas - ICARDA` (10412) |
| 5 | WorldFish | `/discover/search/objects?dsoType=item&query=fish&size=5&f.itemtype=Journal%20Article,equals` | search fixture | `totalElements=1946`; 5 items, all `Journal Article`; 3 of 5 carry `dc.identifier.doi` |
| 6 | WorldFish | `/discover/facets` | facet index | `facetsIndex`; 15 facets incl. `itemtype` (text), `institute` (text), `dateIssued` (date) |
| 7 | WorldFish | `/discover/facets/itemtype?size=20` | type facet | `itemtypeFacet`; top value `Journal Article` (2344) |
| 8 | WorldFish | `/discover/facets/institute?size=20` | center facet | `instituteFacet`; top value `WorldFish` (3900) |

Year-filter probe (not stored as a fixture — a live cross-check only, same pattern as CGSpace §1 #5–8):
`f.dateIssued=[2024 TO 2024],equals` on the same `query`/`f.itemtype` combination constrained
`totalElements` from 1157 → 89 (MEL) and from 1946 → 506 (WorldFish); both hosts accept the same
bracketed-range form CGSpace uses.

### 7.2 Metadata keys confirmed present (at least one item in each search fixture)

| Field | MELSpace key | WorldFish key |
|---|---|---|
| Title | `dc.title` | `dc.title` |
| Type | `dc.type` | `dc.type` |
| Year | `dcterms.available` (all 5 items) | `dc.date.issued` (all 5 items) |
| Authors | `dc.creator` (+ `dc.contributor` on some items) | `dc.creator` |
| DOI | `cg.identifier.doi` (2 of 5 items; absent → no `null`-only fixture, the field is simply missing on the other 3) | `dc.identifier.doi` (3 of 5 items) |
| URI | `dc.identifier.uri` (all 5 items) | `dc.identifier.uri` (all 5 items) |
| Affiliation / center | `cg.contributor.center` (all 5 items) | `cg.contributor.affiliation` (all 5 items) |

Both design-doc placeholders resolved as: MEL affiliation field is `cg.contributor.center`
(**not** `cg.contributor.affiliation`, which does not appear on any MEL item in this capture);
WorldFish affiliation field is `cg.contributor.affiliation`, matching the design's default guess.
`dc.identifier.uri` is confirmed (not merely assumed) for both hosts.

### 7.3 Facet contract

- **Facet index** (`GET /discover/facets`) lists the same 15 facet names on both hosts:
  `author, subject, dateIssued, entityType, itemtype, institute, region, country, crp, sdg,
  initiative, action_area, impact_area, scienceprogram, project` (order varies slightly by host).
- **Type facet:** physical name `itemtype` on both hosts (same name CGSpace uses).
- **Center facet:** physical name `institute` on both hosts (confirms the design doc's "observed
  `institute`" note for MEL, and extends it to WorldFish, which was previously unconfirmed).
- **Year filter:** `f.dateIssued=[YYYY TO YYYY],equals` works on both hosts (verified constraining,
  §7.1). **No fallback is needed for either host** — `KPM-DD-7`'s server-side post-filter path is
  not exercised by MEL or WorldFish.
- Neither host lacks an affiliation field, a center facet, or a year facet — `KPM-OQ-3`'s "hide the
  Center filter" branch does not apply to either new host.

### 7.4 Security note

Public repository metadata only. No credentials, keys, or non-public hosts are present in this
directory; env var names are cited, values never.
