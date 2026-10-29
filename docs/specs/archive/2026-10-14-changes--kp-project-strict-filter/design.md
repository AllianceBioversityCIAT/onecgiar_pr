# Design — KP browse: strict bilateral project filter (`KPSF`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/kp-project-strict-filter` |
| Depth | Standard |
| Status | draft |
| Requirements | `requirements.md` KPSF-R-1..R-13 |
| Baseline | `docs/trd/trd.md` W9 (multi-repository DSpace discovery); KPM / KPAM / KPPJ archived designs |
| Budget (tripwire) | **5 tasks · ~700 LOC including tests · ≤ 2 review rounds per task** |

## 2. Summary

- **One project-match rule, on the server only.** A pure util turns the CLARISA project into:
  - a Solr clause on each repository's project field;
  - a label predicate for tests and fixtures.
- **Two scoped requests per search,** sent in parallel by the client:
  - `projectScope=linked` → `(<query>) AND (<clause>)`
  - `projectScope=related` → `(<query>) AND NOT (<clause>)`

  The repository does the split, so counts, paging and "no duplicates" are exact by construction.
- **Section-based badges, no client fuzzy matcher.** The client shows linked items in section 1 with the linked badge and related items in section 2 with the proxy note.

Verified live 2026-10-14 (CGSpace, Case Study, 2026):

| Query | Total |
|---|---|
| unconstrained | 81 |
| `NOT clause` | 80 |
| `clause` | 1 (`10568/182744`) |
| `seed AND NOT clause` | 18 |
| `seed AND clause` | 1 |

MEL and WorldFish accept the same clause on `cg.contributor.project` (HTTP 200).

## 3. Premise Ledger

| Premise | Status | Evidence |
|---|---|---|
| CGSpace `query` accepts `field:(a AND b)`, phrases, `OR`, `AND NOT` | Verified | live 2026-10-14 (§2) |
| MEL/WorldFish project field is `cg.contributor.project` and is queryable | Verified | SKiM 361, Feed the Future Bangladesh 79 |
| The Discovery tokenizer lowercases and splits `AID-I` into `aid`, `i` | Verified (indirect) | the clause with `aid` matches 182744 |
| The bilateral drawer passes code, title and lead center to the browse | Verified | KPPJ-R-9 wiring, `bilateral-manual-create-drawer-host.component.html:104-114` |
| Non-admin year is locked to the phase year | Verified | `buildSearchParams` `:1081-1085` |

## 4. Architecture Overview

1. Bilateral drawer → `kp-cgspace-browse`, with project context (code, title, lead center).
2. `kp-cgspace-browse` sends two requests in parallel:
   - `GET /api/results/results-knowledge-products/cgspace/search?…&projectCode&projectTitle&projectLeadCenter&projectScope=linked`
   - the same request with `&projectScope=related`
3. `CgspaceDiscoveryService.search` fans out per repository (unchanged). For each repository, `translateParams(dto, adapter)` → `buildProjectClause(adapter.fields.project, ctx)` → the Discovery `query` param.
4. The mapper reads `projects[]` from `adapter.fields.project`, plus the legacy `cg.identifier.project` field.

Non-bilateral browse sends neither project params nor scope. Its path is byte-identical to today (KPSF-R-10).

## 5. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/project-match.ts` | **New**: pure rule (normalize, distinctive words, code phrases, clause, label predicate) |
| `…/cgspace-discovery/project-match.spec.ts` | **New**: fixture table (positives/negatives from R-2, R-13) |
| `…/cgspace-discovery/repositories.config.ts` | Add `fields.project` per adapter; remove `facets.project`; `translateParams` composes the scoped query |
| `…/cgspace-discovery/dto/cgspace-search-query.dto.ts` | Add `projectCode`, `projectTitle`, `projectLeadCenter`, `projectScope`; keep legacy `project` |
| `…/cgspace-discovery/dto/cgspace-item.dto.ts` | `CgspaceSearchPageDto.projectScope` echo (`{ scope, applied }`) |
| `…/cgspace-discovery/cgspace-discovery.mapper.ts` | `projects[]` from `adapter.fields.project` ∪ `cg.identifier.project` |
| `…/cgspace-discovery/cgspace-discovery.service.ts` | Cache key includes the new params; echo `projectScope` |
| `…/results-knowledge-products.controller.ts` | Swagger description only |
| `onecgiar-pr-client/…/kp-cgspace-browse/kp-cgspace-browse.component.{ts,html,spec.ts}` | Two-section state + template; remove the project fuzzy matcher and the facet chip |
| `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` | Pass-through of the new params (signature unchanged if params are a record) |

## 6. Data Model

No database or migration changes. The DTO additions are listed in §5.

## 7. API Design

`GET /api/results/results-knowledge-products/cgspace/search`, additive:

| Param | Type | Rule |
|---|---|---|
| `projectCode` | string ≤ 50 | Optional, e.g. `T-PJ-003942` |
| `projectTitle` | string ≤ 300 | Optional |
| `projectLeadCenter` | string ≤ 20 | Optional, e.g. `IITA`; excluded from distinctive words |
| `projectScope` | `linked` \| `related` | Requires `projectCode` or `projectTitle`; absent = no project constraint (today's behavior) |
| `project` (legacy) | string | Accepted for one release: parsed as `<code> - <title>` and treated as `projectScope=linked` |

- The DTO's "query required unless a filter is set" rule also counts `projectScope`.
- `forbidNonWhitelisted` stays on.
- Response addition: `projectScope: { scope: 'linked' | 'related', applied: boolean }`. `applied=false` when the project yields neither ≥ 2 distinctive words nor a code (KPSF-R-9). The server then returns an empty page for `linked` and an unconstrained page for `related`.
- `/api/bilateral/*`: untouched.

## 8. Backend Module Design

### 8.1 The match rule (`project-match.ts`)

| Step | Rule |
|---|---|
| Normalize | lowercase; non-alphanumerics → space; collapse spaces |
| Distinctive words | title tokens, minus: stopwords (en/fr/es basic list + `project`, `phase`); roman numerals (`i`…`xii`); tokens < 3 chars; tokens equal to the lead-center acronym; tokens that are the code's parts (`t`, `pj`, its digits). Keep order, dedupe, first 8 |
| Code phrases | digits of the code with and without leading zeros: `pj 003942`, `pj 3942` |
| Usable | ≥ 2 distinctive words **or** ≥ 1 code phrase |
| Clause | `F:(w1 AND … AND wn) OR F:"pj 003942" OR F:"pj 3942"` (word group only when ≥ 2 words) |
| Label predicate | same semantics on a label string, so fixtures prove what the clause asks for |

Only `[a-z0-9]` tokens ever enter the clause (KPSF-R-9).

### 8.2 `translateParams`

- **Base query:** the escaped user query, as today, or `*:*` when absent. Keep `sort=dc.date.accessioned,DESC` when there is no user text.
- **Scope:**
  - `linked` → `(<base>) AND (<clause>)`
  - `related` → `(<base>) AND NOT (<clause>)`
  - not usable → `linked` returns an empty page without an upstream call (cheap and deterministic); `related` sends `<base>` only.
- **Other filters:** type, center and year facets are unchanged (KPSF-R-8).
- **Removed:** the `f.project` facet (KPSF-R-11).

### 8.3 Mapper and merge

- `projects[]` = `adapter.fields.project` values ∪ `cg.identifier.project` values, deduped (KPSF-R-7).
- The merge union is unchanged.

## 9. Frontend / UX Component Architecture

| Concern | Design |
|---|---|
| State | Keep today's list (`items`, `page`, `hasMore`, `total`) as the **related / unconstrained** list. Add `linkedItems`, `linkedPage`, `linkedHasMore`, `linkedTotal`, `linkedStatus`, `linkedApplied` for bilateral |
| Fetch | When `isBilateralBrowse()`: on every search reset, fire the linked and related requests in parallel (both page 0). "Load more" per section fetches only that scope |
| Non-bilateral | Single request with no project params and the current template (KPSF-R-10) |
| Template (bilateral) | Section heading "KPs linked to the project · N", with linked cards (linked badge `Linked to <code>`) or the compact empty state (R-5). Then the heading "Other KPs potentially related · M", a one-line proxy note, related cards with a "Proxy" marker, and "Load more" |
| Removed | Facet chip (`projectRepositoryFilterOn`, `toggleProjectRepositoryFilter`); project fuzzy helpers (`buildProjectMatchCandidates`, `matchesProjectTags`, project branch of `displayItems` / `onlyMatches`); copy "CGSpace uses highlight matching only" and "does not hide other items" |
| Kept | KPAM Science Program badge and soft-sort **within each section**; "Show matches only" stays SP-only |
| Info line (R-12) | "Linked KPs are repository items whose project field contains this project's title words or PJ code." |
| UI kit | Existing Tailwind tokens and Spartan primitives already used in the browse; no new component library; copy as constants in the component like today |

## 10. Security, Errors, Observability

- **Injection:** sanitized tokens only (§8.1); user text keeps `escapeSolrQuery`.
- **Errors:** a per-repository upstream failure keeps the KPM `sources[]` status in each scope independently. A section never shows "0" for a failed repository.
- **Logs:** unchanged per-source status logging; no project title together with user ids.

## 11. Testing Plan

| Level | What |
|---|---|
| Server unit | `project-match.spec.ts` fixture table: R-2 positives/negatives, R-13 label, special characters (R-9), a 1-word title → code only |
| Server unit | `translateParams`: linked/related composition, with and without a user query, unusable project, no `f.project` param; DTO validation for the new params; mapper reads `cg.contributor.project` |
| Client unit | browse spec: bilateral fires two scoped requests; sections render; no duplicates rendered; empty linked + related still shown; per-section "Load more"; non-bilateral sends no project params |
| Live smoke (manual) | The generated linked/related queries for `T-PJ-003942` on the 3 hosts → CGSpace 1/80, MEL/WorldFish HTTP 200 |
| Browser (manual, HITL) | R-13 end to end on local or PRTest: section 1 shows 182744 with no type or text filter |

Commands: server `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern="cgspace-discovery|project-match|cgspace-search-query"`; client `npm run test:local -- --testPathPattern="kp-cgspace-browse"`.

## 12. Backwards Compatibility & Rollout

- Additive API; the legacy `project` param is mapped for one release.
- Deploy server and client together (same release). An old client against a new server keeps working through the legacy param. A new client against an old server would get 400 on the unknown params (`forbidNonWhitelisted`), so **the server deploys first or in the same pipeline run**.
- **Rollback:** revert both commits; no data to undo.

## 13. Design Decisions

### KPSF-DD-1 — Server-side rule, single implementation
**Decision:** the match rule lives only on the server; the client renders by section.
**Why:** removes server/client drift (a defect class in requirements §8).
**Rejected:** mirrored client matcher, because it has two codepaths to keep identical.

### KPSF-DD-2 — Split via `AND` / `AND NOT` upstream
**Decision:** split the sections upstream with `AND` / `AND NOT`.
**Why:** exact totals, paging and no duplicates, all computed by the repository (verified 81 = 1 + 80).
**Rejected:** fetching unconstrained results and splitting in the client, which reintroduces the page-of-10 blindness (RC-3).

### KPSF-DD-3 — Per-host project field in the adapter
**Decision:** add `fields.project` to the adapter (`cg.identifier.project` for CGSpace, `cg.contributor.project` for MEL/WorldFish) and drop `facets.project`.

### KPSF-DD-4 — All distinctive words, capped at 8, OR the code
**Decision:** a label must contain all distinctive words (max 8) or the code.
**Why:** precision first (no proxies in section 1); recall comes back through the code phrase and the 2027 "exact mapping-list title" mandate; anything missed still appears in section 2.

### KPSF-DD-5 — Remove the client project fuzzy matcher and the facet chip (reversion)
**Decision:** remove both.
**Reversion challenge — "what does removing this break?":**
1. KPPJ client specs that assert fuzzy matches on summary, description or lead center will fail. **Addressed:** T-4 rewrites them against sections.
2. Bilateral users lose summary/description-based highlighting. **Accepted:** those matches were the source of proxies, and the items still appear in section 2 with the proxy marker.
3. Users who switched the chip ON for MEL/WorldFish lose it. **Accepted:** it returned 0 because exact labels never matched (RC-2), and section 1 replaces it.
4. The "Show matches only" count mixed project and SP matches. **Addressed:** it becomes SP-only.

No other consumer imports these helpers (grep: only `kp-cgspace-browse.component.{ts,html,spec.ts}`).

## 14. Open Gaps & Follow-ups

- KPSF-OQ-5: program keyword approximation (`nutrition` → BDN) → separate spec on KPAM.
- KPSF-OQ-6: other-center KPs under IITA → expected in section 2; confirm during the R-13 browser check.
- Update `docs/trd/trd.md` W9 at archive (pending on the apply-capable branch).
