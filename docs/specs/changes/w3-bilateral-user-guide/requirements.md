# Requirements — W3/Bilateral Manual Reporting User Guide

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w3-bilateral-user-guide` |
| Module | `bilateral` (documentation deliverable; no product code) |
| Sub-feature | End-user PDF guide — manual reporting path |
| Type | Change |
| Depth | **Standard** — see §2 *Depth rationale* |
| Approval Mode | pre-approved (inherited from `proposal.md`) · **Phase 1 gate: auto-approved (pre-approved mode)** |
| Requirement prefix | `BG-` (`BG-R-*`, `BG-AC-*`, `BG-OQ-*`; design uses `BG-DD-*`, tasks `BG-T-*`) |
| Status | approved — requirements, design and tasks gates all `auto-approved (pre-approved mode)`; design additionally passed Judgment Day (`judgment.md`, **APPROVED**) |
| Owner | Juan Cadavid (requester) |
| Ticket(s) | none |
| Proposal | `docs/specs/changes/w3-bilateral-user-guide/proposal.md` |
| Sibling | `changes/user-guide-pdf` — archived at `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` |

---

## 2. Executive Summary

Build a second end-user PDF guide — the W3/Bilateral counterpart to the delivered W1/W2 guide — that walks a Center reporter through **reporting a bilateral result manually**, from finding the project to submitting for review, and closes by explaining when to use the AI-Assisted path instead.

The Playwright→PDF pipeline is reused by copy. Two things are genuinely new:

1. **Content** — ~18 sections against the W1/W2 guide's 6.
2. **One capability** — the pipeline must reach states that no URL renders. The bilateral editor accepts only `phase` and `job` as query params, so its six sections are reached by clicking the rail; the *Set up bilateral result* drawer is reached by clicking a project card. The existing capturer never clicks.

**The dominant risk is not a layout bug — it is a side effect.** Two of the states this guide documents sit behind actions that mutate data: *Submit for review* issues a real PATCH, and the AI quality check runs a real, billable assessment. A naive click sequence would submit a real result. `BG-R-7` makes read-only capture a hard, automated gate rather than a caution.

**Depth rationale.** Standard, not Full: no product code, no migration, no API contract, no auth change, and rollback is `git revert` on a docs folder. Standard, not Lite: ~18 sections and 17 captures is not a narrow tweak. The one element handled with Full rigor is the mutation-safety gate (`BG-R-7`, `BG-AC-7`).

---

## 3. Glossary

| Term | Meaning in this spec |
|---|---|
| **W3/Bilateral** | Results funded bilaterally, reported through `pages/bilateral` rather than the W1/W2 Initiative flow. `source=w3` in the bilateral query contract. |
| **Center workspace** | The `/bilateral/<acronym>/*` shell: identity band plus four tabs (Overview · Reporting · Results · AI Draft Results). |
| **Setup drawer** | The *Set up bilateral result* panel: step 1 Primary Science Program, step 2 Choose Creation Method. |
| **Creation method** | *AI-Assisted* or *Complete the Form Manually* — the fork this guide is about. |
| **Manual form** | The in-drawer form: result level, result type, title, optional Knowledge Product handle. |
| **Editor** | `/bilateral/<acronym>/result/<code>` — the six-section form with the section rail. |
| **Section rail** | The 240px left rail listing sections with completion checks, *N of M sections complete*, and *Submit for review*. |
| **MDS** | Minimum Data Standard — the per-section completeness tracker driving the rail checks and the progress ring. |
| **Capture** | One annotated PNG produced by the Playwright pipeline from the running app. |
| **Callout** | A labelled annotation drawn over a capture (ring + label chip + connector) marking a click target. |
| **Anchor** | The DOM selector a callout points at — here `[data-guide]` or `[data-testid]`. |
| **Pre-capture step** | A declarative, read-only interaction (click / wait / press) run after `goto` and before annotation, so interaction-only states become capturable. |
| **Guide** | The PDF deliverable. Distinct from **tour** — the in-app driver.js walkthrough. |

---

## 4. System Context & Scope

### 4.1 Current behavior — claims and evidence

Every claim below is cited as run, at commit `96b891ca3`.

| # | Claim | Evidence |
|---|---|---|
| 1 | The delivered W1/W2 guide covers no bilateral surface. | `grep -c "bilateral" docs/specs/archive/2026-09-16-changes--user-guide-pdf/tooling/routes.config.json` → `0`. Its six route ids are `home`, `overview`, `reporting-aows`, `results-list`, `notifications-received`, `ipsr-innovation-list`. |
| 2 | Bilateral child routes are `overview`, `home`, `create`, `result/:id`, `drafts`, `drafts/:draftId`, `results`. | `onecgiar-pr-client/src/app/shared/routing/routing-data.ts` → `BilateralRouting`. |
| 3 | The editor reads only `phase` and `job` from the query string — **there is no `section` param**, so sections are selected by clicking the rail. | `bilateral-result-creator.component.ts:555` (`phase`), `:567`/`:594` (`job`); `selectSection()`/`moveSection()` drive section change. |
| 4 | The editor's sections are Overview · General information · Contributors & partners · Geographic location · Evidence · Type-specific details, the last shown only when `typeId !== 4 && typeId !== 8`. | `bilateral-result-creator.component.ts:219-236` (`hasTypeSpecificSection`, `sectionNavigation`). |
| 5 | The capture pipeline never clicks: its flow is `goto -> wait readySelector -> skeleton gate -> annotate -> screenshot`, and `clickTarget` is an annotation anchor only. | `docs/specs/archive/2026-09-16-changes--user-guide-pdf/tooling/src/capture.ts:13`, `:28-32`, `:88-91`. |
| 6 | *Submit for review* does not submit directly — it runs the AI quality check, and the PATCH carries `assessment_id` + `decision`, which the server requires. | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` → *Semáforo de calidad IA (P2-3698)*. |
| 7 | The in-app tour covers the Center workspace in 10 steps and stops at "begin reporting deliverables"; it documents no drawer, form, or editor section. | `bilateral-tour.service.ts:75-159`; last manual-reporting step at `:132`. |
| 8 | 11 `[data-guide]` anchors exist in `pages/bilateral`; ~20 `[data-testid]` anchors exist across the creator/editor and its sections. | `grep -rho 'data-guide="[^"]*"' src/app/pages/bilateral \| sort -u` → 11; same pattern for `data-testid` over the creator and `section-*` folders. |
| 9 | Result levels are Outcome (3) and Output (4). There are **seven** result types, not eight: Outcome → Policy Change (1), Innovation Use (2), Other Outcome (4); Output → Capacity Sharing for Development (5), Knowledge Product (6), Innovation Development (7), Other Output (8). **The ids run to 8 but there is no id 3** — counting the highest id is the trap here. | `src/app/pages/bilateral/shared/result-types-by-level.ts` — parsed: 3 entries under level 3 + 4 under level 4 = **7**. |
| 10 | The bilateral status vocabulary has seven values — `editing 1 · qa 2 · submitted 3 · discontinued 4 · pending 5 · approved 6 · rejected 7` — while the page header paints badges for only four: Editing · Pending review · Approved · Rejected. | `bilateral-query-params.ts` → `STATUS_KEY_TO_ID`; `bilateral-page-header.component.ts:200-204` → `STATUS_BADGES`. |
| 11 | `docs/prd.md` AC-2 and `docs/trd/trd.md` §5 W1 both describe the lifecycle as `Editing (1) → Quality Assessed (2) → Submitted (3)` — which does not match claim 10. | `docs/prd.md` §7 AC-2; `docs/trd/trd.md:319-324`. |
| 12 | `docs/ux-ui/design.md` §7 names Poppins as the body font; the app was measured as `Manrope, Poppins, sans-serif` on 2026-09-15 and the correction is still **pending**, not applied. | `docs/specs/kaizen/changes--user-guide-pdf.md` → Pending Items **P5**, `Status: pending`. |
| 13 | The title field appears only after a result type is chosen. | `bilateral-manual-create-form/CLAUDE.md` → *Trampas*, "El título solo aparece después de elegir tipo (OQ-3 del spec)". |
| 14 | The four center tabs accept `source=w3|w1w2` and `method=ai|manual` as query params. | `bilateral-query-params.ts` → `SOURCE_VALUES`, `METHOD_VALUES`. |

### 4.2 In scope

- One PDF: *PRMS W3/Bilateral Reporting — User Guide*, U.S. English, with cover, introduction, TOC, ~18 sections, glossary.
- Regenerable source under `docs/specs/changes/w3-bilateral-user-guide/tooling/`, copied from the archived W1/W2 tooling.
- A bilateral `routes.config.json` and `content/` written fresh.
- Pre-capture steps in the copied capturer so drawer and rail states can be photographed.
- **17** annotated captures spanning the surfaces in §5 of `proposal.md` — the figure is fixed by `design.md` §8.1's capture table, which superseded the proposal's earlier `~14` estimate.

### 4.3 Out of scope

- Any change under `onecgiar-pr-client/src` or `onecgiar-pr-server/src`.
- Any change to the archived W1/W2 spec, its tooling, or its PDF.
- Promoting the tooling to a shared location (explicitly declined).
- Changes to `bilateral-tour.service.ts`.
- Bilateral review/QA (`result-framework-reporting/pages/bilateral-review`) — reviewer audience.
- A Bulk Results Uploader walkthrough — pointer only.
- Localization, in-app help widget, CI regeneration, staleness detection.

### 4.4 Flows and surfaces touched

- `docs/ux-ui/design.md` §3 F1 (*Submitter — create and submit a typed result*) — the bilateral analogue; §6 *Drawers and modals*; §7 *Design tokens*; `DD-6` as amended (`:438-440`); §8 *PRMS Form UX Pattern*.
- `docs/trd/trd.md` §2 client `bilateral` module (`:192`); §5 W1 *Result lifecycle*; §5 W10 *Interactive guided onboarding tours* (`:374-380`); §6 *Tooling*; §8 *Secret handling* (`:491-495`).
- `docs/prd.md` G1 (submission completeness), §3 *Result submitter*, §6 `US-S1`/`US-S2`/`US-S5`, §7 `AC-2`, `AC-9`.

---

## 5. Stakeholders / Personas

| Persona | What changes for them |
|---|---|
| **Result submitter** (Center staff reporting W3/bilateral) | **Primary audience.** Gains a printable, offline walkthrough of the manual path — the stretch neither the in-app tour nor the W1/W2 guide covers. |
| PMU / portfolio lead | Indirect: better-formed bilateral submissions; can hand the guide to Center reporters during onboarding. |
| QA reviewer | Unaffected — review surfaces are out of scope (§4.3). |
| Platform admin | Unaffected. |
| Bilateral consumer (downstream) | Unaffected — no payload, endpoint, or contract change. |

### User stories

- **`BG-US-1`** — As a Center reporter new to W3/Bilateral, I want a step-by-step document for reporting a result manually, so that I can complete a submission without trial and error. *Refines `US-S1`, `US-S2`.*
- **`BG-US-2`** — As a reporter facing the *Choose Creation Method* fork, I want to know what each option does, so that I pick the right one instead of guessing. *Refines `US-S1`.*
- **`BG-US-3`** — As a reporter whose draft will not save, I want to know what *Save draft* does and what its messages mean, so that I can fix the problem myself. *Refines `US-S5`.*
- **`BG-US-4`** — As a Center onboarding lead, I want an offline artifact I can email before a reporter has an account, so that training does not depend on live access. *Refines `G1`.*

---

## 6. Functional Requirements

### Required (MUST)

- **`BG-R-1`** The deliverable MUST be a single PDF containing, in order: cover, introduction, table of contents, the ~18 sections of `proposal.md` §4, and a glossary — entirely in U.S. English.
- **`BG-R-2`** The guide MUST document the manual path end to end: Center workspace → project catalog → setup drawer (Primary Science Program, creation method) → manual form → editor → Save draft → AI quality check → Submit for review.
- **`BG-R-3`** The guide MUST include a pipeline-produced capture of **each** of the six editor sections, including *Type-specific details*, and MUST state that *Type-specific details* is absent for result types 4 (Other Outcome) and 8 (Other Output).
- **`BG-R-4`** The guide MUST include pipeline-produced captures of the setup drawer's Primary Science Program step, its *Choose Creation Method* step, and the manual form.
- **`BG-R-5`** The guide MUST include a section contrasting *AI-Assisted* with *Complete the Form Manually*, stating what each does and when to prefer it, and pointing at My Drafts / AI Draft Results.
- **`BG-R-6`** Every section that describes a screen MUST carry at least one capture with labelled callouts on the elements the narrative names; each callout's anchor MUST resolve to **exactly one** element at capture time, and the run MUST fail loudly otherwise.
- **`BG-R-7`** The capture run MUST be read-only: it MUST NOT submit a result, MUST NOT trigger a billable AI assessment, and MUST NOT issue any non-idempotent request to the PRMS API. This MUST be enforced by the tooling, not by operator discipline.
- **`BG-R-8`** No capture may show a skeleton or loading state, and every capture MUST fall within declared dimension bounds — no degenerate frame (the 1280×720 and 1280×186177 failures of the W1/W2 run MUST NOT recur).
- **`BG-R-9`** The guide's typography and color MUST be derived from the application's own stylesheets (`fonts.scss`, `colors.scss`), NOT from `docs/ux-ui/design.md` §7, whose typography entry is known stale and whose correction is pending (§4.1 claim 12).
- **`BG-R-10`** The archived W1/W2 spec folder MUST be byte-identical before and after this work.
- **`BG-R-11`** The whole document MUST regenerate from a refreshed local instance with one command, with no manual image editing.
- **`BG-R-12`** Status vocabulary in the guide MUST match what the bilateral UI actually paints (Editing · Pending review · Approved · Rejected), and MUST NOT present the PRD/TRD three-step lifecycle as what the reporter will see (§4.1 claims 10–11).
- **`BG-R-13`** No token, credential, or secret may be logged, echoed, committed, or embedded in the PDF — per `.cursorrules` and `docs/trd/trd.md` §8.
- **`BG-R-14`** The capturer MUST accept declarative pre-capture steps per route, so a state reachable only by interaction can be captured; a step whose selector is missing or non-unique MUST fail the run rather than capture a wrong screen.
- **`BG-R-15`** Every factual statement the guide makes about the product MUST be traceable to a primary source (code, route table, or the app as rendered) — not to a UI label read from a screenshot, and not to the in-app tour's wording alone.

### Scenarios for the two requirements that carry the most risk

The acceptance table in §9 states Given/When/Then for every AC. These two are written out in full because their **negative** clauses are the whole point of the requirement.

#### Requirement: Read-only capture (`BG-R-7`)

The tooling SHALL complete a full capture run without writing any data to PRMS.

##### Scenario: A capture run drives the drawer and the editor rail

- GIVEN a reporter session on a bilateral result that already exists
- WHEN the capture run opens the setup drawer, selects a Science Program and a creation method, and then clicks through all six editor rail sections
- THEN every planned capture is produced
- AND `dist/capture-requests.log` records the method and origin of every request
- BUT it must NOT issue any `POST`, `PATCH`, `PUT` or `DELETE` to any origin outside the inert allowlist
- BUT it must NOT click *Create* in the manual form, which would call `POST_createBilateralHeader`
- BUT it must NOT click *Submit for review*, which would call `POST_bilateralQualityAssessment` — a billable assessment
- AND IT MUST abort the entire run, not skip the request, the first time a disallowed method is attempted
- AND IT MUST be enforced by the tooling itself, so that an operator who forgets the rule still cannot write

##### Scenario: A disallowed request is attempted

- GIVEN the read-only guard is installed on the browser context before `injectAuth()`
- WHEN any step causes a non-GET request to a non-allowlisted origin
- THEN the run exits non-zero naming the method, origin, path and route id
- AND IT MUST NOT be remedied by widening the allowlist to make the run pass — that path re-specifies the design instead

#### Requirement: All six editor sections captured and correctly labelled (`BG-R-3`)

The guide SHALL contain one pipeline-produced capture per editor section, each captioned with the section it actually shows.

##### Scenario: The editor is opened and every section captured

- GIVEN a pre-existing bilateral result whose type is neither 4 (Other Outcome) nor 8 (Other Output)
- WHEN the capture run lands on the editor and then clicks each rail entry in turn
- THEN six captures exist — General information, Overview, Contributors & partners, Geographic location, Evidence, Type-specific details
- AND the guide states that Type-specific details is absent for result types 4 and 8
- BUT the landing capture must NOT be captioned *Overview*: the editor opens on **General information** (`openSectionName` defaults to `'general-info'`), so Overview is reached only by clicking its rail entry
- AND IT MUST verify each caption against the rendered `[data-testid="bilateral-section-heading"]` text, because a wrong caption over a real screenshot is defect class D8 and has no other automated gate

### Should (SHOULD)

- **`BG-R-20`** Where the guide describes an element the in-app tour already describes, it SHOULD reuse the tour's approved wording rather than inventing a second voice, so tour and guide do not drift.
- **`BG-R-21`** The guide SHOULD feature one Center and one multi-Science-Program project consistently throughout, so screenshots form a coherent worked example.
- **`BG-R-22`** The copied tooling SHOULD stay byte-identical to its source except `routes.config.json`, `content/`, `dist/` and the `BG-R-14` addition, so a future promotion to shared tooling remains a mechanical diff.

### Could (MAY)

- **`BG-R-30`** The guide MAY cross-reference the W1/W2 guide for reporters who report both funding streams.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security** | No secret in logs, output, or git (`BG-R-13`). `.env` stays gitignored. The injected JWT is never printed, not even a substring. |
| **Safety / side effects** | Zero writes to PRMS during capture (`BG-R-7`). Verified by an interception log, not by inspection. |
| **Reproducibility** | `npm run build-guide` regenerates cover→glossary with no manual steps (`BG-R-11`). |
| **Accessibility** | Callout labels MUST NOT be the sole carrier of meaning — narrative text states each step, so the guide remains usable when images are unavailable. Contrast of callout chips over captures is a **visual** property; see §8 *Defect classes* for its gate. |
| **Portability** | Tooling runs against the bundled Chromium or a system Chrome channel (`PLAYWRIGHT_CHANNEL`), since the bundled CDN was unreachable during the W1/W2 run. |
| **Maintainability** | Content lives in per-section markdown + one JSON route config; adding a section requires no code change. |
| **Internationalization** | Out of scope — U.S. English only (`BG-R-1`). |
| **Backwards compatibility** | No product, payload, or API surface touched; `AC-4` not engaged. |

---

## 8. Defect Classes And Their Gates

**The dominant defect class of this spec is a plausible-but-false sentence or a misleading screenshot — and neither has an automated gate.** Naming that plainly is the point of this section: a spec whose verification is "the build exits 0" has a gate for its rarest defect and none for its most likely.

| # | Defect class | Gate | Automated? |
|---|---|---|---|
| D1 | Side-effecting capture (a result submitted, a billable assessment triggered) | Request-interception allowlist: the run aborts on any non-GET to the PRMS API, and the log is an artifact (`BG-AC-7`) | **Yes** |
| D2 | Degenerate frame / skeleton visible | Per-capture dimension bounds + the existing skeleton gate; run exits non-zero (`BG-AC-8`) | **Yes** |
| D3 | Anchor resolves to 0 or 2+ elements | Existing `count() === 1` guard, extended to pre-capture steps (`BG-AC-6`) | **Yes** |
| D4 | Broken document structure (TOC anchor unresolved, orphaned caption, missing section) | `verify-structure.ts` | **Yes** |
| D5 | Wrong typeface or color in the rendered guide | Assert the resolved font stack and token values against `fonts.scss`/`colors.scss` (`BG-AC-9`) | **Yes** |
| D6 | Archived W1/W2 spec mutated | `git diff --quiet -- docs/specs/archive/2026-09-16-changes--user-guide-pdf/` (`BG-AC-10`) | **Yes** |
| D7 | Secret leaked into log, output, or git | Grep audit over tooling output and the staged diff; `.gitignore` assertion (`BG-AC-13`) | **Yes** |
| D8 | **Screenshot contradicts its narrative** (e.g. text says "multiple Science Programs", the capture shows one) | **No automated check.** Substitute: **human check at the HITL pause** on every capture, plus a **T6 Multimodal** visual review of the assembled PDF. Per `KZ-changes--user-guide-pdf-1`, the Leader measures and *views* each artifact before spawning the text-only Reviewer | **No — substituted** |
| D9 | **Plausible-but-false prose** (an instruction that does not match the product) | **No automated check.** Substitute: `BG-R-15` forces every claim to a primary source at authoring time, and the HITL read is the acceptance gate | **No — substituted** |
| D10 | Callout-chip contrast over a capture | **No automated check** — `axe` cannot evaluate contrast over a rasterized image. Substitute: the same T6 visual review as D8 | **No — substituted** |
| D11 | Guide copy drifts from the in-app tour | **Accepted risk.** `BG-R-20` reduces it; nothing detects it later. The tour has already grown from 7 steps to 10 with no guide to keep in step | **No — accepted risk** |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BG-AC-1` | The finished `dist/` PDF | It is opened | It contains cover, introduction, TOC, the ~18 sections in the `proposal.md` §4 order, and a glossary, all in U.S. English. |
| `BG-AC-2` | The assembled guide | The manual path sections are read in order | Every step from Center workspace to Submit for review is covered with no gap a reporter must guess. |
| `BG-AC-3` | A result whose type is neither 4 nor 8 | The editor captures run | Six captures exist, one per rail section, including *Type-specific details*; the narrative states when that section is absent. |
| `BG-AC-4` | A project aligned to two or more Science Programs | The drawer captures run | Three captures exist: Primary Science Program step, *Choose Creation Method* step, manual form. |
| `BG-AC-5` | The assembled guide | The AI-Assisted section is read | It states what each creation method does, when to prefer each, and where AI drafts appear. |
| `BG-AC-6` | A route config whose anchor matches 0 or 2+ elements | `npm run capture` runs | The run exits non-zero naming the offending selector, and writes no capture for that route. |
| `BG-AC-7` | A full capture run | It completes | The interception log shows **zero** non-GET requests to the PRMS API; no `result-review-history` row and no assessment record was created. A run that issues one aborts. |
| `BG-AC-8` | Any produced capture | Dimensions and content are checked | Width and height fall within declared bounds and no visible skeleton is present; otherwise the run exits non-zero. |
| `BG-AC-9` | The rendered guide HTML | Fonts and tokens are resolved | The body font stack and token values match `fonts.scss`/`colors.scss` as read at build time — **not** `design.md` §7's Poppins entry. |
| `BG-AC-10` | The worktree after the work | `git diff -- docs/specs/archive/2026-09-16-changes--user-guide-pdf/` runs | Output is empty. |
| `BG-AC-11` | A refreshed local instance | `npm run build-guide` runs | The complete PDF is produced with no manual image editing. |
| `BG-AC-12` | The status section and glossary | They are read | They present Editing · Pending review · Approved · Rejected as the reporter's vocabulary, and do not assert the PRD/TRD three-step lifecycle as the visible one. |
| `BG-AC-13` | Tooling output, the PDF, and the staged diff | A secret audit runs | No token, credential, email-password pair, or `.env` content appears in any of them. |
| `BG-AC-14` | A pre-capture step whose selector is missing or non-unique | The capture runs | The run fails naming the step and route, rather than capturing whatever is on screen. |
| `BG-AC-15` | Any factual sentence in the guide | It is traced | It maps to a primary source (code, route table, or rendered app), not to a screenshot label or the tour's wording alone. |

Cross-cutting project ACs already applying — referenced, not restated: `AC-9` (security and secrets). `AC-2` is referenced as **divergent from the bilateral UI** (§4.1 claim 11) and is the subject of `BG-OQ-4`.

---

## 10. Dependencies & Assumptions

### Upstream dependencies

- **PRODUCTION — `https://reporting.cgiar.org`** (operator decision, 2026-09-21). This **supersedes** the original dependency, which read "the worktree's own client, running per `docs/infrastructure.md` §6" (i.e. `localhost:4200`). Captures run against the live app with a real reporter identity. Precedent: the W1/W2 guide was also captured against production. **Material difference:** that guide only *navigated URLs*; this one **clicks** — drawer, rail, and a `fill` into a real form. The `BG-T-3` read-only guard therefore stops being a precaution and becomes the load-bearing control, and it has never been exercised against real traffic.
- A real, previously-issued JWT for a Center reporter with bilateral access, plus that user's id/email — both `localStorage` keys are required, or the session builds half-formed and read-only.
- `PLAYWRIGHT_CHANNEL=chrome` where the bundled Chromium cannot be fetched.
- The tooling's own `node_modules` (separate from the client's symlinked tree).

### Downstream consumers

- None in software. The consumer is a human reader; the distribution channel is `BG-OQ-3`.

### Assumptions

- `A1` — The archived tooling runs unmodified against the current app apart from route config. *If false:* the copy needs repair before content work; `BG-T-2` settles it first.
- `A2` — A multi-Science-Program bilateral project with reportable results exists in the target environment. *If false:* `BG-R-4`/`BG-AC-4` cannot be satisfied as written and the drawer narrative must change.
- `A3` — A result already carrying a quality assessment exists, or the dialog can be opened without deciding. *If false:* `BG-OQ-2` resolves to describing the dialog in prose instead of capturing it.
- `A4` — The active bilateral specs touching the quality-check surface (`qa-ai-traffic-light`, `qa-ai-verdict-drawer`) do not land mid-execution. *If false:* that section's captures go stale on arrival.

---

## 11. Open Questions — Resolutions

All six carried from `proposal.md` (`OQ-BG1`–`OQ-BG6`). **Five are resolved here** under the operator's standing order to decide with the recommended option; the sixth needs facts only the operator holds and is the single question round.

| ID | Resolution | Basis |
|---|---|---|
| `BG-OQ-2` | **Use a result that already carries a quality assessment** (option a). Fallback: **prose, no capture** (option c). **Option (b) — "open the dialog and abandon it" — is struck as unsafe.** | Verified at source: `isDialogOpen = computed(() => this.isRunning() \|\| this.state() === 'deciding' \|\| this.isSubmitting())` (`bilateral-quality-assessment-ui.service.ts:51`) — the dialog is *derived from* the run state, so it cannot be open unless the assessment is already running. That run is `POST_bilateralQualityAssessment` (`bilateral-api.service.ts:235`), the billable call `BG-R-7` forbids. By contrast `loadLatest()` (`:88`) reads `GET_bilateralQualityAssessmentLatest` (`:239`) — a GET — so an already-assessed result paints its rail verdict card with no write. |
| `BG-OQ-3` | **Distribution stays as for W1/W2**: a file handed out. No in-app surfacing in this spec. | Keeps scope to the deliverable asked for; in-app surfacing is a client change, which §4.3 excludes. |
| `BG-OQ-4` | **The guide teaches what the UI paints** — Editing · Pending review · Approved · Rejected — as already fixed by `BG-R-12`. The PRD/TRD divergence is **not** silently absorbed: it is recorded as a follow-up drift report, out of scope here. | `docs/prd.md` AC-2 and `docs/trd/trd.md` §5 W1 both state a three-step lifecycle; `bilateral-query-params.ts` and `bilateral-page-header.component.ts:200-204` show seven values and four painted badges (§4.1 claims 10–11). A user guide that taught the doc would teach a screen the reporter never sees. |
| `BG-OQ-5` | **Out of scope; recorded as a follow-up proposal.** `BG-R-20` (reuse the tour's wording) is the only coupling this spec accepts. | Changing `bilateral-tour.service.ts` is product code, excluded by §4.3. Defect class **D11** already carries the drift as an accepted risk. |
| `BG-OQ-6` | **No.** The W1/W2 guide gains no cross-reference. | It would mean regenerating an archived artifact and re-verifying a signed-off deliverable — the exact risk `BG-DD-1` and `BG-R-10` exist to avoid. `BG-R-30` stays a MAY and is not exercised. |
| `BG-OQ-1` | **RESOLVED (operator, 2026-09-21).** Centre and project: **`Bioversity (Alliance)` + `B-A1368`** (multi-SP, SP01 80% / SP13 20%). Environment: **production**, `https://reporting.cgiar.org`. Credential: a reporter JWT supplied directly into `tooling/.env` (mode 600, gitignored, never echoed). | The Centre/project choice was recommendable from the supplied screenshot and is now fixed. Which environment to shoot and the credential for it are not derivable from the repository. Owned by `BG-T-8`; **blocks `BG-T-7` onward only** — `BG-T-1`…`BG-T-6` need no environment and are cleared to run. |

**Gating status:** `BG-OQ-1` is **fully closed**; `BG-T-7` onward are unblocked as of 2026-09-21. `BG-OQ-2` is resolved to *investigate, then fall back to prose* (operator, 2026-09-21) — `BG-T-11` searches for an already-assessed result and takes option (c) if none exists. The other four are closed.

## 12. Requirement ID Index

| ID | Strength | Summary | ACs | Defect classes |
|---|---|---|---|---|
| `BG-R-1` | MUST | Single PDF, cover→glossary, U.S. English | `BG-AC-1` | D4 |
| `BG-R-2` | MUST | Manual path documented end to end | `BG-AC-2` | D9 |
| `BG-R-3` | MUST | All six editor sections captured | `BG-AC-3` | D3, D8 |
| `BG-R-4` | MUST | Drawer + manual form captured | `BG-AC-4` | D3, D8 |
| `BG-R-5` | MUST | AI-Assisted contrast section | `BG-AC-5` | D9 |
| `BG-R-6` | MUST | Labelled callouts, unique anchors | `BG-AC-6` | D3, D10 |
| `BG-R-7` | MUST | Read-only capture, enforced | `BG-AC-7` | D1 |
| `BG-R-8` | MUST | No skeletons, no degenerate frames | `BG-AC-8` | D2 |
| `BG-R-9` | MUST | Fonts/colors from stylesheets, not `design.md` §7 | `BG-AC-9` | D5 |
| `BG-R-10` | MUST | Archived W1/W2 spec untouched | `BG-AC-10` | D6 |
| `BG-R-11` | MUST | One-command regeneration | `BG-AC-11` | D4 |
| `BG-R-12` | MUST | Status vocabulary matches the UI | `BG-AC-12` | D9 |
| `BG-R-13` | MUST | No secret leaked | `BG-AC-13` | D7 |
| `BG-R-14` | MUST | Declarative pre-capture steps, fail-loud | `BG-AC-14` | D3 |
| `BG-R-15` | MUST | Every claim traceable to a primary source | `BG-AC-15` | D9 |
| `BG-R-20` | SHOULD | Reuse the tour's approved wording | — | D11 |
| `BG-R-21` | SHOULD | One consistent worked example | `BG-AC-4` | D8 |
| `BG-R-22` | SHOULD | Copy stays a mechanical diff | `BG-AC-10` | D6 |
| `BG-R-30` | MAY | Cross-reference the W1/W2 guide | — | — |

---

## Required cross-references

- `docs/prd.md` — G1; §3 *Result submitter*; §6 `US-S1`, `US-S2`, `US-S5`; §7 `AC-2`, `AC-9`.
- `docs/ux-ui/design.md` — §3 F1; §6 *Drawers and modals*; §7 *Design tokens*; §8 *PRMS Form UX Pattern*; `DD-6` (`:438-440`).
- `docs/trd/trd.md` — §2 client `bilateral` (`:192`); §5 W1 (`:319-324`); §5 W10 (`:374-380`); §6 *Tooling*; §8 *Secret handling* (`:491-495`).
- `onecgiar-pr-client/CLAUDE.md` — custom `auth` header, API base URLs.
- `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` — tooling source and prior design decisions.
- `docs/specs/kaizen/changes--user-guide-pdf.md` — lessons `KZ-changes--user-guide-pdf-1`/`-2`, pending `P3`/`P5`.
