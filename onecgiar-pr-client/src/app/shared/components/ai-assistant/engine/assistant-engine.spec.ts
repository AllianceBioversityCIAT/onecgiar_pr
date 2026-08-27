import { AssistantEngineError, classifyEngineError } from './assistant-engine.types';
import { demoteTier, modelForTier } from './model-tiers';
import { buildSystemPrompt } from './system-prompt';
import { NAVIGATE_SECTIONS } from '../tools/assistant-tools';

describe('classifyEngineError', () => {
  it('maps device-lost messages to webgpu-lost', () => {
    expect(classifyEngineError(new Error('WebGPU device was lost')).kind).toBe('webgpu-lost');
  });

  it('maps out-of-memory messages to oom', () => {
    expect(classifyEngineError(new Error('Out of memory while allocating')).kind).toBe('oom');
  });

  it('maps fetch failures to network-blocked', () => {
    expect(classifyEngineError(new Error('Failed to fetch param shard')).kind).toBe('network-blocked');
  });

  it('falls back to unknown', () => {
    expect(classifyEngineError(new Error('something else')).kind).toBe('unknown');
  });

  it('passes through an existing AssistantEngineError', () => {
    const original = new AssistantEngineError('oom', 'boom');
    expect(classifyEngineError(original)).toBe(original);
  });
});

describe('model tiers', () => {
  it('has no model for the unsupported tier', () => {
    expect(modelForTier('unsupported')).toBeNull();
  });

  it('demotes mid → small → no-f16 and stops', () => {
    expect(demoteTier('mid')).toBe('small');
    expect(demoteTier('small')).toBe('no-f16');
    expect(demoteTier('no-f16')).toBeNull();
  });
});

describe('buildSystemPrompt', () => {
  const identity = { name: 'Ada Lovelace', firstName: 'Ada', email: 'ada@cgiar.org', isAdmin: false, readOnly: false };

  it('lists every navigation slug', () => {
    const prompt = buildSystemPrompt(identity);
    for (const section of NAVIGATE_SECTIONS) {
      expect(prompt).toContain(section.slug);
    }
  });

  it('grounds the prompt in the user identity and states the language rule', () => {
    const prompt = buildSystemPrompt(identity);
    expect(prompt).toContain('Ada Lovelace');
    expect(prompt).toContain('administrators only');
    expect(prompt.toLowerCase()).toContain('spanish');
  });
});
