# Proposal: W3/Bilateral Manual Reporting — End-User PDF Guide

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/w3-bilateral-user-guide` |
| Slug | `w3-bilateral-user-guide` — derived from free-text argument (the request was a paragraph: "otra guía muy parecida para el reporte manual de bilaterales … la necesitamos para W3/Bilaterals") |
| Type | Change |
| Approval Mode | pre-approved — standing user mandate ("pragmatic AKILI" default since 2026-09-02). HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG` and destructive actions still stop for the user regardless of mode |
| Parent Spec | none — one bounded deliverable (see §5 *Scope Chunking Decision*) |
| Depends on | none |
| Parallel-safe | yes — touches only `docs/specs/changes/w3-bilateral-user-guide/**`; no shared module, migration or API contract |
| Worktree | `/Users/jcadavid/Development/worktrees/onecgiar_pr/w3-bilateral-user-guide` (branch `feat/w3-bilateral-user-guide`, based on `qa-development-2026` @ `96b891ca3`) |
| Sibling spec | `changes/user-guide-pdf` — archived at `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` (W1/W2 guide, 19 pages) |
| Author context | Requested via `/akili-propose`, 2026-09-21 |

---

## 2. Intent

Produce a **second end-user PDF guide**, the W3/Bilateral counterpart to the delivered W1/W2 guide, that walks a Center reporter through **reporting a bilateral result manually**, end to end — from finding the project in the catalog to submitting the result for review — and closes with a section explaining **when to use the AI-Assisted path instead**.

The Playwright→PDF pipeline built for the W1/W2 guide is reused; the new work is bilateral routes, bilateral content, and one capability the pipeline does not have yet (driving clicks before a capture).

## 3. Problem / Current Behavior

- **The delivered guide covers no bilateral surface at all.** Its capture config declares exactly six routes — `home`, `overview`, `reporting-aows`, `results-list`, `notifications-received`, `ipsr-innovation-list` — all under `result-framework-reporting`, `result` and `ipsr`; `grep -c "bilateral" docs/specs/archive/2026-09-16-changes--user-guide-pdf/tooling/routes.config.json` → `0` (run 2026-09-21).
- **The in-app tour explains the workspace but stops at the door of the form.** `bilateral-tour.service.ts` (281 lines) defines 10 driver.js steps anchored on `[data-guide]` hooks, covering Center identity, the four tabs, Overview & burndown, the Reporting hub, KPI cards, the project card, *Create result from project*, the Results registry, AI Draft Results and the Bulk Results Uploader (`onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-tour.service.ts:75-159`). **Its last word on manual reporting is "begin reporting deliverables"** (`:132`) — nothing covers the setup drawer, the manual form, or any of the editor's six sections. That is precisely the stretch a reporter needs help with, and it is unwritten.
- **The manual reporting states are not reachable by URL.** The bilateral child routes are `overview`, `home`, `create`, `result/:id`, `drafts`, `drafts/:draftId`, `results` (`onecgiar-pr-client/src/app/shared/routing/routing-data.ts`, `BilateralRouting`). The editor reads only `phase` and `job` from the query string (`bilateral-result-creator.component.ts:555,567,594`) — **there is no `section` query param**, so the six sections are selected by clicking the rail (`selectSection()`/`moveSection()`), and the "Set up bilateral result" drawer is opened by clicking *Create result* on a project card. Neither is addressable.
- **The capture pipeline never clicks.** `capture.ts`'s documented flow is `goto -> wait readySelector -> skeleton gate -> annotate.ts -> screenshot -> remove overlay` (`docs/specs/archive/2026-09-16-changes--user-guide-pdf/tooling/src/capture.ts:13`). `clickTarget` is an *annotation anchor* — the element the callout points at — and is never actuated (`:28-32`, `:88-91`). So today the pipeline can photograph only what a bare URL renders.
- **`docs/ux-ui/design.md` §7 still names Poppins as the body font**, but the app was measured on 2026-09-15 as `Manrope, Poppins, sans-serif`; the correction is an *unapplied* pending standardization (`docs/specs/kaizen/changes--user-guide-pdf.md` → Pending Items P5, `Status: pending`). A new guide that trusts §7 will render in the wrong typeface.

## 4. Proposed Outcome

One downloadable PDF — *"PRMS W3/Bilateral Reporting — User Guide"* — in U.S. English, matching the W1/W2 guide's visual system, structured as:

| # | Section | Primary surface |
|---|---|---|
| 1 | Introduction — what W3/Bilateral reporting is, who this guide is for | — |
| 2 | The Bilateral Center workspace — identity band and the four tabs | `/bilateral/<acr>/home` |
| 3 | Finding your project — catalog, quick filters, KPI cards, card anatomy | `/bilateral/<acr>/home` |
| 4 | Starting a result — the *Set up bilateral result* drawer, Primary vs Contributing Science Programs | drawer, step 1 |
| 5 | **Choosing how to report — AI-Assisted vs Complete the Form Manually** | drawer, step 2 |
| 6 | The manual form — level, type, title (30-word gauge, uniqueness check), Knowledge Product handle | drawer, manual form |
| 7 | The editor at a glance — section rail, *N of M sections complete*, Back/Next/Save draft footer | `/bilateral/<acr>/result/<code>` |
| 8–13 | One section each: **Overview · General information · Contributors & partners · Geographic location · Evidence · Type-specific details** | editor rail |
| 14 | Saving your work — Save draft, "N fields missing", what the error messages mean | editor footer |
| 15 | The AI quality check and Submit for review | rail + dialog |
| 16 | The AI-Assisted path, and when to prefer it — My Drafts / AI Draft Results | `/bilateral/<acr>/drafts` |
| 17 | Result statuses — Editing · Pending review · Approved · Rejected | `/bilateral/<acr>/results` |
| 18 | Glossary | — |

Every section pairs plain-language narrative with **annotated screenshots** captured from the running app, with labelled callouts marking exactly where to click — the `UG-R-21` callout style already delivered for W1/W2.

Section order follows the reporter's actual path, so the document doubles as a checklist.

## 5. Scope

- One PDF plus its regenerable source, under `docs/specs/changes/w3-bilateral-user-guide/tooling/`.
- **Tooling copied, not shared** (user decision, 2026-09-21): `src/` and `template/` are copied verbatim from the archived W1/W2 spec; the new spec gets its own `routes.config.json`, `content/` and `dist/`. The archived W1/W2 spec and its PDF are **not touched**.
- One capability added to the copied `capture.ts`: a declarative per-route **`steps`** array (click / wait / press) executed after `goto` and before annotation, so drawer and rail states can be reached. Read-only actions only.
- **17** captures across the surfaces in §4 (count fixed by `design.md` §8.1; this section originally estimated ~14), using the existing `[data-guide]` (11 anchors) and `[data-testid]` (~20 in the creator/editor) hooks as annotation selectors instead of the brittle text/`:nth-of-type` selectors the W1/W2 config relied on.
- A bilateral glossary: W3/Bilateral, Primary vs Contributing Science Program, Outcome vs Output, the seven result types, MDS, Knowledge Product handle, AI draft, result status vocabulary.
- U.S. English only.

### Scope Chunking Decision

**Do not chunk.** One narrative arc, one TOC, one glossary, one visual system — the same reasoning the W1/W2 proposal recorded, and it held. The AI-Assisted section (§4 #16) is a two-page contrast inside the manual story, not a second guide; if it later grows into full AI-path coverage (upload, extraction, promotion), that is its own proposal.

## 6. Non-Goals

- **No product code changes.** Nothing under `onecgiar-pr-client/src` or `onecgiar-pr-server/src` is modified. If a capture needs a missing anchor, that is reported, not patched here.
- No edit to the archived W1/W2 spec, its tooling, or its PDF.
- No shared/promoted tooling refactor — explicitly declined by the user in favor of the copy.
- No changes to `bilateral-tour.service.ts`; aligning the in-app tour with this guide is a separate concern (§12 OQ-BG5).
- No coverage of bilateral **review/QA** (`result-framework-reporting/pages/bilateral-review`) — that is the reviewer's job, a different audience.
- No Bulk Results Uploader walkthrough — it is an external tool behind a CTA (`bilateral-page-header.component.ts:273-276`); it gets a pointer, not a chapter.
- No localization, no in-app help widget, no CI regeneration job.
- No automatic staleness detection — the guide reflects the UI at capture time.

## 7. Affected Users, Systems, And Specs

- **Primary audience: the Result submitter persona** — "Initiative / Center staff … capture results quickly, attach evidence, align ToC, mark partners and geography" (`docs/prd.md` §3). This is a closer persona fit than the W1/W2 guide had, where the audience ("P/A lead") had to be mapped onto *PMU / portfolio lead* and left an open question behind.
- **User stories served:** `US-S1` (typed result, required common fields), `US-S2` (type-specific sections), `US-S5` (explicit save with clear error messages) — `docs/prd.md` §6.
- **Systems touched:** none in production. Documentation artifact plus dev-only Playwright tooling, consistent with `DD-6` as amended (`docs/ux-ui/design.md:438-440` — bilateral now has a first-party PRMS UI).
- **Related specs:** `changes/user-guide-pdf` (archived — tooling source); `bilateral/guided-tour` (archived — the `[data-guide]` anchors and the approved tour copy); active `bilateral/*` specs (`ai-draft-evidence-promotion`, `bulk-uploader-handoff`, `qa-ai-traffic-light`, `qa-ai-verdict-drawer`, `webhook-external-platforms`) — the last three can move the AI quality-check surface this guide photographs (§12).

## 8. Visual Reference

- **Source:** None (no Figma/mockup) — the guide's visual content **is** the live application, captured via Playwright, exactly as for W1/W2.
- **Location:** the running client for the worktree; user-supplied screenshot of the *Set up bilateral result* drawer (`B-A1368`, SP01 80% / SP13 20%, both creation-method cards visible) as the reference state for §4 #4–5.
- **Notes:** the guide's own chrome (cover, dividers, TOC, glossary) is the copied `template/guide.html` + `guide.css`, already token-based. No new tokens. ⚠️ Typography must be read from `fonts.scss`, not from the stale `design.md` §7 (see §3, kaizen P5).

## 9. Requirement Delta Preview

### ADDED Requirements

- A new PDF artifact, *"PRMS W3/Bilateral Reporting — User Guide"*, covering the 18 sections in §4 with cover, intro, TOC, labelled annotated screenshots and glossary, in U.S. English.
- A new bilateral `routes.config.json` (**17** entries) whose annotation selectors are the existing `[data-guide]`/`[data-testid]` hooks.
- New `content/` — intro, ~17 section narratives, bilateral `glossary.json`.
- **A per-route `steps` array in the copied `capture.ts`** — declarative, read-only interactions (click, wait-for, press) run between `goto` and annotation, so drawer and rail states become capturable. Each step fails loud on a non-unique or missing selector, matching the existing `count() === 1` discipline.

### MODIFIED Requirements

- None in the product, and none in the archived spec. The `capture.ts` change lands **only in this spec's copy**; the W1/W2 pipeline keeps its current behavior, which is what the copy decision bought.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-offs |
|---|---|---|
| **A — Copy the tooling and teach the capturer to click (recommended)** | Copy `src/` + `template/`; add a declarative `steps` array to the copied `capture.ts`; drive the drawer (Create result → SP → creation method → manual form) and the editor rail (six sections) as read-only click sequences; annotate on `[data-guide]`/`[data-testid]`. | The only option that photographs the states the guide is *about*. Cost is one bounded, well-understood change to a file that already has the right shape (per-route config, unique-selector guards). Adds the duplication debt the user accepted. |
| **B — Copy the tooling unchanged; capture only URL-reachable states** | Capture `home`, `overview`, `results`, `drafts`, `result/:id` (Overview section only); describe the drawer, the manual form and the five other sections in prose, or paste hand-made screenshots. | Cheapest, and it fails the brief. Roughly 10 of 17 captures are unreachable, including the drawer in the user's own screenshot. Hand-pasted images are exactly the non-reproducible drift the W1/W2 spec rejected as Option B. |
| **C — Extend the in-app driver.js tour instead of writing a PDF** | Add steps to `bilateral-tour.service.ts` covering the drawer, the form and the editor sections. | Genuinely valuable and probably worth doing *someday* — but it is a different deliverable (product code, in-app, no offline artifact), it is an explicit non-goal here, and it cannot be emailed to a reporter who has not logged in yet. Worth raising as a follow-up, not as this spec. |

### Recommended Approach

**Option A.** The reusable 80% — `annotate.ts`, `assemble.ts`, `verify-structure.ts`, `pdf.ts`, `tokens.ts`, `auth.ts`, the template (≈2,800 lines total) — carries over untouched and already solved the hard, expensive problems: token-accurate styling, labelled callouts, the skeleton-readiness gate, per-route viewports, structure verification. The genuinely new work is **content plus one capability**, and that capability is small because the pipeline is already per-route and config-driven.

The smallest safe path: copy the tooling → add `steps` and prove it on the single hardest capture (the manual form inside the drawer, three clicks deep) → only then write the remaining routes and the narrative.

## 11. Risks, Dependencies, And Open Questions

**Risks**

- ⚠️ **Two capture targets mutate data, and must not fire.** *Submit for review* issues a real PATCH, and the AI quality check runs a real assessment: `submitResult()` no longer submits directly — it calls `qualityAssessment.run()`, and the PATCH carries `assessment_id` + `decision`, which the server requires (`bilateral-result-creator/CLAUDE.md`). A naive click sequence would submit somebody's result or burn AI credits. §15's screenshots must come from a result **already assessed**, or from opening the dialog without deciding — settled at specify time, never by clicking Submit. This is the single most dangerous step in the spec.
- **The capture needs a specific data shape.** Step 1 of the drawer ("This project contributes to multiple Science Programs") is only meaningful for a **multi-SP project** — `B-A1368` with SP01 80% / SP13 20% in the user's screenshot. A single-SP project may skip the step entirely, and the screenshot would then contradict the narrative. The guide also needs at least one result per status for §17 and at least one AI draft for §16.
- **LOC and review-round budgets will under-count — this is a known High-severity pattern.** `KZ-REH-1` is at its **fifth** recurrence, raised to High in `changes--user-guide-pdf.md` P3; the W1/W2 guide estimated 650–850 LOC / 2 review rounds and delivered ~2,000 LOC / 9 rounds with the tripwire firing. Reuse removes the pipeline cost but **this guide has ~18 sections against W1/W2's 6**, so content is larger, not smaller. Size the budget from content volume and pre-agree the tripwire response at specify time.
- **Rendered-output defects pass text-only review.** `KZ-changes--user-guide-pdf-1`: three defects (720-px frames, a 186,177-px frame, an orphaned caption) got through because the Reviewer has `Read`/`Grep`/`Glob` only. Every visual DoD here needs the Leader to measure the artifact and view it before the Reviewer is spawned. Expect browser-shaped review rounds (`KZ-changes--sp-shell-app-viewport-1`).
- **Copy will drift from the in-app tour.** The tour's 10 steps already say things about the same screens, in approved English. Reuse that wording where it fits rather than inventing a second voice; note that the tour has grown from the 7 steps its kaizen recorded to 10, so it drifts too.
- **Status vocabulary is genuinely inconsistent across the baseline.** `docs/prd.md` AC-2 states transitions are `Editing (1) → Quality Assessed (2) → Submitted (3)`, but the bilateral surfaces use a seven-value table — `editing 1 · qa 2 · submitted 3 · discontinued 4 · pending 5 · approved 6 · rejected 7` (`bilateral-query-params.ts`) — and the page header renders badges for **Editing · Pending review · Approved · Rejected** only (`bilateral-page-header.component.ts:200-204`). §17 must teach what the reporter actually sees; which document is authoritative is OQ-BG4.
- **Duplication debt, accepted knowingly.** Two copies of ~2,800 lines: a pipeline bug now needs two fixes. Mitigation: keep the copy byte-identical except `routes.config.json`, `content/` and the `steps` addition, so a future promotion to shared tooling stays a mechanical diff.
- **Active bilateral specs can move the target.** `qa-ai-traffic-light` and `qa-ai-verdict-drawer` touch the very quality-check surface §15 photographs; capturing before they land buys a stale page.
- **Secrets discipline.** The pipeline authenticates by injecting a real JWT plus the `user` object into `localStorage` (`tooling/src/auth.ts`). `.env` stays gitignored; per `.cursorrules` the token is never logged, echoed or committed — not even a substring.

**Dependencies**

- The worktree's own client running per `docs/infrastructure.md` §6, reachable and pointed at a database with the data shape above.
- A real, previously-issued JWT for a Center reporter with bilateral access (`TEST_TOKEN`), plus that user's id/email for the injected `user` object.
- `PLAYWRIGHT_CHANNEL=chrome` — the bundled Chromium CDN was unreachable in this environment during the W1/W2 run.
- `node_modules` for the tooling is a separate install from the client's (the worktree symlinks the client/server ones; the tooling has its own `package.json`).

**Open Questions**

- **OQ-BG1** — Which Center and project should the guide feature throughout? `Bioversity (Alliance)` + `B-A1368` (multi-SP, matches the supplied screenshot) is the natural default; confirm it is acceptable to show in a distributed document, and confirm the target environment (the screenshot is a TEST banner).
- **OQ-BG2** — How should §15 photograph the AI quality check and Submit for review **without** submitting a result or triggering a billable assessment? Options: a result already assessed, a dialog opened and abandoned, or omit the dialog and describe it. Needs a decision before any capture of that surface.
- **OQ-BG3** — Distribution: is this emailed/handed out like the W1/W2 PDF (which reached the user's `~/Downloads`), or should it be surfaced in-app? The W1/W2 equivalent (`OQ-UG3`) was never closed.
- **OQ-BG4** — Which status vocabulary is authoritative for end-user documentation: PRD AC-2's three transitions, or the seven-value bilateral table the UI actually uses? Affects §17 and the glossary.
- **OQ-BG5** — Should the gaps this guide fills also be added to the in-app tour (Option C as a follow-up proposal), so tour and PDF tell one story?
- **OQ-BG6** — Does the W1/W2 guide need a cross-reference to this one (and vice versa), given a Center reporter may report both W1/W2 and W3 results? Adding it to W1/W2 would mean regenerating an archived artifact — out of scope here unless requested.

## 12. Success Criteria

- One PDF exists containing cover, introduction, TOC, the 18 sections of §4 in order, and a bilateral glossary — entirely in U.S. English.
- Every section that describes a screen carries at least one screenshot **captured by the pipeline** (not hand-made), with labelled callouts on the elements the narrative names.
- The drawer states, the manual form and **all six** editor sections are captured from the real app — proving the `steps` capability works, which is the whole technical bet of Option A.
- No screenshot shows a skeleton/loading state, and no frame is degenerate (the 720-px and 186,177-px failures of the W1/W2 run do not recur); the Leader records measured dimensions as evidence before review.
- Colors and typography match the app as measured from `fonts.scss`/`colors.scss` — not from the stale `design.md` §7.
- **No result is submitted, and no billable AI assessment is triggered, by the capture run.** Verifiable as a read-only capture log.
- The archived W1/W2 spec, tooling and PDF are byte-identical before and after (`git diff` over `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` is empty).
- `npm run build-guide` regenerates the whole document from a refreshed local instance with no manual image editing.

## 13. Next Step

```text
/akili-specify changes/w3-bilateral-user-guide
```
