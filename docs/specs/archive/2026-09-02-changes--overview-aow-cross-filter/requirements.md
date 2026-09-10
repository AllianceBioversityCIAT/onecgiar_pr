# Overview ToC-Scope Filter — Requirements

The Science Program Overview becomes one story per **ToC scope**: pick an Area of Work, a strategic outcome, or the untagged bucket once, and every section that can answer responds — while every section that cannot **says so**. Two layout defects on the same surface are fixed first, because the new control lands in the row that already overflows.

## 1. Module / Feature

| Field | Value |
|---|---|
| **Module** | `result-framework-reporting` (client) · `results-framework-reporting` (server) |
| **Sub-feature** | `overview-aow-cross-filter` — the Overview's ToC-scope axis |
| **Spec code** | `OSF` |
| **Depth** | **Standard** |
| **Status** | `draft` |
| **Type** | Change + 2 scoped bug fixes (`OSF-R-8`, `OSF-R-9`) |
| **Approval Mode** | `gated` |
| **Proposal** | [`proposal.md`](./proposal.md) — intent approved 2026-09-01 |
| **Visual reference** | [`mockup/Main.dc.html`](./mockup/Main.dc.html) · canvas https://claude.ai/code/artifact/e0a1f5bb-67dd-4809-887c-154d4dcff610 |
| **Surface** | `/result-framework-reporting/entity-details/:entityId/overview` |

---

## 2. Context

The Overview's `All Sections · W1/W2 · W3 · Areas of Work` control is a **section filter**: it decides which cards render, never what they contain. So a reporting focal point looking at *Reporting status* sees 89 results across five statuses with no way to learn which Area of Work they belong to — while the hero directly above reports 352 planned KPIs across five AoWs.

The obstacle is in the data, not the UI. Two of the three sections carry no scope dimension in their payload, and the strategic outcomes are structurally invisible to the one join that reaches an AoW. Full evidence in [`proposal.md`](./proposal.md) §3–§3.3; the load-bearing facts:

| Fact | Source |
|---|---|
| W3/Bilateral rows already carry the AoW acronym, unused by the Overview | `result.repository.ts` → `MAX(twp.acronym) AS acronym` → `ResultToReview.acronym` |
| The W1/W2 AoW×status join exists and ships today, narrowed to `status_id IN (1,3)` | `results-framework-reporting.service.ts:885` `getResultsCountByUnitAndStatus` |
| Intermediate / 2030 outcomes are **defined by `wp_id IS NULL`**, so every AoW join is blind to them | `aow-bilateral.repository.ts:249` `countProgramLevelOutcomes` |
| The category×status matrix has no ToC join at all | `result.repository.ts:2634` `getIndicatorContributionSummaryByProgram` |

**Baseline citations.** `docs/prd.md` §4 **G1** (submission completeness — the Overview is where a focal point decides what to report next) and **G4/M4.2** (hot-endpoint latency; this spec adds no request). `docs/ux-ui/design.md` §9 **Responsive Behavior** (desktop-first, tablet MUST remain usable; *"Tables allow horizontal scroll below `md`; never hide columns silently"*), §10 Accessibility, §7 Design Tokens. `docs/trd/trd.md` — client module `result-framework-reporting`, endpoint `GET /api/results-framework-reporting/clarisa-global-units`.

**Prior specs.** `changes/overview-aow-progress-hero` (archived 2026-09-01) built the hero this spec filters and left `OSF-R-8` half-fixed — its kaizen lesson **KZ-OAH-1** governs every grid track here. `changes/sp-overview-echarts/results-tab-filter-deeplink` owns the Results-tab query-param contract, which `OSF-R-7` deliberately does **not** extend (see its amendment).

---

## 3. In Scope / Out of Scope

### In scope

- A single-select **ToC scope** control in the Overview header, grouped: Areas of work · Strategic outcomes · Outside the Theory of Change.
- A **total partition** of W1/W2 and W3 results across those buckets, including a `Not tagged` bucket.
- Scope filtering of the W3/Bilateral cards (client-only) and of W1/W2 Reporting status (additive server change).
- An explicit not-filterable declaration on cards with no scope axis.
- URL state for the selected scope (deep-link propagation to the Results tab is deferred — see `OSF-R-7`).
- Fixing horizontal page scroll (`OSF-R-8`) and dead vertical space (`OSF-R-9`) on this surface.
- A responsive contract covering everything above.

### Out of scope

- The **Reporting** tab and its existing multi-select `reportingAowFilter` — untouched.
- Giving the category×status matrix a scope axis (needs a new ToC join; it stays program-wide and says so).
- Unifying the two counting universes (planned KPIs vs reported results) into one metric.
- Multi-select scope, dark mode, phone layouts, card reordering (order is deliberately asserted — `OVW-T-3`, CVT-A-3, TCM-R-1, OAH-R-2).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter / reporting focal point | Can isolate one Area of Work and see its plan progress and its reported results together, then act from the same screen |
| PMU lead | Can see how reporting is distributed across the ToC, and how much sits **outside** it — a data-quality signal that does not exist today |
| QA reviewer | No change to review flows; the Overview becomes a more accurate entry point |
| All of the above, on a laptop | The page stops scrolling sideways and stops running on past its content |

---

## 5. User Stories

- **`OSF-US-1`** — As a reporting focal point, I want to pick one Area of Work and have the Overview follow me, so that I can judge one area's progress without cross-referencing three cards by eye.
- **`OSF-US-2`** — As a PMU lead, I want the per-scope breakdown to add up to the program total, so that I can trust a number I am about to act on.
- **`OSF-US-3`** — As any user, I want a card that cannot honour my filter to tell me, so that I never mistake a program-wide figure for a filtered one.
- **`OSF-US-4`** — As a laptop user, I want the Overview to fit its width and end where its content ends.

Refines `docs/prd.md` §6 stories for the reporting focal point; serves **G1**.

---

## 6. Functional Requirements

### Required (MUST)

- **`OSF-R-1`** The Overview MUST provide a **single-select ToC scope control**, rendered beside the existing section tabs as a **second, independent axis**: section tabs choose which cards render, scope filters the data inside them. Its default is "All areas and outcomes", which MUST reproduce today's unfiltered page exactly.
- **`OSF-R-2`** The scope control's options MUST be **grouped** into `Areas of work`, `Strategic outcomes` (Intermediate outcomes, 2030 outcomes) and `Outside the Theory of Change` (displayed as **`Not tagged to a ToC area`**, matching the approved mockup), and the resulting buckets MUST form a **total partition** of the program's results: every result belongs to exactly one bucket, and the buckets sum to the unfiltered total.
- **`OSF-R-3`** With a scope selected, **every** W3/Bilateral card MUST show only results attributed to that scope, derived from the AoW acronym already present in the payload, with **no server change**. The cards are: categories, contributing centers, status, **and the bilateral heatmap**.
  - **Amended 2026-09-01 during `OSF-T-5`.** The original enumeration named three cards and missed `overviewBilateralHeatmap`, which is rendered on the same surface from the same `bilateralRows()`. Left unfiltered it would have shown whole-program figures beside three filtered siblings, with no declaration — the exact failure `OSF-R-5` forbids. **The rule this settles: a card that *can* filter, filters; the `Program-wide` declaration is only for cards that structurally cannot** (the W1/W2 category matrix, which has no ToC join at all).
- **`OSF-R-4`** The W1/W2 Reporting status card MUST expose a **per-scope breakdown** when unfiltered and MUST filter to the selected scope when one is chosen. The server payload change enabling it MUST be **additive**.
- **`OSF-R-5`** A card with no scope dimension in its data MUST render a persistent, visible **`Program-wide`** declaration whenever a scope filter is active, stating that its figures cover the whole Science Program.
- **`OSF-R-6`** When the selected scope has **no planned KPIs**, the progress hero MUST replace its ring and split counts with an explicit no-plan statement rather than rendering `0 of 0` or an empty ring.
- **`OSF-R-7`** The selected scope MUST be reflected in a URL query parameter, so the filtered Overview is shareable and survives a reload.
  - **Amended 2026-09-01 (judgment FIND-02 → `OSF-DD-12`).** The original clause also required propagation to the Results deep-link. That half is **deferred**: the Results tab's `section` dimension exists but is inert — *"every row's `section` is `''` because no endpoint exposes the AoW for the full result set"* (`programme-results-filter.service.ts:152-154`, ticket **P2-3399**). Propagating today would land the user on an empty list, which is the lying-filter failure `OSF-R-5` exists to prevent. Deferred until P2-3399 supplies the AoW on the full result set; `OverviewLink` and `PROGRAMME_RESULTS_QUERY_PARAM_MAP` stay untouched.
- **`OSF-R-8`** *(bug fix)* The Overview MUST NOT produce **horizontal page scroll** at any supported width. Content wider than its container MUST scroll **inside its own card**, per `docs/ux-ui/design.md` §9 (*"Tables allow horizontal scroll below `md`; never hide columns silently"*). **AND IT MUST** achieve this without removing any element from the accessibility tree — a visually-hidden element may not be hidden from assistive technology to fix a layout defect (`OSF-DD-14`).
- **`OSF-R-9`** *(bug fix)* The Overview MUST NOT render **dead vertical space** below its last card beyond normal page padding.
- **`OSF-R-10`** Every surface this spec adds or changes MUST hold at the widths in `OSF-NFR-Responsive` without loss of information — text truncates with an accessible full value, it never disappears and never pushes its container wider.

### Should (SHOULD)

- **`OSF-R-11`** With a scope selected, the progress hero SHOULD narrow to that scope's row so the page reads as one subject.
- **`OSF-R-12`** The scope control SHOULD degrade progressively as width shrinks — full label → code only → icon — rather than wrapping the tab strip.
- **`OSF-R-13`** The unfiltered per-scope breakdown SHOULD state the reconciliation in words (how much sits in Areas of work versus elsewhere), because the gap is the insight.

### Could (MAY)

- **`OSF-R-14`** The `Not tagged` bucket MAY be selectable as a data-quality view. *(Owner decision 2026-09-01: keep it selectable.)*

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | No new HTTP request on the Overview. `getResultsCountByUnitAndStatus` MUST remain **one query**; widening its status filter MUST NOT add a join or a round trip. p95 on `clarisa-global-units` MUST not regress (`docs/prd.md` M4.2). |
| **Backwards compatibility** | The `clarisa-global-units` payload change MUST be **additive**: `resultsCount.editing` and `resultsCount.submitted` MUST keep their current names and semantics — `result-framework-reporting-galaxy.component.ts:176` and `entity-aow-card` read them today. |
| **Accessibility** | The scope control MUST be keyboard-operable (open, arrow, select, `Escape`), expose `aria-expanded` / `aria-selected`, and carry a visible focus ring (`--pr-focus-ring`). Truncated text MUST expose its full value. WCAG 2.1 AA per `docs/ux-ui/design.md` §10. |
| **Responsive** (`OSF-NFR-Responsive`) | Verified at **1600 · 1280 · 1100 · 900 · 768** px — `docs/ux-ui/design.md` §9 breakpoints `xl / lg / md`, plus **1100** (inside `lg`, the predicted `OSF-R-8` failure band) and **768** (tablet portrait, below `md`). Phone out of scope. |
| **Internationalization** | New user-facing copy **that differs between P22 and P25** MUST be authored as a `TermKey` and consumed via the `term` pipe. Hardcoded English is acceptable for copy that does not vary by portfolio (`onecgiar-pr-client/src/CLAUDE.md` §11).<br>**Corrected 2026-09-01 during `OSF-T-6`.** The original wording ("all new user-facing strings MUST go through `src/app/internationalization/`") was **stricter than the repo's own rule** and would have forced indirection with no behaviour change. Evidence: `terminology.config.ts` holds exactly 7 keys on one axis — entity naming, `Initiative` ↔ `Science Program/Accelerator`. The scope labels (`Intermediate outcomes`, `2030 outcomes`, `Not tagged to a ToC area`) are ToC-model vocabulary identical under both portfolios, so they stay hardcoded, single-homed in `OVERVIEW_SCOPE_FIXED_LABEL`. |
| **Styling** | Tailwind-first per `onecgiar-pr-client/CLAUDE.md` §5 hard rules 8/19/21: no hardcoded hex, no new `.pr-*` SCSS class blocks, icons from `@ng-icons/lucide` only. Every px grid track carries `minmax()` — **KZ-OAH-1**. |
| **Security** | No secrets in logs (`.cursorrules`). No new endpoint, no new authorization surface. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `OSF-AC-1` | The Overview with no scope selected | It renders | Every figure equals today's unfiltered value; the control reads "All areas and outcomes" |
| `OSF-AC-2` | The scope control is open | It renders | Options appear under `Areas of work`, `Strategic outcomes` and `Outside the Theory of Change`, in that order |
| `OSF-AC-3` | A program whose results span AoWs, outcomes and untagged | The unfiltered per-scope breakdown renders | The bucket totals **sum exactly to the unfiltered program total** |
| `OSF-AC-4` | An AoW is selected | The W3/Bilateral cards render | They show only results whose `acronym` matches that AoW, and **all four** cards (categories, centers, status, heatmap) reconcile with each other |
| `OSF-AC-5` | An AoW is selected | The W1/W2 Reporting status card renders | Its segments reflect only that AoW, and its total equals that AoW's row in the unfiltered breakdown |
| `OSF-AC-6` | Any scope is selected | The category×status card renders | It displays a `Program-wide` declaration; **BUT it must NOT** silently show program totals with no declaration |
| `OSF-AC-7` | `Not tagged` is selected (no planned KPIs) | The hero renders | It states there is no plan to measure against; **BUT it must NOT** render `0%`, `0 of 0`, or an empty progress ring |
| `OSF-AC-8` | An AoW is selected | The URL is copied and reopened in a new tab | The same scope is selected; **BUT it must NOT** add a scope parameter to the Results deep-link while P2-3399 leaves that dimension inert |
| `OSF-AC-9` | The Overview at **1600, 1280, 1100, 900, 768** px, filter on and off | The page renders | `document.documentElement.scrollWidth === clientWidth` at every width |
| `OSF-AC-10` | The Overview at the same five widths | An AoW row renders | The AoW **name remains readable** — truncated with its full value available; **BUT it must NOT** collapse to zero width or widen the row (the OAH-T-6 regression) |
| `OSF-AC-11` | The Overview scrolled to the bottom | The page renders | No empty region below the last card beyond page padding, at every width in `OSF-AC-9` |
| `OSF-AC-12` | An existing consumer of `clarisa-global-units` (`…galaxy.component.ts:176`) | The widened payload is returned | `resultsCount.editing` and `resultsCount.submitted` keep their current names and values; **AND IT MUST** not require a change in that consumer |

Cross-cutting project ACs that apply unchanged: `AC-3` Authorization, `AC-5` Phase/versioning correctness (the scope filter MUST respect the selected `versionId`), `AC-9` Security and secrets.

---

## 9. Defect Classes And Their Gates

**A gate blind to the defect class this spec most often produces is not a gate.** This spec's dominant defect class is **rendered layout**, and no command in this repo can see it.

| # | Defect class | Gate | Can it see the defect? |
|---|---|---|---|
| D1 | Partition/derivation logic wrong (filtering, bucket sums, reconciliation) | `npx jest <touched paths>` | ✅ Yes — pure functions over fixtures |
| D2 | Server query returns the wrong buckets or drops statuses | `npx jest` on the service spec + one query executed against a real DB | ✅ Unit yes; the executed query is what proves the SQL |
| D3 | Payload regression for existing `resultsCount` consumers | Jest assertion on the DTO shape | ✅ Yes |
| D4 | **Horizontal overflow / dead vertical space** (`OSF-R-8`, `OSF-R-9`) | — | ❌ **No automated gate.** jsdom performs no layout: `scrollWidth`, `clientWidth` and every box metric are `0`. A Jest test asserting them would pass on a broken page |
| D5 | **The lying filter** — a card shows program-wide figures with no declaration | Jest can assert the chip is in the DOM | ⚠️ **Presence, not effect.** The assertion proves the element exists, never that the figures behind it are the ones claimed. It must be paired with D4's browser check |
| D6 | Contrast / focus visibility of the new control | `axe` finds structural issues only | ⚠️ Partial — rendered contrast needs a real browser or a visual review |

**Substitutes for D4, D5 and D6 — mandatory, not optional:**

- A **browser verification task** (`OSF-T-8`) run in a real browser at the five widths of `OSF-NFR-Responsive`, recording measured numbers in `execution.md`. This is the gate for `OSF-AC-9`, `OSF-AC-10` and `OSF-AC-11`.
- The same task confirms `OSF-AC-6`'s **effect** — that the declared program-wide figures are in fact the program-wide ones — which D5's presence assertion cannot.
- A **T6 Multimodal visual review** of the captured screenshots for D6, per the Model Routing registry's *Cross-host dispatch*.

**~~Accepted risk~~ — DISCHARGED by measurement, 2026-09-01.** `OSF-T-1` reproduced both defects on the live authenticated Overview at 1138px and **refuted the predicted cause**. Measured: horizontal overflow **1470px**, dead space **914px**; both trace to `<table class="sr-only">` inside the shared `app-pr-viz-chart` (neutralising the seven tables drops overflow to 3px and reclaims 882px). The AoW grid tracks and `min-h-screen` were both measured innocent. The spec pivoted rather than applying the fix blind — which is exactly what this clause was written to force. Evidence: `execution.md` §2–§3; design: `OSF-DD-14`.

---

## 10. Dependencies & Assumptions

### Upstream

- `GET /api/results-framework-reporting/clarisa-global-units` — the only server surface this spec changes.
- ToC integration tables (`toc_results`, `toc_work_packages`) via `Integration_information` — read-only, unchanged.
- `programme-results-query-params.ts` — **unchanged**; `OSF-R-7`'s propagation half is deferred behind P2-3399 (`OSF-DD-12`).

### Downstream consumers of the changed payload

- `result-framework-reporting-galaxy.component.ts:176` and `entity-aow-card.component.html` read `resultsCount.{editing,submitted}` — protected by `OSF-AC-12`.

### Assumptions

- **~~`OSF-A-1`~~ — MEASURED 2026-09-01, assumption refuted.** Results do reach more than one AoW: 211 touch one, **5 touch two, 3 touch three** (8 of 219, **3.7%**). The rule is now stated explicitly rather than inherited from `MAX()` — see `OSF-DD-2d`, which attributes deterministically to the lowest acronym and records the 3.7% as an accepted limitation.
- **`OSF-A-2`** ~~The `Not tagged` bucket may be empty in some programs.~~ **Measured: it is the opposite of empty.** On `SP01` it holds **82 of 365** W1/W2 results (~22%) under the corrected LEFT-JOIN basis — and would have held 59% under the basis the design originally inherited (`OSF-DD-2b`). It ships not as a guarantee-in-case, but as a material data-quality signal.
- **`OSF-A-3`** `is_aow` is normalised to a real boolean by the backend today (`aow-bilateral.repository.ts:525`), so the two opposing client conventions for a missing `is_aow` (`dashboard-lab` vs `entity-aow.service`) do not collide. This spec MUST NOT "harmonise" either side.

---

## 11. Open Questions

**These block `tasks.md`.**

- **`OSF-OQ-1`** Should the selected scope survive navigation away and back (URL + session), or reset on program change? Repo precedent is reset-on-entity-change.
- **`OSF-OQ-2`** At 900px and below, does the scope control stay inline with the section tabs or move to its own row?
- **`OSF-OQ-3`** When the AoW row must shrink, **what gives way**? Options: the achievement figures abbreviate or wrap; the `Report` button becomes icon-only; or the row scrolls inside its card. This is a visible design decision, not a CSS detail.
- **`OSF-OQ-4`** Does the `min-h-screen` half of `OSF-R-9` get fixed at all? It lives in `dashboard-lab.component.html`, the shell shared with the Reporting tab — fixing it is a cross-tab change. The alternative is fixing only the ToC-map chart height and accepting the residual.

---

## 12. Requirement ID Index

| ID | Summary | ACs |
|---|---|---|
| `OSF-R-1` | Single-select scope control as a second axis | AC-1 |
| `OSF-R-2` | Grouped options forming a total partition | AC-2, AC-3 |
| `OSF-R-3` | W3/Bilateral filters by scope, client-only — **all four cards** | AC-4 |
| `OSF-R-4` | W1/W2 per-scope breakdown, additive payload | AC-5, AC-12 |
| `OSF-R-5` | Program-wide declaration on non-filterable cards | AC-6 |
| `OSF-R-6` | No-plan treatment in the hero | AC-7 |
| `OSF-R-7` | URL state (propagation deferred, P2-3399) | AC-8 |
| `OSF-R-8` | No horizontal page scroll *(bug)* | AC-9, AC-10 |
| `OSF-R-9` | No dead vertical space *(bug)* | AC-11 |
| `OSF-R-10` | Responsive at five widths, no information loss | AC-9, AC-10, AC-11 |
| `OSF-R-11` | Hero narrows to the selected scope | AC-5, AC-7 |
| `OSF-R-12` | Progressive degradation of the control | AC-9 |
| `OSF-R-13` | Reconciliation stated in words | AC-3 |
| `OSF-R-14` | `Not tagged` selectable | AC-7 |

---

## Required cross-references

- `docs/prd.md` — §4 **G1**, **G4/M4.2**; §6 reporting-focal-point stories; §7 `AC-3`, `AC-5`, `AC-9`.
- `docs/ux-ui/design.md` — §7 Design Tokens, §9 Responsive Behavior (breakpoints + horizontal-scroll rule), §10 Accessibility.
- `docs/trd/trd.md` — client module `result-framework-reporting`; endpoint `clarisa-global-units`.
- `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules 8 / 19 / 21.
- `docs/specs/archive/2026-09-01-changes--overview-aow-progress-hero/` and its kaizen entry (**KZ-OAH-1**).
