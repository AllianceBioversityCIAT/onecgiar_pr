// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-R-13, COV-R-14, COV-DD-3)
import { convertToParamMap } from '@angular/router';
import {
  applyResultsTabDefaults,
  hasAnyContractParam,
  parseBilateralQueryParams,
  RESULTS_TAB_DEFAULT_PARAMS,
  serializeBilateralQueryParams,
  STATUS_ID_TO_KEY,
  STATUS_KEY_TO_ID,
} from './bilateral-query-params';

/** Sorted copy — `present`'s element order is not part of the contract. */
function sortedPresent(present: readonly string[]): string[] {
  return [...present].sort();
}

const emptyMap = convertToParamMap({});

describe('parseBilateralQueryParams', () => {
  it('defaults every key when no contract param is present', () => {
    const { params, stripped, present } = parseBilateralQueryParams(emptyMap);

    expect(params).toEqual({
      phase: null,
      status: [],
      project: [],
      program: [],
      type: [],
      role: null,
      source: null,
      method: null,
      search: '',
      multi: false,
    });
    expect(stripped).toEqual([]);
    expect(present).toEqual([]);
  });

  describe('phase', () => {
    it('parses a valid positive numeric phase and marks it present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ phase: '36' }));
      expect(params.phase).toBe(36);
      expect(stripped).toEqual([]);
      expect(present).toEqual(['phase']);
    });

    it('strips a non-numeric phase and reports it', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ phase: 'abc' }));
      expect(params.phase).toBeNull();
      expect(stripped).toEqual(['phase=abc']);
    });

    it('strips a zero/negative phase', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ phase: '-5' }));
      expect(params.phase).toBeNull();
      expect(stripped).toEqual(['phase=-5']);
    });

    it('treats an empty phase as absent (no stripping)', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ phase: '' }));
      expect(params.phase).toBeNull();
      expect(stripped).toEqual([]);
    });
  });

  describe('status', () => {
    it('parses a valid multi-value list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ status: 'pending,approved' }));
      expect(params.status).toEqual(['pending', 'approved']);
      expect(stripped).toEqual([]);
    });

    it('drops an invalid token and reports it while keeping the valid ones', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ status: 'foo,pending' }));
      expect(params.status).toEqual(['pending']);
      expect(stripped).toEqual(['status=foo']);
    });

    it('collapses duplicates without reporting them', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ status: 'pending,pending' }));
      expect(params.status).toEqual(['pending']);
      expect(stripped).toEqual([]);
    });

    it('defaults to all statuses (empty array) when absent', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ status: '' }));
      expect(params.status).toEqual([]);
      expect(stripped).toEqual([]);
    });

    it('handles a mixed valid/invalid/duplicate list', () => {
      const { params, stripped } = parseBilateralQueryParams(
        convertToParamMap({ status: 'foo,pending,pending,bar,approved' }),
      );
      expect(params.status).toEqual(['pending', 'approved']);
      expect(stripped).toEqual(['status=foo', 'status=bar']);
    });
  });

  describe('project', () => {
    it('parses a valid multi-value id list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ project: '118,42' }));
      expect(params.project).toEqual([118, 42]);
      expect(stripped).toEqual([]);
    });

    it('drops a non-numeric id and reports it', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ project: '118,abc' }));
      expect(params.project).toEqual([118]);
      expect(stripped).toEqual(['project=abc']);
    });

    it('drops a zero/negative/decimal id and reports it', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ project: '0,-3,1.5' }));
      expect(params.project).toEqual([]);
      expect(stripped).toEqual(['project=0', 'project=-3', 'project=1.5']);
    });

    it('collapses duplicates without reporting them', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ project: '118,118' }));
      expect(params.project).toEqual([118]);
      expect(stripped).toEqual([]);
    });

    it('defaults to no project filter when absent', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ project: '' }));
      expect(params.project).toEqual([]);
      expect(stripped).toEqual([]);
    });

    it('handles a mixed valid/invalid/duplicate list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ project: '118,abc,118,42' }));
      expect(params.project).toEqual([118, 42]);
      expect(stripped).toEqual(['project=abc']);
    });
  });

  describe('program', () => {
    it('parses a valid multi-value code list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ program: 'SP03,SP11' }));
      expect(params.program).toEqual(['SP03', 'SP11']);
      expect(stripped).toEqual([]);
    });

    it('drops a code with disallowed characters and reports it', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ program: 'SP03,SP!11' }));
      expect(params.program).toEqual(['SP03']);
      expect(stripped).toEqual(['program=SP!11']);
    });

    it('collapses duplicates without reporting them', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ program: 'SP03,SP03' }));
      expect(params.program).toEqual(['SP03']);
      expect(stripped).toEqual([]);
    });

    it('defaults to no program filter when absent', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ program: '' }));
      expect(params.program).toEqual([]);
      expect(stripped).toEqual([]);
    });

    it('handles a mixed valid/invalid/duplicate list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ program: 'SP03,SP!11,SP03,SP12' }));
      expect(params.program).toEqual(['SP03', 'SP12']);
      expect(stripped).toEqual(['program=SP!11']);
    });
  });

  describe('type', () => {
    it('parses a valid multi-value id list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ type: '5,6' }));
      expect(params.type).toEqual([5, 6]);
      expect(stripped).toEqual([]);
    });

    it('drops a non-numeric id and reports it', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ type: '5,abc' }));
      expect(params.type).toEqual([5]);
      expect(stripped).toEqual(['type=abc']);
    });

    it('collapses duplicates without reporting them', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ type: '5,5' }));
      expect(params.type).toEqual([5]);
      expect(stripped).toEqual([]);
    });

    it('defaults to no type filter when absent', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ type: '' }));
      expect(params.type).toEqual([]);
      expect(stripped).toEqual([]);
    });

    it('handles a mixed valid/invalid/duplicate list', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ type: '5,abc,5,7' }));
      expect(params.type).toEqual([5, 7]);
      expect(stripped).toEqual(['type=abc']);
    });
  });

  describe('role', () => {
    it('parses a valid value and marks it present', () => {
      const lead = parseBilateralQueryParams(convertToParamMap({ role: 'lead' }));
      expect(lead.params.role).toBe('lead');
      expect(lead.present).toEqual(['role']);
      expect(parseBilateralQueryParams(convertToParamMap({ role: 'contributing' })).params.role).toBe('contributing');
    });

    it('strips an invalid value, reports it, and does NOT mark it present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ role: 'owner' }));
      expect(params.role).toBeNull();
      expect(stripped).toEqual(['role=owner']);
      expect(present).toEqual([]);
    });

    it('accepts the additive "all" token — parses to null (both) but counts as present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ role: 'all' }));
      expect(params.role).toBeNull();
      expect(stripped).toEqual([]);
      expect(present).toEqual(['role']);
    });

    it('defaults to both (null) and NOT present when empty/absent', () => {
      expect(parseBilateralQueryParams(convertToParamMap({ role: '' })).params.role).toBeNull();
      const empty = parseBilateralQueryParams(emptyMap);
      expect(empty.params.role).toBeNull();
      expect(empty.present).toEqual([]);
    });
  });

  describe('source', () => {
    it('parses a valid value and marks it present', () => {
      const w3 = parseBilateralQueryParams(convertToParamMap({ source: 'w3' }));
      expect(w3.params.source).toBe('w3');
      expect(w3.present).toEqual(['source']);
      expect(parseBilateralQueryParams(convertToParamMap({ source: 'w1w2' })).params.source).toBe('w1w2');
    });

    it('strips an invalid value, reports it, and does NOT mark it present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ source: 'w4' }));
      expect(params.source).toBeNull();
      expect(stripped).toEqual(['source=w4']);
      expect(present).toEqual([]);
    });

    it('accepts the additive "all" token — parses to null (both) but counts as present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ source: 'all' }));
      expect(params.source).toBeNull();
      expect(stripped).toEqual([]);
      expect(present).toEqual(['source']);
    });

    it('defaults to both (null) and NOT present when empty/absent', () => {
      expect(parseBilateralQueryParams(convertToParamMap({ source: '' })).params.source).toBeNull();
      const empty = parseBilateralQueryParams(emptyMap);
      expect(empty.params.source).toBeNull();
      expect(empty.present).toEqual([]);
    });
  });

  describe('method', () => {
    it('parses a valid value and marks it present', () => {
      const ai = parseBilateralQueryParams(convertToParamMap({ method: 'ai' }));
      expect(ai.params.method).toBe('ai');
      expect(ai.present).toEqual(['method']);
      expect(parseBilateralQueryParams(convertToParamMap({ method: 'manual' })).params.method).toBe('manual');
    });

    it('strips an invalid value, reports it, and does NOT mark it present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ method: 'auto' }));
      expect(params.method).toBeNull();
      expect(stripped).toEqual(['method=auto']);
      expect(present).toEqual([]);
    });

    it('accepts the additive "all" token — parses to null (both) but counts as present', () => {
      const { params, stripped, present } = parseBilateralQueryParams(convertToParamMap({ method: 'all' }));
      expect(params.method).toBeNull();
      expect(stripped).toEqual([]);
      expect(present).toEqual(['method']);
    });

    it('defaults to both (null) and NOT present when empty/absent', () => {
      expect(parseBilateralQueryParams(convertToParamMap({ method: '' })).params.method).toBeNull();
      const empty = parseBilateralQueryParams(emptyMap);
      expect(empty.params.method).toBeNull();
      expect(empty.present).toEqual([]);
    });
  });

  describe('search', () => {
    it('passes through free text, trimmed', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ search: '  cocoa yield  ' }));
      expect(params.search).toBe('cocoa yield');
      expect(stripped).toEqual([]);
    });

    it('defaults to empty string when absent', () => {
      expect(parseBilateralQueryParams(emptyMap).params.search).toBe('');
    });
  });

  describe('multi', () => {
    it('parses "1" as true', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ multi: '1' }));
      expect(params.multi).toBe(true);
      expect(stripped).toEqual([]);
    });

    it('strips any other value and defaults to false', () => {
      const { params, stripped } = parseBilateralQueryParams(convertToParamMap({ multi: 'true' }));
      expect(params.multi).toBe(false);
      expect(stripped).toEqual(['multi=true']);
    });

    it('defaults to false when absent', () => {
      expect(parseBilateralQueryParams(emptyMap).params.multi).toBe(false);
    });
  });
});

describe('serializeBilateralQueryParams', () => {
  const defaults = parseBilateralQueryParams(emptyMap).params;

  it('omits every key for the default params', () => {
    expect(serializeBilateralQueryParams(defaults)).toEqual({});
  });

  it('serializes every non-default key', () => {
    const result = serializeBilateralQueryParams({
      phase: 36,
      status: ['pending', 'approved'],
      project: [118, 42],
      program: ['SP03'],
      type: [5, 6],
      role: 'lead',
      source: 'w3',
      method: 'ai',
      search: 'cocoa',
      multi: true,
    });

    expect(result).toEqual({
      phase: '36',
      status: 'pending,approved',
      project: '118,42',
      program: 'SP03',
      type: '5,6',
      role: 'lead',
      source: 'w3',
      method: 'ai',
      search: 'cocoa',
      multi: '1',
    });
  });

  it('never emits status/project/program/type for an empty selection', () => {
    const result = serializeBilateralQueryParams({ ...defaults, status: [], project: [], program: [], type: [] });
    expect(result.status).toBeUndefined();
    expect(result.project).toBeUndefined();
    expect(result.program).toBeUndefined();
    expect(result.type).toBeUndefined();
  });

  it('never emits role/source/method when null', () => {
    const result = serializeBilateralQueryParams({ ...defaults, role: null, source: null, method: null });
    expect(result.role).toBeUndefined();
    expect(result.source).toBeUndefined();
    expect(result.method).toBeUndefined();
  });

  it('emits multi only when true', () => {
    expect(serializeBilateralQueryParams({ ...defaults, multi: false }).multi).toBeUndefined();
    expect(serializeBilateralQueryParams({ ...defaults, multi: true }).multi).toBe('1');
  });

  it('never emits search for an empty string', () => {
    expect(serializeBilateralQueryParams({ ...defaults, search: '' }).search).toBeUndefined();
  });

  it('round-trips through parse', () => {
    const original = {
      phase: 36,
      status: ['pending', 'approved'] as const,
      project: [118, 42],
      program: ['SP03'],
      type: [5, 6],
      role: 'lead' as const,
      source: 'w3' as const,
      method: 'ai' as const,
      search: 'cocoa',
      multi: true,
    };
    const serialized = serializeBilateralQueryParams(original);
    const { params, stripped } = parseBilateralQueryParams(convertToParamMap(serialized));
    expect(params).toEqual(original);
    expect(stripped).toEqual([]);
  });

  describe('explicitDefaults', () => {
    it('emits role=all / source=all when those keys are null', () => {
      const result = serializeBilateralQueryParams(defaults, { explicitDefaults: true });
      expect(result.role).toBe('all');
      expect(result.source).toBe('all');
    });

    it('never emits method=all, even with explicitDefaults', () => {
      const result = serializeBilateralQueryParams(defaults, { explicitDefaults: true });
      expect(result.method).toBeUndefined();
    });

    it('still emits the real value, not "all", when role/source are set', () => {
      const result = serializeBilateralQueryParams({ ...defaults, role: 'lead', source: 'w3' }, { explicitDefaults: true });
      expect(result.role).toBe('lead');
      expect(result.source).toBe('w3');
    });

    it('without the option, defaults produce no role/source keys at all (unchanged behavior)', () => {
      const result = serializeBilateralQueryParams(defaults);
      expect(result.role).toBeUndefined();
      expect(result.source).toBeUndefined();
    });

    it('round-trips through parse to the same params, and hasAnyContractParam is then true', () => {
      const withPhase = { ...defaults, phase: 36 };
      const serialized = serializeBilateralQueryParams(withPhase, { explicitDefaults: true });
      const parsed = parseBilateralQueryParams(convertToParamMap(serialized));
      expect(parsed.params).toEqual(withPhase);
      expect(sortedPresent(parsed.present)).toEqual(['phase', 'role', 'source']);
      expect(hasAnyContractParam(parsed)).toBe(true);
    });
  });
});

describe('STATUS_KEY_TO_ID / STATUS_ID_TO_KEY', () => {
  it('maps every status key to its id per the requirements table', () => {
    expect(STATUS_KEY_TO_ID).toEqual({
      editing: 1,
      qa: 2,
      submitted: 3,
      discontinued: 4,
      pending: 5,
      approved: 6,
      rejected: 7,
    });
  });

  it('is the exact inverse of STATUS_ID_TO_KEY', () => {
    for (const [key, id] of Object.entries(STATUS_KEY_TO_ID)) {
      expect(STATUS_ID_TO_KEY[id]).toBe(key);
    }
  });
});

describe('applyResultsTabDefaults / hasAnyContractParam', () => {
  it('merges the Results tab defaults when the URL carries no contract key at all', () => {
    const parsed = parseBilateralQueryParams(emptyMap);
    const { params } = applyResultsTabDefaults(parsed);
    expect(params.role).toBe(RESULTS_TAB_DEFAULT_PARAMS.role);
    expect(params.source).toBe(RESULTS_TAB_DEFAULT_PARAMS.source);
  });

  it('`phase` alone (e.g. a header tab click carrying ?phase=36) STILL gets the W3 + Lead default — phase is shell context, not a filter (COV-DD-2/3 amendment)', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ phase: '36' }));
    const { params } = applyResultsTabDefaults(parsed);
    expect(params.role).toBe(RESULTS_TAB_DEFAULT_PARAMS.role);
    expect(params.source).toBe(RESULTS_TAB_DEFAULT_PARAMS.source);
    expect(params.phase).toBe(36);
  });

  it('does NOT default role/source when ?phase=36&role=all&source=all is present (the Overview hero-link shape)', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ phase: '36', role: 'all', source: 'all' }));
    const { params } = applyResultsTabDefaults(parsed);
    expect(params.role).toBeNull();
    expect(params.source).toBeNull();
    expect(params.phase).toBe(36);
  });

  it('an invalid, all-stripped key (e.g. ?status=foo) still gets the default — nothing VALID is present', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ status: 'foo' }));
    expect(parsed.present).toEqual([]);
    const { params } = applyResultsTabDefaults(parsed);
    expect(params.role).toBe(RESULTS_TAB_DEFAULT_PARAMS.role);
    expect(params.source).toBe(RESULTS_TAB_DEFAULT_PARAMS.source);
  });

  it('leaves an explicit role/source untouched (does not re-default over a user choice)', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ role: 'contributing' }));
    const { params } = applyResultsTabDefaults(parsed);
    expect(params.role).toBe('contributing');
    expect(params.source).toBeNull();
  });

  it('hasAnyContractParam is true iff `present` contains a key other than "phase"', () => {
    expect(hasAnyContractParam(parseBilateralQueryParams(emptyMap))).toBe(false);
    expect(hasAnyContractParam(parseBilateralQueryParams(convertToParamMap({ phase: '36' })))).toBe(false);
    expect(hasAnyContractParam(parseBilateralQueryParams(convertToParamMap({ search: 'x' })))).toBe(true);
    expect(hasAnyContractParam(parseBilateralQueryParams(convertToParamMap({ multi: '1' })))).toBe(true);
    expect(hasAnyContractParam(parseBilateralQueryParams(convertToParamMap({ role: 'all' })))).toBe(true);
  });

  // COV-T-7: the Results tab passes `['phase', 'multi']` so a stray `?multi=1` left over from a
  // Reporting deep link does not, by itself, suppress the Results tab's own W3 + Lead default.
  it('an optional `ignoreKeys` list lets a caller exclude additional keys (e.g. "multi") from both functions', () => {
    const parsed = parseBilateralQueryParams(convertToParamMap({ phase: '36', multi: '1' }));
    expect(hasAnyContractParam(parsed)).toBe(true); // default ignoreKeys = ['phase'] only
    expect(hasAnyContractParam(parsed, ['phase', 'multi'])).toBe(false);

    const { params } = applyResultsTabDefaults(parsed, ['phase', 'multi']);
    expect(params.role).toBe(RESULTS_TAB_DEFAULT_PARAMS.role);
    expect(params.source).toBe(RESULTS_TAB_DEFAULT_PARAMS.source);
    expect(params.phase).toBe(36);
    expect(params.multi).toBe(true);
  });
});
