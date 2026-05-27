## Context

The PRMS backend (NestJS 11) already exposes ToC work packages through a private endpoint:

```
GET /api/results-framework-reporting/toc-results?program=SP01&areaOfWork=AOW01[&year=YYYY]
```

- **Controller:** `api/results-framework-reporting/results-framework-reporting.controller.ts` → `getTocWorkPackages` (`@Get('toc-results')`).
- **Service:** `getWorkPackagesByProgramAndArea(program, areaOfWork, year?)` in `results-framework-reporting.service.ts`.
- **Repository:** `AoWBilateralRepository.findByCompositeCode(program, "PROGRAM-AREA", year)` in `api/results/results-toc-results/repositories/aow-bilateral.repository.ts`.
- The handler does **not** read `@UserToken()`, but the route still sits under `/api/*`, which the `JwtMiddleware` protects globally (`app.module.ts`).

The codebase already has a sanctioned pattern for **unauthenticated, headless surfaces**: `/api/bilateral/*` and `/api/platform-report/*` are excluded from `JwtMiddleware` via `.exclude(...)` in `app.module.ts:135-137`. There is **no IP allowlist** anywhere in the repo (`serverless.yaml` exposes `/{any+}` with no `resourcePolicy`; the only `whitelist` flags in code are `class-validator` DTO flags). So these surfaces are de-facto fully public today.

**Constraints / working rules:** This is a backend change. Repo rules let us read backend code and author this spec, but the server implementation must be done by the backend owner. This document is the implementation blueprint.

## Goals / Non-Goals

**Goals:**
- Expose a public, no-auth, read-only copy of the `toc-results` GET endpoint for an external integration.
- Return the **identical response contract** to the current private endpoint (byte-compatible).
- Reuse the existing service/repository logic — zero new query code.
- Follow the established bilateral/platform-report pattern for the public surface so it's consistent and easy to audit.

**Non-Goals:**
- No IP allowlist, API key, or custom rate-limit in this change.
- No change to the existing private endpoint (stays JWT-protected).
- No new business logic, no schema change, no migration.
- Do not expose the `POST create` or any user-scoped endpoint of the original controller.

## Decisions

### D1 — New isolated public module (not URI versioning, not a sub-route)
Create a dedicated module, e.g. `api/public-results-framework/`, with its own controller mounted at `path: 'public-results-framework'` in `modules.routes.ts`, and add `api/public-results-framework/(.*)` to the `JwtMiddleware.exclude(...)` list.

- **Why:** Keeps the public surface physically separated from the JWT-protected one, exactly like `bilateral/` and `platform-report/`. Easy to grep, audit, and reason about ("everything under this module is public"). A reviewer never has to wonder which routes in a mixed controller are auth-free.
- **Alternative A — `/v2/api/...` URI versioning (`@Version('2')`):** Rejected. `/v2/(.*)` also passes through `JwtMiddleware`, so it would still need an explicit exclude, and it muddies the meaning of "v2" (which is about API versioning, not auth posture).
- **Alternative B — `toc-results/public` sub-route inside the existing controller:** Rejected. Mixing public and private routes in one controller is the exact anti-pattern the bilateral split avoids; a future edit to the controller could accidentally widen the public surface.

### D2 — Thin controller delegating to the existing service
The new controller injects `ResultsFrameworkReportingService` and calls `getWorkPackagesByProgramAndArea(program, areaOfWork, year)` directly. No duplicate logic.

- **Why:** Single source of truth for the query and the response shape. If the private endpoint's data changes, the public one stays in sync automatically (acceptable here because the chosen contract is explicitly "identical to current").
- **Alternative — copy the logic into the new module:** Rejected. Duplicating the enrichment/filtering would drift over time and double the test surface.
- **Wiring note:** the new module must `imports`/`providers` whatever is needed to resolve `ResultsFrameworkReportingService` and its repository dependency (`AoWBilateralRepository`), mirroring how `ResultsFrameworkReportingModule` wires them.

### D3 — Identical response contract, same envelope
Keep `@UseInterceptors(ResponseInterceptor)` so the public response matches the private one: the service returns `{ response: { compositeCode, year, tocResultsOutcomes, tocResultsOutputs, metadata }, message, status }`, wrapped by the interceptor into the standard `{ response, statusCode, message, timestamp, path }` envelope.

- **Why:** "Identical contract" was an explicit decision; the integrator gets exactly what the private endpoint returns.

### D4 — Fully public, no gating
Add only the JWT exclude. No allowlist guard, no API key, no `@Roles`. Throttling: leave the global throttler (`60s/100req`) in place unless the integrator's volume requires an explicit decision later.

- **Why:** Explicit product decision ("libre total"). Matches the current de-facto posture of bilateral/platform-report.

## Risks / Trade-offs

- **[New unauthenticated internet-reachable data surface]** → ToC work-package data becomes readable by anyone who knows the URL. Mitigation: it's read-only, scoped to ToC catalogue data already shared with external reporting consumers; document the decision and revisit if data sensitivity changes. An allowlist/API key can be layered on later without changing the contract.
- **[Contract coupling]** → "Identical contract" means internal changes to `getWorkPackagesByProgramAndArea` leak to the external integrator. Mitigation: add a payload-shape test (fixture) on the public endpoint so any shape change is caught in CI; if drift becomes a problem, freeze a dedicated DTO later.
- **[Scraping / abuse]** → A public endpoint can be hit at volume. Mitigation: keep the global throttler; monitor; consider per-route limits if abused.
- **[Accidental surface widening]** → A future dev could add a write route to the public module. Mitigation: module-level convention + a routes test asserting only the GET path is mounted publicly.

## Migration Plan

1. Implement the new module (controller + module) and wire it in `app.module.ts` (imports) and `api/modules.routes.ts` (mount path).
2. Add the public path to `JwtMiddleware.exclude(...)` in `app.module.ts`.
3. Add tests: controller delegates correctly, route is reachable without `auth` header, response shape matches the private endpoint.
4. Document the public contract (Swagger `@ApiTags` + server docs entry) for the integrator.
5. Deploy. **Rollback:** remove the module import + mount + exclude entry; the change is purely additive, so rollback is a clean revert with no data impact.
6. Verify in prtest: call without `auth` header and confirm 200 + expected payload; confirm the private endpoint still requires auth.

## Open Questions

- Final public path name — `public-results-framework` vs another prefix the team prefers for public surfaces.
- Whether to keep the standard envelope (`ResponseInterceptor`) or return a raw object for the external consumer (current decision: keep envelope = identical to private).
- Throttling posture for the integrator's expected request volume.
