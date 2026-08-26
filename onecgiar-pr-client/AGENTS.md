# AGENTS.md - `onecgiar-pr-client` (Angular 21 frontend)

This is the package-level guide for any AI coding agent working in the PRMS Angular client. It complements the root `../AGENTS.md`, the source-tree guide at `src/AGENTS.md`, and the SDD baseline under `../docs/`.

Legacy note: `CLAUDE.md` is the Claude-specific mirror. This file is standalone and should be preferred by generic agents.

## Read Order

1. `../AGENTS.md`
2. This file
3. `src/AGENTS.md` before editing anything under `src/`
4. Relevant SDD docs and module spec under `../docs/specs/<module>/`

Frontend work must follow the SDD methodology:

- `../docs/prd.md`: product baseline, personas, goals, `AC-1..AC-9`.
- `../docs/ux-ui/design.md`: UI/UX system blueprint, tokens, components, flows, accessibility. This is the canonical reference for visual or interaction decisions.
- `../docs/trd/trd.md`: technical blueprint, frontend module layout, API surfaces, integrations.
- `../docs/specs/general-setup/`: templates for module specs.

## Project Overview

PRMS is the Planning and Reporting Management System frontend used by result submitters, QA reviewers, PMU leads, and platform admins. It builds through Angular CLI and ships as a static SPA fronted by Nginx.

| Item | Value |
|---|---|
| Framework | Angular 21.2 (`@angular/*` ^21.2.18) |
| UI library | Spartan UI: `@spartan-ng/brain` ^1.1.0 + Helm components in `src/app/spartan` (`components.json`, alias `@spartan`, style `vega`) |
| CSS | Tailwind CSS 4 (^4.3.2) + `@spartan-ng/brain/hlm-tailwind-preset.css`, entry `src/styles.scss` |
| Icons | `@ng-icons/lucide`; `primeicons` CSS still imported for legacy icon classes |
| PrimeNG | Removed. Not in `package.json`, 0 `primeng` imports under `src/`, no `providePrimeNG(...)` |
| Unit tests | Jest with `jest-preset-angular` |
| E2E tests | Cypress |
| State | Services + Angular signals / `BehaviorSubject`; no NgRx |
| Real-time | `ngx-socket-io`, `pusher-js` |
| Charts/files | `chart.js`, `chartjs-plugin-datalabels`, `pdfjs-dist`, `exceljs`, `file-saver` |
| Telemetry | Hotjar, Microsoft Clarity mocked via `tests/mocks/clarityMock.ts` |
| i18n | `src/app/internationalization/` terminology service and pipe |

## API Authentication

The backend uses a custom `auth` header, not `Authorization: Bearer`. The interceptor at `src/app/shared/interceptors/general-interceptor.service.ts` attaches the token.

Agent rules:

- Never print, log, echo, or expose tokens.
- If a user provides a token for endpoint testing, use it only in the `auth` header.
- Do not store tokens in files, scripts, docs, logs, or test fixtures.
- Redact tokens completely in summaries and command output.

API base URLs from `src/environments/environment.ts`:

| Variable | URL pattern |
|---|---|
| `apiBaseUrl` | `{environment.apiBaseUrl}api/results/` |
| `apiBaseUrlV2` | `{environment.apiBaseUrl}v2/api/results/` |
| `baseApiBaseUrl` | `{environment.apiBaseUrl}api/` |
| `baseApiBaseUrlV2` | `{environment.apiBaseUrl}v2/api/` |

The main API service is `src/app/shared/services/api/results-api.service.ts`. The aggregating `ApiService` at `src/app/shared/services/api/api.service.ts` exposes feature services as fields.

Interceptor behavior:

- Attaches `auth: <localStorageToken>` to every request except requests whose URL includes `environment.elastic.baseUrl`.
- On successful `PATCH` or `POST`, refreshes Result Detail green checks via `GreenChecksService` when on Result Detail routes.
- On successful `PATCH` or `POST` to `/api/ipsr/*`, refreshes IPSR completeness unless the URL is in the denylist.
- Errors bubble through `manageError` for component-level handling.

## Build, Run, And Test

```bash
npm install
npm start
npm run build
npm run build:dev
npm run watch
```

```bash
npm run test
npm run test:watch
npm run test:coverage
npm run test:coverage:html
npm run lint
npm run lint:fix
npm run cypress:open
npm run cypress:run
npm run cypress:component
npm run test:ct
```

Cypress is local-only (no GitHub Actions workflow). `npm run test:ct` runs **all 23** custom-fields
component specs (`src/app/custom-fields/**/*.cy.ts`, **67 tests**) — expected to be green before
committing any `custom-fields/` change (especially signals refactors).

Coverage thresholds enforced in `package.json`:

- branches 50%
- functions 60%
- lines 60%
- statements 60%

Do not lower thresholds. `custom-fields/` and `pages/results/pages/result-detail/pages/rd-contributors-and-partners/` are excluded from `collectCoverageFrom`.

`npm run tunnel` exposes `ng serve` on `0.0.0.0` with `--allowed-hosts true`.

## Project Structure

```text
src/
├── app/
│   ├── app.module.ts
│   ├── app-routing.module.ts
│   ├── app.component.{ts,html,scss}
│   ├── pages/
│   ├── shared/
│   ├── internationalization/
│   ├── sockets/
│   ├── spartan/
│   └── custom-fields/
├── environments/
├── styles/
├── styles.scss
└── setup-jest.ts
```

Page module convention:

```text
<feature>/
├── <feature>.module.ts
├── <feature>-routing.module.ts
├── <feature>.component.{ts,html,scss,spec.ts}
├── (optional) <feature>.responsive.scss
├── components/
├── pages/
└── services/
```

Prefer this layout for new features. Cross-cutting primitives go to `shared/`.

## Theming And Design System

Authoritative reference: `../docs/ux-ui/design.md`.

- SCSS tokens live in `src/styles/colors.scss` and `src/styles/fonts.scss`.
- Custom variables and classes use `--pr-` and `.pr-` prefixes.
- `src/app/theme/reportingTheme.ts` **does not exist** — deleted with PrimeNG (commit `50710ea38`). There is no TypeScript theme, so there is nothing to mirror.
- SCSS is the single source of truth. `src/styles.scss` re-exposes the `--pr-*` tokens to Tailwind in an `@theme inline` block (`--color-brand-*`, `--color-surface-*`, `--color-ink-*`, `--font-mono`) and maps the Helm keys (`--background`, `--primary`, `--ring`, `--sidebar*`) onto them.
- Do not redeclare Helm-owned keys such as `--color-sidebar` / `--color-sidebar-foreground`; set the raw `--sidebar*` var instead.
- Light only: `color-scheme: light` is pinned on `:root` and the unreachable `:root.dark` block was removed. The dark sidebar is a token family, not dark mode.
- Typography: Manrope (variable 200-800) for display/UI text and JetBrains Mono (400/500/600) for codes and figures, base size 12px on `html, body` (`src/styles/fonts.scss:14`). `'Poppins'` remains in the stack only as a fallback alias for legacy declarations.
- Use `pr-typography($type)` or `.pr-*` typography utilities; mono via `.pr-code`, `.pr-figure`, `.pr-figure-sm` (keep `tabular-nums`).
- Prefer `custom-fields` primitives and Spartan/Helm components plus shared section components over bespoke forms. Never a bare native control.
- Deliberate departures from the visual reference belong in `docs/DESIGN-DEVIATIONS.md`, with the measurement that justifies them.
- Tables use `src/styles/table-custom-styles.scss`.
- Filter strips use `src/styles/filters-list.scss`.
- Alerts use `src/styles/custom-alert.scss`.
- Do not kill focus outlines. Focus states use `--pr-color-primary-300`.
- Use feature-level responsive SCSS when needed.
- User-facing domain strings should go through `src/app/internationalization/`.

## API Service Conventions

- HTTP methods follow `HTTP_METHOD_descriptiveName`, for example `GET_allRequest`, `PATCH_readNotification`, `POST_createResult`.
- Prefer adding methods to an existing API service. Create a new service only when the surface area is large enough.
- Use `apiBaseUrl` for legacy `/api/results/*`.
- Use `baseApiBaseUrl` for other `/api/*` calls.
- Use `apiBaseUrlV2` or `baseApiBaseUrlV2` for `/v2/*` calls.
- Use `environment.elastic.baseUrl` for Elasticsearch; the interceptor skips the `auth` header there.
- Server responses usually use `{ response, statusCode, message, timestamp, path }`. Destructure `response` and keep interfaces in `src/app/shared/interfaces/` current.

## Routing And Guards

- Top-level routes are assembled in `src/app/shared/routing/routing-data.ts` and consumed by `app-routing.module.ts`.
- Feature modules lazy-load via their own routing module.
- `check-login.guard.ts` gates authenticated routes.
- `check-admin.guard.ts` gates admin routes.
- Result Detail deep links preserve phase via `?phase=` query param.
- Login redirects must return users to the original deep link.
- Admin sections must be guarded by `check-admin.guard.ts`; hiding nav items is not enough.

## State, Real-Time, And Side Effects

- No NgRx. Use injectable services with Angular signals or `BehaviorSubject`.
- Main state containers include `DataControlService`, `FieldsManagerService`, `GlobalVariablesService`, current-result services, and list-filter services.
- Phase context lives at shell level; do not introduce per-page phase pickers.
- Pusher and sockets are hints. Always reconcile via API before mutating UI state.
- If a flow should not trigger interceptor completeness refresh, add the URL to `notValidateList` in `general-interceptor.service.ts`; do not bypass the interceptor.

## Testing Priorities

1. API services in `shared/services/api/` against typed interfaces.
2. Guards and `general-interceptor.service.ts`.
3. Form validation and required-field behavior on Result Detail sections.
4. State services that fan out to multiple components.
5. Pipes, directives, and terminology service.
6. Cypress for full user flows such as submission, QA review, phase switching, and share request.

## Conventions Cheat Sheet

| Topic | Rule |
|---|---|
| Auth header | `auth: <JWT>`, not `Authorization: Bearer` |
| API method names | `HTTP_METHOD_descriptiveName` |
| Strings | Use `src/app/internationalization/` for domain/user-facing terms |
| Theming | SCSS tokens (`styles/colors.scss`, `styles/fonts.scss`) are the only source of truth; Tailwind sees them through the `@theme inline` block in `styles.scss`. No TS theme exists. |
| Tokens/utilities | Prefix `--pr-*` and `.pr-*`; don't collide with Helm preset keys |
| Folder docs | Touching any file in a folder that has its own `CLAUDE.md` means updating that file and re-stamping its `**Verified:**` line in the SAME commit — convention in `docs/COMPONENT-DOCS.md` |
| Page modules | Use standard feature module shape |
| Shared sections | Reuse `shared/sections-components/` |
| Forms | Prefer project custom fields and Spartan/Helm controls with accessible labels |
| Dark mode | Not supported |
| Real-time | Reconcile via API before mutating state |
| Coverage | Keep thresholds at 50/60/60/60 or higher |
| Commit | `<emoji> <type>(<scope>) [ticket]: <description>` |

## SDD Workflow

When working on a frontend feature or fix:

1. Open `src/AGENTS.md` before editing under `src/`.
2. Confirm the spec under `../docs/specs/<module>/`.
3. If the spec is missing, create or request it using the templates in `../docs/specs/general-setup/`.
4. Cite relevant `G#`, `US-*`, and `AC-*` IDs from `../docs/prd.md` and screen/flow/component rules from `../docs/ux-ui/design.md`.
5. Implement using routing, interceptor, service, shared-component, token, and i18n conventions.
6. Test with Jest and Cypress where applicable.
7. Verify UI changes in the browser; a passing build is not enough.
8. Update `../docs/ux-ui/design.md` when establishing a reusable UX pattern.
9. Update `../docs/trd/trd.md` when adding a client surface or integration.
10. Commit only when explicitly asked, using project commit format.

## Quick Reference Paths

- Source-tree guide: `src/AGENTS.md`
- App bootstrap: `src/app/app.module.ts`
- Routing entry: `src/app/app-routing.module.ts`
- Route data: `src/app/shared/routing/routing-data.ts`
- Auth interceptor: `src/app/shared/interceptors/general-interceptor.service.ts`
- Auth service: `src/app/shared/services/api/auth.service.ts`
- Main API service: `src/app/shared/services/api/results-api.service.ts`
- API aggregator: `src/app/shared/services/api/api.service.ts`
- Guards: `src/app/shared/guards/check-login.guard.ts`, `src/app/shared/guards/check-admin.guard.ts`
- Global styles + token bridge: `src/styles.scss`
- Folder-doc convention: `docs/COMPONENT-DOCS.md`
- Design deviations: `docs/DESIGN-DEVIATIONS.md`
- Tokens: `src/styles/colors.scss`, `src/styles/fonts.scss`
- Environments: `src/environments/environment.ts`, `src/environments/environment.prod.ts`
- Jest setup: `src/setup-jest.ts`
- Cypress config: `cypress.config.js`
