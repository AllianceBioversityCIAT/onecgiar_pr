import { InjectionToken } from '@angular/core';
import { AssistantTier } from './model-tiers';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Download / load progress, normalized from WebLLM's InitProgressReport. */
export interface EngineProgress {
  /** 0..1 */
  progress: number;
  text: string;
  /** True once the weights are served from cache rather than the network. */
  fromCache: boolean;
}

export type EngineErrorKind = 'webgpu-lost' | 'oom' | 'network-blocked' | 'unsupported' | 'unknown';

export class AssistantEngineError extends Error {
  constructor(
    readonly kind: EngineErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'AssistantEngineError';
  }
}

/**
 * Abstraction over the LLM backend. The concrete WebLLM implementation is the
 * only place importing `@mlc-ai/web-llm`; unit tests provide a fake, and a
 * future regex fallback / server LLM can implement this same interface.
 */
export interface AssistantEngine {
  /** Load the model for the given tier, reporting progress. */
  init(tier: AssistantTier, onProgress: (p: EngineProgress) => void): Promise<void>;
  /**
   * Run one completion constrained to `jsonSchema`; returns the raw JSON string
   * the model produced (the orchestrator parses + validates it).
   */
  complete(messages: ChatMessage[], jsonSchema: Record<string, unknown>): Promise<string>;
  /** Whether the tier's model is already cached (drives opt-in vs fast-start). */
  isModelCached(tier: AssistantTier): Promise<boolean>;
  /** Abort an in-flight generation, if supported. */
  interrupt(): void;
  /** Release the engine/worker (logout, destroy). */
  dispose(): void;
}

export const ASSISTANT_ENGINE = new InjectionToken<AssistantEngine>('ASSISTANT_ENGINE');

/** Maps an arbitrary engine error to a typed `AssistantEngineError`. Pure → testable without WebGPU. */
export function classifyEngineError(err: unknown): AssistantEngineError {
  if (err instanceof AssistantEngineError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  let kind: EngineErrorKind = 'unknown';
  if (/webgpu|device.*lost|lost.*device|gpu.*(lost|disconnect)/.test(lower)) kind = 'webgpu-lost';
  else if (/out of memory|oom|allocation failed|buffer size/.test(lower)) kind = 'oom';
  else if (/failed to fetch|network|cors|load model|fetch.*shard/.test(lower)) kind = 'network-blocked';
  return new AssistantEngineError(kind, message);
}
