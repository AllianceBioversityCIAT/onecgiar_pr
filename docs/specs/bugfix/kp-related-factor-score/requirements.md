# Requirements — KP related: rank by factor count (`KFS`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/kp-related-factor-score/` |
| Depth | Lite, Bug Mode |
| Type | Bug |
| Approval Mode | gated |
| Proposal | `proposal.md` (approved 2026-10-23) |
| Extends | KRR R-9 / design §7.1 (relevance block), KRS R-1 / R-2 (order, filter form) |
| Status | Approved 2026-10-23 (gated) |

## 2. Executive Summary

The related KP list must reach the client already ordered by tier: the number of matched factors, out of 3. Today Solr scores each project keyword separately. As a result, keyword-heavy Weak KPs outrank Strong ones; for T-PJ-003161 the first Strong is at position 90. The fix changes the order, and (Pivot 2026-10-23, KFS-R-3) aligns the Center label with how Solr matches the Center. It does not change the set, the counts or the UI layout.

## 3. Glossary

| Term | Meaning |
|---|---|
| Factor | One of: project keywords (any of them), Center, Science Program. These are the same 3 factors the tier label counts (KRR) |
| Factor count | How many of the 3 factors a KP matches: 3 = Strong, 2 = Partial, 1 = Weak, 0 = None |
| Boost form / filter form | Related query with the `*:*` arm (toggle off) / without it ("Only related KPs", KRS) |

## 4. Functional Requirements

### KFS-R-1 — Related order follows the factor count (corrected behavior)

Per repository, a ranked related query SHALL return KPs ordered by factor count, descending. This applies to both the boost form and the filter form.

#### Scenario: Long-title project (the reproduction)

- GIVEN T-PJ-003161 (IITA, SP02 Sustainable Farming), no search text, year 2026
- WHEN the related list is requested from CGSpace, MELSpace and WorldFish
- THEN each repository's first page holds its highest-factor-count KPs before any lower ones
- AND on CGSpace, page 1 contains at least one Partial or Strong whenever the repository has ≥ 10 such KPs
- BUT a Weak (1-factor) KP must NOT precede a 2- or 3-factor KP in the same repository's result order, except where Solr's stemming counts a keyword the label cannot confirm (accepted residual, §6; amended 2026-10-23)
- AND IT MUST hold for the filter form ("Only related KPs") too

#### Scenario: Projects that already worked

- GIVEN P-1486 and iSPARK
- WHEN the related list is requested
- THEN the first card is still Strong, as at KRS-T-4
- AND the toggle-on totals are unchanged by this fix (468 and 1489 at KRS-T-4, ± corpus drift)

### KFS-R-2 — Set, counts and text precedence unchanged

- The fix SHALL NOT change which KPs match, either filter-form totals or boost-form totals.
- With search text, text relevance SHALL still lead, and factors only break ties (KRR with-text rule).
- Linked queries, unranked (plain) queries and the non-project browse SHALL be byte-identical to today.

### KFS-R-3 — The Center factor in the tier label matches the way Solr matches it (Pivot 2026-10-23)

The Center factor on `projectMatch` SHALL count when the normalized Center name appears as a whole-word phrase inside a normalized affiliation, the same semantics as the Solr phrase clause `affiliation:"<center name>"`. It no longer requires full-name equality.

#### Scenario: Affiliation carries the acronym

- GIVEN Center IITA ("International Institute of Tropical Agriculture")
- WHEN an item's affiliation is "International Institute of Tropical Agriculture (IITA)" or "… - IITA"
- THEN the `center` factor is present
- BUT "Tropical Agriculture Research Institute" or a name that only shares some words must NOT count
- AND an acronym-only context (no Center name) still counts nothing

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| KFS-NFR-1 | No extra upstream calls per search (KRS NFR-1) |
| KFS-NFR-2 | Encoded query < 2000 chars. The KRS DD-4 untrimmed filter gate still holds |
| KFS-NFR-3 | No payload shape or UI change. The order of items within each repository differs, and `projectMatch` values may differ only through KFS-R-3 |

## 6. Defect Classes → Gates

| Defect class | Caught by |
|---|---|
| Query still sums per keyword (wrong syntax or wrong grouping) | Jest literal-query regression test: red on the current code, green after |
| A host accepts `^=` but ignores it (order unchanged) | Live 3-host probe: compute the factor count of the first 30 items per host and check it is non-increasing. Fails if CGSpace shows a lower count before a higher one for T-PJ-003161 / P-1486, or if any other rise is not attributable to the stemming residual (amended 2026-10-23) |
| Set changed (filter or boost totals moved) | Live probe: totals before and after on the same minute; Jest byte-identity for linked/plain |
| Text no longer leads | Jest literal for the with-text weights; live probe "potato" on P-1486, where the first item still contains the text |
| Visual or UX regression | None expected (NFR-3). Checked by T-3 PRTest read-only browse |

Accepted risk: within one tier the order is Solr's tie order (index order), not newest first. This is OQ-1 / OQ-3 from the proposal and is not addressed here.

Accepted residual (amended 2026-10-23, user decision after the T-1 evidence probe): Solr stems subjects with its English analyzer, while the tier label folds only simple plurals (KRR §8, KRS design §10). An item whose only keyword hit is a stem form ("integrating" vs "integrated", "bundled" vs "bundling") is scored one factor higher by Solr than its label shows, so the label sequence can rise. Aligning the label with a stemmer was rejected: it cannot reproduce Solr's analyzer, and the diagnostic explained only 3 of 7 affected rows.

## 7. Requirement ID Index

KFS-R-1, KFS-R-2, KFS-R-3, KFS-NFR-1..3.
