# Design — KP browse: related-section relevance ranking (`KRR`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kp-related-relevance-ranking/` |
| Depth | Standard |
| Requirements | `requirements.md` (KRR-R-1..R-11, NFR-1..4) |
| Extends | KPSF design (`archive/2026-10-14-changes--kp-project-strict-filter/design.md`) §5–§7 |
| Status | Draft, 2026-10-22 |

## 2. Executive Summary

- The server receives a richer project context (description, Science Program, lead-center **name**). It builds a **relevance block** `AND (*:* OR <boosts>)`, appended to the existing KPSF related query, and omits the date sort. Boosts target exactly the three factor fields: subjects, affiliation, program.
- A new pure module, `project-relevance.ts`, owns three things: keyword extraction, the boost clause, and factor/tier evaluation. The service attaches `projectMatch` to items of a ranked related page only.
- The client sends the new params and renders a neutral tier badge, a factor line and a Spartan tooltip on related cards. The proxy note gets a ranked variant.
- **Unchanged**: the linked query, counts, paging, merge (round-robin), dedup and the non-project browse.

## 3. Architecture Overview

| Step | Where | Change |
|---|---|---|
| 1. Request | `kp-cgspace-browse` → `GET …/cgspace-discovery/search` | +3 optional params on related and linked requests (§6) |
| 2. Validate | `CgspaceSearchQueryDto` | +3 optional fields, length-capped |
| 3. Query | `translateParams` (`repositories.config.ts`) | For `related` + applied + relevance context: append the relevance block and drop `sort` (§7.2) |
| 4. Fetch + map | service + mapper | The mapper also reads `adapter.fields.subject` into `subjects` |
| 5. Explain | service → `evaluateProjectMatch` | Attaches `projectMatch { tier, factors }` to each related item (§7.3) |
| 6. Merge | `merge.ts` | Unchanged; `projectMatch` travels with the survivor item |
| 7. Render | client card | Tier badge, factor line, tooltip; ranked proxy note (§8) |

## 4. Extended Directory Structure

```text
onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/
├── project-relevance.ts          NEW  keywords, boost block, factor/tier (pure)
├── project-relevance.spec.ts     NEW
├── repositories.config.ts        MOD  adapter field `subject`, field `program`; translateParams relevance block
├── cgspace-discovery.mapper.ts   MOD  `subjects` (and program via adapter field)
├── cgspace-discovery.service.ts  MOD  attach projectMatch on ranked related pages
├── dto/cgspace-search-query.dto.ts  MOD  +projectDescription, +projectProgram, +projectLeadCenterName
└── dto/cgspace-item.dto.ts       MOD  +subjects?, +projectMatch?
onecgiar-pr-client/…/kp-cgspace-browse/
├── kp-cgspace-browse.component.ts / .html / .spec.ts   MOD
```

## 5. Data Model

No persistence change. Additive response shape (KRR-NFR-4):

| Field | Type | Present when |
|---|---|---|
| `item.subjects` | `string[]` | Always (can be `[]`) |
| `item.projectMatch.tier` | `'strong' \| 'partial' \| 'weak' \| 'none'` | Ranked related page only |
| `item.projectMatch.factors` | `('keywords' \| 'center' \| 'program')[]`, fixed order | Same as tier |
| response `projectScope.ranked` | `boolean` | `projectScope` present; true when the relevance block was emitted |

## 6. API Design

New optional query params on the existing search endpoint. They are ignored unless `projectScope=related`.

| Param | Validation | Source on the client |
|---|---|---|
| `projectDescription` | string, trimmed, ≤ 1000 chars (client truncates) | `projectDescription` input |
| `projectProgram` | string, ≤ 200 (`<code> - <name>`, either part optional) | `programCode` / `programName` inputs |
| `projectLeadCenterName` | string, ≤ 200 | Resolved on the client from `leadCenterAcronym` through the existing name↔acronym map (component line ~228). Omitted when unresolved |

Contract doc: none (this is not a `/api/bilateral/*` payload, so `bilateral-result-summaries.en.md` is untouched). Swagger descriptions are updated on the DTO.

## 7. Backend Module Design

### 7.1 `project-relevance.ts` (pure, no Nest imports)

| Function | Responsibility | Requirements |
|---|---|---|
| `extractRelevanceKeywords(ctx)` | Distinctive words: up to 8 from the title, then up to 8 from the description. Reuses the KPSF `tokenize`/stop-word/min-length rules, excludes the lead-center acronym, dedups | R-5, R-9 |
| `foldPlural(word)` | Strips one trailing `s` / `es` for words of 4+ letters (`genebanks`→`genebank`). The only stemming applied | R-5 |
| `buildRelevanceBlock(adapter, keywords, centerName, program, weights)` | Returns `*:* OR <subject:kw^w>… OR <affiliation:"name"^w> OR <program:"…"^w>`, or `null` when nothing is usable. Tokens go through the same Solr escaping as KPSF-R-9; field names come only from the adapter | R-1, R-9, NFR-2 |
| `evaluateProjectMatch(item, keywords, centerName, program)` | Factors in fixed order, then the tier by count (3/2/1/0) | R-5, R-6 |

Factor rules:
- `keywords`: subject word set (split on non-letters, lowercased, plural-folded) ∩ folded keywords ≠ ∅. Whole words only, so `gene` never matches `genebanks`.
- `center`: some affiliation equals `centerName`, case- and accent-insensitive. An acronym-only context never satisfies it.
- `program`: a port of the client `matchesTaggedMetadata` (KPAM rule), with the same test vectors on both sides (DD-4).

### 7.2 `translateParams` change

Applies only when `scope=related`, `applied=true` and the relevance block is non-null:
- `query` becomes `<KPSF related query> AND (<relevance block>)`;
- `sort` is not set, so DSpace orders by score;
- `projectScope.ranked=true` is echoed.

In every other case the params are byte-identical to today (R-3, R-4).

**Weights (DD-3)**

| Situation | Subject | Center | Program |
|---|---|---|---|
| No search text | ^4 | ^2 | ^2 |
| With search text | ^0.3 | ^0.15 | ^0.15 |

The with-text values are starting points. T-2 calibrates them against the "potato" probe: KRR-R-2 needs a potato-titled KP first. Final values are recorded in `execution.md`.

### 7.3 Service

- When `ranked`, map each item of each `ok` source to `{ ...item, projectMatch: evaluateProjectMatch(...) }` before the merge.
- Dedup keeps the survivor's own `projectMatch`, with no recomputation from `alsoIn`. Accepted: it is a hint, not a count.
- `linked` and unranked requests never carry `projectMatch` (R-3, R-4).

### 7.4 Adapter fields

| Repository | `subject` | `program` |
|---|---|---|
| CGSpace | `dcterms.subject` | `cg.contributor.programAccelerator` |
| MELSpace | `dc.subject` | `cg.contributor.programAccelerator` |
| WorldFish | `dc.subject` | `cg.contributor.programAccelerator` |

The mapper's program read switches from the literal string to `adapter.fields.program`; the values are identical today. The program field's query behavior on MEL/WorldFish is verified live in T-2. If a host does not index it, its program boost is dropped for that adapter (the factor still evaluates from metadata).

## 8. Frontend / UX Component Architecture

| Element | Spec |
|---|---|
| Tier badge | Spartan `hlmBadge`, neutral outline (`border-[var(--pr-border)]`, `text-[var(--pr-text-secondary)]`, `text-[11px]`), placed after the `Proxy` marker. The label uses a leading dot, filled for Strong / half for Partial / hollow for Weak / none for No direct match. No new color (UI rule 7/9: content surfaces stay neutral; amber stays for Proxy) |
| Factor line | `text-[11px] text-[var(--pr-text-secondary)]`: "Project keywords · Center · Science Program", only the matched factors in fixed order. Hidden for `none` |
| Tooltip | Spartan `hlmTooltip` on the badge: "Approximate: based on matching subjects, Center and Science Program with this project. Not tagged with the project." Keyboard-focusable (badge gets `tabindex="0"`) |
| Proxy note | When `projectScope.ranked` is true: "These KPs are not tagged with this project in the repository. They are ordered by similarity to the project (subjects, Center, Science Program); the match label is an approximation." Otherwise the current quick copy stays (R-8) |
| States | Loading, error and empty are unchanged. Linked cards never show a tier |
| Copy constants | New keys in `KP_BROWSE_COPY` (`tierStrong`, `tierPartial`, `tierWeak`, `tierNone`, `tierTooltip`, `proxyNoteRanked`, factor labels) |

Params: `buildParams` adds the three params whenever `scope` is set. They are sent on linked requests too, for simplicity; the server ignores them there.

## 9. Shared Contracts or Package Extensions

- The client `CgspaceItemDto` interface gains `subjects?` and `projectMatch?`; the response interface gains `projectScope.ranked?`.
- No shared package.

## 10. Design Decisions

| ID | Decision | Rationale / rejected alternatives | Req |
|---|---|---|---|
| DD-1 | Relevance block as `AND (*:* OR …)` | Probed 2026-10-22: totals identical and exclusion kept. `+req optional` returns 0 (default AND); a bare `OR` would leak linked items | R-1, R-2 |
| DD-2 | Boost exactly the factor fields | Ranking and tier agree. Title and abstract boosts were rejected (decision 2026-10-22: subjects only) | R-1, R-5 |
| DD-3 | Weight set by text presence | Text must dominate (decision 2026-10-22). The probe showed full weights outranking "potato" hits. Calibrated in T-2 | R-2 |
| DD-4 | Factors computed server-side; program rule ported with shared test vectors | One authority for tier and ranking. Client-side factors were rejected: the API would not carry the explanation, and the logic would split | R-5 |
| DD-5 | Center by full name, resolved on the client | Affiliation values are full names. The client already holds the name↔acronym map. Server-side DB lookup was rejected (it adds a CLARISA dependency to a stateless module) | R-5 |
| DD-6 | Drop `sort` only when the block is emitted | **Reverts delivered behavior** (newest-first for related). Challenge, "what does removing this break?": (a) equal-score items lose date order and fall back to index order, but pages stay stable for the same query; (b) the quick copy "listed newest first" becomes false, so R-8 swaps to the ranked note via `projectScope.ranked`; (c) nothing else reads the sort. Both are addressed | R-1, R-8 |
| DD-7 | No cross-repository re-ranking | Scores are not comparable across hosts (KPM-DD-3 stands) | Out of scope |

## 11. Risks & Rollback

| Risk | Mitigation |
|---|---|
| A host stops honoring the boost syntax | Totals remain correct (the block is a non-filtering `*:* OR`). Worst case is the old order. Rollback: client stops sending the new params → byte-identical KPSF behavior |
| Query length | ≤ 16 keywords × ~40 chars + 2 phrases ≈ 1.1k chars < NFR-2 (asserted in a unit test) |
| Stemming mismatch (accepted residual, requirements §8) | Unit vectors for the probed pairs |

## 12. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 5 |
| LOC (prod + tests) | ~650 (server ~420, client ~230) |
| Review rounds | 1–2 per task |
