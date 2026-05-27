# Tasks — Public ToC results endpoint

> **Note:** these are **backend** tasks (NestJS server). Implemented directly in this session after the repo working rules were updated to allow backend changes. Paths are relative to `onecgiar-pr-server/`.

## 1. New public module scaffold

- [x] 1.1 Create `src/api/public-results-framework/` following the bilateral/platform-report layout
- [x] 1.2 Add `public-results-framework.module.ts` that reuses `ResultsFrameworkReportingService` (imports `ResultsFrameworkReportingModule`, which now `exports` the service — cleaner than duplicating its ~13 providers)
- [x] 1.3 Add `public-results-framework.controller.ts` with `@Controller()`, `@ApiTags('Public Results Framework')`, and `@UseInterceptors(ResponseInterceptor)`

## 2. Public GET endpoint (delegation, no new logic)

- [x] 2.1 Implement `@Get('toc-results')` handler reading `@Query('program')`, `@Query('areaOfWork')`, `@Query('year')` — **no** `@UserToken()`
- [x] 2.2 Delegate directly to `ResultsFrameworkReportingService.getWorkPackagesByProgramAndArea(program, areaOfWork, year)` — no duplicated query/enrichment logic
- [x] 2.3 Add Swagger docs (`@ApiOperation`, `@ApiQuery` for `program` required, `areaOfWork` required, `year` optional, `@ApiOkResponse`)
- [x] 2.4 Confirm `POST create` and any user-scoped routes are NOT added to this public module (read-only surface — only the GET handler exists)

## 3. Wiring & auth exclusion

- [x] 3.1 Register `PublicResultsFrameworkModule` in `src/app.module.ts` imports
- [x] 3.2 Add the mount `{ path: 'public-results-framework', module: PublicResultsFrameworkModule }` in `src/api/modules.routes.ts`
- [x] 3.3 Add `{ path: 'api/public-results-framework/(.*)', method: RequestMethod.ALL }` to the `JwtMiddleware.exclude(...)` list in `app.module.ts` (next to `api/bilateral` / `api/platform-report`)

## 4. Tests

- [x] 4.1 Controller spec: handler calls `getWorkPackagesByProgramAndArea` with the right args — **passing (4/4)**
- [x] 4.2 Module spec: metadata wiring (controller registered, imports the reporting module, no own providers) + origin module spec asserts the new `exports` — **passing** (after `npm ci`)
- [ ] 4.3 Routes/integration check: `GET /api/public-results-framework/toc-results?...` returns 200 **without** an `auth` header — **requires e2e / running app (DB needed)**, not runnable here
- [x] 4.4 Payload-shape test: public response is a pass-through of the service result (identical contract) — **passing**
- [x] 4.5 Validation: missing `program` → 400, missing `areaOfWork` → 400, invalid `year` → 400, no active year → 404, no matches → 404 — **covered by reuse**: the public endpoint calls the same `getWorkPackagesByProgramAndArea`, whose validation paths are already tested in `results-framework-reporting.service.spec.ts`
- [ ] 4.6 Regression: private endpoint still requires auth (401/redirect without `auth` header) — **requires e2e**, not runnable here

## 5. Docs & verification

- [x] 5.1 Public contract documented via Swagger (`@ApiTags('Public Results Framework')`, `@ApiOperation`, `@ApiQuery`, `@ApiOkResponse`). Surfaces at `/api`.
- [ ] 5.2 Verify in prtest: call without `auth` header → 200 + expected payload; confirm private endpoint unchanged — **blocked until deployed to prtest**
- [x] 5.3 Gates: `eslint` **passes** on all new/modified files; `jest` **passes** on the affected suites (54 tests). No schema change → no migration needed (`migration:check` N/A).

## Status notes (transparency)

- **Code complete, lint-clean, tests green.** New module + controller + wiring + JWT exclusion implemented; `eslint` zero errors.
- **Tests verified after `npm ci`:** `public-results-framework.controller.spec.ts` (4) + `public-results-framework.module.spec.ts` (3) + origin `results-framework-reporting.module.spec.ts` (4) all pass; origin service+controller specs (43) still green → the new `exports` broke nothing. **Total 54 passing.**
- **Regression caught & fixed during validation:** adding the JWT `.exclude(...)` entry broke `app.module.spec.ts`, which asserts the exact exclude list via `toHaveBeenCalledWith`. Updated that assertion to include `api/public-results-framework/(.*)` — `app.module.spec.ts` + `main.spec.ts` now green.
- **e2e/manual items (4.3, 4.6, 5.2):** require a running app / prtest deploy; verify after deploy with `curl` (no `auth` header → 200; private endpoint still 401).
