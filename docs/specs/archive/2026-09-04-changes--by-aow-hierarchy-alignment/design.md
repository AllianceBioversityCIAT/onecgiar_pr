# Design Specification — 3-Level Visual Hierarchy & ToC Taxonomy Alignment in "By AOW" View

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/by-aow-hierarchy-alignment` |
| Feature Code | `BHA` (By-AOW Hierarchy Alignment) |
| Module | `result-framework-reporting` / `dashboard-lab` |
| Status | draft |
| Approval Mode | gated |
| Author | Antigravity AI / Juan Carlos Cadavid |
| Date | 2026-09-04 |
| Budget (Tripwire) | 3 tasks · ~250 LOC diff · 1 review round |
| Constitutional Baseline | `docs/prd.md`, `docs/ux-ui/design.md` §7 Design tokens · §8 Components · §9 Responsive · §10 Accessibility, `docs/trd/trd.md` |
| Kaizen Lessons Applied | `KZ-changes--reporting-aow-hierarchy-1` (formal ToC nomenclature `HLO`, `OC`, `I-OC`), `KZ-changes--reporting-aow-jira-hierarchy-1` (template JIT compilation verification), `KZ-changes--reporting-aow-jira-hierarchy-2` (protect event contracts and button isolation) |

---

## 1. Summary

This design defines the technical implementation for aligning the **"By AOW"** focused view (`dashboard-lab.component.html` lines 1682–1940) with the **3-Level Card-in-Card** architectural pattern and institutional ToC taxonomy established in `reporting-aow-table`.

The solution consists of:
1. Enhancing `cleanHloCode` and adding a semantic `hloTaxonomy` helper in `dashboard-lab.component.ts` to extract numeric prefixes (`1.1:`) and generate formal badges (`[HLO 1.1]`, `[OC 2.1]`, `[I-OC 3.5]`) complying strictly with Kaizen `KZ-changes--reporting-aow-hierarchy-1`.
2. Refactoring the By-AOW HLO group template in `dashboard-lab.component.html` into autonomous Level 2 Sub-Cards (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`) with gradient headers and consolidated micro-KPI clusters.
3. Wrapping expanded child indicators in Level 3 Indented Scaffolding (`pl-4 sm:pl-6 border-l-4 border-indigo-500/40 bg-indigo-50/10`), adding a compact contextual column sub-header (`h-7 text-[10px] uppercase text-slate-400 font-bold`), and rendering track-aligned indicator rows with concentric bullseye marks 🎯, JIRA status stripes, and isolated action buttons.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Server modules:** None (pure client presentation and code token parsing).
- **Client component:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/`
  - `dashboard-lab.component.ts` (helper methods `cleanHloCode`, `hloTaxonomy`)
  - `dashboard-lab.component.html` (By-AOW section template lines 1682–1940)
  - `dashboard-lab.component.scss` (By-AOW track styles, tree guideline, indented scaffolding)
  - `dashboard-lab.component.spec.ts` (unit tests and regression suite)
  - `CLAUDE.md` (component documentation update)

### 2.2 Component Hierarchy & Visual Scaffolding Diagram

```
Level 1: Area of Work Shell (Banner & Metrics)
  │  [AOW01] Accelerating AI-Enabled Farm Advisory
  │  [KPIs: 53] [Reported: 0/53] [Progress: 0%]
  │
  ├──► Level 2: Meso HLO Sub-Card (.rounded-xl.shadow-2xs.border-slate-200/90)
  │      ├── Header Bar (.bg-gradient-to-r.from-slate-50.via-indigo-50/30.to-slate-50)
  │      │     ├── Left: [Rotating Chevron] + [HLO 1.1] Badge + Bold HLO Title
  │      │     └── Right: [59 TARGET] [0 ACHIEVED] [32 indicators pill] [QA 0% · PREL 0%]
  │      │
  │      └──► Level 3: Indented Indicator Scaffolding (.pl-4.sm:pl-6.border-l-4.border-indigo-500/40)
  │             ├── Contextual Sub-Header (INDICATOR TITLE & TAXONOMY | TARGET | ACHIEVED | STATUS | PROGRESS | ACTION)
  │             │
  │             └── Indicator Row Track (.bg-white.hover:bg-slate-50/80.border-l-[3px])
  │                   ├── Concentric Bullseye 🎯 + Title + Center Chip
  │                   ├── Target & Achieved Figures (tabular-nums)
  │                   ├── Status Pill Badge + Progress Percentage Bar
  │                   └── Actions: [Copy Link] [Report CTA] (with stopPropagation)
```

---

## 3. Data Model & Helper Signatures

No database entity or DTO changes. The client helpers in `dashboard-lab.component.ts` operate on existing local structures:

### 3.1 Helper Signatures in `dashboard-lab.component.ts`

```typescript
// 1. Enhanced cleanHloCode supporting numeric prefixes
cleanHloCode(hloOrRaw: { code?: string; key?: string; name?: string } | string | null | undefined): string;

// 2. Semantic ToC Taxonomy Resolver (KZ-changes--reporting-aow-hierarchy-1)
hloTaxonomy(
  hlo: { code?: string; key?: string; name?: string; title?: string; split?: { code?: string | null; name?: string } },
  section?: { label?: string; key?: string }
): { type: string; code: string };
```

### 3.2 Taxonomy Classification Matrix

| Section / Band Context | Code Pattern | Resolved Type | Clean Code | Rendered Badge |
|---|---|---|---|---|
| `High Level Outputs` | `1.1: Agronomic...` | `HLO` | `1.1` | `[HLO 1.1]` |
| `High Level Outputs` | `HLO4.AOW1...` | `HLO` | `4` | `[HLO 4]` |
| `Outcomes` | `2.1 Contextualized...` | `OC` | `2.1` | `[OC 2.1]` |
| `Outcomes` | `OC 3.1. Some title` | `OC` | `3.1` | `[OC 3.1]` |
| `Intermediate Outcomes` | `I-OC 3.5. Women...` | `I-OC` | `3.5` | `[I-OC 3.5]` |
| `Intermediate Outcomes` | `IO 2.1 Intermediate` | `IO` | `2.1` | `[IO 2.1]` |

---

## 4. Frontend / UX Component Architecture & Design Tokens

### 4.1 Design Tokens Applied (`docs/ux-ui/design.md` §7)

| UI Element | CSS / Tailwind Classes | Purpose / Standard |
|---|---|---|
| **Sub-Card Wrapper** | `rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden` | Autonomous meso container boundary. |
| **Header Surface** | `bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200/80` | High-contrast parent surface elevation. |
| **Chevron Container** | `flex h-6 w-6 items-center justify-center rounded-md bg-white border border-slate-200/80 text-indigo-700 shadow-2xs` | Interactive affordance with 180° rotation. |
| **Taxonomy Badge** | `pr-hlo-code inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200/70 font-mono text-[11px] font-bold` | ToC institutional identifier badge. |
| **Tree Guideline** | `border-l-4 border-indigo-500/40 bg-indigo-50/10` | Visual vertical trunk anchoring child indicators. |
| **Indentation** | `pl-4 sm:pl-6` (16px mobile, 24px desktop) | Visual parent-child hierarchy offset. |
| **Column Sub-Header** | `h-7 text-[10px] uppercase tracking-wider text-slate-400 font-bold` | Column labeling aligned to row tracks. |
| **Bullseye Target** | `18px lucideCircleDot` or concentric SVG in violet | Indicator mark matching `reporting-aow-table`. |

---

## 5. Design Decisions (ADRs)

### BHA-DD-1: Level 2 HLO Sub-Card Enclosure in By-AOW
- **Context:** In By-AOW, HLO headers currently render as flat buttons without a surrounding container. When expanded, indicators look disconnected from the HLO title.
- **Decision:** Enclose each HLO group and its expanded indicators in an autonomous `rounded-xl border border-slate-200/90 bg-white shadow-2xs` card with a distinct surface-gradient header.
- **Alternatives considered:**
  - *Keep flat borderless rows:* Rejected because it perpetuates the flat grid syndrome and disorientation on scroll.
  - *Heavy card elevations:* Rejected because nested shadows cause visual clutter.
- **Consequences:** Provides unmistakable visual hierarchy and unifies By-AOW with `reporting-aow-table`.

### BHA-DD-2: Institutional ToC Taxonomy Badges (`HLO`, `OC`, `I-OC`) & Numeric Regex
- **Context:** Titles starting with numeric prefixes (e.g. `1.1:`) were stripped by `cleanHloCode`, causing By-AOW to show no badge at all. Furthermore, Kaizen `KZ-changes--reporting-aow-hierarchy-1` mandates institutional acronyms (`HLO`, `OC`) over generic agile terms (`OUTPUT`).
- **Decision:** Enhance `cleanHloCode` with `/^(\d+(?:\.\d+)+)/` regex and implement `hloTaxonomy` to emit `{ type: 'HLO' | 'OC' | 'I-OC' | 'IO', code: string }`.
- **Alternatives considered:**
  - *Display unparsed raw string:* Rejected because raw strings like `1.1: Agronomic...` look unstyled and inconsistent with `[HLO 1.1]`.
  - *Hardcode generic "OUTPUT":* Rejected because OneCGIAR reporting specifically tracks High-Level Outputs (`HLO`) and Outcomes (`OC`).
- **Consequences:** Restores missing badges across all By-AOW HLO cards with 100% semantic fidelity.

### BHA-DD-3: Level 3 Indented Indicator Scaffolding & Contextual Sub-Header
- **Context:** In By-AOW, expanding an HLO rendered floating full-width cards or an old HTML table with no visual parent-child relationship.
- **Decision:** Nest indicators inside an indented container with 24px padding (`pl-4 sm:pl-6`), an indigo vertical guide line (`border-l-4 border-indigo-500/40 bg-indigo-50/10`), a compact contextual column sub-header (`h-7 text-[10px] text-slate-400 font-bold`), and track-aligned indicator rows.
- **Alternatives considered:**
  - *Keep floating unindented cards:* Rejected because the user explicitly compared this against `reporting-aow-table` and requested the indented hierarchy.
  - *Embed full `reporting-aow-table` child component:* Rejected due to high coupling and different input model contracts.
- **Consequences:** Eliminates visual disjointedness between views and establishes clear Gestalt common region.

### BHA-DD-4: Event Isolation and Host Feature Preservation
- **Context:** By-AOW has unique host features: *Copy link* (`copyKpiLink`), *Report* drawer trigger (`openReportAside`), *Deeplink anchor & highlight* (`kpiDomId(ind)` / `highlightedKpiId`), and *Next pending* indicator flow.
- **Decision:** Preserve all existing IDs and reactive bindings verbatim. Isolate action button clicks using `$event.stopPropagation()` to prevent unwanted row toggles (`KZ-changes--reporting-aow-jira-hierarchy-2`).
- **Alternatives considered:**
  - *Let events bubble:* Rejected because clicking "Report" would toggle the indicator row collapse state.
- **Consequences:** 100% backward compatibility with zero regressions in By-AOW workflows.

---

## 6. Testing & Verification Strategy

1. **Unit Tests (`dashboard-lab.component.spec.ts`):**
   - Assert `cleanHloCode('1.1: Agronomic data')` returns `'1.1'`.
   - Assert `cleanHloCode('1.1')` returns `'1.1'`.
   - Assert `cleanHloCode('2.4.1 Specific Sub-Output')` returns `'2.4.1'`.
   - Assert `hloTaxonomy` returns `{ type: 'HLO', code: '1.1' }` for HLO section, and `{ type: 'OC', code: '2.1' }` for Outcome section.
   - Assert By-AOW renders `.rounded-xl.border-slate-200\/90.shadow-2xs` for HLO cards.
   - Assert By-AOW renders `.pr-hlo-code` badge containing `HLO 1.1` (or `OC 2.1`).
   - Assert By-AOW renders indented container `.pl-4.sm\:pl-6.border-l-4.border-indigo-500\/40` when HLO is expanded.
   - Assert clicking "Report" or "Copy link" stops propagation and fires the respective method.
   - Assert `[id]="kpiDomId(ind)"` and `highlightedKpiId` classes are present.
2. **Regression Verification:**
   - Execute `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/` to ensure all 950+ dashboard tests pass.
   - Execute `npx ng lint --quiet` to guarantee clean TypeScript / template linting.

---

## 7. Reversion Challenge (Step 2.3)

- **Question:** Does this design revert or disable any behavior already delivered?
- **Answer:** No. It replaces an outdated inline template block in By-AOW with the updated 3-level Card-in-Card design. All existing reactive signals (`plannedBrowseView`, `isPlannedHloExpanded`, `highlightedKpiId`, `plannedLayout`) and event bindings remain functional.

---

## 8. Budget & Sizing (Step 2.4)

| Metric | Estimated Budget | Rationale |
|---|---|---|
| **Tasks** | 3 tasks | `BHA-T-1` (parser & sub-card), `BHA-T-2` (indented scaffolding & tracks), `BHA-T-3` (tests & docs). |
| **LOC Diff** | ~200–250 lines | ~40 lines in TS, ~100 lines in HTML, ~30 lines in SCSS, ~80 lines in spec. |
| **Review Rounds** | 1 round | Follows the exact proven pattern from `changes/reporting-aow-hierarchy`. |
| **Depth** | Standard | Appropriate for scoped frontend component enhancement. |

