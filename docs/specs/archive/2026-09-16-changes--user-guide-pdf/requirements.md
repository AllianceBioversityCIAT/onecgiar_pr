# Requirements — End-User PDF Guide for the Reporting Tool

## 1. Document Control

| Field | Value |
|---|---|
| Module | `changes/user-guide-pdf` |
| Sub-feature | none |
| Owner | PRMS product/documentation owner (unassigned — confirm at review) |
| Status | draft |
| Ticket(s) | none |
| Depth | **Standard** (see rationale below) |
| Proposal | `docs/specs/changes/user-guide-pdf/proposal.md` (approved intent) |

**Depth rationale:** not Lite — this involves original tooling (Playwright capture + annotation + PDF assembly) and multi-section content authoring, not a copy/color tweak. Not Full — no migration, no API/data-model change, no auth/security surface change; it is read-only tooling against the existing app.

---

## 2. Executive Summary

Build a single, branded, U.S.-English PDF user guide for the Reporting Tool covering six entry points (Landing, Overview, Reporting, Results Center, Notifications, Innovation Packages/IPSR), with annotated screenshots captured by an automated Playwright script and a glossary curated from the CLARISA glossary. No application code changes; this is documentation tooling that reads the live app and existing design tokens.

---

## 3. Glossary (terms used in this spec document)

| Term | Meaning |
|---|---|
| **P/A** | Program/Accelerator — the end-user role this guide targets (working assumption: closest PRD persona is **PMU / portfolio lead**, `docs/prd.md` §3; see `UG-OQ-1`). |
| **SP01** | Example Science Program entity id used in the target routes (`entity-details/SP01`). |
| **AOW** | Area of Work — a Reporting-page grouping (`tocView=aows` query param). |
| **IPSR** | Innovation Package / Scaling Readiness — the Innovation Packages module and its 4-step pathway. |
| **HLO** | Higher-Level Outcome — a node type in the AOW/ToC hierarchy shown on the Reporting page. |
| **Capture script** | The Playwright automation this spec adds, which logs in, navigates the 6 routes, and saves annotated screenshots. |

---

## 4. System Context & Scope

### Context

There is no first-party onboarding artifact for Reporting Tool end users today. `pages/whats-new` covers release notes, not a walkthrough. New/infrequent P/A users learn the Landing page, Overview dashboard, Reporting page, Results Center, Notifications, and Innovation Packages module by trial and error.

Relevant baseline references:

- `docs/prd.md` — no existing user story covers onboarding directly; this spec is closest in spirit to **G1** (submission completeness) and **US-P3** (IPSR pathway) / **US-S1** (result creation), since the guide's job is to reduce time-to-first-successful-action across these flows.
- `docs/ux-ui/design.md` §2 (Information Architecture) — the six target routes map to `Home`, `Result Framework Reporting`, `Results` (`results-outlet`), and `IPSR`.
- `docs/trd/trd.md` §2 — client page modules touched (read-only): `home`/`result-framework-reporting` (backed by `api/results-framework-reporting`), `results`/`results-outlet` (backed by `api/results`, `api/notification`), `ipsr` (backed by `api/ipsr/*`).
- `onecgiar-pr-client/CLAUDE.md` — **current, authoritative stack**: Angular 21 + Tailwind 4 + Spartan UI (PrimeNG fully removed), typography is **Manrope** (Poppins kept only as a CSS fallback alias, no longer the brand face), light-mode only. This **supersedes** `docs/ux-ui/design.md` §7's "Poppins" statement for the purpose of this guide — see `UG-DD` decision in `design.md` and `UG-OQ-5` below. This spec does not edit `docs/ux-ui/design.md` (shared-file write discipline); the discrepancy is recorded here and left for a future doc-sync change.

### In scope

- One PDF artifact: cover, introduction, table of contents, the 6 named sections in order, glossary.
- A Playwright capture script (dev-only tooling, not shipped in the client bundle) that authenticates and screenshots the 6 target routes.
- Click-target annotation on every embedded screenshot.
- An HTML/CSS assembly template driven by the client's real design tokens (`onecgiar-pr-client/src/styles/colors.scss`, `fonts.scss`).
- A curated glossary sourced from https://clarisa.cgiar.org/landing-page/glossary, scoped to terms used in the 6 flows.

### Out of scope

- In-app help widgets, tours, or onboarding overlays.
- Localization beyond U.S. English.
- Any module besides the 6 named routes (QA review, Admin, Type-One Report, etc.).
- An automatic CI regeneration pipeline.
- Any change to `onecgiar-pr-client/src` product code or `onecgiar-pr-server` code — this spec is additive tooling + a static document only.

---

## 5. Personas Affected

| Persona | What changes for them |
|---|---|
| **P/A (Program/Accelerator lead)** — working alias for **PMU / portfolio lead** | Gains a downloadable guide explaining the Landing, Overview, Reporting, Results Center, Notifications, and IPSR module. |
| Result submitter | Indirectly benefits from the Results Center section (where to update current-year innovations), but is not the primary addressee. |
| QA reviewer, Platform admin | Not targeted by this guide (out of scope). |

---

## 6. User Stories

Refines: none directly in `docs/prd.md` (this is a new onboarding capability); closest in spirit to `US-P3`, `US-S1`.

- **`UG-US-1`** — As a P/A, I want a plain-language explanation of the Landing page, so I know what I'm looking at the first time I log in.
- **`UG-US-2`** — As a P/A, I want the Overview/analytics dashboard explained, so I understand what the charts and numbers mean.
- **`UG-US-3`** — As a P/A, I want the Reporting page (AOWs view) explained, so I know what's available there and how to use it.
- **`UG-US-4`** — As a P/A, I want to understand what the Results Center is and why it matters, so I know it's where I go to update the current reporting year's innovations.
- **`UG-US-5`** — As a P/A, I want Notifications explained, so I know how to find and act on requests sent to me.
- **`UG-US-6`** — As a P/A, I want the Innovation Packages (IPSR) module explained, so I understand its purpose and where to start.
- **`UG-US-7`** — As any reader, I want an introduction and table of contents, so I can find the section I need without reading linearly.
- **`UG-US-8`** — As any reader, I want a glossary of Reporting Tool terms, so unfamiliar terminology doesn't block my understanding.

---

## 7. Functional Requirements

### Required (MUST)

- **`UG-R-1`** The system MUST produce one PDF file containing a cover, an introduction, a table of contents, the 6 named sections in the specified order, and a glossary — entirely in U.S. English.
- **`UG-R-2`** The capture script MUST authenticate as a representative end-user role and capture one full-page screenshot of each of the 6 target routes from a running instance of the client — local by default, or the target the user explicitly directs (`CLIENT_BASE_URL`; see `design.md` `UG-DD-6` — this spec's actual run targets `https://reporting.cgiar.org` per the user's 2026-09-15 decision, since it already has the shipped changes/data and the local dev DB is unreachable).
- **`UG-R-3`** Every screenshot embedded in the guide MUST carry at least one clear visual click-target marker identifying the primary action described in that section's narrative.
- **`UG-R-4`** The guide's visual styling MUST derive from the client's real, current design tokens (`onecgiar-pr-client/src/styles/colors.scss`, `fonts.scss` — brand violet gradient `--pr-color-primary-300/400`, navy-carbon chrome, **Manrope** typography), not invented or stale (Poppins-only) values.
- **`UG-R-5`** The glossary MUST only include terms that appear in the 6 covered flows, each definition sourced from https://clarisa.cgiar.org/landing-page/glossary with an "accessed on `<date>`" citation.
- **`UG-R-6`** The Results Center section MUST explicitly state that it is where a P/A goes to update the current reporting year's innovations (2025 at authoring time).
- **`UG-R-7`** The capture script MUST be re-runnable against a refreshed local instance without manual image editing.

### Should (SHOULD)

- **`UG-R-10`** The capture script SHOULD accept a configurable base URL / route list rather than hardcoding `localhost:4200`, so it can be pointed at a staging environment later.
- **`UG-R-11`** The guide's body text SHOULD reference the deployed application's real origin (not `localhost`) when telling the end user where to sign in — see `UG-OQ-4`.
- **`UG-R-12`** Each embedded screenshot SHOULD carry alt-text/caption describing what it shows, so the PDF remains usable with assistive technology.

### Could / Nice-to-have (MAY)

- **`UG-R-20`** The cover page MAY include a version/date stamp so staleness is visible at a glance.
- **`UG-R-21`** *(added 2026-09-16, user request after the first HITL look)* Every screenshot MUST carry, in addition to the primary click-target marker (`UG-R-3`), **feature callouts** for the main functionalities visible on that screen: each callout is a ring around one UI element plus a short label (≤ 5 words, U.S. English, reader vocabulary consistent with the section copy) connected to the ring, in the guide's marker style. Target 2–5 callouts per screenshot, the primary click target labelled too. Callouts MUST NOT cover another callout's target or its own label, MUST come from configuration (not code), and MUST be visually verified per screenshot (`UG-T-16`).

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | N/A as a runtime SLA (this is build-time tooling, not a served page); the capture script SHOULD complete a full 6-route run in well under 5 minutes so it stays practical to re-run. |
| **Security** | Test credentials used by the capture script MUST NOT be committed to the repo or printed to logs/console (`.cursorrules`); pass them via a local, gitignored env var. The script MUST NOT perform any write/mutating action against the app (read-only navigation only). |
| **Accessibility** | Screenshots SHOULD carry descriptive alt-text/captions (`UG-R-12`); body text contrast should be legible when printed (avoid low-contrast greys per `docs/ux-ui/design.md` §10 intent, applied to static output). |
| **Internationalization** | U.S. English only for v1 (explicit non-goal to localize further); not routed through `src/app/internationalization/` since this is not in-app UI. |
| **Backwards compatibility** | N/A — no API, schema, or contract change. |
| **Observability** | N/A for production; the capture script SHOULD log which route/step is running and fail loudly (non-zero exit, actionable message) rather than silently producing a blank/wrong screenshot. |
| **Maintainability** | The template and capture script SHOULD be organized so a future UI redesign requires updating capture selectors/annotations, not rewriting the whole pipeline. |

### Defect classes this spec can produce → verification gate

| Defect class | Automated gate? | Gate / substitute |
|---|---|---|
| Screenshot captured from wrong/stale UI state (login/error/empty page instead of the real route) | **Yes** | Capture script asserts a route-specific DOM selector and non-empty data are present before saving the screenshot (`UG-R-2` scenario); fails loudly otherwise. |
| Section/TOC ordering wrong or a section missing from the assembled document | **Yes** | A check over the generated HTML/PDF source asserts all 6 section headings are present, in the specified order, before/after PDF rendering. |
| Secrets/test credentials leaked into repo, logs, or the PDF itself | **Yes** | Grep gate over the script's own output and over committed files for credential-shaped strings (existing `.cursorrules` practice), run before the task is marked done. |
| Click-target marker points at the wrong element, or visually obscures the label it points to | **No automated check** (requires human/visual judgment) | Substitute: human review at the `/akili-validate` / HITL checkpoint comparing each screenshot's marker against the narrative it accompanies; optionally a **T6 Multimodal** pass per the model-routing registry. |
| Glossary definition drifts from the CLARISA source, or includes an out-of-scope term | **No automated check** (external, semantic content) | Substitute: human review cross-checking the PDF glossary against a live fetch of https://clarisa.cgiar.org/landing-page/glossary at review time. |
| Brand token drift (guide colors/fonts don't match the real current app) | **Partial** | The template SHOULD reference the actual token files (not copy hardcoded hex/px values) so a token change propagates; final visual match still requires a human/T6 check against a live app screenshot. |

This spec accepts the two "no automated check" rows above as **substituted by human review**, not as unaddressed risk — both are recorded as explicit review steps in `tasks.md`.

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `UG-AC-1` | Six annotated screenshots, curated glossary content, and the HTML/CSS template exist | The assembly step runs | A single PDF is produced with cover, intro, TOC, the 6 sections in order, and glossary — entirely in U.S. English. |
| `UG-AC-2` | A local client running with seeded 2025-phase / SP01 / IPSR / notification data, and valid test credentials | The capture script runs | It authenticates, saves one annotated screenshot per route, and exits non-zero with an actionable message if any route fails to render expected content. |
| `UG-AC-3` | A completed guide PDF | A reviewer reads each section | Every click-target the narrative describes is visibly marked on its screenshot and corresponds to a real clickable element in the live app. |
| `UG-AC-4` | The Results Center section | A reviewer reads it | It explicitly states this is where a P/A goes to update the current reporting year's innovations. |
| `UG-AC-5` | The Glossary section | A reviewer cross-checks it against https://clarisa.cgiar.org/landing-page/glossary | Every included term traces to that source (or is flagged as not found there) and covers only terms used in the 6 flows. |
| `UG-AC-6` | The capture script and its credentials | A repo/log scan runs | No credential-shaped string appears in committed files or script console output. |

Cross-cutting project ACs that already apply (do NOT restate, do refer):

- `AC-3` Authorization — the capture script authenticates through the real login flow; it does not bypass or fake auth.
- `AC-9` Security and secrets — no secrets committed or logged.

---

## 10. Dependencies & Assumptions

### Upstream dependencies

- `auth/` login flow (client `pages/login` / `auth-cognito`) — the capture script authenticates through it.
- `api/results-framework-reporting`, `api/results`, `api/notification`, `api/ipsr/*` — read-only data sources for the 6 routes.
- Local dev stack per `docs/infrastructure.md` §6 (client on `:4200`), OR — as actually used for this execution run, see `design.md` `UG-DD-6` — the production origin `https://reporting.cgiar.org`, with the user's own authenticated session as the credential source. Either way the capture script remains strictly read-only.
- Network reachability to `https://clarisa.cgiar.org/landing-page/glossary` at spec/execute time.

### Downstream consumers

- None (standalone document; no in-app distribution in v1 per Non-Goals).

### Assumptions

- The capture script is **read-only**: it MUST NOT create, edit, or delete any result, notification, or IPSR data as a side effect of navigation.
- Representative seed data exists (or will be created) for SP01 / phase 2025 / at least one IPSR package / at least one received notification, so screenshots are not empty.
- The guide must visually match the **current** client build (Angular 21 + Tailwind 4 + Spartan UI, Manrope typography) per `onecgiar-pr-client/CLAUDE.md`, not the older Poppins/PrimeNG description in `docs/ux-ui/design.md` §7 — see `UG-OQ-5`.

---

## 11. Open Questions

- **`UG-OQ-1`** — Does "P/A" map to the PRD's "PMU / portfolio lead" persona, or is it a distinct role not yet named in `docs/prd.md` §3? **Working assumption:** treat as PMU/portfolio lead framing for tone and value propositions. Confirm at Phase 1.3 approval or override.
- **`UG-OQ-2`** — Who provides Playwright login credentials and ensures representative 2025-phase/SP01/IPSR/notification seed data exists locally? **Working assumption:** the Implementer uses their own local dev login and verifies/seeds data as a `tasks.md` pre-flight step; not blocking spec approval.
- **`UG-OQ-3`** — Distribution channel for the final PDF. **Resolved by the proposal's Non-Goals:** none in v1 — the PDF is a standalone artifact with no in-app download link.
- **`UG-OQ-4`** — What deployed origin should the guide's body text reference when telling the end user where to sign in? **Resolved 2026-09-15 by explicit user decision:** the guide's body text does NOT reference any environment/URL at all — sign-in instructions use generic phrasing (e.g. "sign in to the Reporting Tool") with no literal link. Separately, the *capture* target (distinct from what the guide's text says) is `https://reporting.cgiar.org` — see `UG-R-2` and `design.md` `UG-DD-6`.
- **`UG-OQ-5`** — Typography discrepancy between `docs/ux-ui/design.md` §7 (says Poppins) and the client's actual current stack (`onecgiar-pr-client/CLAUDE.md`: Manrope, Poppins is a fallback alias only). **Resolved for this spec:** use the real current tokens (Manrope + JetBrains Mono for figures, violet/navy brand tokens). The stale baseline doc is not edited here (shared-file write discipline); flag it for a future doc-sync change.

`UG-OQ-4` is the only question that blocks final publication of the guide's body copy; it does not block `design.md`/`tasks.md` since the capture script and template work is independent of that one line of text.

---

## 12. Out-of-Band Notes

- `docs/ux-ui/design.md` §7 typography ("Poppins") is stale relative to `onecgiar-pr-client/CLAUDE.md`'s current stack note (Manrope). Recommend a separate, small doc-sync change to update the baseline — out of scope here.
- No prior spec exists under `docs/specs/` for onboarding/guide content; this is the first entry in the `changes/` bucket.

---

## 13. Requirement ID Index

| ID | Type | One-line summary |
|---|---|---|
| `UG-R-1` | MUST | Single PDF: cover, intro, TOC, 6 sections in order, glossary, U.S. English |
| `UG-R-2` | MUST | Authenticated Playwright capture of the 6 routes |
| `UG-R-3` | MUST | Click-target marker on every screenshot |
| `UG-R-4` | MUST | Styling from real current design tokens (not stale/invented) |
| `UG-R-5` | MUST | Glossary scoped + sourced from CLARISA, with access date |
| `UG-R-6` | MUST | Results Center section states its "update current-year innovations" value |
| `UG-R-7` | MUST | Capture script is re-runnable without manual image editing |
| `UG-R-10` | SHOULD | Configurable base URL / route list |
| `UG-R-11` | SHOULD | Guide text references real deployed origin, not localhost |
| `UG-R-12` | SHOULD | Screenshot alt-text/captions |
| `UG-R-20` | MAY | Cover version/date stamp |
| `UG-R-21` | MUST | Labelled feature callouts (2–5) on every screenshot, from configuration |
| `UG-AC-1..6` | Acceptance | See §9 |

---

## Required cross-references

- `docs/prd.md` — G1, US-P3, US-S1 (framing, not literal implementation).
- `docs/ux-ui/design.md` §2 (Information Architecture), §7 (Design Tokens — superseded for typography by `onecgiar-pr-client/CLAUDE.md`, see `UG-OQ-5`).
- `docs/trd/trd.md` §2 (client page modules), §6 (frontend architecture).
- `onecgiar-pr-client/CLAUDE.md` — current stack, tokens, auth flow, coverage rules.
- `docs/specs/changes/user-guide-pdf/proposal.md` — approved intent.
