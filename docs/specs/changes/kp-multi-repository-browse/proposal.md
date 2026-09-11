# Proposal — Browse Knowledge Products across CGSpace, MELSpace and WorldFish

## Document Control

| Attribute | Value |
|---|---|
| Spec Path | `docs/specs/changes/kp-multi-repository-browse/` |
| Slug | `kp-multi-repository-browse` — derived from free-text argument ("Browse CGSpace … ahora tenemos otros dos repositorios más, MELSpace y WorldFish … seleccionar uno, otro o todos") |
| Type | Change |
| Approval Mode | pre-approved (J. Cadavid, standing mandate 2026-09-02 — "YOLO mode" default; re-confirm or downgrade to `gated` when approving this proposal) |
| Depends on | none |
| Parallel-safe | yes (no shared migrations or payload contracts; touches `results-knowledge-products/cgspace-discovery/` and the KP browse component + its three hosts) |
| Ticket | P2-3231 lineage (CGSpace browse) — new ticket to be assigned |
| Author | Juan Carlos Cadavid + AKILI (T1) |
| Date | 2026-09-10 |
| Baseline consulted | `docs/prd.md` (§ integrations: CGSpace handle source), `docs/ux-ui/design.md` (§6 drawers, §7 tokens, §8 Form UX Pattern `RFUX-*`, §9 responsive), `docs/trd/trd.md` (MQAP `api/m-qap`, CGSpace read-only), archived spec `2026-08-27-changes--kp-cgspace-browse` (`KPB-R-*`, `KPB-DD-*`), `2026-09-03-changes--kp-cgspace-search-retry` (`KCSR-R-1`), kaizen `changes--kp-cgspace-browse` (`KZ-KPB-1`, `KZ-KPB-2`) |

## Intent

Let a submitter reporting a Knowledge Product search the **three** CGIAR repositories PRMS already accepts handles from — CGSpace, MELSpace and the WorldFish Digital Archive — from the same Browse panel, choosing one, several or all of them, with one search and one result list. Today the panel only searches CGSpace, even though Manual entry has accepted MELSpace and WorldFish handles for a long time.

## Problem / Current Behavior

| Today | Why it hurts |
|---|---|
| The first tab reads **Browse CGSpace** and the placeholder, idle, empty and error copy all say "CGSpace". | A MEL-managed or WorldFish user reads "this is not for me" and falls back to pasting a handle by hand. |
| The proxy `GET results-knowledge-products/cgspace/search` accepts `repository` but rejects anything other than `cgspace` (`KPB-R-30`, 400). One env URL (`CGSPACE_DISCOVERY_URL`). | The plumbing anticipated more repositories but nothing was wired. |
| The mapper reads CGSpace field names (`dcterms.type`, `dc.contributor.author`, `dcterms.issued`, `cg.identifier.doi`) and hard-codes `https://cgspace.cgiar.org/items/<uuid>`. | MELSpace and WorldFish use different fields (see Codeobia's table below) and their own item hosts, so the same mapper would return empty types/years and wrong item links. |
| Manual entry already validates `repo.mel.cgiar.org`, `digitalarchive.worldfishcenter.org`, handle prefixes `20.500.11766` and `20.500.12348`, and MQAP resolves those handles. | The *selection* half of the flow already works for all three repositories; only *discovery* is CGSpace-only. This is what keeps the change bounded. |

Confirmed by Codeobia (M. Salem, 2026-09-08): query each repository's Discovery API directly (no MEL aggregator needed), the two hosts are the supported entry points, dedupe by DOI then title/type/date, and the authoritative metadata fields are:

| Field | CGSpace (today) | MELSpace | WorldFish DSpace |
|---|---|---|---|
| Type | `dcterms.type` | `dc.type` | `dc.type` |
| Year | `dcterms.issued` | `dcterms.available` | `dc.date.issued` |
| Authors | `dc.contributor.author` | `dc.creator` + `dc.contributor` | `dc.creator` |
| DOI | `cg.identifier.doi` | `cg.identifier.doi` | `dc.identifier.doi` |
| Center facet | `affiliation` | `institute` (observed, to confirm in fixture) | to capture |

## Proposed Outcome

1. **Inform.** The tab becomes **Browse repositories** and the panel opens with a one-line source strip: "Searching 3 CGIAR knowledge repositories" followed by three toggle chips — **CGSpace · MELSpace · WorldFish** — all selected by default. After a search each chip shows its hit count.
2. **Choose.** The user can turn chips on or off (one, some or all); at least one stays selected. Changing the selection re-runs the current search (same debounce/`distinctUntilChanged` rules as the filters today).
3. **One search, one list.** Free text, Type, Center and Year apply to every selected repository. Results come back as one list; each card carries a repository badge, and items found in more than one repository collapse into one card with an "Also in …" note (DOI first, then title + type + year).
4. **Honest partial results.** If one repository times out or is not configured, its chip is shown as unavailable and the list still renders the others, with an inline notice and a per-repository retry — never an all-or-nothing error while at least one source answered (`KPB-R-10` fail-soft, extended per source).
5. **Selection unchanged.** *Use this item* keeps calling the same MQAP sync as Manual entry (`KPB-DD-2`); the confirmation banner reads "Selected from MELSpace" (or the repository it came from). The reporting-year rule (`KPB-R-12`) keeps applying since MQAP enforces it on any handle.

## Scope

- **Server** — `results-knowledge-products/cgspace-discovery/`: per-repository adapter (base URL, item-host, metadata field map, facet names) for `cgspace`, `melspace`, `worldfish`; `repository` param becomes a list of those values (default: all); parallel fan-out with `Promise.allSettled`, per-source timeout (8 s) and cache keys; merged page + `sources[]` block (`repository`, `status`, `total`) for the partial-failure UI; dedup DOI → normalized title+type+year; facet endpoint accepts the same list and returns the union of values with the label normalization already used for centers. New env vars `MELSPACE_DISCOVERY_URL`, `WORLDFISH_DISCOVERY_URL` (serverless.yaml + `.env` docs). Fixture-first task capturing real search + facet responses from both new hosts (`KZ-KPB-2`).
- **Client** — `kp-cgspace-browse` component: repository chip row, per-repo counts and unavailable state, repository badge on cards, "Also in" note, partial-results notice, copy generalized (placeholder, idle, empty, error, "Showing N of M items · CGSpace 18 · MELSpace 6 · WorldFish 3"); `GET_cgspaceSearch`/`GET_cgspaceFacet` pass `repository`.
- **Three hosts** (same copy changes, no logic): `lab-report-form` (dashboard-lab drawer), `aow-hlo-create-modal`, `report-result-form` (result-creator): tab label "Browse repositories", selected-banner "Selected from <repository>".
- **Server copy drift**: `findOnCGSpace` messages that say "Only handles from CGSpace can be reported" / "No knowledge product was found in CGSpace" become repository-neutral (they already run for MEL and WorldFish handles).
- **Docs**: TRD integrations row (CGSpace Discovery proxy → "DSpace Discovery proxy (CGSpace, MELSpace, WorldFish)"), server `CLAUDE.md`/`AGENTS.md` env list, `design.md` §8 pattern note for the source-selector chip row if it becomes reusable.

## Non-Goals

- No new MEL aggregation service, no persistence of Discovery data (`KPB-DD-2` stays).
- No change to MQAP resolution, to the KP entity, or to the Manual entry regex (already correct).
- No cross-repository relevance scoring: merged order is round-robin by each source's own rank when a query is present, newest-accessioned first otherwise.
- No repository selection memory across drawer sessions (state resets on close, as `KPB-R-21`).
- Bilateral module's KP type section (`type-knowledge-product`) is not touched; it consumes MQAP, not Discovery.

## Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Submitters (Center staff, especially MEL-managed centers and WorldFish) | Can find their KPs without leaving the panel or knowing which repository holds them. |
| `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/*` | Service, mapper, DTOs, spec files; new adapter registry. |
| `onecgiar-pr-server/serverless.yaml`, env docs | Two new URLs. |
| `onecgiar-pr-client/.../kp-cgspace-browse/*` + `results-api.service.ts` | Component, template, spec. |
| `lab-report-form`, `aow-hlo-create-modal`, `report-result-form` | Copy only. |
| Prior specs | Supersedes `KPB-R-30` (repository enum), extends `KPB-R-2/3/4/10/11`, keeps `KPB-R-5/7/8/12/13`, `KCSR-R-1` (body-status ≥ 400 = failure) now evaluated per source. |

## Visual Reference

- Source: Self-contained HTML mockup (no Figma; `claude-design` MCP failed to connect this session; Stitch not used).
- Location: `docs/specs/changes/kp-multi-repository-browse/mockup/browse-repositories.html` (+ `browse-repositories.png` screenshot).
- Notes: covers the Browse panel in its **results** state with all three repositories selected, one card deduplicated ("Also in MELSpace"), one repository unavailable with the partial-results notice, and the chip row with counts. Tokens follow `design.md` §7 (violet brand accent, `material-icons-round`, Tailwind-first in the real implementation). Idle/empty/error copy variants are listed in the Requirement Delta below rather than drawn.

```
┌ 1. Result Identity ─────────────────────────────────────────────────────────┐
│  [ Browse repositories ]   [ Manual entry ]                                  │
│                                                                              │
│  ⓘ Searching 3 CGIAR knowledge repositories        Select all · Clear       │
│  [✓ CGSpace 18] [✓ MELSpace 6] [✓ WorldFish ⚠ unavailable]                   │
│                                                                              │
│  🔍 Search by title, author, or DOI across the selected repositories…   ↻    │
│  [Filter by type ▾] [Filter by center ▾] [Year: 2026 (reporting cycle)]      │
│                                                                              │
│  ⚠ WorldFish did not respond. Showing results from CGSpace and MELSpace.     │
│    [Retry WorldFish]                                                         │
│                                                                              │
│  Showing 10 of 24 items · CGSpace 18 · MELSpace 6                            │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ ● CGSpace   Also in MELSpace                          [Use this item]│    │
│  │ Climate-smart agricultural practices tested with …    View details ↗ │    │
│  │ Journal Article · 2026 · Pérez et al. · Alliance                     │    │
│  │ 10568/175322 · 20.500.11766/9021                                     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ ● MELSpace                                            [Use this item]│    │
│  │ …                                                                    │    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Requirement Delta Preview

### ADDED Requirements

- **Source strip.** The Browse panel MUST show the three repositories as toggle chips (`aria-pressed`), all selected by default, with a lead-in line stating that 3 CGIAR knowledge repositories are searched; at least one chip MUST remain selected (the last one is not toggleable and says so on hover/focus).
- **Per-repository counts and states.** After a search each chip MUST show its hit count; a repository that failed, timed out or is not configured MUST render as unavailable (not as "0") with a tooltip, and MUST NOT block the other sources.
- **Repository badge and dedup.** Every result card MUST show its repository; items matched across repositories (DOI, else title+type+year) MUST collapse into one card that lists the secondary repositories and their handles; *Use this item* uses the primary handle (CGSpace › MELSpace › WorldFish order) unless the user expands and picks another.
- **Partial-results notice.** When ≥ 1 source answered and ≥ 1 failed, the panel MUST show an inline notice naming the failed repositories with a per-repository retry, above the list.
- **Server fan-out contract.** `repository` MUST accept a list of `cgspace | melspace | worldfish` (default all); the response MUST add `sources[]` with `repository`, `status` (`ok | timeout | error | unconfigured`) and `total`; unknown values still return 400.
- **Fixture task.** MELSpace and WorldFish search + facet responses MUST be captured (not hand-written) before adapters are finalized (`KZ-KPB-2`).

### MODIFIED Requirements

- `KPB-R-1` tab label: **Browse CGSpace** → **Browse repositories**.
- `KPB-R-2` placeholder: "Search by title, author, or DOI across the selected repositories…".
- `KPB-R-3` facets: Type and Center options are the union across the selected repositories; the server translates a value to each repository's own facet (`itemtype`/`affiliation` vs the MEL/WorldFish names captured in the fixture).
- `KPB-R-4` counter: "Showing N of M items · CGSpace a · MELSpace b · WorldFish c".
- `KPB-R-10`/`KPB-R-11` error state: only when **every** selected repository failed; copy names the repositories that failed.
- `KPB-R-11` idle/empty copy: "Search CGSpace, MELSpace and WorldFish by title, author, or DOI…" / "No items found in the selected repositories for this search."
- Host banners: "Selected from CGSpace" → "Selected from <repository>".
- `findOnCGSpace` user-facing messages: repository-neutral wording ("the repository" / the resolved repository name).

### REMOVED Requirements

- `KPB-R-30` restriction "any value other than `cgspace` returns 400" (replaced by the enum list above).

## Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Multi-select chips + server fan-out & merge (recommended)** | Chips select sources; the proxy queries each selected repository in parallel, maps with per-repo adapters, dedupes, returns one page + `sources[]`. | Matches the request literally (one, several or all, one search). Client stays one list. Failure of one repo degrades gracefully. Reuses DTO field `repository` and the existing cache/timeout/fail-soft. | Merged pagination is per-source (each "Load more" advances every source that still has pages); cross-source ordering is heuristic. Adapter + dedup add server surface (~3 tasks). |
| B. Per-repository sub-tabs inside Browse | Three tabs (CGSpace · MELSpace · WorldFish) each with its own list; `repository` single value. | Simplest server change (adapter only, no merge/dedup). Exact counts per tab. | Does not deliver "search all at once"; user must repeat the search three times; duplicates across repos are invisible. |
| C. Single-select repository dropdown + "All" | A select next to the search; "All" does the fan-out. | Smaller UI footprint. | Hides the three sources (the "inform" goal), still needs the merge path for "All", and a dropdown is a worse control than chips for 3 options (`design.md` §8 favors segmented/pills for ≤ 5 options). |

## Recommended Approach

**Option A**, sized to stay small:

1. Server first: adapter registry (`{ key, label, baseUrl env, itemHost, fields, facets, handlePrefix }`), `repository` list param, `Promise.allSettled` fan-out with the existing 8 s timeout and TTL cache per source, DOI-first dedup, round-robin merge, `sources[]`. Fixture task before the adapters (`KZ-KPB-2`). Facet union with the existing center-label normalizer.
2. Client second: chip row + counts + unavailable state, repository badge + "Also in", partial notice with retry, generalized copy, `repository` on both API calls. Component keeps its name (`kp-cgspace-browse`) to avoid a rename sweep; a follow-up may rename it.
3. Hosts and server copy last (copy only).
4. Gates: server Jest for adapters/dedup/merge with the captured fixtures; client Jest for chip rules (≥ 1 selected, counts, unavailable), dedup rendering and partial notice; one Cypress CT sweep of the panel at 1536 / 840 / 375 (chip row wraps, no horizontal overflow, per `design.md` §9 and the kaizen recurrence on layout gates); real-page HITL in the Orca browser against QA with all three URLs configured.

Why this is the smallest safe path: selection (MQAP), handle validation and the year rule already work for all three repositories, so the whole change is confined to discovery and presentation. The DTO already carries `repository`, the cache key already includes it, and the fail-soft shape already exists; we extend them rather than add a new module.

## Risks, Dependencies, And Open Questions

| # | Risk / question | Mitigation / owner |
|---|---|---|
| R1 | MEL/WorldFish facet names and year facet syntax are unconfirmed (Juan David observed `institute` for centers; Codeobia's table covers item metadata only). A wrong guess yields silent empty results (`KZ-KPB-2`). | Fixture task first; Discovery `/discover/facets` list call captured per host. |
| R2 | Rate limits / API keys for server-to-server calls were asked and not explicitly answered. | Assume none (public read endpoints, same as CGSpace); keep 60 s cache and 8 s timeout; ask Codeobia to confirm in the same thread. |
| R3 | Cross-source pagination: totals per source differ; "Load more" may return uneven pages. | Per-source cursors in the response; UI shows "Load more" while any source has pages; counts per chip come from each source's `totalElements`. |
| R4 | Dedup false positives on title+type+year (translations, reprints). | DOI first; title match only after normalization (lowercase, strip punctuation) **and** same type **and** same year; secondary handles remain visible so the user can pick. |
| R5 | `dcterms.available` (MELSpace) may not equal the publication year MQAP uses for the `KPB-R-12` check; a listed item could still be rejected at sync. | Discovery year is for filtering only; the sync path stays authoritative (same as today). Copy on the 422 already explains the rule. |
| R6 | `findOnCGSpace` and the KP mapper assume CGSpace in copy and possibly in `itemUrl`/`handleUrl` shapes. | Grep-audit task (Leader grep, per memory "rename audits are Leader greps"). |
| OQ1 | Should a deduplicated card default to the CGSpace handle, or to the repository the user's Center manages? | Default CGSpace › MELSpace › WorldFish; confirm with the KM team. |
| OQ2 | Rename `kp-cgspace-browse` → `kp-repository-browse` now or later? | Later (separate mechanical spec) to keep this diff reviewable. |
| KZ-KPB-1 | List validations the downstream service already performs on the data the feature feeds it. | `design.md` must cite `findOnCGSpace`'s handle/year/duplicate checks explicitly. |

## Success Criteria

- With all three repositories configured on QA, a search for a known MELSpace-only title and a known WorldFish-only title returns each item with the right badge, and *Use this item* creates the KP result exactly as Manual entry does with the same handle.
- Deselecting a repository removes its items and its count; the last selected chip cannot be deselected.
- With `WORLDFISH_DISCOVERY_URL` unset or the host blackholed, the panel still lists CGSpace + MELSpace results and shows the partial notice; no request exceeds the 8 s timeout budget per source.
- A DOI present in CGSpace and MELSpace renders once with "Also in MELSpace" and both handles.
- No "CGSpace"-only wording remains in the Browse panel, the three host tabs/banners, or the sync error messages (grep gate).
- Server Jest (adapters, dedup, merge, DTO validation) and client Jest + CT sweep green; `npm run migration:check` unaffected (no migrations).

## Next Step

```text
/akili-specify changes/kp-multi-repository-browse
```

Change track, standard depth. Approval Mode is recorded as `pre-approved`; say so if you want this one `gated` instead.
