# Proposal: End-User PDF Guide for the Reporting Tool

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/user-guide-pdf` |
| Slug | `user-guide-pdf` — derived from free-text argument (the request was a paragraph, not a slug: "create a PDF guide for the end user covering the main sections of the Reporting Tool") |
| Type | Change |
| Approval Mode | gated (default — no explicit pre-approval mandate given) |
| Parent Spec | none — this is a standalone, non-chunked change (see §Scope Chunking Decision) |
| Author context | Requested via `/akili-propose`, 2026-09-15 |

---

## 2. Intent

Produce a branded, English-language **PDF user guide** for end users of the Reporting Tool (PRMS client), walking through the six sections the team considers the most important entry points into the product, with annotated screenshots showing where to click.

## 3. Problem / Current Behavior

Today there is no first-party onboarding artifact for end users. `pages/whats-new` covers release notes, not a walkthrough, and there is no document that explains — in plain language — what a P/A (Program/Accelerator lead) finds on the landing page, the Overview dashboard, the Reporting page, the Results Center, Notifications, and the Innovation Packages (IPSR) module. New or infrequent users have to learn these flows by trial and error or via ad hoc support.

## 4. Proposed Outcome

A single downloadable PDF document that:

- Opens with an **Introduction** (what PRMS/Reporting Tool is, who the guide is for, how to use it).
- Has a **Table of Contents** linking to each section.
- Covers, one section each, in this order:
  1. **Landing page** (`/result-framework-reporting/home`) — what a P/A finds there.
  2. **Overview page** (`/result-framework-reporting/entity-details/SP01/overview`) — the analytics/dashboard.
  3. **Reporting page** (`/result-framework-reporting/entity-details/SP01?tocView=aows`) — what's available there.
  4. **Results Center** (`/result/results-outlet/results-list`) — what it is and its value (e.g. where to update 2025 innovations).
  5. **Notifications** (`/result/results-outlet/results-notifications/requests/received`).
  6. **Innovation Packages module** (`/ipsr/list/innovation-list`).
- Each section pairs short, plain-language narrative with **annotated screenshots** (arrows/highlights marking exactly where to click), captured from the running app via **Playwright**.
- Uses the Reporting Tool's own **brand tokens** (violet accent gradient, navy-carbon chrome, Poppins typography — `docs/ux-ui/design.md` §7) so the guide visually matches the product.
- Includes a **Glossary** section built from the terms the Reporting Tool actually uses, sourced from the CLARISA glossary (https://clarisa.cgiar.org/landing-page/glossary).
- Is written in **U.S. English**.

## 5. Scope

- One PDF artifact (plus the reusable source: an HTML/CSS template + a Playwright capture script), versioned under the spec folder so it can be regenerated when the UI changes.
- Screenshot capture for the 6 named routes only, against a locally running client (`localhost:4200`) with seeded/representative data.
- Click-target annotation on each screenshot (visual marker, not just a caption).
- A glossary section curated (not a raw dump) from CLARISA's published glossary, limited to terms that appear in these six flows.
- Cover page, intro, TOC, section content, glossary, using PRMS design tokens.

### Scope Chunking Decision

This is **one bounded deliverable**, not an epic: all six sections belong to a single guide with one narrative arc, one TOC, one visual system, and one glossary. Splitting it into six proposals would fragment a document that only makes sense as a whole (shared cover, shared glossary, consistent cross-references). Recommendation: **do not chunk** — proceed straight to `/akili-specify` for this one spec. If, during specification, the screenshot-automation tooling turns out to be substantial enough to be reusable infrastructure (e.g., a general "docs screenshot pipeline"), that tooling can be called out as its own task inside this spec's `tasks.md` rather than a separate proposal.

## 6. Non-Goals

- No in-app help widget, tour, or onboarding overlay — this is an offline/downloadable document, not a UI feature.
- No localization beyond U.S. English in this pass.
- No coverage of modules outside the six listed routes (e.g., QA review, Admin, Type-One Report are out of scope for v1).
- No automatic regeneration pipeline (e.g., CI job that re-renders the PDF on every deploy) — v1 is a manually triggered, repeatable script.
- No changes to application source code or UI behavior — this proposal does not touch `onecgiar-pr-client/src` product code, only adds documentation tooling/output.
- No claim of long-term staleness detection — the guide reflects the UI at capture time and will need a manual refresh after significant redesigns (see Risks).

## 7. Affected Users, Systems, And Specs

- **Primary audience:** P/A (Program/Accelerator) end users — closest existing PRD persona is **PMU / portfolio lead** (`docs/prd.md` §3), though "P/A" is not a persona label used verbatim in the PRD (see Open Questions).
- **Systems touched:** none in production — this is a documentation artifact plus a dev-only Playwright script. No server, database, or client runtime code changes.
- **Related specs:** none found under `docs/specs/` yet (first entry in the `changes/` bucket; no prior onboarding/guide spec exists to reconcile with).
- **Design source of truth referenced:** `docs/ux-ui/design.md` §7 (Design Tokens), §12 DD-12 (2026 brand redesign — see Risks re: which branch's UI to capture).

## 8. Visual Reference

- Source: None (Figma/mockup) — the guide's visual content **is** the live application, captured via Playwright screenshots plus a lightweight HTML/CSS cover-and-layout template built from existing design tokens.
- Location: Target routes to capture (against `http://localhost:4200`):
  1. `/result-framework-reporting/home`
  2. `/result-framework-reporting/entity-details/SP01/overview`
  3. `/result-framework-reporting/entity-details/SP01?tocView=aows`
  4. `/result/results-outlet/results-list`
  5. `/result/results-outlet/results-notifications/requests/received`
  6. `/ipsr/list/innovation-list`
- Notes: The guide's own chrome (cover, section dividers, TOC, glossary layout) should be designed at `/akili-specify` time as a small HTML/CSS template pulling colors from `colors.scss` (`--pr-color-primary-300/400`, `--pr-color-secondary-400`) and Poppins from `fonts.scss` — no new tokens should be invented.

## 9. Requirement Delta Preview

### ADDED Requirements

- A new PDF artifact: "PRMS Reporting Tool — User Guide" (U.S. English), covering the 6 listed sections with intro, TOC, annotated screenshots, and glossary.
- A new, reusable Playwright-based screenshot capture script (dev tooling only, not shipped to the client bundle) that navigates the 6 routes on a running local instance and produces annotated images.
- A curated glossary section sourced from the CLARISA glossary, scoped to terms used in these flows.

### MODIFIED Requirements

- None — no existing behavior changes.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-offs |
|---|---|---|
| **A — Playwright + branded HTML template → PDF (recommended)** | Write a Playwright script that logs into the local dev app, navigates each of the 6 routes with representative seeded data, captures full-page screenshots, and injects click-target markers (highlight box/arrow) before capture. Assemble all content (intro, TOC, 6 sections, glossary) as one HTML document styled with the project's actual `colors.scss`/`fonts.scss` tokens, then render to PDF via Playwright's `page.pdf()`. | Fully scriptable and re-runnable when the UI changes; screenshots are pixel-accurate to the real app; requires seeded test data and a way to authenticate Playwright against the local app (open question below). |
| **B — Manual screenshots + external design tool (Figma/Canva/Word)** | A person manually screenshots each page, manually draws click annotations, and lays out the PDF in an external design tool. | No tooling/auth setup needed up front, but not reproducible, not version-controlled, drifts silently, and doesn't fit an AKILI spec's traceability model. |
| **C — Static print stylesheet, no click-annotation automation** | Build an HTML page with a `@media print` stylesheet and manually inserted (unannotated) screenshots, export via browser print-to-PDF. | Cheaper than A, but fails requirement #4 (clear click targets) and requires the same manual screenshot capture as B without Playwright's repeatability benefit. |

### Recommended Approach

**Option A.** It is the only option that satisfies all five stated requirements (brand tokens, intro, TOC, Playwright-driven annotated screenshots, U.S. English) in a way that can be regenerated later without redoing manual work. The smallest safe path is: one small Playwright script (added as a dev-only tool, not a product dependency) + one HTML/CSS template reusing existing design tokens + one assembly step producing the final PDF. `/akili-specify` should size the exact annotation technique (DOM-injected highlight overlay before screenshot vs. post-processing) and the login/seed-data strategy.

## 11. Risks, Dependencies, And Open Questions

**Risks**

- All 6 target routes sit behind authentication (PRD AC-3); Playwright needs a way to log in and land on realistic, non-empty data (SP01 entity, 2025 phase content, at least one IPSR innovation package, at least one received notification) or the screenshots will look empty/misleading to end users.
- The client is mid-redesign (DD-12, branches `front-redesign-fields` / `performance-refactor`): screenshots should be captured from whichever UI is actually shipped to end users (default branch `master`/`staging`), not an in-progress redesign branch, or the guide will be stale on arrival.
- Playwright is not currently a dependency of either package (`onecgiar-pr-server`/`onecgiar-pr-client`); it needs to be added as a scoped dev-only tool for this spec, not a runtime/app dependency.
- The CLARISA glossary is an external, third-party page; its content can change. The proposal is to snapshot/curate the subset of terms actually used in these 6 flows (with an "accessed on" date) rather than embed a live link as the sole source.
- No automatic staleness detection: once the UI changes materially, the guide's screenshots go stale until someone re-runs the capture script.

**Dependencies**

- Local dev stack running per `docs/infrastructure.md` §6 (client on `:4200`) with seeded phase/entity/notification/IPSR data.
- Test/QA credentials for Playwright to authenticate as a representative end-user role.
- Network access to `https://clarisa.cgiar.org/landing-page/glossary` to source glossary terms during `/akili-specify`/`/akili-execute`.

**Open Questions**

- **OQ-UG1** — Does "P/A" map to the PRD's "PMU / portfolio lead" persona, or is it a distinct role (Program/Accelerator lead) not yet named in `docs/prd.md` §3? This affects the guide's tone and the value-proposition framing for the Results Center and Overview sections.
- **OQ-UG2** — Who provides Playwright login credentials and ensures representative (non-empty) 2025-phase seed data exists locally for SP01 and at least one IPSR package/notification?
- **OQ-UG3** — What is the intended distribution channel for the final PDF (e.g., a "Download User Guide" link surfaced from `pages/whats-new` or the help menu, an emailed attachment, a docs portal)? This proposal treats the PDF as a standalone artifact; if in-app distribution is wanted, that's a small additive UI change worth naming explicitly in `/akili-specify`.
- **OQ-UG4** — The routes given are `localhost:4200` (used for screenshot capture only). What deployed origin should the guide's *text* reference when telling end users where to go (staging vs. production URL)?

## 12. Success Criteria

- One PDF file exists containing: cover, introduction, table of contents, the 6 sections in the specified order, and a glossary — entirely in U.S. English.
- Every section includes at least one annotated screenshot with a clear, unambiguous click-target marker, captured from the real running application via the Playwright script (not hand-edited images).
- The document's colors and typography visibly match `docs/ux-ui/design.md` §7 (violet accent, navy-carbon chrome, Poppins) rather than default browser/print styling.
- The glossary only includes terms that actually appear in these 6 flows, each definition traceable to the CLARISA glossary.
- The capture script can be re-run against a refreshed local instance to regenerate all screenshots without manual image editing.

## 13. Next Step

```text
/akili-specify changes/user-guide-pdf
```
