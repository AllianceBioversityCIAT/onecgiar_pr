# Requirements — Browse CGSpace when reporting a Knowledge Product

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-cgspace-browse/` |
| Module code | `KPB` |
| Type | Change · Depth: **Standard** |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | approved (rev 2, 2026-08-26) |
| Owner | Juan Carlos Cadavid |
| Date | 2026-08-26 |
| Baseline | `docs/prd.md` (US-S1, US-S5, G1, G4, AC-3, AC-8, AC-9) · `docs/ux-ui/design.md` §7–§10 · `docs/trd/trd.md` (integrations: MQAP/CGSpace; module `results-knowledge-products`) |
| Intent source | `proposal.md` (approved 2026-08-26) |

## Executive Summary

Reporters of "Number of knowledge products" indicators in Result Framework Reporting today must paste a repository handle to create a KP result. This spec adds a **Browse CGSpace** tab (default) that searches CGSpace by title/author/DOI with Type / Year / Center filters and lets the user pick an item; picking it feeds the existing handle → MQAP sync path unchanged. The current paste-handle flow is preserved as the **Manual entry** tab. Nothing about what is persisted changes; CGSpace outage degrades to Manual entry.

## Glossary

| Term | Meaning |
|---|---|
| KP | Knowledge Product — a result whose indicator type is `Number of knowledge products`. |
| Handle | Persistent repository id, e.g. `10568/128401`; resolved to a URL via `hdl.handle.net` or `cgspace.cgiar.org/handle/...`. |
| MQAP | External lookup service: handle → validated KP metadata. Source of truth for the persisted KP record. |
| Discovery API | DSpace 7 Solr-backed search endpoint on CGSpace (`/server/api/discover/search/objects`). Read-only, public. |
| Facet | Discovery filter dimension. CGSpace exposes `itemtype`, `dateIssued`, `affiliation`, `country` (verified live 2026-08-26). |
| Drawer | The *Report result* side panel in `entity-details/<SP>?tocView=aows`. |

## 1. Module / Feature

- **Module:** `results` (sub-module `results-knowledge-products`) + client `result-framework-reporting`
- **Sub-feature:** `kp-cgspace-browse`
- **Status:** draft
- **Ticket(s):** — (add when created)

## 2. Context

Creating a KP result requires the reporter to already know the repository handle (`aow-hlo-create-modal`, field "Repository link/handle" + Sync). Reporters usually know the title or author, not the handle, so they context-switch to CGSpace. MQAP cannot help: it resolves a single handle and holds no catalog (`dspace-discovery-api-notes.md`). The CGSpace Discovery API does provide search, pagination, and facets — a live check returned 32,055 items for `maize` in < 1 s.

Touches: UX flow *Report result* (RFR drawer, `docs/ux-ui/design.md` flows for RFR reporting); TRD module `results-knowledge-products` and integration `m-qap`; adds one read-only integration (CGSpace Discovery). Refines `US-S1` (create typed result with required fields) and `US-S5` (clear errors, never lose work).

## 3. In Scope / Out of Scope

### In scope
- Tab switch **Browse CGSpace | Manual entry** in the KP section of the RFR *Report result* drawer.
- Server search endpoint proxying CGSpace Discovery (query, filters, pagination) with a slim PRMS DTO.
- Facet-value endpoints for the Type / Year / Center dropdowns.
- Selecting an item populates the handle and triggers the existing MQAP sync.
- Fail-soft behaviour when CGSpace is unavailable.
- Unit tests server + client.

### Out of scope
- MELSpace / WorldFish search, cross-repository merge/dedup (endpoint keeps a reserved `repository` param).
- Replacing or bypassing MQAP for persisted metadata.
- Browse tab in `result-creator`, `bilateral-result-creator`, `lab-report-form` (follow-up spec).
- Local catalog/harvest of CGSpace items; DB changes; migrations.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (SP reporter / center focal point) | Can find a KP by title/author/DOI inside PRMS; Manual entry unchanged. |
| QA reviewer | No change — the persisted KP is identical to one created via handle. |
| Platform admin | One new env var (Discovery base URL) per environment. |
| Bilateral consumer | No change (`AC-4` untouched). |

## 5. User Stories

- **`KPB-US-1`** — As a result submitter, I want to search CGSpace by title, author or DOI from the report drawer, so that I can report a KP without knowing its handle. *(Refines US-S1)*
- **`KPB-US-2`** — As a result submitter, I want to narrow results by type, publication year and center, so that I find my item among thousands quickly. *(Refines US-S1)*
- **`KPB-US-3`** — As a result submitter, I want to keep pasting a handle manually, so that items I already have a link for (or that search cannot find) remain reportable. *(Refines US-S5)*
- **`KPB-US-4`** — As a result submitter, I want a clear message and a working fallback when CGSpace is down, so that I never lose the ability to report. *(Refines US-S5)*

## 6. Functional Requirements

### Required (MUST)

- **`KPB-R-1` Tab switch.** When the result being created is a KP — the indicator's `type_name` is `Number of knowledge products` **or** the user selected the Knowledge product category (`result_type_id = 6`) on an indicator that allows it — the drawer MUST show two mutually exclusive tabs, **Browse CGSpace** (selected by default) and **Manual entry**, in place of today's bare handle field. For non-KP results the drawer MUST be unchanged.
- **`KPB-R-2` Search.** The Browse tab MUST provide a single free-text input that searches CGSpace over title, author and DOI, triggered on typing (debounced) and on Enter, requiring ≥ 3 characters.
- **`KPB-R-3` Filters.** The Browse tab MUST provide **Type**, **Year** and **Center** single-select filters; Type and Center options come from CGSpace facets (`itemtype`, `affiliation`), Year is a fixed list (see R-12); applying or clearing a filter re-runs the search; Type and Center MUST be clearable (a cleared filter sends no constraint upstream). A search MAY run with filters only (no text) once the drawer is open.
- **`KPB-R-4` Result list.** Each result card MUST show: title, type, publication year, first author + "et al." when more than one, center/affiliation, up to 3 country chips, and the handle. It MUST show "Showing N of M items from CGSpace" and paginate (page size 10, Load more or pager).
- **`KPB-R-5` Use this item.** Clicking **Use this item** MUST (a) set the handle to the item's canonical CGSpace handle URL, (b) switch to the same MQAP sync used by Manual entry, and (c) on success populate the same form fields (title retrieved from repository, etc.) so the rest of the form and the created result are identical to Manual entry with the same handle.
- **`KPB-R-6` View details.** **View details** MUST open the item's repository record (`dc.identifier.uri`) in a new tab without leaving the drawer.
- **`KPB-R-7` Manual entry parity.** The Manual entry tab MUST keep today's behaviour: handle input, regex validation (CGSpace / MELSpace / WorldFish), Sync button, error messages, and the "Title retrieved from …" description.
- **`KPB-R-8` Handle acceptance for browsed items.** A handle populated via **Use this item** MUST be accepted by sync even when its prefix is not in the manual regex allow-list (CGSpace returns `10947/…` legacy prefixes as well as `10568/…`).
- **`KPB-R-9` Server search endpoint.** The server MUST expose an authenticated, read-only search endpoint that proxies CGSpace Discovery and returns a slim, stable DTO (see design) — clients MUST NOT call CGSpace directly.
- **`KPB-R-10` Fail-soft.** When CGSpace is unreachable, times out (> 8 s), or returns 5xx, the endpoint MUST return a controlled error (no stack traces, no upstream URLs) and the Browse tab MUST show an inline message pointing to Manual entry, which MUST remain fully usable.
- **`KPB-R-12` Reporting-year constraint.** Because the server rejects KPs whose publication year differs from the active reporting-phase year for non-admin users (422 in `findOnCGSpace`), the Browse tab MUST constrain the Year filter to the active reporting-phase year for non-admin users (locked, shown as a chip "Year: 2026 (reporting cycle)"). Admin users MAY change or clear Year. The search MUST always send the Year constraint for non-admins so every listed item is eligible for sync.
- **`KPB-R-13` Already-reported item.** When **Use this item** targets a handle that already exists as a PRMS result, the drawer MUST show the same "already reported" outcome the Manual entry path shows today (existing-result message/link), and MUST NOT create a duplicate.
- **`KPB-R-11` UI states.** The Browse tab MUST render distinct **idle** (prompt to search), **loading** (skeleton/spinner, inputs stay enabled), **empty** ("No items found…" with a hint to try Manual entry), **error** (R-10), and **results** states.

### Should (SHOULD)

- **`KPB-R-20`** For admin users the Year filter SHOULD default to the current reporting year; Center SHOULD be pre-filtered to none (user selects).
- **`KPB-R-21`** Search state (query, filters, page) SHOULD persist while switching tabs within the same drawer session, and reset when the drawer closes.
- **`KPB-R-22`** The server SHOULD cache identical search requests for 60 s (bounded, max 200 entries, LRU/eviction on insert) and facet lists for 10 min, to protect CGSpace from repeated identical calls. Implemented with a small in-service TTL map — no new dependency.

### Could (MAY)

- **`KPB-R-30`** The endpoint MAY accept a `repository` param (default `cgspace`) reserved for future repositories; any other value MUST return 400 in this release.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | p95 ≤ 2 s end-to-end for a 10-item page (CGSpace observed < 1 s); client debounce ≥ 400 ms. |
| Availability | Feature is optional: CGSpace outage MUST NOT block KP creation (R-10). |
| Security | Endpoint JWT-gated by `JwtMiddleware` like the rest of `/api/*` (AC-3). No API key needed for Discovery; no secrets, upstream URLs or raw upstream errors in responses/logs (AC-9, `.cursorrules`). |
| Input validation | Search: `query` ≤ 200 chars (optional when a filter is present), `page` ≥ 0, `size` ∈ [1,25]; facets: `size` ∈ [1,100], `prefix` ≤ 100; filters ≤ 100 chars. All via class-validator DTO with a per-route `ValidationPipe({ transform, whitelist })`. Solr special characters in `query` are escaped server-side. |
| Backwards compatibility | No DB change, no bilateral/platform-report change (AC-4). Existing MQAP endpoint untouched. |
| Accessibility | Tabs keyboard-navigable with `role=tablist/tab`, live region announces result count and errors; WCAG 2.1 AA per `docs/ux-ui/design.md` §10. |
| Observability | Log `cgspace.search` start/finish with query length, page, duration, result count, outcome — never the raw upstream URL (AC-8). |
| Responsiveness | Cards stack; filters wrap on < 768 px per `docs/ux-ui/design.md` §9. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KPB-AC-1` | A KP indicator drawer | It opens | Browse CGSpace tab is selected; Manual entry tab exists; handle field hidden under Manual entry. |
| `KPB-AC-2` | A non-KP indicator drawer | It opens | No tabs, form unchanged from today. |
| `KPB-AC-3` | Browse tab (non-admin, phase 2026), user types `maize` | Debounce elapses | Endpoint called once with `query=maize&page=0&size=10&year=2026`; cards + "Showing 10 of M items from CGSpace" render. |
| `KPB-AC-12` | Non-admin user | Browse tab opens | Year chip locked to the phase year; no control to clear it. Admin user: Year select editable and clearable. |
| `KPB-AC-13` | Item already reported in PRMS | **Use this item** | Drawer shows the existing-result outcome (same as Manual entry); no create call. |
| `KPB-AC-14` | Browse tab, `query` empty, user selects Type | Change applied | Endpoint called with `type=…&year=…` and no `query`; results render. |
| `KPB-AC-4` | Results shown | User selects Type = `Journal Article` | Endpoint re-called with the type filter; count updates. |
| `KPB-AC-5` | Results shown | User clicks **Use this item** on handle `10568/128401` | Handle set to `https://hdl.handle.net/10568/128401` (or CGSpace canonical), MQAP sync called, title field populated, and the `POST_createResult` body equals the Manual-entry body for the same handle. |
| `KPB-AC-6` | Results shown | User clicks **View details** | New tab opens on the item URI; drawer state preserved. |
| `KPB-AC-7` | CGSpace returns 503 / times out | User searches | Endpoint returns 502-class controlled error with a generic message; UI shows error state; Manual entry still creates a result. |
| `KPB-AC-8` | Query `ab` (2 chars) | User pauses | No request is sent; hint asks for ≥ 3 chars. |
| `KPB-AC-9` | Item with handle `10947/4262` chosen via Browse | Sync runs | Sync proceeds (no regex rejection). Same handle pasted manually keeps today's regex behaviour. |
| `KPB-AC-10` | Endpoint called with `size=100` or `query` of 201 chars | Request validated | 400 with validation message. |
| `KPB-AC-11` | Any request | Logs inspected | No upstream URL / secret; duration and count logged. |

Cross-cutting ACs that apply without restating: `AC-3`, `AC-4`, `AC-8`, `AC-9`.

### Scenarios (key requirements)

#### Requirement `KPB-R-5` — Use this item
- GIVEN the Browse tab lists an item with handle `10568/128401`
- WHEN the user clicks **Use this item**
- THEN the handle field receives the canonical URL and the MQAP sync starts automatically
- AND the "Title retrieved from the repository" field is populated from the MQAP response
- BUT it must NOT persist anything from the Discovery DTO other than the handle (MQAP remains source of truth)
- AND IT MUST produce a `POST_createResult` body identical to the Manual-entry path for the same handle.

#### Requirement `KPB-R-10` — Fail-soft
- GIVEN CGSpace is down
- WHEN the user searches
- THEN the Browse tab shows "CGSpace search is temporarily unavailable — use Manual entry"
- AND Manual entry sync/create keeps working
- BUT the response must NOT contain upstream URLs, stack traces or raw upstream error bodies.

#### Requirement `KPB-R-1` — Tab switch
- GIVEN a drawer for an indicator whose `type_name` is not `Number of knowledge products`
- WHEN it opens
- THEN no tabs render and the form is byte-identical to today.

## 9. Defect classes and gates

| Defect class | Gate that catches it |
|---|---|
| DTO mapping wrong (HAL → slim DTO; `dcterms.*` field names) | Server Jest unit test with a recorded CGSpace HAL fixture (`npx jest --silent --reporters=summary --forceExit`). Fails if fixture keys change. |
| Fail-soft leaks upstream details | Server unit test asserting error body/log contain no `cgspace.cgiar.org` string. |
| Validation gaps | DTO validation tests for `size`, `query` length, `page`. |
| Selected item ineligible (year ≠ phase) reaches sync (R-12) | Client unit test: non-admin request always carries `year=<phaseYear>`; server unit test: mapper year parsing. |
| Browse → sync divergence (R-5 / AC-5) | Client Jest test comparing `POST_createResult` body from both paths with mocked MQAP. |
| Regex rejects browsed handles (R-8) | Client unit test with `10947/…` via Browse (pass) and via Manual (reject). |
| Non-KP regression (R-1) | Client snapshot/DOM test for non-KP indicator. |
| Visual fidelity to mockup, spacing, tokens | **No automated gate** — human check at the HITL pause (screenshot vs `mockup/browse-cgspace.png`), or T6 review. |
| A11y (tab roles, live region) | jsdom presence assertions only (roles/aria present); contrast and focus order **not measurable in jsdom** → accepted risk, manual keyboard pass at HITL. |
| Real CGSpace behaviour drift (facet names, rate limits) | Not unit-testable; one manual smoke against live CGSpace at HITL. Accepted risk. |

## 10. Dependencies & Assumptions

### Upstream
- CGSpace Discovery API (public, no key). Verified facets: `itemtype`, `dateIssued`, `affiliation`, `country`; metadata `dc.title`, `dc.contributor.author`, `dcterms.issued`, `dcterms.type`, `cg.contributor.affiliation`, `dc.identifier.uri`, `cg.identifier.doi` (verify DOI key in the fixture task).
- MQAP (existing) for the post-selection sync.
- Env var for the Discovery base URL (`docs/infrastructure.md` §6).

### Downstream
- None new. `results-knowledge-products` persistence unchanged.

### Assumptions
- CGSpace tolerates PRMS search volume (tens of req/min) without throttling; mitigated by debounce + 60 s server cache.
- The reporting year for the default Year filter is derivable from the current phase in the drawer context.

## 11. Open Questions

- `KPB-OQ-1` Year filter = publication year (`dcterms.issued`). **Resolved: yes, and locked to the phase year for non-admins (R-12, from Judgment Day JD-3).**
- `KPB-OQ-2` Pre-filter Center by user center? **Resolved for this release: no pre-filter (R-20).**
- `KPB-OQ-3` Other KP creation surfaces? **Deferred to follow-up spec (Out of scope).**
- `KPB-OQ-4` MELSpace/WorldFish? **Deferred; `repository` param reserved (R-30).**

## Requirement ID Index

| ID | Title | ACs |
|---|---|---|
| KPB-R-1 | Tab switch | AC-1, AC-2 |
| KPB-R-2 | Search | AC-3, AC-8 |
| KPB-R-3 | Filters | AC-4, AC-14 |
| KPB-R-4 | Result list | AC-3 |
| KPB-R-5 | Use this item | AC-5 |
| KPB-R-6 | View details | AC-6 |
| KPB-R-7 | Manual entry parity | AC-9 |
| KPB-R-8 | Browsed-handle acceptance | AC-9 |
| KPB-R-9 | Server search endpoint | AC-3, AC-10 |
| KPB-R-10 | Fail-soft | AC-7 |
| KPB-R-11 | UI states | AC-3, AC-7, AC-8 |
| KPB-R-12 | Reporting-year constraint | AC-3, AC-12 |
| KPB-R-13 | Already-reported item | AC-13 |
| KPB-R-20/21/22 | Defaults, state persistence, cache | — |
| KPB-R-30 | `repository` param | AC-10 |

## Required cross-references
- `docs/prd.md` — US-S1, US-S5, G1, G4, AC-3, AC-8, AC-9
- `docs/ux-ui/design.md` — §7 tokens, §8 components (tabs, chips, buttons), §9 responsive, §10 a11y
- `docs/trd/trd.md` — `results-knowledge-products` module, `m-qap` integration
- `docs/specs/changes/kp-cgspace-browse/dspace-discovery-api-notes.md`
