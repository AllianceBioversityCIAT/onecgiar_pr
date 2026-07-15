## ADDED Requirements

### Requirement: QA Status Board is publicly reachable without login

The system SHALL expose a QA Status Board page at the route `/qa-status` that is reachable without authentication. The route MUST be registered in `routingApp` with no `canActivate` guard, hidden from navigation (`prHide: true`), loaded as a standalone component via `loadComponent`, and placed before the `**` wildcard fallback.

#### Scenario: Reachable without a token
- **WHEN** an unauthenticated user navigates to `/qa-status` in any environment
- **THEN** the QA Status Board page loads without requiring login
- **AND** the route is not shown in the navigation bar or breadcrumbs

#### Scenario: Not admin-gated
- **WHEN** the route is registered
- **THEN** it is added to `routingApp` (public), not to `extraRoutingApp` (admin-gated by CheckAdminGuard)

### Requirement: Board data is loaded from a static JSON asset at runtime with no runtime LLM

The page SHALL render from a static JSON asset fetched at runtime (`./assets/qa-status/perf-refactor.json`) via `HttpClient` on component init. It MUST NOT call any LLM or external API at runtime. Updating statuses or metrics MUST require only a JSON edit (no recompile of application logic).

#### Scenario: Successful load
- **WHEN** the component initializes and the asset is fetched successfully
- **THEN** the board signal is populated and the board renders

#### Scenario: JSON-only update
- **WHEN** the JSON asset is edited and redeployed without recompiling the app
- **THEN** the board reflects the new content on the next load

#### Scenario: No runtime LLM
- **WHEN** the page renders or updates
- **THEN** no LLM or external API call is made at runtime (zero cloud cost)

### Requirement: Board renders global metrics and one expandable card per item

The page SHALL render a header (`boardTitle` / `boardSubtitle`), a global before/after metrics card (`domScansPerSecIdle`, `tabSwitchWallClockSec`, `blockingTimeMs`, summary, `testsPassing`), and one expandable card per `item`. Each expanded card MUST show, in order: what changed, how to test (numbered), affects, risks/validation notes, per-item before/after metrics, and screenshots (or "No screenshots" when empty).

#### Scenario: Item card expansion
- **WHEN** the user clicks an item card header
- **THEN** the card expands to show whatChanged, howToTest, affects, risks, metrics, and screenshots
- **AND** clicking again collapses it (expansion state tracked per item id)

#### Scenario: Empty screenshots
- **WHEN** an item's `screenshots` array is empty
- **THEN** the card shows "No screenshots" instead of images

### Requirement: Loading and error states degrade gracefully

The page SHALL show a loading skeleton while the asset is being fetched and an error banner if the fetch fails.

#### Scenario: Fetch error
- **WHEN** the JSON asset fetch fails
- **THEN** the `loadError` signal is set and an error banner is shown instead of the board

#### Scenario: Loading
- **WHEN** the asset has not yet loaded and there is no error
- **THEN** a loading skeleton is shown

### Requirement: Item status is one of four values with a styled chip

Each item's `status` SHALL be exactly one of `pendiente`, `en-progreso`, `listo-para-pruebas`, or `done`, and MUST render a distinctly colored chip (neutral/grey, yellow, blue, green respectively). The `status` field MUST be a typed union in the TypeScript interface.

#### Scenario: Status chip color
- **WHEN** an item has status `done`
- **THEN** its chip uses the green (done) modifier class
- **AND** `pendiente` → grey, `en-progreso` → yellow, `listo-para-pruebas` → blue

### Requirement: Status transitions follow the documented state machine

Status updates SHALL follow the allowed state machine: forward `pendiente → en-progreso → listo-para-pruebas → done`; backward only on QA fail/regression (`listo-para-pruebas → en-progreso`, `done → en-progreso`) with a reason appended to `risks`; no skipping forward (must pass through `listo-para-pruebas`); any status → `pendiente` only when work is explicitly deferred (reason in `risks`).

#### Scenario: Forward transition
- **WHEN** an item moves from `en-progreso` to `listo-para-pruebas`
- **THEN** the transition is allowed (forward by one step)

#### Scenario: Skipping forward is not allowed
- **WHEN** an attempt is made to move an item directly from `pendiente` to `done`
- **THEN** the transition is not allowed (must pass through `listo-para-pruebas`)

#### Scenario: Backward on regression
- **WHEN** a `done` item fails QA and moves back to `en-progreso`
- **THEN** the transition is allowed and a reason is appended to the item's `risks`

### Requirement: AI-self-edit maintenance contract is documented

A maintenance document (`docs/qa-status-board.md`) SHALL define the JSON schema, the four status meanings, the state machine, and the exact contract an AI session follows to update an item (edit only the JSON; locate by stable unique `id`; never change `id`/`ticket`/`title` on a status update; set `status` to a reachable value; update metrics with measured values only, citing the source; bump `lastUpdated`; validate JSON and status spelling). It MUST state the guardrails: no runtime LLM/API in the page, no secrets in the world-readable JSON, and exact `status` spelling.

#### Scenario: Status-only update touches only the JSON
- **WHEN** an AI session updates an item's status and metrics
- **THEN** only `assets/qa-status/perf-refactor.json` is edited (no code change, no recompile)
- **AND** `lastUpdated` is bumped and the JSON remains valid with a correctly spelled `status`
