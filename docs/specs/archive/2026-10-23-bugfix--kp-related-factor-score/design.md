# Design — KP related: rank by factor count (`KFS`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/kp-related-factor-score/` |
| Depth | Lite, Bug Mode |
| Requirements | KFS-R-1, R-2, NFR-1..3 |
| Supersedes (in part) | KRR design §7.1 rule "one weighted clause per keyword" (spec-level decision, not a TRD ADR) |
| Status | Approved 2026-10-23 (gated) |

## 2. Executive Summary

`buildRelevanceBlock` stops emitting one weighted clause per keyword. It now emits **three constant-score clauses**, one per factor:
- all keywords grouped in one subject clause;
- the Center;
- the Science Program.

Each scores a fixed value whether it matches 1 keyword or 10, so Solr's score equals the factor count (plus the `*:*` constant in the boost form). Both the boost form and the filter form (KRS) use the new clauses. Nothing else changes.

## 3. Architecture Overview

| Step | Where | Change |
|---|---|---|
| Block | `project-relevance.ts` `buildRelevanceBlock` | Keywords grouped into one `subject:(k1 OR k2 …)` clause. Each factor clause gets a constant score (`^=w`) instead of a boost (`^w`) |
| Weights | `repositories.config.ts` `RELEVANCE_WEIGHTS_NO_TEXT` / `_WITH_TEXT` | No text: 1 / 1 / 1. With text: equal tiny constants, so text still leads |
| Trim / gate | `appendRelevanceBlock`, `buildFilterQuery` | Logic unchanged. The shorter query makes trimming and the DD-4 fallback rarer |
| Client | — | Unchanged. The KRS per-page tier sort stays as a safety net for the round-robin merge |

## 4. Extended Directory Structure

```text
onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/
├── project-relevance.ts (+ .spec.ts)      MOD  grouped keywords, constant-score clauses
└── repositories.config.ts (+ .spec.ts)    MOD  weight values; literal expectations updated
```

## 5. Data Model / 6. API Design

No change. The same request params, response fields and totals; the item order within each repository changes, and the `projectMatch` center factor follows DD-5 (KFS-NFR-3, KFS-R-3).

## 7. Backend Module Design

- **Clause shape.** Each factor is wrapped in parentheses and given a constant score, for example `(<subject field>:(a OR b OR c))^=1`, `(<center field>:"…")^=1` and `(<program field>:"…")^=1`.
  - The boost form keeps `*:* OR …`. The filter form joins the clauses with `OR` and no `*:*` (KRS-DD-3).
  - Field names, escaping, plural forms, the phrase bound and the keyword extraction are unchanged.
- **Weights.**
  - No text: all 1, so 3 factors = 3 and the score difference between tiers is exactly 1.
  - With text: all 0.001. Three factors add ≤ 0.003, far below any text score, so the KRR with-text rule holds.
  - `RelevanceWeights` keeps its shape.
- **Trimming** (`appendRelevanceBlock`). The existing order is kept: drop the program, then the Center, then pop keywords. One grouped clause is shorter than N clauses, so trimming should rarely fire. The KRS-DD-4 gate, "filter only when the untrimmed filter form fits", is unchanged.
- **Tier attachment** (`evaluateProjectMatch`). Keywords and program unchanged. `matchesCenter` (same file) switches from full-name equality to a whole-word phrase match on the normalized affiliation (DD-5), so Solr order and the tier label agree. Before the Pivot this bullet claimed agreement "by construction" with equality kept; the T-1 smoke disproved it.

## 8. Frontend / UX

None. The KRS per-page stable tier sort remains, because three repositories are interleaved per page (KPM-DD-3).

## 9. Shared Contracts

None.

## 10. Design Decisions

| ID | Decision | Rationale / rejected | Req |
|---|---|---|---|
| DD-1 | One constant-score clause per factor (`^=`), with keywords grouped | The score becomes the factor count, so the order equals the tier across the whole result set. Rejected: re-weighting center and program far above keywords (proposal B). It is still additive, so many rare keywords with high idf can still win. Rejected: a server-side tier sort over a larger fetch (proposal C). It adds upstream calls and breaks KRS NFR-1 | R-1 |
| DD-2 | Equal constants (1 no text, 0.001 with text) | The tier counts factors equally (KRR), so the score must too. Text precedence is preserved | R-1, R-2 |
| DD-3 | Keep the trimming order and the DD-4 gate | Grouping already shortens the query. Changing the trim order would be scope creep in a bugfix | NFR-2 |
| DD-5 | (Pivot 2026-10-23) `matchesCenter` = whole-word phrase containment: ` ${normalize(center)} ` inside ` ${normalize(affiliation)} ` | Mirrors the Solr phrase clause on a tokenized field, so label and score count the same Center. Supersedes the KRR "full-name equality" rule (spec-level, not a TRD ADR). Rejected: amend the probe and accept mislabeled items (user chose alignment) | R-3 |
| DD-4 | No in-tier secondary order | DSpace accepts one `sort` field, and a sort would override score. Within a tier, Solr's tie order is accepted (proposal OQ-1/OQ-3, accepted risk) | — |

### Reversion challenge (Step 2.3): DD-1 removes per-keyword weighting, shipped by KRR

**Question: what does removing per-keyword weighting break?**

1. **Order within a tier by keyword count is lost.** A Weak with 5 matching keywords no longer outranks a Weak with 1. Accepted: the tier is the user-facing order (INC-166020). A tiny per-keyword bonus was considered and rejected, because it brings back N clauses (query length, trim pressure) to rank within a tier, which nobody asked for.
2. **KRR and KRS literal-query tests.** They assert per-keyword `^4` strings and will fail by design. T-1 updates them. That update is part of the regression evidence, not a weakening of the tests.
3. **With text.** The keyword factor used to add per-term at 0.001. It now adds a 0.001 constant. Text still dominates (R-2), and a live probe confirms it.
4. **The DD-4 filter gate fires less often**, because the query is shorter. As a result, more requests get the real filter rather than the fallback. This is desired (KRS R-2).

No unaddressed breakage; the design stands.

## 11. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 2 (server fix with regression test and live probe; PRTest acceptance) |
| LOC (prod + tests) | ~200 (prod ~30; tests ~170, including KRR/KRS literal updates). Sized per KZ-notifications--bell-read-state-1 / KRS P2: tests at ~5× prod for literal-query work |
| Review rounds | 1–2 |
