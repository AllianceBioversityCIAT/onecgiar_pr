## ADDED Requirements

### Requirement: Unauthenticated access to ToC results
The system SHALL expose a public HTTP GET endpoint that returns ToC work packages for a program and area of work **without requiring authentication**. The endpoint MUST be reachable without the custom `auth` header (JWT), by being excluded from `JwtMiddleware`, following the same pattern as `/api/bilateral/*` and `/api/platform-report/*`.

#### Scenario: Request without auth header succeeds
- **WHEN** a client calls the public endpoint with valid `program` and `areaOfWork` query params and **no** `auth` header
- **THEN** the system responds `200 OK` with the ToC work packages payload
- **AND** the system does NOT redirect to login or return `401 Unauthorized`

#### Scenario: Auth header is ignored, not required
- **WHEN** a client calls the public endpoint with or without an `auth` header
- **THEN** the response is identical and the request is never rejected for missing or invalid credentials

### Requirement: Identical response contract to the private endpoint
The public endpoint SHALL return the **same response contract** as the existing private endpoint `GET /api/results-framework-reporting/toc-results`, produced by `getWorkPackagesByProgramAndArea`. The payload MUST contain `compositeCode`, `year`, `tocResultsOutcomes`, `tocResultsOutputs`, and `metadata` (`total`, `outcomes`, `outputs`), wrapped in the standard response envelope (`response`, `statusCode`, `message`, `timestamp`, `path`).

#### Scenario: Payload shape matches private endpoint
- **WHEN** the public endpoint and the private endpoint are called with the same `program`, `areaOfWork`, and `year`
- **THEN** both return the same `response` body shape (`compositeCode`, `year`, `tocResultsOutcomes`, `tocResultsOutputs`, `metadata`)
- **AND** outcomes/outputs are split by ToC `category` and indicators are enriched with `targets_by_center` exactly as in the private endpoint

#### Scenario: Composite code derivation
- **WHEN** the public endpoint is called with `program=SP01` and `areaOfWork=AOW01`
- **THEN** the system queries the ToC catalogue using the composite code `SP01-AOW01` (uppercased)

### Requirement: Query parameter validation
The public endpoint SHALL require `program` and `areaOfWork` query parameters and accept an optional `year`. When `year` is omitted, the system MUST resolve the active reporting year.

#### Scenario: Missing program
- **WHEN** the endpoint is called without `program`
- **THEN** the system responds `400 Bad Request` with a message indicating the program identifier is required

#### Scenario: Missing area of work
- **WHEN** the endpoint is called without `areaOfWork`
- **THEN** the system responds `400 Bad Request` with a message indicating the area of work identifier is required

#### Scenario: Invalid year
- **WHEN** the endpoint is called with a non-numeric or negative `year`
- **THEN** the system responds `400 Bad Request` indicating the year must be a valid positive integer

#### Scenario: Year omitted resolves active reporting year
- **WHEN** the endpoint is called with valid `program` and `areaOfWork` but no `year`
- **THEN** the system uses the active reporting year to query the ToC catalogue
- **AND** responds `404 Not Found` if no active reporting year is configured

#### Scenario: No matching work packages
- **WHEN** the filters resolve to no ToC results in the catalogue
- **THEN** the system responds `404 Not Found` indicating no work packages were found for the provided filters

### Requirement: Read-only public surface
The public module SHALL expose only the read (`GET toc-results`) operation. Write or user-scoped operations from the original controller (e.g. `POST create`, contributor lookups) MUST NOT be exposed on the public surface.

#### Scenario: Only the GET route is mounted publicly
- **WHEN** the public module's routes are inspected
- **THEN** only the unauthenticated `GET toc-results` route exists
- **AND** no write/POST route is reachable without authentication on the public module

#### Scenario: Private endpoint remains protected
- **WHEN** the existing private endpoint `GET /api/results-framework-reporting/toc-results` is called without a valid `auth` header
- **THEN** it still returns `401`/redirect-to-login as before (the private endpoint is unchanged)
