# Requirements — KP related: strongest first (`KRS`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-strongest-first/` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Source | INC-166020 (Nicoleta Trifa). Gap review 2026-10-22; `proposal.md` (approved 2026-10-22, Option A) |
| Extends | `changes/kp-related-relevance-ranking` (KRR: R-1, R-7, R-8, DD-1, DD-7, and the T-2 `ranked` gate) |
| Related | KPAM (SP soft-sort, "Show matches only"), KPM-DD-3 (round-robin merge), KPSF (linked/related split) |
| Status | Approved 2026-10-22 (requirements, design, tasks; gated) |

## 2. Executive Summary

KRR made the related section project-aware. Three of Nicoleta's literal asks are still only partly met. This spec closes them:

| Ask | Requirement |
|---|---|
| "display the strongest matches first" | **KRS-R-1**: each loaded page of the ranked related list is ordered by match tier |
| "scroll through more than 3,000 KPs" | **KRS-R-2 / R-3**: an "Only related KPs" toggle filters at the source, with real counts |
| "70% match" | **KRS-R-4**: the label carries the factor count ("2 of 3"), never a percentage |

The linked section, the non-project browse and the toggle-off behavior stay exactly as KRR left them.

## 3. Glossary

| Term | Meaning |
|---|---|
| Tier | KRR match label: `strong` (3 factors), `partial` (2), `weak` (1), `none` (0) |
| Ranked related list | The related section when `projectScope.ranked = true` (KRR-T-2 gate) |
| Loaded page | One batch of items returned by one search request and appended to the list |
| Related-only mode | The related request with the "Only related KPs" toggle on |

## 4. System Context & Scope

**In scope:** ordering of the ranked related list in the client; the related-only server filter, its echo and its counts; the label suffix; copy for the toggle and the proxy note.

**Out of scope:** geography (KRR-R-10); keyword extraction quality; re-scoring across repositories; the linked section; the non-project browse; the SP "Show matches only" control (KPAM), which keeps its current behavior.

## 5. Stakeholders / Personas

| Persona | Need |
|---|---|
| Bilateral result submitter | See the best candidate KPs first and skip unrelated ones |
| PMU (Nicoleta) | A visible "how strong" cue that is honest and easy to explain |

## 6. Functional Requirements

### Requirement KRS-R-1 — Strongest matches first (MUST)

On a ranked related list, the client SHALL show each loaded page's items grouped by tier, in the order Strong → Partial → Weak → No direct match. Within one tier, the existing order SHALL be kept (round-robin across repositories, relevance within each repository).

#### Scenario: first page

- GIVEN a ranked related first page with items [Weak (MELSpace), Partial (CGSpace), Partial (CGSpace), Strong (CGSpace), Weak (CGSpace)], as observed on iSPARK on 2026-10-22
- WHEN the page renders
- THEN the order is Strong, Partial, Partial, Weak (MELSpace), Weak (CGSpace)
- AND the two Partials and the two Weaks keep their relative order from the response
- BUT items already displayed from earlier pages must NOT move when a further page loads
- AND IT MUST NOT apply this ordering to the linked list or to an unranked list (KRR-R-3, R-4)

#### Scenario: interaction with the SP soft-sort

- GIVEN a ranked related list and a project with a primary Science Program
- WHEN the page renders
- THEN tier ordering replaces the KPAM "SP matches first" soft-sort for this list. The program is one of the three factors, so an SP match is already counted in the tier.
- AND the SP "Matches <program>" badge is still shown on the cards that match
- AND the KPAM soft-sort stays unchanged for the linked list and for unranked lists

### Requirement KRS-R-2 — "Only related KPs" toggle (MUST)

When the related list is ranked, the browse SHALL offer an "Only related KPs" toggle. It is **off by default**, and it is reset to off when the project or the browse context changes.

#### Scenario: toggle on

- GIVEN project P-1486-GCDT, year 2026, no search text, toggle off, related total 3821
- WHEN the user turns the toggle on
- THEN the related list reloads from the first page
- AND every related item matches at least one factor clause in the repository's own search. Its tier is ≥ Weak whenever the tier rules can confirm the match (accepted stemming residual, design §10)
- AND the related total and the per-repository counts are the filtered upstream totals, strictly less than 3821
- BUT it must NOT include any item the linked section returns (the KPSF exclusion holds)
- AND IT MUST keep search text, type, affiliation and year filters applied together with it

#### Scenario: toggle off

- GIVEN the toggle was on
- WHEN the user turns it off
- THEN the request and the response are byte-identical to KRR's ranked related request for the same inputs

#### Scenario: not available

- GIVEN the related list is unranked (no usable context, or the relevance block does not fit; KRR-T-2)
- THEN the toggle is not shown
- AND no related-only parameter is sent

### Requirement KRS-R-3 — Honest related-only result (MUST)

The server SHALL apply the related-only filter only when it also emits the relevance block for that request, and the response SHALL report whether the filter was applied.

#### Scenario

- GIVEN a related-only request whose relevance block cannot be emitted (the request-wide `ranked` gate is false)
- THEN the server sends the plain KPSF request (the KRR unranked behavior)
- AND the response echo reports the filter as not applied
- AND the client must NOT label the shown count as filtered, and shows the toggle as unavailable

### Requirement KRS-R-4 — Factor count on the label (MUST)

The tier label SHALL show the number of matched factors out of three. It MUST NOT show a percentage.

#### Scenario

- GIVEN a related item with factors `keywords` and `center`
- THEN the badge reads "Partial match · 2 of 3", and the factor line still reads "Project keywords · Center"
- AND Strong reads "Strong match · 3 of 3" and Weak reads "Weak match · 1 of 3"
- AND "No direct match" carries no count
- BUT the text must NOT contain `%`
- AND IT MUST keep the existing badge tooltip and its focusability

### Requirement KRS-R-5 — Copy reflects the new behavior (MUST)

When the related list is ranked, the proxy note SHALL say that the strongest matches are shown first on each page and that "Only related KPs" hides the KPs with no matching factor. When the list is unranked, the KRR quick copy stays.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| KRS-NFR-1 | No extra upstream calls per page. Related-only is the same request with a different query. |
| KRS-NFR-2 | The encoded upstream query stays under 2000 characters, under the same KRR trim and request-wide gate. |
| KRS-NFR-3 | All new request and response fields are optional and additive. Older clients ignore them. |
| KRS-NFR-4 | The toggle is keyboard-operable and exposes its state (`aria-pressed` or an equivalent role/state). |

## 8. Defect Classes → Gates

| Defect class | Gate |
|---|---|
| Wrong ordering (tier not grouped, intra-tier order lost, earlier pages move) | Client Jest: a literal input page → literal expected order, plus an append test |
| The filter leaks unrelated items, or breaks the linked exclusion | Server literal-query tests (filter form has no `*:*` arm and keeps `AND NOT (clause)`), plus a live probe: filtered total < unfiltered, linked ∩ related = ∅ |
| Toggle-off drift from KRR | Server byte-identical params test; client test that no new param is sent when off |
| The filter is claimed but not applied (gate false) | Server test with the gate false → echo `false` and plain query; client test for the hidden or unavailable toggle |
| A `%` or wrong count on the label | Client Jest DOM assertions on all four tiers |
| The toggle is not operable by keyboard, or the reordered list looks wrong | **No automated check for layout.** Human or Leader browser check on PRTest (Tab to the toggle, Enter/Space, the visual order) |
| Ranking quality with related-only on | **No automated check.** Live probe numbers plus the PRTest check on P-1486 and iSPARK |
| Filter passes an item whose tier shows "No direct match" (Solr stemming vs plural-only folding) | **Accepted residual** (KRR §8). The live probe reports the share of `none` items under the filter; it is expected to be rare |

## 9. Assumptions & Dependencies

- KRR is on `performance-refactor` and was archived 2026-10-22 (`archive/2026-10-22-changes--kp-related-relevance-ranking`, staged on `qa-development-2026-ss`), which satisfies the proposal Dep.
- DSpace Discovery accepts the relevance clauses without the `*:*` arm as a filter. Verified: KRR-T-2 probed each boost clause alone and got hit counts.

## 10. Open Questions

| ID | Question | Default |
|---|---|---|
| KRS-OQ-1 | Does Nicoleta accept "· N of 3" instead of a percentage? (asked 2026-10-22) | Proceed with "N of 3" |
| KRS-OQ-2 | Should the toggle remember its state across sessions? | No. It always starts off |

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| KRS-R-1 | Strongest matches first (per loaded page) | MUST |
| KRS-R-2 | "Only related KPs" toggle | MUST |
| KRS-R-3 | Honest related-only result | MUST |
| KRS-R-4 | Factor count on the label | MUST |
| KRS-R-5 | Copy reflects the new behavior | MUST |
| KRS-NFR-1..4 | Non-functional | MUST |
