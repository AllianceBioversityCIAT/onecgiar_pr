## ADDED Requirements

### Requirement: Floating assistant availability and toggle
The client SHALL present a floating launcher (FAB) on every authenticated page when `environment.aiAssistant.enabled` is true, which opens a non-modal panel docked on the right side of the viewport. When the flag is false, or the user is unauthenticated (in login / not read-only validated), neither the FAB nor the panel SHALL render.

#### Scenario: Assistant visible when enabled and authenticated
- **WHEN** the feature flag is enabled and an authenticated user is on any app page
- **THEN** the FAB is visible, and clicking it slides the panel in from the right while the rest of the app remains interactive (no backdrop)

#### Scenario: Assistant hidden when flag off
- **WHEN** `environment.aiAssistant.enabled` is false
- **THEN** no FAB and no panel are rendered and the WebLLM worker is never instantiated

#### Scenario: Assistant hidden on login
- **WHEN** the user is on the login screen or not yet read-only validated
- **THEN** the FAB and panel do not render

### Requirement: Device-capability tier selection
The assistant SHALL detect device capability before downloading any model and select a model tier: `unsupported` (no `navigator.gpu`, null adapter, software/swiftshader adapter, or insufficient storage quota), `no-f16` (WebGPU without the `shader-f16` feature), `mid` (`shader-f16` + `maxStorageBufferBindingSize` ≥ 2 GiB + `deviceMemory` ≥ 8), or `small` (default: `shader-f16` + binding ≥ 1 GiB). Detection SHALL NOT trigger a model download.

#### Scenario: No WebGPU present
- **WHEN** `navigator.gpu` is undefined or `requestAdapter()` resolves null
- **THEN** the tier is `unsupported` and the panel shows a friendly bilingual message (no download offered)

#### Scenario: Capable machine selects mid tier
- **WHEN** the adapter reports `shader-f16`, binding size ≥ 2 GiB and `deviceMemory` ≥ 8
- **THEN** the selected tier is `mid` (Qwen2.5-1.5B)

#### Scenario: Default machine selects small tier
- **WHEN** the adapter reports `shader-f16` and binding size between 1 and 2 GiB
- **THEN** the selected tier is `small` (Qwen2.5-0.5B)

#### Scenario: WebGPU without f16
- **WHEN** the adapter lacks the `shader-f16` feature
- **THEN** the selected tier is `no-f16` (Qwen2.5-0.5B q4f32)

### Requirement: Opt-in model download with progress and caching
The assistant SHALL NOT download model weights automatically. On first use of a supported tier, it SHALL show the exact download size and require explicit user consent, then display a determinate progress indicator during download. Weights SHALL be cached (Cache API) so subsequent sessions start without re-downloading, and an interrupted download SHALL resume from cached shards.

#### Scenario: User consents to download
- **WHEN** the user opens the panel on a supported device with no cached model
- **THEN** an opt-in card shows the tier's download size and, only after the user confirms, the download begins with a progress bar

#### Scenario: Cached model fast-start
- **WHEN** the model for the selected tier is already cached
- **THEN** the assistant skips the opt-in card and loads directly to the chat state

#### Scenario: Interrupted download resumes
- **WHEN** a download is interrupted and later retried
- **THEN** already-cached shards are reused and only missing shards are fetched

### Requirement: Grammar-constrained tool-call generation
For each user message the assistant SHALL request a single completion with `response_format` of type `json_object` bound to a schema assembled from the tool registry, producing an object with a natural-language `reply`, a `tool` name constrained to the registry's enum (including `none`), and typed `args`. The model SHALL NOT be able to emit a tool name or argument value outside the schema enums.

#### Scenario: Navigation intent produces a navigate tool call
- **WHEN** the user writes "llévame a Quality Assurance" or "take me to Results Center"
- **THEN** the completion returns `tool: "navigate"` with `args.section` set to the matching section slug and a bilingual-appropriate `reply`

#### Scenario: Non-actionable message produces no tool
- **WHEN** the user writes a message with no navigation intent
- **THEN** the completion returns `tool: "none"` and a helpful `reply`, and no navigation occurs

### Requirement: Defensive dispatch through the tool registry
The orchestrator SHALL parse the model output defensively (JSON parse guarded, then the target tool's `validate()`), and only dispatch to the tool's `run()` when validation passes. On parse or validation failure it SHALL show a polite message listing what the assistant can do, and SHALL NOT perform any action.

#### Scenario: Valid tool call dispatches
- **WHEN** the parsed output names a registered tool whose `validate()` passes
- **THEN** the tool's `run()` executes and the assistant appends its result summary to the conversation

#### Scenario: Malformed or unknown output is contained
- **WHEN** the model output fails to parse or names an unknown/invalid tool
- **THEN** no action is taken and the assistant replies with an apology and its capabilities

### Requirement: Navigate tool routes to base sections
The `navigate` tool SHALL map each section slug to its exact client route and navigate there: `results-framework-reporting` → `/result-framework-reporting`, `results-center` → `/result/results-outlet/results-list`, `innovation-packages` → `/ipsr`, `quality-assurance` → `/quality-assurance`, `my-admin` → `/init-admin-module`, `admin-module` → `/admin-module`, `whats-new` → `/whats-new`, `notifications` → `/result/results-outlet/results-notifications/requests`. The `admin-module` section SHALL be gated by the user's admin role in `validate()`; existing route guards remain the final authority.

#### Scenario: Section navigation
- **WHEN** the navigate tool runs with `args.section = "results-center"`
- **THEN** the router navigates to `/result/results-outlet/results-list` and the panel stays open across the navigation

#### Scenario: Non-admin requests admin module
- **WHEN** a non-admin user's message resolves to `args.section = "admin-module"`
- **THEN** `validate()` rejects it and the assistant replies with a courteous bilingual explanation instead of navigating

### Requirement: Runtime failure degrades gracefully
The assistant SHALL classify engine errors (WebGPU device lost, out-of-memory, network/CDN blocked, unknown) and respond without crashing the app. On a device-lost or OOM error it SHALL demote one model tier and retry once; on a blocked download it SHALL show an honest message with a Retry action.

#### Scenario: WebGPU device lost demotes tier
- **WHEN** the engine throws a device-lost or OOM error during load or generation
- **THEN** the assistant demotes to the next lower tier and retries once before surfacing an error

#### Scenario: Blocked CDN reports honestly
- **WHEN** the weight download fails due to a blocked/network error
- **THEN** the assistant shows a clear message and a Retry action, and does not silently hang

### Requirement: Swappable, testable engine boundary
The concrete WebLLM engine SHALL be the only place importing `@mlc-ai/web-llm`, hidden behind an `AssistantEngine` interface provided via an `InjectionToken`. Unit tests SHALL substitute a fake engine so orchestrator and registry logic run without WebGPU or a Web Worker.

#### Scenario: Tests run without WebGPU
- **WHEN** the Jest suite exercises the orchestrator and tool registry
- **THEN** a fake `AssistantEngine` provider is used and no `@mlc-ai/web-llm`, Worker, or WebGPU API is required
