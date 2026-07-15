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

  async init(tier: AssistantTier, onProgress: (p: EngineProgress) => void): Promise<void> {
    const model = modelForTier(tier);
    if (!model) throw new AssistantEngineError('unsupported', `No model for tier "${tier}".`);

    try {
      // Dynamic import keeps the ~MB WebLLM client bundle out of the initial app
      // bundle — it loads only when the user opts in to enable the assistant.
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      this.worker ??= new Worker(new URL('./llm.worker', import.meta.url), { type: 'module' });
      this.engine = await CreateWebWorkerMLCEngine(this.worker, model.modelId, {
        initProgressCallback: (report: InitProgressReport) =>
          onProgress({
            progress: report.progress ?? 0,
            text: report.text ?? '',
            fromCache: /cache/i.test(report.text ?? '')
          })
      });
      await this.tryPersistStorage();
    } catch (err) {
      throw classifyEngineError(err);
    }
  }

  async complete(messages: ChatMessage[], jsonSchema: Record<string, unknown>): Promise<string> {
    if (!this.engine) throw new AssistantEngineError('unknown', 'Engine not initialized.');
    try {
      const completion = await this.engine.chat.completions.create({
        messages,
        temperature: 0,
        response_format: { type: 'json_object', schema: JSON.stringify(jsonSchema) }
      });
      return completion.choices?.[0]?.message?.content ?? '';
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
