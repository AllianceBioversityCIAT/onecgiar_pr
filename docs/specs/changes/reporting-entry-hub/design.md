# Module Spec — Reporting Entry Hub — Design

> Depth: **Standard** (re-checked in §14). Approval Mode: **pre-approved** — gate logged as `auto-approved (pre-approved mode)`, 2026-08-28. Judgment-day: one pass, fix-only (owner mandate).

## 1. Summary

Adds a "Where to report" hub to the Science Program Overview (`DashboardLabComponent` → new `ReportingEntryHubComponent`) with a W1/W2 lane built from data the page already computes, and a W3 lane fed by **one new JWT-protected read endpoint** in `api/results-framework-reporting` that resolves the user's centers server-side (`role_by_user`, role 9) and reuses the existing `BilateralProjectsService.getProjectsByCenter()` per center, filtered to the program code and capped at 300. Project preselection reuses `BilateralCreationService.selectProject()`; AoW deep links reuse the existing `?tocView=byAow&tocAow=` URL contract. **Biggest trade-off accepted:** the W3 lane is active-reporting-phase only (the phase in which bilateral creation is open), so it does not follow the overview phase selector.

Links: `requirements.md` (same folder), `proposal.md`, `docs/prd.md` (G1, US-S1, AC-3, AC-5), `docs/ux-ui/design.md` (§7 DD-12, §10, DD-7), `docs/trd/trd.md` (§2 `result-framework-reporting`, §1B QAS-2/QAS-3).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results-framework-reporting` (new controller method + new `ReportingEntryHubService`; module imports `BilateralProjectsService` + its repositories), `auth/modules/role-by-user` (read-only use of `RoleByUserRepository.getAllRolesByUser`). No entity, no migration.
- **Client modules touched:** `pages/result-framework-reporting/pages/dashboard-lab` (new `components/reporting-entry-hub/`, edits to `dashboard-lab.component.{ts,html}`, `program-overview.component.{ts,html}`), `shared/services/api/results-api.service.ts` (one new `GET_` method), `pages/bilateral/services/bilateral-creation.service.ts` (consumed, unchanged).
- **External integrations touched:** none (CLARISA cache tables read via existing repositories).

### 2.2 Sequence — W3 lane load

```
[Overview] DashboardLabComponent (after first paint, when selected SP + roles are ready)
  └── GET api/results-framework-reporting/reporting-entry-hub/projects?programId=SP02
        └── [ResultsFrameworkReportingController] @UserToken() user
              └── ReportingEntryHubService.getMyCenterProjects(userId, programCode)
                    ├── RoleByUserRepository.getAllRolesByUser(userId) → rows with role_level_name='Center'
                    │     (rows without center_id/center_name = legacy fallback query → treat as error, not as no centers)
                    ├── YearRepository → active year (for `activeYear` in the DTO)
                    │     → centers[] = {code: center_id, name: center_name, acronym: center_acronym}
                    ├── for each center (Promise.all, ≤ 10): BilateralProjectsService.getProjectsByCenter(center.code)
                    │     (existing: institutionId mapping, W3 acronym alias fallback, is_active, phase = active year)
                    ├── per center: M = projects.length; matching = projects whose sciencePrograms[] has
                    │     programCode == SP02 (case-insensitive) → N; allocation = Number(mapping.allocation); sort allocation desc, shortName asc
                    ├── flatten, apply cap 300 (per-center order preserved) → truncated flag
                    ├── log reporting_entry_hub.projects {userId, programCode, centers, projects, truncated, ms}
                    └── return {programCode, activeYear, truncated, centers: [{code,name,acronym,total:M,matching:N,projects:[…]}]}
  └── [ReportingEntryHubComponent] renders groups / slices / search / empty & error states
        └── Create result → BilateralCreationService.selectProject(project) → router /bilateral/<acronym>/create
```

### 2.3 Sequence — W1/W2 lane

No request. `DashboardLabComponent` passes `overviewAowProgress()` (rows `{code,name,done,total}`) and `overviewXcutProgress()` (the Intermediate / 2030 rows, filtered to `total > 0`) plus `EntityAowService.canReportResults()` into the hub. ⚠️ Do **not** use `aowProgressRows()` (different shape, capped at 8) nor the component-local `AowProgressRow` interface (no `done`; it shadows the exported one in `program-overview.component.ts`). **Report** on an AoW → `onOpenAow(code)` (fixed, routes by code) → `?tocView=byAow&tocAow=<code>`; on a program-level row → `?tocView=aows` only (no scroll/expand — accepted gap §13).

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| — | — | **No entity changes.** Reads `clarisa_projects`, `clarisa_project_mappings`, `clarisa_center`, `clarisa_institutions`, `role_by_user`, `year` through existing repositories. |

### 3.2 Migrations

None. `npm run migration:check` stays green by construction.

### 3.3 CLARISA / external-data implications

None. Depends on the existing CLARISA project sync populating `clarisa_project_mappings.program_code` (same dependency as `GET api/bilateral/center/projects`).

---

## 4. API Surface

### 4.1 New endpoint

| Field | Value |
|---|---|
| **Method + path** | `GET api/results-framework-reporting/reporting-entry-hub/projects?programId=SP02` |
| **Version** | `api` (same controller as `bilateral-projects/by-program`) |
| **Auth** | JWT required (`JwtMiddleware` applies to `api/*`; `@UserToken() user: TokenDto`). User id comes from the token only. |
| **Role** | Any authenticated user. Centers are derived from the caller's own `role_by_user` rows (role level `Center`); a user with none gets `centers: []`. |
| **Request** | Query `programId` (string = SP official code, same name as the sibling `bilateral-projects/by-program`; trimmed + upper-cased **in the service**, 400 if empty). No `versionId` — active reporting year by design (§12 REH-DD-2). |
| **Response DTO** | `ReportingEntryHubProjectsDto`: `{ programCode, activeYear, truncated: boolean, centers: CenterProjectsDto[] }`; `CenterProjectsDto = { code, name, acronym, total, matching, error?: boolean, projects: HubProjectDto[] }`; `HubProjectDto` = the exact item shape of `getProjectsByCenter()` (`id, shortName, fullName, summary, description, leadCenter, sciencePrograms[]`) **plus** `allocation: number` = `Number(mapping.allocation)` — the mapping column is `decimal(5,2)` and arrives as a **string**; never sort the raw value. `summary`/`description` are trimmed to 200 chars (harmless: the creator renders only `fullName`/`shortName`/`leadCenter`). Keeping the `BilateralProject` shape intact is what lets `selectProject()` accept the item unchanged. Wrapped as `{ response, message, status }` like sibling endpoints. |
| **Errors** | 400 `programId is required` (raised by the service, like the sibling); 404 `Program not found` (no active `clarisa_initiatives.official_code`); 200 with `centers: []` when the user has no center role; unexpected → `HandlersError` 500 without internals. |
| **Telemetry** | One structured log per call (§9). No names or emails. |

Sample (abridged):

```json
{ "programCode": "SP02", "activeYear": 2026, "truncated": false,
  "centers": [ { "code": "CENTER-03", "name": "Alliance of Bioversity and CIAT", "acronym": "Alliance", "total": 198, "matching": 44,
                 "projects": [ { "id": 1368, "shortName": "B-A1368", "fullName": "…", "allocation": 40, "leadCenter": {…}, "sciencePrograms": [ {"programCode":"SP02","allocation":"40.00",…} ] } ] } ] }
```

### 4.2 Bilateral / platform-report impact

None. `/api/bilateral/*` and `/api/platform-report/*` untouched (AC-4 not triggered).

---

## 5. Server Workflow / Business Rules

- **Controller** (`results-framework-reporting.controller.ts`): new method under the existing `@Controller()` + `ResponseInterceptor`; passes `user.id` and the raw `programId` to the service (validation lives in the service, as in the sibling endpoint), returns the service envelope. Pattern copied from `getScienceProgramProgress` (uses `@UserToken()`).
- **Service** (`reporting-entry-hub.service.ts`, new, in `api/results-framework-reporting/services/`): orchestration only — resolve centers, fan out to `BilateralProjectsService.getProjectsByCenter(code)` with `Promise.allSettled` (a failing center is logged and returned with `total: 0, matching: 0, error: true` rather than failing the whole call), compute `total`/`matching`/sorted `projects`, apply the cap, build the DTO. Program existence is checked with `ClarisaInitiativesRepository.findOne({ official_code, active: true })` exactly like `getBilateralProjectsByScienceProgram`.
- **Repository:** no new queries. `getAllRolesByUser` already joins `clarisa_center.code = role_by_user.center_id` → `clarisa_institutions` for name/acronym; `getProjectsByCenter` already handles code → `institutionId` → `organization_code` and the alias fallback. **This is the reversion-free path: the two identity mappings that bit earlier specs (`KZ-OPF-1` class) are executed by code that already ships and is tested.** Caveat: `getAllRolesByUser` falls back to a legacy query **without** center columns on any SQL error — the service must detect rows whose `center_id` is `undefined` (not `null`) and fail the call instead of returning `centers: []`.
- **Cap:** 300 projects total, applied after per-center sorting, preserving center order (centers sorted by `matching` desc, then name). `truncated: true` when cut.
- **Module wiring:** `ResultsFrameworkReportingModule` adds `BilateralProjectsService` to providers and `TypeOrmModule.forFeature([ClarisaProject, ClarisaCenter, ClarisaInitiative])`; `YearRepository`, `ClarisaInitiativesRepository`, `HandlersError` and `RoleByUserRepository` are **already** providers of this module (`results-framework-reporting.module.ts`).
- No transactions, no background jobs, no side effects. Workflow reference: read path of `docs/trd/trd.md` W1 (result creation) — this endpoint precedes it.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- No new routes. The hub renders inside `DashboardLabComponent`'s overview branch (`rfrView === 'overview'`), mounted **before** `<app-program-overview>` in `dashboard-lab.component.html`.
- Navigation targets (all existing): `…/entity-details/<code>?tocView=byAow&tocAow=<AoW>`, `…?tocView=aows`, `/bilateral/<acronym>/create`, `/bilateral/<acronym>/home`.
- Guards: none added (Overview already behind the app's auth guard).

### 6.2 Components & services

| Piece | Path | Responsibility |
|---|---|---|
| `ReportingEntryHubComponent` (`app-reporting-entry-hub`) | `dashboard-lab/components/reporting-entry-hub/reporting-entry-hub.component.{ts,html}` | Standalone, signals. Inputs: `programCode`, `phaseLabel`, `isActivePhase`, `activeYear`, `aowRows` (`{code,name,done,total}[]`), `programLevelRows` (`{kind:'intermediate'|'2030', name, done, total}[]`), `canReportW1W2`, `w3State` (`{status:'loading'|'ready'|'error'|'no-centers', data?}`), `myCentersCount`. Outputs: `reportAow(code)`, `reportProgramLevel(kind)`, `createResult({project, center})`, `retryW3()`, `collapsedChange(boolean)`. Owns: collapse state (restored from `localStorage['pr.hub.collapsed']`), search query, per-center expanded map, per-center `showAll` set, the `aria-live` message. |
| `HubW3LaneComponent`? | — | **Not split**: one component, two template regions. Splitting adds inputs plumbing for a ~250-line template. Revisit only if the W3 lane grows a second consumer. |
| `hub-copy.ts` | same folder | Every user-facing string of the hub as a constant map (NFR i18n). |
| `ResultsApiService.GET_reportingEntryHubProjects(programId)` | `shared/services/api/results-api.service.ts` | `HTTP_METHOD_descriptiveName` convention; URL `${environment.apiBaseUrl}api/results-framework-reporting/reporting-entry-hub/projects?programId=…` — **not** the service's `apiBaseUrl` member, which already ends in `api/results/` (see the sibling `GET_bilateralProjectsByProgram`). |
| `DashboardLabComponent` | existing | Loads W3 data once per program (effect on `selected()`, deferred with `afterNextRender`/`setTimeout(0)` so it never blocks first paint) — **always** issues the request (`RolesService.getMyCenters()` is a plain non-reactive property and may be empty on a cold load; the server derives membership); `no-centers` = response `centers.length === 0`; `activeYear` from the response; `isActivePhase` = selected phase year === `activeYear`; exposes `w3State` signal; fixes `onOpenAow` (routes by code — REH-R-10); handles `createResult` by calling `BilateralCreationService.selectProject(project)` then `router.navigate(['/bilateral', center.acronym, 'create'])` — the bilateral shell resolves `:acronym` by `center_acronym`, so a center without acronym cannot be routed: the hub disables that center's Create result with title "Center acronym missing — open it from My CGIAR Centers"; handles `reportProgramLevel` by navigating with `queryParams: { tocView: 'aows' }` only. |
| `ProgramOverviewComponent` | existing | KPI cards 2/3: after `setActiveSection('bilateral')`, emit a new output `focusHub('w3')`; the host scrolls `#reporting-entry-hub-w3` into view and focuses its heading. "Progress by area of work" rows: add an inline **Report** button (stops propagation, emits the existing `openAow` output). |
| `BilateralCreationService` | existing, root-provided | `selectProject(project)` — verified against source: `BilateralResultCreatorComponent.ngOnInit` preserves the preselection across `resetWizard()` on the create path. No `projectId` query param needed (REH-OQ-4 closed). |
| `RolesService.getMyCenters()` | existing | Used only for `myCentersCount` (default-collapsed heuristic, REH-R-12); **never** to skip the request. |

State boundary: hub UI state is component-local; W3 data lives in `DashboardLabComponent` (same place as `bilateralRows`), keyed by program code so switching programs refetches.

### 6.3 Design system usage

- **Tailwind-first** (DD-12), arbitrary px values (page is 12px base). No new SCSS classes beyond `:host` if needed.
- Tokens reused verbatim from `program-overview.component.html`: cards `rounded-[12px] border-[var(--pr-border)] bg-[var(--pr-surface-card)] p-[20px]`; rows `rounded-[10px] bg-[var(--pr-surface-ground)] px-[16px] py-[12px]`; AoW code chip `bg-purple-100/80 … font-mono text-[11px] font-bold text-purple-800`; progress bar `h-[7px] rounded-full bg-[var(--pr-border)]/60` with `from-[var(--pr-color-primary-500)] to-[var(--pr-color-primary-400)]`; primary button `bg-[var(--pr-color-primary-300)] hover:bg-[var(--pr-color-primary-400)] text-white rounded-[8px] h-[36px]/[30px]`; secondary `border-[var(--pr-color-primary-200)] text-[var(--pr-color-primary-500)]`; lane accents: W1/W2 `inset 4px 0 0 var(--pr-color-primary-300)`, W3 `inset 4px 0 0 var(--pr-status-approved-fg)`; allocation chip `bg-[var(--pr-color-primary-50)] border-[var(--pr-color-primary-100)] text-[var(--pr-color-primary-500)]`.
- Icons: `@ng-icons/lucide` (the set the band uses). The hub declares its **own** `providers: [provideIcons({ lucideInfo, lucideSearch, lucideChevronDown, lucideChevronUp, lucideArrowRight, lucidePlus, lucideX })]` — `provideIcons` is component-scoped; the band registers only `ChevronsDownUp/ChevronsUpDown/Info/Search/X/Zap`. Jest: `tests/mocks/ngIconsLucideMock.ts` exports only 12 names — add the new ones there or specs resolve them to `undefined`. No emoji, no other icon set.
- Mockup of record: `mockup/Main.dc.html` (Variant A, search-first W3 lane).
- Responsive: hub grid `grid-cols-2` ≥ 1280 px, `grid-cols-1` below (`max-[1279px]:grid-cols-1`); progress bars `max-[899px]:hidden`.
- A11y: each lane `<section aria-labelledby>`; center group header is a `<button aria-expanded aria-controls>`; search `<label>` visually hidden; `aria-live="polite"` span for counts / expansion; focus-visible ring `ring-2 ring-[var(--pr-color-primary-300)]`; disabled Report buttons keep `aria-disabled` and a native `title` (verified: `PrTooltipDirective` is hover/click only — `KZ target-tooltip-1` — so a native `title` is the keyboard-reachable choice).
- i18n: literal strings centralised in `hub-copy.ts` (accepted deviation, documented in requirements NFR).

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

- Endpoint under `api/*` → `JwtMiddleware` (AC-3). Center membership resolved server-side from the token's user id; query cannot name centers. A user with no `Center` role rows receives `centers: []` — no enumeration of other centers' projects is possible (QAS-2).
- Program code validated (trim/upper, 400) and matched against active initiatives (404) — no free-text reaches SQL (the reused services use TypeORM `find`).
- Throttling: default global throttler applies (one call per Overview load).
- Logs: ids and counts only (`.cursorrules`, AC-9).

---

## 8. Performance & Capacity

- QPS: ≤ 1 per Overview visit; payload ≤ 200 KB at the cap (projects carry `summary`/`description` — trimmed to 200 chars in the DTO).
- Server work: `getAllRolesByUser` (1 query) + per center `getProjectsByCenter` (3–4 small `find`s each, in-memory filters) — for 4 centers ≈ 15 queries, all indexed (`IDX_clarisa_projects_organization_code`). Expected p95 well under 1 s; not measured automatically (accepted risk in requirements §8).
- Client: hub W1/W2 lane costs no request; W3 request deferred after first paint; lists render ≤ 3 rows per center until `Show all`; search is an in-memory `computed` over ≤ 300 items.
- No new dependencies; Lambda bundle unaffected.

---

## 9. Observability

- Server log event `reporting_entry_hub.projects` `{ userId, programCode, centers, projects, truncated, failedCenters, ms }` on success; `reporting_entry_hub.projects.error` `{ userId, programCode, code }` on failure. No names/emails/tokens.
- Moves `docs/prd.md` M1.2 (time to first submission) indirectly; no new metric.
- Error-budget: a failure here degrades one lane only (REH-R-4.4); the Overview never 5xx's because of the hub.

---

## 10. Testing Plan

- **Server unit (Jest, `@nestjs/testing`)** `reporting-entry-hub.service.spec.ts`: mocks `RoleByUserRepository.getAllRolesByUser`, `BilateralProjectsService.getProjectsByCenter`, `ClarisaInitiativesRepository.findOne`. Cases: two centers of three (scoping), N/M counts, allocation sort with **string** allocations (`'100'`,`'40'`,`'9'`), case-insensitive program code, no-center user → `centers: []`, cap → `truncated`, one center rejecting → partial result with `error: true`, legacy roles rows (no `center_id` key) → error. Fixture ids as **strings** where the DB returns bigint (`KZ-OPF-1`). Controller spec: 400 on empty code, passes `user.id`.
- **Client unit (Jest)** `reporting-entry-hub.component.spec.ts`: renders lanes; collapse persists via `localStorage` stub; groups expand/collapse with `aria-expanded`; 3-row slice + Show all/less; search filters across centers and updates the live region; empty states (no-centers, none-funding, no-rights) and error + Retry; Create result emits project + center. `dashboard-lab.hub.spec.ts` (new, focused): `onOpenAow('AOW03')` navigates with `{tocView:'byAow', tocAow:'AOW03'}`, `onOpenAow('xcut')` with `{tocView:'aows'}`; `createResult` calls `selectProject` then navigates. **The existing `dashboard-lab.component.spec.ts:412-423` asserts the old `{tocView:'aows'}` navigation for `onOpenAow` — REH-T-4 must update those two cases.** `program-overview.component.spec.ts`: KPI card 2 emits `focusHub`; AoW row Report button emits `openAow` without triggering the row click.
- **Manual (recorded in `execution.md`)**: one browser pass on the QA URL for layout/contrast/focus and the end-to-end `Create result → creator shows project` (jsdom cannot cover). No Cypress added (owner mandate: targeted tests only).
- **Command scope:** run only the spec files touched (`npx jest <path>`), never the full client suite.

---

## 11. Backwards Compatibility & Migration Plan

- Additive endpoint; no migration; no flag. Rollback = revert the PR.
- `onOpenAow` change alters the URL produced by an internal navigation (`aows` → `byAow` + code); no external consumer depends on it (the `openAow` output path was effectively broken).

---

## 12. Design Decisions (ADRs)

### `REH-DD-1` — Reuse `BilateralProjectsService.getProjectsByCenter()` per center instead of a new SQL join
- **Context:** the center identity chain (`role_by_user.center_id` = CLARISA code → `clarisa_center.institutionId` → `clarisa_projects.organization_code`) plus the W3 acronym alias fallback are already implemented and unit-tested there.
- **Decision:** orchestrate over the existing service; add no repository query.
- **Alternatives:** (a) one hand-written SQL join — faster but duplicates the alias fallback and the id mapping (the exact class of bug `KZ-OPF-1` records); (b) call `GET api/bilateral/center/projects` from the client per center — 200-project payloads × centers on every Overview, and the client would decide membership (violates AC-3).
- **Consequences:** ~15 small queries per call instead of 1; acceptable at ≤ 1 call per page view. If a center holds thousands of projects this should become a query — recorded in §13.

### `REH-DD-2` — W3 lane is active-reporting-phase only
- **Context:** `getProjectsByCenter` filters `phase = active year`; bilateral creation is only open in the active phase; the by-program endpoint likewise ignores `versionId`.
- **Decision:** no `versionId` on the endpoint; the lane shows a note when the overview phase differs (REH-R-6).
- **Alternatives:** thread `versionId` → year through a new service signature (touches `BilateralModule` semantics for a lane whose action is impossible in past phases); hide the lane on non-active phases (hides the map exactly when a viewer explores history).
- **Consequences:** the phase selector drives the W1/W2 lane only; documented in copy.

### `REH-DD-3` — Deep link via the existing `byAow` browse view, not a new "expand group" input
- **Context:** `ReportingAowTableComponent` has no per-code expansion lever (overrides are a `linkedSignal` map reset on scope change); `?tocView=byAow&tocAow=` is already parsed, restored and written by `DashboardLabComponent`.
- **Decision:** `onOpenAow(code)` routes by code: AoW code ∈ `aows()` → `byAow` + `tocAow`; anything else (`'xcut'`, Intermediate/2030 codes, ToC-map codes) → `aows`. Hub rows call the same method. No fragment, no scroll, no expansion (the grouped table's top-level cards start collapsed and have no per-code lever; the client has no `anchorScrolling`).
- **Alternatives:** add an `expandCode` input + scroll logic to the table (new API on a component owned by another spec's tests); open the AoW detail view (`openAow`) — that is the indicator detail, not the reporting group.
- **Consequences:** the `byAow` view is the canonical "report for this AoW" landing; if that view is later removed, this DD must be revisited.
- **Reversion check (Step 2.3):** `onOpenAow` changes an already-shipped navigation (`aows`, no code). Callers today: the overview's AoW rows, the cross-cutting rows (`openAow.emit(row.code || 'xcut')`, `program-overview.component.html:735`) and the ToC-map click (`onTocMapClick`) — all through the same `(openAow)` binding (`dashboard-lab.component.html:1215`). Routing by code keeps every non-AoW caller on `aows` (unchanged) and only AoW codes gain `byAow`+`tocAow`. `dashboard-lab.component.spec.ts:412-423` asserts the old exact args and **must be updated in REH-T-4** (else CI red). The table's `(openAow)` binds to `openAow()` (detail view), untouched. `onOpenAow` has no `queryParamsHandling` today and none is added (a `merge` would drag `aow/typ/st/q` onto the Reporting tab; no `phase` query param exists — phase lives in `selectedVersionId`).

### `REH-DD-4` — Project preselection through `BilateralCreationService.selectProject()`
- **Context:** the bilateral home already does this; the creator preserves the selection across `resetWizard()` on the create path (verified in `bilateral-result-creator.component.ts` `ngOnInit`).
- **Decision:** keep the endpoint's project item shape identical to `BilateralProject` so the hub passes it straight to `selectProject()`.
- **Alternatives:** `?projectId=` query param (new creator code, and the creator would need to fetch the project); navigate to center home with the project highlighted (one extra hop — the hop we are removing).
- **Consequences:** the shape coupling is now a contract — noted in the DTO section and covered by a test that the hub's item satisfies `selectProject`'s input.

### `REH-DD-5` — One hub component, collapse state in `localStorage`
- **Context:** REH-R-5 needs cross-program persistence; no user-preference endpoint exists for UI state.
- **Decision:** `localStorage['pr.hub.collapsed']` (same convention as `FontScaleService`'s `pr.a11y.fontScale`), try/catch around access.
- **Alternatives:** per-program key (users wanted the dashboard first everywhere, not per program); server preference (over-engineering for a boolean).
- **Consequences:** state is per browser, not per account — acceptable for a convenience.

---

## 13. Open Gaps & Follow-ups

- Program-level Report lands on the grouped view with its top-level cards collapsed (no expansion/scroll lever without touching `ReportingAowTableComponent`) — accepted for this spec; a per-code `expand` input is a candidate follow-up.
- Endpoint latency not measured automatically; if a center exceeds ~1 000 projects, replace REH-DD-1's fan-out with a single query (keep the DTO).
- `auth/center-user` still in progress: until Center User assignments exist in an environment, every user sees the REH-R-4.1 empty state — expected.
- "Recently used first" (REH-R-11) and "Continue where you left off" (REH-R-13) are SHOULD/MAY — implemented only if the budget in §14 holds.
- Tab naming (`Reporting` vs `Results`) remains an open UX question outside this spec.

---

## 14. Budget (Step 2.4 sizing)

| Measure | Estimate |
|---|---|
| Tasks | **7** (server 2, client 4, verification 1) |
| LOC (added + changed, excluding tests) | **~650** (server ~180, client ~470 incl. ~250 template) |
| Tests LOC | ~350 |
| Review rounds | **≤ 1 per task** (owner mandate: no repeated reviewer loops; a second FAIL on the same task escalates instead of retrying) |
| SHOULD gate | `REH-T-6` is skipped when actual LOC after `REH-T-4` exceeds **700** — this number gates only that task; the **900** tripwire below is the escalation limit for the whole spec |

Depth check: `Standard` matches (multi-task, one endpoint, UI with states; no migration/auth change that would demand `Full`). Tripwire for `/akili-execute`: > 9 tasks or > 900 LOC → stop and escalate.

Gate: **auto-approved (pre-approved mode)**, 2026-08-28.

---

## Required cross-references

- `docs/specs/changes/reporting-entry-hub/requirements.md`, `proposal.md`, `tasks.md`, `mockup/Main.dc.html`.
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `docs/specs/results/intermediate-outcome-aow-visibility/family.md`; `docs/specs/auth/center-user/requirements.md`.
