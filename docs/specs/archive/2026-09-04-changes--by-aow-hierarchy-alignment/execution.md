# Execution Log — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in "By AOW" View

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/by-aow-hierarchy-alignment` |
| Feature Name | 3-Level Visual Hierarchy & ToC Taxonomy Alignment in By-AOW |
| Module Code | `BHA` |
| Status | completed |
| Linked Spec | [`requirements.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/requirements.md) · [`design.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/design.md) · [`tasks.md`](file:///Users/jcadavid/orca/workspaces/onecgiar_pr/qa-development-2026/docs/specs/changes/by-aow-hierarchy-alignment/tasks.md) |
| Sizing Budget | 3 tasks · ~200-250 LOC diff · 1 review round |
| Budget Actuals | 3/3 tasks · ~230 LOC diff · 3 review rounds |
| Kaizen Lessons Applied | `KZ-changes--reporting-aow-hierarchy-1`, `KZ-changes--reporting-aow-jira-hierarchy-1`, `KZ-changes--reporting-aow-jira-hierarchy-2` |

---

## Task Executions

### `BHA-T-1` — Level 2 HLO Sub-Card Enclosure & Taxonomy Code Parsing

- **Status:** `[x]` Complete
- **Date:** 2026-09-04
- **Attempt:** 1 of 3
- **Implementer Subagent:** `c7541af8-0851-445f-a553-1c33ab64617b`
- **Reviewer Subagent:** `c20a522c-4ce4-4dff-9178-826a403e73c8`
- **Verdict:** `STATUS: PASS`

#### Implementer Changes
- **`dashboard-lab.component.ts`:**
  - Enhanced `cleanHloCode` with `prefixSpaceNumMatch` and `numMatch` (`/^(\d+(?:\.\d+)+)/`) to parse numeric prefixes like `1.1:`, `1.1`, `2.4.1`, and spaced prefixes like `IO 2.1`, `HLO 1.1`.
  - Implemented `hloTaxonomy(hlo, section)` helper returning `{ type: 'HLO' | 'OC' | 'I-OC' | 'IO' | 'EOI', code: string }`, strictly adhering to Kaizen lesson `KZ-changes--reporting-aow-hierarchy-1` by preserving institutional ToC categories (`HLO`, `OC`, `I-OC`, `IO`) over generic agile terms.
  - Imported `NgIcon` and provided `lucideChevronDown` icon in component metadata.
- **`dashboard-lab.component.html`:**
  - Replaced un-enclosed `.pr-by-aow-row` button with autonomous Level 2 container: `<div class="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">`.
  - Styled Sub-Card Header Button with surface gradient (`bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200/80`).
  - Added rotating chevron in white button box (`h-6 w-6 rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs`) with 180° rotation when expanded.
  - Added semantic taxonomy badge (`.pr-hlo-code`) with `bg-indigo-100/80 text-indigo-800 font-mono font-bold text-[11px]`.
  - Consolidated micro-KPI cluster on the right: bold target sum with uppercase `TARGET` label, emerald achieved sum with uppercase `ACHIEVED` label, indicator count pill (`{{ hlo.count }} indicators`), and QA & Prel % labels with tooltips.

#### Verification Evidence
- Component test suite: 58 passed, 58 total (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`)
- Full module regression: 977 passed, 977 total (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/`)
- Client linter: clean (`npx ng lint --quiet`)

#### Reviewer Audit (4R Lenses)
- **Readability:** High. Angular `@let` local variable bindings reduce template clutter and make bindings declarative.
- **Reliability:** High. `cleanHloCode` safely handles `null`, `undefined`, and nested objects. 100% test pass rate across 977 tests.
- **Resilience:** Defensive regex fallbacks guarantee that unexpected codes gracefully display fallback strings.
- **Risk:** Low. Purely client-side UI and stateless parsing heuristics with zero impact on underlying data models.
- **Spec Conformance:** Full compliance with `BHA-R-1` (Scenarios 1.1, 1.2), `BHA-R-2` (Scenario 2.1), `BHA-R-3` (Scenario 3.1), `BHA-NFR-1`, `BHA-DD-1`, and `BHA-DD-2`.

---

### `BHA-T-2` — Level 3 Indented Indicator Scaffolding & Contextual Sub-Header

- **Status:** `[x]` Complete
- **Date:** 2026-09-04
- **Attempt:** 2 of 3 (Attempt 1: Fail due to BHA-NFR-2 a11y on indicator row; Attempt 2: Pass after adding ARIA, keyboard handlers, and visible focus rings)
- **Implementer Subagent:** `fce8f33f-2bea-4b48-be8a-5d82b68337a5` (Initial), `622a6a79-1cbc-4bc1-a610-7bfe37085904` (Remediation)
- **Reviewer Subagent:** `6042a12b-a9a3-4489-a025-21996d869b15` (Round 1), `ff2c9dc5-01dd-4d4f-96e2-669d3984820e` (Round 2)
- **Verdict:** `STATUS: PASS`

#### Implementer Changes
- **`dashboard-lab.component.scss`:**
  - Added Level 3 track definitions `$pr-by-aow-indicator-tracks: 24px minmax(260px, 1fr) 72px 72px 110px 110px 120px;`, `$pr-by-aow-indicator-gap`, and `$pr-by-aow-indicator-pad`.
  - Added `.pr-by-aow-subhead` (28px height, subtle divider line) and `.pr-by-aow-indicator-row` with hover transitions and bottom dividers.
  - Added `.pr-status-mark` styling for the 18px concentric target mark.
  - Retained existing legacy `$pr-by-aow-tracks` and `.pr-by-aow-head` for strict backwards test regex compatibility.
- **`dashboard-lab.component.html`:**
  - Wrapped Level 3 indicator list inside `.pl-4.sm\:pl-6.border-l-4.border-indigo-500\/40.bg-indigo-50\/10` indentation container.
  - Added compact contextual sub-header `.pr-by-aow-subhead.pr-hlo-head` with uppercase tracking labels (`INDICATOR TITLE & TAXONOMY`, `TARGET`, `ACHIEVED`, `STATUS`, `PROGRESS`, `ACTION`).
  - Standardized `.pr-by-aow-indicator-row` with concentric bullseye SVG mark, center acronym chips, JIRA status left-border stripes (`border-l-[3px]`), progress percentage bars, and isolated action buttons (`$event.stopPropagation()` on Report and Copy link per `KZ-changes--reporting-aow-jira-hierarchy-2`).
  - Added accessibility attributes (`role="button"`, `tabindex="0"`, `[attr.aria-expanded]="open"`, `(keydown.enter)`, `(keydown.space)="$event.preventDefault(); toggleKpi(ind.kpi_id)"`, `focus-visible:ring-2`) per `BHA-NFR-2`.
- **`dashboard-lab.component.ts`:**
  - Added `openKpis = signal<ReadonlySet<unknown>>(new Set())`, `isKpiOpen`, and `toggleKpi`.

#### Verification Evidence
- Component test suite: 59 passed, 59 total (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`)
- Full module regression: 978 passed, 978 total (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/`)
- Client linter: clean (`npx ng lint --quiet`)

#### Reviewer Audit (4R Lenses)
- **Readability:** High. Clean template layout with `@let` declarations, intuitive Tailwind utilities matching design tokens.
- **Reliability:** High. Event isolation verified via `$event.stopPropagation()` on interactive child buttons, preventing unintended row collapse toggling.
- **Resilience:** Defensive keyboard handling with `$event.preventDefault()` prevents unwanted page scroll during spacebar activation. Preserves deeplink anchors `kpiDomId`.
- **Risk:** Low. Complete compliance with WCAG 2.1 AA keyboard navigation standards and zero impact on external data models.
- **Spec Conformance:** Full compliance with `BHA-R-4`, `BHA-R-5`, `BHA-R-6`, `BHA-R-7`, `BHA-NFR-1`, `BHA-NFR-2`, `BHA-NFR-3`, `BHA-DD-3`, and `BHA-DD-4`.

---

### `BHA-T-3` — Unit Test Suite Updates, Event Contract Verification & Documentation

- **Status:** `[x]` Complete
- **Date:** 2026-09-04
- **Attempt:** 1 of 3
- **Implementer Subagent:** `3dbd5153-e315-4b67-a5af-94f273521d5d`
- **Reviewer Subagent:** `57b432b9-7489-4fe5-ace3-39f45c67b9fc`
- **Verdict:** `STATUS: PASS`

#### Implementer Changes
- **`dashboard-lab.component.spec.ts`:**
  - Added dedicated test suite `BHA-T-2 / BHA-T-3 — By-AOW Level 3 Indented Indicator Scaffolding & Event Isolation`.
  - Added test for indented scaffolding container asserting `.pl-4.sm\:pl-6.border-l-4.border-indigo-500\/40.bg-indigo-50\/10` (`BHA-R-4`, Scenario 4.1).
  - Added test for contextual sub-header `.pr-by-aow-subhead.pr-hlo-head` with uppercase labels: `INDICATOR TITLE & TAXONOMY`, `TARGET`, `ACHIEVED`, `STATUS`, `PROGRESS`, `ACTION` (`BHA-R-5`, Scenario 5.1).
  - Added test for concentric bullseye mark SVG (`.pr-status-mark`) asserting dimensions and 3 target circles (`BHA-R-6`, Scenario 6.1).
  - Added test for action button event isolation asserting `$event.stopPropagation()` on Report and Copy link via template AST inspection and live DOM event simulation preventing row collapse toggles (`BHA-R-7`, Scenario 7.1, `KZ-changes--reporting-aow-jira-hierarchy-2`).
- **`dashboard-lab/CLAUDE.md`:**
  - Documented the 3-Level Card-in-Card visual hierarchy in By-AOW under `## Arquitectura de Jerarquía Visual en "By AOW" (3-Level Card-in-Card Hierarchy — BHA)`.

#### Verification Evidence
- Component test suite: 63 passed, 63 total (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`)
- Full module regression: 982 passed, 982 total (`npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/`)
- Client linter: clean (`npx ng lint --quiet`)

#### Reviewer Audit (4R Lenses)
- **Readability:** Excellent. `CLAUDE.md` provides an unambiguous breakdown of all 3 hierarchy levels. Tests are clearly structured and traceable to spec requirements.
- **Reliability:** Excellent. Pure functions (`cleanHloCode`, `hloTaxonomy`) and DOM structural assertions thoroughly verified.
- **Resilience:** Excellent. Live DOM event simulation tests guarantee that child action button clicks do not bubble and trigger unintended parent collapse toggles.
- **Risk:** Low. Additions are isolated to tests and documentation, introducing zero regressions.
- **Spec Conformance:** Full compliance with all `BHA-R-*` and `BHA-NFR-*` requirements at scenario granularity.



