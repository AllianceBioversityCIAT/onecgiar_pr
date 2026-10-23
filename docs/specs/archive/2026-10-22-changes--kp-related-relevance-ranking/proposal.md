# Proposal — KP related-section relevance ranking

> **In one line:** rank "Other KPs potentially related" by how well each KP matches the selected project, and show *why* each one ranks where it does, instead of today's unranked list of every KP of the year.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-relevance-ranking/` |
| Slug | `kp-related-relevance-ranking` (taken from the first token of the argument) |
| Type | Change |
| Approval Mode | gated |
| Source | INC-166020 (Nicoleta Trifa, 2026-10-22), screenshot of the project-scoped KP browse |
| Depends on | `archive/2026-10-14-changes--kp-project-strict-filter` (KPSF), already shipped |
| Related | `quick/kp-proxy-note-ranking` (copy fix: the proxy note now says the list is not ranked by relation to the project) |
| Parallel-safe | yes. Touches only `cgspace-discovery` (server) and `kp-cgspace-browse` (client) |
| Status | Approved 2026-10-22 → specified. Superseded by the requirements decisions of the same day: keyword factor reads KP **subjects** only (not title/abstract), country deferred, tier by factor count |

## 2. Intent

A submitter reporting a KP for a bilateral project must find the right record without scrolling through more than 3,000 items. They also need to understand what "proxy" means for each candidate.

## 3. Problem / Current Behavior

| Aspect | Today (verified in code) |
|---|---|
| Related query | `translateParams` builds `<base> AND NOT (<project clause>)`. The base is `*:*` when there is no search text (`repositories.config.ts`, KPSF-DD-2). |
| Order | With no search text: `sort=dc.date.accessioned,DESC` (newest first). With text: upstream text relevance to the **search**, not to the project. |
| Merge | `merge.ts` `interleave` round-robins the sources and does no cross-source re-scoring (KPM-DD-3). |
| Size | The section count equals the whole year: 3,782 = CGSpace 3,427 + MELSpace 238 + WorldFish 117 in the ticket. |
| Explanation | Each item gets a `Proxy` badge, plus an SP badge when `matchesProgram(item)` is true. Nothing else explains the relation. |
| Project context available | Client: `projectCode`, `projectTitle`, `projectDescription`, `projectLeadCenter`, `programCode`/`programName`. Server today receives code, title and lead center only. |

## 4. Proposed Outcome

- The related section lists the KPs most similar to the project **first**, on every repository.
- Each related KP shows a short **match indicator** (e.g. *Strong / Partial / Weak*) and the **factors that matched**: *title words · theme · Center · Science Program · country*.
- The note and the tooltip explain the indicator in one sentence. It is presented as an approximation, never as a certainty.
- The linked section, the counts and the filters behave exactly as today.

## 5. Scope

- Server: in `projectScope=related`, add project-derived **optional (SHOULD) boost clauses** to the upstream query, and order by upstream relevance instead of date.
- Server: compute per-item **match factors** deterministically in the mapper or service and return them on the item DTO (additive field).
- Client: send the extra project context (description keywords, SP) and render the indicator and factor chips on related items.
- Copy for the indicator, its tooltip and the proxy note.

## 6. Non-Goals

- No numeric "70 %" score. A percentage implies a precision the data does not have (see Risks R-1).
- No shrinking or thresholding of the related list: the total stays the year's count.
- No change to the linked section, KPSF matching rules or the repository field mapping.
- No program keyword approximation such as "nutrition" → BDN (KPSF-OQ-5, separate follow-up).
- No repository-side metadata fixes (the mandatory project fields planned for 2027).

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Result submitters (bilateral / W3) | Primary beneficiaries |
| `cgspace-discovery` (`repositories.config.ts`, `project-match.ts`, mapper, item DTO) | Query building and additive DTO field |
| `kp-cgspace-browse` component (client) | New params, indicator and chips |
| CGSpace / MELSpace / WorldFish Discovery APIs | Same number of calls; longer query strings |
| `archive/...kp-project-strict-filter` | Its related-section contract (KPSF-R-5) is extended, not broken |

## 8. Visual Reference

- Source: None yet.
- Location: n/a
- Notes: a small extension of the existing related-item card (badge row). A mockup of the indicator and factor chips can be generated before `/akili-specify` if wanted.

## 9. Requirement Delta Preview

### ADDED Requirements

- Related KPs are ordered by relevance to the project context when one exists.
- Each related KP shows a match tier and the list of matched factors.
- The API returns a `projectMatch` object (tier and factors) on related items, as an additive field.

### MODIFIED Requirements

- KPSF-R-5 (related section): order changes from "newest first or search relevance" to "project relevance, then search relevance".
- The proxy note copy is updated to describe the ranking.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Upstream boost + factor explanation** | Keep `AND NOT (clause)` as the filter and add SHOULD clauses with boosts. Example: project title and description keywords on title, abstract and subject; lead center on the affiliation field; SP on the program field. Drop the date sort so Solr orders by score. The mapper derives factors per item from its own metadata. | Same call count and pagination. Ranks across the **whole** year, not just the first page. Factors are honest and explainable. | Upstream scores are not comparable across repositories, so cross-repo order stays round-robin. Boost syntax must be verified on all three hosts. |
| B. Server re-rank of a top-N window | Fetch e.g. 200 per repository, score in PRMS, sort and paginate locally | One consistent score across repositories; a percentage would be possible | 20× upstream load and latency. Pagination beyond N breaks or falls back. Counts get two meanings. |
| C. Client-only factor chips | Compute factors for the loaded items only and leave the order unchanged | Trivial | Does not solve the 3,000-item scroll, which is the main request |

## 11. Recommended Approach

**Option A.** It is the smallest safe path that solves both requests. The repositories do the ranking over the full result set without extra calls or new pagination semantics. The "why" comes from a deterministic factor check that a user can verify by reading the KP. A tier plus factors answers Nicoleta's example ("theme, geography, Center") without a fake percentage.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Type |
|---|---|---|
| R-1 | A percentage would overstate certainty, because KPs carry no project link. Mitigation: tier plus factors, and copy that says "approximate". | Risk |
| R-2 | The DSpace Discovery `query` may not honour boosts (`^`) or SHOULD clauses next to `AND NOT`, or may not sort by score when `sort` is omitted. **Verify live on CGSpace, MELSpace and WorldFish before specifying.** | Risk, blocking |
| R-3 | Long queries from description keywords: cap the keyword count (as KPSF caps title words at 8) and reuse its sanitising. | Risk |
| R-4 | Cross-repository order stays round-robin, so a weak CGSpace hit can sit beside a strong MELSpace hit. Acceptable for v1, or sort the merged page by tier? | Open |
| OQ-1 | Geography factor: does the CLARISA project carry countries or regions PRMS can read? If not, drop geography from v1. | Open |
| OQ-2 | Does Nicoleta accept *Strong / Partial / Weak* + factors instead of a percentage? | Open, ask her |
| OQ-3 | Tier thresholds: which factor combinations count as Strong (e.g. ≥ 2 factors including title words)? | Open, settle in specify |
| OQ-4 | Theme source: project description keywords, SP, or both? | Open |

## 13. Success Criteria

- For the ticket case (P-1486-GCDT, CIP genebank, 2026), the first page of related KPs is visibly on genebank or conservation topics, not just the newest items of the year.
- Every related item shows a tier and at least one factor, or "no factors matched".
- The linked section and the section counts are unchanged against the KPSF fixtures.
- No extra upstream calls per page; p95 latency stays within the current browse budget.

## 14. Next Step

Close R-2 with a live probe of the three Discovery APIs and confirm OQ-2 with Nicoleta, then run:

```text
/akili-specify changes/kp-related-relevance-ranking
```
