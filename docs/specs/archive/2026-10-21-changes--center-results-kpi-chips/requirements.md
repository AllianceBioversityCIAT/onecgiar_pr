# Requirements — Center results parity + KPI category chips (`CRK`)

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/center-results-kpi-chips` |
| Module | `bilateral` (center Results tab) + `result-framework-reporting` (SP/Accelerator Reporting tab) |
| Type | Change (contains one Bug — `CRK-R-5`) |
| Depth | Standard |
| Approval Mode | gated |
| Status | approved (2026-10-20) |
| Proposal | [`proposal.md`](./proposal.md) — OQ-1, OQ-2 resolved; OQ-3 defaulted (see §10) |
| Date | 2026-10-20 |

## 1. Executive Summary

Two independent surfaces, one spec:

- **Part A — Center → Results tab:** replicated results collapse into one row like the Result Center, with a **"Previously reported"** badge; the Filter popover gains an **Indicator category** filter.
- **Part B — SP/Accelerator → Reporting tab (`tocView=aows`):** Other output / Other outcome KPIs are recognised (they count 0 today — bug); zero-count category chips disappear; chips follow the **Type** filter.

## 2. Glossary

| Term | Meaning |
|---|---|
| Category / indicator category | The result type a KPI or result belongs to: Knowledge product, Innovation development, Capacity sharing for development, Other output, Innovation use, Policy change, Other outcome. |
| Category chip | The quick-filter pill row above the AoW cards (`Total # of KPIs`, `Knowledge Product`, …). |
| Type filter | Filter popover control: High level output · Outcome · Intermediate outcome · 2030 outcome. |
| Replicated result | A result version copied into a later phase; carries `is_replicated = 1` and shares `result_code` with the earlier version. |
| Result group | All loaded versions of one `result_code` rendered as a single table row. |
| Other-output KPI | A ToC indicator with `type_value = 'custom'` whose trimmed, case-insensitive `type_name` starts with `other output`. |
| Other-outcome KPI | Same, `type_name` starts with `other outcome`. |

## 3. System Context & Scope

### In scope

- Center Results tab (`/bilateral/<center>/…` Results): row grouping, badge, category filter + its active-filter chip.
- `toc-results` reporting query: category resolution for Other output / Other outcome KPIs (AoW, Intermediate, 2030 — one shared query).
- Reporting tab category chip row: counts, visibility, Type-awareness.

### Out of scope

- `RESULT_TYPE_TO_INDICATOR_PATTERN` / result-creation ToC indicator filtering.
- Result Center (`results-list`) itself; center Overview / other tabs (they share the filter predicate but not the grouping).
- Excel export shape of the center tab (stays one line per version).
- KPIs whose `type_name` is a free label (`other`, `Other Outpuit`, `Other quantitative measure …`) — remain uncategorised (data quality, §10 `CRK-OQ-2`).

### Data evidence (OQ-2, user query 2026-10-20, distinct `type_value/type_name/category`)

| Resolves to | `type_name` variants (all `type_value = 'custom'`) | Rows |
|---|---|---|
| Other output | `Other outputs`, ` Other Output`, `Other Output`, ` Other outputs`, ` Other Output-Number of CGIAR programs…` | 551 + 27 + 7 + 5 + 1 |
| Other outcome | `Other Outcomes` (OUTCOME + EOI), ` Other Outcome` | 51 + 20 + 2 |
| Stays uncategorised | `other` (no category), ` Other Outpuit`, `Other quantitative measure of …` | 37, 1, ~5 |

## 4. Personas

| Persona | What changes |
|---|---|
| Center submitter / PMU (center view) | One row per result across phases; can filter by category. |
| SP / Accelerator lead | Correct Other output/outcome counts; chip row only shows categories that exist for the current Type. |

## 5. User Stories

- **CRK-US-1** — As a center user, I want a replicated result to appear once, so that I do not count it twice.
- **CRK-US-2** — As a center user, I want to filter results by indicator category, so that I can review one category at a time.
- **CRK-US-3** — As an SP lead, I want the Other output / Other outcome chips to reflect my KPIs, so that I can filter them.
- **CRK-US-4** — As an SP lead, I want the chips to follow the Type I pick, so that I only see categories that apply.

## 6. Functional Requirements

### Part A — Center Results tab

#### CRK-R-1 — Group versions of the same result

The Results table SHALL render all **filtered** rows sharing a `result_code` as one row, each cell stacking one line per version, newest phase first.

**Scenario: replicated result across two phases**
- GIVEN phases 2025 and 2026 are selected AND result 9878 exists in both (2026 copy has `is_replicated = 1`)
- WHEN the Results tab renders
- THEN one row for 9878 is shown with two stacked versions
- AND "Showing N of M results" counts result groups, not versions
- BUT it must NOT merge rows with different `result_code`s
- AND IT MUST group **after** filters run (phase 2026 only → 9878 shows a single version)

**Scenario: open a specific version**
- GIVEN a grouped row with two versions
- WHEN the user clicks the 2025 version's line
- THEN the 2025 version opens (same target as today's row click for that `result_code` + `version_id`)

**Scenario: non-replicated result**
- GIVEN a result with one version
- THEN the row looks exactly as today (single line, no badge)

#### CRK-R-2 — "Previously reported" badge

A version with `is_replicated = 1` (tinyint, string or boolean) SHALL show the badge **"Previously reported"** before its title, same copy and tooltip ("Previously reported in an earlier phase") as the Result Center.
- BUT it must NOT appear on versions with `is_replicated` 0/null/false.

#### CRK-R-3 — Indicator category filter

The Filter popover SHALL offer an **Indicator category** multi-select listing the result types present in the currently loaded results (by `result_type_id`, labelled with `result_type`), sorted by label.

**Scenario: filter by category**
- GIVEN loaded results include Innovation use and Knowledge product
- WHEN the user selects "Innovation use"
- THEN only Innovation use results remain AND a removable active-filter chip "Category: Innovation use" appears AND the Filter badge count includes it
- AND IT MUST round-trip through the existing `type` URL parameter (reload keeps it)
- AND "Clear all" clears it

**Scenario: category in URL not in loaded rows**
- GIVEN the URL carries a type id absent from loaded rows
- THEN the filter still applies (empty result → existing filtered-empty state) and the option is still shown selected

#### CRK-R-4 — Sorting still works

Sorting by any column SHALL sort result groups by the newest version's value.

### Part B — Reporting tab

#### CRK-R-5 — Recognise Other output / Other outcome KPIs (bug)

The reporting KPI rows SHALL carry `result_type_id` 8 / `result_type_name` "Other output" for Other-output KPIs, and 4 / "Other outcome" for Other-outcome KPIs (Glossary definitions).

**Scenario: SP11 CapSha pilots (reproduction)**
- GIVEN SP11, AoW01 HLO 1.1.2 "CapSha pilots" whose indicator is `custom` / "Other Outputs"
- WHEN the Reporting tab loads
- THEN the `Other Output` chip count is ≥ 1 AND clicking it shows that KPI
- AND the AoW `TYPES:` row lists "Other output"

**Scenario: SP12 Digital Transformation (PRTest baseline, 2026-10-20)**
- GIVEN SP12 with no filters, where PRTest today shows `Other Output 0` / `Other Outcome 0` while the rows carry 17 "Other Outputs" and 5 "Other Outcomes" pills (verified in browser)
- WHEN the fix is deployed
- THEN the chips read `Other Output 17` and `Other Outcome 5`
- AND `Total # of KPIs` (249) is unchanged — only categorisation changes, not the row set
- BUT it must NOT re-label a KPI that already matches a specific type pattern (Knowledge product, Innovation development, …)
- AND IT MUST NOT categorise `custom` KPIs whose name does not start with `other output` / `other outcome` (e.g. `other`, `Other quantitative measure …`)

#### CRK-R-6 — Hide empty category chips

A category chip with count 0 SHALL be hidden, except when it is the active selection. `Total # of KPIs` SHALL always show.

#### CRK-R-7 — Chips follow Type / Target / Section, not themselves

Chip counts SHALL be computed from KPIs left by the Type, Target and Section filters, **ignoring** the category selection.

**Scenario: Type = High level output**
- GIVEN an SP with output and outcome KPIs
- WHEN the user selects Type = High level output
- THEN only output categories with KPIs are visible (from Knowledge product, Innovation development, Capacity sharing, Other output)
- AND for Type = Outcome / Intermediate outcome / 2030 outcome only outcome categories with KPIs are visible (from Innovation use, Policy change, Other outcome)

**Scenario: selecting a chip keeps the others**
- GIVEN chips Knowledge Product (3) and Capacity Sharing (5) visible
- WHEN the user clicks Knowledge Product
- THEN Capacity Sharing (5) is still visible with its count
- BUT the AoW cards below show only Knowledge product KPIs (existing filtering unchanged)

**Scenario: Type removes the active category**
- GIVEN chip Other Outcome active
- WHEN Type = High level output is picked (no outcome KPIs remain)
- THEN the Other Outcome chip stays visible (active) with count 0, so the user can clear it

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | `toc-results` payload change is additive (a previously null field gets a value). No bilateral contract change. |
| Performance | No extra request. Grouping is O(n) over loaded rows (≤ a few thousand). |
| Accessibility | Badge and stacked version lines keyboard-reachable; category multiselect reuses `app-pr-filter-multiselect` (existing a11y). |
| UI | Reuse existing classes / components (Spartan/`pr-*` as the screen already uses); no new design tokens. |

## 8. Defect Classes → Gates

| Defect class | Caught by |
|---|---|
| SQL CASE misses/mis-labels a variant | Server Jest on `aow-bilateral.repository.spec.ts` asserting the generated SQL branches + the read-only data query re-run on PRTest (human, T-smoke) |
| Count includes its own selection / zero chip shown | Client Jest on `reporting-quick-typology.util.spec.ts` + dashboard-lab spec |
| Grouping wrong (merges after filter, wrong count, wrong version opened) | Client Jest on a pure grouping util + `bilateral-results-list.component.spec.ts` |
| Category filter not in URL / chip | `bilateral-results-list.component.spec.ts` |
| Stacked row layout broken (alignment of stacked lines across columns) | **No automated check** (jsdom has no layout) → visual check on PRTest at the HITL pause |

## 9. Dependencies & Assumptions

- `is_replicated` and `result_type_id` are already on `BilateralCenterResult` rows.
- The AoW, Intermediate and 2030 endpoints share `fetchAndGroupTocResults` (one CASE site, two copies within it).
- PRTest verification requires the commit on `performance-refactor`.

## 10. Open Questions

- **CRK-OQ-1 (resolved)** — badge copy "Previously reported".
- **CRK-OQ-2 (accepted risk)** — ~43 `custom` rows with free/typo names stay uncategorised; data fix belongs to ToC owners.
- **CRK-OQ-3 (defaulted)** — category options = types present in loaded rows (user did not answer; proposal's recommendation applied).

## 11. Requirement ID Index

| ID | Part | Summary |
|---|---|---|
| CRK-R-1 | A | Group versions by `result_code` after filtering |
| CRK-R-2 | A | "Previously reported" badge |
| CRK-R-3 | A | Indicator category filter (+ chip, URL) |
| CRK-R-4 | A | Sort groups by newest version |
| CRK-R-5 | B | Other output / outcome categorised (bug) |
| CRK-R-6 | B | Hide zero chips (active stays) |
| CRK-R-7 | B | Chips follow Type/Target/Section, ignore own selection |

Cross-refs: `docs/prd.md` (center + SP reporting flows), `docs/ux-ui/design.md` (filter popover / chips), `docs/trd/trd.md` (results-framework-reporting module), spec `changes/kpi-progress-target-only` (KTO-R-10 Target filter stage).
