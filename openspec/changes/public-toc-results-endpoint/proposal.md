## Why

An external integration needs to consume the ToC results (work packages) for a given program and area of work, but it cannot authenticate against PRMS (it has no PRMS user/JWT). The current endpoint `GET /api/results-framework-reporting/toc-results` is behind the `JwtMiddleware`, so the integrator is blocked. We need a public, no-auth copy of the same data so the external system can pull it directly.

## What Changes

- Add a **new, isolated public module** that exposes a read-only copy of the existing `toc-results` endpoint **without authentication**.
  - New route (proposed): `GET /api/public-results-framework/toc-results?program=SP01&areaOfWork=AOW01&year=<optional>`.
  - The route is **excluded from `JwtMiddleware`** in `app.module.ts`, mirroring the existing pattern used by `/api/bilateral/*` and `/api/platform-report/*`.
- The public endpoint returns the **identical response contract** to the current private endpoint (same `compositeCode`, `year`, `tocResultsOutcomes`, `tocResultsOutputs`, `metadata` shape produced by `getWorkPackagesByProgramAndArea`).
- Reuse the existing service/repository logic (`getWorkPackagesByProgramAndArea` → `AoWBilateralRepository.findByCompositeCode`); no new query logic. The public controller is a thin, auth-free front door over the same business method.
- **Access model: fully public (no allowlist).** No IP allowlist, no API key — same de-facto posture as the current bilateral surface (JWT excluded, no perimeter filter in the repo). This is an explicit decision for this integration.
- **Read-only.** Only the `GET toc-results` surface is copied. The `POST create` and user-scoped endpoints of the original controller are **NOT** exposed publicly.

### Non-goals

- No IP allowlist, API key, or rate-limit gating in this change (can be added later if the integrator's exposure needs tighten).
- No change to the existing private `/api/results-framework-reporting/toc-results` endpoint — it stays JWT-protected and untouched.
- No new response contract — the public copy is byte-compatible with the current one.

## Capabilities

### New Capabilities
- `public-toc-results-api`: An unauthenticated, read-only HTTP surface that returns ToC work packages (outcomes/outputs with indicator targets) for a `program` + `areaOfWork` (+ optional `year`), reusing the existing reporting business logic, intended for external system-to-system integration.

### Modified Capabilities
<!-- None. The existing private endpoint and its behavior are unchanged. -->

## Impact

- **New code (server, NestJS):** new public module (controller + module wiring) under `onecgiar-pr-server/src/api/` following the bilateral/platform-report layout. Delegates to the existing `ResultsFrameworkReportingService.getWorkPackagesByProgramAndArea`.
- **`app.module.ts`:** add the new public path to the `JwtMiddleware` `.exclude(...)` list (next to `api/platform-report/(.*)` and `api/bilateral/(.*)`).
- **`api/modules.routes.ts`:** register the new public module's mount path.
- **Security posture:** introduces a second internet-reachable, unauthenticated data surface. ToC work-package data becomes publicly readable by anyone who knows the URL. This is an accepted, explicit decision for this integration; revisit if the data sensitivity or exposure scope changes.
- **Docs:** the public contract should be documented (Swagger `@ApiTags` + an entry in the server docs) so the integrator has a stable reference.
- **Boundary note:** implementation is a **backend** change. Per repo working rules, this proposal documents the change; the server code itself must be implemented by the backend owner.
