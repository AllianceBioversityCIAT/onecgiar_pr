## Why

Navigating PRMS requires users to know where every section lives in the navbar and how the app is structured. A conversational assistant that understands plain Spanish/English ("llévame a Quality Assurance", "take me to Results Center") and moves the user there lowers that friction. Running the model **entirely in the browser** (WebLLM + WebGPU) keeps it zero-cost, zero-server, and privacy-safe — nothing the user types leaves their device.

This is **frontend-only**. No backend changes are required; the assistant navigates existing client routes and calls no new API.

## What Changes

- Add a floating AI assistant, docked on the right side of the client, available on every authenticated page (FAB → slide-in panel, non-modal so the app stays usable).
- The assistant runs a small LLM (Qwen2.5 family) **in-browser via `@mlc-ai/web-llm`** inside a Web Worker — no server inference.
- **Device-capability auto-detection** picks a model tier before download: WebGPU + `shader-f16` + VRAM/RAM signals → `small` (Qwen2.5-0.5B, ~300 MB) by default, `mid` (Qwen2.5-1.5B, ~900 MB) on capable machines, a `no-f16` variant fallback, and an `unsupported` state (no WebGPU) that shows a friendly bilingual message.
- **Opt-in download** with a progress bar; weights cache per-shard (Cache API) so it is a one-time download and resumes if interrupted.
- The model emits a **grammar-constrained JSON tool call** (`response_format: json_object` + schema via XGrammar), dispatched by a **manual, extensible tool registry** — NOT WebLLM's native (WIP) function-calling.
- **MVP tool: `navigate`** — routes to the base navbar sections: `results-framework-reporting`, `results-center`, `innovation-packages`, `quality-assurance`, `my-admin`, `admin-module` (role-gated), `whats-new`, `notifications`.
- Engine isolated behind an `AssistantEngine` interface + `InjectionToken` so it is swappable (future regex fallback / server LLM) and fakeable in Jest.
- Feature-flagged via `environment.aiAssistant.enabled` (both `environment.ts` and `environment.prod.ts`).
- New dependency: `@mlc-ai/web-llm` (pinned). New Web Worker (first in the codebase; native to the Angular esbuild application builder). All new UI styling in Tailwind per project convention.

## Capabilities

### New Capabilities
- `ai-assistant`: In-browser conversational assistant that interprets natural-language requests and executes client-side tools. Covers the assistant lifecycle (device detection, model tier selection, opt-in download, chat), the tool registry + grammar-constrained dispatch contract, and the MVP `navigate` tool mapping section slugs to router paths.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- **New code** (self-contained): `onecgiar-pr-client/src/app/shared/components/ai-assistant/**` (panel component, orchestrator service, `engine/` with worker + WebLLM engine + tiers + system prompt, `tools/` registry, device-capability service).
- **Modified (existing files, additive):** `app.component.html` + `app.module.ts` (mount the panel, gated by login/read-only guard and the feature flag), `environment.ts` + `environment.prod.ts` (add `aiAssistant` config), `package.json` (add `@mlc-ai/web-llm`), `angular.json` + a worker tsconfig (worker wiring), Jest config (`moduleNameMapper` mock for `@mlc-ai/web-llm`).
- **Dependencies:** adds `@mlc-ai/web-llm` (bundled only in the worker chunk + deferred panel, so outside the initial bundle budget). First WebGPU/Web Worker usage in the client.
- **No backend impact.** No new API, no server change, no migration.
- **SDD baseline:** aligns with `docs/system-design/design.md` (client UI/navigation) and `docs/detailed-design/detailed-design.md` (client architecture, feature flags). No module spec under `docs/specs/` changes its requirements.
- **Runtime state (branch `front-redesign-fields`):** client is on **Angular 21.2** with the esbuild application builder (context above says 19; branch has since upgraded). Web Worker + `new Worker(new URL(...))` is natively supported. No existing service worker / COOP-COEP headers to conflict with.
- **Open items:** no P2 Jira ticket is encoded in the branch name (`front-redesign-fields`) — a ticket id is needed before commit per the commit convention. Coexistence with the existing Tawk chat widget (offset vs hide) is a product decision.
