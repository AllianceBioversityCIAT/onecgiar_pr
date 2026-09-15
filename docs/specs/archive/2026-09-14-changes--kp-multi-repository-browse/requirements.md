# Requirements — Browse Knowledge Products across CGSpace, MELSpace and WorldFish

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-multi-repository-browse/` |
| Module code | `KPM` |
| Type | Change · Depth: **Standard** |
| Approval Mode | pre-approved (inherited from `proposal.md`; routine gates logged as `auto-approved (pre-approved mode)`) |
| Status | approved (rev 1.1, 2026-09-10 — Phase 1 gate auto-approved, pre-approved mode; wording aligned after design judgment-day, see `judgment.md`) |
| Owner | Juan Carlos Cadavid |
| Date | 2026-09-10 |
| Baseline | `docs/prd.md` (US-S1, US-S5, G1, G4, AC-3, AC-8, AC-9; §integrations "CGSpace handle source") · `docs/ux-ui/design.md` §6 drawers, §7 tokens, §8 component rules + Form UX Pattern `RFUX-R-2/R-5`, §9 responsive, §10 a11y · `docs/trd/trd.md` (`results-knowledge-products`, `m-qap`, integrations CGSpace/MQAP) |
| Extends | `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/` (`KPB-R-*`, `KPB-DD-*`) and `2026-09-03-changes--kp-cgspace-search-retry/` (`KCSR-R-1`) |
| Intent source | `proposal.md` (approved 2026-09-10) · Codeobia e-mail 2026-09-08 (field map, hosts, dedup advice) |
| Visual reference | `mockup/browse-repositories.html` + `.png` (results state, one deduplicated card, one repository unavailable) |

## Executive Summary

The Browse panel used when reporting a Knowledge Product searches only CGSpace today, although PRMS already accepts and syncs handles from MELSpace and the WorldFish Digital Archive through Manual entry. This spec makes discovery match selection: the panel tells the user that **three** CGIAR repositories are searched, lets them keep one, several or all of them active, runs one search across the selection, shows one merged list with a repository badge per item, collapses duplicates found in more than one repository, and degrades to partial results when a repository fails. Selection (*Use this item* → MQAP sync) is unchanged for all three repositories.

## Glossary

| Term | Meaning |
|---|---|
| Repository | One of `cgspace` (CGSpace), `melspace` (MELSpace, `repo.mel.cgiar.org`), `worldfish` (WorldFish Digital Archive, `digitalarchive.worldfishcenter.org`). All three are DSpace 7 instances exposing the Discovery API. |
| Discovery API | `GET /server/api/discover/search/objects` and `/discover/facets/{name}` on a DSpace 7 host. Read-only, public. |
| Adapter | Per-repository configuration on the server: base URL, item host, metadata field names, facet names, handle prefixes. |
| Source | One repository's contribution to a merged response: `{ repository, status, total }`. |
| Primary / secondary handle | On a deduplicated card, the handle used by *Use this item* (primary) and the other repositories' handles for the same item (secondary). |
| MQAP | Existing handle-resolution service that returns the validated KP metadata after selection. Unchanged. |
| Phase year | Active reporting-phase year; non-admins can only report KPs published in it (`KPB-R-12`). |

## 1. Module / Feature

- **Module:** `results` (server `api/results/results-knowledge-products/cgspace-discovery/`; client KP browse component and its three hosts)
- **Sub-feature:** Multi-repository Knowledge Product discovery
- **Owner:** Juan Carlos Cadavid
- **Status:** approved
- **Ticket(s):** lineage P2-3231 (CGSpace browse); new ticket to be assigned

## 2. Context

The CGSpace browse (`KPB`) shipped a server proxy with a slim item DTO and a client component with search, three filters, five UI states, retry (`KCSR`) and a reporting-year lock. Its DTO already reserved `repository` (`KPB-R-30`) and its design named MELSpace/WorldFish as the expected follow-up (`KPB` §13). Codeobia confirmed on 2026-09-08 that each repository should be queried directly, that the two hosts are the supported entry points, and which metadata fields are authoritative per repository.

Flows touched: `docs/ux-ui/design.md` F1 (submitter creates a typed result) in three surfaces: the Reporting drawer (`lab-report-form`), the AoW create modal (`aow-hlo-create-modal`) and the result creator (`report-result-form`). Server surfaces: the two `cgspace/*` routes on `ResultsKnowledgeProductsController`, the discovery service/mapper, env config; the user-facing copy of `findOnCGSpace` (messages only).

## 3. In Scope / Out of Scope

### In scope

- Repository source strip with three toggle chips, counts and unavailable state.
- One search + filters across the selected repositories; merged list with badges; deduplication; partial-results notice with per-repository retry.
- Server: per-repository adapters, `repository` list parameter, parallel fan-out, merge/dedup, `sources[]`, facet union, two new env vars, captured fixtures.
- Copy generalization in the browse component, its three hosts, and the sync error messages.
- Docs: TRD integrations row, server guide env list, `design.md` note if the source-selector becomes a reusable pattern.

### Out of scope

- Aggregation service on MEL's side; persistence of Discovery data (`KPB-DD-2` stays).
- Changes to MQAP, the KP entity, the Manual entry regex, or the reporting-year rule.
- Cross-repository relevance scoring; remembering the repository selection across drawer sessions.
- Renaming `kp-cgspace-browse` (follow-up, mechanical).
- Bilateral `type-knowledge-product` section (MQAP-based, no Discovery).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Center staff) | Finds KPs from any of the three repositories without leaving Browse or knowing where the item lives; sees which repository each item comes from. |
| Result submitter (MEL-managed centers, WorldFish) | Browse becomes usable for them; today they must paste handles. |
| Platform admin | Same as submitter, keeps the editable Year filter. Two new env vars to configure per environment. |
| QA reviewer / PMU lead | No change — created results are identical to Manual entry. |
| Bilateral consumer | No change. |

## 5. User Stories

- **`KPM-US-1`** — As a submitter, I want to see that Browse covers CGSpace, MELSpace and WorldFish, so that I trust the search before typing. (Refines US-S1)
- **`KPM-US-2`** — As a submitter, I want to restrict the search to the repository my center uses, or search all at once, so that results stay relevant. (Refines US-S1, US-S5)
- **`KPM-US-3`** — As a submitter, I want an item published in two repositories shown once, so that I do not report a duplicate by mistake. (Refines US-S1, AC-1)
- **`KPM-US-4`** — As a submitter, I want results from the repositories that answered even when one is down, so that an outage elsewhere does not block me. (Refines G4)
- **`KPM-US-5`** — As an admin, I want a missing repository URL to degrade gracefully, so that a partial deployment never breaks KP reporting. (Refines G4, AC-9)

## 6. Functional Requirements

### Required (MUST)

- **`KPM-R-1` Source strip.** When the Browse tab renders, the panel MUST show, above the search input, a lead-in line stating that 3 CGIAR knowledge repositories are searched and one toggle chip per repository — **CGSpace**, **MELSpace**, **WorldFish** — all selected on open.
- **`KPM-R-2` Selection rules.** A chip toggles its repository; at least one repository MUST remain selected — the last selected chip MUST be non-interactive (`aria-disabled`) with an accessible reason. A **Select all** action MUST appear whenever fewer than three are selected. Changing the selection MUST re-run the current search under the same debounce and identical-params rules the filters use (`KPB-R-2/3`); with nothing searchable (`canSearch()` false) it only updates the strip. Selection resets to all three when the drawer closes (`KPB-R-21` scope).
- **`KPM-R-3` One search, all selected repositories.** Free text, Type, Center and Year MUST apply to every selected repository in one request. Type and Center option lists MUST be the union of the selected repositories' facet values (label-normalized as today for centers); the server MUST translate each value to the repository's own facet name, and a repository lacking the value simply contributes zero items.
- **`KPM-R-4` Merged list.** Results MUST render as one list. Every card MUST carry a repository badge (name + distinguishable dot color, tokens per `design.md` §7). The counter MUST read `Showing N of M items · <Repo> a · <Repo> b …` listing only the selected repositories that answered. Ordering: round-robin across the selected repositories, preserving each repository's own order (relevance rank when a query is present, newest-accessioned first otherwise) — no cross-repository re-scoring.
- **`KPM-R-5` Deduplication.** Items matched across repositories MUST collapse into one card. Match rule: same DOI after normalization (lowercase, strip `https://doi.org/`, `doi:`); else same normalized title (lowercase, punctuation and whitespace collapsed) **and** same type **and** same year. The card shows the primary repository badge (priority CGSpace › MELSpace › WorldFish), an "Also in <repo>" note per secondary repository, and the secondary handles. *Use this item* uses the primary handle. A DOI match MUST win over a title mismatch; a title match without equal type or year MUST NOT collapse.
- **`KPM-R-6` Per-repository counts and states.** After each search, each selected chip MUST show its `totalElements`; a repository whose source status is `timeout | error | unconfigured` MUST render as **unavailable** (never as `0`) with a tooltip naming the state, and MUST stay toggleable so the user can exclude it.
- **`KPM-R-7` Partial results and error state.** When ≥ 1 selected repository answered and ≥ 1 failed, the panel MUST render the answered items **and** an inline notice above the list naming the failed repositories with one **Retry <repo>** action each. The **error** state (`KPB-R-10/11`) MUST render only when every selected repository failed; its copy MUST name the repositories that failed and keep the Manual entry link.
- **`KPM-R-8` Server search contract.** `GET results-knowledge-products/cgspace/search` MUST accept `repository` as a list of `cgspace | melspace | worldfish` (repeatable or comma-separated; default all three); any other value MUST return 400. The response MUST add `sources: [{ repository, status: 'ok' | 'timeout' | 'error' | 'unconfigured', total, hasMore }]` next to `items` and `page`. `size` is a per-repository page size (merged page ≤ `size × selected repositories`). Each repository MUST be queried in parallel with its own 8 s timeout and its own cache key; only successful source results MAY be cached; one failing source MUST NOT fail the others (settled, not raced). Every item MUST carry `repository`, a `handleUrl` and an `itemUrl` built from that repository's host, and metadata mapped with that repository's field names (Type, Year, Authors, DOI per the Codeobia table in `proposal.md`). Responses and logs MUST NOT contain upstream hostnames or raw upstream bodies (`AC-9`).
- **`KPM-R-9` Facet union.** `GET results-knowledge-products/cgspace/facets/:name` MUST accept the same `repository` list, query each selected repository's equivalent facet, and return the union (case-insensitive merge on the normalized label; counts summed). Allowed logical names stay `itemtype | affiliation`; the per-repository physical facet name is an adapter concern.
- **`KPM-R-10` Fixture-first.** Before the MELSpace and WorldFish adapters are finalized, one search response and the two facet responses of each host MUST be captured from the live API into repository fixtures (not hand-written) and the field/facet names in the adapters MUST be read from those captures (`KZ-KPB-2`).
- **`KPM-R-11` Copy generalization.** The following MUST no longer read as CGSpace-only: the tab label (**Browse repositories**), search placeholder, idle, empty and error copy, the counter, the "Selected from …" banner and the "Retrieving metadata from …" / "Invalid … URL" strings in the three hosts (the banner MUST name the item's repository), and the user-facing sync messages in `findOnCGSpace` (repository-neutral wording). Mentions of "CGSpace" as one repository among the three remain valid. A grep gate over the listed files MUST find no remaining CGSpace-only phrasing.
- **`KPM-R-12` Selection parity.** *Use this item* on an item from any repository MUST set the handle to that item's `itemUrl` (the `<host>/items/<uuid>` form the existing regex accepts) and trigger the same MQAP sync used by Manual entry, producing a `POST_createResult` body identical to Manual entry for the same handle (`KPB-R-5/8/13` unchanged, now for three hosts).
- **`KPM-R-13` Unconfigured repository.** A repository whose base-URL env var is missing MUST be reported as `unconfigured` in `sources[]` (HTTP 200 overall when any other source answered), never as a 5xx, and never disclose which variable is missing to the client.
- **`KPM-R-15` View details for every repository.** *View details* MUST open the item's repository record for items from any of the three repositories; the client host allow-list MUST accept `cgspace.cgiar.org`, `repo.mel.cgiar.org`, `digitalarchive.worldfishcenter.org` and `hdl.handle.net`, and MUST still refuse any other host (`KPB` open-redirect guard kept).
- **`KPM-R-14` UI states.** The Browse tab MUST render distinct **idle**, **loading**, **results**, **results + partial notice**, **empty** (no item in any answered repository) and **error** (all failed) states; inputs and chips stay enabled during loading (`KPB-R-11`).

### Should (SHOULD)

- **`KPM-R-20`** *Load more* SHOULD advance the page of every selected repository that reports `hasMore`, and SHOULD hide when none does.
- **`KPM-R-21`** The repository selection SHOULD persist while switching between Browse and Manual entry inside one drawer session (same rule as search state, `KPB-R-21`).
- **`KPM-R-22`** Server telemetry SHOULD log one `kp.discovery.search` event per request with `repositories[]`, per-source `{ status, durationMs, total }`, merged `total`, `dedupedCount` — never URLs or query text.
- **`KPM-R-23`** The partial notice and the counter SHOULD be announced through the existing `aria-live` region.

### Could / Nice-to-have (MAY)

- **`KPM-R-30`** A deduplicated card MAY let the user expand the secondary handles and choose one as the handle to sync instead of the primary.
- **`KPM-R-31`** The component and route MAY be renamed (`kp-repository-browse`, `repositories/search`) in a later mechanical spec; this release keeps `kp-cgspace-browse` and `cgspace/*` paths.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | Fan-out is parallel: p95 end-to-end ≤ max(single-source p95) + 300 ms; hard bound = 8 s per source timeout (existing). Merged page ≤ `size × selected` items (the client sends `size=10` → ≤ 30). Client debounce unchanged (400 ms). |
| Availability | Any single repository outage or missing URL MUST NOT block KP creation nor hide the other repositories' results (`KPM-R-7/13`). |
| Security | Same JWT gating as today (`AC-3`). No API keys. No upstream hostnames, env var names, query text or raw upstream bodies in responses or logs (`AC-9`, `.cursorrules`). Adapter base URLs come only from env. |
| Input validation | `repository` list validated against the enum (400 otherwise); existing limits unchanged (`query` 3–200, `size` 1–25, facets `size` 1–100, `prefix` ≤ 100). Solr escaping applied per source. |
| Backwards compatibility | Additive: `items`/`page` keep their shape; `repository` on each item and `sources[]` are new fields; default `repository` = all three (behavior change for callers omitting it — only the PRMS client calls this route). No DB change, no bilateral/platform-report change (`AC-4`). |
| Accessibility | Chips: `role="group"` with a label, each chip a `<button aria-pressed>`; last-selected chip `aria-disabled="true"` + `title`; badges carry text, not color alone; counter and partial notice in the live region; WCAG 2.1 AA contrast for badge text (`design.md` §10). |
| Responsiveness | Chip row wraps below 640 px CSS and never causes horizontal document overflow at 375 px (CT gate, `design.md` §9). |
| Observability | `kp.discovery.search` per `KPM-R-22`; `kp.discovery.source_failed { repository, status }` at `warn`; `kp.discovery.config.missing { repository }` once per process at `warn` — no values. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KPM-AC-1` | A KP drawer, all URLs configured | Browse opens | Lead-in "Searching 3 CGIAR knowledge repositories" + three selected chips render; tab reads **Browse repositories**; no search request until `canSearch()`. |
| `KPM-AC-2` | Three chips selected, results shown | User deselects **MELSpace** | One request with `repository=cgspace,worldfish`; MELSpace items and count disappear; **Select all** appears. |
| `KPM-AC-3` | Only **CGSpace** selected | User clicks the CGSpace chip | Nothing changes; the chip is `aria-disabled` with an explanatory `title`; no request. |
| `KPM-AC-4` | Query `maize`, non-admin, phase 2026 | Debounce elapses | Server calls CGSpace, MELSpace and WorldFish in parallel with `year=2026` translated per adapter; response has `items[].repository`, `sources[]` of length 3, counter lists three counts. |
| `KPM-AC-5` | CGSpace item DOI `10.1000/abc` and MELSpace item DOI `https://doi.org/10.1000/ABC` | Merge runs | One card, badge CGSpace, note "Also in MELSpace", secondary handle `20.500.11766/…` visible; `totalElements` per source unchanged; merged `total` counts the pair once. |
| `KPM-AC-6` | Two items with equal normalized title and type but years 2025 and 2026 | Merge runs | Two cards (no collapse). |
| `KPM-AC-7` | WorldFish times out (> 8 s), others answer | User searches | HTTP 200; `sources[worldfish].status='timeout'`; UI lists the other items, WorldFish chip shows **unavailable**, notice "WorldFish did not respond…" with **Retry WorldFish**; retry re-issues the search with the same params. |
| `KPM-AC-8` | All three selected repositories fail | User searches | Error state; copy names the three repositories and links to Manual entry; no item list. |
| `KPM-AC-9` | `WORLDFISH_DISCOVERY_URL` unset | Any search | `sources[worldfish].status='unconfigured'`, HTTP 200, chip unavailable; response body contains no env var name or hostname. |
| `KPM-AC-10` | Request `repository=cgspace,foo` | Validation | 400 with a validation message; no upstream call. |
| `KPM-AC-11` | Facets request `itemtype` with all repositories | Response | Union of values, one entry per normalized label, counts summed; a repository facet failure yields the union of the others (no error). |
| `KPM-AC-12` | MELSpace item in results | **Use this item** | Handle set to `https://repo.mel.cgiar.org/items/<uuid>`; regex passes; MQAP sync runs; `POST_createResult` body equals Manual entry with the same handle; banner reads "Selected from MELSpace". |
| `KPM-AC-13` | Recorded MELSpace and WorldFish fixtures | Mapper runs | Type from `dc.type`, year from `dcterms.available` (MEL) / `dc.date.issued` (WorldFish), authors from `dc.creator` (+ `dc.contributor` for MEL), DOI from `cg.identifier.doi` (MEL) / `dc.identifier.doi` (WorldFish); `itemUrl` uses the repository host; `handleUrl` uses `hdl.handle.net`. |
| `KPM-AC-14` | Grep of the browse component, three hosts and `findOnCGSpace` messages | Gate runs | No CGSpace-only phrasing (allow-list: repository names inside enumerations, env var names, route paths, class names). |
| `KPM-AC-15` | Browse component mounted at 375 px CSS with three chips and the partial notice | CT measures | No horizontal document overflow; chip row wraps; each chip ≥ 24 px tall. |
| `KPM-AC-17` | A WorldFish item in results | **View details** | New tab opens `https://digitalarchive.worldfishcenter.org/items/<uuid>` with `noopener,noreferrer`; an item whose URL host is not in the allow-list opens nothing. |
| `KPM-AC-16` | Any request | Logs inspected | `kp.discovery.search` present with per-source status/duration; no hostname, query text or URL. |

Cross-cutting project ACs that apply without restating: `AC-3`, `AC-4`, `AC-8`, `AC-9`.

### Scenarios (key requirements)

#### Requirement `KPM-R-2` — Selection rules
- GIVEN the Browse tab with CGSpace, MELSpace and WorldFish selected and results for `maize`
- WHEN the user deselects MELSpace and then WorldFish
- THEN each deselection re-runs the search with the remaining repositories and the counter updates
- AND the CGSpace chip becomes `aria-disabled` with the reason "At least one repository must stay selected"
- BUT clicking the CGSpace chip must NOT deselect it nor send a request
- AND IT MUST show **Select all**, which restores the three chips and re-runs the search once.

#### Requirement `KPM-R-5` — Deduplication
- GIVEN CGSpace returns an item with DOI `10.1000/abc` and MELSpace returns an item with DOI `https://doi.org/10.1000/ABC` and a slightly different title
- WHEN the merged page is built
- THEN one card renders with the CGSpace badge and "Also in MELSpace" plus the MELSpace handle
- AND *Use this item* sets the CGSpace `itemUrl`
- BUT two items whose titles match and whose DOIs are both present and different must NOT collapse
- AND IT MUST keep each source's `totalElements` unchanged (dedup only affects the merged list and the merged `total`).

#### Requirement `KPM-R-7` — Partial results
- GIVEN WorldFish does not answer within 8 s and the other two repositories answer
- WHEN the user searches
- THEN the list shows the CGSpace and MELSpace items, the WorldFish chip reads "unavailable", and a notice with **Retry WorldFish** sits above the list
- AND the counter lists only CGSpace and MELSpace counts
- BUT the panel must NOT enter the error state
- AND IT MUST NOT reveal the WorldFish hostname anywhere in the response body or logs.

#### Requirement `KPM-R-8` — Server search contract
- GIVEN `repository=cgspace,melspace` and `query=maize`
- WHEN the proxy runs
- THEN exactly two upstream calls are issued in parallel, each with that repository's facet/field translation
- AND the response contains `items[]` with `repository` on each item, `page`, and `sources[]` with two entries
- BUT `repository=cgspace,foo` must NOT reach upstream and MUST return 400
- AND IT MUST return HTTP 200 with `sources[melspace].status='error'` when MELSpace returns 500 and CGSpace answers.

#### Requirement `KPM-R-12` — Selection parity
- GIVEN a WorldFish item listed with `itemUrl = https://digitalarchive.worldfishcenter.org/items/<uuid>`
- WHEN the user clicks *Use this item*
- THEN the handle field receives that URL, the existing regex accepts it, and the MQAP sync starts
- AND the "Selected from WorldFish" banner renders
- BUT it must NOT persist any Discovery field other than the handle
- AND IT MUST produce the same `POST_createResult` body as Manual entry for the same URL.

## 9. Defect classes and gates

| Defect class | Gate that catches it | Input that makes it fail |
|---|---|---|
| Adapter field mapping wrong for MEL/WorldFish (empty type/year/DOI, wrong item host) | Server Jest: mapper against the **captured** fixtures of each repository (`KPM-AC-13`). | Swap `dcterms.available` for `dc.date.issued` in the MEL adapter → year `null` in the fixture assertion. |
| Facet name translation wrong (silent zero results) | Server Jest asserting the exact upstream `params` per repository with a mocked `HttpService`; HITL live smoke per repository. | Send `f.affiliation` to MELSpace where the adapter says `institute` → params assertion fails. |
| Dedup false positive / negative | Server Jest with crafted pairs: DOI case/prefix variants (collapse), same title different year (no collapse), same title both DOIs different (no collapse). | Remove the year check → the "different year" pair collapses → test fails. |
| One failing source fails the request, or leaks its host | Server Jest: one adapter's HTTP call rejects with a timeout code → HTTP 200, `sources[]` carries `timeout` for it and `ok` for the others, body and every logger call contain no hostname. | Replace `allSettled` with `all` (the per-source call rejects by design, see `design.md` §5) → the request rejects → test fails; or catch inside the source call and return a shared status object → the `all`-vs-`allSettled` distinction disappears and the test must then assert per-source isolation directly. |
| Validation gap on the list param | DTO Jest: `foo`, empty list, duplicates, mixed case. | `repository=cgspace,foo` returns 200 → test fails. |
| Chip rules (≥ 1 selected, Select all, re-run) | Client Jest on the browse component (`KPM-AC-2/3`). | Allow deselecting the last chip → the `aria-disabled` assertion fails. |
| Counter / badge / notice rendering | Client Jest with a mocked merged response including one failed source. | Omit the failed repository from the notice → text assertion fails. |
| Copy drift (CGSpace-only phrasing left behind) | Grep gate script over the listed files with an allow-list (`KPM-AC-14`). | Leave "Search CGSpace by title" in the placeholder → grep hit → gate fails. |
| Layout at 375 px (chip row overflow) | Cypress CT sweep of the browse component at 1536 / 840 / 375 with stubbed API (`KPM-AC-15`); jsdom **cannot** measure this. | Make the chip row `flex-nowrap` → `documentElement.scrollWidth` > viewport → fails. |
| Real-API drift (facet names, rate limits, HAL shape) | **No automated gate.** HITL live smoke against QA with all three URLs: one MEL-only title, one WorldFish-only title, one DOI present in two repositories. Accepted residual risk. | — |
| Visual fidelity to the mockup, badge contrast | **No automated gate.** Human check at the HITL pause against `mockup/browse-repositories.png`; contrast measured with computed styles in the real browser (T6 optional). | — |
| Keyboard focus order across chips → search → filters | jsdom presence assertions only; manual keyboard pass at HITL. Accepted residual risk. | — |

## 10. Dependencies & Assumptions

### Upstream
- Discovery APIs: `https://cgspace.cgiar.org/server/api` (existing), `https://repo.mel.cgiar.org/server/api`, `https://digitalarchive.worldfishcenter.org/server/api` — public, no key (Codeobia 2026-09-08). Metadata field map per repository from the same source.
- MQAP (unchanged) resolves handles from all three repositories (already exercised by Manual entry).
- Env: `CGSPACE_DISCOVERY_URL` (existing), `MELSPACE_DISCOVERY_URL`, `WORLDFISH_DISCOVERY_URL` (new) in `serverless.yaml` and every environment.

### Downstream
- None new. Persistence and bilateral payloads unchanged.

### Assumptions
- MEL and WorldFish tolerate PRMS volume (tens of req/min) with the existing debounce and 60 s cache; rate limits were asked and not answered — treated as none.
- Both hosts expose `itemtype`-like and `affiliation`-like facets under some name; the fixture task resolves the names. If a host exposes no center facet, the Center filter simply does not constrain it (documented in `design.md`).
- Year filtering per repository uses that repository's date field; the sync path remains the authority for the reporting-year rule (`KPB-R-12`).

## 11. Open Questions

- `KPM-OQ-1` Primary handle on a deduplicated card: CGSpace › MELSpace › WorldFish. **Resolved for this release: yes (proposal OQ1); `KPM-R-30` keeps the door open for user choice.**
- `KPM-OQ-2` Rename component/routes now? **Resolved: no (`KPM-R-31`), keeps the diff reviewable.**
- `KPM-OQ-3` If a host has no center facet, hide the Center filter when only that repository is selected? **Resolved: keep the filter, options come from the union; a repository without the facet is unconstrained. Revisit after the fixture task if MEL/WorldFish both lack it.**

## 12. Out-of-Band Notes

- Deploy order is not critical: a missing URL degrades to `unconfigured` (`KPM-R-13`).
- Ask Codeobia to confirm rate limits in the existing thread; no code depends on the answer.

## Requirement ID Index

| ID | Title | ACs |
|---|---|---|
| KPM-R-1 | Source strip | AC-1 |
| KPM-R-2 | Selection rules | AC-2, AC-3 |
| KPM-R-3 | One search, all selected repositories | AC-4, AC-11 |
| KPM-R-4 | Merged list | AC-4 |
| KPM-R-5 | Deduplication | AC-5, AC-6 |
| KPM-R-6 | Per-repository counts and states | AC-2, AC-7, AC-9 |
| KPM-R-7 | Partial results and error state | AC-7, AC-8 |
| KPM-R-8 | Server search contract | AC-4, AC-7, AC-10, AC-16 |
| KPM-R-9 | Facet union | AC-11 |
| KPM-R-10 | Fixture-first | AC-13 |
| KPM-R-11 | Copy generalization | AC-1, AC-12, AC-14 |
| KPM-R-12 | Selection parity | AC-12 |
| KPM-R-13 | Unconfigured repository | AC-9 |
| KPM-R-14 | UI states | AC-1, AC-7, AC-8 |
| KPM-R-15 | View details for every repository | AC-17 |
| KPM-R-20/21/22/23 | Load more, selection persistence, telemetry, live region | AC-16 |
| KPM-R-30/31 | Secondary handle choice, rename | — |
