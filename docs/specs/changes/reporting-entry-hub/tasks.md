# Module Spec — Reporting Entry Hub — Tasks

> Approval Mode: **pre-approved** (see `proposal.md`). Execution rules from the owner: **max 1 Reviewer round per task** (a second FAIL escalates to the user instead of a retry), **targeted test runs only** (`npx jest <spec path>`; never `npm test` for the whole client), no Cypress.

## 1. Scope of this task list

- **Module / feature:** `results` / `reporting-entry-hub` (`changes/reporting-entry-hub`)
- **Linked spec:** `requirements.md` + `design.md` (same folder); mockup `mockup/Main.dc.html`.
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** `not-started`
- **Budget (design §14):** 7 tasks · ~650 LOC · ≤ 1 review round/task. Tripwire: > 9 tasks or > 900 LOC → stop and escalate.

---

## 2. Pre-flight checklist

- ✅ `requirements.md` approved — auto-approved (pre-approved mode), 2026-08-28.
- ✅ `design.md` approved — auto-approved (pre-approved mode), 2026-08-28.
- ✅ Open questions resolved (`REH-OQ-1..6`).
- ✅ CLARISA dependencies confirmed: existing cache tables only; no sync change.
- ✅ No conflicting in-flight spec on the same files: `auth/center-user` touches guards/roles admin, not `dashboard-lab` or `results-framework-reporting.controller`; `bilateral/webhook-external-platforms` is server-only in `api/results` webhook + `api/bilateral` services (does not touch `bilateral-projects.service.ts`). Re-run `git status` before starting.
- ✅ No migration in this spec — `migration:check` unaffected.

---

## 3. Task list

### `REH-T-1` — Server: `ReportingEntryHubService` + DTOs

- **Status:** `[x]`
- **Type:** `server`
- **Description:** Create `api/results-framework-reporting/services/reporting-entry-hub.service.ts` and `dto/reporting-entry-hub-projects.dto.ts`. `getMyCenterProjects(userId, programId)`: validate/normalise the code (400 empty — the service owns this, like the sibling; 404 unknown/inactive initiative), resolve the caller's centers from `RoleByUserRepository.getAllRolesByUser` (rows with `role_level_name === 'Center'`; if the rows carry no `center_id` key at all — legacy fallback query — throw a 500 lookup error, never `centers: []`), read the active year from `YearRepository` for `activeYear`, fan out to `BilateralProjectsService.getProjectsByCenter(center.code)` with `Promise.allSettled`, compute `total`/`matching`, attach `allocation = Number(mapping.allocation)` for this program (the column is a decimal **string**), sort (numeric allocation desc, `shortName` asc), order centers (`matching` desc, name asc), cap 300 → `truncated`, trim `summary`/`description` to 200 chars, log `reporting_entry_hub.projects` (ids/counts only). Register `BilateralProjectsService` + required `TypeOrmModule.forFeature` entities in `ResultsFrameworkReportingModule`.
- **Implements:** `REH-R-9`, `REH-R-9.1`, `REH-R-3` (N/M semantics), `REH-R-3.2` (sort), `REH-R-3.6` (totals), `REH-AC-12` (incl. **BUT** no-role → `centers: []`), `REH-AC-13`; `REH-AC-3` **AND IT MUST** sort by allocation desc; NFR Security, Payload, Observability.
- **Design refs:** §2.2, §4.1, §5, §12 REH-DD-1, REH-DD-2, REH-DD-4.
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/services/reporting-entry-hub.service.ts`, `…/dto/reporting-entry-hub-projects.dto.ts`, `…/results-framework-reporting.module.ts`.
- **Depends on:** —
- **Blocks:** `REH-T-2`
- **Estimate:** `M`
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Tests (`REH-TEST-1`):** `reporting-entry-hub.service.spec.ts` — (a) user in C1+C2, C3 has SP02 projects → response has C1, C2 only; (b) `total`/`matching` per center; (c) sort by allocation desc then `shortName` with **string** fixture allocations `'100'`, `'40'`, `'9'` (a lexical sort puts `'9'` first → FAIL); (d) `sp02` lower-case matches; (e) no `Center` rows → `centers: []`, no `getProjectsByCenter` call; (f) cap: 301 mocked projects → 300 + `truncated: true`, center order preserved; (g) one center rejects → that center `error: true, total: 0, matching: 0`, others intact; (h) unknown program → 404; (i) roles rows without a `center_id` key (legacy fallback shape) → rejects with 500, `getProjectsByCenter` not called. Fixture ids as **strings** (`'1368'`) where the DB yields bigint.
- **Verification:** `cd onecgiar-pr-server && npx jest --forceExit src/api/results-framework-reporting/services/reporting-entry-hub.service.spec.ts` green **and** `npx eslint src/api/results-framework-reporting --quiet` clean.
  - *Input that makes it fail:* remove the `role_level_name === 'Center'` filter → case (a) returns C3 (any role row) → FAIL; drop the `allocation` sort → (c) FAIL.
  - *Disqualifier:* a green run where cases (a) and (f) assert only `toBeDefined()` is not evidence — each case must assert the exact center codes / counts.
- **Definition of done:**
  - Service + DTOs + module wiring compile; DI resolves (`npx jest --forceExit src/api/results-framework-reporting/results-framework-reporting.module.spec.ts` still green).
  - `REH-TEST-1` cases (a)–(i) green.
  - Lint clean; no names/emails in logs.
  - Commit: `✨ feat(results-framework-reporting): add reporting-entry-hub service for my-center projects by program`.

### `REH-T-2` — Server: controller endpoint

- **Status:** `[ ]`
- **Type:** `server`
- **Description:** Add `GET reporting-entry-hub/projects` to `results-framework-reporting.controller.ts` with `@UserToken() user: TokenDto` and `@Query('programId')` (same name as the sibling `bilateral-projects/by-program`), Swagger annotations, delegating `(user.id, programId)` to `ReportingEntryHubService` (validation in the service). Returns the `{response, message, status}` envelope.
- **Implements:** `REH-R-9` (JWT + user from token), `REH-AC-12` (HTTP contract); NFR Security.
- **Design refs:** §4.1, §7.
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.controller.ts` (+ `.controller.spec.ts`).
- **Depends on:** `REH-T-1`
- **Blocks:** `REH-T-4`
- **Estimate:** `S`
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Tests (`REH-TEST-2`):** extend `results-framework-reporting.controller.spec.ts` — passes `(user.id, 'SP02')` to the service and returns its envelope unchanged.
- **Verification:** `cd onecgiar-pr-server && npx jest --forceExit src/api/results-framework-reporting/results-framework-reporting.controller.spec.ts` green.
  - *Input that makes it fail:* controller reads `@Query('centerId')` or omits `@UserToken()` → the `(user.id, 'SP02')` assertion FAILs.
  - *Disqualifier:* a test that mocks the service and only asserts "was called" without the `(userId, 'SP02')` args is not evidence.
- **Definition of done:**
  - `REH-TEST-2` green; Swagger annotations present.
  - Commit: `✨ feat(results-framework-reporting.controller): expose GET reporting-entry-hub/projects`.

### `REH-T-3` — Client: `ReportingEntryHubComponent` (template + state + copy)

- **Status:** `[ ]`
- **Type:** `client`
- **Description:** Standalone signals component in `dashboard-lab/components/reporting-entry-hub/` per design §6.2/§6.3, from `mockup/Main.dc.html`: header with title/subtitle and **Collapse/Expand** (persisted in `localStorage['pr.hub.collapsed']`, try/catch), collapsed one-line summary; **W1/W2 lane** (AoW rows with code chip, name, progress bar, done/total, **Report** button; "Program-level · cross-cutting" divider + Intermediate/2030 rows; no-rights state with disabled buttons + native `title` + line "Ask your program admin…"; footer sentence about "Report emerging result"); **W3 lane** (header totals badge; search input with visually-hidden label and match counter; per-center disclosure groups with `N of M projects fund <SP>`; first center with `N>0` expanded; 3-row slice + `Show all N` / `Show less`; project row = code, name, `<SP> <allocation>%` chip, **Create result**; `N=0` center row with "Open center home"; states: loading skeleton (3 rows), `no-centers` empty state with mailto Request access, `none-funding` sentence, error + **Retry**, `truncated` notice, active-phase note when `!isActivePhase`); `aria-live="polite"` region; `hub-copy.ts` with every string. Responsive per §6.3. Default collapsed when `!canReportW1W2 && myCentersCount === 0` and nothing stored (REH-R-12).
- **Implements:** `REH-R-1`, `REH-R-2`, `REH-R-2.1`, `REH-R-3`, `REH-R-3.1`, `REH-R-3.2` (slice/Show all), `REH-R-3.3`, `REH-R-3.4`, `REH-R-3.6`, `REH-R-4.1`, `REH-R-4.2`, `REH-R-4.3`, `REH-R-4.4` (lane UI), `REH-R-4.5`, `REH-R-4.6` (per-center error row), `REH-R-5` (persistence), `REH-R-6` (active-phase note), `REH-R-9.1` (client notice), `REH-R-12`; `REH-AC-1` (lane content), `REH-AC-3`, `REH-AC-4` (incl. **BUT** clearing restores slices/collapse), `REH-AC-6` (incl. **BUT** lane not hidden), `REH-AC-7`, `REH-AC-8`, `REH-AC-9` (lane-level), `REH-AC-10` (persistence half), `REH-AC-13` (notice), `REH-AC-14` (keyboard semantics); NFR Accessibility, Responsive, i18n.
- **Design refs:** §6.2, §6.3, §12 REH-DD-5.
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub/reporting-entry-hub.component.{ts,html,spec.ts}`, `…/hub-copy.ts`.
- **Depends on:** — (contract from design §4.1; parallel with `REH-T-1`)
- **Blocks:** `REH-T-4`, `REH-T-5`
- **Estimate:** `L`
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`
- **Tests (`REH-TEST-3`):** component spec with inputs — (a) two lanes render with the AoW rows + Intermediate/2030 rows and the given done/total; (b) `canReportW1W2=false` → Report buttons `aria-disabled` with the tooltip text, line present; (c) W3 ready with Alliance(44/198)+AfricaRice(17/52) → Alliance expanded 3 rows + `Show all 44`, AfricaRice collapsed header text, totals `61 projects · 2 centers`; (d) Show all → 44 rows, Show less → 3; (e) search `1368` → only matching rows across centers, counter `1 / 61`, both centers expanded; clearing → (c) state again; (f) `no-centers` → empty state with mailto, lane present; (g) all centers `matching=0` → "None of your centers…" + `0 of M` rows; (h) error → message + Retry emits `retryW3`; (h2) a center with `error: true` renders "Could not load projects for <center>" while others render; (i) Collapse → `localStorage` written; init with stored `true` → collapsed summary rendered; (j) group button toggles `aria-expanded` and live region text changes; (k) Create result emits `{project, center}`; (l) `truncated` → notice; (m) `isActivePhase=false` → note.
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-entry-hub` green **and** `npx ng lint --quiet` clean (the client has no flat ESLint config — `npx eslint <path>` does not run).
  - *Input that makes it fail:* a fixture with `matching=0` for every center must render the none-funding sentence — if the template renders the `no-centers` copy instead, (g) FAILs; a 4-project center rendering 4 rows FAILs (d).
  - *Disqualifier / what presence-assertions cannot prove:* class-name assertions prove markup, not layout or contrast — those are covered only by `REH-T-7`'s manual check; do not count a `toContain('grid-cols-2')` as responsive evidence.
- **Definition of done:**
  - `REH-TEST-3` (a)–(m) green; lint clean.
  - All copy in `hub-copy.ts`; no hard-coded strings in the template except icon names.
  - Tailwind-only styling; tokens from design §6.3 only (no new hex values).
  - Commit: `✨ feat(reporting-entry-hub): add where-to-report hub component (W1/W2 + W3 lanes)`.

### `REH-T-4` — Client: wire the hub into `DashboardLabComponent` + API method + deep-link fix

- **Status:** `[ ]`
- **Type:** `client`
- **Description:** Add `ResultsApiService.GET_reportingEntryHubProjects(programId)` using `${environment.apiBaseUrl}api/results-framework-reporting/reporting-entry-hub/projects` (not the `apiBaseUrl` member, which already ends in `api/results/`). In `DashboardLabComponent`: `w3State` signal; load after first paint when `selected()` is ready — **always** request (never short-circuit on `RolesService.getMyCenters()`, which is a plain non-reactive property); `no-centers` when the response has `centers.length === 0`; refetch on program change; `retryW3`; compute `aowRows` from `overviewAowProgress()` and `programLevelRows` from `overviewXcutProgress()` (map code → kind via `INTERMEDIATE_OUTCOMES_CODE` / `OUTCOMES_2030_CODE`; do not use `aowProgressRows()` or the local `AowProgressRow` interface) and `canReportW1W2` from `EntityAowService.canReportResults()`; `activeYear` from the response, `isActivePhase` = selected phase year === `activeYear`; mount `<app-reporting-entry-hub>` before `<app-program-overview>` in the overview branch with `id="reporting-entry-hub"` and the W3 lane anchor `id="reporting-entry-hub-w3"`; handlers: `reportAow(code)` → `onOpenAow(code)`; `reportProgramLevel(kind)` → navigate `{ queryParams: { tocView: 'aows' } }` only; `createResult({project, center})` → `BilateralCreationService.selectProject(project)` then `router.navigate(['/bilateral', center.acronym, 'create'])` (the hub disables the row when `acronym` is missing — the bilateral shell resolves `:acronym` by `center_acronym`, a code never matches). **Fix** `onOpenAow(code)` to route by code: `code` ∈ `aows().map(a => a.code)` → `{ tocView: 'byAow', tocAow: code }`; otherwise → `{ tocView: 'aows' }`. Add no `queryParamsHandling` (none exists today; `merge` would drag `aow/typ/st/q` along; there is no `phase` query param). **Update** the two existing cases in `dashboard-lab.component.spec.ts:412-423` that pin the old exact args.
- **Implements:** `REH-R-2.2`, `REH-R-2.3`, `REH-R-3.5`, `REH-R-4.1` (no-request path), `REH-R-4.4` (retry), `REH-R-6` (W1/W2 lane follows `versionId`), `REH-R-10`; `REH-AC-2` (incl. **BUT** program-level uses `aows`), `REH-AC-5` (client half), `REH-AC-10` (cross-program half), `REH-AC-11`; NFR Performance (deferred call, no new call for W1/W2).
- **Design refs:** §2.2, §2.3, §6.1, §6.2, §12 REH-DD-3, REH-DD-4.
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts`, `…/dashboard-lab/dashboard-lab.component.{ts,html}`, `…/dashboard-lab/dashboard-lab.component.spec.ts` (update the `onOpenAow` cases), new focused `…/dashboard-lab/dashboard-lab.hub.spec.ts`.
- **Depends on:** `REH-T-2`, `REH-T-3`
- **Blocks:** `REH-T-6`, `REH-T-7`
- **Estimate:** `M`
- **Skills:** `angular-developer`, `tdd`
- **Tests (`REH-TEST-4`):** (a) `onOpenAow('AOW03')` with `AOW03` in `aows()` → `router.navigate` called with `queryParams` `{ tocView: 'byAow', tocAow: 'AOW03' }` (**red on current code**: today sends `tocView: 'aows'`, no `tocAow`); (a2) `onOpenAow('xcut')` → `{ tocView: 'aows' }` and no `tocAow`; (b) `createResult` → `selectProject` called with the same object, then navigate to `['/bilateral', 'Alliance', 'create']`; (c) response `centers: []` → `w3State.status === 'no-centers'` (the request **is** issued even when `getMyCenters()` is empty); (d) API error → `status 'error'`; `retryW3` re-calls; (e) `reportProgramLevel('2030')` → `queryParams.tocView === 'aows'`, no `tocAow`, no `fragment`; (f) program switch triggers a new fetch with the new code; (g) the two pre-existing `onOpenAow` cases in `dashboard-lab.component.spec.ts` updated to the new args and green.
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.hub.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts` green; run (a) once **before** the fix and record the red; lint `npx ng lint --quiet`.
  - *Input that makes it fail:* leaving `onOpenAow` unchanged → (a) red; navigating before `selectProject` → (b) order assertion red.
  - *Disqualifier:* if the new spec stubs `router.navigate` to a no-op and asserts nothing about its args, it is not evidence — assert the args.
- **Definition of done:**
  - `REH-TEST-4` (a)–(g) green, with (a)'s pre-fix red noted in `execution.md`.
  - Overview renders the hub above "About this program" (`npx jest …/program-overview/program-overview.component.spec.ts` still green).
  - Lint clean on touched files.
  - Commit: `✨ feat(dashboard-lab): mount reporting entry hub, wire W3 projects and fix AoW deep link`.

### `REH-T-5` — Client: KPI cards focus the hub + inline Report on AoW progress rows

- **Status:** `[ ]`
- **Type:** `client`
- **Description:** In `ProgramOverviewComponent`: new output `focusHub` emitted by KPI cards 2 and 3 after `setActiveSection('bilateral')`; host (`DashboardLabComponent`) scrolls `#reporting-entry-hub-w3` into view (`scrollIntoView({block:'start'})`, respecting `prefers-reduced-motion`) and focuses its heading (`tabindex="-1"`). In the "Progress by area of work" rows: add a **Report** button (right of the percent badge, secondary style from design §6.3, `(click)` with `stopPropagation`, emits the existing `openAow` output with `row.code`); disabled with `title` when `!canReportW1W2` (new input).
- **Implements:** `REH-R-7`, `REH-R-8`, `REH-AC-15`; NFR Accessibility (focus move).
- **Design refs:** §6.2 (ProgramOverviewComponent row), §6.3.
- **Files (expected):** `…/dashboard-lab/components/program-overview/program-overview.component.{ts,html,spec.ts}`, `…/dashboard-lab/dashboard-lab.component.{ts,html}` (handler only).
- **Depends on:** `REH-T-4` (it edits `dashboard-lab.component.{ts,html}` after T-4's mount and needs the `#reporting-entry-hub-w3` anchor).
- **Blocks:** `REH-T-7`
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Tests (`REH-TEST-5`):** extend `program-overview.component.spec.ts` — (a) clicking KPI card 2 emits `focusHub('w3')` **and** still sets `activeSection` to `bilateral`; (b) clicking the row's Report button results in **exactly one** `openAow('AOW02')` emission (the row's own inline `openAow.emit(row.code)` must not fire a second one); (c) `canReportW1W2=false` → button `aria-disabled` + `title`.
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.spec.ts` green and `npx ng lint --quiet` clean (existing cases must stay green — the card-order assertion in that spec is pinned; do not reorder cards).
  - *Input that makes it fail:* omitting `stopPropagation` → (b) sees two emissions → FAIL.
  - *Disqualifier:* asserting the button exists proves presence, not that propagation is stopped — (b) must count emissions (the row handler is an inline template expression, not a spy-able method).
- **Definition of done:**
  - `REH-TEST-5` green plus the pre-existing spec cases.
  - Commit: `✨ feat(program-overview): KPI cards focus the reporting hub; inline Report on AoW rows`.

### `REH-T-6` — Client: sort "recently used first" (SHOULD) — *budget-gated*

- **Status:** `[ ]`
- **Type:** `client`
- **Description:** On `createResult`, store `{projectId, at}` in `localStorage['pr.hub.recentProjects']` (max 5, try/catch); the hub sorts rows by allocation tier then recency. **Skip** if actual non-test LOC after `REH-T-4` exceeds 700 (this threshold gates only this SHOULD task; the spec-wide escalation tripwire stays at 900, design §14) — record `deferred (budget)` in `execution.md`.
- **Implements:** `REH-R-11`.
- **Design refs:** §12 REH-DD-5 (storage convention), §13.
- **Files (expected):** `…/reporting-entry-hub/reporting-entry-hub.component.{ts,spec.ts}`, `…/dashboard-lab/dashboard-lab.component.ts`.
- **Depends on:** `REH-T-4`
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `angular-developer`
- **Tests (`REH-TEST-6`):** two projects with equal allocation, one recent → recent first; storage getter throws → allocation order, no error.
- **Verification:** `npx jest …/reporting-entry-hub` green.
  - *Input that makes it fail:* equal-allocation fixture with recency reversed → order assertion FAIL.
  - *Disqualifier:* a fixture whose allocations differ proves nothing about recency ordering.
- **Definition of done:**
  - `REH-TEST-6` green **or** task marked `deferred (budget)` with the LOC figure.
  - Commit: `✨ feat(reporting-entry-hub): recently used projects first within allocation tier`.

### `REH-T-7` — Verification: manual browser pass + execution record

- **Status:** `[ ]`
- **Type:** `tests`
- **Description:** With the local or QA stack (`docs/infrastructure.md` §6), open `entity-details/SP02/overview` as (1) a user with a center that funds SP02 and (2) a user without a center. Check: hub is first block; both lanes; Report on `AOW03` lands on By-AOW view for `AOW03`; program-level Report lands on the grouped view scrolled to Intermediate; Create result opens the creator with the project preselected (`REH-AC-5` end-to-end); empty state (2); collapse persists across SP02 → SP05; layout at 1440 / 1100 / 800 px; keyboard pass (Tab order, Enter/Space, focus ring visible); contrast by token reuse only. Record results with screenshots in `execution.md`. If no environment is reachable, record "manual check not run" — never mark it passed.
- **Implements:** `REH-AC-5` (end-to-end), `REH-AC-14` (focus visibility), NFR Responsive; substitutes for the defect classes with no automated gate (requirements §8 table).
- **Design refs:** §10 (manual).
- **Files (expected):** `docs/specs/changes/reporting-entry-hub/execution.md` (+ screenshots under `mockup/verification/`).
- **Depends on:** `REH-T-4`, `REH-T-5`
- **Blocks:** —
- **Estimate:** `S`
- **Skills:** `claude-in-chrome` (if available) or manual.
- **Verification:** the `execution.md` section lists every check above with PASS/FAIL/NOT-RUN and a screenshot per width.
  - *Input that makes it fail:* creator opening without the project preselected; focus ring invisible on Create result.
  - *Disqualifier:* a screenshot of the mockup instead of the running app is not evidence; "looks fine" without the three widths is not evidence.
- **Definition of done:**
  - Checklist recorded; any FAIL turned into a fix commit or an explicit accepted gap.

---

## 4. Dependency graph

```
REH-T-1 (server service)            REH-T-3 (hub component)        ← parallel-safe
   └── REH-T-2 (controller)              │
            └──────────────┬─────────────┘
                           └── REH-T-4 (wire into dashboard-lab + API + deep-link fix)
                                   ├── REH-T-5 (KPI focus + inline Report; needs T-3's anchor)
                                   ├── REH-T-6 (recently used — budget-gated)
                                   └── REH-T-7 (manual verification)  ← after T-4 and T-5
```

Parallel branches: `T-1→T-2` ∥ `T-3`. No cycles.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `REH-TEST-1` | unit (server) | `REH-R-9`, `REH-R-9.1`, `REH-R-3`/`3.2`/`3.6`, `REH-R-4.6` (server half), `REH-AC-12`, `REH-AC-13` | `onecgiar-pr-server/src/api/results-framework-reporting/services/reporting-entry-hub.service.spec.ts` |
| `REH-TEST-2` | unit (server) | `REH-R-9` (JWT/user), `REH-AC-12` HTTP | `…/results-framework-reporting.controller.spec.ts` |
| `REH-TEST-3` | unit (client) | `REH-R-1`, `2`, `2.1`, `3.x`, `4.1–4.5`, `5`, `6` (note), `9.1`, `12`; `REH-AC-1,3,4,6,7,8,9,10,13,14` | `…/components/reporting-entry-hub/reporting-entry-hub.component.spec.ts` |
| `REH-TEST-4` | unit (client) | `REH-R-2.2`, `2.3`, `3.5`, `4.4`, `6`, `10`; `REH-AC-2`, `5` (client), `10`, `11` | `…/dashboard-lab/dashboard-lab.hub.spec.ts` + updated cases in `dashboard-lab.component.spec.ts` |
| `REH-TEST-5` | unit (client) | `REH-R-7`, `REH-R-8`, `REH-AC-15` | `…/components/program-overview/program-overview.component.spec.ts` |
| `REH-TEST-6` | unit (client) | `REH-R-11` | `…/reporting-entry-hub.component.spec.ts` |
| `REH-MANUAL-1` | manual | `REH-AC-5` e2e, `REH-AC-14` focus, Responsive, contrast | `execution.md` |

Scenario/clause coverage (Step 3.2 rule): every `REH-AC-*` row and every **BUT / AND IT MUST** clause is named in a task — `AC-2` BUT (T-4), `AC-3` AND IT MUST sort (T-1 + T-3), `AC-4` BUT clear (T-3), `AC-6` BUT not hidden (T-3), `AC-12` BUT no-role → `[]` (T-1). `REH-R-13` (MAY) is intentionally not owned.

Coverage thresholds: targeted runs don't compute coverage; CI's full run must stay above server 5/20/35/40 and client 50/60/60/60 — new files ship with their specs.

---

## 6. Rollout & verification

- Single PR (see PR strategy) with the commit convention.
- CI green (lint, tests, build, `migration:check:ci` unaffected, SonarCloud).
- Manual QA per `REH-T-7` on the QA environment.
- No bilateral/platform-report payload change → no downstream notice.

**PR strategy:** ~650 LOC + ~350 test LOC → **one PR** is acceptable but at the upper edge; if review turnaround matters, split as **PR 1: `REH-T-1`+`REH-T-2` (server, independently mergeable)** and **PR 2: `REH-T-3`…`REH-T-7` (client)**, PR 2 description linking PR 1 and stating "review the hub component first; `dashboard-lab` changes are wiring + the one-line deep-link fix".

---

## 7. Cleanup & follow-ups

- Spec status → `shipped`; `/akili-archive` syncs `dashboard-lab/CLAUDE.md` (new component) and the TRD module table (new endpoint).
- Follow-ups from design §13: single-query rewrite if a center exceeds ~1 000 projects; tab naming question.

---

## 8. Roll-back plan

1. Revert the PR(s) (client first if split, then server).
2. No migration to revert; no flag.
3. Verify `entity-details/:code/overview` renders as before and `onOpenAow` behaviour reverts (pre-existing, broken but harmless).

---

## Required cross-references

- `requirements.md`, `design.md`, `proposal.md`, `mockup/Main.dc.html` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`, `docs/infrastructure.md` §6.
