## 1. Build & dependency wiring (no LLM yet)

- [x] 1.1 Add `@mlc-ai/web-llm` pinned `0.2.83` to `package.json` (installed with `--legacy-peer-deps` to match the repo's pre-existing tree). Verified `.d.ts` exposes `cacheBackend` and the Qwen2.5 models exist in `prebuiltAppConfig`.
- [x] 1.2 Worker wiring: the `@angular/build:application` (esbuild) builder bundles `new Worker(new URL('./llm.worker', import.meta.url))` natively — NO `webWorkerTsConfig` needed (that option is for the old webpack builder). Confirmed by the build emitting a separate `llm-worker` chunk.
- [x] 1.3 Added `aiAssistant: { enabled, modelBaseUrl }` to `environment.ts` (enabled: true) and `environment.prod.ts` (enabled: false).
- [x] 1.4 Added Jest `moduleNameMapper` `@mlc-ai/web-llm` → `tests/mocks/webLlmMock.ts`.

## 2. Testable foundations (pure, no WebGPU)

- [x] 2.1 `tools/assistant-tool.types.ts` — `AssistantTool` interface + `ToolResult`.
- [x] 2.2 `tools/assistant-tools.ts` — `navigate` tool, 8 slugs → exact routes, EN/ES aliases, admin-role check.
- [x] 2.3 `tools/assistant-tools.spec.ts` — slug→route mapping, admin rejection, enum/schema derivation. Green.
- [x] 2.4 `device-capability.service.ts` — injectable navigator, pure detection core.
- [x] 2.5 `device-capability.spec.ts` — full tier matrix incl. software blocklist + storage pre-check. Green.
- [x] 2.6 `engine/assistant-engine.types.ts` — `AssistantEngine` interface + `ASSISTANT_ENGINE` token + pure `classifyEngineError`.

## 3. Engine layer

- [x] 3.1 `engine/model-tiers.ts` — Qwen2.5 tier table + demotion order + `modelBaseUrl`.
- [x] 3.2 `engine/system-prompt.ts` — pure prompt builder (EN body, ES/EN aliases, language rule).
- [x] 3.3 `engine/llm.worker.ts` — 3-line worker handler.
- [x] 3.4 `engine/web-llm-engine.service.ts` — only importer of web-llm (DYNAMIC import → kept out of initial bundle); progress mapping, error classification, cache check, dispose.
- [x] 3.5 `engine/assistant-engine.spec.ts` — error classification, tier demotion, system-prompt content. Green.

## 4. Orchestrator + UI

- [x] 4.1 `ai-assistant.service.ts` — signals + `send()` pipeline (prompt → engine → safe parse + validate → dispatch), tier demotion on OOM/device-lost.
- [x] 4.2 `ai-assistant.service.spec.ts` — happy path, "none" tool, malformed JSON, unknown tool, admin rejection, OOM demotion. Green (fake engine).
- [x] 4.3 `ai-assistant-panel.component.ts` (+ `.html`) — FAB + right slide-in panel, 4 states, Tailwind + brand tokens, `material-icons-round`. NOTE: native elements (matches result-review-drawer precedent); a Spartan pass on the buttons/input is a follow-up.
- [x] 4.4 Mounted `<app-ai-assistant-panel />` in `app.component.html` (gated by auth + `aiAssistantEnabled`); added to `app.module.ts` imports + `{ provide: ASSISTANT_ENGINE, useExisting: WebLlmEngineService }`. Tawk coexistence: FAB offset (bottom-24) for now — hide-vs-offset is an open product decision.

## 5. Verification & close-out

- [ ] 5.1 Runtime check on `localhost:4200` — REQUIRES Yeck's browser (WebGPU + real session): opt-in + progress cold cache, warm-cache fast-start, EN and ES navigation, admin-module rejection, `unsupported` path (WebGPU disabled), resume after interrupted download.
- [~] 5.2 Lint: 0 errors in the new files. Jest: 31 new tests green. FULL suite has 38 PRE-EXISTING failures (Angular 21/signals migration debt on this branch, e.g. NG0100 in AlertStatusComponent) — NOT caused by this change.
- [x] 5.3 Production `ng build` passes budgets: initial total 1.61 MB (< 4mb); web-llm fully in the lazy `llm-worker` chunk via dynamic import.
- [ ] 5.4 `/opsx:verify`, capture QA evidence, present to Yeck for OK BEFORE any commit/push (needs a P2 Jira ticket for the commit convention).

## Config changes made (shared files — logged for traceability)

- `tsconfig.json`: added `skipLibCheck: true` (web-llm's vendor `.d.ts` reference internal submodules; standard, safe relaxation).
- `angular.json`: added `externalDependencies: ["url"]` (web-llm bundle has a dead-code Node `require('url')` path guarded for non-browser; browser never runs it).
- `package.json`: `@mlc-ai/web-llm@0.2.83` dependency + web-llm Jest mock mapping.
