# Requirements — KPI Count Reconciliation (`bugfix/kpi-count-reconciliation`)

**Answer first:** every KPI figure on the Program shell must come from one deduplicated, zero-target-filtered universe, so that `band total = Σ hero rows + outcome chips = Σ table ratios = Σ hub rows`. Today the band counts the 7 cross-cutting Intermediate Outcomes six times and skips the zero-target rule (SP01: band 449 · hero 352 + chips 7 + 5 = 364 · table 382 + 5 + 1 = 388). Root cause and live reproduction: `proposal.md` §9, `evidence/sp01-reconcile.json`.

## Document Control

| Field | Value |
|---|---|
| Type | **Bug** (Bug Mode — regression test mandatory) |
| Depth | **Standard** — cross-cutting across 6 computeds, 4 components and 7 pinned test files; documents kept lean |
| Approval Mode | `pre-approved (j.cadavid, standing feedback 2026-09-02 "pragmatic AKILI" — applied as default; Phase gates logged as auto-approved)` |
| Module | `result-framework-reporting` — client `pages/dashboard-lab` |
| Requirement prefix | `KCR` |
| Owner | Reporting product owner (j.cadavid@cgiar.org) |
| Status | `approved` — Phase 1 gate: *auto-approved (pre-approved mode)* |
| Ticket | — (field report 2026-09-03, screenshots in `evidence/`) |
| Proposal | `proposal.md` (same folder) — followed without deviation; OQ-2 and OQ-3 resolved below |
| Model routing | T1; session model exceeds registry `opus` entry — registry flagged, no downgrade |

## 1. Module / Feature

- **Module:** `result-framework-reporting`
- **Sub-feature:** Program shell KPI counts (Overview hero, hub, ToC map, Reporting band, grouped table, By-AOW banner)
- **Status:** `approved`

## 2. Context

The Program shell (`docs/ux-ui/design.md` §4 *Result Framework Reporting*, TRD §2 `result-framework-reporting` → `api/results-framework-reporting/*`) renders planned KPIs per Area of Work (AoW) on several surfaces. The API embeds every cross-cutting Intermediate Outcome (`is_aow: false`) inside **every** AoW's `tocResultsOutcomes` **and** serves it again from the Intermediate Outcomes endpoint (by design — archived `results/intermediate-outcome-aow-visibility` RES-R-3). Each client surface then applies its own tier filter and its own zero-target policy, so the same AoW reads 144 / 137 / 115 / 110 KPIs on one screen.

PRD links: **US-P1** (phase-aware dashboard a lead can trust), **G1** (submission completeness — the "KPIs with evidence" ratio is the headline completeness figure), **AC-5** (phase scoping unchanged).

## 3. In Scope / Out of Scope

### In scope
- One shared **KPI partition** per program + phase, client-side, from payloads already fetched.
- Rewire every KPI total/ratio on the shell to that partition: band cards + popover count, hero rows + rail + chips, hub rows, ToC-map AoW nodes, grouped-table header ratio + count label, By-AOW banner.
- Zero-target disclosure `title`s where a denominator now excludes KPIs.
- Regression tests (red on `qa-development-2026` today, green after).

### Out of scope
- Server changes; the QA / PREL **achievement** roll-up (`toc-progress-rollup.ts`, P2-3296) and its `N of M indicators` coverage copy — different metric, follow-up spec (`proposal.md` OQ-1).
- Meaning of *Reported* (`achieved > 0`, MRF-R-6) and *Complete*; Only-pending / sort semantics (MRF-R-1/R-2); any layout, token or colour change.
- The Outcomes-band rows themselves inside an AoW card — they stay visible with their RES-R-3 tooltip.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| PMU lead / program lead | Totals add up across the shell; "Total KPIs" and "KPIs with evidence" stop over-stating the plan |
| Result submitter | Row ratios on Overview and Reporting agree, so "what is left" is one number |
| Platform admin | Nothing — no API or config change |

## 5. User Stories

- **`KCR-US-1`** — As a program lead, I want every KPI total on the shell to be derived from one universe, so that the parts add up to the total I see in the band. *(Refines US-P1)*
- **`KCR-US-2`** — As a submitter, I want an AoW's `reported of total` to be the same on the Overview row, the hub row, the Reporting card header and the By-AOW banner, so that I plan work against one figure. *(Refines US-P1, G1)*

## 6. Glossary

| Term | Definition |
|---|---|
| **AoW-own KPI** | An indicator of an AoW's output tier (HLO), **or** of an outcome node the payload marks `is_aow: true` |
| **Cross-cut IO** | An outcome node with `is_aow !== true` inside an AoW payload — a program-level Intermediate Outcome repeated into every AoW; the client stamps its rows `__isIntermediateCrosscut` |
| **Bucket** | One of: each AoW (own KPIs), Intermediate outcomes (IO endpoint), 2030 outcomes (2030 endpoint) |
| **Planned** | All KPIs in a bucket, each counted once |
| **Zero-target** | `target = 0 ∧ achieved = 0` (MRF-R-7) |
| **Counted** | Planned minus zero-target — the only denominator allowed on the shell |
| **Reported** | Counted KPI with `achieved > 0` (MRF-R-6) |

## 7. Functional Requirements

### Required (MUST)

- **`KCR-R-1` Count once.** The shell MUST place every indicator in exactly one bucket: AoW-own → that AoW; cross-cut IO rows → the Intermediate bucket only; 2030 rows → the 2030 bucket only. No AoW total, ratio, count label or rail figure MAY include a cross-cut IO row.
  - **`KCR-R-1.1`** Bucket membership MUST be decided from the payload's group-level `is_aow` (RES-R-3 verified mechanism), never by cross-referencing `indicator_id` against another endpoint.
- **`KCR-R-2` One zero-target policy.** Every denominator on the shell MUST be *Counted* (zero-target excluded): band **Total KPIs** and **KPIs with evidence**, hero rail and rows, Overview KPI card 4 / section badge (`aowStats`), Strategic-outcomes chips, hub rows, ToC-map AoW node `done/total`, grouped-table header ratio, bucket-card ratio, By-AOW banner.
  - **`KCR-R-2.1`** Wherever the exclusion removed ≥ 1 KPI, the figure MUST carry a `title` naming it, pluralised as the existing MRF helper does (`excludes 1 zero-target KPI` / `excludes 27 zero-target KPIs`); the band's Total KPIs `title` MUST also state the planned count (`414 planned · excludes 51 zero-target KPIs`, or `414 planned` when nothing was excluded). Surfaces owned: band, chips, hub rows, hero rows (already), table header (already), banner (already).
  - **`KCR-R-2.2`** Accepted exemption: ToC-map node labels and KPI card 4's aggregate carry no `title` — they mirror hero rows that already disclose, and the map is a structural view. Recorded as an accepted gap in §9.
- **`KCR-R-3` Reconciliation identities.** With no filter active, for one program and phase, the shell MUST satisfy: `heroRail.total = Σ heroRows.total = KPI card 4 total`; `band.totalKpis = heroRail.total + Σ chips.total = Σ tableHeaders.total (AoW cards + bucket cards) = Σ hubAowRows.total + Σ hubProgramLevelRows.total`; and the same identities for `reported`/`done`. The rail deliberately sums AoW rows only — program-level KPIs live in the chips beneath it.
- **`KCR-R-4` Band figures are unfiltered.** Band **Total KPIs**, **KPIs with evidence** and the popover *planned results* count MUST NOT change under the AoW search, Section, Type, Category filters or the Only-pending toggle.
- **`KCR-R-5` AoW row basis = AoW-own.** Hero rows (thin and rich), KPI card 4 / section badge, hub rows, ToC-map AoW nodes, grouped-table header ratio and count label, and the By-AOW banner MUST all compute over the AoW-own set.
  - **`KCR-R-5.1`** The ToC map MUST show the cross-cutting IO nodes once: when the Intermediate-outcomes branch (IO endpoint) is non-empty, the deduplicated "Program-level" branch built from AoW payloads MUST be suppressed (same population by RES-R-3); it remains the fallback when the IO endpoint returns nothing. *(Resolves proposal OQ-2: an `is_aow: true` outcome is that AoW's KPI — the grouped table and ToC map already treat it so.)*
- **`KCR-R-6` Program-level rows.** Intermediate and 2030 rows (chips, hub, bucket cards) MUST be present iff the bucket has ≥ 1 planned KPI, with figures over *Counted* and a `title` per KCR-R-2.1 when planned > counted.
- **`KCR-R-7` Visibility preserved.** Cross-cut IO rows MUST remain rendered inside the AoW card's Outcomes band with the RES-R-3 tooltip; only their contribution to totals changes.
- **`KCR-R-8` Band card semantics.** Band **Total KPIs** big figure = program *Counted*; **KPIs with evidence** = program *Reported* `of` *Counted*; popover *planned results* = program *Planned*. *(Resolves proposal OQ-3.)*
- **`KCR-R-9` Reported predicate.** Every *Reported* figure MUST use `achieved > 0` only; the band MUST drop its `progress_percentage > 0` clause (a `'1500%'` string — dead branch, verified live).

### Should (SHOULD)
- **`KCR-R-10`** The grouped-table AoW header count label SHOULD equal AoW-own *Planned*, so that `count − zeroTarget = ratio.total` holds on the same header **while Type = all and Category = all** (the ratio follows those two filters today — existing behaviour, out of scope).

### Scenarios

#### `KCR-R-1` / `KCR-R-3` — Cross-cut IOs counted once (the SP01 case, reduced)
- GIVEN a program with AoWs **A** and **B**; A's payload has 4 output KPIs (1 zero-target, none reported), B's has 3 output KPIs (exactly one reported, `achieved = 75`), B also has 1 outcome node `is_aow: true` with 1 KPI (not reported); both payloads embed the same 2 outcome nodes `is_aow: false` carrying IO KPIs `#901`, `#902` (`#902` zero-target); the Intermediate endpoint returns `#901`, `#902`; the 2030 endpoint returns `#950`
- WHEN the shell computes its figures with no filter
- THEN band Total KPIs = **9** (A 3 + B 4 + IO 1 + 2030 1 — planned 11, zero-target 2)
- AND hero rows read A `0/3`, B `1/4`; the hero rail and KPI card 4 read `1 of 7`; chips read Intermediate `0/1`, 2030 `0/1`
- AND the grouped table reads A `4 KPIs · 0 of 3`, B `4 KPIs · 1 of 4`, Intermediate `0 of 1`, 2030 `0 of 1`; the ToC map shows the two IO nodes under Intermediate outcomes only (no Program-level branch)
- AND every `indicator_id` contributes to exactly one of those denominators
- BUT it must NOT count `#901`/`#902` inside A or B (today's code yields band **15**, B `1 of 5`, rail `1 of 6`)
- AND IT MUST still render `#901`/`#902` rows inside A's and B's Outcomes band with the cross-cut tooltip

#### `KCR-R-2` — Chips apply the zero-target rule
- GIVEN the Intermediate bucket above (planned 2, counted 1)
- WHEN the Overview hero renders
- THEN the Strategic-outcomes chip reads `0/1`, not `0/2`
- AND its `title` reads `excludes 1 zero-target KPI`
- BUT it must NOT hide the chip (planned > 0)

#### `KCR-R-4` — Band ignores filters
- GIVEN the fixture above and band Total KPIs = 9
- WHEN the user sets Category to a typology matching one KPI, then Type = `hlo`, then Section = A only, then types `zzz` in the AoW search, then enables Only-pending
- THEN band Total KPIs, KPIs with evidence and the popover planned count are unchanged after each step
- BUT the grouped table's visible cards MAY change (existing MRF-R-1 behaviour)

#### `KCR-R-5` — One AoW, one ratio
- GIVEN AoW B above (3 outputs + 1 owned outcome, none zero-target, 1 reported)
- WHEN Overview, hub, ToC map, Reporting table and By-AOW view render B
- THEN all five read `1 of 4` (or `1/4`)
- BUT the By-AOW banner must NOT read `1 of 5` (today: own + the counted cross-cut `#901`) and the hero row must NOT read `1/3` (today: outputs only)

#### `KCR-R-9` — Reported predicate
- GIVEN a KPI with `actual_achieved_value_sum = 0` and `progress_percentage = '0%'`
- WHEN the band counts KPIs with evidence
- THEN it is not counted
- AND IT MUST count a KPI with `actual_achieved_value_sum = 75` regardless of the `progress_percentage` string

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Partition is a memoised `computed` over already-fetched ToCs; O(n) in indicators; no new HTTP request |
| **Backwards compatibility** | No API change; `ReportingSummaryStats` gains optional fields only |
| **Accessibility** | Disclosures via `title` on the figure element (existing MRF pattern); figures stay in the a11y tree (OSF-R-8 unchanged) |
| **Observability** | none (display-only) |
| **Security** | none — no new input, no logging |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KCR-AC-1` | Scenario fixture (2 AoWs, 2 cross-cut IOs, 1 owned outcome, 1 2030 KPI) | shell computes | band = 9; rail = card 4 = Σ hero rows = 7; rail + chips = 9; Σ table headers = 9; Σ hub rows = 9; ToC map has no Program-level branch; each id in exactly one denominator |
| `KCR-AC-2` | Same fixture | Overview renders chips | Intermediate `0/1` with `title` `excludes 1 zero-target KPI`; 2030 `0/1` no title |
| `KCR-AC-3` | Same fixture | filters/Only-pending toggled in sequence | band `totalKpis`, `reportedKpis`, popover count byte-identical after each step |
| `KCR-AC-4` | AoW B | five surfaces render | all read `1 of 4`; banner not `1 of 5`; hero not `1/3` |
| `KCR-AC-5` | Same fixture | grouped table renders A | `#901`, `#902` rows present in A's Outcomes band with cross-cut tooltip; A header `4 KPIs · 0 of 3` (count = own planned 4; 4 − 1 zero-target = 3) |
| `KCR-AC-6` | Current code on `qa-development-2026` | regression test runs | **fails** (band 15, B table `1 of 5`, banner `1 of 5`, chip `0/2`, hero B `1/3`, rail `1 of 6`); passes after the fix |
| `KCR-AC-7` | Live SP01, default phase, Orca browser | reconciliation script + screen read | band **363** (`title` `414 planned · excludes 51 zero-target KPIs`), `2 of 363`; hero rail and KPI card 4 `2 of 357`; AOW02 `1/110` (hero, hub) and `1 of 110` (table, banner); Intermediate `0/5` chip, `0 of 5` card; 2030 `0/1`, `0 of 1` |

Cross-cutting project ACs that apply without restating: `AC-5` (phase scoping — partition keyed by the same `versionId` cache key), `AC-9`.

### Defect classes and the gate that catches each

| Defect class | Gate | Blind spot / substitute |
|---|---|---|
| Wrong arithmetic, dedupe or zero-target policy in the helper or computeds | Jest: `reporting-burndown.spec.ts` (helper), `dashboard-lab.*.spec.ts` (computeds) — `KCR-AC-1..4, 6` | none |
| Template not wired to the new figures / `title` missing | Jest DOM assertions in `reporting-program-band`, `program-overview.oah-hero`, `reporting-aow-table` specs — `KCR-AC-2, 5` | a `title` present with wrong text is caught only if the test asserts the text — tests MUST assert full text |
| Fixture-shaped blindness (synthetic data misses a real payload shape) | Live reconciliation `KCR-AC-7` via `evidence/reconcile.browser.js` in the authenticated Orca browser + reading the rendered figures | manual, at the final HITL checkpoint; automated harness has no API access |
| Existing behaviour regressed (Only-pending, sort, scope filter, hub navigation) | Existing suites for MRF / OSF / REH / TCM re-run green with **updated fixtures, not loosened assertions** | a fixture rewritten to the new number is the intended change; a deleted assertion is not — Reviewer checks diffs of `*.spec.ts` for removed `expect`s |
| Visual/layout | none needed — no layout, token or copy change besides `title` attributes | accepted: `title` attributes have no layout effect |
| Zero-target disclosure missing on ToC-map nodes and KPI card 4 (KCR-R-2.2) | none | **accepted gap** — both mirror hero rows that disclose; revisit if a user reads the map as a KPI ledger |

## 10. Dependencies & Assumptions

- **Upstream:** `GET api/results-framework-reporting/toc-results?program&areaOfWork`, `…/toc-results/intermediate-outcomes`, `…/toc-results/2030-outcomes` — unchanged; group-level `is_aow` present on `tocResultsOutcomes` (RES-R-3, verified live 2026-08-26 and 2026-09-03).
- **Downstream:** none outside `pages/dashboard-lab`.
- **Assumption A-1:** 2030 outcomes never appear inside AoW payloads (SP01 and SP04 live: 0 overlap). If a future payload embeds them, KCR-R-1.1 still routes them by `is_aow`; an `is_aow: true` 2030 node would count as AoW-own — acceptable and disclosed here.
- **Assumption A-2:** `changes/aow-filter-popover` (active) edits the same files; this spec executes **after** it or rebases onto it (`Parallel-safe: no`).

## 11. Open Questions

- none blocking. Proposal OQ-1 (server roll-up basis) deferred to a follow-up spec; OQ-2/OQ-3 resolved in KCR-R-5 / KCR-R-8.

## 12. Out-of-Band Notes

- Supersedes the recorded "accepted divergence" clauses: `mass-reporting-flow` MRF-R-7 §3 Out, `overview-aow-progress-hero` DD-1 / DD-3 / **DD-4** (card 4 `aowStats` "numbers do not move") / C-5 / C-8, `reporting-entry-hub` REH-R-2 basis, `overview-toc-map` TCM-R-3 wording ("counts ONLY output-tier") and TCM-DD-5's Program-level branch when the IO branch exists. The `reporting-burndown.ts` header docblock that records the old divergence is updated in KCR-T-2. `/akili-archive` records the supersession; archived specs are not edited.

## Required cross-references

- `docs/prd.md` — US-P1, G1, AC-5, AC-9.
- `docs/ux-ui/design.md` — §4 Result Framework Reporting (Overview / Reporting tabs).
- `docs/trd/trd.md` — §2 module table `result-framework-reporting` → `api/results-framework-reporting/*`.
- `docs/specs/archive/2026-08-27-results--intermediate-outcome-aow-visibility--target-tooltip/requirements.md` RES-R-3 (`is_aow` mechanism).
- `docs/specs/archive/2026-08-31-changes--mass-reporting-flow/requirements.md` MRF-R-6 / MRF-R-7.
