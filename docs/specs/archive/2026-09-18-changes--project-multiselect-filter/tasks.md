# Project Multiselect Filter — Tasks

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-multiselect-filter` |
| Type / Depth | Change / Lite |
| Status | approved (2026-09-18, pivot) |
| Approval Mode | gated |
| Date | 2026-09-18 |
| Requirements | [`requirements.md`](./requirements.md) — pivot amended, in-review |
| Design | [`design.md`](./design.md) — pivot amended, in-review |
| Execution Model | `gpt-5.6-luna` requested; wave-1 binding was `opencode-go/glm-5.2` (accepted by user) |
| Budget (revised) | 1 task; approximately 450 total changed LOC; 2 review rounds |
| PR Strategy | One PR (client + server together, one additive endpoint param); no split justified below 400 new LOC |

## 2. Pre-Flight Checklist

- [x] Proposal intent is approved; pivot to center-catalog options approved in principle (final spec approval pending this document).
- [x] Pivot Record documents the row-derived-options defect and the user's phase reminder.
- [x] Server change is bounded to an optional `year` query parameter; no response-shape or contract change.
- [ ] Confirm the working tree contains wave-1 changes to the four client files and no conflicting edit.
- [ ] Load the required skills before editing: `angular-developer`, `spartan`, `ui-ux-pro-max`, `nestjs-expert`.

## 3. Task List

### `PMF-T-1` — Expose and verify the center-catalog project multiselect

- **Status:** `[x]` completed (2026-09-18)
- **Type:** client / server / tests / docs
- **Size:** M (at most 1 working day of rework on top of wave 1)
- **Estimate:** approximately 210 new changed LOC (server ≈40, client ≈70, tests ≈100) on top of wave 1's 238
- **Depends on:** none
- **Blocks:** specification completion
- **Implements:** `PMF-R-1`, `PMF-R-2`, `PMF-NFR-1..5`, `PMF-AC-1..4`
- **Design references:** §6 API Design, §7 Backend, §8 Frontend/UX, `PMF-DD-1..5`
- **Required skills:** `angular-developer`, `spartan`, `ui-ux-pro-max`, `nestjs-expert`
- **Optional verification skill:** `playwright-cli` when the local browser harness is available

#### Scope

1. Server: accept optional `year` on `GET /api/bilateral/center/projects` and filter by it in `BilateralProjectsService.getProjectsByCenter`; absent or invalid falls back to the active year; extend co-located server specs.
2. Client: replace the row-derived `projectOptions` source with a per-phase-year catalog fetch (`GET_bilateralProjects` with `year`), page-lifetime cache per year, and a deduplicated union for the selected phases; keep deep-link retention and the existing selection handler.
3. Keep the wave-1 template placement (Project between Source and Created by) unchanged.
4. Rewrite the wave-1 option-derivation Jest cases against the catalog source; keep URL/chip/OR/AND/clear cases.
5. Update and re-stamp the local `bilateral-results-list/CLAUDE.md` contract.

#### Scenario and clause ownership

| Requirement clause | Task evidence |
|---|---|
| `PMF-R-1` Catalog options for selected phases; one option per id; label `shortName + fullName` with `Project <id>` fallback | Client test mocks the catalog per year, unions two years with a shared project id, and asserts dedupe, labels, sorting. |
| `PMF-R-1` Filter by two projects: OR within projects, AND with other dimensions, unlinked/unselected rows must NOT match | Kept wave-1 component cases, updated to catalog-driven options. |
| `PMF-R-1` AND IT MUST apply without another results request | Results-API call count frozen after load; selection changes it by zero; catalog call count increases only for uncached years. |
| `PMF-R-1` Phase-scoped options: union per selected years; phase change fetches only new years | Client test swaps `selectedPhaseIds` and asserts exactly the new years requested and the options recomputed. |
| `PMF-R-1` Catalog loading/empty/failure: empty options, no invented values, no new state surface, no retry loop | Client test simulates per-year failure and asserts degraded union and bounded request count; browser check confirms no new visual state. |
| `PMF-R-2` Select/share/clear: comma URL, labels, hydration, individual removal, Clear all, unrelated params, replace history, no loop | Kept wave-1 route-subject/router-spy cases. |
| `PMF-R-2` Deep-linked id absent from catalog stays selected/removable | Kept wave-1 `project=999` case against catalog options. |
| `PMF-NFR-1` At most one catalog request per phase year per page lifetime | Client call-count test across repeated popover opens and selections. |
| `PMF-NFR-4` Endpoint keeps current behavior without `year`; invalid `year` never 5xxs | Server service/controller spec: absent/undefined/non-numeric `year` resolves to the active year. |
| `PMF-NFR-2/3` accessible focus and 1280px/900px fit | Real-browser keyboard and viewport check (HITL); Jest presence alone does not satisfy these clauses. |
| `PMF-NFR-5` no new data exposure; `auth` posture unchanged | No route or guard change in the diff; server diff confined to the existing controller/service. |

#### Automated verification

Client (`onecgiar-pr-client/`):

1. `npx jest --silent --reporters=summary --no-coverage --runInBand src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts src/app/pages/bilateral/bilateral-result-filter.spec.ts src/app/pages/bilateral/bilateral-query-params.spec.ts`
2. `npx ng lint --quiet`
3. `npm run build:dev`

Server (`onecgiar-pr-server/`):

4. `npx jest --silent --reporters=summary --forceExit src/api/bilateral`
5. `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`

Evidence rules:

- The Jest gates pass only if all named suites execute and report tests; zero-test runs, path typos, skipped cases, or harness failures are inconclusive, not passes.
- The client Jest gate must fail if a foreign-center row project enters the options, a cross-phase duplicate survives, an unselected year's project appears, `result=8706` disappears, navigation loops, the results API is refetched on selection, or a cached year is requested twice.
- The server Jest gate must fail if `year=2025` does not filter to 2025 or if an omitted/invalid `year` no longer matches the active-year behavior.
- Lint/build must run from this worktree's packages with local dependencies. A global `ng`/`eslint`, another worktree's output, or a previously built artifact is not evidence.
- Lint must fail on a new lint violation; builds must fail on invalid bindings or template compilation errors. Neither alone proves filtering behavior.

#### Browser verification

Use a dev server started from this worktree on a free port, or prove an existing server serves this worktree's current bundle.

1. Open `/bilateral/AfricaRice/results` at 1280px; select two phases when available.
2. Open Filters by keyboard, confirm Project lists only the center's A-AG catalog projects for the selected phases, search, select two projects, and confirm either project's rows remain.
3. Confirm chips and comma-separated URL update; remove one chip; Clear all.
4. Repeat popover open/select/close and horizontal-overflow checks at 900px.
5. Confirm catalog loading, empty, and failure states do not gain a second project-specific surface.
6. Keyboard HITL: Tab to the Project control, open it, Space a checkbox, Enter/remove a chip, and confirm the focus ring is visible.

Evidence is invalid if the browser uses a stale bundle, only the token without the required user identity state, or a different worktree/server. A screenshot proving control presence does not prove keyboard selection, filtering, URL synchronization, or overflow; those interactions must be exercised.

#### Definition of done

- [x] Every scenario and negative clause in the ownership table has passing evidence.
- [x] Options come from the center catalog for the selected phases only; foreign-center projects never appear as options.
- [x] Endpoint change is additive and backwards compatible without `year`.
- [x] Focused Jest (client + server), client lint, server ESLint, and development build pass under the evidence rules.
- [x] Browser verification passes at 1280px and 900px including the keyboard HITL items.
- [x] `bilateral-results-list/CLAUDE.md` describes the catalog contract and has a current verification stamp.
- [x] No token, credential, or sensitive request header appears in code, tests, docs, commands, or logs.
- [x] Actual LOC and review rounds remain within the revised budget; otherwise `/akili-execute` stops at the budget tripwire.

## 4. Dependency Graph

```text
PMF-T-1
```

One atomic change: the server param and the client consumer must land together; no useful parallel split exists.

## 5. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PMF-TEST-1` | Angular Jest component | `PMF-R-1`, `PMF-R-2`, `PMF-NFR-1`, `PMF-NFR-4` | `bilateral-results-list.component.spec.ts` |
| `PMF-TEST-2` | Existing pure unit regressions | Project predicate and URL multivalue contract | `bilateral-result-filter.spec.ts`, `bilateral-query-params.spec.ts` |
| `PMF-TEST-3` | Server Jest | Year filter + default behavior | `api/bilateral` service/controller specs |
| `PMF-TEST-4` | Manual real browser + keyboard HITL | `PMF-NFR-2`, `PMF-NFR-3`, catalog states | `/bilateral/AfricaRice/results` at 1280px and 900px |

## 6. Rollout, PR & Rollback

- **PR:** One PR (client + server). Review the server year param first, then the client catalog/union, then tests and guide.
- **Out of scope for review:** Shared multiselect internals, catalog reportability rules, project relations semantics, payload contract.
- **Rollout:** Normal deployment; additive endpoint param; no feature flag, migration, backfill, or consumer communication.
- **Rollback:** Revert the single PR and rerun the automated gates. No persistent state requires reversal.

## 7. Required Cross-References

- [`proposal.md`](./proposal.md)
- [`requirements.md`](./requirements.md)
- [`design.md`](./design.md)
- [`execution.md`](./execution.md) Pivot Record
- `docs/prd.md` §5, G4/M4.2, AC-3, AC-9
- `docs/ux-ui/design.md` §6, §8, §9, §10
- `docs/trd/trd.md` §6 and §10
- `onecgiar-pr-server/src/api/bilateral/` (controller + services)
