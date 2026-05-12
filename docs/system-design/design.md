# PRMS — System Design (UI/UX Blueprint)

> **Status:** Living document. Authoritative UI/UX system blueprint for PRMS. Module-level UX specs live under `docs/specs/<module>/design.md`.
>
> Companion docs: `docs/prd.md` (product), `docs/detailed-design/detailed-design.md` (technical).

This document defines **how PRMS looks, feels, and behaves** as a system — not the technical implementation. It is grounded in what currently exists in `onecgiar-pr-client/src/`: the PrimeNG-on-`reportingTheme` setup, the SCSS token system in `src/styles/`, and the established page module pattern under `src/app/pages/`.

---

## 1. Product Experience Principles

The PRMS UI exists to make **structured reporting feel manageable**, not bureaucratic. The same principles apply to every module under `src/app/pages/`.

| Principle | What it means in practice |
|---|---|
| **Structure beats freedom** | Forms are explicit about required vs optional fields; type-specific sections only surface when the result type is selected; partial saves are normal. |
| **Status is always visible** | The current `status_id` (Editing / QA / Submitted), phase/year, and last update are visible from any result view. The reviewer drawer mirrors the submitter view. |
| **Read what you can't reach** | Read-only deep-links (`pdf_link`, `prms_link`, evidence links) are first-class — submitters and downstream consumers should be able to inspect without permission gymnastics. |
| **Catalogs are flat, results are rich** | CLARISA-backed pickers (centers, initiatives, partners, countries, indicators) stay shallow and searchable; the richness lives inside the result detail. |
| **One result, many lenses** | The same result is rendered for creators, QA reviewers, PMU dashboards, and bilateral consumers — visual variation is by lens, not by stale duplication. |
| **No surprises at submission** | Validation surfaces required gaps **before** the user clicks submit (AC-6 in `docs/prd.md`). |
| **Bilingual-friendly** | UI strings flow through `src/app/internationalization/`. Don't hard-code labels in templates. |
| **Operate offline-aware** | Saves and submissions must surface clear errors on network failure; nothing silently disappears (US-S5). |

---

## 2. Information Architecture

```
PRMS
├── Home (per-phase landing + progress)
├── Results
│   ├── Result Creator (typed wizard)
│   └── Result Detail
│       ├── General information
│       ├── Theory of Change alignment
│       ├── Geographic location
│       ├── Contributors & partners
│       ├── Type-specific section
│       │   ├── Knowledge product
│       │   ├── Capacity sharing
│       │   ├── Innovation development
│       │   ├── Innovation use
│       │   ├── Policy change
│       │   └── Innovation package → IPSR pathway (Steps 1–4)
│       ├── Evidence
│       ├── DAC cross-cutting scores
│       └── Review history
├── Quality Assurance (review queue + drawer)
├── IPSR Framework (cross-result pathway view)
├── Type-One Report (PMU consolidation)
├── Results Framework Reporting (innovation dev/use, geographic, contributors-partners flows)
├── Outcome Indicator
├── PDF Reports
├── Whats New (release notes)
└── Admin
    ├── Init admin section
    ├── Roles & users (AD)
    ├── CLARISA management
    ├── Global parameters
    ├── Versioning / phases
    ├── Initiative–entity map
    ├── Global narratives
    ├── Manage data (soft-delete / recover)
    └── User notification settings
```

Public/external surfaces (no interactive UI):

- `bilateral/*` — typed payload API for bilateral consumers.
- `platform-report/*` — payload API for platform reports & exports.

---

## 3. Primary User Flows

### F1. Submitter — Create and submit a typed result

1. From **Home**, click "New result" → land in Result Creator.
2. Pick **result type** + **phase/year** + **lead initiative & center**.
3. Result Detail opens at "General information". The panel menu shows all required sections.
4. Submitter fills: General → ToC alignment → Geography → Contributors & partners → Type-specific section → Evidence → DAC scores.
5. On every section, **autosave or explicit save** with toast confirmation.
6. Submitter clicks **Submit**. Frontend pre-validates (AC-6). If gaps, panel menu shows red badges; submission is blocked.
7. On success, status moves Editing → QA. Notification + email fire to QA reviewer per `user-notification-settings`.

### F2. QA reviewer — Review and decide

1. From QA queue (filterable by initiative, phase, type, status).
2. Open **Result Review drawer** — read-only mirror of submitter view.
3. Add structured comments (field-scoped) + overall decision: **Pass** (→ Submitted) or **Send back** (→ Editing).
4. Every transition writes to `result-review-history`.

### F3. PMU lead — Run a Type-One Report or oversee submission

1. From PMU **Home**: phase progress widgets (submitted vs expected, blocked vs ready).
2. Drill into a Type-One Report → view consolidated portfolio narrative + per-initiative completion.
3. Edit global narratives or trigger PDF report generation when phase closes.

### F4. PMU lead — Manage an IPSR pathway

1. Navigate to **IPSR Framework** (cross-result pathway view) or to a specific innovation package result.
2. Step-by-step authoring across **Step 1 (core innovation) → Step 2 (complementary innovations) → Step 3 (scaling readiness assessment) → Step 4 (investments/materials/scaling)**.
3. Bilateral consumers see the same steps via `ipsr_pathway_summary` (see `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`).

### F5. Admin — Manage roles, phases, CLARISA, recover data

1. Land in **Admin** section (gated by role).
2. Choose **Roles**, **Phases/Versioning**, **CLARISA management**, **Manage data** (soft-delete recovery), or **Global parameters**.
3. Each admin action writes an audit row (`result-deletion-audit` for deletions; reviewer/operator id for parameter changes).

### F6. Submitter — Share a result with a collaborator

1. From Result Detail, click **Share** → search user (AD-backed) → pick role (read / contributor).
2. Sends notification + email; recipient sees the result in their queue with the granted role.

---

## 4. Screen Inventory

Mapped to `src/app/pages/<feature>` and key sub-pages.

| Screen | Module path | Personas | Purpose |
|---|---|---|---|
| **Home / Landing** | `pages/home` | All | Phase-aware dashboard, progress widgets, deep links. |
| **Login** | `pages/login` + `pages/auth-cognito` | All | Cognito + AD auth. |
| **What's New** | `pages/whats-new` | All | Release notes / changelog surface. |
| **Result Creator** | `pages/results/pages/result-creator` | Submitter | Typed wizard to start a result. |
| **Result Detail** | `pages/results/pages/result-detail` | Submitter, QA | Multi-section detail editor with panel menu + responsive scss. |
| **Results Outlet** | `pages/results/pages/results-outlet` | All | Shared shell around results pages. |
| **Quality Assurance** | `pages/quality-assurance` | QA reviewer | Review queue and review drawer. |
| **IPSR** | `pages/ipsr` | Submitter, PMU | Innovation package authoring. |
| **Type-One Report** | `pages/type-one-report` | PMU | Consolidated portfolio report. |
| **Result Framework Reporting** | `pages/result-framework-reporting` | Submitter, PMU | Innovation dev/use sub-flows, geographic location, contributors-partners. |
| **Outcome Indicator** | `pages/outcome-indicator` | PMU | Indicator-level reporting. |
| **PDF Reports** | `pages/pdf-reports` | PMU | PDF generation views. |
| **Admin section** | `pages/admin-section` + `pages/init-admin-section` | Admin | Roles, users, CLARISA, phases, global params, manage-data, global narratives, initiatives-entity, notification settings. |

---

## 5. Navigation Model

- **Top-level shell** (rendered from `app.component.html`) provides the global header, primary nav, user menu, and notifications.
- **Per-feature module** owns its own routing (`<feature>-routing.module.ts`) and may host nested outlets (e.g., `results-outlet` wraps `result-creator` and `result-detail`).
- **Result Detail** uses a **panel menu** (`result-detail/panel-menu`) with section tabs as the primary intra-screen navigation; required sections show validation badges.
- **Admin** acts as a **secondary shell** with its own sub-nav; admin pages should be reachable in two clicks from any screen for admin users.
- **Reviewer drawer** is a **side drawer over current context** — it never navigates away from the QA queue.

### Navigation rules

1. Persist phase/year context across navigation (a phase switch is an explicit action, not a side effect).
2. Deep links to a result (`/results/result-detail/:id`) MUST land directly on General Information; query params (`?phase=`) preserve phase context as in `pdf_link`/`prms_link`.
3. Login redirects MUST return the user to their original deep link after auth.
4. Admin routes MUST be gated by guards (`shared/guards/`), not only by hiding the nav item.

---

## 6. Layout Patterns

PRMS leans on a small set of recurring layouts. Reuse before inventing.

### Page shell

- Persistent **top bar** (logo, primary nav, environment badge if not prod, user menu, notifications bell).
- Content region with **breadcrumb + page title row**, then **page body**.
- Optional **right rail** for contextual info (e.g., review comments, phase summary).

### Detail with panel menu

- Left **panel menu** lists sections with status indicators (complete / has-warnings / required-empty).
- Center **section content** (forms, tables, sub-sections).
- Sticky **action bar** for save / submit / share / back-to-queue.

### Listing screens

- **Filter strip** at top (uses `src/styles/filters-list.scss`).
- **Table** (uses `src/styles/table-custom-styles.scss`) with column visibility, server-side filters, paging.
- **Row click** opens the detail (preserving filters for back navigation).

### Drawers and modals

- **Drawer** for stateful side-by-side review/edit (QA review, share/request, evidence preview).
- **Modal** for confirm/destroy, share-request, delete-confirmation, error display.
- **Alert** styles centralized in `src/styles/custom-alert.scss`.

### Empty / error / loading

- **Loading**: skeleton blocks for tables, spinner for full-page form load.
- **Empty**: short headline + primary action ("Create your first result").
- **Error**: friendly message + retry; never expose raw stack traces or secrets (`.cursorrules`).

---

## 7. Design Tokens

Tokens are defined in `onecgiar-pr-client/src/styles/colors.scss` and consumed by PrimeNG via `src/app/theme/reportingTheme.ts`. **Read tokens, don't redefine them.**

### Color families (from `colors.scss`)

| Family | Main color | Token | Use |
|---|---|---|---|
| Primary | Indigo `#5569dd` | `--pr-color-primary-300` | Primary actions, links, focus rings. Aliased to PrimeNG `primary.color`. |
| Secondary | Slate `#2a2e45` | `--pr-color-secondary-400` | Headers, secondary chrome, dark surfaces. |
| Red | `#d00416` | `--pr-color-red-300` | Errors, destructive actions, blocked state. |
| Yellow | `#dfb400` | `--pr-color-yellow-300` | Warnings, "has warnings" badges, in-progress. |
| Green | `#19ae58` | `--pr-color-green-500` | Success, submitted state, "ready" badges. |
| Blue | `#3b82f6` | `--pr-color-blue-500` | Informational, links into reports, generic chips. |
| Orange | `#f97316` | `--pr-color-orange-500` | Highlight / phase rollover accents. |
| Neutral | `#9ca0f9` … `#d9d9d9` | `--pr-color-neutral-*` | Subtle dividers, muted text accents. |
| Accents | `#fafafa` … `#111` | `--pr-color-accents-1..8` | Greyscale UI chrome, text-secondary, dividers. |

### Result-level palette (semantic, do not reuse for other purposes)

| Token | Meaning |
|---|---|
| `--pr-color-result-level-1` | Result Level 1 (e.g., output). Green. |
| `--pr-color-result-level-2` | Result Level 2. Dark blue. |
| `--pr-color-result-level-3` | Result Level 3. Red. |
| `--pr-color-result-level-4` | Result Level 4. Light blue. |

### Typography (from `src/styles/fonts.scss`)

- **Family:** Poppins (loaded from Google Fonts).
- **Base size:** `12px` on `html, body`.
- **Scale (mixin `pr-typography($type)`):** `h1 20/700`, `h2 18/700`, `h3 16/600`, `h4 14/500`, `body-1 14/400`, `body-2 12/400`, `body-3 10/400`, `body-4 8/400`, `body-5 6/400`.

### Spacing & elevation

PRMS does not yet ship a formalized spacing token scale. New work SHOULD prefer **4/8-pixel rhythm** and document any spacing scale additions back into `src/styles/`. Elevation comes from PrimeNG defaults; avoid bespoke shadow values.

### Tokens to add over time

- Formal spacing scale (`--pr-spacing-1..8`).
- Formal radius scale (currently inferred from PrimeNG defaults).
- Motion tokens (`src/styles/transitions.scss` is the starting point — promote to first-class tokens).

---

## 8. Component Inventory

PRMS uses **PrimeNG 19 as the base library**, layered with project-specific shared components under `onecgiar-pr-client/src/app/shared/components/`, modals (`shared/modals/`), pipes, directives, and section components.

### Base layer (PrimeNG)

Inputs, selects, autocomplete, dropdown, multiselect, datepicker, dialog, sidebar, tabview, toast, message, table, tree, paginator, chart (used by `chart.js`), confirmdialog. PrimeNG styles are tuned in `src/styles/primeng-custom-styles.scss`.

### Shared layer (project)

- **`shared/components`** — composable controls (e.g., custom inputs, status chips, file pickers).
- **`shared/modals`** — recurring dialogs (share-request, delete-confirmation, evidence preview).
- **`shared/sections-components`** — large reusable form sections (e.g., geography picker, contributors block, evidence block).
- **`shared/icon-components`** — bespoke SVG icon components alongside `primeicons`.
- **`shared/directives`** + **`shared/pipes`** — utility directives/pipes used across pages.
- **`shared/services`** — UI-state helpers, including the API and auth services.

### Feature layer

Each `pages/<feature>` module owns its own `components/` folder for feature-only pieces (e.g., `pages/results/pages/result-detail/components`, `pages/ipsr/components`).

### Component rules

1. **Prefer shared sections over copy-paste forms.** Geography, contributors-partners, evidence, and DAC scores SHOULD use the shared section component, not a re-implementation.
2. **Status chips** (`status_id` 1/2/3) MUST use a single shared component to keep color and label consistent everywhere.
3. **Result-level badges** MUST use `--pr-color-result-level-*` tokens.
4. **Filters lists** MUST use `src/styles/filters-list.scss`.
5. **Tables** MUST use `src/styles/table-custom-styles.scss`.
6. **Buttons:** primary = `--pr-color-primary-300`; destructive = `--pr-color-red-300`; secondary/ghost via PrimeNG severities mapped in the theme.
7. **Custom alerts** use `src/styles/custom-alert.scss`; do not import alternate alert styles.

---

## 9. Responsive Behavior

PRMS is **desktop-first** because submitters and reviewers work on laptops, but every screen MUST remain usable on tablet.

### Breakpoints (recommended baseline)

| Name | Min width | Target devices |
|---|---|---|
| `xs` | 0 | Phone (read-only fallback) |
| `sm` | 600 | Phone landscape / small tablet |
| `md` | 900 | Tablet |
| `lg` | 1280 | Laptop (primary) |
| `xl` | 1600 | Wide desktop |

### Patterns

- **Panel menu** collapses into a **top tab strip** below `md`.
- **Right rail** drops below main content below `md`.
- **Drawers** become **full-screen sheets** below `sm`.
- **Tables** allow horizontal scroll below `md`; never hide columns silently.
- **Phone is read-mostly.** Heavy editing flows MAY redirect to a "use a larger screen" interstitial below `sm` rather than ship a half-baked form.

`result-creator.responsive.scss` is the model for feature-level responsive overrides; new features SHOULD follow the same `<feature>.responsive.scss` convention.

---

## 10. Accessibility Expectations

PRMS is used internally by multilingual, multi-region CGIAR staff and partners. Accessibility is **a hard requirement**, not a polish item.

| Area | Expectation |
|---|---|
| **Contrast** | Body text and form labels MUST meet WCAG 2.1 AA contrast against background. Use accents 5–8 (`#666`–`#111`) on white surfaces, not lighter greys, for primary text. |
| **Keyboard** | Every action reachable by keyboard. Panel menu, drawers, dialogs, and tables MUST be navigable with `Tab` / `Shift+Tab` / arrow keys per PrimeNG defaults. Custom components MUST set `tabindex` correctly. |
| **Focus visibility** | Focus rings MUST be visible (no `outline: 0` without a visible replacement). Use `--pr-color-primary-300` for focus accents. |
| **Forms** | Every form control MUST have a programmatic label (PrimeNG `for=`). Error messages MUST be associated via `aria-describedby`. |
| **Status & live regions** | Toast notifications, autosave confirmations, and validation errors MUST use ARIA live regions so screen readers announce them. |
| **Images & icons** | Decorative icons `aria-hidden="true"`; semantic icons (status chips, severity) carry an accessible label. |
| **Internationalization** | All user-facing strings go through `src/app/internationalization/`; no hard-coded English. Direction support (RTL) is not in scope today but localization keys MUST be ready for it. |
| **Time & dates** | Display in the user's locale; ToC and reporting **phase boundaries** are reported in UTC under the hood — show timezone hints when ambiguous. |

---

## 11. Dark Mode Behavior

PRMS does **not** ship dark mode today. The PrimeNG `reportingTheme` defines only a `light` color scheme (`src/app/theme/reportingTheme.ts`). Most chart libraries, PDF outputs, and CLARISA-rendered embeds also assume light.

### Rules for now

- Do not ship one-off dark variants per component.
- Hex values MUST come from tokens, so a future dark mode is a token swap, not a refactor.
- Status colors (red/yellow/green) MUST remain semantically meaningful on either scheme.

### Future direction (deferred, not committed)

- Add a `dark` `colorScheme` block to `reportingTheme` mirroring the light one.
- Define dark surface tokens (`--pr-surface-bg-dark`, etc.).
- Validate accessibility contrast on dark before shipping.

---

## 12. Design Decisions

Decisions that already shape the system today. Each module spec under `docs/specs/<module>/` MAY record additional decisions in its own design doc; cross-cutting ones graduate here.

### DD-1 — PrimeNG + Aura preset as the base library

We extend `@primeng/themes/aura` via `reportingTheme.ts` rather than maintain a bespoke component library. New work consumes PrimeNG primitives plus shared sections. **Why:** velocity, consistent a11y, and an upgrade path.

### DD-2 — Token system in SCSS, mirrored in TS for PrimeNG

Tokens live in `src/styles/colors.scss` and `src/styles/fonts.scss`. The TypeScript theme in `theme/reportingTheme.ts` mirrors them for PrimeNG. **Rule:** when a color changes, update SCSS first and reflect it in the TS theme — never the other way around.

### DD-3 — Module-per-feature on the client

Each top-level workflow is a Module under `src/app/pages/<feature>/`, with its own routing module, components, and (where applicable) `services/`. Cross-feature primitives live in `src/app/shared/`. **Why:** isolates lazy-loaded surfaces and matches the server-side NestJS modules.

### DD-4 — Panel menu as the result detail navigation

`result-detail/panel-menu` is the canonical pattern for multi-section editors (Result Detail, IPSR pathway). Sections expose their own validity, badging the menu directly.

### DD-5 — Shared section components for cross-cutting blocks

Geography, contributors & partners, evidence, DAC scores, and ToC alignment are **shared components** so they look identical across result types and the QA reviewer drawer. **Why:** to avoid drift in field labels, validation, and pickers.

### DD-6 — Bilateral / platform-report as headless surfaces

Bilateral and platform-report do not have a PRMS UI. Their UX contract is **payload shape stability** (see `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`). The "experience" is the API consumer's experience.

### DD-7 — Phase awareness is global, not local

Phase/year context lives at the shell level and is passed via query params on deep links (`?phase=`). Per-page phase pickers are anti-pattern.

### DD-8 — `pr-` prefix for project tokens and utility classes

All custom CSS variables and utility classes are prefixed `--pr-` / `.pr-` (per `fonts.scss`) to avoid collision with PrimeNG and third-party libs.

### DD-9 — Internationalization via `src/app/internationalization/`

All copy goes through the i18n folder. **Why:** PRMS users span many CGIAR countries; even English-only today, the keys are ready for translation packs.

### DD-10 — Notifications are dual-channel by default

In-app (sockets / Pusher) and email (microservice) — gated by `user-notification-settings`. The UI MUST respect user preferences and never surface unmuted email-only fallback.

---

## 13. Open Gaps / Open Questions

- **OG-1** No formal **spacing / radius / motion token** scale yet — spacing is ad hoc per component.
- **OG-2** No **dark mode** support; a future ADR should sequence the work (DD-2 + new tokens).
- **OG-3** No documented **mobile editing strategy** — currently we tell users to switch to laptop; should we promote a read-only mobile surface?
- **OG-4** Shared **status chip** and **result-level badge** components exist informally but should be canonicalised in `shared/components/` with a documented API.
- **OG-5** No published **a11y audit baseline** — we follow PrimeNG defaults but haven't run a formal axe / Lighthouse pass at the system level.
- **OG-6** Iconography is split between **PrimeIcons** and custom `shared/icon-components/`; we should document when to use which.
- **OG-7** **AI-assisted authoring UI** (under `api/ai`) doesn't yet have a documented UX contract — what does an AI-suggested field look like in the form? what's the disclosure?
- **OG-8** **Print / PDF rendering** styles (`pages/pdf-reports`) are diverging from the web styles — needs a shared print stylesheet strategy.

---

## Related documents

- `docs/prd.md` — Product requirements driving the UX.
- `docs/detailed-design/detailed-design.md` — Technical blueprint behind the UI.
- `docs/specs/general-setup/design.md` — Template that module-level `design.md` files MUST follow.
- `onecgiar-pr-client/CLAUDE.md` — Frontend operating instructions and API conventions.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — Headless UX (payload shape) for bilateral consumers.
