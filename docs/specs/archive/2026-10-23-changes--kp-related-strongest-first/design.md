# Design — KP related: strongest first (`KRS`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-strongest-first/` |
| Depth | Standard |
| Requirements | `requirements.md` (KRS-R-1..R-5, NFR-1..4) |
| Extends | KRR design §7.1–§7.3, §8; KPAM soft-sort (`applyProgramMatch`) |
| Status | Approved 2026-10-22 (requirements, design, tasks; gated) |

## 2. Executive Summary

- **Server.** A new optional param, `projectRelatedOnly`, emits the KRR relevance block **without** its `*:*` arm, so the block becomes a filter (≥ 1 factor clause must match). The server applies the filter only when the full, untrimmed block fits on every registered adapter. It echoes `projectScope.relatedOnly`.
- **Client.**
  - Each newly loaded ranked related page is stable-sorted by tier before it is appended.
  - The KPAM SP soft-sort is skipped for the ranked related list.
  - An "Only related KPs" toggle drives the new param.
  - The badge gains "· N of 3".
  - The ranked proxy note is updated.
- **Unchanged:** the linked query and list, the merge (round-robin) and dedup, the non-project browse, and toggle-off requests (byte-identical to KRR).

## 3. Architecture Overview

| Step | Where | Change |
|---|---|---|
| 1. Toggle | `kp-cgspace-browse` | New `relatedOnly` signal (default off). Turning it on or off reruns the related search from page 0 |
| 2. Request | `buildParams` | Adds `projectRelatedOnly=true` only when the toggle is on, the scope is set and the last related echo said `ranked` |
| 3. Validate | `CgspaceSearchQueryDto` | Optional boolean `projectRelatedOnly` |
| 4. Query | `resolveProjectScope` + `composeScopedQuery` | Request-wide `relatedOnly` decision (§7.2). The filter form replaces the boost form for `related` |
| 5. Echo | service | `projectScope.relatedOnly: boolean` |
| 6. Order | client `applyScopeOutcome` | Tier stable-sort of the incoming page, then append |
| 7. Render | card / header | "· N of 3" suffix, toggle, note copy |

## 4. Extended Directory Structure

```text
onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/
├── project-relevance.ts          MOD  block builder gains a filter variant (no `*:*` arm)
├── repositories.config.ts        MOD  resolveProjectScope.relatedOnly; composeScopedQuery uses the filter form
├── cgspace-discovery.service.ts  MOD  echo relatedOnly; cache key includes the param
├── dto/cgspace-search-query.dto.ts  MOD  +projectRelatedOnly
└── dto/cgspace-item.dto.ts       MOD  CgspaceProjectScopeDto.relatedOnly
onecgiar-pr-client/…/kp-cgspace-browse/
└── kp-cgspace-browse.component.ts / .html / .spec.ts   MOD
```

## 5. Data Model

There is no persistence. The contract gains two additive fields (KRS-NFR-3):

| Field | Type | Present when |
|---|---|---|
| query `projectRelatedOnly` | boolean, optional | The client toggle is on |
| response `projectScope.relatedOnly` | boolean | `projectScope` is present. `true` only when the filter form was sent on every adapter |

## 6. API Design

The search endpoint is the same. `projectRelatedOnly` is ignored unless `projectScope=related` and the request is ranked (KRR-T-2 gate). Swagger documents it on the DTO. The param is included in the service cache key, because it changes the upstream query (KRR-T-2 lesson).

## 7. Backend Module Design

### 7.1 Filter variant of the block

`buildRelevanceBlock` gains a mode:
- **boost**: today's form, `*:* OR <clauses>`.
- **filter**: the same clauses without `*:*`, so at least one clause must match.

Clauses, escaping and adapter field names are unchanged (KRR-R-9). The weights stay, so the filtered list is still ordered by score.

### 7.2 Request-wide decision (mirrors the KRR `ranked` gate)

`resolveProjectScope` computes `relatedOnly = requested ∧ ranked ∧ fitsUntrimmed`.
- `fitsUntrimmed` is true when, on **every** registered adapter, the filter-form query with the **full** block (no clause dropped) encodes under 2000.
- The filter is never applied on a trimmed block. Dropping a clause from a *filter* would silently narrow the result set. A boost never changes the set, so trimming was harmless there. Here it is not.
- When `relatedOnly` is false, the request falls back to KRR behavior: the boost form if ranked, otherwise plain. The echo then says `false`.

`composeScopedQuery` returns the filter-form query for `related` when `relatedOnly` is true. `translateParams` keeps the KRR rule: no `sort` when ranked.

### 7.3 Service

Echo `relatedOnly`. Tier attachment is unchanged: still on `ranked`.

## 8. Frontend / UX Component Architecture

| Element | Spec |
|---|---|
| Tier ordering | In `applyScopeOutcome`, for `scope=related` with echo `ranked=true`, stable-sort the **incoming page** by tier rank (strong 0, partial 1, weak 2, none 3, missing 3), then append. Earlier pages are never re-sorted (KRS-R-1) |
| SP soft-sort | `displayItems` skips the "matches first" reorder when the related list is ranked. "Show matches only" still filters. The linked list and unranked lists keep KPAM behavior |
| Toggle | A Spartan button with `aria-pressed`, in the same style as the existing "Show matches only" control, placed in the related header next to it. Label "Only related KPs". Shown only when the last related echo had `ranked=true` |
| Toggle state | New `relatedOnly` signal, default false. Reset on project, context or year change (same places `relatedRanked` resets). Toggling reruns the related search from page 0. If the echo returns `relatedOnly=false` while the toggle is on, the toggle is shown disabled with the tooltip "Not available for this search", and the count is presented as unfiltered (KRS-R-3) |
| Label suffix | Badge text `<tier label> · <n> of 3` for strong, partial and weak, where n = number of factors. `none` stays "No direct match". The copy keys gain a `tierCount` template |
| Proxy note (ranked) | "These KPs are not tagged with this project in the repository. The strongest matches are shown first on each page; turn on "Only related KPs" to hide KPs with no matching subject, Center or Science Program. The match label is an approximation." |
| Counts | When `relatedOnly=true`, the section total and the per-repository counts come from the filtered response as-is. No client recount |

## 9. Shared Contracts

Client interfaces: `KpProjectScopeEcho.relatedOnly?: boolean`. A query param is added. No shared package.

## 10. Design Decisions

| ID | Decision | Rationale / rejected alternatives | Req |
|---|---|---|---|
| DD-1 | Tier sort per incoming page on the client, stable | Tiers are comparable across sources; scores are not (KRR-DD-7). Re-sorting the whole accumulated list was rejected: cards would jump on "load more". A server tier-aware merge (proposal Option B) was rejected for now: it touches the KPM paging contract and gains nothing per page | R-1 |
| DD-2 | **Replace the KPAM SP soft-sort on the ranked related list** (reversion, see §11) | The program is already one of the tier's factors, so SP-first would undo the tier grouping on every render (`displayItems` recomputes over the whole list) | R-1 |
| DD-3 | Filter = the same block without `*:*` | One clause set drives ranking, filtering and the tier explanation (KRR-DD-2). No new field mapping | R-2 |
| DD-4 | Filter only when the untrimmed block fits on all adapters | Trimming a filter narrows the set silently. A request-wide decision mirrors the KRR `ranked` gate, so the echo can never disagree with what was sent | R-3, NFR-2 |
| DD-5 | Toggle default off, not persisted | Toggle-off is KRR byte-for-byte. Lowest surprise; answers KRS-OQ-2 | R-2 |
| DD-6 | Count as "N of 3", no percentage | Honest and directly derived from the factors. It answers the "70%" ask without false precision | R-4 |

**Accepted residual (from KRR §8).** Solr stems subjects, and the tier check folds only simple plurals. A rare item can pass the filter yet show "No direct match", for example a subject "conserving" against the keyword "conservation". KRS-R-2 requires tier ≥ Weak only "whenever the tier rules can confirm the match". This residual is recorded and is not a defect.

## 11. Reversion Challenge (Step 2.3) — DD-2

**Question: what does removing the SP soft-sort on the ranked related list break?**
1. **Existing KPAM tests** that assert SP-first order on a related list. If any feed `ranked=true`, they will fail by design. T-2 must update them, keeping the SP-first assertions for unranked and linked lists so KPAM coverage stays.
2. **An SP-only match (Weak) now ranks below a keywords+center Partial with no SP.** This is intended: two factors are stronger evidence than one. The "Matches <SP>" badge still shows.
3. **"Show matches only (N)" still works.** It is a filter, not an order, and it is unchanged.

There is no unaddressed breakage. The design stands.

## 12. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 4 (server filter, client order + suffix, client toggle + copy, PRTest acceptance) |
| LOC (prod + tests) | ~500 (server ~180, client ~320) |
| Review rounds | 1–2 per task |
