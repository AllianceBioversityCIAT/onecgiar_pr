# CLAUDE.md — `onecgiar-pr-client` (Angular 21 frontend)

This is the **package-level guide** for the PRMS Angular client. It complements the root [`../CLAUDE.md`](../CLAUDE.md) and the SDD constitutional baseline under [`../docs/`](../docs/).

> 🚧 **STACK MIGRATED — Angular 21 + Tailwind 4 + Spartan UI.** The Angular 21 upgrade and the PrimeNG → Spartan migration have landed: `package.json` pins `@angular/*` **^21.2.18**, `tailwindcss` **^4.3.2** and `@spartan-ng/brain` **^1.1.0**, and **`primeng` is no longer a dependency** — only `primeicons` (^7.0.0) remains, imported as plain CSS in `src/styles.scss`. There is no `providePrimeNG(...)` call left in `src/app/app.module.ts`, and **0** `from 'primeng/...'` imports remain under `src/`. Background on how it got here: [`docs/refactor-angular21-spartan-migration.md`](./docs/refactor-angular21-spartan-migration.md). Anything in an older doc that says "Angular 19 + PrimeNG" is stale — this file describes the stack the branch actually has.

> 🅰️ **MANDATORY — Spartan MCP + skill for ANY frontend work (no exceptions).** This package ships spartan/ui (`@spartan-ng/brain` + `@spartan-ng/cli`, `components.json`). Two assistant tools are installed at the client level to make UI development correct and faster — **use them every time you touch the UI, before writing any component/markup/style:**
>
> - **Spartan MCP** (`spartan-ui`, registered in [`.mcp.json`](./.mcp.json)) — 17 tools that fetch **live** spartan/ui component APIs, blocks, and docs from spartan.ng. Query it for the real API/props/usage of any Spartan component **instead of guessing or relying on memory**. Approve the server once (`claude` prompts for project-scoped MCP approval on start).
> - **Spartan skill** (`.claude/skills/spartan` → `.agents/skills/spartan`) — procedural knowledge of the Brain (headless) / Helm (styled) two-layer architecture, the `@spartan-ng/cli` generators, and composition patterns. Auto-activates in any folder with a `components.json` (i.e. this client).
>
> **Rule:** adding, composing, migrating (PrimeNG → Spartan), fixing, or styling any component → consult the Spartan MCP for the current component contract and follow the skill's patterns/generators. Do **not** hand-author Spartan components from memory or hallucinate props. If a session runs from the monorepo root instead of `onecgiar-pr-client/`, these tools may not auto-load — start UI work from the client folder so they engage.

> **Always read the root guide first.** Frontend work MUST follow the SDD methodology:
>
> - [`../docs/prd.md`](../docs/prd.md) — product baseline (personas, goals, `AC-1..AC-9`).
> - [`../docs/system-design/design.md`](../docs/system-design/design.md) — **UI/UX system blueprint** (tokens, components, flows, a11y). The canonical reference for any visual or interaction decision.
> - [`../docs/detailed-design/detailed-design.md`](../docs/detailed-design/detailed-design.md) — technical blueprint (frontend module layout, API surfaces, integrations).
> - [`../docs/specs/general-setup/`](../docs/specs/general-setup/) — templates `/sdd-specify` MUST follow.
>
> **Source-tree navigation lives in [`src/CLAUDE.md`](./src/CLAUDE.md).** This file covers package-level concerns (auth header, build/test, conventions); `src/CLAUDE.md` is the in-tree guide with folder-by-folder navigation, the route tables, the service / component / theme patterns, and the anti-patterns to avoid.

---

## 1. Project overview

PRMS (Planning and Reporting Management System) — the Angular 21 frontend that result submitters, QA reviewers, PMU leads, and platform admins use every day. Builds via Angular CLI; ships as a static SPA fronted by Nginx (`nginx.conf` + `Dockerfile`).

| Item | Value |
|---|---|
| Framework | Angular **21.2** (`@angular/*` ^21.2.18) |
| UI library | **Spartan UI** — `@spartan-ng/brain` (headless Brain) + Helm components generated into `src/app/spartan` (`components.json`: `importAlias: "@spartan"`, `style: "vega"`) |
| CSS | **Tailwind CSS 4** (`tailwindcss` ^4.3.2, `@tailwindcss/postcss`) + `@spartan-ng/brain/hlm-tailwind-preset.css`, entry `src/styles.scss` |
| Icons | `@ng-icons/lucide` (+ `primeicons` CSS still imported for legacy icon classes) |
| PrimeNG | **Removed.** Not in `package.json`; 0 `primeng` imports under `src/`; no `providePrimeNG(...)` in `app.module.ts` |
| Unit tests | Jest (`jest-preset-angular`) |
| E2E tests | Cypress |
| State | Service + `signals` / `BehaviorSubject` (no NgRx) |
| Real-time | `ngx-socket-io`, `pusher-js` |
| Charts / files | `chart.js`, `chartjs-plugin-datalabels`, `pdfjs-dist`, `exceljs`, `file-saver` |
| Telemetry | Hotjar, Microsoft Clarity (mocked in tests via `tests/mocks/clarityMock.ts`) |
| i18n | `src/app/internationalization/` (terminology service + pipe) |

---

## 2. API authentication (preserved from the original guide)

The backend API uses a custom `auth` header (NOT `Authorization: Bearer`). This is handled by the interceptor at `src/app/shared/interceptors/general-interceptor.service.ts`.

### Providing a token for API testing

To let Claude test endpoints, validate response shapes, update interfaces, or debug API issues, **provide a valid JWT token** at the start of the conversation.

How to get your token:

1. Log in to the application in your browser.
2. Open DevTools → Application → Local Storage.
3. Copy the value stored under the `token` key.
4. Paste it in the conversation.

```
Here is my token: eyJhbGciOiJIUzI1NiIs...
```

### How Claude uses the token

With a valid token, Claude can:

- **Test API endpoints** via `curl` using the `auth` header.
- **Validate response structures** against TypeScript interfaces and suggest updates when contracts change.
- **Debug data issues** by inspecting real payloads and identifying mismatches.
- **Update interfaces** under `src/app/shared/interfaces/` to match actual API responses.
- **Write or fix unit tests** with realistic mock data based on real API responses.

### API base URLs (from `environments/environment.ts`)

| Variable | URL pattern |
|---|---|
| `apiBaseUrl` | `{environment.apiBaseUrl}api/results/` |
| `apiBaseUrlV2` | `{environment.apiBaseUrl}v2/api/results/` |
| `baseApiBaseUrl` | `{environment.apiBaseUrl}api/` |
| `baseApiBaseUrlV2` | `{environment.apiBaseUrl}v2/api/` |

The main API service is at `src/app/shared/services/api/results-api.service.ts`. The aggregating `ApiService` at `src/app/shared/services/api/api.service.ts` exposes feature services as fields.

### curl example

```bash
curl -s -H "auth: <TOKEN>" "https://prtest-back.ciat.cgiar.org/api/results/get/all"
```

### How the interceptor behaves

`GeneralInterceptorService` (`src/app/shared/interceptors/general-interceptor.service.ts`):

- Attaches `auth: <localStorageToken>` to every request **except** requests whose URL includes `environment.elastic.baseUrl` (Elasticsearch is hit directly with its own creds).
- On successful `PATCH`/`POST`, side-effects trigger:
  - If user is in a Result Detail route → refresh "green checks" via `GreenChecksService`.
  - If URL contains `/api/ipsr/` (and is not on a small denylist) → refresh IPSR completeness via `IpsrCompletenessStatusService`.
- Errors bubble through `manageError` for component-level handling.

---

## 3. Build, run, and test

```bash
npm install
npm start           # ng serve, http://localhost:4200
npm run build       # ng build (production)
npm run build:dev   # ng build --configuration development
npm run watch       # ng build --watch --configuration development
```

### Tests

```bash
npm run test                # Jest unit tests
npm run test:watch          # Jest watch mode
npm run test:coverage       # Jest with coverage
npm run test:coverage:html  # Coverage with text-summary, cobertura, lcov reporters
npm run lint                # ng lint
npm run lint:fix            # ng lint --fix
npm run cypress:open        # Cypress GUI (E2E)
npm run cypress:run         # Cypress headless (E2E)
npm run cypress:component   # Cypress GUI (component testing)
npm run test:ct             # Cypress component tests, headless
```

> Cypress is **local-only** — there is no Cypress GitHub Actions workflow. It exists for local
> and AI-agent self-verification (see §9 Component tests).

### Coverage thresholds (enforced in `package.json`)

- branches **50%**, functions **60%**, lines **60%**, statements **60%**.

`custom-fields/` and `pages/results/pages/result-detail/pages/rd-contributors-and-partners/` are excluded from `collectCoverageFrom`.

### Tunneling

`npm run tunnel` exposes `ng serve` on `0.0.0.0` with `--allowed-hosts true` for sharing with reviewers or QA on a dev tunnel.

---

## 4. Project structure

```
src/
├── app/
│   ├── app.module.ts
│   ├── app-routing.module.ts        # = [...extraRoutingApp, ...routingApp]
│   ├── app.component.{ts,html,scss} # Shell: top bar, nav, notifications, modals
│   ├── pages/                        # Feature modules (one per top-level surface)
│   │   ├── home/
│   │   ├── login/                   # Custom login
│   │   ├── auth-cognito/            # Cognito flow
│   │   ├── results/                 # Result Creator + Result Detail + Results Outlet
│   │   ├── ipsr/                    # Innovation packages (pathway steps)
│   │   ├── quality-assurance/       # QA queue + review drawer
│   │   ├── type-one-report/         # PMU Type-One Report
│   │   ├── result-framework-reporting/ # Cross-cutting reporting flows
│   │   ├── outcome-indicator/
│   │   ├── pdf-reports/
│   │   ├── admin-section/           # Admin shell
│   │   ├── init-admin-section/      # Admin bootstrap
│   │   └── whats-new/
│   ├── shared/
│   │   ├── services/api/            # API services (HTTP_METHOD_descriptiveName)
│   │   ├── services/                # Auth, Clarity, Cognito, Pusher, alerts, fields-manager, word-counter, ...
│   │   ├── interceptors/            # general-interceptor.service.ts (auth header)
│   │   ├── guards/                  # check-login.guard, check-admin.guard
│   │   ├── interfaces/              # API response types
│   │   ├── components/              # Reusable UI (navigation-bar, header-panel, phase-management-table, ...)
│   │   ├── modals/                  # Reusable dialogs (share-request, delete-confirmation, ...)
│   │   ├── sections-components/     # Large reusable form sections (geography, partners, evidence, ...)
│   │   ├── pipes/, directives/, enum/, data/, constants/
│   │   ├── icon-components/         # Custom SVG icons
│   │   └── routing/                 # routingApp + extraRoutingApp tables
│   ├── internationalization/        # Terminology service + pipe (i18n)
│   ├── sockets/                     # ngx-socket-io / WebSocket plumbing
│   ├── spartan/                     # Helm components generated by @spartan-ng/cli (alias @spartan)
│   └── custom-fields/               # Bespoke field components
├── environments/                     # environment.ts, environment.prod.ts
├── styles/                           # Global SCSS tokens (colors, fonts, transitions, ...)
├── styles.scss                       # Global stylesheet entry
└── setup-jest.ts
```

### Page module convention

Each `pages/<feature>/` follows:

```
<feature>/
├── <feature>.module.ts
├── <feature>-routing.module.ts
├── <feature>.component.{ts,html,scss,spec.ts}
├── (optional) <feature>.responsive.scss     # Responsive overrides (e.g., result-creator)
├── components/                              # Feature-only components
├── pages/                                   # Nested routes (e.g., result-detail/pages/...)
└── services/                                # Feature-local services
```

Always prefer this layout for new features. Cross-cutting primitives go to `shared/`.

---

## 5. Theming, tokens, and design system

Authoritative reference: [`../docs/system-design/design.md`](../docs/system-design/design.md).

### Source of truth

- **Tokens (SCSS):** `src/styles/colors.scss` and `src/styles/fonts.scss`. Custom variables and classes are prefixed `--pr-` / `.pr-`.
- **Tailwind bridge:** `src/styles.scss` re-exposes those tokens to Tailwind in an `@theme inline { … }` block (`--color-brand-*` → `var(--pr-color-primary-*)`, `--color-surface-*`, `--color-ink-*`, `--font-mono`, …) and maps the Helm/shadcn keys (`--background`, `--primary`, `--ring`, `--sidebar*`) onto `--pr-*` values.
- **Rule:** there is **one** source of truth and it is the SCSS. `colors.scss` / `fonts.scss` hold the values; `styles.scss` only *references* them with `var()`. **There is no TypeScript theme to mirror** — `src/app/theme/reportingTheme.ts` was deleted (commit `50710ea38`) and `src/app/theme/` no longer exists. If a doc still tells you to mirror a token in TS, that doc is stale.
- `inline` on the `@theme` block is load-bearing: the values are `var()` references, so Tailwind must emit the `var()` into the utility instead of freezing resolution at `:root` (which would break every scoped override, e.g. the dark sidebar).

### Colour scheme

Light only. `color-scheme: light` is pinned on `:root` in `src/styles.scss`; the unreachable `:root.dark` block was removed (see the note in `src/styles.scss` ~L547). The dark sidebar is **not** dark mode — it is the `--sidebar*` token family painting dark chrome on a light page. Reintroducing dark mode is a separate change (scopable selector + toggle + persisted preference + contrast audit).

### Typography

**Manrope** (variable 200–800) for display and UI text, **JetBrains Mono** (400/500/600) for codes and figures only — both loaded from Google Fonts by `src/styles/fonts.scss`. Base size **12px** on `html, body` (`src/styles/fonts.scss:14`).

- `html, body { font-family: 'Manrope', 'Poppins', sans-serif; }` — Poppins is kept **only as a fallback alias** so stray legacy declarations resolve to the same stack. Poppins is no longer loaded or used as the brand face.
- Mono is for result codes, SP/AOW/HLO identifiers and Target/Achieved values: `.pr-code` (12px), `.pr-figure` (18px), `.pr-figure-sm` (13px) — all `tabular-nums`, which is what keeps figure columns aligned. Exposed to Tailwind as `font-mono`.
- Scale via the `pr-typography($type)` mixin or the generated utility classes (`.pr-h1`, `.pr-body-1`, …) from `src/styles/fonts.scss`.

### Component rules

- Prefer the **`custom-fields` primitives** (`app-pr-input`, `app-pr-select`, …) and **Spartan/Helm components** + **shared section components** over bespoke forms. Never a bare native `<select>`/`<input>`.
- Status chips (`status_id` 1/2/3) MUST use a single shared component.
- Result-level badges MUST use `--pr-color-result-level-*` tokens.
- Tables MUST use `src/styles/table-custom-styles.scss`; filter strips MUST use `src/styles/filters-list.scss`; alerts MUST use `src/styles/custom-alert.scss`.
- Layout patterns: page-shell + panel-menu for multi-section editors (Result Detail, IPSR); drawer for review; modal for confirm/destroy.

### Styling — Tailwind-first (hard rule)

**All NEW styling goes in Tailwind utilities in the template. Reach for SCSS only when it's genuinely necessary** — i.e. something Tailwind can't express cleanly:

- `@keyframes` and other at-rules, complex multi-stop custom animations.
- Pseudo-elements/selectors that would be unreadable as `before:`/`after:` arbitrary utilities.
- `:host` box setup, and styles that must target projected/3rd-party DOM.
- Data-driven values (dynamic gradients/colors from a signal) go via `[style.*]` bindings — not new SCSS classes.

Do **not** author new `.pr-*`-style SCSS class blocks for layout/spacing/color/typography — use utilities. Arbitrary values are fine (`bg-[#1f2233]`, `shadow-[...]`, `bg-[radial-gradient(...)]`). PRMS brand tokens are exposed as utilities (`bg-brand-300`, `text-brand-400`, …) and CSS vars work in arbitrary values (`text-[var(--pr-color-secondary-400)]`). Keep the component's `.scss` as small as possible; an empty-but-for-`:host` file is the norm for new components. (Existing SCSS-heavy components are legacy — migrate opportunistically, don't add to them.)

#### Tailwind preflight — ENABLED on `performance-refactor` (know how to approach it)

`src/styles.scss` imports **Tailwind's preflight (base reset)**. It was historically **disabled** ("would reset PrimeNG") and **re-enabled on the `performance-refactor` branch** once PrimeNG was removed (0 `primeng` imports remain; only `primeicons`).

What this means when working here:

- **Preflight strips browser defaults app-wide** — `h1`-`h6` sizing/weight, `p`/`ul`/`ol` margins + list bullets, `<a>` blue color/underline, `<button>` native chrome, `body` margin, `img` inline. You style everything explicitly with utilities instead.
- **Why it was turned on:** official **Spartan components (e.g. the sidebar) assume preflight**. Without it, browser defaults leak in and the component renders broken (list bullets, blue `<a>` links, native buttons). With preflight they render correctly out of the box — no per-component reset hacks.
- **Known trade-off / migration debt:** legacy pages built *before* preflight assumed those defaults, so some **older layouts need touch-ups** (e.g. the header `test-environment-label` overlapping the `nav_pill` after the reset). These are being fixed opportunistically on the branch — if you touch a legacy page and a heading/list/button/spacing looks off, suspect a lost default and restyle it with utilities rather than reverting preflight.
- **Do NOT re-disable preflight** to "fix" a single page — that reintroduces the Spartan-breakage. Fix the specific legacy element instead. A scoped reset in a component `.scss` (see `results-outlet.component.scss`) is an acceptable safety net but no longer required for Spartan components now that preflight is global.

**Interactive controls — never raw native, always the design system.** For selects, inputs, checkboxes, radios, dialogs, tooltips, etc. use the project primitives — the **`custom-fields` components** (`app-pr-select`, `app-pr-input`, `app-pr-textarea`, `app-pr-checkbox`, …; import `CustomFieldsModule`, and pass `[editable]="true"` — `RolesService.readOnly` defaults to `true` and hides the control otherwise) or a **Spartan** component. **Before building ANY component, consult the Spartan MCP (`spartan-ui`) + the `spartan` skill for the real contract — do not hand-author from memory, and do not drop a bare `<select>`/`<input>` (it renders with the native OS look and breaks the design line).** `app-pr-select` API: `[options]`, `optionLabel`, `optionValue`, `placeholder`, `[required]="false"`, `[showClear]`, `(selectOptionEvent)`.

### A11y, responsive, i18n

- A11y expectations: [`../docs/system-design/design.md` §10](../docs/system-design/design.md). Focus states use `--pr-color-primary-300`. Don't kill outlines.
- Breakpoints: desktop-first; tablet must work. Use `<feature>.responsive.scss` for feature-level responsive overrides (see `result-creator.responsive.scss`).
- **All user-facing strings MUST go through `src/app/internationalization/`.** No hard-coded English in templates.

### Root font-size — the biggest trap in this codebase

*Copied verbatim from the (now deleted) `docs/reporting-redesign/UI-RULES.md` §1.3 — these are
shipped rules, not snapshot commentary. Section numbers in the text below refer to that original
document and are kept as-written.*

`html, body { font-size: 12px }`. Tailwind's type utilities are **rem-based**, so on this codebase:

```
text-sm  = 0.875rem = 10.5px   (not 14px)
text-base = 1rem    = 12px     (not 16px)
```

Every size in the mockups is in **px**. If an agent writes `text-sm` expecting 14px, the whole UI comes out 25% small.

**Decision: in redesign surfaces, never use rem-based Tailwind type utilities. Use explicit arbitrary px values** (`text-[14px]`, `leading-[1.45]`). Same for `size-*`/`w-*`/`h-*` where the spec gives px. Changing the root to 16px would fix this globally but would resize every legacy screen at once — out of scope here, log it as tech debt.

### Hard UI rules (redesign surfaces)

*Copied verbatim from the (now deleted) `docs/reporting-redesign/UI-RULES.md` §4.*

Hard rules. A PR that breaks one does not merge.

#### Structure

1. **One `brand` button per screen.** Everything else is `brandSoft`, `outline` or `ghost`.
2. **Never a modal on top of a modal.** Inside the drawer, secondary pickers are anchored popovers or a nested view within the same sheet with a `← Back` affordance.
3. **One vertical scroll per view.** The drawer's header and footer are sticky; only its body scrolls.
4. **`Escape` closes** drawer, command palette, popovers and menus. Every interactive control has a visible focus ring (`--pr-focus-ring`).
5. **Empty states max 160px tall**: one line of 14/400 `--pr-text-secondary` + one ghost button. Never a full-height empty card.
6. **Respect `prefers-reduced-motion`** — all durations to 1ms.

#### Color

7. **Violet is navigation and actions. Content surfaces are neutral.** Inside the content area there must be no violet border and no tinted background — the only exceptions are the program band, brand chips, and the primary button.
8. **No hardcoded hex in components.** Only `var(--pr-*)` or the Tailwind aliases from §2.3.
9. **Status fg/bg pairs are fixed.** Never recombine a foreground with another background, never invent a sixth status color.
10. **Max two elevation levels per screen.** Cards separate with `--pr-border`, not shadow.
11. **No gradients on large surfaces.**
12. **Color only on semantic icons.** Decorative icons stay neutral; only the active nav icon is violet.

#### Data display

13. **Numeric values are `font-mono` + `tabular-nums`, right-aligned.** Column alignment is what makes the table scannable; losing it defeats the layout.
14. **`Target` / `Achieved` are the only nomenclature.** Not "reported", not "progress", not "contribution". The year prefix follows the cycle selector.
15. **Never a segmented progress meter on an indicator value.** Targets can be financial (`$1.2M`) or large-scale. Continuous bars only on group headers, where the number is a count of results and therefore a true proportion.
16. **Long text is clamped, never broken.** Row title: `line-clamp-2` + inline `Show more`. HLO header: `line-clamp-1` + tooltip. Drawer: `line-clamp-3` + `Show more`. A 40-word tooltip is worse than truncation.
17. **Row action reflects state:** `Report` when not started, `Continue` when in progress, no button once submitted.
18. **No per-field "mandatory" badges.** Required-ness is communicated once, aggregated, in the drawer footer.

#### Code

19. **Tailwind-first.** New styling goes as utilities in the template. SCSS only for `@keyframes`, complex pseudo-elements, `:host` box setup, or projected third-party DOM.
20. **No rem-based type utilities on redesign surfaces** (see §1.3). `text-[14px]`, not `text-sm`.
21. **Icons from `@ng-icons/lucide` only.** No new `primeicons`. No inline SVG for anything Lucide already has.
22. **Standalone components + signals.** Follow the existing `reporting-nav-sidebar` pattern: `inject()`, `signal()`, `computed()`, `toSignal()`. No NgRx.
23. **API methods keep the `HTTP_METHOD_descriptiveName` convention** and the custom `auth` header — never `Authorization: Bearer`.
24. **Never log tokens, keys, webhook URLs or credentials** (`.cursorrules`, hard rule).
25. **Run only the touched module's specs**, never the full suite: `npm run test -- --testPathPattern="<file>.spec"`.

---

## 6. API service conventions

### Naming pattern

All HTTP methods follow `HTTP_METHOD_descriptiveName` (e.g., `GET_allRequest`, `PATCH_readNotification`, `POST_createResult`). Apply this to new methods on existing services and to any new feature-local API service.

### Where API services live

- `src/app/shared/services/api/results-api.service.ts` — main results API surface.
- `src/app/shared/services/api/auth.service.ts` — auth + token storage (`localStorageToken`, `localStorageUser`).
- `src/app/shared/services/api/api.service.ts` — aggregator service composing other services (results, alerts, roles, ToC, lists, IPSR controls, etc.).
- `src/app/shared/services/api/ai-review.service.ts`, `toc-api.service.ts` — feature-specific.
- `src/app/shared/services/api/endpoints/` — endpoint constants helper.

For a new feature, prefer adding methods to the relevant existing service. Create a new service only when the surface area is large enough to justify it.

### URL bases

Use the right base from `environments/environment.ts`:

- `apiBaseUrl` for legacy results API (`/api/results/*`).
- `baseApiBaseUrl` for other `/api/*` calls.
- `apiBaseUrlV2` / `baseApiBaseUrlV2` for `/v2/*` calls.
- `environment.elastic.baseUrl` for Elasticsearch (interceptor skips the `auth` header on these).

### Response envelope

The server returns `{ response, statusCode, message, timestamp, path }` for most endpoints (see [`../onecgiar-pr-server/CLAUDE.md`](../onecgiar-pr-server/CLAUDE.md) §6). Destructure `response` in subscribers and update typed interfaces under `src/app/shared/interfaces/` to match the actual shape.

---

## 7. Routing & guards

- Top-level routes assembled in `src/app/shared/routing/routing-data.ts` and consumed by `app-routing.module.ts`.
- Feature modules lazy-load via their own routing module.
- Guards in `src/app/shared/guards/`:
  - `check-login.guard.ts` — gates authenticated routes.
  - `check-admin.guard.ts` — gates admin routes.
- Result Detail deep links preserve phase via `?phase=` query param (matches server-side `pdf_link` / `prms_link`). Login redirects MUST return users to their original deep link.
- Admin sections MUST be gated by `check-admin.guard.ts` — hiding nav items is never sufficient (AC-3 in `../docs/prd.md`).

---

## 8. State, real-time, and side effects

### State

- No NgRx. State is held in injectable services, often exposed via `BehaviorSubject` or Angular `signals` (`signal()`, `computed()`, `effect()`).
- `DataControlService`, `FieldsManagerService`, `GlobalVariablesService`, `CurrentResult*`, list-filter services per feature are the primary state containers.
- **Phase context** lives at the shell level (do not introduce per-page phase pickers).

### Real-time

- `pusher-js` (`PusherService`) + `ngx-socket-io` (`sockets/`) for live updates (notifications, share requests, submissions). `WebsocketService` import is currently commented in `app.module.ts` — re-enable carefully and behind a flag if you do.
- Treat real-time events as **hints**; always reconcile via a fresh API call before mutating UI state.

### Side effects on `PATCH` / `POST`

The interceptor triggers green-checks refresh for Result Detail routes and IPSR completeness refresh for `/api/ipsr/*` routes. When introducing a flow that should NOT trigger these refreshes, add the URL to `notValidateList` in `general-interceptor.service.ts` — do not bypass the interceptor.

---

## 9. Testing

### Unit tests (Jest)

- Co-located `*.spec.ts` next to the source.
- `jest-preset-angular`; setup file `src/setup-jest.ts`.
- `@microsoft/clarity` is mocked via `tests/mocks/clarityMock.ts`. Add mocks for any new third-party telemetry the same way.
- Excluded paths: `custom-fields/`, `pages/results/pages/result-detail/pages/rd-contributors-and-partners/`, `*module.ts`, `*routing.ts`, `model/*.ts`, `models/*.ts`, `routing-data*.ts`. Don't relax these without reviewing impact on the coverage threshold.

### What to test (priority)

1. API services in `shared/services/api/` against typed interfaces.
2. Guards and the interceptor (`general-interceptor.service.ts`).
3. Form validation and required-field behavior on Result Detail sections.
4. State services that fan out (`DataControlService`, `RolesService`, completeness services).
5. Pipes, directives, terminology service.

### E2E (Cypress)

- Config: `cypress.config.js`; env example `cypress.env.js.example`.
- Tests under `cypress/e2e/**/*.cy.ts` (spec pattern `cypress/e2e/**/*.{js,jsx,ts,tsx}`).
- Cypress is the place to assert **full user flows** — submission, QA review, phase switching, share request.

### Component tests (Cypress CT) — the way to validate `custom-fields/`

`custom-fields/` is **excluded from Jest coverage** and its components render through a real
browser layout (CSS `:focus-within` dropdowns, CDK virtual scroll, Spartan/Helm overlays) that jsdom cannot
lay out. So the **custom-fields are validated with Cypress Component Testing**, not Jest DOM.

- **Spec location:** colocated next to each component as `*.cy.ts` (e.g.
  `src/app/custom-fields/pr-multi-select/pr-multi-select.cy.ts`). Component spec pattern is
  `src/**/*.cy.ts` (kept separate from the `cypress/e2e/**` E2E specs).
- **Support/runner:** `cypress/support/component.ts` + `cypress/support/component-index.html`.
  The dev server uses the webpack `@angular-devkit/build-angular` builder (dev-only dependency)
  driven by a curated `component.devServer.options.projectConfig` in `cypress.config.js` — the
  app itself still builds with the esbuild `@angular/build:application` builder.
- **What is covered today:** **all 23** `custom-fields/` components — one colocated `*.cy.ts` each,
  **67 tests total** (`npm run test:ct` must stay green). Highlights:
  - **CVA / ngModel fields:** `pr-input`, `pr-textarea`, `pr-select`, `pr-multi-select` (incl. external
    in-place `splice` deselection regression), `pr-checkbox`, `pr-radio-button`, `pr-yes-or-not`,
    `pr-range-level`
  - **Shell / feedback:** `field-card`, `pr-field-header`, `alert-status`, `pr-word-counter`,
    `custom-validation-tooltip`, `pr-field-validations` (placeholder mount)
  - **Actions:** `pr-button`, `add-button`, `save-button`, `sync-button`, `edit-or-delete-item-button`
  - **Domain:** `lead-contact-person-field`, `detail-section-title`, `no-data-text`,
    `under-construction-point`
- **Mount helpers:** `cypress/support/ct-utils.ts` — `mountCF(template)` for exported components;
  `mountComponent(Class)` for declared-but-not-exported ones (`pr-word-counter`,
  `under-construction-point`, etc.).
- **Mounting gotcha:** `RolesService.readOnly` defaults to `true`, which hides the interactive
  field. Pass `editable: true` to `mountCF` / `mountComponent` (see existing specs).

**RULE — run the component tests to validate any change to `custom-fields/`.** They are **local-only
(NOT wired into CI — there is no Cypress GitHub Actions workflow)**; their purpose is to let a
developer or an AI agent self-verify these components locally. Run them and expect green before
committing any `custom-fields/` change:

```bash
npm run test:ct            # runs all src/**/*.cy.ts headless — expect "All specs passed!"
```

> Cursor-sandbox agents only: the integrated shell sets `ELECTRON_RUN_AS_NODE=1` (breaks the
> Cypress binary) and overrides `CYPRESS_CACHE_FOLDER` to an empty temp dir. Run with
> `env -u ELECTRON_RUN_AS_NODE CYPRESS_CACHE_FOLDER="$HOME/Library/Caches/Cypress" npm run test:ct`.
> Normal local shells don't need this.

---

## 10. Conventions cheat-sheet

| Topic | Rule |
|---|---|
| **Auth header** | `auth: <JWT>`. NOT `Authorization: Bearer`. The interceptor handles it. |
| **API method names** | `HTTP_METHOD_descriptiveName` (`GET_allRequest`, `PATCH_readNotification`). |
| **Strings** | Always via `src/app/internationalization/`. No hard-coded English. |
| **Styling** | Tailwind utilities for all NEW styling. SCSS only when necessary (keyframes, pseudo-elements, `:host`, projected DOM). Dynamic values → `[style.*]` bindings. Don't add new `.pr-*` SCSS class blocks. |
| **Theming** | `src/styles/colors.scss` / `fonts.scss` are the only source of truth; `src/styles.scss` re-exposes them to Tailwind via `@theme inline`. **No TS theme to mirror** — `src/app/theme/` was deleted. |
| **Tokens / utilities** | Prefix `--pr-*` and `.pr-*`. Don't collide with the Helm preset's keys (`--color-sidebar`, `--primary`, `--ring`, … from `@spartan-ng/brain/hlm-tailwind-preset.css`). |
| **Folder docs** | Touching any file in a folder that has its own `CLAUDE.md` → update that `CLAUDE.md` and re-stamp its `**Verified:**` line in the **same commit** (convention: [`docs/COMPONENT-DOCS.md`](./docs/COMPONENT-DOCS.md)). |
| **Page modules** | Each feature owns `<feature>.module.ts` + `<feature>-routing.module.ts` + `components/`, `pages/`, `services/`. |
| **Shared sections** | Reuse `shared/sections-components/` (geography, partners, evidence, DAC). Don't re-implement. |
| **Forms** | `custom-fields` / Spartan controls with programmatic labels; error messages tied via `aria-describedby`. |
| **Tables / filters / alerts** | Use the canonical SCSS in `src/styles/`. |
| **Dark mode** | Not supported — `color-scheme: light` is pinned on `:root`; the `:root.dark` block was removed. The dark sidebar is a token family, not dark mode. |
| **Real-time** | Pusher + sockets are hints; reconcile via API before mutating state. |
| **Coverage** | Client thresholds: 50/60/60/60. Don't lower them. |
| **Commit** | `<emoji> <type>(<scope>) [ticket]: <description>`. |

### Commit examples

```
✨ feat(knowledge-product-info): Integrate FieldsManagerService and enhance test coverage
♻️ refactor(result-review-drawer) P2-2498: Extract toNum function for number coercion
🔧 fix(submissions.service): Correct formatting and remove unnecessary comment
🎨 style(share-request-modal) P2-2498: Update modal title layout and button styles
```

Emoji / type table:

| Emoji | Type | Use |
|---|---|---|
| ✨ | `feat` | New features. |
| ♻️ | `refactor` | Refactor, no behaviour change. |
| 🔧 | `fix` | Bug fix. |
| 🎨 | `style` | UI / formatting / styling. |

Scope = component or service (`bilateral.service`, `result-review-drawer`, `phase-management-table`). Ticket optional (`P2-2498`).

---

## 11. SDD workflow (client-side)

When working on a frontend feature or fix:

0. **Open the in-tree map.** [`src/CLAUDE.md`](./src/CLAUDE.md) describes the folder where you're about to work, the route tables to update, the services to extend, and the conventions you MUST preserve.
1. **Confirm the spec.** Find or open `../docs/specs/<module>/requirements.md`, `design.md`, `task.md`. If missing, run `/sdd-specify` first — templates live in `../docs/specs/general-setup/`.
2. **Cite the baseline.** Reference `G#`, `US-*`, `AC-*` from `../docs/prd.md`; cite the screen/flow id and component rules from `../docs/system-design/design.md`.
3. **Implement.** Follow this guide: routing, interceptor, services, shared components, tokens, i18n.
4. **Test.** Unit (Jest) + Cypress where applicable. Keep coverage above 50/60/60/60.
5. **Verify in the browser.** Run `npm start`, sign in, exercise the happy path AND edge cases. UI changes are not "done" because the build passes.
6. **Update docs.**
   - If the change establishes a new UX pattern: promote it into `../docs/system-design/design.md` (§12 Design Decisions).
   - If the change adds a new client surface or integration: update `../docs/detailed-design/detailed-design.md` accordingly.
7. **Commit.** Use the project commit format.

---

## 12. Quick reference paths

- **In-tree navigation guide:** [`src/CLAUDE.md`](./src/CLAUDE.md) — folder-by-folder map, route tables, service / component / theme patterns, anti-patterns. Read this before editing anything under `src/`.
- App bootstrap: [`src/app/app.module.ts`](./src/app/app.module.ts)
- Routing entry: [`src/app/app-routing.module.ts`](./src/app/app-routing.module.ts) → [`src/app/shared/routing/routing-data.ts`](./src/app/shared/routing/routing-data.ts)
- Auth interceptor: [`src/app/shared/interceptors/general-interceptor.service.ts`](./src/app/shared/interceptors/general-interceptor.service.ts)
- Auth service (token, user): [`src/app/shared/services/api/auth.service.ts`](./src/app/shared/services/api/auth.service.ts)
- Main API service: [`src/app/shared/services/api/results-api.service.ts`](./src/app/shared/services/api/results-api.service.ts)
- API aggregator: [`src/app/shared/services/api/api.service.ts`](./src/app/shared/services/api/api.service.ts)
- Guards: [`src/app/shared/guards/check-login.guard.ts`](./src/app/shared/guards/check-login.guard.ts), [`src/app/shared/guards/check-admin.guard.ts`](./src/app/shared/guards/check-admin.guard.ts)
- Global styles entry (Tailwind + `@theme inline` token bridge): [`src/styles.scss`](./src/styles.scss)
- Tokens (SCSS): [`src/styles/colors.scss`](./src/styles/colors.scss), [`src/styles/fonts.scss`](./src/styles/fonts.scss)
- Folder-doc convention (`CLAUDE.md` beside the code, 120-line cap, `Verified:` stamp): [`docs/COMPONENT-DOCS.md`](./docs/COMPONENT-DOCS.md)
- Deliberate departures from the visual reference (do not "correct" them back): [`docs/DESIGN-DEVIATIONS.md`](./docs/DESIGN-DEVIATIONS.md)
- Environments: [`src/environments/environment.ts`](./src/environments/environment.ts), [`src/environments/environment.prod.ts`](./src/environments/environment.prod.ts)
- Jest setup: [`src/setup-jest.ts`](./src/setup-jest.ts)
- Cypress config: [`cypress.config.js`](./cypress.config.js)
