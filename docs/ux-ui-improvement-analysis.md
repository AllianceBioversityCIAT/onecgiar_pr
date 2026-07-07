# PRMS UX/UI Improvement Analysis — Conceptual Clarity, Navigation & Metrics

> **Status:** Analysis document (2026-07). Deep multi-model audit of the PRMS client (+ supporting server surfaces), focused on the **Results Framework landing experience**, the **result creation/detail flow**, and — above all — the platform's biggest gap: **conceptual information at hand**. Companion doc: `docs/platform-concepts.md` (the domain guide this analysis repeatedly points to).
>
> **Method:** independent audits by Claude (Fable 5, lead + judge), a DeepSeek V4 multi-agent council (UX, UI, dev, independent "lone wolf", lateral shadow), GLM-5.2, and Antigravity/Gemini — each reading the actual codebase — then cross-verified against source. Every finding below cites file evidence and was confirmed in code by the lead reviewer.

---

## Executive summary

PRMS is functionally rich but **conceptually opaque**. The recurring pattern across every audited surface:

1. **The data to orient users already exists — the UI throws it away.** Progress percentages, status breakdowns, ToC node descriptions, result-type descriptions and catalog definitions are computed server-side or stored in entities, and never rendered.
2. **Every domain decision point is unexplained.** Result type, result level, ToC node, impact-area score, AoW — all presented as bare labels in dropdowns/radios with zero at-hand definitions. The terminology system (`TerminologyService`) covers exactly one concept (Initiative ↔ Science Program naming).
3. **Help exists only as bulky inline banners.** `app-alert-status` walls of HTML hardcoded in TypeScript push forms below the fold, while the places that need one-line contextual help (options, sections, metrics) have none.
4. **No sense of progress, expectation, or time.** The landing page shows no metrics, no phase deadline, no "what's expected of me"; the result editor shows per-section checks but no aggregate progress.

The highest-leverage program of work is **not visual redesign** — it is a **Concept & Progress layer**: a domain glossary service + per-option descriptions + progress surfacing, reusing data the backend already provides.

---

## 0. North-star principles for the fixes

- **P-A: No concept control without a definition.** Any dropdown/radio whose options are domain concepts must offer a one-line description + example, in place (popover/secondary line), without leaving the form.
- **P-B: Show the plan, then the gap.** Every level of the hierarchy (SP → AoW → indicator → result) should show *planned vs achieved*, not raw counts alone.
- **P-C: Progressive disclosure over banner walls.** Collapse long guidance into expandable/hover surfaces; keep forms above the fold.
- **P-D: Reuse server truth.** Prefer surfacing existing entity fields (`description`, `statement`, `progress`, `statuses[]`) over authoring new copy.
- **P-E: Orientation is a feature.** First-time and returning users must always see: where am I, what phase is it, what do I owe, what happens next.

---

## 1. Results Framework landing page (`/result-framework-reporting/home`) — the default page

### 1.1 SP cards fetch progress and render none of it — **the flagship quick win**
- **Evidence:** `result-framework-reporting-card-item.component.html:1-25` renders only icon + `initiativeCode` + name. Yet `GET api/results-framework-reporting/get/science-programs/progress` already returns per-program `totalResults`, `progress` (%) and `versions[].statuses[]` (Editing/QA/Submitted counts) — see `science-program-progress.dto.ts` and `results.service.ts:1705` (`container.dto.progress = calculatedProgress`). The card SCSS even ships unused `.framework-reporting-card-item_progress` classes.
- **Improvement:** add to each card: a slim progress bar (% of targets achieved), status count chips (`12 Editing · 5 Submitted`), and a "pending review" badge. Zero backend work.
- **Effort:** **S**

### 1.2 No phase awareness, no "what do I owe" on landing
- **Evidence:** `result-framework-reporting-home.component.html` = welcome copy + SP cards + recent activity. No reporting-phase deadline, no personal backlog, no platform stats. `DataControlService.reportingCurrentPhase` and `GET pending-review?programId=` already exist.
- **Improvement:** top stat strip: **Results this cycle · Pending review · Days left in phase · My drafts in Editing**. Add a "My reporting backlog" panel (drafts >7 days idle, QA send-backs, indicators with no result for my centers).
- **Effort:** **M**

### 1.3 No conceptual orientation for first-time users
- **Evidence:** hero copy is generic ("Your innovative digital reporting solution"). No explanation of the SP → AoW → ToC → Result mental model anywhere in-app; no onboarding, no glossary (see §5).
- **Improvement:** dismissible "How reporting works" strip (4-step visual: *pick your program → find the indicator in your ToC → report the result → pass QA*) linking to the concepts guide; persistent `?` help entry.
- **Effort:** **M**

### 1.4 Silent failure: skeletons forever
- **Evidence:** home service subscriptions have no `error` callback; on API failure `isLoadingSPLists()` stays `true` and skeletons never resolve (confirmed in service code; flagged independently by two auditors).
- **Improvement:** error branch → loading=false + retry banner. Apply the same pattern to entity-details and AoW loads.
- **Effort:** **S**

---

## 2. Entity drill-down (`entity-details`, `entity-aow`)

### 2.1 AoW sidebar shows opaque codes only
- **Evidence:** `entity-aow.component.html:49` renders `{{ item.label }}` where `EntityAowService.setSideBarItems()` sets `label: aow.code` — the human name (`aow.name`) exists in the payload and is never shown.
- **Improvement:** `code — name` split layout (code as badge, name truncated with tooltip), plus a micro-status dot (has results / empty).
- **Effort:** **S**

### 2.2 Insights panel: counts without meaning
- **Evidence:** `entity-details.component.html:27-63` — 2 stat cards (Editing, Submitted; Quality-assessed is missing) + two bar charts of absolute counts. No target comparison, no % of ToC indicators reported, no drill-down on click, no trend.
- **Improvement:** (a) add Quality-assessed card; (b) make chart bars clickable → filtered results list; (c) add a "% of planned indicators with ≥1 result" ring and an 8-week reporting sparkline; (d) show phase countdown here too.
- **Effort:** **M**

### 2.3 Target-vs-actual is buried
- **Evidence:** `aow-hlo-table.component.html:53-55,84-91` shows `target_value_sum` and `actual_achieved_value_sum` as raw numbers; the ratio exists (`progress_percentage`) but renders only as a status chip; the Center×Year breakdown hides behind a 2-click drawer.
- **Improvement:** replace the two raw columns with a mini progress bar + `x / y` label; keep the drawer for breakdown.
- **Effort:** **S**

### 2.4 Dead and placeholder UI in production routes
- **Evidence:** "Report Emerging results" header ships a `p-splitbutton` with `[hidden]="true"` (`entity-details.component.html:103-111`); `/aow/all` and `/aow/unplanned` render literal `entity-aow-all works!` placeholders — and `all` is the default child redirect of the AoW route.
- **Improvement:** wire the split-button as the single visible "Report" entry (or delete it); implement or remove the placeholder routes.
- **Effort:** **S**

### 2.5 Cross-cutting bugs found during audit (fix alongside)
- `showBilateralResultsReview` checks only `'SGP-02'` while sibling code also handles `'SGP02'` → inconsistent banner on deep links (`entity-details.component.ts:184`). Centralize `isSgp02()`.
- Center switch clears the bilateral review table before refetch → empty-table flash (`results-review-table` effect). Keep stale data until new data lands.
- Bilateral filters (category/status/lead center) don't round-trip in the URL — reviewers can't share a filtered queue.
- `checkReportingAccess` **fails open**: HTTP error → `reportingEnabled.set(true)` (`entity-aow.service.ts:85`). Default closed + status banner.

---

## 3. Result creation flow (`result-creator`, `report-result-form`)

### 3.1 The most important decision — result type — is chosen blind
- **Evidence:** "Indicator category" is `app-pr-radio-button` with `optionLabel="name"` only (`result-creator.component.html:59-67`, `report-result-form.component.html:28-37`). **`ResultType.description` exists in the server entity and the client interface and is never displayed.** Picking wrong reshapes the whole downstream form (`rdResultTypesPages`).
- **Improvement:** render each option with its one-line definition + a tiny example ("Policy change — a government adopts a strategy informed by CGIAR evidence"), from the existing `description` column (fallback to a client dictionary). Add a "help me choose" popover comparing the types.
- **Effort:** **M** (S if descriptions ship as secondary lines only)

### 3.2 Output vs Outcome: one of CGIAR's core distinctions, no explanation
- **Evidence:** `result-level-buttons.component.html:11-18` shows the two level cards with server `description` only if present; Impact/Action-Area levels are masked via `slice(2,4).reverse()` with an alert. No sphere-of-control/influence framing, no examples, no client-side fallback if backend copy is thin.
- **Improvement:** guaranteed client-side definitions + 2 examples per level (see `docs/platform-concepts.md` §3), shown on the cards themselves.
- **Effort:** **S**

### 3.3 Creation is a form, not a guided decision
- **Evidence:** single page: entity select → level cards → type radio → (KP handle) → title + duplicate check → save (`result-creator.component.ts:198-235`). Guidance = one greeting alert. The duplicate check (Elastic `depthSearch`) is good but arrives *after* the user typed a title.
- **Improvement:** treat it as a 3-step decision wizard (What happened? → level+type suggestion, then confirm; reuse `steper-navigation`). Long-term: a "describe it in a sentence" entry that suggests type via the existing AI surface (`result-ai-assistant` is already scaffolded, currently "under construction").
- **Effort:** **L** (wizard) — **M** (reorder + inline guidance only)

---

## 4. Result detail editor (`result-detail`)

### 4.1 Section navigation gives no aggregate progress and no next/back
- **Evidence:** `panel-menu.component.html:15-28` — numbered links + per-section green/gray `check_circle`. No "X of N complete", no required-vs-optional marking, no section descriptions. Disabled Submit only says "…available once all sections are completed" (`:39-44`) without listing *which* sections block. Sections themselves end at a Save button with no "Save & next" (`rd-general-information.component.html:295-304`) — users must mouse back to the left rail each time.
- **Improvement:** (a) progress header "4/7 sections complete" in the panel; (b) tooltip on each section with a one-line description (extend `PrRoute` with `prDescription`); (c) disabled-Submit tooltip lists missing sections (data already in `green_checks`); (d) sticky footer "← Back · Save & continue →" that saves then routes to the next section.
- **Effort:** **M**

### 4.2 Help is banner walls hardcoded in TypeScript
- **Evidence:** the five impact-area blocks in `rd-general-information.component.html:80-278` each open with a full-width `app-alert-status` whose HTML lives in component methods (`genderInformation()` etc., `rd-general-information.component.ts:276-500+`). Confirmed **copy-paste bug**: the `climateInformation()` non-P25 fallback returns the *Nutrition* heading and nutrition targets (`rd-general-information.component.ts:461`). Elsewhere ToC helper HTML is injected into data payloads (`item.full_name = '<strong>'+…`, `multiple-wps-content.component.ts:58-81`).
- **Improvement:** (a) fix the climate copy bug now; (b) move guidance HTML into a structured help registry (JSON/TS config keyed by section+field, portfolio-aware) consumed by a collapsible "About this section" component; (c) keep payloads clean — decorate in templates/pipes, not in data.
- **Effort:** **S** (bug) / **M** (registry)

### 4.3 Impact-area scoring: the 0/1/2 decision has no per-option meaning
- **Evidence:** score radios show `full_name` labels only; the definitions of Not targeted / Significant / Principal live in the giant banner above, and the fact that choosing "Significant" reveals sub-area checkboxes is undiscoverable (`rd-general-information.component.html:80-278`).
- **Improvement:** per-option tooltips with the tier definition; a hint line "selecting *Significant* will ask you which sub-areas apply".
- **Effort:** **S**

### 4.4 ToC alignment: picking nodes from label-only dropdowns
- **Evidence:** `multiple-wps-content.component.html` stacks 4 `pr-select`s (Output / Outcome level / Outcome / EOI) whose options show only a bolded `extraInformation` string. `toc_result.description` and `toc_level.description` exist server-side and are never sent/shown. Indicator metadata *is* shown read-only afterwards (`target-indicator`) — the one good pattern, applied too late (after selection, not during).
- **Improvement:** per-option hover card in the ToC selects (statement + level description + linked indicators count), i.e. bring the `target-indicator` richness *into* the option list; add a top-of-section collapsible "Where does my result sit in the ToC?" visual (Impact → Outcome → Output ladder with the current level highlighted).
- **Effort:** **M** (needs the ToC endpoints to include `description` — small server change)

### 4.5 No unsaved-changes protection with a manual per-section save model
- **Evidence:** save is manual per section, and there is **no `canDeactivate`/`beforeunload` guard anywhere in the results module** — navigating via panel-menu discards silent edits.
- **Improvement:** dirty-state tracking per section + confirm-on-navigate (guard), or move to autosave-drafts. This also fulfills PRD US-S5.
- **Effort:** **M**

---

## 5. The Concept Layer — information at hand (core recommendation)

The platform assumes every user already knows CGIAR's ontology. The fix is one coherent system, not scattered tooltips:

### 5.1 Domain glossary service (foundation)
- **Evidence of the gap:** `terminology.config.ts` holds 7 keys, all `term.entity.*`; a grep across `result-detail` finds ~27 `pTooltip` uses, almost all affordance labels ("Edit", "Delete") — only ~7 are conceptual. No glossary/help-drawer component exists in the codebase.
- **Improvement:** extend the existing `TerminologyService` (it is already portfolio-aware — the right foundation) into a **glossary registry**: `term.resultType.*`, `term.resultLevel.*`, `term.tocLevel.*`, `term.impactArea.*`, `term.scoreTier.*`, `term.aow`, `term.phase`, `term.qa`, each with `{ label, definition, example, learnMoreUrl }`. Content source: `docs/platform-concepts.md` + server `description` columns.
- **Effort:** **M** (service + content) — enables everything below.

### 5.2 `<app-concept-help>` + option descriptions in the field system
- **Improvement:** one reusable component (info icon → popover with definition/example) consumable by `pr-field-header`, and **first-class option descriptions in `pr-select`/`pr-multi-select`/`pr-radio-button`** (`optionDescription` input rendering a secondary line; the virtual-scroll row already supports a 50px "extraInformation" mode — `pr-select.component.html:55-79`). This turns P-A into a mechanical pattern instead of per-ticket work.
- **Effort:** **M**

### 5.3 Context-aware help drawer
- **Improvement:** global `?` in the shell header opening a right drawer: glossary search + "on this page" entries keyed by route (Results Framework, ToC section, IPSR step…), linking to the handbook/SharePoint materials that today hide inside alert HTML and one buried video link (`rd-evidences.component.ts:53`).
- **Effort:** **L**

### 5.4 Field-header description discipline
- **Evidence:** `app-pr-field-header` already supports `description` + `tooltip` (P2-3061) — it is simply unused on most concept-bearing fields.
- **Improvement:** audit pass: every concept field gets a description or tooltip from the glossary. Rule for `src/CLAUDE.md`: *no concept control without a definition*.
- **Effort:** **S–M** (mechanical once 5.1 exists)

---

## 6. Metrics users would love (per persona)

| Persona | Metric | Source (already exists) |
|---|---|---|
| Submitter | My drafts / QA send-backs / days to deadline | statuses + `reportingCurrentPhase` |
| Submitter | "Indicators of my centers with no result yet" | `toc-results` + contribution tables |
| SP lead | % planned indicators with ≥1 result, per AoW (ring) | `toc-results` per AoW |
| SP lead | Target vs achieved per indicator (bar in table) | `progress_percentage` on HLO rows |
| SP lead | Results trend (8 weeks), submissions before deadline | `submission_date`, review history |
| Center focal point | Bilateral pending review by center | `GET pending-review`, sidebar counts |
| PMU | First-pass QA rate, median days create→submit (PRD M1.2/M2.1) | review history (aggregation endpoint needed) |

Placement: landing stat strip (§1.2) → entity Insights (§2.2) → AoW table (§2.3). Only the PMU row needs a new aggregation endpoint; everything else is presentation.

---

## 7. Component-level fixes surfaced by the audit

| Fix | Evidence | Effort |
|---|---|---|
| `pr-select` virtual scroll uses `[itemSize]="7"` while option rows are 30–50px → jumpy/clipped lists | `pr-select.component.html:55`, `custom-fields.scss:167` | **S** |
| `pr-select` overlay positioned with hardcoded `bottom:-255px` + `:focus-within` → clipping near viewport edges, abrupt closes | `custom-fields.scss:117-140` | **M** (adopt PrimeNG overlay mechanics) |
| `pr-select` a11y: no `role="combobox"`, `aria-expanded`, `aria-haspopup`; validation markers use `display:none` (invisible to screen readers) | `pr-select.component.html:24`, `feedback-validation.directive.ts:25` | **M** |
| Hardcoded hex colors across framework/review SCSS (≈25 occurrences: `#7a30a8`, `#273ec5`, `#fef3c7`, `#2C3E50`, …) violating the `--pr-color-*` token rule | `panel-menu.component.scss`, `entity-details.component.scss`, `bilateral-results-review.component.scss`, `results-review-*.scss` | **S–M** |
| Inline `style="…"` + hardcoded copy in the emerging-result dialog | `entity-details.component.html:162-172` | **S** |
| Word limits are advisory only (red counter, still saves); decide and align client/server enforcement | `pr-word-counter`, `WordCounterService` | **S** |

---

## 8. Prioritized roadmap

**Wave 1 — quick wins (all S, ship in one cycle):**
1. SP cards: progress bar + status chips (§1.1)
2. AoW sidebar: names next to codes (§2.1)
3. Target-vs-actual progress bars in HLO table (§2.3)
4. Climate guidance copy-paste bug (§4.2) + SGP-02 helper (§2.5)
5. Panel-menu "X/N complete" + missing-sections tooltip on Submit (§4.1)
6. `pr-select` itemSize fix (§7)
7. Home error/retry states (§1.4) + fail-closed reporting access (§2.5)

**Wave 2 — the Concept Layer (M):**
8. Glossary registry on `TerminologyService` (§5.1) — content from `platform-concepts.md`
9. Option descriptions in `pr-select`/`pr-radio-button` + `<app-concept-help>` (§5.2)
10. Result type + level definitions at selection time (§3.1, §3.2)
11. Impact-area per-option tooltips + collapsible section guidance registry (§4.2, §4.3)
12. Landing stat strip + phase countdown (§1.2)

**Wave 3 — structural (M–L):**
13. Save & continue navigation + unsaved-changes guard (§4.1, §4.5)
14. ToC option hover cards + "where am I in the ToC" visual (§4.4) — needs small server additions
15. Entity Insights upgrade: clickable charts, planned-vs-achieved ring, trend (§2.2)
16. Help drawer (§5.3); creation wizard (§3.3); "My reporting backlog" (§1.2)

---

## Appendix — audit attribution & verification

- **Claude Fable 5 (lead):** landing/card/panel-menu/creator form first-hand reads; verified every finding cited above against source; concepts guide.
- **GLM-5.2:** deepest single sweep (F1–F4 series above largely converged with lead); unique: terminology-system gap quantification, SGP-02 deep-link bug, URL-filter round-trip.
- **DeepSeek council (UX/UI/dev pros + lateral shadow):** unique: climate copy-paste bug (verified line 461), hex-token violations inventory, silent skeleton failure, fail-open reporting access, `pr-select` ARIA gaps.
- **Antigravity (Gemini):** unique: virtual-scroll itemSize mismatch, overlay positioning fragility, HTML-in-payload pattern, server-side confirmation that SP progress is computed and discarded.
- Findings that could not be verified in code were dropped.
