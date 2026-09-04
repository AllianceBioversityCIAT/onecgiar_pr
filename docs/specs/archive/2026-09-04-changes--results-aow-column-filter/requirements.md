# Requirements — Area of Work on the Results tab (`changes/results-aow-column-filter`)

**Answer first:** every row on the program's **Results** tab must show the Area of Work the Overview counts it under, the dormant **Section** filter must work (multi-select over AoWs, *Intermediate outcomes*, *2030 outcomes*, *Not tagged*), and every Overview link emitted while an AoW scope is active must land on Results pre-filtered to it — so for one AoW at one phase, `Results count = Overview scope bucket total`. Today the Results payload carries no AoW (P2-3398 / P2-3399), the Section filter ships disabled, and the archived scope-filter spec deferred the deep link for exactly that reason (`OSF-DD-12`).

## Document Control

| Field | Value |
|---|---|
| Type | **Change** |
| Depth | **Standard** — one new read-only endpoint (reusing an existing query), client join + column + filter + deep link; five tasks |
| Approval Mode | `pre-approved (j.cadavid, standing feedback 2026-09-02 "pragmatic AKILI" — applied as default; Phase gates logged as auto-approved)` |
| Module | server `results-framework-reporting` (new query endpoint) · client `result-framework-reporting` (`programme-results`, `dashboard-lab` Overview links) |
| Requirement prefix | `RAC` |
| Owner | Reporting product owner (j.cadavid@cgiar.org) |
| Status | `approved` — Phase 1 gate: *auto-approved (pre-approved mode)* |
| Proposal | `proposal.md` (same folder). **Deviation recorded:** the proposal recommended Option A (extend the results-list endpoint). Specify found `ResultsFrameworkReportingModule` imports `ResultsModule` (`results-framework-reporting.module.ts:15,51`), so the list endpoint cannot depend on the reporting module's ToC-context resolver without a cycle, and duplicating the AoW query in the results module would re-create the two-homes drift `KCR` just removed. The chosen design is the proposal's **Option C, corrected**: a small read-only endpoint in the reporting module that reuses the *same* scope-bucket query, joined client-side by result id (one extra request, one home for the rule). OQ-1..3 resolved in `RAC-R-1` |
| Tickets | P2-3398 (Section filter disabled), P2-3399 (payload lacks AoW) — closed for the Results tab by this spec |
| Model routing | T1; session model exceeds the registry `opus` entry — flagged, no downgrade |

## 1. Module / Feature

- **Module:** `result-framework-reporting`
- **Sub-feature:** Results tab — Area of Work column, Section filter, Overview → Results scope deep link
- **Status:** `approved`

## 2. Context

The Overview already partitions the program's results into **scope buckets** — one per AoW plus *Intermediate outcomes*, *2030 outcomes* and an *Untagged* residual — with the server query `getScopeBuckets` (`results-framework-reporting.service.ts:1004-1160`): one bucket per result, `MIN(UPPER(wp.acronym))` as the deterministic tie-break when a result touches several AoWs (`OSF-DD-2d`, measured 3.7 %), `INTERMEDIATE` / `EOI_2030` from the ToC node category when no work package, and everything else Untagged (`OSF-DD-2b/3`). The Results tab (`programme-results`) lists the same program's results from `GET api/results/get/all/roles/filter/:userId` (client-side filtering over one request, `PROGRAMME_RESULTS_PAGE_LIMIT` 2000), whose rows have no ToC field; its `section` is hardcoded `''` and the Section multiselect is `aria-disabled` with a "Coming soon" tag.

PRD links: **US-P1** (a dashboard a lead can trust — the parts must be navigable), **G1** (submission completeness by area), **AC-5** (phase scoping — buckets are per phase). Design: `docs/ux-ui/design.md` §4 *Result Framework Reporting*, §6 *Listing screens* ("never hide columns silently"). TRD §2 `result-framework-reporting` → `api/results-framework-reporting/*`.

## 3. In Scope / Out of Scope

### In scope
- New read-only endpoint returning each result's scope bucket for one program and phase, computed by the **same** query the Overview buckets use.
- Results tab: **Area of Work** column (default on, sortable, exported), live **Section** filter (multi-select, chips, counts, `?section=` param, Clear filters), search matching the AoW.
- Overview → Results: `OverviewLink.section`; every link emitted under an active scope carries it; scope-breakdown rows gain a *View results* link.
- Reconciliation: Results count for a section = Overview bucket total.

### Out of scope
- The **indicator line** under result titles (other half of P2-3399) — different join; separate spec.
- Row checkbox / bulk actions (P2-3397); *View indicator* row action (P2-3395).
- Changing the results-list endpoint, its SQL or its callers (Results Center, Bilateral).
- Changing how the Overview computes buckets.
- Reporting tab and By-AOW view; hero-row / ToC-map click targets (they keep opening Reporting By-AOW).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Program lead / PMU | sees each result's AoW; a chart click under an AoW scope opens Results already filtered; Section filter works |
| Result submitter | finds own results by AoW |
| QA reviewer, Platform admin | unchanged |
| Bilateral / platform-report consumers | unchanged (different endpoints) |

## 5. User Stories

- **`RAC-US-1`** — As a program lead, I want each result row to show its Area of Work, so that I can read the Results tab by area without opening every result. *(Refines US-P1)*
- **`RAC-US-2`** — As a program lead, I want an AoW selected on the Overview to carry into the Results tab when I click a chart, so that the list I land on is the list I clicked. *(Refines US-P1, G1)*

## 6. Glossary

| Term | Definition |
|---|---|
| **Scope bucket** | The Overview's partition of a program's results: one AoW code (`AOW01`…), `INTERMEDIATE`, `EOI_2030` or `UNTAGGED` — exactly one per result (`getScopeBuckets`, OSF-DD-2/2d/3) |
| **Section** | The Results tab's name for the same partition; filter values **are** the bucket keys |
| **Bucket key vocabulary** | `AOW<nn>` (work-package acronym, upper-case) · `INTERMEDIATE` · `EOI_2030` · `UNTAGGED` — shared by `?scope=` (Overview) and `?section=` (Results) |
| **AoW codes** | Every AoW acronym a result's active ToC links touch (may be several); the bucket key is the lowest |
| **Reconciliation** | For one program, phase and bucket, Results rows in that section = Overview bucket total |

## 7. Functional Requirements

### Required (MUST)

- **`RAC-R-1` One bucket per result, same rule as the Overview.** The system MUST expose, for one program and phase, each result's scope bucket `{ result_id, key, kind, codes[] }` computed by the same query and tie-break the Overview buckets use: `MIN(UPPER(acronym))` over the result's active ToC links for the program (`kind: 'aow'`), else `INTERMEDIATE` / `EOI_2030` from the ToC node category (`kind: 'outcome'`), else `UNTAGGED` (`kind: 'untagged'`); `codes` lists every AoW acronym touched. *(Resolves OQ-1: mirror the Overview; OQ-2: links filtered to the program's initiative; OQ-3: ToC phase and reporting year resolved from the phase's `versionId` exactly as the Overview does.)*
  - **`RAC-R-1.1`** A result of the program with no ToC link at all MUST still appear in the response as `UNTAGGED` (the Overview counts it in the residual).
  - **`RAC-R-1.2`** The endpoint MUST be read-only, JWT-gated like its siblings, and MUST NOT change the results-list endpoint or the Overview's `scopeBuckets` payload.
- **`RAC-R-2` Area of Work column.** The Results table MUST show an **Area of Work** column, default on and exported to CSV, rendering the bucket: AoW code for `kind: 'aow'`; *Intermediate outcomes* / *2030 outcomes* / *Not tagged* for the fixed keys. When `codes.length > 1` the cell MUST show `AOW01 +1` and carry every code in `title`.
  - **`RAC-R-2.1`** While buckets are loading the cell MUST show a skeleton, never `—`; if the bucket request fails the column MUST show `—` with a `title` explaining the buckets could not be loaded, and the rest of the table MUST keep working.
  - **`RAC-R-2.2`** The column MUST be sortable by bucket key (AoWs alphabetically, then `INTERMEDIATE`, `EOI_2030`, `UNTAGGED`).
- **`RAC-R-3` Section filter live.** The Section control MUST be enabled (no "Coming soon", no `aria-disabled`), multi-select, offering *Areas of work* (codes present in the loaded rows, with counts) and *Program-level* (`INTERMEDIATE`, `EOI_2030`, `UNTAGGED`, with counts); a selection MUST filter rows by bucket key, show one chip per value, count in the Filter badge, mirror to `?section=A,B` and clear with **Clear filters**.
  - **`RAC-R-3.1`** Filter values MUST use the bucket key vocabulary (§6), replacing the never-live `intermediate-outcomes` / `2030-outcomes` constants of the Results tab.
- **`RAC-R-4` Overview links carry the scope.** When an AoW or program-level scope is active on the Overview, every `OverviewLink` emitted (status bar segments, category cards, funding/center charts) MUST carry `section = <scope key>`; without an active scope no `section` is added. Each scope-breakdown row MUST offer a *View results* action that opens Results with `section = <row key>`.
  - **`RAC-R-4.1`** The Results tab MUST hydrate `?section=` on load like its other params (chip, filter, badge) and MUST NOT rewrite the URL while hydrating (existing anti-loop rule).
- **`RAC-R-5` Reconciliation.** For one program, phase and bucket key, over the population both surfaces share — results the program **owns** (`results_by_inititiative.initiative_role_id = 1`, the Results tab's `submitter_id` population) with funding source W1/W2 — the Results tab's count under `?section=<key>` MUST equal the Overview's bucket total for that key. Where the Overview's total also counts results the program only **contributes to** (its membership join carries no role filter), the difference MUST be reported as a number in the live check, not silently absorbed (see A-5).
- **`RAC-R-6` Search.** The Results search box MUST also match the bucket key and its display label.

### Should (SHOULD)
- **`RAC-R-7`** The Section options SHOULD show the AoW name beside the code (`AOW01 · Market Intelligence`) when the program's units are loaded.

### Scenarios

#### `RAC-R-1` — One bucket per result
- GIVEN program SP01 at phase 36 with result `#9006` linked to ToC nodes in `AOW02` and `AOW01`, result `#8871` linked only to a program-level *Intermediate outcome* node, and result `#8702` with no ToC link
- WHEN the buckets are requested for SP01 / 36
- THEN `#9006 → { key: 'AOW01', kind: 'aow', codes: ['AOW01','AOW02'] }`, `#8871 → { key: 'INTERMEDIATE', kind: 'outcome', codes: [] }`, `#8702 → { key: 'UNTAGGED', kind: 'untagged', codes: [] }`
- AND the Overview's `scopeBuckets` for the same request counts `#9006` under `AOW01` only
- BUT it must NOT count `#9006` under `AOW02` (one bucket per result)
- AND IT MUST ignore ToC links of other initiatives (a contributing program's link to the same result)

#### `RAC-R-2` / `R-3` — Column and filter
- GIVEN the three results above loaded on the Results tab
- WHEN the table renders
- THEN the Area of Work cells read `AOW01 +1` (title `AOW01, AOW02`), `Intermediate outcomes`, `Not tagged`
- AND the Section options read *Areas of work: AOW01 (1)* and *Program-level: Intermediate outcomes (1) · 2030 outcomes (0) · Not tagged (1)*
- WHEN the user selects `AOW01`
- THEN one row remains, the chip `Section: AOW01` shows, the badge counts 1, the URL carries `?section=AOW01`
- BUT it must NOT show `#9006` under a `Section: AOW02` selection
- AND IT MUST restore all three rows on **Clear filters** and drop `section` from the URL

#### `RAC-R-4` — Overview links carry the scope
- GIVEN the Overview with scope `AOW01` selected
- WHEN the user clicks the *Editing* segment of the status bar
- THEN Results opens with `?status=Editing&section=AOW01&phase=…` and both chips show
- AND clicking *View results* on the *2030 outcomes* breakdown row opens `?section=EOI_2030`
- BUT it must NOT add `section` when no scope is selected
- AND IT MUST leave hero-row and ToC-map clicks going to Reporting By-AOW as today

#### `RAC-R-5` — Reconciliation
- GIVEN SP01 at the default phase
- WHEN the Overview shows `AOW02 · 110` in its scope breakdown and the user opens Results with `?section=AOW02`
- THEN the Results counter reads `110 results`
- AND IT MUST hold for `INTERMEDIATE`, `EOI_2030` and `UNTAGGED` too

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | One extra request per Results-tab visit (and per phase change), payload ≈ one small object per result (SP01 ≈ 500 rows < 40 kB); server query is the existing scope CTE without status grouping — p95 under 300 ms locally on SP01; the results-list endpoint's latency unchanged (untouched) |
| **Backwards compatibility** | Additive: new endpoint; no change to `get/all/roles/filter` or `clarisa-global-units` payloads; `OverviewLink` gains an optional field |
| **Security** | JWT `auth` header as siblings; `programId` / `versionId` validated (400 on non-numeric version); no new write |
| **Accessibility** | New column header with `scope="col"`, sortable via the table's directive; Section control keyboard-reachable (existing multiselect) |
| **Observability** | none |

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RAC-AC-1` | server fixture rows for the three results | endpoint mapper runs | buckets as in scenario R-1; other initiatives' links ignored; unlinked result `UNTAGGED` |
| `RAC-AC-2` | client fixture | Results table renders | Area of Work cells `AOW01 +1` (title lists both), `Intermediate outcomes`, `Not tagged`; skeleton while loading; `—` + title on error |
| `RAC-AC-3` | client fixture | select `AOW01`, then Clear filters | one row + chip + badge 1 + `?section=AOW01`; then three rows and no `section` param |
| `RAC-AC-4` | Overview scope `AOW01` | status-bar segment click | `onOverviewLink` navigates with `section=AOW01` plus the segment's own params; no scope → no `section`; breakdown *View results* → `section=<key>` |
| `RAC-AC-5` | `?section=AOW01,INTERMEDIATE` on load | Results hydrates | two chips, rows filtered, URL not rewritten |
| `RAC-AC-6` | sort by Area of Work | header click | AoWs alphabetical, then `INTERMEDIATE`, `EOI_2030`, `UNTAGGED`; `aria-sort` set |
| `RAC-AC-7` | live SP01 (and SP12), default phase | read Overview breakdown totals, open Results with `?section=<key>&origin=W1/W2` per key | counts equal for every key on the owner population; any contributor-only delta reported per key with the result ids; search `AOW02` finds its rows |
| `RAC-AC-8` | CSV export | click | header includes `Area of Work`; cells carry the rendered label |

Cross-cutting project ACs that apply without restating: `AC-3` (authorization), `AC-5` (phase scoping), `AC-9`.

### Defect classes and the gate that catches each

| Defect class | Gate | Blind spot / substitute |
|---|---|---|
| Bucket rule drift between Overview and Results (wrong key, wrong tie-break, other initiative's links) | server unit test on the shared row→bucket mapper with the R-1 fixture (`RAC-AC-1`) **and** the live reconciliation `RAC-AC-7` (both surfaces read the same CTE, so a divergence can only come from parameters) | SQL text itself is not unit-testable here — the live count equality is the gate for it |
| Client join errors (wrong id type, rows without bucket, wrong phase's buckets) | Jest on `ProgrammeResultsService` mapping + a "bucket for another version is ignored" test | none |
| Column / filter / chip / param wiring | Jest DOM tests in `programme-results.component.spec.ts` (`RAC-AC-2,3,5,6,8`) | none |
| Deep-link propagation | Jest on `dashboard-lab.onOverviewLink` with `overviewScope` set/unset, and `program-overview` breakdown emit (`RAC-AC-4`) | none |
| Fixture-shaped blindness (real payload shapes, real bucket keys) | live SP01 / SP12 read in the Orca browser (`RAC-AC-7`) | manual, at T-5 |
| Visual polish (column width, chip overflow) | none automated | **accepted risk** — column follows the table's existing track vocabulary; glance at the live check |

## 10. Dependencies & Assumptions

- **Upstream:** `results-framework-reporting.service.getScopeBuckets` (query to reuse), `ReportingTocContextService.resolveByVersionId`, `clarisa-global-units` (unit names for R-7), `GET results/get/all/roles/filter` rows carry `id`, `submitter_id`, `version_id` (they do — mapper reads them today).
- **Assumption A-1:** the Results tab always has exactly one selected phase (the phase chip is retained by Clear); buckets are fetched for that phase's `versionId` and rows of other versions are not displayed. If a row's `version_id` differs from the bucket set's version, it renders `—` rather than a wrong bucket.
- **Assumption A-2:** the Overview's `?scope=` value **is** the bucket key (`OVERVIEW_SCOPE_FIXED_LABEL` keys `INTERMEDIATE`, `EOI_2030`, `UNTAGGED`, AoW codes otherwise) — verified in `dashboard-lab.component.ts:171`.
- **Assumption A-3:** the Overview population (`r.source IN W1/W2`) and the Results tab population (all sources) differ for W3/bilateral rows; those rows still resolve a bucket via their ToC links. Reconciliation `RAC-R-5` is asserted with the Results tab's *Funding source = W1/W2* filter applied when the program has bilateral rows — stated in the T-5 procedure.
- **Assumption A-4:** hot files (`dashboard-lab.component.ts`, `programme-results.component.ts`) are edited by one session at a time (`KZ-MRF-3`).
- **Assumption A-5 (inline judgment JI-1):** the Overview's program total joins `results_by_inititiative` **without** an `initiative_role_id` filter (`results-framework-reporting.service.ts:1080-1095`), while the Results list is owner-only (`result.repository.ts:379-381`, `initiative_role_id = 1`). Contributor-only results therefore may appear in an Overview bucket but never on the Results tab. `RAC-R-5` compares the owner population; the `results-scope` endpoint returns buckets for **every** program-linked result (any role) so the join never misses an owned row, and T-5 reports the contributor-only delta per key as a finding for a follow-up spec (Overview population), not as a failure of this one.

## 11. Open Questions

- none blocking. Proposal OQ-1..3 → `RAC-R-1`; the approach change (A → C corrected) is recorded in Document Control.

## 12. Out-of-Band Notes

- Supersedes archived `changes/overview-aow-cross-filter` `OSF-AC-8`'s "must NOT add a scope parameter to the Results deep-link" clause and closes the deferred half of `OSF-R-7`. Supersedes `programme-results/CLAUDE.md`'s "Coming soon" rows for the Section filter (P2-3398) — the guide is updated in T-5. Archived specs are not edited; `/akili-archive` records the supersession.

## Required cross-references

- `docs/prd.md` — US-P1, G1, AC-3, AC-5, AC-9.
- `docs/ux-ui/design.md` — §4 Result Framework Reporting, §6 Listing screens, §10 Accessibility.
- `docs/trd/trd.md` — §2 `result-framework-reporting` → `api/results-framework-reporting/*`.
- `docs/specs/archive/2026-09-0*-changes--overview-aow-cross-filter/` (OSF-DD-2/2b/2d/3, OSF-DD-12), `docs/specs/archive/*sp-overview-echarts*` (`results-tab-filter-deeplink` RFD-DD-3 query-param contract), `pages/programme-results/CLAUDE.md`.
