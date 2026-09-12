# Requirements — Platform onboarding tours (sidebar · Results Center · Where to report)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/platform-onboarding-tour/` |
| Module code | `POT` |
| Type | Change · Depth: **Standard** |
| Approval Mode | gated (from `proposal.md`) |
| Status | approved |
| Owner | Juan Carlos Cadavid |
| Date | 2026-09-11 |
| Baseline | `docs/prd.md` (US-S1, G1 — orientation for new submitters) · `docs/ux-ui/design.md` §7 tokens, §8 components, §9 responsive, §10 a11y · `docs/trd/trd.md` (client-only; no API) |
| Depends on | Shipped `changes/results-center-reporting-guide`; archived `sp-guided-tour-driverjs` |
| Intent source | `proposal.md` + user emphasis: *buenas descripciones, fácil de entender, responsive, que se vea dónde está haciendo el tour* |
| Visual reference | User screenshots 2026-09-11 (SP Tour button, RC hero, expanded sidebar Platform section) |

## Executive Summary

New and returning users lack orientation on **where PRMS lives** (sidebar), **how to browse all results** (Results Center), and **which reporting path to choose** (Where to report modal). This spec adds three optional **Tour** buttons — same chrome as the Science Program shell — each launching a short Driver.js walkthrough with **plain-language copy**, **responsive popover placement**, and a **visible spotlight** so users always see which UI element is being explained.

## Glossary

| Term | Meaning |
|---|---|
| Tour | A linear Driver.js walkthrough launched by a **Tour** button; distinct from SP `startSpTour()` and the result-detail sidebar hint. |
| Spotlight | The cut-out stage around the highlighted element plus the dimmed overlay — the visual “you are here”. |
| Location badge | A small label at the top of each popover naming the surface and step context (e.g. “Sidebar · Results Center”). |
| Anchor | A stable `data-guide="…"` hook on a host element; steps target anchors, not CSS classes. |
| Guide-only / hub / picker | Modes of the platform Where to report modal (`PlatformReportingGuideService`). |

## 1. Module / Feature

- **Module:** `result-framework-reporting` (shared sidebar) + `results` (Results Center + platform guide modal)
- **Sub-feature:** Platform onboarding tours
- **Status:** draft

## 2. Context

The SP shell already ships an 8-step **Tour** (`ReportingGuideService.startSpTour()`). That tour only covers tabs **inside one Science Program**. Users who land on **Results Center** or expand the **sidebar** still cannot map navigation → catalog → reporting entry points.

This change is client-only, reuses Driver.js and the global `.driver-popover.pr-guide` skin, and does **not** alter SP tour behavior or the result-detail sidebar hint (separate storage keys).

## 3. In Scope / Out of Scope

### In scope

- Three tours: **sidebar**, **results-center**, **where-to-report**.
- **Tour** launchers: sidebar EXTRAS, RC hero (outline, beside Where to report), WTR modal header.
- Plain-English step copy (table below); location badge on every step.
- Spotlight visibility: scroll-into-view, stage padding, overlay contrast, auto-expand collapsed sidebar for sidebar tour.
- Responsive popover: readable on ≥375px width; no popover clipped off-screen when anchor is visible.
- Per-tour `localStorage` completion flags; replay anytime.
- Scoped Jest on step builders, storage keys, launcher wiring.

### Out of scope

- Auto-start on first visit; chained mega-tour across routes (v1.1).
- Merging/replacing SP tour or result-detail sidebar hint.
- Tours for IPSR, QA, bilateral, admin modules.
- Backend analytics (optional dev-only console flag OK).
- i18n (English only v1).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| New submitter | Can orient on sidebar, RC catalog, and reporting paths without external docs. |
| Center user (W3) | WTR tour explains W3 lane in plain language. |
| PMU / read-only | RC tour covers search, filters, export. |
| QA reviewer | No workflow change; tours are optional. |

## 5. User Stories

- **`POT-US-1`** — As a new submitter, I want a sidebar tour, so that I know where Science Programs and Platform links live. (Refines US-S1)
- **`POT-US-2`** — As a submitter, I want a Results Center tour, so that I understand search, export, and Where to report. (Refines US-S1)
- **`POT-US-3`** — As a submitter, I want a tour inside Where to report, so that I pick the right funding path (W1/W2, W3, emerging). (Refines US-S1)
- **`POT-US-4`** — As any user, I want tour copy in simple English and a clear highlight on the element being explained, so that I am never guessing what the popover refers to. (Refines G1)

## 6. Functional Requirements

### Required (MUST)

- **`POT-R-1` Sidebar tour.** The sidebar MUST expose a **Tour** control (EXTRAS section). When activated, a walkthrough MUST explain, in order: PRMS header → My Science Programs (when present) → Other Science Programs (when present) → **Platform** block → **Results Center** row (explicit highlight) → My CGIAR Centers (when present) → collapse/expand control. Steps whose anchor is absent MUST be omitted (same skip pattern as SP tour).

  #### Scenario: Expanded sidebar with programs and Platform links

  - GIVEN the sidebar is expanded and at least one Science Program is listed
  - WHEN the user clicks **Tour** in EXTRAS
  - THEN Driver.js opens with progress “Step 1 of N”
  - AND the first spotlight wraps the PRMS header block
  - AND a later step spotlights the Results Center link inside Platform
  - AND IT MUST set `pr.tour.platform.sidebar.completed` on **Got it**
  - BUT it must NOT navigate away from the current route

  #### Scenario: Collapsed sidebar

  - GIVEN the sidebar is collapsed
  - WHEN the user starts the sidebar tour
  - THEN the sidebar MUST auto-expand before step 1 renders
  - AND the collapse control step MUST remain in the sequence
  - BUT it must NOT leave the sidebar collapsed while program-list steps run

- **`POT-R-2` Results Center tour.** The RC hero MUST expose an outline **Tour** button matching SP tour chrome (icon + “Tour” label from `sm` breakpoint). The tour MUST explain: hero purpose → **Where to report** CTA → filter toolbar → export action → results table → **Update result** (when enabled; step skipped when disabled).

  #### Scenario: RC tour on desktop

  - GIVEN the user is on `/results/results-center` (or equivalent RC route)
  - WHEN they click **Tour** in the hero
  - THEN each step spotlights its anchor before the popover appears
  - AND the Where to report step describes opening the reporting guide
  - AND IT MUST set `pr.tour.platform.results-center.completed` on completion

  #### Scenario: Update result disabled

  - GIVEN the user lacks portfolio roles for Update result
  - WHEN the RC tour runs
  - THEN the Update result step MUST be omitted
  - AND the progress total MUST reflect the shortened step count

- **`POT-R-3` Where to report tour.** The platform guide modal header MUST expose **Tour**. The tour MUST explain: modal purpose (three paths) → program picker (only when `pick-program` mode) → W1/W2 lane → W3 lane → emerging card (guide-only; hidden when AVISA rules suppress emerging). In **hub** mode, lane steps MUST target the embedded hub lanes.

  #### Scenario: Guide-only modal

  - GIVEN the modal is open in `guide-only` mode
  - WHEN the user clicks **Tour** in the modal header
  - THEN steps highlight the three path cards/lanes and emerging card when visible
  - AND IT MUST set `pr.tour.platform.where-to-report.completed` on completion
  - BUT it must NOT close the modal until the user dismisses the tour or clicks **Got it**

  #### Scenario: Picker mode

  - GIVEN the modal is in `pick-program` mode
  - WHEN the WTR tour runs
  - THEN a step MUST spotlight the program list scroll region
  - AND IT MUST use copy that tells the user to pick a program before continuing reporting

- **`POT-R-4` Independent replay and storage.** Each tour MUST use its own storage key (`pr.tour.platform.sidebar.completed`, `pr.tour.platform.results-center.completed`, `pr.tour.platform.where-to-report.completed`). Completing one MUST NOT mark another complete. Users MUST be able to replay any tour from its **Tour** button regardless of storage state.

- **`POT-R-5` Plain-language copy.** Every step title and description MUST use short, plain English (max ~2 sentences in the description). Jargon (W1/W2, W3, ToC) MUST be introduced with a plain parenthetical on first use in that tour. Copy MUST come from the approved table in §6.1 (implementers MUST NOT invent ad hoc strings in components).

- **`POT-R-6` Visible spotlight (“you are here”).** For all platform tours, before each step’s popover shows:

  - The highlighted element MUST scroll into the viewport center (or nearest visible position).
  - The stage cut-out MUST use at least **8px** padding around the element.
  - The overlay MUST remain visibly darker than the highlighted element (opacity ≥ **0.65**).
  - Each popover MUST show a **location badge** naming surface + context (e.g. “Sidebar · Platform links”).
  - Progress text MUST read `Step {{current}} of {{total}}`.

  #### Scenario: User can identify the target

  - GIVEN any platform tour step is active
  - WHEN the user looks at the screen
  - THEN exactly one element is visibly framed by the spotlight
  - AND the location badge names the same surface as the framed element
  - BUT the popover must NOT cover the framed element on viewports ≥900px when side placement is available

- **`POT-R-7` Responsive popover placement.** Popovers MUST remain fully readable at **375px** viewport width: max width `min(340px, calc(100vw - 32px))`, no horizontal clipping. Placement MUST prefer **bottom** on narrow viewports (`<640px`) and **side** placement on wider viewports when the anchor is in the sidebar or table edge. If Driver.js cannot place without overlap, the step MUST flip side automatically (library default) rather than clipping off-screen.

  #### Scenario: Mobile RC tour

  - GIVEN viewport width 375px
  - WHEN the RC tour highlights the filter toolbar
  - THEN the popover is entirely within the viewport
  - AND the user can reach **Next**, **Back**, and **Got it** without scrolling the page behind the overlay

### Should (SHOULD)

- **`POT-R-20`** Tour buttons SHOULD use the same outline styling as `data-guide="sp-tour-trigger"` (height, border, hover tokens).
- **`POT-R-21`** WTR tour SHOULD start only after modal content is rendered (not during skeleton/loading), or show a single “Loading…” step that advances when ready.

### Non-goals (explicit)

- **`POT-R-30`** SP tour (`startSpTour`) behavior MUST remain unchanged.
- **`POT-R-31`** Result-detail sidebar hint MUST keep its separate storage key.

## 6.1 Approved step copy (English v1)

Implementers MUST use these strings (minor punctuation fixes OK; meaning MUST NOT change).

### Sidebar tour

| Step | Anchor | Title | Description |
|---|---|---|---|
| S1 | `platform-tour-sidebar-header` | Your navigation | This sidebar is home base. Every Science Program and Platform tool is listed here. |
| S2 | `platform-tour-sidebar-programs` | Science Programs | Programs you work on appear here. Click one to open its reporting workspace. |
| S3 | `platform-tour-sidebar-other-programs` | Other programs | Programs you can view — but do not own — show in this second list. *(omit if empty)* |
| S4 | `platform-tour-sidebar-platform` | Platform tools | Cross-program tools live here — not inside a single Science Program. |
| S5 | `platform-tour-sidebar-results-center` | Results Center | Open this to search and export **all** results across every program in one table. |
| S6 | `platform-tour-sidebar-centers` | Your centers | Your CGIAR Center pages appear here when you have a center role. *(omit if empty)* |
| S7 | `sidebar-toggle` | Collapse the sidebar | Click here to collapse the sidebar and save space. Expand it again anytime. |

Location badge prefix: **Sidebar**

### Results Center tour

| Step | Anchor | Title | Description |
|---|---|---|---|
| R1 | `platform-tour-rc-hero` | Results Center | This is the cross-program catalog. Every reported result for the active phase appears in the table below. |
| R2 | `platform-tour-rc-where-to-report` | Where to report | Not sure where to enter a result? Start here — we will show Science Program (W1/W2), Center (W3), and emerging paths. |
| R3 | `platform-tour-rc-filters` | Filters | Narrow the list by program, status, center, funding source, and more. Filters combine together. |
| R4 | `platform-tour-rc-export` | Export | Download the filtered list as a spreadsheet for your team or portfolio review. |
| R5 | `platform-tour-rc-table` | Results table | Each row is one result. Click a row to open its detail page. |
| R6 | `platform-tour-rc-update` | Update a result | Already reporting? Jump straight to an existing result to edit it. *(omit when disabled)* |

Location badge prefix: **Results Center**

### Where to report tour

| Step | Anchor | Title | Description |
|---|---|---|---|
| W1 | `platform-tour-wtr-intro` | Three reporting paths | Pick the path that matches **who funds** your work. You can switch paths anytime before you submit. |
| W2 | `platform-tour-wtr-picker` | Choose a program | Select your Science Program first — all reporting happens inside a program, even from Results Center. *(pick-program only)* |
| W3 | `platform-tour-wtr-w12` | Science Program funding (W1/W2) | Report against planned indicators from the program Theory of Change (ToC). |
| W4 | `platform-tour-wtr-w3` | Center funding (W3) | Report from your center workspace when the program uses W3 (center-executed) rules. |
| W5 | `platform-tour-wtr-emerging` | Emerging results | For findings that were **not** planned in the ToC — use this when nothing in the plan fits. *(omit when hidden)* |

Location badge prefix: **Where to report**

## 7. Non-Functional Requirements

| ID | Dimension | Target |
|---|---|---|
| **`POT-NFR-1`** | Accessibility | Escape dismisses tour; focus trapped in popover while active; buttons keyboard reachable (match SP tour). |
| **`POT-NFR-2`** | Performance | Tour start ≤300ms after click on a warm route; no extra API calls. |
| **`POT-NFR-3`** | Regression | Existing `startSpTour` and `startResultSidebarHint` tests remain green unchanged. |
| **`POT-NFR-4`** | Motion | Respect `prefers-reduced-motion`: disable Driver.js animate when set. |

## 8. Defect classes and verification gates

| Defect class | What breaks | Gate | Gap / substitute |
|---|---|---|---|
| Missing/wrong anchor | Step jumps or highlights wrong node | Jest: step builder returns expected `[data-guide="…"]` selectors per context | — |
| Copy drift / jargon | Users confused | Jest: copy module exports match §6.1 table | — |
| Spotlight invisible / off-screen target | User cannot see “where” | **No automated gate** — HITL visual check at **375px** and **1440px** during execute review (T6 if available) | Accepted risk if HITL skipped |
| Popover clipped on mobile | Controls unreachable | `results-list.viewport.spec.ts` pattern OR HITL at 375px | jsdom cannot prove pixel placement — pair with HITL |
| Storage cross-talk | One tour marks all complete | Jest: keys are distinct; completing sidebar does not set RC key | — |
| SP tour regression | Existing program tour breaks | `reporting-guide.service.spec.ts` SP tour block unchanged green | — |
| Collapsed sidebar | Program steps skipped silently | Jest: `startSidebarTour` calls expand before drive; manual HITL once | — |

## 9. Requirement ID Index

| ID | Summary |
|---|---|
| POT-R-1 | Sidebar tour |
| POT-R-2 | Results Center tour |
| POT-R-3 | Where to report tour |
| POT-R-4 | Independent storage + replay |
| POT-R-5 | Plain-language copy |
| POT-R-6 | Visible spotlight |
| POT-R-7 | Responsive popover |
| POT-R-20 | SP chrome parity (SHOULD) |
| POT-R-21 | WTR loading gate (SHOULD) |
| POT-R-30 | Do not change SP tour |
| POT-R-31 | Keep sidebar hint key separate |
| POT-NFR-1..4 | a11y, perf, regression, motion |

## 10. Open Questions

| ID | Question | Default if silent |
|---|---|---|
| OQ-1 | Auto-prompt first RC visit? | No — manual Tour only |
| OQ-2 | Sidebar Tour in EXTRAS vs header? | EXTRAS |
| OQ-3 | Hide emerging in WTR tour for AVISA? | Follow hub AVISA rules |
| OQ-4 | Chained “Getting started” tour? | Defer v1.1 |
