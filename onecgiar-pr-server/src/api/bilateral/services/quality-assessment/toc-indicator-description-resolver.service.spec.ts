// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { TocIndicatorDescriptionResolver } from './toc-indicator-description-resolver.service';

describe('TocIndicatorDescriptionResolver', () => {
  function build(queryImpl: jest.Mock) {
    const dataSourceStub = { query: queryImpl } as any;
    return new TocIndicatorDescriptionResolver(dataSourceStub);
  }

  it('runs no query and returns an empty lookup for an empty id list', async () => {
    const query = jest.fn();
    const resolver = build(query);

    const result = await resolver.resolveIndicatorDescriptions([]);

    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('maps resolved rows by toc_results_indicator_id, de-duplicating the requested ids', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        toc_results_indicator_id: 'IND-1',
        indicator_description: 'Number of hectares under improved varieties',
      },
      {
        toc_results_indicator_id: 'IND-2',
        indicator_description: 'Number of farmers reached',
      },
    ]);
    const resolver = build(query);

    const result = await resolver.resolveIndicatorDescriptions([
      'IND-1',
      'IND-2',
      'IND-1',
    ]);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toEqual(expect.stringContaining('toc_results_indicators'));
    expect(sql).toEqual(expect.stringContaining('is_active'));
    expect(params).toEqual(['IND-1', 'IND-2']);

    expect(result).toEqual({
      'IND-1': 'Number of hectares under improved varieties',
      'IND-2': 'Number of farmers reached',
    });
  });

  it('omits ids the query returns no row for, rather than mapping them to null', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        toc_results_indicator_id: 'IND-1',
        indicator_description: 'Number of hectares under improved varieties',
      },
    ]);
    const resolver = build(query);

    const result = await resolver.resolveIndicatorDescriptions([
      'IND-1',
      'IND-MISSING',
    ]);

    expect(result).toEqual({
      'IND-1': 'Number of hectares under improved varieties',
    });
    expect(Object.prototype.hasOwnProperty.call(result, 'IND-MISSING')).toBe(
      false,
    );
  });

  it('ignores blank/non-string entries in the requested id list', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const resolver = build(query);

    const result = await resolver.resolveIndicatorDescriptions([
      '',
      null as unknown as string,
      undefined as unknown as string,
    ]);

    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
