# CLAUDE.md — `onecgiar-pr-client` (Angular 19 frontend)

This is the **package-level guide** for the PRMS Angular client. It complements the root [`../CLAUDE.md`](../CLAUDE.md) and the SDD constitutional baseline under [`../docs/`](../docs/).

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

PRMS (Planning and Reporting Management System) — the Angular 19 frontend that result submitters, QA reviewers, PMU leads, and platform admins use every day. Builds via Angular CLI; ships as a static SPA fronted by Nginx (`nginx.conf` + `Dockerfile`).

| Item | Value |
|---|---|
| Framework | Angular **19.2** |
| UI library | PrimeNG **19** + `@primeng/themes/aura` preset via `src/app/theme/reportingTheme.ts` |
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
npm run cypress:open        # Cypress GUI
npm run cypress:run         # Cypress headless
npm run cypress:run:record  # Cypress recorded run
```

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
│   ├── theme/reportingTheme.ts      # PrimeNG theme mirroring src/styles/colors.scss
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
- **Theme (TS):** `src/app/theme/reportingTheme.ts` mirrors the SCSS for PrimeNG (extends `@primeng/themes/aura`).
- **Rule:** when a color or type changes, **update SCSS first** and reflect it in the TS theme. Never the other way around.

### PrimeNG configuration

Provided in `app.module.ts` via `providePrimeNG({ theme: { preset: reportingTheme, options: { darkModeSelector: 'light' } } })`. The `darkModeSelector: 'light'` flag forces light mode globally — dark mode is **not** supported today.

### Typography

Poppins, loaded from Google Fonts. Base size **12px**. Use the `pr-typography($type)` mixin or utility classes (`pr-h1`, `pr-body-1`, etc.) from `src/styles/fonts.scss`.

### Component rules

- Prefer **PrimeNG primitives** + **shared section components** over bespoke forms.
- Status chips (`status_id` 1/2/3) MUST use a single shared component.
- Result-level badges MUST use `--pr-color-result-level-*` tokens.
- Tables MUST use `src/styles/table-custom-styles.scss`; filter strips MUST use `src/styles/filters-list.scss`; alerts MUST use `src/styles/custom-alert.scss`.
- Layout patterns: page-shell + panel-menu for multi-section editors (Result Detail, IPSR); drawer for review; modal for confirm/destroy.

### A11y, responsive, i18n

- A11y expectations: [`../docs/system-design/design.md` §10](../docs/system-design/design.md). Focus states use `--pr-color-primary-300`. Don't kill outlines.
- Breakpoints: desktop-first; tablet must work. Use `<feature>.responsive.scss` for feature-level responsive overrides (see `result-creator.responsive.scss`).
- **All user-facing strings MUST go through `src/app/internationalization/`.** No hard-coded English in templates.

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
- Tests under `cypress/` and `tests/`.
- Cypress is the place to assert **full user flows** — submission, QA review, phase switching, share request.

---

## 10. Conventions cheat-sheet

| Topic | Rule |
|---|---|
| **Auth header** | `auth: <JWT>`. NOT `Authorization: Bearer`. The interceptor handles it. |
| **API method names** | `HTTP_METHOD_descriptiveName` (`GET_allRequest`, `PATCH_readNotification`). |
| **Strings** | Always via `src/app/internationalization/`. No hard-coded English. |
| **Theming** | PrimeNG + `reportingTheme`. Update `src/styles/colors.scss` first, mirror in TS. |
| **Tokens / utilities** | Prefix `--pr-*` and `.pr-*`. Don't collide with PrimeNG variables. |
| **Page modules** | Each feature owns `<feature>.module.ts` + `<feature>-routing.module.ts` + `components/`, `pages/`, `services/`. |
| **Shared sections** | Reuse `shared/sections-components/` (geography, partners, evidence, DAC). Don't re-implement. |
| **Forms** | PrimeNG controls with programmatic labels; error messages tied via `aria-describedby`. |
| **Tables / filters / alerts** | Use the canonical SCSS in `src/styles/`. |
| **Dark mode** | Not supported — `darkModeSelector: 'light'` is enforced. |
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
- Theme: [`src/app/theme/reportingTheme.ts`](./src/app/theme/reportingTheme.ts)
- Tokens (SCSS): [`src/styles/colors.scss`](./src/styles/colors.scss), [`src/styles/fonts.scss`](./src/styles/fonts.scss)
- Environments: [`src/environments/environment.ts`](./src/environments/environment.ts), [`src/environments/environment.prod.ts`](./src/environments/environment.prod.ts)
- Jest setup: [`src/setup-jest.ts`](./src/setup-jest.ts)
- Cypress config: [`cypress.config.js`](./cypress.config.js)
