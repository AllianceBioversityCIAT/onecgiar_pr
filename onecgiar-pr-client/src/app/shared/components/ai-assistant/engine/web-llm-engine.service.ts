import { Injectable } from '@angular/core';
import type { CreateWebWorkerMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import { AssistantEngine, AssistantEngineError, ChatMessage, classifyEngineError, EngineProgress } from './assistant-engine.types';
import { AssistantTier, modelForTier } from './model-tiers';

type WebLlmEngine = Awaited<ReturnType<typeof CreateWebWorkerMLCEngine>>;

/**
 * The ONLY place that imports `@mlc-ai/web-llm` on the main thread. Owns the
 * Web Worker + engine lifecycle and translates WebLLM's API into the
 * `AssistantEngine` contract the rest of the feature depends on.
 */
@Injectable({ providedIn: 'root' })
export class WebLlmEngineService implements AssistantEngine {
  private engine: WebLlmEngine | null = null;
  private worker: Worker | null = null;
  private persisted = false;
  private loadedModelId: string | null = null;

  async init(tier: AssistantTier, onProgress: (p: EngineProgress) => void): Promise<void> {
    const model = modelForTier(tier);
    if (!model) throw new AssistantEngineError('unsupported', `No model for tier "${tier}".`);

    // init() must be idempotent: a WebWorkerMLCEngine client binds exclusively to its worker's
    // message port, so creating a second client over the SAME worker corrupts the reply stream —
    // the next completion dies with WebLLM's "Message error should not be 0". Same model loaded →
    // nothing to do; different model → tear the worker down and start clean.
    if (this.engine && this.loadedModelId === model.modelId) {
      onProgress({ progress: 1, text: 'Model already loaded.', fromCache: true });
      return;
    }
    if (this.engine || this.worker) this.dispose();

    try {
      // Dynamic import keeps the ~MB WebLLM client bundle out of the initial app
      // bundle — it loads only when the user opts in to enable the assistant.
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      this.worker = new Worker(new URL('./llm.worker', import.meta.url), { type: 'module' });
      this.engine = await CreateWebWorkerMLCEngine(this.worker, model.modelId, {
        initProgressCallback: (report: InitProgressReport) =>
          onProgress({
            progress: report.progress ?? 0,
            text: report.text ?? '',
            fromCache: /cache/i.test(report.text ?? '')
          })
      });
      this.loadedModelId = model.modelId;
      await this.tryPersistStorage();
    } catch (err) {
      this.dispose();
      throw classifyEngineError(err);
    }
  }

  async complete(messages: ChatMessage[], jsonSchema: Record<string, unknown>): Promise<string> {
    if (!this.engine) throw new AssistantEngineError('unknown', 'Engine not initialized.');
    try {
      // STREAMING on purpose, even though callers only want the final string: WebLLM's
      // `interruptGenerate()` sets a sticky `interruptSignal` that only the streaming generator
      // clears on entry. The non-streaming path checks the flag BEFORE clearing it, so any
      // interrupt (even on an idle engine) makes the next non-streaming completion die inside
      // `finishReply` with "Message error should not be 0". Accumulating deltas costs nothing
      // and immunizes every completion against a prior interrupt.
      const chunks = await this.engine.chat.completions.create({
        messages,
        temperature: 0,
        stream: true,
        response_format: { type: 'json_object', schema: JSON.stringify(jsonSchema) }
      });
      let out = '';
      for await (const chunk of chunks) {
        out += chunk.choices?.[0]?.delta?.content ?? '';
      }
      return out;
    } catch (err) {
      throw classifyEngineError(err);
    }
  }

  async isModelCached(tier: AssistantTier): Promise<boolean> {
    const model = modelForTier(tier);
    if (!model) return false;
    try {
      const { hasModelInCache } = await import('@mlc-ai/web-llm');
      return await hasModelInCache(model.modelId);
    } catch {
      return false;
    }
  }

  interrupt(): void {
    this.engine?.interruptGenerate();
  }

  dispose(): void {
    try {
      this.engine?.unload();
    } catch {
      /* best-effort */
    }
    this.worker?.terminate();
    this.engine = null;
    this.worker = null;
    this.loadedModelId = null;
  }

  private async tryPersistStorage(): Promise<void> {
    if (this.persisted) return;
    this.persisted = true;
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* best-effort */
    }
  }
}
