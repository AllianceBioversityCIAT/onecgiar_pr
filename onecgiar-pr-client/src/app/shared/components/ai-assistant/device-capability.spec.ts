import { CapabilityNavigator, detectCapability, GpuAdapterLike } from './device-capability.service';

const GIB = 1024 ** 3;

function adapter(opts: { f16?: boolean; bindingGiB?: number; arch?: string }): GpuAdapterLike {
  return {
    features: { has: (name: string) => (name === 'shader-f16' ? opts.f16 ?? true : false) },
    limits: { maxStorageBufferBindingSize: (opts.bindingGiB ?? 2) * GIB },
    info: { architecture: opts.arch ?? 'apple-gpu', vendor: 'apple' }
  };
}

function nav(a: GpuAdapterLike | null, deviceMemory = 8): CapabilityNavigator {
  return {
    gpu: a ? { requestAdapter: () => Promise.resolve(a) } : undefined,
    deviceMemory,
    storage: { estimate: () => Promise.resolve({ quota: 50 * GIB, usage: 1 * GIB }) }
  };
}

describe('detectCapability', () => {
  it('returns unsupported when WebGPU is absent', async () => {
    expect((await detectCapability({})).tier).toBe('unsupported');
  });

  it('returns unsupported when no adapter is available', async () => {
    expect((await detectCapability(nav(null))).tier).toBe('unsupported');
  });

  it('returns unsupported for a software adapter', async () => {
    const result = await detectCapability(nav(adapter({ arch: 'swiftshader' })));
    expect(result.tier).toBe('unsupported');
    expect(result.reason).toBe('software-adapter');
  });

  it('selects mid on a capable machine (f16, >=2GiB, deviceMemory>=8)', async () => {
    const result = await detectCapability(nav(adapter({ f16: true, bindingGiB: 2 }), 8));
    expect(result.tier).toBe('mid');
  });

  it('selects small on a default machine (f16, 1-2GiB)', async () => {
    const result = await detectCapability(nav(adapter({ f16: true, bindingGiB: 1 }), 8));
    expect(result.tier).toBe('small');
  });

  it('drops mid to small when deviceMemory < 8', async () => {
    const result = await detectCapability(nav(adapter({ f16: true, bindingGiB: 4 }), 4));
    expect(result.tier).toBe('small');
  });

  it('selects no-f16 when shader-f16 is missing but GPU can hold it', async () => {
    const result = await detectCapability(nav(adapter({ f16: false, bindingGiB: 2 }), 8));
    expect(result.tier).toBe('no-f16');
  });

  it('returns unsupported when storage quota is smaller than the download', async () => {
    const n = nav(adapter({ f16: true, bindingGiB: 2 }), 8);
    n.storage = { estimate: () => Promise.resolve({ quota: 100 * 1024 * 1024, usage: 0 }) };
    const result = await detectCapability(n);
    expect(result.tier).toBe('unsupported');
    expect(result.reason).toBe('insufficient-storage');
  });
});
