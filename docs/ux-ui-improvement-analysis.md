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

# PART II — Round 2: remaining modules & real-life usage journeys

> Second audit pass (same multi-model method) over the modules Round 1 did not cover: IPSR, Quality Assurance, Results Center list, the remaining result-detail sections, notifications/share flows, and the global shell. Closed with six real-life user journeys that string the findings together.

---

## 9. Quality Assurance — the biggest conceptual dead end

### 9.1 QA is an external iframe; submitters cannot see feedback in PRMS — **P0**
- **Evidence:** the entire QA module is an entity `p-select` + `<iframe>` to the external Clarisa QA tool (`quality-assurance.component.ts:44-46` builds `${qaUrl}/crp?crp_id=…&token=…`); `quality-assurance.service.ts` is an empty stub. Server-side, the `result_qaed_log` entity exists with full schema, but `result-qaed.controller.ts` / `result-qaed.service.ts` have **no routes at all**. Inside `result-detail` there is no QA comments view — the only signals are an "In QA" tag, disabled Submit/Unsubmit, and notes like "Quality Assessed results cannot be un-submited." On a QA send-back, the status silently reverts with **no reviewer comment surfaced anywhere**. (The client docs even describe a "QA queue + review drawer" that does not exist — documentation drift.)
- **Improvement (minimum viable):** expose `GET /result-qaed/:resultId` from the existing entity; render a read-only "QA feedback" panel/banner in result-detail when a result was sent back; notify the submitter. Full fix: native QA status timeline per result.
- **Effort:** **L** (MVP: backend endpoint + one panel)

### 9.2 No rework state in the status model
- **Evidence:** `result-status.enum.ts` has no rework/resubmitted status; the bilateral flow has a full review cycle (Pending Review → Approve/Reject **with justification**) while regular results have nothing comparable.
- **Improvement:** model the send-back explicitly (status or flag + timestamp + comment) so the UI can say *"Sent back by QA on {date}: {comment}"*.
- **Effort:** **M**

### 9.3 QA wrapper details (GLM-5.2 deep pass)
- **QA notification is one line, no comment, no link:** the server emits "The result X has been quality assessed by Y" and the card renders exactly that — `result_qaed_log.qaed_comments` is written but never read by any endpoint. Include the comment in the notification DTO + add an "Open QA review" deep link. (**S** front + **S** back)
- **Iframe swap has no loading state and fails silently:** on entity change the component hides the iframe, fetches a token, `setTimeout(100)`, re-shows; a token failure only `console.error`s and drops the user back to "Select an Initiative" with no error message (`quality-assurance.component.ts:70-86`). (**S**)
- **Token travels in the iframe URL** (`?token=…` via `bypassSecurityTrustResourceUrl`) — visible in DOM/network logs and potential Referer leakage; prefer postMessage/cookie handoff with the CLARISA QA team. (**M**, coordination)
- **The entity picker is decorative for non-admins** (auto-picks the first entity but stays interactive; zero-entity users get a permanent unexplained empty state). (**S**)

## 10. IPSR module

### 10.1 The 0–9 scales: good hover pattern, missing the comparison table
- **Evidence:** `pr-range-level` **does** show per-level definitions on hover/selection (name + CLARISA `definition` — `pr-range-level.component.html`), the best concept pattern in the app. But there is no side-by-side table of all 9 levels, so templates link out to **Google Drive PDFs** (`innovation-dev-info.component.html:115-120`, `step-n3-*.component.ts:29-57`) and to external ScalingReadiness.org calculators — leaving the form (and unsaved state) to compare levels.
- **Improvement:** an inline expandable "all levels" table fed by the same CLARISA lists (`readinessLevelsList`/`innovationUseList`); keep the hover cards. Kill the Drive links.
- **Effort:** **S**

### 10.2 Core / complementary / enabler / solution: central jargon, zero definitions
- **Evidence:** "Select Core Innovation…" (creator, only guidance: "Only QAed innovations will be listed"), "…form a bundle with the core innovation" (`complementary-innovation.component.html:2-3`), modal "New complementary innovation/ enabler/ solution" with no distinction explained; Step 2 "Type of enabler" is a 3-level nested checkbox tree with no descriptions (`step-two-basic-info.component.html:14-46`).
- **Improvement:** glossary popovers (Concept Layer §5) for core/complementary/enabler/solution/bundle; a one-line rule on the QAed-only constraint ("your innovation must pass QA before it can be packaged — that's why it may not appear here").
- **Effort:** **S–M**

### 10.3 Step navigation: static "In progress" text and no aggregate state
- **Evidence:** the pathway header renders a hardcoded `<div class="steps_status">In progress</div>` that never changes (`ipsr-innovation-use-pathway.component.html:1-2`). Steps do have green checks (`stepSections.*`), but the icons carry no tooltip explaining what completes a step; step labels (Ambition/Package/Assess/Info) have none either.
- **Improvement:** remove the fake status; add per-step completion tooltips ("2 fields missing: …") reusing the completeness flatList.
- **Effort:** **S**

### 10.4 Silent save failures in the pathway
- **Evidence:** 6+ `.subscribe()` save calls with no `error` callback (`step-n1.component.ts:119,131`, `step-n3.component.ts:97,115`, `complementary-innovation.component.ts:187,212`) — the creator has the correct pattern (`innovation-package-creator.component.ts:165-170`) but it wasn't propagated.
- **Improvement:** add the standard `alertsFe` error branch to every save; also fix "Un-submission" → "Unsubmit" (`innovation-package-detail.component.html:21`).
- **Effort:** **S**

### 10.5 Step 3 evidence: link-only, no criteria
- **Evidence:** readiness/use evidence accepts only a URL (no file upload, unlike `rd-evidences`), and nothing explains what counts as valid readiness evidence (`step-n3.component.html:17-78`).
- **Improvement:** reuse the evidence-item link/file component; add a one-liner with examples (trial results, deployment reports, partner agreements).
- **Effort:** **M**

### 10.6 IPSR integrity & trust details (GLM-5.2 deep pass; verified)
| Finding | Evidence | Effort |
|---|---|---|
| **Silent data loss:** answering "No expert workshop" on Step 1 nulls `readiness_level_evidence_based` + `use_level_evidence_based` (the Step 3 scores) with no confirmation or undo | `step-n1.component.ts:42-46` (`cleanEvidence()`) — verified | **S** |
| Complementary innovations' evidence-required flags are initialized `true` and updated only as a side effect of the green-check render, not the level selection — the required rule drifts from the level-0 exemption the core innovation applies | `step-n3-complementary-innovations.component.ts:15-16,39-46` | **S** |
| Geoscope warns "cannot be changed after innovation package creation" yet Step 1 renders it fully editable (`readOnly` never bound) | `ipsr-geoscope-creator.component.ts:50-56` vs `step-n1.component.html:20` | **S** |
| 0–9 level definitions appear on `mouseenter` only — no click/focus handler, so touch and keyboard users never see them; no persistent label of the selected level | `pr-range-level.component.html:9-11` | **S** |
| List filter chips "2023"/"2024" hardcoded disabled with no tooltip/reason (and the year strings rot) | `ipsr-list-filters.component.html:6` | **S** |
| Step 2 sub-routes flagged `underConstruction: true` but shipped live; admin-only "2.2 Basic info" makes the "2.1" prefix meaningless for non-admins | `routing-data-ipsr.ts:36-37`, `step-n2.component.html:3-11` | **S** |
| Submission modal never explains the QA lifecycle (who reviews, where feedback lands); disabled Submit has an empty tooltip | `ipsr-submission-modal.component.html:8-10`, `innovation-package-detail.component.html:21-25` | **S** |
| Tooltips call an innovation package a "result", conflating the two concepts the module otherwise separates | `innovation-package-list.component.html:17,27` | **S** |

## 11. Results Center (list & discovery)

### 11.1 All filtering/search is client-side over the full dataset
- **Evidence:** the list fetch passes only `version_id` (+`created_by`) server-side (`results-api.service.ts:48-74`); text search + 7 filters run in a pipe over the whole in-memory array on every keystroke (`results-list-filter.pipe.ts`, `results-list.component.html:1-11`). Elasticsearch exists but is used **only** for duplicate detection in the creator.
- **Improvement:** server-side filtering/pagination for the list; reuse Elastic for text search.
- **Effort:** **L**

### 11.2 "Map to TOC" mislabels a request flow
- **Evidence:** the kebab action "Map to TOC" (`results-list.component.ts:60-61`) opens the share-request modal titled "Request to be added as contributor of a result" — the user expects an immediate mapping, gets an approval workflow; the success toast then says the result "can be mapped to your Initiative's ToC" (undefined jargon), and the modal navigates the user away from their context after sending (`share-request-modal.component.ts:125-128`).
- **Improvement:** rename ("Request contributor access"), align the wording, stay in context after sending.
- **Effort:** **S**

### 11.3 Sort resets on every filter keystroke; fragile DOM scraping
- **Evidence:** `resetTable()`/`applyDefaultSort()` fire on each filter signal change (`results-list.component.ts:137-146,207-218`); the combine/separate logic reads `aria-sort` from the DOM with `setTimeout(100)` (`:165-178`).
- **Improvement:** preserve sort state across filter changes; derive sort state from the table API, not the DOM.
- **Effort:** **S**

### 11.4 Ambiguous controls
- **Evidence:** "Created by me" vs "Submitted by me" checkboxes with no explanation; two different "Update result" affordances (kebab = direct replication confirm; toolbar = picker modal) share the same label.
- **Improvement:** tooltips for the activity filters; differentiate the two update labels.
- **Effort:** **S**

## 12. Remaining result-detail sections

| Finding | Evidence | Effort |
|---|---|---|
| Evidence "impact tag" checkboxes have no meaning stated (does ticking Gender mean the doc *discusses* gender or *proves* gender impact?) | `evidence-item.component.html:108-127` | **S** |
| Max-6-evidence rule undocumented — the Add button just disappears | `rd-evidences.component.html:93` | **S** |
| Evidence drag-drop error auto-dismisses in 3s | `evidence-item.component.ts:149-151` | **S** |
| Policy **Stage** dropdown has zero definitions while Policy **Type** right above has full inline guidance (inconsistent); CLARISA `definition` column unused | `policy-change-info.component.html:60-68` | **S** |
| CapDev **Delivery Method** / **Length of training** options undefined (DB `description` null; helper text just points to another section) | `cap-dev-info.component.html:26-56` | **S** |
| InnoDev "Innovation developers/collaborators" are free-text prose fields (name+email+org in one textarea) — unstructured, unqueryable | `innovation-dev-info.component.html:75-91` | **M** |
| KP section is jargon-dense with no definitions: MELIA, OST, ISI, DOI, AGROVOC, Altmetric, Unpaywall (only FAIR has a tooltip); FAIR sub-indicators show pass/fail with no remediation guidance beyond "liaise with your Center's KM team" | `knowledge-product-info.component.html:169-195` | **M** |
| Innovation-use form (~657 lines, used twice: current + 2030 projection): "actors", "use level", disaggregation rules — the single most complex subform, help scattered | `shared/components/innovation-use-form/` | **M** |
| "Action Areas" (Systems Transformation / Resilient Agrifood Systems / Genetic Innovation) never differentiated from Impact Areas | `action-area-outcome.component.html:10-34` | **S** |

## 13. Global shell, navigation & recovery

### 13.1 No global search — **top navigation gap**
- **Evidence:** the header (`header-panel.component.html`) has logo, nav, What's New, bell, avatar — no search. The only result search is the client-side filter on the Results Center page. Finding "result 8585" from anywhere else = navigate → wait for the full list → type.
- **Improvement:** header global search (Cmd/Ctrl+K) with typeahead over the existing Elastic endpoint (`GET_FindResultsElastic`), returning results + innovation packages with code/type/phase.
- **Effort:** **M**

### 13.2 Phase context is read-only text; switching reloads the whole app
- **Evidence:** current phase appears only as small text under the logo (`header-panel.component.html:17`); `phase-switcher` renders only inside result/IPSR detail and its change handler does `window.location.reload()` (`phase-switcher.component.ts:30-32`), destroying filters/scroll.
- **Improvement:** promote a phase indicator/switcher chip to the header on all pages; switch phase via state refresh, not full reload.
- **Effort:** **M**

### 13.3 No connectivity-loss or 403 handling
- **Evidence:** the interceptor re-throws all errors unclassified (`general-interceptor.service.ts:63-65`); no offline banner, no retry queue; permission walls surface as raw errors or per-button disabled tooltips.
- **Improvement:** classify status 0 (offline banner + replay queue for saves) and 403 (friendly "you don't have access — request it" dialog).
- **Effort:** **M**

### 13.4 Breadcrumbs are not navigation — the component is dead code
- **Evidence:** `app-breadcrumb` has **zero usages** in any template (grep-confirmed); the shell renders header + outlet + footer with no trail, and the unused component itself only prints text ("Result code: X > level > type") with no links. Deep pages (`/result/result-detail/<code>/evidences`, `/entity-details/<id>/aow/<aowId>`) have no orientation; every `PrRoute` already carries `prName` for exactly this.
- **Improvement:** wire a real router-integrated breadcrumb into the shell consuming the `prName` chain (or delete the dead folder).
- **Effort:** **M**

### 13.5 Shell details that erode trust (GLM-5.2 deep pass)
| Finding | Evidence | Effort |
|---|---|---|
| **Header phase label can lie**: it binds the global *open* phase (`reportingCurrentPhase`), so while viewing a closed phase via the switcher the header says e.g. "P25 - 2025" over P22-2024 data | `header-panel.component.html:17`, `data-control.service.ts:60-80` | **S** |
| Bell popover items are `<a [href]>` → full app reload, and land on a *filtered notifications list* (search-string guess), not the result itself | `pop-up-notification-item.component.{html:3,ts:24-35}` | **M** |
| Closing the bell **silently marks all notifications as viewed**, even unread ones | `header-panel.component.ts:110-115` | **S** |
| Sent share-requests **cannot be cancelled** — pending until the recipient acts, no cancel action or endpoint | `notification-item.component.html:80` | **M** |
| Nav mixes near-synonyms with no grouping or icons: "Results Framework & Reporting" vs "Results Center"; "My Admin" vs hidden "Admin module" (avatar-menu only) | `navigation-bar.component.ts:18`, `routing-data.ts:93-102` | **M** |
| A11y: no skip-link / `<main>` landmark; no `aria-current` on nav (a CSS hack `hide_active_in_notifications` patches a wrong route hierarchy); user-menu popover lacks `aria-haspopup`/focus trap; no responsive nav (zero media queries) | `app.component.html`, `navigation-bar.component.html:11`, `header-panel.component.html:63,79` | **S–M** |
| Delete confirmation styled `status: 'success'` (green) for a destructive action | `results-list.component.ts:318-326` | **S** |
| Dev-only `Alt+T` hotkey copies auth token + user + roles to clipboard — screen-share footgun, against `.cursorrules` | `app.component.ts:49-81` | **S** |
| No role/read-only badge in the shell (`readOnly` is even flipped silently by the review drawer); no shell help "?" entry; "What's new" has no unread dot; Settings tab is an unlabeled cog | `roles.service.ts:9-17`, `header-panel.component.html:25-34`, `results-notifications.component.html:17-26` | **S** |

---

## 14. Real-life user journeys (how the findings compound)

> Personas are composites; every pain point cites a finding above. **⛔ = hard stop, ⚠️ = confusion/detour, ✏️ = workaround.**

### Journey A — Amara (new Center staff, Nairobi) reports her first training
1. Logs in → landing shows program cards with no metrics, no deadline, no "what I owe" (§1.1–1.3). ⚠️ She doesn't know where to start; the hero copy doesn't explain the SP → AoW → indicator → result path.
2. Opens her SP → must decide **planned vs emerging** with only two terse tooltips (§2.2). ⚠️
3. Creates the result: picks "Capacity Sharing for Development" from bare labels (§3.1) ⛔ *is a workshop "capacity sharing" or an "other output"?* Nothing says. Output vs Outcome equally bare (§3.2). ⚠️
4. CapDev form: **Length of training** and **Delivery Method** options carry no definitions (§12). ⚠️ She guesses "Blended".
5. Evidence: ticks impact-tag checkboxes without knowing what ticking commits to (§12); on her 6th link the Add button silently vanishes (§12). ⚠️⚠️
6. Hits Submit — disabled, tooltip only says "available once all sections are completed" (§4.1). ✏️ She opens all seven sections hunting the gray check.
7. Wi-Fi drops during a save → no offline banner, request lost silently (§13.3). ⛔ She re-types the narrative.
- **Net:** ~7 conceptual gaps, 2 hard stops — all fixable with the Concept Layer + Wave-1 items.

### Journey B — Diego (SP lead) checks progress two weeks before the deadline
1. Landing cards force him to open each of his 3 programs one by one to see any state (§1.1). ✏️
2. Entity Insights: absolute counts, no targets, no deadline countdown, charts not clickable (§2.2). ⚠️
3. AoW sidebar is code-only ("AOW-01…") — he keeps a personal cheat-sheet (§2.1). ✏️
4. Target-vs-actual requires opening a drawer per indicator (§2.3). ✏️
5. Wants the full list → Results Center: full dataset loads client-side, his sort resets as he types (§11.1, §11.3). ⚠️
- **Net:** the platform *has* every number he needs (progress DTO, `progress_percentage`, statuses) and shows almost none of it where he looks.

### Journey C — a result comes back from QA
1. The result's status silently reverts to Editing; the strongest in-app signal is the "In QA" tag disappearing (§9.1). ⚠️
2. The reviewer's comments are **not visible anywhere in PRMS** — they live in the external Clarisa QA iframe (§9.1). ⛔
3. The submitter edits based on an email/hearsay, resubmits, hopes. There is no "sent back on {date}: {reason}" trail (§9.2). ⛔
- **Net:** the single most broken loop in the platform; the DB table for it already exists.

### Journey D — Lucía packages an innovation (IPSR)
1. Creator lists only **QAed** innovations; hers isn't QAed yet, so the list simply omits it with no explanation of why (§10.2). ⛔
2. Once in: steps named Ambition/Package/Assess/Info with no tooltips; header shows a fake static "In progress" (§10.3). ⚠️
3. Step 2 asks for complementary innovations / enablers / solutions — undifferentiated jargon over a 3-level checkbox tree (§10.2). ⚠️
4. Step 3: two identical-looking 0–9 scales (readiness vs use); the hover cards help (§10.1 ✓), but comparing levels means opening a Google Drive PDF, and evidence accepts only links (§10.1, §10.5). ⚠️✏️
5. A save fails on flaky hotel Wi-Fi → no error surfaces (§10.4). ⛔
- **Net:** the best help pattern in the app (hover definitions) lives here — and so do the worst silent failures.

### Journey E — Karim needs to reuse a result from another program
1. He knows the code (8585) but there's no global search — navigates to Results Center, waits for the full list, types into a client-side filter (§13.1, §11.1). ✏️
2. Finds it; kebab says **"Map to TOC"** — he expects an instant mapping, gets a "request contributor access" form (§11.2). ⚠️
3. After sending, he's navigated away from the result; the toast says it "can be mapped to your Initiative's ToC" — jargon (§11.2). ⚠️
4. Days later the owner accepts via notifications; had the result already been Quality Assessed, Accept would be disabled with only a tooltip. ⚠️
- **Net:** a 30-second intent (link my program to this result) spread over days and four surfaces.

### Journey F — Sofía (Center focal point) validates bilateral results
1. Follows a deep link `?center=X` → every other center's pending count shows 0 until she clicks "All Centers" once (Round-1 finding, §2.5). ⚠️
2. Switching centers flashes an empty table (§2.5). ⚠️
3. She builds a filtered queue (category+status) and wants to send it to a colleague — those filters don't round-trip in the URL (§2.5). ✏️ She sends screenshots.
- **Net:** small state bugs that directly break a share-and-review team workflow.

---

## 15. Prioritized roadmap (updated with Round 2)

**Wave 1 — quick wins (all S, ship in one cycle):**
1. SP cards: progress bar + status chips (§1.1)
2. AoW sidebar: names next to codes (§2.1)
3. Target-vs-actual progress bars in HLO table (§2.3)
4. Climate guidance copy-paste bug (§4.2) + SGP-02 helper (§2.5)
5. Panel-menu "X/N complete" + missing-sections tooltip on Submit (§4.1)
6. `pr-select` itemSize fix (§7)
7. Home error/retry states (§1.4) + fail-closed reporting access (§2.5)
8. IPSR: error callbacks on pathway saves, remove fake "In progress", "Unsubmit" label (§10.3, §10.4)
9. Results list: preserve sort, honest "Map to TOC" label, activity-filter tooltips (§11.2–11.4)
10. Evidence: document the 6-item limit, persistent drag-drop errors, impact-tag helper line (§12)

**Wave 2 — the Concept Layer (M):**
11. Glossary registry on `TerminologyService` (§5.1) — content from `platform-concepts.md`
12. Option descriptions in `pr-select`/`pr-radio-button` + `<app-concept-help>` (§5.2)
13. Result type + level definitions at selection time (§3.1, §3.2)
14. Impact-area per-option tooltips + collapsible section guidance registry (§4.2, §4.3)
15. Landing stat strip + phase countdown (§1.2)
16. IPSR jargon set (core/complementary/enabler/solution) + inline 0–9 levels table (§10.1, §10.2)
17. Policy stage / CapDev delivery-method definitions from CLARISA `definition` columns (§12)

**Wave 3 — structural (M–L):**
18. **QA feedback loop in-app** — endpoint on `result_qaed_log` + panel in result-detail (§9) ← highest structural value
19. Global search (Cmd+K) + header phase indicator/switcher without full reload (§13.1, §13.2)
20. Save & continue navigation + unsaved-changes guard + offline/403 handling (§4.1, §4.5, §13.3)
21. ToC option hover cards + "where am I in the ToC" visual (§4.4)
22. Entity Insights upgrade: clickable charts, planned-vs-achieved ring, trend (§2.2)
23. Server-side results-list filtering/search (§11.1)
24. Help drawer (§5.3); creation wizard (§3.3); "My reporting backlog" (§1.2)

---

## Appendix — audit attribution & verification

**Round 1:**
- **Claude Fable 5 (lead):** landing/card/panel-menu/creator form first-hand reads; verified every finding cited above against source; concepts guide.
- **GLM-5.2:** deepest single sweep (F1–F4 series above largely converged with lead); unique: terminology-system gap quantification, SGP-02 deep-link bug, URL-filter round-trip.
- **DeepSeek council (UX/UI/dev pros + lateral shadow):** unique: climate copy-paste bug (verified line 461), hex-token violations inventory, silent skeleton failure, fail-open reporting access, `pr-select` ARIA gaps.
- **Antigravity (Gemini):** unique: virtual-scroll itemSize mismatch, overlay positioning fragility, HTML-in-payload pattern, server-side confirmation that SP progress is computed and discarded.

**Round 2 (IPSR, QA, list, remaining sections, shell + journeys):**
- **Claude Fable 5 (lead):** client-side-filter and no-global-search first-hand finds; verified the QA iframe, empty `result-qaed` controller, `window.location.reload()`, `cleanEvidence()` data loss, and the climate/nutrition line before publication; authored the user journeys.
- **GLM-5.2 (×2 agentic passes):** unique: header phase label can lie, bell auto-mark-as-read + `[href]` reloads, uncancellable sent requests, dead breadcrumb component, `Alt+T` token-to-clipboard footgun, geoscope warning unenforced, mouseenter-only level definitions, QA token-in-URL, skip-link/`aria-current` gaps.
- **DeepSeek flash (×2, failure/recovery + sections lenses):** unique: QA feedback loop P0 (empty stubs vs populated `result_qaed_log`), no-offline-handling P0, Google-Drive-only readiness definitions, silent IPSR save failures, "Map to TOC" mislabel, sort-reset-on-keystroke, policy-stage vs policy-type help inconsistency, evidence 6-item limit.
- Findings that could not be verified in code were dropped or downgraded (e.g. the complementary-innovations required-flag issue is reported as fragility, not a confirmed bug).

---

# PART III — Round 3: accessibility, resilience, under-covered modules, metrics & trust

> **Method (Round 3).** A 16-agent internal workflow (Claude Fable 5 / Opus, adversarial *review → verify* per finding) swept eight net-new dimensions; every finding below was re-opened against source by a second agent and either **CONFIRMED**, **PARTIAL** (real but the description was corrected), or dropped. In parallel an external swarm (GLM-5.2 ×1, DeepSeek-v4-flash-free ×2 via the free gateway, Antigravity/agy) contrasted the work. The lead verified the highest-severity net-new claims by hand. Severities: **P0** blocks a core task · **P1** breaks a flow for a class of users · **P2** real friction/risk · **P3** polish/consistency. Nothing here repeats Rounds 1–2.

## 16. Accessibility & keyboard operability — the widest systemic gap

The app's **most-used interactive primitives are click-only `<div>`/`<a>`** with no `role`, `tabindex`, `keydown`, or ARIA. A keyboard-only or screen-reader user cannot drive core flows. This is one pattern repeated across the field system, so a single shared fix has outsized reach.

- **[P1] `pr-select` dropdown is keyboard-inoperable** — `custom-fields/pr-select/pr-select.component.html:65`. Trigger is `<a tabindex="0" (focus)=…>`, the list opens purely via CSS `.field:focus-within`, and each option is `<div (click)=…>` with no `role`/`tabindex`/`keydown`; the `.ts` only has a `document:click` close handler. No `combobox`/`listbox` ARIA. The single most-used field in the platform cannot be operated by keyboard. **Fix:** add combobox/listbox roles + Arrow/Enter/Space/Escape handling, or wrap PrimeNG `p-select`.
- **[P1] `s-select` repeats the identical pattern** — `custom-fields/s-select/s-select.component.html:64`. Same remediation.
- **[P1] Results-table row navigation is a hrefless `<a>`** — `results-list.component.html:86`. `<a (click)="navigateToResult(...)">` with no `href`/`routerLink` → not tab-focusable nor Enter-activatable. (Verifier nuance: a convoluted path exists via the ellipsis action menu, but the button's `keydown.enter` calls `menu.toggle()` **without** `onPressAction(subResult)` at line 157, so keyboard-opening the menu doesn't configure it for that row.) **Fix:** bind `[routerLink]` on the row anchor as the PDF cell already does.
- **[P2] `pr-range-level` scoring is click-only; level descriptions hover-only** — `custom-fields/pr-range-level/pr-range-level.component.html:3`. Circles are `<div (click)=…>` with no radio semantics; definitions appear only on `mouseenter`. Keyboard/touch users can neither set nor read the 0–9 scores. **Fix:** `role=radiogroup`/`radio` + roving tabindex; expose the description via focus/`aria-describedby`.
- **[P2] `pr-yes-or-not` toggle has no radio/button semantics** — `pr-yes-or-not.component.html:7`. Selection conveyed by CSS class only, no `aria-checked`.
- **[P2] `pr-multi-select` remove-chip & select-all are click-only** — `pr-multi-select.component.html:69,26` (PARTIAL: option *selection* is fine — each row has a real `p-checkbox` — but the **remove-chip icon** and **Select-all** div are keyboard-dead and unlabeled). **Fix:** make them real `<button aria-label>`.
- **[P2] Section-completeness icon is color-only** — `panel-menu.component.html:25`. Same `check_circle` glyph for complete/incomplete, differing only by color; no `aria-label`/text. WCAG 1.4.1 fail — colorblind and SR users cannot tell done from pending. **Fix:** distinct icon shape + `aria-label`/tooltip.
- **[P2] AI Review action is a click-only `<div>`** — `panel-menu.component.html:45`. No role/keyboard; disabled state is CSS-only with no `aria-disabled`.
- **[P2] Share/submission modals: unnamed dialog + click-only close `X`** — `share-request-modal.component.html:13`. `[showHeader]="false"` strips PrimeNG's accessible header/close, and the custom `<i class="pi pi-times">` has no `role`/`tabindex`/`aria-label` (Escape still closes). **Fix:** real `<button aria-label="Close">` + `ariaLabelledBy` on the dialog.

## 17. Error handling, resilience & data integrity

The interceptor **rethrows every error blindly** and each component is left to cope — so gaps are systemic.

- **[P1] No 401/session-expiry handling** — `general-interceptor.service.ts:63`. `manageError()` is a bare `throwError(error)`; no `logout()`, no redirect, no "session expired" toast, though `authService.logout()` exists. On long editing sessions an expired token yields opaque failures. (Verifier correction to my Round-3 first pass: the "line 24 inverted logic" I flagged is **not** clearly a bug — skipping an auth header you don't have is benign; the real defect is purely the absent 401 branch.) **Fix:** in `manageError`, on 401/403 call `logout()`, route to `/login` preserving the deep link, show one alert.
- **[P1] Result-load handler crashes on offline** — `current-result.service.ts:56`. `if (err.error.statusCode == 404)` dereferences `err.error`, which is `undefined` for transport failures (offline, timeout, 502 HTML) → TypeError inside the error callback, so the "Result not found" alert never fires and the page stays blank. **Same unguarded pattern at `innovation-package-detail.component.ts:53`.** **Fix:** `err?.error?.statusCode === 404 || err?.status === 404`, plus an `err.status === 0` "can't reach server" branch.
- **[P1 systemic] Zero `CanDeactivate` guards in the entire client** — grep across `src/` returns **0 matches** *(DeepSeek-free + agy; verified)*. Result-detail, creator, and drawers all lose unsaved edits on accidental navigation/tab-close. The **bilateral review drawer** is a confirmed instance: `result-review-drawer.component.ts:1471` `closeDrawer()` has no dirty check even though `hasDataStandardUnsavedChanges()`/`hasTocUnsavedChanges()` already exist (wired only into `canApprove()`). **Fix:** add a `CanDeactivate` guard + confirm-on-close using the existing dirty-detection.
- **[P2] Section saves are tokenless → last-write-wins** — `results-api.service.ts:197`. `PATCH_generalInformation` (and siblings) send only `body` — no `version_id`/`updated_at`/ETag. Two tabs or two users editing one result silently overwrite each other; no conflict detection client-side. **Fix:** send last-known version and reject stale writes with 409 → conflict dialog.
- **[P2] `getData()` swallows the code→id conversion failure then loads anyway** — `result-detail.component.ts:102`. On a non-404 conversion error it `resolve(null)` with `currentResultId` still `null`, then unconditionally calls `GET_resultById()`/`getGreenChecks()` against `get/null` → empty editor, no message. **Fix:** abort `getData()` unless the id actually converted.
- **[P3] `GET_versioningResult` subscribes with no error handler** — `result-detail.component.ts:108`. next-only subscribe, blind `response` destructure; a failed versioning call leaves `resultPhaseList` stale so the phase switcher can show the **wrong phases** silently. Same at `innovation-package-detail.component.ts:59`.
- **[Integrity, verified by lead] Fail-open reporting access** — `entity-aow.service.ts:80-86`. `GET_phaseInitiativeStatus` sets `reportingEnabled` from the response on success but does `reportingEnabled.set(true)` on **error** — a transient 401/500 during a *closed* reporting window silently unlocks reporting. **Fix:** default to `false` on error and show a "status unavailable" banner. *(DeepSeek-free; confirmed against source.)*
- **[P2, verified by lead] Evidence save has no error branch → perpetual spinner** — `rd-evidences` `onSaveSection` subscribes with no error callback, so a failed POST never resets `isSaving` and the user is stuck on a spinner. *(DeepSeek-free; line offsets approximate, pattern confirmed.)*
- **[P2] Invalid Accept/Decline silently no-ops** — `notification-item.component.ts:71-84,172`. When `invalidateRequest()` is true (platform closed / phase mismatch / in-QA) the handlers `return` with **no feedback** — the button does nothing, unexplained. Error toast on failure carries `description: ''` and a raw `console.error`. **Fix:** disable with an explanatory tooltip; map server errors to human text.

## 18. Under-covered modules — notifications, admin, bilateral (+ one XSS)

- **[P2, verified by lead] Stored-XSS surface in the global alert service** — `customized-alerts-fe.service.ts:41-42`. `${title}` and `${description}` are interpolated **raw** into an HTML string injected via `insertAdjacentHTML`. Any server- or user-controlled text routed through an alert (error messages, result titles) executes as HTML. **Fix:** build the node with `textContent`, or escape before injection. *(GLM-5.2; confirmed.)*
- **[P2] Alert `closeIn` duration is ignored — hardcoded 3000 ms** — `customized-alerts-fe.service.ts:77`. `closeIn` is used only as a truthy flag; `setTimeout(…, 3000)` hardcodes 3 s, so `closeIn: 10000` (massive-phase-shift success) and `closeIn: 500` both fire at 3 s. **Fix:** pass `closeIn` into `setTimeout`. *(GLM-5.2 + internal; confirmed by lead.)*
- **[P3] Massive Phase Shift failure shows a blank reason and self-dismisses** — `massive-phase-shift.component.ts:60`. Typo `err?.error?.meesage` → description always `undefined`; and `requesting` (line 12) is **never set `true`**, so the Confirm never disables/spins on this **irreversible bulk replicate**. Combined with the `closeIn` bug the "failed" toast vanishes in 3 s. **Fix:** correct the typo; gate the button on `requesting`; make the alert dismissible. *(GLM-5.2 + internal; confirmed by lead.)*
- **[P2] Bilateral review drawer discards inline edits on close** — see §17 (`result-review-drawer.component.ts:1471`).
- **[P2] Bilateral "Save changes" asks for a justification but shows no before/after diff** — `save-changes-justification-dialog.component.html:18`. Only a free-text "Reason" textarea; `originalDataStandardSnapshot` is used for dirty-detection but never to surface the delta. Reviewers confirm edits (geoscope, contributors) without seeing what changed. **Fix:** render "field: old → new" from the existing snapshots in the dialog and persist it.
- **[P3] Accept contribution has no confirmation while Decline does** — `notification-item.component.html:105`. `acceptOrReject(true)` fires directly on click; Decline opens a confirm dialog. A single mis-click commits the ToC contribution mapping. **Fix:** parity confirmation on Accept.
- **[P3] Mark-as-read toggle is an unlabeled `<div>` that bounces the router to re-render** — `update-notification.component.html:29` + `results-notifications.service.ts:190`. The control is a click-only icon `<div>`; its handler navigates `settings → updates` purely to force a re-render, re-triggering route side-effects and flashing the view. **Fix:** real `<button aria-label>`; drive re-render via signal/array change.
- **[P3] Pop-up notification deep-link uses `[href]` (full reload)** — `pop-up-notification-item.component.html:3`. `<a [href]="resultUrl">` instead of `routerLink`, so clicking a header notification hard-reloads the SPA. *(GLM-5.2.)*
- **[P2, notification bell] Opening the tray marks everything viewed on any close** — `header-panel.component.ts:110` (PARTIAL → P3: this is the common "open tray = seen" pattern; genuine loss only on open-then-Escape-without-reading).

## 19. Phase / versioning UX

- **[P2] `PanelMenuPipe` crashes the whole section menu on an unmatched green-check** — `panel-menu/pipes/panel-menu.pipe.ts:21`. `list.find(item => item.path == green_check.section_name)` is dereferenced with **no null guard**; a single server `section_name` with no matching route path throws a TypeError that blanks the entire left-nav Sections panel. **Fix:** `if (optionFinded) optionFinded.validation = …`. *(Highest-value versioning find; the pipe is pure, so it recomputes on input change, not every CD cycle.)*
- **[P2] Per-section completeness is color+icon only** — `panel-menu.component.html:24` (see §16); the submit tooltip "available once all sections are completed" never says *which* section is missing.
- **[P3] Phase is only conveyed by the switcher's highlighted button** — `result-detail.component.html:36` (PARTIAL: the metadata block lists code/status/level/submitter but **no phase/reporting-cycle label**; `app-phase-switcher` above it does highlight the active phase). **Fix:** add a labeled "Reporting cycle" field so a user editing a past phase notices at a glance.
- **[P3] No cross-phase version comparison** — `result-detail.component.ts:108`. `resultPhaseList` feeds only the switch buttons; there is no side-by-side/field diff of a result across phases, so no one can verify what the versioning process replicated.
- **[P3] Phase switch = manual `window.location.reload()` + redundant anchor** — `phase-switcher.component.ts:29`. `router.navigate(...).then(() => window.location.reload())`, plus the template uses a plain `[href]` (not `routerLink`, no `preventDefault`) so both native nav and JS handler fire; `this.route` is captured once in `ngOnInit` (stale-route risk). **Fix:** drop the `[href]`, replace the reload with a targeted phase-keyed refetch.
- **[Conceptual, agy] The "invisible read-only trap."** Historical/closed phases render **identically** to the editable phase — inputs are disabled but look normal, so users click and think the app is frozen. **Fix:** a persistent full-width "Viewing Phase X (READ-ONLY)" banner + a desaturated/watermarked container in archival state.

## 20. Cognitive load & form density

- **[P1] Innovation-development form is ~90 controls on one flat page** — `innovation-dev-info.component.html:1`. 161 lines, one scroll, **no accordion/steps/collapse**, stacking ~10 heavyweight child assessment components (megatrends, GESI, scale-impact, assumptions, IP rights, team diversity, estimates…) all expanded at once. **Fix:** wrap the assessment blocks in the existing `shared/components/collapsible-container`, collapsed by default with a per-block complete badge.
- **[P2] Five identical impact-area scoring blocks stacked flat** — `rd-general-information.component.html:81,121,161,201,241` (Gender/Climate/Nutrition/Environment/Poverty), all binding the same option list, with the "Principal" expansion injected inline mid-list. Repetition fatigue. **Fix:** one collapsible group or a compact area×score grid.
- **[P2] Contributors & Partners: ~10 concept groups over 506 lines with no section dividers** — `rd-contributors-and-partners.component.html:1` (PARTIAL: field-header labels exist, but no `collapsible-container`/`detail-section-title` grouping; the paired "from ToC" / "Other(s)" dropdowns read as four unrelated controls). **Fix:** visual grouping around the logical clusters.
- **[P3] Title & Description have no placeholder and no worked example** — `rd-general-information.component.html:37`. The two fields QA relies on most give zero format cue, while `innovation-dev-info.component.html:135` ships a full "Example: We chose readiness level 6…". **Fix:** add placeholders + short examples (both controls already support them).
- **[P3] The same "what demand/problem does it address (50 words)" narrative is re-asked in three repeaters** — `anticipated-innovation-user.component.html:97,183,218`, all rows expanded inline. **Fix:** collapse saved rows to a one-line summary; reconcile the near-duplicate prompts.

## 21. Loading / empty / skeleton consistency

- **[P2] IPSR package list shows a false "no results" while loading** — `innovation-package-custom-table.component.html:75`. The empty message is gated only on `!tableData?.length` with no loading flag, so every fetch/filter flashes a definitive "There are no results". Contrast with `results-list` which has a `loadingbody` spinner. **Fix:** gate on `!loading && !length`.
- **[P2] Three list surfaces render loading three different ways** — notifications use skeleton rows (`updates.component.html:38`), results-list a centered spinner overlay, IPSR list nothing. **Fix:** one canonical list-loading treatment.
- **[P2] Entity-details empty state is a dead-end** — `entity-details.component.html:143,91`. Bare "No results found for this science program" heading while the only affordance — the `Report` split-button — is `[hidden]="true"` (line 110). Empty program looks broken, not actionable. **Fix:** give the zero-state a CTA ("Report your first result").
- **[P3] "What's New" empty state is the literal text "No data"** — `whats-new-home.component.html:25`. Two raw words, indistinguishable from a render bug; the shared `app-no-data-text` component already exists. **Fix:** use the iconized empty-state and distinguish empty vs failed fetch.
- **[P3] Four spinner mechanisms coexist** — (PARTIAL: really *three* distinct treatments — the rotating `spinner.png` used by `app-custom-spinner` and ~4 inline usages, PrimeNG `p-skeleton`, and a lone `p-progressSpinner` in `manage-user-modal.component.html:15`). **Fix:** standardize on one.

## 22. Client-side trust & security signals

*(All pre-existing/architectural — hardening recommendations, not fresh defects on this branch — but net-new to this document.)*

- **[P2] Session JWT in `localStorage`** — `auth.service.ts:20`. Raw JWT under key `token`; XSS footholds exist (`bypassSecurityTrustResourceUrl` in QA/pdf-reports) and the DevSession shortcut copies it to clipboard. Account-takeover blast radius. **Consider:** httpOnly cookie or at least tighten the XSS surface.
- **[P2] CLARISA QA token in the iframe URL query string** — `quality-assurance.component.ts:45`. `…/crp?crp_id=…&token=${clarisaQaToken}` to an **external** origin → leaks to that app's access logs, browser history, Referer. **Fix:** POST the token or use a short-lived exchange.
- **[P2] User PII (email+username+id) sent as tags to Microsoft Clarity, consent asserted by default** — `clarity.service.ts:58` + `initClarity` calls `Clarity.consent()` unconditionally. Real work email attached to session replays. GDPR exposure; a `setCookieConsent` method exists but isn't gated. **Fix:** gate consent + drop PII tags.
- **[P3] Internal report PDF URL forwarded to Google `gview`** — `pdf-reports.component.ts:54`. `https://docs.google.com/gview?url=${resp.pdf}` makes Google fetch the backend PDF; disclosure depends on whether `resp.pdf` is a signed URL.
- **[P3] `isAdmin`/`readOnly` seeded from client-mutable `localStorage 'roles'`** — `roles.service.ts:83` (PARTIAL: only a **transient** admin-UI flash — `updateRolesList()` overwrites from the server, and the `/admin-module` route is separately enforced by `CheckAdminGuard`; not confirmed privilege escalation). Defense-in-depth note, not a breach.

## 23. Terminology & i18n consistency

- **[P2] `innovation-use` estimates hardcodes "Science Program/Accelerator" while injecting `TerminologyService` unused** — `estimates.component.ts:25`. The service is imported and injected but never called; the twin `innovation-dev` estimates builds the same help text via `terminologyService.t('term.entity.singular', …portfolio)`. On a **P22** innovation-use result the help text wrongly says "Science Program/Accelerator" instead of "Initiative". **Fix:** route through the term pipe.
- **[P2] Dozens of entity labels hardcode "Science Program/Accelerator" though `term.entity.*` keys exist** — `rd-contributors-and-partners.component.html:296,302,308,329` (and `result-framework-reporting-home:13,57`, `header-panel:95`, `aow-hlo-create-modal:199,221`, `result-review-drawer:227,246,250,255`). Same screen mixes pipe-driven and hardcoded labels → drift, no central rename. **Fix:** use the term pipe.
- **[P2] Same entity is "Initiative" in admin but "Science Program/Accelerator" in reporting** — `user-report.component.html:22`, `home.component.html:8` (PARTIAL: two of the four claimed spots were `ngModel`/`[options]` identifiers, not user-facing text — genuine only for user-report and home). **Fix:** pipe those two labels.
- **[P3] `NEW_TERMS` aliases all 7 keys to one identical string** — `terminology.config.ts:22`. `plural`, `orPlatforms`, `orPlatformsPlural`, `singularWith()` etc. all return "Science Program/Accelerator", so callers asking for plural/"or platform"/"or SGP" get the bare singular (LEGACY_TERMS does distinguish them). May be an intentional P25 copy decision. **Fix (if desired):** give the variants their own strings.
- **[P3] Coined acronyms shown with no expansion** — `entity-aow-aow.component.html:20` ("P/A", "HLO/Outcome"), `aow-hlo-table:101` ("HLO"), `eoio-home:43` ("EOI Outcome"), `results-review-table:23` ("TOC result"), plus "SGP". New users meet undefined jargon with no tooltip. **Fix:** expand on first use / glossary tooltip, sourced from the terminology config (feeds the Concept Layer of §5).

## 24. Decision metrics & data-viz for leaders *(DeepSeek-free; lead-verified)*

A Science Program lead cannot answer "are we on track?" at a glance.

- **[P1] SP card imports `ProgressBarModule` but never renders a progress bar** — `result-framework-reporting-card-item.component.ts:2,8` import it; the card template has **no `<p-progressBar>`** (grep-verified empty), while `SPProgress.progress`/`totalResults` are available. The single highest-value quick win of the whole document (echoes R1 §1.1 from a different angle — the module is wired, the element is just missing). **Fix:** render `<p-progressBar [value]="item.progress">` on the card.
- **[P1] Entity-details shows raw counts with no denominator, %, or bar** — `entity-details.component.html:33-38` ("editing: N, submitted: N"). **Fix:** `{{value}}/{{total}} ({{pct}}%)` + a small progress element; data already in `dashboardData()`.
- **[P1] No aggregated portfolio-health visualization anywhere** — no gauge/donut/traffic-light/trend across the platform (grep for chart/canvas). **Fix:** a donut/gauge at entity-details top: `qualityAssessed / (editing + submitted + qualityAssessed)`.
- **[P2] No export from the entity-details dashboard** — export exists only in outcome-indicator/type-one-report; a lead cannot download their SP snapshot. **Fix:** Excel export via `ExportTablesService`.
- **[P2] Missing: overdue-item flagging, per-AoW target-vs-achieved rollup, phase-over-phase trend** — none exist; target-vs-actual is buried two clicks deep in HLO tables.
- **[P3, honest caveat] The reserved `pages/home/` hardcodes `year=2022` and three `258` counters** — `home.component.html:4`, `action-area-counter.component.html:5,10,15`. This component does **not** appear wired to a live route (`src/CLAUDE.md` marks `home/` "reserved"), so it is likely dead code rather than a live user-facing bug — flagged for cleanup, not as a shipping defect.

## 25. Conceptual gaps *(Antigravity / agy)*

Beyond code, the mental-model gaps a file-level audit misses:

- **First-run "cold-start" has no guidance.** A new user lands on an empty table + a lone "Create" button with no sense of what to report first, the Output→Outcome path, or deadlines. **Fix:** a guided landing state — a mandatory-actions checklist, a "what do you want to report?" wizard with smart cards, and a phase-deadline countdown. (Complements the empty-state CTA of §21.)
- **Readiness 0–9 is a context-free number picker → subjective data, more QA rework.** **Fix:** an interactive "Help me choose" diagnostic (3 concrete yes/no milestones → suggested level) plus a labeled slider — builds directly on the §16 keyboard/description fix for `pr-range-level`.
- **Silent per-section data loss + invisible read-only** (see §17 CanDeactivate, §19 read-only trap) — agy independently ranked both as the top trust-destroyers.

## 26. Round 3 — roadmap additions

Fold these into the §15 waves:

- **Wave 1 (quick, high-impact):** render the SP-card progress bar (§24); guard `PanelMenuPipe` null (§19); fix `closeIn` + massive-phase-shift typo (§18); guard the offline/404 crash in `current-result.service` (§17); give `pr-select`/`s-select` keyboard+ARIA (§16, one fix ≈ platform-wide reach).
- **Wave 2 (flows & trust):** `CanDeactivate` guard + drawer confirm-on-close (§17); 401 handling in the interceptor (§17); fix the alert-service XSS (§18); read-only phase banner (§19); entity-details denominator/% + empty-state CTA (§24/§21).
- **Wave 3 (structural):** collapsible density for innovation-dev / impact-area / contributors forms (§20); route hardcoded entity labels through the term pipe (§23); optimistic-lock tokens on section saves (§17); portfolio-health visualization + export (§24); onboarding/guided-landing + readiness diagnostic (§25).

## Appendix — Round 3 attribution & method

- **Claude Fable 5 (lead + judge):** authored the 16-agent internal *review→verify* workflow (8 dimensions, 46 findings, 0 agent errors); verified by hand the top net-new external claims — the alert-service **XSS**, the **fail-open** reporting unlock, the `closeIn`/`meesage` bugs, the SP-card missing progress bar, and the reserved-`home/` dead-code caveat; wrote §16–§26.
- **Internal verifiers (adversarial):** corrected overstatements rather than rubber-stamping — downgraded the roles-`localStorage` "privilege escalation" to a transient UI flash, refuted my own "interceptor line-24 inverted logic", corrected `pr-multi-select` (options *are* keyboard-accessible via `p-checkbox`), and fixed several line offsets. 12 of 46 landed **PARTIAL** with the accurate version recorded.
- **GLM-5.2 (modules, free gateway):** unique net-new — the `insertAdjacentHTML` **XSS**, pop-up deep-link `[href]` reload, massive-phase-shift typo+dead-spinner, `closeIn` ignored, mark-read router bounce.
- **DeepSeek-v4-flash-free ×2 (free gateway):** unique net-new — **fail-open** reporting access, evidence-save perpetual spinner, **zero `CanDeactivate` guards** app-wide, and the entire **metrics/data-viz** dimension (SP-card missing bar, raw counts, no health chart, no export, hardcoded reserved-home values).
- **Antigravity / agy (Google AI Pro):** unique conceptual — the **invisible read-only trap**, guided cold-start onboarding, the readiness "help me choose" diagnostic.
- **Down / unavailable this round:** DeepSeek **paid** pros/flash — account balance negative (`-$0.01`), so the council ran on the **free** opencode gateway (GLM + deepseek-v4-flash-free) at **$0 DeepSeek spend**; **`dios-gemini`** dead at the product level ("migrate to Antigravity"); **`dios-codex`** returned empty (broken install); the **external GLM a11y** agent hung >15 min at 0 output and was killed (its scope was fully covered by the internal a11y dimension).
