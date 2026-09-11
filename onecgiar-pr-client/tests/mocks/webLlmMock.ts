/**
 * Jest mock for `@mlc-ai/web-llm`.
 *
 * jsdom has no Web Worker and no WebGPU, so the real package cannot run in unit
 * tests. The orchestrator and tool registry are tested against a fake
 * `AssistantEngine` (see assistant-engine.types.ts) — this mock only exists so
 * that importing the WebLLM engine service does not pull the real ESM bundle
 * into the jsdom environment. Mirrors the `@microsoft/clarity` mock pattern.
 */
export const CreateWebWorkerMLCEngine = jest.fn();
export const CreateMLCEngine = jest.fn();
export class WebWorkerMLCEngineHandler {
  onmessage = jest.fn();
}
export const hasModelInCache = jest.fn().mockResolvedValue(false);
export const modelVersion = 'v0_2_84';
export const prebuiltAppConfig = { model_list: [] as unknown[] };
