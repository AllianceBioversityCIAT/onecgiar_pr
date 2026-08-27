import { environment } from '../../../../../environments/environment';

/**
 * Model tier selected from device capability. `unsupported` means no local LLM
 * can run (no WebGPU / software adapter / insufficient storage) — the panel
 * shows a message instead of downloading anything.
 */
export type AssistantTier = 'unsupported' | 'small' | 'mid' | 'no-f16';

export interface ModelTierDef {
  tier: Exclude<AssistantTier, 'unsupported'>;
  /** Prebuilt WebLLM model id (present in prebuiltAppConfig). */
  modelId: string;
  /** Approximate one-time download size, MB (shown in the opt-in card). */
  downloadMB: number;
  /** VRAM required, MB (from prebuiltAppConfig.vram_required_MB). */
  vramMB: number;
  /** True when the model's q4f16 weights need the WebGPU `shader-f16` feature. */
  requiresShaderF16: boolean;
}

/**
 * Qwen2.5 family only — the sole small family that is officially multilingual
 * (Spanish incl.) AND trained for structured JSON output.
 */
export const MODEL_TIERS: Record<Exclude<AssistantTier, 'unsupported'>, ModelTierDef> = {
  small: {
    tier: 'small',
    modelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    downloadMB: 300,
    vramMB: 945,
    requiresShaderF16: true
  },
  mid: {
    tier: 'mid',
    modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    downloadMB: 900,
    vramMB: 1630,
    requiresShaderF16: true
  },
  'no-f16': {
    tier: 'no-f16',
    modelId: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    downloadMB: 450,
    vramMB: 1060,
    requiresShaderF16: false
  }
};

/** Ordered from strongest to weakest, for runtime demotion on OOM/device-lost. */
export const TIER_DEMOTION_ORDER: Exclude<AssistantTier, 'unsupported'>[] = ['mid', 'small', 'no-f16'];

export function modelForTier(tier: AssistantTier): ModelTierDef | null {
  return tier === 'unsupported' ? null : MODEL_TIERS[tier];
}

/** Next lower tier for demotion, or null if already at the floor. */
export function demoteTier(tier: AssistantTier): Exclude<AssistantTier, 'unsupported'> | null {
  const idx = TIER_DEMOTION_ORDER.indexOf(tier as Exclude<AssistantTier, 'unsupported'>);
  if (idx === -1 || idx === TIER_DEMOTION_ORDER.length - 1) return null;
  return TIER_DEMOTION_ORDER[idx + 1];
}

/** Reserved hook for self-hosting weights; empty → WebLLM's prebuilt CDN. */
export function modelBaseUrl(): string {
  return environment.aiAssistant?.modelBaseUrl ?? '';
}
