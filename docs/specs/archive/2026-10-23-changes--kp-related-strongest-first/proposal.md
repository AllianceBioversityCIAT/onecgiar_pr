# Proposal: KP related, strongest first

> **In one line:** close the three gaps between INC-166020's literal asks and what KRR delivered. Put the strongest matches at the top, let users see only related KPs with a real count, and show the label with its factor count ("2 of 3") instead of a percentage.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-strongest-first/` |
| Slug | `kp-related-strongest-first` (first token of the argument; the rest is context) |
| Type | Change |
| Approval Mode | gated |
| Source | INC-166020 (Nicoleta Trifa, 2026-10-21). Gap review of the PRTest check, 2026-10-22 |
| Depends on | `changes/kp-related-relevance-ranking` (KRR, T-1..T-6 on `performance-refactor` 76b9d1914, not archived yet) |
| Parallel-safe | no. Same files as KRR (`cgspace-discovery/`, `kp-cgspace-browse`) |
| Status | Approved 2026-10-22 by the user → specify |

## 2. Intent

Nicoleta asked for three things. KRR delivered each only in part:

| Her words (INC-166020) | KRR today | Gap |
|---|---|---|
| "display the strongest matches first" | Each repository is ordered by Solr score, and the merged list **round-robins** CGSpace → MELSpace → WorldFish (`merge.ts` `interleave`, KPM-DD-3) | A *Weak* card can come first. On iSPARK, a MELSpace Weak came first and the CGSpace Strong was 4th. Within a repository, a Partial can precede a Strong |
| "users may need to scroll through more than 3,000 KPs" | The boost block is non-filtering (`AND (*:* OR …)`, KRR-DD-1). The total stays 3821 | Same count, only reordered |
| "70% match … based on theme, geography, and Center" | Tier label plus factor names. No number. No geography | No numeric cue at all (geography is out of scope here, see §6) |

## 3. Problem / Current Behavior (verified in code and on PRTest, 2026-10-22)

- **Merge:** `interleave` (server `merge.ts:16`) takes one item per source per round. No cross-source ordering.
- **Client soft-sort:** `applyProgramMatch` (`kp-cgspace-browse.component.ts` ~l.722) already moves **SP matches first** within each list (KPAM-R-5). It also offers a client-side "Show matches only (N)" filter, which counts only the **loaded** items.
- **Paging:** "Showing 30 of 3821". More pages are appended as they load.
- **Tier:** computed server-side per item (`evaluateProjectMatch`). It is present only when `projectScope.ranked`.

## 4. Proposed Outcome

1. **Strongest first.** On a ranked related list, cards appear Strong → Partial → Weak → No direct match, with relevance order kept inside each tier. Tiers are comparable across repositories; scores are not.
2. **Only related KPs.** A toggle makes the server **require** at least one factor (subject keyword, lead center or program) instead of only boosting. Section totals and per-repository counts become the real reduced numbers. With the toggle off, behavior is exactly KRR's.
3. **Factor count.** The label reads "Partial match · 2 of 3". The tooltip and the factor line stay. There is never a `%`.

## 5. Scope

- Client: tier ordering on ranked related pages; the toggle and its copy; the "· N of 3" label suffix.
- Server: an optional `projectRelatedOnly` param. When set (and only for `related` + ranked), the relevance block is emitted **without** the `*:*` arm, so it filters. The echo reports it.
- Tests: client Jest; server literal-query tests; live count probe (filtered total < unfiltered; linked items still excluded).

## 6. Non-Goals

- Geography / country factor. That is KRR-R-10 and needs CLARISA project countries; it gets its own spec.
- Better keywords for projects with no description.
- Re-scoring across repositories by Solr score (KRR-DD-7 stands).
- Changes to the linked section or the non-project browse.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Bilateral submitters, PMU (Nicoleta) | Faster to find the right KP; clearer "how strong" cue |
| `cgspace-discovery` (server) | DTO param, `composeScopedQuery`/`buildRelevanceBlock` filter variant, echo |
| `kp-cgspace-browse` (client) | Ordering, toggle, label suffix, copy |
| Specs | KRR (`requirements` R-7/R-8, `design` §7.2/§8), KPAM (SP soft-sort, "Show matches only"), KPM-DD-3 (round-robin) |

## 8. Visual Reference

- Source: None. This reuses the existing card, badge and toggle patterns (Spartan).
- Notes: the toggle can sit next to (or merge with) the existing "Show matches only" control. Layout is decided in specify.

## 9. Requirement Delta Preview

### ADDED
- The ranked related list is ordered by tier (Strong → Partial → Weak → None), with relevance order kept inside each tier.
- An "Only related KPs" toggle: a server-side filter requiring ≥ 1 factor, with real totals and per-repository counts.
- The label shows the factor count: "Strong match · 3 of 3", "Partial match · 2 of 3", "Weak match · 1 of 3". "No direct match" has no count.

### MODIFIED
- KRR-R-7: the label text gains the "· N of 3" suffix, still with no `%`.
- KRR-R-8: the proxy note mentions the toggle and the ordering by match strength.
- KPAM-R-5 (SP soft-sort) on **ranked related** pages is subsumed by the tier ordering, because the program is one of the three factors. It stays as-is in the linked list and in unranked lists.

### REMOVED
- None.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Client tier sort per loaded page + server filter toggle** | Client stable-sorts each **newly loaded page** by tier, appending without re-sorting earlier pages. Server drops `*:*` when `projectRelatedOnly` is set | Small. No merge rewrite. Pages don't jump on "load more". The filter gives real counts | "Strongest first" holds per page: page 2 can show a Strong after page 1's Weak. With the toggle on, page 1 is far denser |
| B. Server tier-aware merge | Replace `interleave` for ranked related pages with a merge by tier, then per-source rank | Order decided in one place; same result for every client | Touches the shared merge and paging contract (KPM). Still per page, because sources are fetched per page |
| C. Global tier ordering | Fetch many pages per source and sort globally | Truly strongest-first across all results | Breaks NFR-1 (extra upstream calls) and latency. Rejected |

## 11. Recommended Approach

**Option A.** It is the smallest safe path. The real lever for "don't scroll 3,000 KPs" is the **filter toggle**, which shrinks the set at the source and makes the per-page limit of the tier sort mostly irrelevant. B can follow later if per-page ordering proves insufficient.

Budget estimate: 3–4 tasks, ~400 LOC with tests, 1–2 review rounds each.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Default if unanswered |
|---|---|---|
| OQ-1 | Does Nicoleta accept "Partial match · 2 of 3" instead of "70%"? (carries KRR-OQ-2; asked in the reply email of 2026-10-22) | Proceed with "N of 3" |
| OQ-2 | Toggle default: off (KRR behavior) or on? | Off, so nothing changes for users who don't opt in |
| OQ-3 | One control or two: merge "Only related KPs" with the existing SP "Show matches only", or keep both? | Keep both. The SP toggle stays client-side and SP-only (KPAM) |
| R-1 | With the filter, a project with generic keywords (e.g. iSPARK, no description) still matches many items | Accepted. Better keywords are out of scope |
| R-2 | Filtered queries are subject to the same 2000-char budget and the request-wide `ranked` gate (KRR-T-2). If the block can't be sent, the toggle has no effect | The echo must say so (`relatedOnly: false`) and the UI must not claim a filtered count |
| R-3 | Transient CGSpace timeouts (8 s), seen on PRTest | Unchanged; existing retry |
| Dep | KRR should be archived (or at least frozen) before this executes, so the two specs don't edit the same files concurrently | Archive KRR first |

## 13. Success Criteria

- On PRTest, for P-1486-GCDT and iSPARK, the first card of the first page is the highest tier on that page.
- With "Only related KPs" on, P-1486's related total drops well below 3821, every card has tier ≥ Weak, and linked + related still never overlap.
- Labels read "… · N of 3", and there is no `%` anywhere.
- With the toggle off, requests and responses are byte-identical to KRR.

## 14. Next Step

```text
/akili-specify changes/kp-related-strongest-first
```
