import { Injectable } from '@angular/core';
import { AssistantTier, modelForTier } from './engine/model-tiers';

const GIB = 1024 ** 3;

/** Minimal shape of the browser APIs we probe (keeps the core testable). */
export interface CapabilityNavigator {
  gpu?: {
    requestAdapter(): Promise<GpuAdapterLike | null>;
  };
  deviceMemory?: number;
  storage?: {
    estimate?(): Promise<{ quota?: number; usage?: number }>;
  };
}

export interface GpuAdapterLike {
  features: { has(name: string): boolean };
  limits: { maxStorageBufferBindingSize: number };
  info?: { vendor?: string; architecture?: string };
}

export interface CapabilityResult {
  tier: AssistantTier;
  reason: string;
}

/**
 * Detects device capability to pick a model tier BEFORE any download. Detection
 * is a heuristic; a runtime OOM/device-lost error demotes the tier (handled by
 * the engine/orchestrator). Never triggers a download.
 */
@Injectable({ providedIn: 'root' })
export class DeviceCapabilityService {
  detect(nav: CapabilityNavigator = navigator as unknown as CapabilityNavigator): Promise<CapabilityResult> {
    return detectCapability(nav);
  }
}

export async function detectCapability(nav: CapabilityNavigator): Promise<CapabilityResult> {
  if (!nav.gpu) {
    return { tier: 'unsupported', reason: 'no-webgpu' };
  }

  let adapter: GpuAdapterLike | null;
  try {
    adapter = await nav.gpu.requestAdapter();
  } catch {
    adapter = null;
  }
  if (!adapter) {
    return { tier: 'unsupported', reason: 'no-adapter' };
  }

  const arch = `${adapter.info?.architecture ?? ''} ${adapter.info?.vendor ?? ''}`.toLowerCase();
  if (/swiftshader|software|lavapipe|llvmpipe/.test(arch)) {
    return { tier: 'unsupported', reason: 'software-adapter' };
  }

  const bindingBytes = adapter.limits?.maxStorageBufferBindingSize ?? 0;
  const bindingGiB = bindingBytes / GIB;
  const hasF16 = adapter.features?.has('shader-f16') ?? false;
  const deviceMemory = nav.deviceMemory ?? 8;

  const candidate: AssistantTier = pickTier(hasF16, bindingGiB, deviceMemory);
  if (candidate === 'unsupported') {
    return { tier: 'unsupported', reason: 'insufficient-gpu' };
  }

  // Pre-check storage quota against the tier's download so we don't offer a
  // download that cannot fit.
  const model = modelForTier(candidate);
  if (model && nav.storage?.estimate) {
    try {
      const { quota = 0, usage = 0 } = await nav.storage.estimate();
      const freeBytes = quota - usage;
      if (freeBytes > 0 && freeBytes < model.downloadMB * 1024 * 1024) {
        return { tier: 'unsupported', reason: 'insufficient-storage' };
      }
    } catch {
      /* estimate is best-effort; ignore failures */
    }
  }

  return { tier: candidate, reason: 'ok' };
}

function pickTier(hasF16: boolean, bindingGiB: number, deviceMemory: number): AssistantTier {
  if (!hasF16) {
    // WebGPU present but no half-float — use the q4f32 variant if the GPU can hold it.
    return bindingGiB >= 1 ? 'no-f16' : 'unsupported';
  }
  if (bindingGiB >= 2 && deviceMemory >= 8) return 'mid';
  if (bindingGiB >= 1) return 'small';
  return 'unsupported';
}
