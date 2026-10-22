# Requirements — KP browse: related-section relevance ranking (`KRR`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-relevance-ranking/` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Source | INC-166020 (Nicoleta Trifa, 2026-10-22); `proposal.md` (Option A) |
| Extends | `archive/2026-10-14-changes--kp-project-strict-filter` (KPSF), in particular KPSF-R-3 / R-4 / R-9 |
| Related | `quick/kp-proxy-note-ranking` (copy-only, 2026-10-22) |
| Status | Draft, 2026-10-22 |

## 2. Executive Summary

The "Other KPs potentially related" section lists every KP of the year that is not tagged with the project: 3,782 items in the ticket, newest first. This spec makes the section **project-aware** in two ways:

1. **Ranking.** Optional, project-derived relevance clauses reorder the upstream result. The set of items and the counts stay exactly as they are.
2. **Explanation.** Each related KP shows a match tier (*Strong / Partial / Weak / No direct match*) and the factors that produced it (*Project keywords · Center · Science Program*; country is deferred, KRR-R-10).

**Live probe, 2026-10-22 (resolves proposal R-2).**
- The form `(<base>) AND NOT (<project clause>) AND (*:* OR <boosts>)` with no `sort` keeps totals identical and orders by score on CGSpace, MELSpace and WorldFish.
- Measured totals: 3461 / 238 / 119 with no search text, and 423 with the text "potato".
- The `+required optional` form returns 0 on all three hosts, because the default operator is AND. It is **not usable**.

## 3. Glossary

| Term | Meaning |
|---|---|
| Project context | The selected bilateral project: code, title, description, lead center, primary Science Program. |
| Boost clause | An optional upstream query clause that raises an item's score without filtering it in or out. |
| Match factor | One verifiable reason a KP relates to the project, derived from the KP's own metadata. |
| Match tier | A coarse label derived from the matched factors. It is **not** a probability. |
| Related section | `projectScope=related`, i.e. KPSF section 2. |

## 4. System Context & Scope

### In scope

- The upstream query of the related section on all three repositories.
- An additive `projectMatch` field on related items in the browse API response.
- The client sends the extra project context and renders the tier and factors on related items.
- Copy for the proxy note and the tier tooltip.

### Out of scope

- The linked section, the KPSF match rule, counts, paging and filters.
- A numeric percentage or score shown to users.
- Re-ranking across repositories (the merge stays a round-robin, KPM-DD-3).
- Program keyword approximation (KPSF-OQ-5).
- The non-bilateral (non-project) browse.

## 5. Stakeholders / Personas

| Persona | Need |
|---|---|
| Bilateral result submitter | Find the KP for their project in the first pages, and judge each candidate quickly. |
| PMU (Nicoleta) | Understand why PRMS proposes a KP, without over-trusting it. |

## 6. Functional Requirements

### Requirement KRR-R-1 — Related section ordered by project relevance (MUST)

When a usable project context exists, the related section SHALL be ordered by upstream relevance to that context on every selected repository, instead of newest first.

#### Scenario: INC-166020 case (no search text)

- GIVEN project P-1486-GCDT "Long term grant" (CIP, genebank description, SP13 Genebank), reporting year 2026, no search text
- WHEN the related section loads
- THEN the first CGSpace page is led by genebank-topic KPs (the subject-boost probe returned a KP with subjects "biodiversity conservation, genebanks, plant genetic resources" first)
- AND IT MUST boost only the metadata the factors read (KRR-R-5): subjects, affiliation/center and program labels. Ranking and tier then agree, so a top item is never explained by factors it was not ranked on.
- AND the section total equals the total without ranking (3461 on CGSpace at probe time)
- BUT it must NOT include any KP that the linked section would return (the KPSF exclusion is preserved)
- AND IT MUST NOT send `sort=dc.date.accessioned,DESC` for a ranked related request

### Requirement KRR-R-2 — Search text stays a filter (MUST)

With search text, the related result set SHALL be exactly the set matched by the text minus the linked items. Text relevance SHALL dominate the order; project relevance only breaks ties among comparable text matches (decision 2026-10-22).

#### Scenario

- GIVEN the same project and search text "potato"
- WHEN the related section loads
- THEN the total equals the unranked text-only total (423 at probe time)
- AND the first page is led by KPs about potato (not genebank KPs without "potato" in the title, as happened in the 2026-10-22 probe with full-weight boosts)
- BUT it must NOT add items that do not match the text

### Requirement KRR-R-3 — No usable context, no change (MUST)

When the project context is not usable (KPSF rule), and in every non-project browse, the request and response SHALL be byte-for-byte what they are today: date order and no `projectMatch`.

### Requirement KRR-R-4 — Linked section unchanged (MUST)

The linked section's query, order, counts and badges SHALL NOT change.

### Requirement KRR-R-5 — Match factors per related item (MUST)

Each related item SHALL carry `projectMatch.factors`: the subset of factors below that its own metadata satisfies, evaluated deterministically.

| Factor | Satisfied when |
|---|---|
| `keywords` | At least one KP **subject** contains a distinctive project keyword as a whole word (project title words plus description keywords, KPSF tokenizer and stop-word rules, case-insensitive, singular/plural folded). Subject field per repository: CGSpace `dcterms.subject`, MELSpace and WorldFish `dc.subject` (decision 2026-10-22). |
| `center` | The KP affiliations include the project lead center. |
| `program` | The KP's program/accelerator labels include the project's primary Science Program (same rule as today's SP badge). |

#### Scenario: negatives

- GIVEN a KP whose subjects share only stop words or the lead-center acronym with the project
- THEN `keywords` is NOT satisfied
- AND a KP whose project keyword appears only in its title (not in its subjects) does NOT satisfy `keywords`
- AND a keyword that is only a substring of a subject word (e.g. `gene` inside `genebanks`) does NOT satisfy `keywords`
- AND a KP with no subjects never satisfies `keywords`, and one with no affiliations never satisfies `center`

#### Scenario: positives (from the 2026-10-22 metadata checks)

- GIVEN project keyword `genebank` and a KP with subject `genebanks` → `keywords` satisfied (plural folded)
- GIVEN project keyword `nematode` and a MELSpace KP with subject `root-lesion nematode` → `keywords` satisfied

### Requirement KRR-R-6 — Match tier (MUST)

Each related item SHALL carry `projectMatch.tier`, computed from its factors.

| Tier | Rule |
|---|---|
| `strong` | all 3 factors (`keywords`, `center`, `program`) |
| `partial` | any 2 factors |
| `weak` | any 1 factor |
| `none` | no factor |

All factors weigh the same (decision 2026-10-22).

### Requirement KRR-R-7 — Show tier and factors, never a percentage (MUST)

Each related KP card SHALL show the tier label next to the existing `Proxy` marker, and list the matched factors. Hovering or focusing the tier SHALL explain it in one sentence.

#### Scenario

- GIVEN a related KP with factors `keywords` and `center`
- THEN the card shows "Partial match" and "Project keywords · Center"
- AND the labels are exactly "Strong match", "Partial match", "Weak match" and "No direct match"
- BUT it must NOT show a percentage or numeric score
- AND IT MUST keep the `Proxy` marker (the KP is still not tagged with the project)
- AND a `none` tier shows "No direct match", not an empty chip

### Requirement KRR-R-8 — Proxy note explains the ranking (MUST)

The proxy note SHALL say that related KPs are ordered by similarity to the project, and that the match label is an approximation based on the listed factors. This supersedes the `quick/kp-proxy-note-ranking` copy whenever ranking is active. When ranking is inactive (KRR-R-3), the quick copy stays.

### Requirement KRR-R-9 — Safe, bounded query construction (MUST)

Boost terms SHALL come only from sanitized project tokens, through the same escaping as KPSF-R-9. Field names SHALL be adapter constants. Keywords SHALL be capped: at most 8 from the title and 8 from the description.

#### Scenario

- GIVEN a project description containing `") OR *:* (` and other Solr syntax
- THEN the emitted query contains only escaped word tokens
- AND the result total is unchanged by the description

### Requirement KRR-R-10 — Country factor (DEFERRED)

Out of v1 (decision 2026-10-22). Follow-up: resolve the project countries from CLARISA (`clarisa_project_countries`, by project code and phase), boost on `cg.coverage.country`, and add a `country` factor. v1 SHALL NOT emit a `country` factor or a country boost.

### Requirement KRR-R-11 — End-to-end acceptance (MUST)

On PRTest, for P-1486-GCDT with year 2026:
- the first related page has genebank or conservation KPs at the top on CGSpace;
- every related card shows a tier;
- the section totals match the unranked totals taken in the same session.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| KRR-NFR-1 | No additional upstream calls per page (same fan-out as KPSF). |
| KRR-NFR-2 | The encoded upstream `query` stays under 2,000 characters. |
| KRR-NFR-3 | Factor computation is pure and in-memory: under 5 ms for a 25-item page. |
| KRR-NFR-4 | `projectMatch` is additive and optional in the DTO; older clients ignore it. |

## 8. Defect Classes → Gates

| Defect class | Gate |
|---|---|
| Wrong query shape (boosts filter items or break the exclusion) | Unit tests on `translateParams` (exact string), plus a live count-equality probe (ranked total equals unranked total) |
| Injection through project text | Unit test with Solr metacharacters (KRR-R-9) |
| Factor false positives or negatives | Unit tests with positive and negative fixtures (KRR-R-5, R-6) |
| UI shows the wrong tier or a percentage, or drops `Proxy` | Client Jest DOM assertions |
| Ranking quality is poor (the right KPs are not on top) | **No automated check.** Human check at the HITL pause: the live probe on the INC-166020 case, then the PRTest smoke (KRR-R-11) |
| Ranking and tier disagree (Solr stems subjects; the factor check only folds singular/plural) | Unit tests over the probed subject pairs (`genebank`/`genebanks`, `nematode`/`root-lesion nematode`). **Accepted residual**: rarer stems (e.g. `conserving` vs `conservation`) may rank an item higher than its tier shows. |
| A host changes its Solr parsing | **Accepted risk.** The live probe is recorded with its date; KRR-R-3 keeps the fallback behavior intact |

## 9. Dependencies & Assumptions

- KPSF is shipped (`kp-project-strict-filter` archived 2026-10-14).
- DSpace Discovery accepts boosted `OR` clauses inside the `query` param, as probed 2026-10-22 on all three hosts.
- Subject fields are tokenized and stemmed in Discovery, as probed 2026-10-22: `dcterms.subject:genebank` = `genebanks` = 9 items on CGSpace; `isra` matches "isra metrics"; `dc.subject:nematode` matches "root-lesion nematode" on MELSpace. A subject boost keeps the total (3461).
- The project description reaches `kp-cgspace-browse` (it already has the `projectDescription` input).

## 10. Open Questions

| ID | Question | Default if unanswered |
|---|---|---|
| KRR-OQ-1 | Include the country factor (KRR-R-10) in v1? | **Resolved 2026-10-22**: no, deferred to a follow-up |
| KRR-OQ-2 | Does Nicoleta accept tier plus factors instead of a percentage? | Proceed with tier plus factors |
| KRR-OQ-3 | Should search text or project relevance dominate when both are present? | **Resolved 2026-10-22**: text dominates (KRR-R-2) |

## 11. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| KRR-R-1 | Related ordered by project relevance | MUST |
| KRR-R-2 | Search text stays a filter | MUST |
| KRR-R-3 | No usable context, no change | MUST |
| KRR-R-4 | Linked section unchanged | MUST |
| KRR-R-5 | Match factors per related item | MUST |
| KRR-R-6 | Match tier | MUST |
| KRR-R-7 | Show tier and factors, no percentage | MUST |
| KRR-R-8 | Proxy note explains ranking | MUST |
| KRR-R-9 | Safe, bounded query | MUST |
| KRR-R-10 | Country factor | DEFERRED |
| KRR-R-11 | End-to-end acceptance | MUST |
| KRR-NFR-1..4 | Non-functional | MUST |
