import { ResultCountriesService } from './result-countries.service';

/**
 * Night sweep 2026-09-23, W12-5 (P2-3637) — W1/W2 Geographic location: answering "No" to "other
 * geographic areas" must retire the stored extra countries. Measured on prtest (result 11464): the
 * "No" payload carried no extra scope and no extra countries, `createV2` skipped the extra block and
 * TZ/UG stayed active. Control negative: without the `extraScopeAnsweredNo` term the first test fails
 * (updateCountries never called for role 2).
 *
 * Built off the prototype with only the collaborators `createV2` touches.
 */
describe('ResultCountriesService.createV2 — extra scope answered "No" (W12-5)', () => {
  const user = { id: 1 } as any;
  const EXTRA = 2;

  function makeService() {
    const service: any = Object.create(ResultCountriesService.prototype);
    service._resultRepository = {
      getResultById: jest.fn().mockResolvedValue({ id: 11464 }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    service._resultCountryRepository = {
      updateCountries: jest.fn().mockResolvedValue(undefined),
    };
    service._handlersError = {
      returnErrorRes: jest.fn((e) => e),
    };
    // Main-scope handling is not what this spec is about.
    service.handleResultCountryArray = jest.fn().mockResolvedValue([]);
    service.handleSubnationals = jest.fn().mockResolvedValue(undefined);
    return service;
  }

  const base = {
    result_id: 11464,
    geo_scope_id: 3,
    has_countries: true,
    countries: [{ id: 404 }],
    extra_geo_scope_id: null,
    has_extra_countries: false,
    extra_countries: [],
  };

  const extraCalls = (service: any) =>
    service._resultCountryRepository.updateCountries.mock.calls.filter(
      ([, , role]: any[]) => role === EXTRA,
    );

  it('retires the extra countries when the payload says has_extra_geo_scope: false', async () => {
    const service = makeService();

    await service.createV2({ ...base, has_extra_geo_scope: false }, user);

    expect(extraCalls(service)).toEqual([[11464, [], EXTRA]]);
  });

  it('leaves the extra block alone when the caller does not say anything about it', async () => {
    const service = makeService();

    await service.createV2({ ...base }, user);

    expect(extraCalls(service)).toEqual([]);
  });

  it('still writes the extra countries when the answer is Yes', async () => {
    const service = makeService();

    await service.createV2(
      {
        ...base,
        has_extra_geo_scope: true,
        extra_geo_scope_id: 3,
        has_extra_countries: true,
        extra_countries: [{ id: 834 }, { id: 800 }],
      },
      user,
    );

    expect(extraCalls(service)[0]).toEqual([11464, [834, 800], EXTRA]);
  });
});
