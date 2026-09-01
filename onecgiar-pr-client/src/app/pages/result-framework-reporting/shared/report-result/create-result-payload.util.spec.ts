import { buildCreateResultPayload, CreateResultPayloadOptions, OTHER_CENTERS_CODE, OTHER_SP_ID } from './create-result-payload.util';

/**
 * One `it` per case of the indicator-category matrix (openspec `report-result-aside/design.md` §D2).
 * The matrix is the contract this flow must not lose, so every category that a user can actually
 * reach gets an assertion here — including `4 Other outcome` and `8 Other output`, which are only
 * reachable through the category dropdown and were missing from every earlier analysis.
 */

const emptyBody = { handler: '', result_name: '', result_type_id: null, contribution_to_indicator_target: null };

function options(overrides: Partial<CreateResultPayloadOptions> = {}): CreateResultPayloadOptions {
  return {
    indicator: null,
    tocNode: { toc_result_id: 'toc-1', result_level_id: 4 },
    initiativeId: 42,
    body: { ...emptyBody },
    ...overrides
  };
}

function indicatorOfType(resultTypeId: number | null, extra: Record<string, any> = {}) {
  return { indicator_id: 7, result_type_id: resultTypeId, result_level_id: 4, number_target: 12, target_date: '2026-12-31', ...extra };
}

describe('buildCreateResultPayload — category matrix', () => {
  it('case A — Knowledge product (6) carries the retrieved metadata and the handle', () => {
    const mqap = { title: 'A knowledge product', metadata: [{ source: 'CGSpace' }] };
    const payload = buildCreateResultPayload(
      options({
        indicator: indicatorOfType(6),
        body: { ...emptyBody, result_name: 'A knowledge product', handler: 'https://hdl.handle.net/10568/128401' },
        mqapJson: mqap
      })
    );

    expect(payload['result'].result_type_id).toBe(6);
    expect(payload['knowledge_product']).toBe(mqap);
    expect(payload['result'].handler).toBe('https://hdl.handle.net/10568/128401');
  });

  it('case B — Innovation development (7) sends no knowledge product and no handle', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(7), body: { ...emptyBody, result_name: 'An innovation' } })
    );

    expect(payload['result'].result_type_id).toBe(7);
    expect(payload['knowledge_product']).toBeNull();
    expect(payload['result'].handler).toBe('');
  });

  it.each([
    ['case C — Capacity sharing', 5],
    ['case D — Innovation use', 2],
    ['case E — Policy change', 1]
  ])('%s behaves exactly like Innovation development', (_label, typeId) => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(typeId), body: { ...emptyBody, result_name: 'A result' } })
    );

    expect(payload['result'].result_type_id).toBe(typeId);
    expect(payload['knowledge_product']).toBeNull();
    expect(payload['result'].handler).toBe('');
  });

  it.each([
    ['Other outcome', 4],
    ['Other output', 8]
  ])('case F — %s (%i) is only reachable through the dropdown and must still build', (_label, typeId) => {
    const payload = buildCreateResultPayload(
      options({
        indicator: indicatorOfType(null),
        body: { ...emptyBody, result_name: 'An other-category result', result_type_id: typeId }
      })
    );

    expect(payload['result'].result_type_id).toBe(typeId);
    expect(payload['knowledge_product']).toBeNull();
  });

  it('case F — an uncategorised indicator takes the type the user picked, never undefined', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(null), body: { ...emptyBody, result_name: 'x', result_type_id: 5 } })
    );

    expect(payload['result'].result_type_id).toBe(5);
  });

  it('case F-KP — picking Knowledge product in the dropdown carries the metadata', () => {
    const mqap = { title: 'From the repository' };
    const payload = buildCreateResultPayload(
      options({
        indicator: indicatorOfType(null),
        body: { ...emptyBody, result_name: 'From the repository', result_type_id: 6, handler: 'https://cgspace.cgiar.org/handle/10568/1' },
        mqapJson: mqap
      })
    );

    expect(payload['result'].result_type_id).toBe(6);
    expect(payload['knowledge_product']).toBe(mqap);
  });

  it('case G — emerging: no ToC id, no indicators, category from the entry card', () => {
    const payload = buildCreateResultPayload(
      options({
        indicator: null,
        tocNode: null,
        emergingCategory: { id: 7, name: 'Innovation development', levelId: 4 },
        body: { ...emptyBody, result_name: 'An emerging result' }
      })
    );

    expect(payload['toc_result_id']).toBeUndefined();
    expect(payload['indicators']).toEqual([]);
    expect(payload['result'].result_type_id).toBe(7);
    expect(payload['result'].result_level_id).toBe(4);
  });

  it('an indicator that declares its category wins over whatever sits in the form body', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(7), body: { ...emptyBody, result_name: 'x', result_type_id: 6 } })
    );

    expect(payload['result'].result_type_id).toBe(7);
  });
});

describe('buildCreateResultPayload — knowledge-product state cannot leak across categories', () => {
  it('drops retrieved metadata when the category is no longer Knowledge product', () => {
    const payload = buildCreateResultPayload(
      options({
        indicator: indicatorOfType(null),
        body: { ...emptyBody, result_name: 'Was a KP', result_type_id: 7, handler: 'https://hdl.handle.net/10568/1' },
        mqapJson: { title: 'Was a KP' }
      })
    );

    expect(payload['knowledge_product']).toBeNull();
    expect(payload['result'].handler).toBe('');
  });
});

describe('buildCreateResultPayload — contributors', () => {
  const ilri = { code: 'ILRI', name: 'ILRI' };
  const irri = { code: 'IRRI', name: 'IRRI' };
  const sentinelCenter = { code: OTHER_CENTERS_CODE, name: 'Other(s) CGIAR Centers' };
  const sp1 = { id: 11, name: 'SP01' };
  const sentinelSp = { id: OTHER_SP_ID, name: 'Other(s)' };

  it('flags ToC entries from_toc:true and added entries from_toc:false in the same call', () => {
    const payload = buildCreateResultPayload(
      options({
        indicator: indicatorOfType(7),
        body: { ...emptyBody, result_name: 'x' },
        tocCentersSelected: [ilri],
        otherCentersSelected: [irri],
        tocScienceSelected: [sp1],
        otherScienceSelected: [{ id: 12, name: 'SP02' }]
      })
    );

    expect(payload['contributing_center']).toEqual([
      { ...ilri, from_toc: true },
      { ...irri, from_toc: false }
    ]);
    expect(payload['contributors_result_toc_result']).toEqual([
      { ...sp1, from_toc: true },
      { id: 12, name: 'SP02', from_toc: false }
    ]);
  });

  it('never lets the center sentinel travel', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(7), body: { ...emptyBody, result_name: 'x' }, tocCentersSelected: [ilri, sentinelCenter] })
    );

    expect(payload['contributing_center']).toEqual([{ ...ilri, from_toc: true }]);
    expect(JSON.stringify(payload)).not.toContain(OTHER_CENTERS_CODE);
  });

  it('never lets the science-program sentinel travel', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(7), body: { ...emptyBody, result_name: 'x' }, tocScienceSelected: [sp1, sentinelSp] })
    );

    expect(payload['contributors_result_toc_result']).toEqual([{ ...sp1, from_toc: true }]);
  });

  it('sends empty contributor arrays rather than undefined when nothing is selected', () => {
    const payload = buildCreateResultPayload(options({ indicator: indicatorOfType(7), body: { ...emptyBody, result_name: 'x' } }));

    expect(payload['contributing_center']).toEqual([]);
    expect(payload['contributors_result_toc_result']).toEqual([]);
    expect(payload['bilateral_project']).toEqual([]);
  });
});

describe('buildCreateResultPayload — level and table noise', () => {
  it('takes the level from the indicator, falling back to the ToC node', () => {
    expect(buildCreateResultPayload(options({ indicator: indicatorOfType(7, { result_level_id: 3 }) }))['result'].result_level_id).toBe(3);
    expect(buildCreateResultPayload(options({ indicator: indicatorOfType(7, { result_level_id: null }) }))['result'].result_level_id).toBe(4);
  });

  it('strips the Reporting table display keys — __hloNode alone carries every sibling indicator', () => {
    const payload = buildCreateResultPayload(
      options({
        indicator: indicatorOfType(7, { __hlo: 'HLO1', __hloNode: { indicators: [1, 2, 3] }, __aowCode: 'AOW01', __aowName: 'x', __tier: 1 }),
        body: { ...emptyBody, result_name: 'x' }
      })
    );

    expect(payload['indicators']).not.toHaveProperty('__hloNode');
    expect(payload['indicators']).not.toHaveProperty('__hlo');
    expect(payload['indicators']).not.toHaveProperty('__aowCode');
    expect(payload['indicators']).toMatchObject({ indicator_id: 7, result_type_id: 7 });
  });

  it('always sends an empty progressive narrative, as the legacy modal does', () => {
    expect(buildCreateResultPayload(options({ indicator: indicatorOfType(7) }))['toc_progressive_narrative']).toBe('');
  });

  it('carries the indicator target and date the row was reported against', () => {
    const payload = buildCreateResultPayload(options({ indicator: indicatorOfType(7) }));

    expect(payload['number_target']).toBe(12);
    expect(payload['target_date']).toBe('2026-12-31');
  });
});

/**
 * P2-3420 — "link to a QA'd Innovation Development result" on the ToC-linked creation form.
 *
 * The keys ride inside `result` because the server persists them INSIDE the create: the
 * innovation-use PATCH rejects a body with no valid `innovation_use_level_id`, and a result that
 * has just been created has no use level yet.
 */
describe('buildCreateResultPayload — innovation link (P2-3420)', () => {
  it('omits both keys entirely when the question was never asked (any category but Innovation use, or a phase before 2026)', () => {
    const payload = buildCreateResultPayload(options({ indicator: indicatorOfType(7) }));

    expect(payload['result']).not.toHaveProperty('has_innovation_link');
    expect(payload['result']).not.toHaveProperty('linked_results');
  });

  it('sends has_innovation_link=false and an empty list when the user leaves the default "No"', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(2), hasInnovationLink: false, linkedResultId: null })
    );

    expect(payload['result'].has_innovation_link).toBe(false);
    expect(payload['result'].linked_results).toEqual([]);
  });

  it('sends the single chosen innovation as a list when the user answers "Yes"', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(2), hasInnovationLink: true, linkedResultId: 501 })
    );

    expect(payload['result'].has_innovation_link).toBe(true);
    expect(payload['result'].linked_results).toEqual([501]);
  });

  it('normalises the id to a number — pr-select hands back the raw catalogue value as a string', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(2), hasInnovationLink: true, linkedResultId: '501' as any })
    );

    expect(payload['result'].linked_results).toEqual([501]);
  });

  it('drops a stale selection when the answer is "No" — a hidden link must never travel', () => {
    const payload = buildCreateResultPayload(
      options({ indicator: indicatorOfType(2), hasInnovationLink: false, linkedResultId: 501 })
    );

    expect(payload['result'].has_innovation_link).toBe(false);
    expect(payload['result'].linked_results).toEqual([]);
  });
});

describe('buildCreateResultPayload — KPAC knowledge-product contribution (KPAC-R-1, KPAC-R-6)', () => {
  it('KPAC-TEST-1 — type 6 forces contributing_indicator to 1 when body contribution is null or 0', () => {
    for (const contribution of [null, 0] as const) {
      const payload = buildCreateResultPayload(
        options({
          indicator: indicatorOfType(6),
          body: {
            ...emptyBody,
            result_name: 'A knowledge product',
            handler: 'https://hdl.handle.net/10568/128401',
            contribution_to_indicator_target: contribution
          }
        })
      );

      expect(payload['contributing_indicator']).toBe(1);
    }
  });

  it('KPAC-TEST-5 (util) — non-type-6 keeps body contribution without forcing 1', () => {
    for (const contribution of [3, null] as const) {
      const payload = buildCreateResultPayload(
        options({
          indicator: indicatorOfType(7),
          body: { ...emptyBody, result_name: 'An innovation', contribution_to_indicator_target: contribution }
        })
      );

      expect(payload['contributing_indicator']).toBe(contribution);
    }
  });
});
