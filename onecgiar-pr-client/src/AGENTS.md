# AGENTS.md - `onecgiar-pr-client/src` (source-tree navigation and patterns)

This is the source-tree guide for any AI coding agent editing the Angular client source. It complements `../AGENTS.md`, `../../AGENTS.md`, and the SDD baseline under `../../docs/`.

Legacy note: `CLAUDE.md` is the Claude-specific mirror. This file is standalone and agent-neutral.

## Read Order

1. `../../AGENTS.md`
2. `../AGENTS.md`
3. This file
4. Relevant SDD spec under `../../docs/specs/<module>/`

Assume Angular 19, PrimeNG 19, custom `auth` header, no NgRx, and SDD-first work.

## 60-Second Mental Model

```text
src/
├── main.ts
├── polyfills.ts
├── setup-jest.ts
├── index.html
├── styles.scss
├── app/
│   ├── app.module.ts
│   ├── app-routing.module.ts
│   ├── app.component.{ts,html,scss}
│   ├── pages/
│   ├── shared/
│   ├── internationalization/
│   ├── sockets/
│   ├── theme/
│   └── custom-fields/
├── environments/
├── styles/
└── assets/
```

If a new top-level concept is needed, prefer extending `app/shared/` instead of inventing a sibling folder.

## Bootstrap And Root Files

- `main.ts`: Angular bootstrap only. Do not add global side effects here; use `app.module.ts` providers.
- `polyfills.ts`: `zone.js` only. Do not add legacy browser bloat without a requirement.
- `index.html`: SPA shell. Avoid editing unless adding analytics or app-wide metadata.
- `styles.scss`: global stylesheet entry and utilities. Avoid new ad-hoc utility families; prefer topic SCSS in `styles/`.
- `setup-jest.ts`: `jest-preset-angular` setup. Keep minimal.

## App Shell

`app.module.ts` is the source of truth for shell providers and imports:

- `AppRoutingModule` composed from `extraRoutingApp + routingApp`.
- HTTP interceptor: `GeneralInterceptorService`, which attaches custom `auth` header.
- PrimeNG theme: `reportingTheme`, forced light mode with `darkModeSelector: 'light'`.
- Async animations for PrimeNG.
- Global toast `MessageService`.
- Clarity initialization via app initializer.
- Dormant socket wiring is commented out. Do not re-enable silently.
- Shell components and global modals are imported here.

Do not add app-wide providers without a spec. New page-specific providers belong in feature modules.

`app.component.*` hosts the header, navigation, footer, toast outlet, global modals, and router outlet. Do not put feature logic here.

## Pages

Every feature under `app/pages/` should follow this shape:

```text
pages/<feature>/
├── <feature>.module.ts
├── <feature>-routing.module.ts
├── <feature>.component.{ts,html,scss,spec.ts}
├── <feature>.service.ts
├── (optional) <feature>.responsive.scss
├── components/
├── pages/
└── services/
```

Each component folder follows:

```text
<name>/
├── <name>.component.html
├── <name>.component.scss
├── <name>.component.spec.ts
└── <name>.component.ts
```

Known top-level surfaces:

- `login/`: `/login`, standalone custom login.
- `auth-cognito/`: `/auth`, Cognito redirect/callback handler.
- `result-framework-reporting/`: reporting landing and entity flows. Has a module-level replication guide at [`pages/result-framework-reporting/AGENTS.md`](./app/pages/result-framework-reporting/AGENTS.md) covering the bilateral results review module end-to-end (architecture, routes, services, API contracts, drawer deep-dive, anti-patterns, MVR roadmap). **Required reading before editing anything under that folder, and the canonical source for replicating the module in other applications (e.g., STAR).**
- `results/`: result creator, result detail, results outlet. Largest feature.
- `quality-assurance/`: QA queue and review drawer.
- `ipsr/`: innovation packages.
- `type-one-report/`: PMU Type-One Report.
- `outcome-indicator/`: outcome indicator module.
- `pdf-reports/`: result/IPSR PDF views.
- `init-admin-section/`: My Admin bootstrap.
- `admin-section/`: admin module, guarded by `CheckAdminGuard`.
- `whats-new/`: release notes.

## Results Feature

`pages/results/` contains:

- `result-creator/`: typed result wizard and canonical responsive override pattern.
- `result-detail/`: multi-section detail editor with panel menu and typed result pages.
- `results-outlet/`: list and notifications shell.

Result Detail type-specific pages under `rd-result-types-pages/` are tied to numeric `ResultTypeEnum` values through `prHide`:

- `policy-change-info`: 1
- `innovation-use-info`: 2
- `cap-dev-info`: 5
- `knowledge-product-info`: 6
- `innovation-dev-info`: 7

If the server adds a result type, mirror it with a new sub-page and a route entry in `routing-data.ts` with the matching enum value.

## Routing

All route tables live in `app/shared/routing/routing-data.ts` and use `PrRoute`:

```ts
export interface PrRoute extends Route {
  prName: string;
  prHide?: boolean | number;
  underConstruction?: boolean | number;
  onlyTest?: boolean;
  portfolioAcronym?: string;
}
```

Rules:

- Add or remove routes in `routing-data.ts`.
- Use `CheckLoginGuard` for authenticated surfaces.
- Use `CheckAdminGuard` for admin-only surfaces.
- Preserve route-table typos such as `managementPhasesRuting` and `TypePneReportRouting`; they are load-bearing.
- `prName` feeds nav, breadcrumbs, and panel menus.

## Shared Services

Two service layers exist:

- HTTP API services under `app/shared/services/api/`.
- State/orchestration services under `app/shared/services/`.

Important API services:

- `api.service.ts`: aggregator used by most components.
- `auth.service.ts`: token and user storage.
- `results-api.service.ts`: main result CRUD surface.
- `ai-review.service.ts`, `toc-api.service.ts`: feature-specific HTTP surfaces.
- `endpoints/endpoints.service.ts`: endpoint constants helper.

Important state services:

- `data-control.service.ts`: core cross-feature state container.
- `fields-manager.service.ts`: form field state.
- `global-variables.service.ts`: phase, portfolio, environment booleans.
- `green-checks.service.ts`: result detail completeness.
- `pusher.service.ts`: Pusher subscriptions.
- `clarity.service.ts`: Clarity initialization.
- `logger.service.ts`: use instead of `console.log` for telemetry-worthy logs; never log secrets.

Service rules:

- Use `@Injectable({ providedIn: 'root' })` for shared services.
- Prefer Angular signals for new state; preserve existing `BehaviorSubject` where already used.
- Use `inject()` for new code where consistent with nearby files.
- API methods must use `HTTP_METHOD_descriptiveName`.
- Destructure `response` from the standard backend envelope.

## Interceptor And Guards

`GeneralInterceptorService` responsibilities:

- Attach `auth` header except for Elasticsearch URLs.
- Refresh green checks after successful `PATCH`/`POST` on Result Detail routes.
- Refresh IPSR completeness after successful `/api/ipsr/*` writes, except denylisted URLs.
- Let errors bubble to caller-level handling.

If a new write flow should not trigger completeness refresh, edit `notValidateList` in the interceptor. Do not bypass the interceptor.

Guards:

- `CheckLoginGuard`: authenticated routes.
- `CheckAdminGuard`: admin routes. Hiding nav items is not authorization.

## Shared Components, Modals, And Sections

- Reusable UI belongs in `app/shared/components/<name>/` with `.ts`, `.html`, `.scss`, `.spec.ts`, and usually a module.
- New global modals belong in `app/shared/modals/<name>/` and are imported at shell level.
- Large reusable form sections belong in `app/shared/sections-components/`.
- Before re-implementing geography, partners, evidence, DAC scoring, or similar blocks, look in shared sections and Result Detail canonical implementations.

## Internationalization

PRMS i18n is portfolio-driven, not locale-driven. Use `TerminologyService` and the `term` pipe for copy that differs between P22 and P25.

Rules:

- Domain/user-facing copy that differs by portfolio must be a `TermKey`.
- Keep dictionaries in `app/internationalization/terminology.config.ts` updated.
- Structural recurring copy may be promoted to a term key when reused.

## Sockets

`app/sockets/websocket.service.ts` wraps `ngx-socket-io` for connected users, alerts, and notifications. It is currently dormant because `runsockets()` and `SocketIoModule.forRoot(...)` are commented out.

Do not re-enable sockets without coordination. Socket and Pusher events are hints; always re-fetch authoritative state via API.

## Theme And Styles

- `app/theme/reportingTheme.ts` mirrors `styles/colors.scss` for PrimeNG.
- `styles/colors.scss` is the source of truth for `--pr-color-*` variables.
- `styles/fonts.scss` defines Poppins and typography utilities.
- Use `table-custom-styles.scss` for tables.
- Use `filters-list.scss` for filters.
- Use `custom-alert.scss` for alerts.
- Do not introduce hex literals in feature SCSS. Add a token first.
- Dark mode is not supported.

## Custom Fields

Prefer existing custom fields over raw PrimeNG controls:

- `pr-input`
- `pr-select`
- `pr-textarea`
- `pr-checkbox`
- `pr-radio-button`
- `pr-multi-select`
- `pr-button`
- `pr-field-validations`

`custom-fields/` is excluded from coverage, but new custom fields should still include specs.

## Interfaces, Enums, Constants, Data

- API response contracts live in `app/shared/interfaces/`.
- Keep interfaces synchronized with server responses.
- Avoid typed `any` for API contracts.
- Shared enums live in `app/shared/enum/`.
- Shared constants live in `app/shared/constants/`.
- Static seed data lives in `app/shared/data/`.

## Environment Rules

- `environment.ts` and `environment.prod.ts` must have matching keys.
- `apiBaseUrl` is the single source for API base composition.
- Do not add production secrets to environment files.
- Closure flags affect whole surfaces; treat changes as product decisions.

## Patterns To Follow

Service shape:

```ts
@Injectable({ providedIn: 'root' })
export class FooService {
  private readonly api = inject(ResultsApiService);
  readonly fooSignal = signal<Foo | null>(null);
}
```

Component shape:

```ts
@Component({
  selector: 'app-foo',
  templateUrl: './foo.component.html',
  styleUrls: ['./foo.component.scss']
})
export class FooComponent {
  private readonly api = inject(ApiService);
}
```

HTTP method shape:

```ts
GET_resultById(id: number) {
  return this.http.get<ReportingApiResponse<CurrentResult>>(`${environment.apiBaseUrl}api/results/${id}`);
}
```

## Anti-Patterns To Avoid

- Hardcoded domain English in templates when terminology should be portfolio-aware.
- Inline styles for layout spacing.
- Hex literals in feature SCSS.
- Bypassing `GeneralInterceptorService`.
- Per-feature green-check or soft-delete logic.
- Renaming load-bearing typos such as `steper-navigation`, `TypePneReportRouting`, `managementPhasesRuting`, `chagePhaseModal`, `typeOneResportEmbedded`.
- Adding new top-level folders under `app/`.
- Importing all of PrimeNG in `app.module.ts`.
- Re-enabling WebSocket silently.
- Hiding admin UI without route guards.
- Logging tokens, credentials, full request headers, or webhook URLs.

## Where To Start

| Intent | Start here |
|---|---|
| Add top-level feature | `pages/<feature>/` and `shared/routing/routing-data.ts` |
| Add Result Detail sub-page | `pages/results/pages/result-detail/pages/rd-<name>/` and `resultDetailRouting` |
| Add typed Result Detail page | `rd-result-types-pages/<name>/` and `rdResultTypesPages` |
| Add IPSR step | `pages/ipsr/pages/<name>/` |
| Add admin page | `pages/admin-section/pages/<name>/` and `adminModuleRouting` |
| Add HTTP call | Relevant `shared/services/api/*.service.ts` |
| Add reusable form section | `shared/sections-components/<name>/` |
| Add reusable component | `shared/components/<name>/` |
| Add global modal | `shared/modals/<name>/` |
| Add state container | `shared/services/<name>.service.ts` |
| Change color | `styles/colors.scss`, then `app/theme/reportingTheme.ts` |
| Add P22/P25 copy | `internationalization/terminology.config.ts` |

## SDD Workflow Inside `src/`

1. Confirm the spec at `../../docs/specs/<module>/`.
2. Cite `G#`, `US-*`, `AC-*` from `../../docs/prd.md` and screen/flow/component rules from `../../docs/system-design/design.md`.
3. Implement using existing folder, route, service, interceptor, guard, and theme patterns.
4. Update interfaces if API contracts changed.
5. Add or update co-located tests.
6. Do not lower coverage.
7. Verify UI changes in browser.
8. Promote reusable UX patterns to `../../docs/system-design/design.md`.
9. Commit only when explicitly asked.

## Quick Reference Paths

- Bootstrap: `main.ts`
- App module: `app/app.module.ts`
- Routing entry: `app/app-routing.module.ts`
- Route tables: `app/shared/routing/routing-data.ts`
- Interceptor: `app/shared/interceptors/general-interceptor.service.ts`
- Auth service: `app/shared/services/api/auth.service.ts`
- API aggregator: `app/shared/services/api/api.service.ts`
- Results API: `app/shared/services/api/results-api.service.ts`
- Data control state: `app/shared/services/data-control.service.ts`
- Guards: `app/shared/guards/check-login.guard.ts`, `app/shared/guards/check-admin.guard.ts`
- Terminology: `app/internationalization/terminology.service.ts`, `app/internationalization/terminology.config.ts`
- WebSocket: `app/sockets/websocket.service.ts`
- Theme: `app/theme/reportingTheme.ts`
- Tokens: `styles/colors.scss`, `styles/fonts.scss`
- Global styles: `styles.scss`
- Environments: `environments/environment.ts`, `environments/environment.prod.ts`
- Jest setup: `setup-jest.ts`
