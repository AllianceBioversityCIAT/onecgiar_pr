# Proposal — KP browse: strict bilateral project filter that actually works

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/kp-project-strict-filter` |
| Slug | `kp-project-strict-filter` — derived from the free-text argument |
| Type | Change (an existing opt-in filter is replaced by an effective default filter; root cause confirmed, see §3) |
| Approval Mode | gated |
| Date | 2026-10-14 |
| Branch at proposal | `qa-development-2026-ss` |
| Source | Tickets **INC-165339** ("Testing project-specific KPs from CGSpace", Nicoleta Trifa, 2026-10-14) and **INC-165002** (W3/bilateral tagging in CGSpace) |
| Builds on | `archive/2026-09-18-changes--kp-project-match` (KPPJ), `…--kp-multi-repository-browse` (KPM), `…--kp-program-accelerator-match` (KPAM) |
| Depends on | none · Parallel-safe: yes |
| Amended | 2026-10-14, after the Nicoleta meeting: the "default ON + Show all KPs" UX in §4, §5, §9, §12 OQ-2 and §13 is **superseded** by two sections ("KPs linked to the project" / "Other KPs potentially related" + proxy note). `requirements.md` KPSF-R-3..R-6 is authoritative; the text below is kept as the approved history. |

## 2. Intent

When a user reports a Knowledge Product for a **W3/Bilateral project**, the repository browser must show **only the KPs tagged with that project** (CGSpace, MELSpace, WorldFish), not unrelated "proxy" KPs. The match has to tolerate how repositories actually write the project label (free text such as `IITA (USA-USAID) - <title>`), because PRMS does not control that metadata.

This is the condition Nicoleta set before asking all Centers to tag bilateral project titles in the repositories at scale.

## 3. Problem / Current Behavior (verified 2026-10-14)

**Repro:** go to Bilateral › IITA › project **T-PJ-003942** "IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique" › Create result › KP › Browse. Set Type = Case Study and Year = 2026, with "Filter by project tag: ON".
**Actual:** 81 CGSpace items, none highlighted ("No project tags matched").
**Expected:** only **10568/182744**, which carries `cg.identifier.project = "IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique"`.

| # | Root cause | Where |
|---|---|---|
| RC-1 | **The strict filter is a no-op on CGSpace.** `translateParams` only sends `f.project=<value>,equals`, and CGSpace has no `project` facet. | `onecgiar-pr-server/.../cgspace-discovery/repositories.config.ts:81-86, 241-243` |
| RC-2 | **The strict filter never matches on MELSpace or WorldFish.** The client sends `"<shortName> - <fullName>"` (e.g. `T-PJ-003942 - IITA Accelerated…`) for exact equality, but real facet labels are `ACRONYM - NAME` (e.g. `SKiM - Strengthening Knowledge…`), so turning it ON drops those repositories to 0. | `kp-cgspace-browse.component.ts:557-564, 1087-1089` |
| RC-3 | **The highlight and "Show matches only" only see the current page.** They evaluate `items()`, which holds 10 per page, so a tagged KP on page 5 is invisible. | `kp-cgspace-browse.component.ts:791-822, 1065` |
| RC-4 | **The fuzzy matcher misses labels with a center or funder prefix.** Running the real code on 182744 returns `false`; it only returns `true` for an exact title or a label containing `T-PJ-003942`. | `kp-cgspace-browse.component.ts:93-205` |
| RC-5 | **The fuzzy matcher produces proxy false positives.** Phrases derived from the code (`"t pj"`) make **any** label containing `T-PJ` match **any** project. | `buildProjectMatchCandidates` → `deriveMatchPhrases(projectCode)` |

**Evidence that a fix is feasible:**
- CGSpace Discovery accepts field token queries. `query=cg.identifier.project:(accelerated AND innovation AND delivery AND initiative AND mozambique)` returns **exactly 1 item, 10568/182744**.
- The exact-phrase query with the CLARISA title returns **0**.

**Data reality (IITA pilot):**
- 93 CLARISA projects: 1 is tagged in CGSpace by name, and none carry the PJ code.
- CGSpace labels follow `CENTER (FUNDER) - NAME`. They come from a suggestion list but can be edited freely.
- MEL repositories use a controlled `ACRONYM - NAME` list (INC-165002).

## 4. Proposed Outcome

- **Default behavior:** in the bilateral drawer, the browse returns **only** KPs whose repository project label matches the selected CLARISA project, filtered **upstream** (server side). The count, pagination and "Load more" therefore reflect the filtered set.
- **Supported label shapes:** the match accepts center, funder or acronym prefixes and different punctuation. It requires the project's distinctive title words, or its PJ code.
- **Seeing everything:** a clear control ("Show all KPs") lets the user browse without the project filter. This covers projects nobody has tagged yet.
- **Empty state:** when nothing is tagged, an explicit empty state explains that no KPs in the repositories carry this project, and offers "Show all KPs".
- **Highlight:** the badge uses the **same rule** as the server, so a card shown under the filter is always badged, and no proxy label gets badged.
- **Scope of the change:** Programme Results / AoW / lab browse (non-bilateral) are unchanged.

## 5. Scope

- **Server** (`cgspace-discovery`):
  - Accept the project as separate `projectCode` + `projectTitle` (keep `project` as a legacy alias).
  - Build a sanitized Solr clause on each repository's project field: CGSpace `cg.identifier.project`, MEL/WorldFish `cg.contributor.project` (field query support to be verified per host).
  - AND that clause with the user query and the existing filters.
  - Replace the exact `f.project` facet.
- **Server mapper:** keep `projects[]`. Add the MEL/WorldFish field name if the adapter currently reads only `cg.identifier.project` (to verify).
- **Client** (`kp-cgspace-browse`):
  - Send code and title.
  - Turn the filter ON by default when `enableProjectRepositoryFilter` is set.
  - Rename the chip to a "Project KPs only / Show all KPs" switch.
  - Add the empty state.
  - Align `matchesProjectTags` with the server rule and drop phrases derived from the code (RC-5).
  - Update the copy that says "CGSpace uses highlight matching only".
- **Tests:**
  - Server `translateParams` and service specs, plus a fixture for the 182744 label.
  - Client matcher unit tests: positive for prefixed labels, negative for proxies.
  - Browse component spec for default ON, the empty state and "Show all".

## 6. Non-Goals

- Changing repository metadata, or building a CGSpace plugin that maps labels to CLARISA IDs (the Mohammad/Valentina proposal in INC-165002 is a separate, longer-term track).
- Persisting the repository project label on the created result (the result's project link keeps coming from the PRMS selection, `results_by_projects`).
- Programme Results project context (KPPJ-R-12 stays "MAY").
- Cleaning CLARISA duplicate rows (code-only rows next to named rows): reported separately.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Center users reporting W3/Bilateral KPs | Primary beneficiaries |
| PMU (Nicoleta), Center KM (Theresa / IITA) | Needs a reliable rule to communicate: "tag `cg.identifier.project` with the CLARISA project title (a prefix is allowed) or the PJ code" |
| `onecgiar-pr-server` `results-knowledge-products/cgspace-discovery/*` | Query translation, DTO, specs |
| `onecgiar-pr-client` `kp-cgspace-browse`, `bilateral-manual-create-form` | Filter default, matcher, copy, empty state |
| Specs | MODIFIES KPPJ-R-4 / R-7 and the QA extension "Filter by project tag (opt-in, MEL/WorldFish only)"; KPM-R-4 / R-20 counters stay but now count the filtered set |
| `/api/bilateral/*` payload contract | Not touched |

## 8. Visual Reference

- Source: None (existing drawer; user screenshot 2026-10-14 of `reporting.cgiar.org/bilateral/IITA/home`)
- Location: n/a
- Notes: the change reuses the existing chip, notice and empty-state patterns. Copy goes through the existing copy constants and visual changes use Spartan. If the switch needs a new layout, run a mockup in `/akili-specify`.

## 9. Requirement Delta Preview

### ADDED
- The server filters by project **upstream** on every repository, using a tolerant clause: all distinctive title words (stopwords and roman numerals dropped, capped at N) **OR** the PJ code phrase.
- The bilateral browse defaults to "Project KPs only"; "Show all KPs" removes the clause.
- An explicit empty state when no repository KP carries the project.

### MODIFIED
- KPPJ-R-4 fuzzy match → deterministic token rule shared with the server (no phrases derived from the code).
- KPPJ-R-7 "Show matches only" → superseded in the bilateral context by the upstream filter (kept for the Science Program highlight).
- "Filter by project tag" (opt-in, exact facet, MEL/WorldFish only) → default-on tolerant filter on all three repositories.

### REMOVED
- Exact-equality `f.project=<code - title>,equals` facet param.
- Copy "CGSpace uses highlight matching only".

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Upstream tolerant field query** *(recommended)* | Server adds `(<field>:(w1 AND w2 …) OR <field>:"pj 003942")` to the Discovery `query` | Correct counts and pagination; one round trip; proven live on CGSpace (182744 → 1 hit); no proxy KPs | Precision/recall depends on the token rule; MEL/WorldFish field-query support must be verified |
| B. Client fetch-all + filter | Page through every result and filter in the browser | No server change | Hundreds of calls for broad searches, slow, wrong totals, does not scale |
| C. Keep exact match and ask Centers to copy CLARISA labels verbatim | Communication only | No code | Contradicts the reality documented in INC-165002 (free-text CGSpace field); fails the IITA test case today |

## 11. Recommended Approach

**Option A.** It is the smallest change that makes the filter true at the source: one pure function (`translateParams`), a DTO field pair, and client wiring plus the matcher alignment.

The token rule has to be pinned with fixtures from real labels:
- **Positives:** 182744; MEL `ACRONYM - NAME` samples.
- **Negatives:**
  - the CIMMYT AIDI label must **not** match AID-I Mozambique;
  - a `T-PJ` label must not match any project.

That way the server and the badge cannot disagree.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Mitigation / owner |
|---|---|---|
| R-1 | **Recall:** a Center abbreviates or translates the title (e.g. "AIDI" vs "AID-I"), so ALL-words misses it | Cap N distinctive words; fall back on the PJ code; publish the tagging rule to Centers (Nicoleta) |
| R-2 | **Precision:** generic titles ("Soil Values") match unrelated projects | Require ≥ 2 distinctive words, else require the code; test with negatives |
| R-3 | **Solr injection / 400s from special characters** | Build the clause only from `[a-z0-9]` tokens; never pass raw user text into the field clause; the existing `escapeSolrQuery` keeps covering the free-text query |
| OQ-1 | Do MELSpace and WorldFish accept `cg.contributor.project:(…)` in `query`, and which field does the mapper read there? | Verify live in `/akili-specify` |
| OQ-2 | Default ON with "Show all KPs": is that Nicoleta's expected UX, or should "only project KPs" be enforced with no escape? | Recommend default ON + escape (projects not yet tagged would otherwise block reporting). Confirm with Nicoleta |
| OQ-3 | Should the label also match on the CLARISA project **acronym** (MEL style `SKiM - …`)? Does CLARISA expose an acronym? | Check `clarisa_projects` fields in specify |
| OQ-4 | Theresa reports having tagged 2026 titles; only 2 IITA project labels exist in CGSpace today | Ask Theresa for 2-3 handles to use as fixtures |
| Dep | Staging verification needs the PRTest deploy path (commit on `performance-refactor`, ~30 min) | — |

## 13. Success Criteria

- T-PJ-003942 + Case Study + 2026 returns **10568/182744 only** (count = 1), without scrolling or "Load more".
- A project with no tagged KP shows the empty state. "Show all KPs" restores the full list.
- Zero proxy KPs:
  - every returned card carries a matching project label;
  - the negative fixtures (CIMMYT AIDI, `T-PJ` substring) do not match.
- MELSpace/WorldFish are no longer silently zeroed by the filter. A tagged MEL item for a mapped project is returned, using a real sample from OQ-1.
- Non-bilateral browse (Programme Results, AoW, lab) behaves exactly as before; the existing KPPJ/KPAM/KPM specs stay green.

## 14. Next Step

```text
/akili-specify changes/kp-project-strict-filter
```
