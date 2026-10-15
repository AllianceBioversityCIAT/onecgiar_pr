# Requirements — KP browse: strict bilateral project filter (`KPSF`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/kp-project-strict-filter` |
| Module | `results` › `results-knowledge-products/cgspace-discovery` (server) + `kp-cgspace-browse` / bilateral manual create (client) |
| Depth | Standard |
| Type | Change (inherited from `proposal.md`) |
| Approval Mode | gated |
| Status | draft |
| Ticket(s) | INC-165339, INC-165002 |
| Builds on | archived `kp-project-match` (KPPJ), `kp-multi-repository-browse` (KPM), `kp-program-accelerator-match` (KPAM) |
| PRD / TRD / UX | `docs/prd.md` line 93 "Multi-repository knowledge discovery" (scope), G3 ("Bilateral / external consumer reliability"); `docs/trd/trd.md` W9 "Multi-repository DSpace discovery"; `docs/ux-ui/design.md` §10 item 10 (KPAM soft-boost, unchanged here) |

## 2. Executive Summary

In the W3/Bilateral create drawer, the KP browser SHALL split results into two sections:
1. **"KPs linked to the project"**: only the repository items tagged with the selected CLARISA project. The filter is applied upstream in CGSpace, MELSpace and WorldFish, with a rule that tolerates the center, funder or acronym prefixes Centers actually write.
2. **"Other KPs potentially related"**: the remaining search results. Each carries a note saying that the relation is approximate (proxy).

A card is never shown as linked unless its label satisfies the rule. Non-bilateral browse is unchanged.

**Agreement source:** meeting with Nicoleta, 2026-10-14 ("Knowledge Products" item):
- the project KP section splits in two;
- a note marks approximate (proxy) relations;
- for 2027, repositories will be asked to make the project/program fields mandatory, using the exact mapping-list title.

Ángel writes the user story for the split after Santiago's findings. This spec is its implementation basis and must stay aligned with it.

**Verified facts this spec relies on (2026-10-14, live):**

| Repository | Project field | Field token query works? | Evidence |
|---|---|---|---|
| CGSpace | `cg.identifier.project` | Yes | `(accelerated AND innovation AND delivery AND initiative AND mozambique)` → 1 item, `10568/182744` |
| MELSpace | `cg.contributor.project` | Yes (not on `cg.identifier.project`) | `(strengthening AND knowledge AND management)` → 361 |
| WorldFish | `cg.contributor.project` | Yes | `(bangladesh AND aquaculture AND nutrition AND activity)` → 79 |

The mapper reads only `cg.identifier.project` today (`cgspace-discovery.mapper.ts:86`), so MEL/WorldFish cards never carry `projects[]`.

## 3. Glossary

| Term | Meaning |
|---|---|
| Project context | The CLARISA project chosen in the bilateral drawer: code (e.g. `T-PJ-003942`) + title |
| Project label | A value of the repository project field (`cg.identifier.project` / `cg.contributor.project`), free text written by the Center |
| Distinctive words | Title words kept after normalization (lowercase, alphanumeric), minus stopwords, roman numerals, code fragments, the lead-center acronym (a prefix Centers may or may not write) and words shorter than 3 characters; the first 8 are used. For `T-PJ-003942`: `accelerated innovation delivery initiative aid mozambique` |
| PJ code number | The digits of the CLARISA code (`T-PJ-003942` → `003942`), matched as the phrase `pj 003942` |
| Project match | A label matches when it contains **all** distinctive words **or** the PJ code phrase |
| Proxy KP | An item returned or badged for a project although its labels do not belong to that project |

## 4. System Context & Scope

### In scope
- Server-side project filtering for CGSpace, MELSpace and WorldFish, using each host's project field.
- Mapper exposes MEL/WorldFish project labels.
- Bilateral browse: two sections ("KPs linked to the project" / "Other KPs potentially related" with a proxy note), an empty linked section, and per-section counts.
- One shared, deterministic match rule for the server query and the client badge.
- Removal of the exact `f.project` facet and the "CGSpace uses highlight matching only" copy.

### Out of scope
- Repository metadata changes, or a CGSpace plugin mapping labels to CLARISA IDs (INC-165002 long-term track).
- Persisting repository labels on the created result. The result↔project link stays the PRMS selection (`results_by_projects`).
- Programme Results / AoW / lab project context (KPPJ-R-12 stays MAY).
- CLARISA duplicate-row cleanup.
- Matching on a project acronym. `clarisa_projects` has no acronym field (`short_name` is `PJ-xxxxxx: Title`).

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (Center user, bilateral) | Sees their project's linked KPs first, plus other potentially related KPs clearly marked as proxy |
| PMU lead (Nicoleta) | Can tell Centers a single tagging rule and rely on it |
| Center KM (Theresa / IITA) | Tags with "title as in CLARISA (prefix allowed)" or the PJ code |
| Programme Results submitter | No change |

User stories (refine `docs/prd.md` result-submitter goals):
- **KPSF-US-1** — As a bilateral result submitter, I want the KP browser to list only KPs tagged with my project, so that I pick the right KP without proxies.
- **KPSF-US-2** — As a bilateral result submitter whose project is not tagged yet, I want to still see other potentially related KPs marked as approximate, so that I am never blocked from reporting.

## 6. Functional Requirements

### Requirement KPSF-R-1 — Upstream project filter on every repository (MUST)

When the browse carries a project context, for section 1 ("KPs linked to the project") the server MUST constrain each selected repository to items whose project field matches the project (KPSF-R-2):
- CGSpace: `cg.identifier.project`
- MELSpace and WorldFish: `cg.contributor.project`

#### Scenario: CGSpace prefixed label (the INC-165339 case)
- GIVEN project `T-PJ-003942` "IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique", type Case Study, year 2026, repository CGSpace
- WHEN the browse loads section 1
- THEN section 1 is exactly `10568/182744` (total 1)
- AND that item's label "IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique" is shown on the card
- BUT it must NOT contain any item whose project labels fail KPSF-R-2

#### Scenario: MEL/WorldFish no longer zeroed by an impossible exact match
- GIVEN a project whose title words appear in a MELSpace or WorldFish `cg.contributor.project` label
- WHEN the browse loads section 1
- THEN that repository returns the matching items
- AND IT MUST NOT send the legacy `f.project=<code - title>,equals` facet param

### Requirement KPSF-R-2 — Tolerant, deterministic match rule (MUST)

A project label MUST match a project when, after normalization, it contains **all** of the project's distinctive words (max 8) **or** the PJ code phrase. Prefixes, funder notes, punctuation and case MUST NOT affect the outcome.

#### Scenario: positives
- GIVEN project `T-PJ-003942` above
- THEN these labels match:
  - "IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique"
  - "IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique"
  - "IITA - T-PJ-003942 AID-I"

#### Scenario: negatives (no proxies)
- GIVEN project `T-PJ-003942`
- THEN these labels must NOT match:
  - "CIMMYT (USA-USAID) - Accelerated Innovation Delivery Initiative (AIDI)": missing "aid" and "mozambique"
  - "IITA - T-PJ-003763 something": a different code
  - "IITA - Western Africa Hub"
- AND IT MUST NOT treat the code prefix (`T`, `PJ`) alone as a match

#### Scenario: too few distinctive words
- GIVEN a project whose title yields fewer than 2 distinctive words (e.g. "Soil Values" → `soil`, `values` is 2 and is allowed; a 1-word title is not)
- THEN only the PJ code phrase can match
- AND IT MUST NOT match on a single generic word

### Requirement KPSF-R-3 — Two sections: linked vs potentially related (MUST)

In the bilateral drawer browse (project context present), results MUST be shown in two sections, in this order:
1. **"KPs linked to the project"**: the KPSF-R-1 set.
2. **"Other KPs potentially related"**: the same search **without** the project constraint, **excluding** every item already in section 1. A visible note states that these items are not tagged with the project and that the relation is approximate (proxy).

Both sections MUST apply the same text, type, center and year filters. The user can pick a KP from either section.

#### Scenario: INC-165339 case
- GIVEN project `T-PJ-003942`, Case Study, 2026
- WHEN the browse loads
- THEN section 1 lists only `10568/182744`
- AND section 2 lists the remaining 80 Case Study 2026 items, paginated, with the proxy note
- BUT `10568/182744` must NOT appear again in section 2

### Requirement KPSF-R-4 — Counts and paging per section (MUST)

Each section MUST show its own count. Section 1 MUST describe the filtered upstream set. Section 2's counter and "Load more" MUST describe the unconstrained set minus section 1's items. Per-repository counts and unavailability MUST stay as in KPM.

#### Scenario
- GIVEN the KPSF-R-3 case
- THEN section 1 reads 1 item and shows no "Load more"
- AND section 2 reads 80 and pages with "Load more"
- BUT section 1 must NOT show the unfiltered 81

### Requirement KPSF-R-5 — Empty linked section (MUST)

When section 1 has zero items (no selected repository has a KP tagged with the project), it MUST:
- show a compact empty state that names the project and says that no KP in the selected repositories is tagged with it;
- keep section 2 visible below it.

#### Scenario
- GIVEN a project with no tagged KP (e.g. `T-PJ-003897` "Soil Values", 2026)
- WHEN the browse loads
- THEN section 1 shows the empty state and section 2 lists the search results with the proxy note
- BUT it must NOT render the generic "no results" copy as if the search terms were wrong
- AND IT MUST still report a failed repository as unavailable (KPM-R-6), not as zero

### Requirement KPSF-R-6 — Badge uses the same rule (MUST)

The project badge MUST use the KPSF-R-2 rule. This modifies KPPJ-R-4: the client fuzzy matcher is no longer used for projects.
- Every card in section 1 MUST show the "linked" project badge.
- No card in section 2 may show it. Each section 2 card shows the proxy marker.

#### Scenario
- GIVEN `T-PJ-003942`
- THEN `10568/182744` is badged in section 1
- BUT a section 2 card labeled "CIMMYT (USA-USAID) - … (AIDI)" or "IITA - T-PJ-003763 …" must NOT be badged as linked

### Requirement KPSF-R-7 — MEL/WorldFish project labels exposed (MUST)

The discovery item MUST carry project labels from `cg.contributor.project` for MELSpace and WorldFish, in addition to `cg.identifier.project`. Duplicates are unioned on merge, as KPPJ-R-2 already does.

### Requirement KPSF-R-8 — Combines with existing filters (MUST)

The project constraint MUST be AND-combined with the user's text query, type, center (affiliation) and year filters, and MUST NOT change their individual semantics.

#### Scenario
- GIVEN project context and the text "mozambique"
- THEN section 1 returns only items that satisfy the project rule AND the text query
- AND section 2 returns items that satisfy the text query, minus section 1

### Requirement KPSF-R-9 — Safe query construction (MUST)

The project constraint sent upstream MUST be built only from normalized alphanumeric tokens and the digits of the code.
- Raw project text or user text MUST NOT be interpolated into the field clause.
- If the project yields neither 2+ distinctive words nor a code, the server MUST report the constraint as not applicable. The client MUST then show section 1 empty with a one-line notice, and section 2 as normal.

#### Scenario
- GIVEN a project title containing `" : ( ) * ? \ AND OR`
- WHEN the search runs
- THEN every repository returns HTTP 200 (no upstream 400), and only sanitized words appear in the clause

### Requirement KPSF-R-10 — Non-bilateral browse unchanged (MUST)

Browses without project context (Programme Results, AoW modal, lab form) MUST send no project parameters, show a single result list (no sections), and keep the current KPAM/KPM behavior.

### Requirement KPSF-R-11 — Remove superseded behavior (MUST)

- The exact `f.project=…,equals` facet param MUST be removed.
- The copy saying CGSpace uses "highlight matching only" MUST be removed.
- The legacy `project` query param MAY still be accepted, mapped to the new rule, for one release.

### Requirement KPSF-R-12 — Explain the tagging rule (SHOULD)

The project info line SHOULD state, in one sentence, that results come from the repository project field and match by project title words or PJ code. That way users and Centers learn how to tag.

### Requirement KPSF-R-13 — End-to-end acceptance: the IITA test project (MUST)

This is the case agreed with Nicoleta and the one Santiago tests with IITA.

#### Scenario: AID-I Mozambique
- GIVEN a Center user on Bilateral › IITA
- AND the CLARISA project `T-PJ-003942` "IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique" (CLARISA ids 1105 / 187, center IITA)
- WHEN they open Create result › Knowledge product › Browse, for reporting year 2026, with all three repositories selected and no type or text filter
- THEN "KPs linked to the project" shows `10568/182744` "Strengthening bean seed systems to reach 78,000 farmers…" with the linked badge
- AND choosing it proceeds to KP creation exactly as today
- AND "Other KPs potentially related" lists the other 2026 items with the proxy note, without 182744
- BUT it must NOT be necessary to page, search text or pick a type to find 182744
- AND IT MUST behave the same when type = Case Study is selected

Live pre-check (2026-10-14): the section 1 query (year 2026, no type) returned exactly `10568/182744` on CGSpace (total 1), and total 0 with HTTP 200 on MELSpace and WorldFish.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | At most one extra upstream request per repository per search (linked + related, issued in parallel); a section 2 "Load more" does not re-query section 1; p95 of the bilateral browse load ≤ today's p95 + 30% on the same query |
| Security | KPSF-R-9; no upstream URL, env name or Solr error text leaks to the client (existing KPM rule) |
| Compatibility | `/api/bilateral/*` payloads untouched; discovery response shape is additive (`projects[]` may now be populated for MEL/WorldFish) |
| Accessibility | Each section has a heading and an accessible name; the proxy note is text (not color only); the empty state is reachable by keyboard |
| i18n / copy | New strings go through the existing KP browse copy constants; visual changes use Spartan components |
| Observability | Server logs the per-repository status as today; it MUST NOT log the full project title with user identifiers |

## 8. Defect Classes → Gates

| Defect class | Gate that catches it | Automated? |
|---|---|---|
| Wrong match (proxy included or tagged KP missed) | Shared fixture table (positives and negatives from §6 R-2, real labels) run against the server rule and the client matcher | Yes: server + client Jest |
| Server/client rule drift | The same fixture table asserted on both sides (contract test) | Yes |
| Malformed Solr → upstream 400 → repository "unavailable" | `translateParams` unit tests with special characters; **live smoke** of the generated query on all 3 hosts | Unit yes; live smoke **manual** (unit tests cannot reach the hosts) |
| Wrong section split / duplicate across sections / empty-state behavior | `kp-cgspace-browse` component spec | Yes |
| Counts or "Load more" inconsistent with the filter | Component spec with mocked filtered response + server service spec | Yes |
| Layout or visual regression of the two sections, proxy note or empty state | Browser check at the HITL pause (jsdom cannot evaluate layout) | **Manual** |
| Non-bilateral regression | Existing KPPJ / KPAM / KPM specs, scoped (`--testPathPattern`) | Yes |
| Real-world recall (Centers abbreviating titles) | Not measurable before rollout | **Accepted risk**: mitigated by the PJ-code alternative and the tagging rule (R-12) |

## 9. Dependencies & Assumptions

- Upstream: CGSpace, MELSpace and WorldFish DSpace 7 Discovery; field token queries verified 2026-10-14 (§2).
- Bilateral drawer provides code, title and summary through the existing KPPJ-R-9 wiring.
- Assumption: Discovery's tokenizer splits `AID-I` into `aid` + `i` and lowercases (consistent with the CGSpace live result).

## 10. Open Questions

| ID | Question | Status |
|---|---|---|
| KPSF-OQ-1 | MEL/WorldFish field query support | **Resolved**: yes, on `cg.contributor.project` |
| KPSF-OQ-2 | Default on vs mandatory | **Superseded** by the 2026-10-14 Nicoleta agreement: two sections (linked / other potentially related + proxy note), no toggle |
| KPSF-OQ-5 | Program keyword approximation (e.g. "nutrition" → BDN) for SP matching | Out of scope here (it touches KPAM, not projects): follow-up spec |
| KPSF-OQ-6 | Why KPs of other centers show under IITA (e.g. WorldFish "Coast") | Investigation item for Santiago. Expected cause: the bilateral browse has no center constraint, so they will land in section 2 with the proxy note. Confirm before execute |
| KPSF-OQ-3 | Acronym matching | **Resolved**: out of scope (no CLARISA acronym field) |
| KPSF-OQ-4 | Extra real fixtures from Theresa | Open, non-blocking: add the handles if they arrive before execute |

## 11. Requirement ID Index

| ID | Strength | Summary |
|---|---|---|
| KPSF-R-1 | MUST | Upstream filter, 3 repositories, per-host field |
| KPSF-R-2 | MUST | Tolerant deterministic rule (words ∨ code) |
| KPSF-R-3 | MUST | Two sections: linked / other potentially related (+ proxy note) |
| KPSF-R-4 | MUST | Counts and paging per section |
| KPSF-R-5 | MUST | Empty linked section keeps section 2 |
| KPSF-R-6 | MUST | Linked badge = same rule; proxy marker in section 2 (modifies KPPJ-R-4) |
| KPSF-R-7 | MUST | MEL/WorldFish labels in `projects[]` |
| KPSF-R-8 | MUST | AND with existing filters |
| KPSF-R-9 | MUST | Safe query construction |
| KPSF-R-10 | MUST | Non-bilateral unchanged |
| KPSF-R-11 | MUST | Remove exact facet + stale copy |
| KPSF-R-12 | SHOULD | Explain tagging rule |
| KPSF-R-13 | MUST | End-to-end acceptance: T-PJ-003942 → 182744 linked |
