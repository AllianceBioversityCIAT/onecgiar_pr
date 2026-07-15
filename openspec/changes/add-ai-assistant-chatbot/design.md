## Context

PRMS client (`onecgiar-pr-client`) is an Angular 21.2 SPA built with the esbuild application builder, standalone components, signals and OnPush. This change adds a floating AI assistant that runs a small LLM **entirely in the browser** to interpret natural-language navigation requests and execute client-side tools. It is frontend-only and feature-flagged.

Prior research (workflow, 2026-07-15, full plan in `context/webllm-ai-assistant-plan-2026-07-15.md`) established the key facts that constrain this design:
- `@mlc-ai/web-llm` **requires WebGPU** — it has **no CPU/WASM inference fallback** (the "WASM library" is WebGPU kernels packaged in WASM). Without `navigator.gpu` the engine throws.
- WebLLM's **native function-calling is WIP** and effectively tuned only for Hermes-2-Pro-7B (~4 GB); `tool_choice` is ignored. The reliable path for small models is `response_format: json_object` with a JSON schema — **XGrammar constrains output at the token level**, guaranteeing shape (not semantics) for any prebuilt model.
- **Qwen2.5** is the only small family that is officially multilingual (Spanish incl.) AND trained for structured JSON output. SmolLM2 is English-centric; Llama-3.2-1B has weaker JSON discipline.
- Model weights cache **per-shard** via the Cache API; interrupted downloads resume.

The client shell (`app.component.html`) already hosts global overlays; the existing `result-review-drawer` provides a native right-slide drawer pattern (fixed root, `translateX` animation, no PrimeNG dialog). Tailwind + brand tokens are available. No existing Web Worker, service worker, or COOP/COEP headers exist to conflict.

## Goals / Non-Goals

**Goals:**
- A floating, non-modal, right-docked assistant available on every authenticated page, opt-in to download, cached thereafter.
- Auto-select a Qwen2.5 model tier from device capability; degrade gracefully to a clear message when WebGPU is unavailable.
- Reliable tool execution for the MVP `navigate` tool via grammar-constrained JSON + a manual dispatch registry.
- Architecture that makes future tools (query results list, open a result's general-info) and a future non-WebGPU fallback cheap to add — without re-plumbing.
- Isolate `@mlc-ai/web-llm` behind one interface so the engine is swappable and unit-testable (Jest can't run WebGPU/Worker).

**Non-Goals (deferred, documented, not built now):**
- A full regex/keyword fallback router for `unsupported` devices (only the message is shown in MVP; the tool aliases needed for it already live in the registry).
- Streaming token rendering, cross-session conversation persistence, self-hosting the model weights on our own CDN, service-worker engine, and an active multi-step tool loop.
- Any additional tool beyond `navigate`.

## Decisions

**1. In-browser WebLLM in a Web Worker (not main thread, not server).**
Inference on the main thread would freeze the UI during generation. `CreateWebWorkerMLCEngine(new Worker(new URL('./llm.worker', import.meta.url), { type: 'module' }), …)` offloads it; the esbuild application builder bundles the worker as a separate chunk natively. *Alternative considered:* server-side inference — rejected, defeats the zero-server/zero-cost/privacy goal that motivated the feature.

**2. Grammar-constrained JSON + manual tool registry (not native function-calling).**
Each turn is one completion with `response_format: { type: 'json_object', schema }` where the schema is assembled from the tool registry (`{ reply: string, tool: enum, args: { section: enum } }`). XGrammar guarantees a well-formed, in-enum result even from the 0.5B model, so it cannot invent tools or malformed JSON. A single call returns both the natural-language reply and the tool decision (lowest latency). *Alternative:* WebLLM `tools`/`tool_choice` — rejected (WIP, Hermes-only, `tool_choice` ignored).

**3. Defensive parse/validate guard despite the grammar.**
The orchestrator still `JSON.parse`s in a try/catch and runs each tool's `validate()` before dispatch. The grammar guarantees *shape*, not *semantics* (e.g. an admin-only section requested by a non-admin), and future engines (fallback/server) are not grammar-constrained. On failure: a polite apology listing what the assistant can do.

**4. `AssistantEngine` interface + `InjectionToken`.**
`@mlc-ai/web-llm` is imported in exactly one file (`WebLlmEngineService`). The orchestrator depends only on the token. This yields: a Jest fake engine (jsdom has no Worker/WebGPU), a future `FallbackIntentRouterService` (regex, same interface), or a server-LLM engine — each a one-line provider swap. *Alternative:* import WebLLM directly in the service — rejected, untestable and locks the engine in.

**5. Extensible tool registry as a typed array (not multi-provider DI).**
`ASSISTANT_TOOLS: AssistantTool[]`, each `{ name, description, argsSchema, aliases: {en,es}, isVisible?, validate, run }` returning `ToolResult { ok, summaryForUser, dataForModel? }`. The system-prompt tool section, the JSON schema enum, and the dispatch all derive from this one array — a new tool is one new object. `dataForModel` exists in the type from day 1 so a future multi-step loop needs no orchestration refactor. *Alternative:* Angular multi-provider token — over-engineered for the current need.

**6. Device tiers decided pre-download, runtime failure demotes.**
`DeviceCapabilityService` (navigator injectable → testable): `navigator.gpu` → `requestAdapter()` → blocklist software/swiftshader via `adapter.info` → `features.has('shader-f16')` → `limits.maxStorageBufferBindingSize` → `navigator.deviceMemory` → `navigator.storage.estimate()` (quota vs download size). Tiers: `unsupported` / `small` (0.5B q4f16, default) / `mid` (1.5B q4f16) / `no-f16` (0.5B q4f32). Detection is a heuristic; a runtime OOM/device-lost demotes one tier and retries once — runtime failure is the only authoritative signal.

**7. Mount in the app shell, gated by flag + auth.**
`<app-ai-assistant-panel />` in `app.component.html`, rendered only when `environment.aiAssistant.enabled` and the user is authenticated (not in login / read-only validated). Living in the shell keeps the panel open across navigations (so a `navigate` tool call doesn't close it). Z-index `1050` — above the TEST ribbon (1000), below drawers/dialog masks (1099/1100).

**8. Feature flag in both environment files.**
`aiAssistant: { enabled: boolean, modelBaseUrl?: string }` in `environment.ts` and `environment.prod.ts`. `modelBaseUrl` is reserved (default: HuggingFace/mlc CDN via `prebuiltAppConfig`) so future self-hosting needs no code change. Ship with `enabled` controllable so prod can stay dark until validated on prtest.

## Risks / Trade-offs

- **No WebGPU on corporate machines (blocklisted GPUs)** → `unsupported` state with a clear bilingual message + Chrome/Edge suggestion; regex fallback is designed-for (aliases in registry) but deferred. Treated as progressive enhancement, not a hard dependency.
- **HuggingFace CDN blocked by a corporate proxy** → classify the network error and show an honest message + Retry; `modelBaseUrl` reserved for a self-hosted mirror post-MVP.
- **0.5B picks the wrong section (semantic error)** → mitigated by enums + EN/ES aliases in the prompt + a visible action chip ("→ Navigating to Results Center") before/at navigation; the action is low-risk (navigation, reversible). Existing route guards remain the final defense.
- **Cache eviction (Safari ITP ~7 days, Chrome LRU)** → `navigator.storage.persist()` after first load; the opt-in card reappears if weights are gone (correct behavior, re-downloads).
- **~300 MB first download** → strictly opt-in with the exact size shown; never auto-starts on app load, only when the user chooses to enable the assistant.
- **First Web Worker + first WebGPU in the codebase** → isolated to the `engine/` folder; worker TS is bundled but not type-checked by esbuild, so keep the worker file to 3 lines and put logic in the type-checked service.
- **Bundle budget** → web-llm lands only in the worker chunk + a deferred panel, outside the initial 2mb/4mb budget; verify with a production `ng build` before finishing.

## Migration Plan

- Additive and behind `environment.aiAssistant.enabled`; no data migration, no backend change, no schema change.
- **Rollback:** flip the flag off (panel + FAB disappear, worker never instantiates), or remove the self-contained `ai-assistant/` folder plus the ~5 additive edits (mount, env, package.json, angular.json, jest config). No other code depends on it.
- Verify locally (`localhost:4200` against prtest) across the four device states, then enable on prtest, then decide prod.

## Open Questions

- **Jira ticket:** branch `front-redesign-fields` carries no P2 id — a ticket is needed before commit per the convention. (Product/PM decision.)
- **Tawk coexistence:** hide the existing Tawk widget when the assistant is enabled, or just offset the FAB? Two floating chat bubbles is confusing. (Product decision.)
- **Fallback scope:** does the regex router for `unsupported` devices enter the MVP or stay Phase 2? Depends on the share of CGIAR machines that land in `unsupported`.
- **Weight hosting:** HuggingFace CDN for MVP, or self-host on our nginx from day 1 (corporate-network reliability)?
- **Privacy copy:** the model runs 100% locally, but the one-time ~300 MB download + persistent browser storage may need institution-approved consent copy.
