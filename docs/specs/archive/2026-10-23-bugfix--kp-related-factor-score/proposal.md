# Proposal: KP related, rank by factor count

> **In one line:** related KPs are ordered by Solr's keyword-volume score, not by the tier we show. For long project titles, Weak (keywords-only) KPs fill the first pages and the first Strong lands at position 90. The fix is to make each factor score a constant 1, so the Solr order is the tier order across the whole list.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/kp-related-factor-score/` |
| Slug | `kp-related-factor-score` (first token of the argument; the rest is context) |
| Type | Bug |
| Approval Mode | gated |
| Source | User check on PRTest, 2026-10-23: T-PJ-003161 (IITA, SP02) shows Weak cards first. INC-166020 ("display the strongest matches first") |
| Depends on | `changes/kp-related-strongest-first` (KRS, archived 2026-10-23, 1d6529e5f on `performance-refactor`) |
| Parallel-safe | no. Same files as KRS (`project-relevance.ts`, `repositories.config.ts`) |
| Status | Approved 2026-10-23 → specified |

## 2. Intent

INC-166020 asks for the strongest matches first. KRS sorts each loaded page by tier, but that only reorders what Solr already put on the page. When Solr's own score does not follow the tier, the strongest KPs never reach page 1. The ranking itself has to follow the tier.

## 3. Problem / Current Behavior

PRTest, T-PJ-003161 "Development of a bundled flood and crop alert system using LoRaWAN for Eriti lowlands…" (IITA, SP02 Sustainable Farming), no text, 7 pages loaded:

| Page | Strong | Partial | Weak | None |
|---|---|---|---|---|
| 1 | 0 | 0 | 24 | 6 |
| 2 | 0 | 1 | 26 | 3 |
| 3 | 1 | 0 | 18 | 11 |
| 4 | 0 | 5 | 10 | 15 |
| 5 | 1 | 2 | 7 | 20 |
| 6 | 1 | 6 | 3 | 20 |
| 7 | 0 | 0 | 9 | 20 |

The first Partial is at position 31 and the first Strong at position 90. The per-page sort works correctly; it just has nothing better to sort.

P-1486 and iSPARK (the KRS acceptance projects) happened to have a Strong in Solr's top 10. That is why KRS-T-4 passed, and the projects chosen for acceptance testing hid this case.

## 4. Proposed Outcome

- For any project, the related list (boost form and "Only related KPs" filter form) comes back from each repository ordered **Strong → Partial → Weak → None**. Because KPs are ranked by factor count, the first page holds the best tiers that exist in that repository.
- The KRS per-page client sort stays as a safety net: the 3 repositories are still interleaved (KPM-DD-3), so tiers still need sorting within each page.
- With search text, the text relevance still leads, and factors only break ties (KRR weights-with-text rule).

## 5. Scope

- Server only: `buildRelevanceBlock` (`project-relevance.ts`) and the weight constants in `repositories.config.ts`.
- Each factor becomes **one constant-score clause**:
  - Keywords: `(subject:(kw1 OR kw2 …))^=1`.
  - Center: `(affiliation:"…")^=1`.
  - Program: `(program:"…")^=1`.
  - The boost form keeps its `*:* OR` arm. The filter form (KRS) drops it as today.
- The no-text and with-text weights are adapted so that the with-text case still lets text dominate. With text, the constant scores become tiny values.
- Keep the NFR-2 encode budget (< 2000) and the untrimmed filter gate (KRS-DD-4). Grouping the keywords into one clause may shorten the query.

## 6. Non-Goals

- Global cross-repository ordering (still interleaved, KPM-DD-3).
- New factors (for example geography), or changing how a tier is computed client-side.
- Ordering by keyword count within a tier. Ties within a tier keep Solr's default order, newest first, or by text score when there is search text.
- Changing the toggle, labels or copy.

## 7. Affected Users, Systems, And Specs

| Item | Effect |
|---|---|
| Center/Program submitters browsing KPs for a bilateral project | The strongest KPs appear first on every project, not only on lucky ones |
| `cgspace-discovery` server module | Block builder and weights |
| `/api/...cgspace` search payload | Only the order changes. Fields, totals and the filter set are the same, because the factors are unchanged |
| KRR (`kp-related-relevance-ranking`), KRS | KRR-DD-1 (non-filtering boost) is kept. The keyword weighting rule in KRR design §7.1 changes from per-term to per-factor |

## 8. Visual Reference

- Source: None. This is a backend ordering change with no UI change.
- Evidence: the user's PRTest screenshot (T-PJ-003161, Weak cards first) and the Leader's 7-page tier table above.

## 9. Bug Diagnosis

### Observed Symptom
Ranked related list for T-PJ-003161: page 1 is 24 Weak + 6 None. Strong first appears at position 90.

### Reproduction Steps
1. PRTest → Centers → IITA → T-PJ-003161 → Create result → SP02 → Complete the form manually → Output → Knowledge Product.
2. No search text, year 2026. Read the tier badges.
3. Load more 6 times. Expected: Strong and Partial before Weak. Actual: the table in §3.

### Root Cause (confirmed)
- `buildRelevanceBlock` (`project-relevance.ts`) emits **one clause per keyword**: `subject:<kw>^4` (`RELEVANCE_WEIGHTS_NO_TEXT.subject = 4`). Up to 20 keywords are emitted (8 from the title + 12 from the description).
- Center and program are **one clause each, at `^2`**.
- So Solr's score grows with how many project keywords a KP repeats, multiplied by idf, which is large for rare words like "lorawan" or "eriti". The tier counts *factors*, so all keywords together count as 1.
- Example: a KP matching 3 rare keywords scores about 3×4×idf. A KP matching 1 keyword + IITA + SP02 (a Strong) scores about 4×idf + 2 + 2. The keyword-only KP ranks higher, and the tier label disagrees with Solr.
- KRS-DD-1 assumed Solr's score was ordered by tier. That assumption is false for projects with long, distinctive titles.

### Impact & Scope
- Every project whose title and description yield many distinctive keywords. These are mostly long W3 project titles, which are common in IITA.
- Both the boost form (toggle off) and the filter form (toggle on) are affected. The filter changes the set, not the order.
- No data or security impact; read-only search.

### Fix Strategy
- **Constant-score clause per factor** (`^=`, standard Lucene syntax).
- **Feasibility probe (GET, 2026-10-23):** CGSpace, MELSpace and WorldFish all return HTTP 200 with valid totals for:
  - `*:* AND (*:* OR (subject:(a OR b))^=1 OR (affiliation:"…")^=1 OR (program:"…")^=1)`;
  - the filter form without `*:*`.
  - The top results on CGSpace and MELSpace are IITA or Nigeria items.
  - Specify must confirm the tier ordering on the live data.
- **Route:** `/akili-specify` Lite, Bug Mode. A regression test must pin the literal query (one keyword group, `^=` per factor). A live probe must show that page 1 for T-PJ-003161 starts with the highest tier present.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Constant score per factor** (`(…)^=1`) | Group the keywords into one clause; each factor scores exactly 1 | Score = factor count = tier, across the whole result set; shorter query | Depends on DSpace passing `^=` to Solr. The probe says yes on all 3; it needs a live ordering check. Within a tier, the order is not by relevance |
| B. Re-weight (center/program ≫ keywords) | e.g. center^50, program^50, keywords ^1 | No new syntax | Still additive: 15 rare keywords can beat center+program. It only moves the threshold, and idf makes it unpredictable |
| C. Server tier-aware fetch | Fetch more items per source and sort by computed tier before paging | Exact | Extra upstream calls (breaks KRS NFR-1), paging contract changes (rejected in KRS-DD-1) |

## 11. Recommended Approach

**Option A.** It is the only option where the score is the tier by construction, it adds no upstream calls, and the probe shows all 3 hosts accept it.

Option B is the fallback if a host later turns out to ignore `^=`. Detection: the specify probe compares the order with and without `^=`.

## 12. Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| Risk-1 | A DSpace host might accept `^=` but rewrite it (e.g. strip it). Mitigation: the live probe checks that the order follows the factor count on each host |
| Risk-2 | Text search: constant scores must stay below the text score. Constant values like 0.001 keep the KRR with-text rule |
| Risk-3 | Within a tier, the order is newest-first only if Solr breaks score ties by index order. Acceptable. To decide in specify: add a secondary sort |
| OQ-1 | Should a KP matching more keywords rank higher *within* the same tier? (e.g. keywords `^=1` plus a tiny per-term bonus) |
| Dep | KRS archived. Same files, so this runs after KRS (it already has) |
| Kaizen | KRR P1 (design against ≥ 2 real records). This bug is the case: test with a **long-title project** (T-PJ-003161) plus P-1486 and iSPARK |

## 13. Success Criteria

- T-PJ-003161, no text: page 1 starts with the highest tier present in the result set. No Weak card comes before a Partial or Strong that Solr has for that repository.
- P-1486 and iSPARK keep a Strong first, and their totals are unchanged.
- The filter form total for T-PJ-003161 is unchanged, because the set is the same and only the order differs.
- Toggle-off and toggle-on requests are still < 2000 encoded. The DD-4 gate still holds.

## 14. Next Step

```text
/akili-specify bugfix/kp-related-factor-score
```

(Bug Mode, Lite: a literal-query regression test, plus a 3-host live ordering probe on T-PJ-003161, P-1486 and iSPARK.)
