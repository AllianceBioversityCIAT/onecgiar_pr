import { ResultCountriesService } from './result-countries.service';

/**
 * RSF-T-5 / RSF-DD-5 — the in-app geo save shares `bulkUpdateSubnational` with the bilateral
 * resubmission. A code list WITHOUT duplicates must reach it with the same call shape as before
 * (country result id, codes, user, role), so the "one row per code" fix changes nothing here.
 */
describe('ResultCountriesService.handleSubnationals — in-app caller (RSF-T-5)', () => {
  const build = () => {
    const service: any = Object.create(ResultCountriesService.prototype);
    service._resultCountrySubnationalRepository = {
      bulkUpdateSubnational: jest.fn().mockResolvedValue(undefined),
      upsertSubnational: jest.fn().mockResolvedValue(undefined),
    };
    return service;
  };

  it('passes the codes, user and role to bulkUpdateSubnational unchanged', async () => {
    const service = build();
    const countries = [
      {
        id: 170,
        sub_national: [{ code: 'CO-ANT' }, { code: 'CO-DC' }],
      },
    ];

    await service.handleSubnationals(
      [{ country_id: 170, result_country_id: 55 }],
      countries,
      5,
      7,
      2,
    );

    const repo = service._resultCountrySubnationalRepository;
    expect(repo.bulkUpdateSubnational).toHaveBeenCalledTimes(1);
    expect(repo.bulkUpdateSubnational).toHaveBeenCalledWith(
      55,
      ['CO-ANT', 'CO-DC'],
      7,
      2,
    );
    expect(repo.upsertSubnational).toHaveBeenCalledWith(
      55,
      ['CO-ANT', 'CO-DC'],
      7,
      2,
    );
  });

  it('defaults the role to 1 and sends an empty list for a non-subnational scope', async () => {
    const service = build();

    await service.handleSubnationals(
      [{ country_id: 170, result_country_id: 55 }],
      [{ id: 170, sub_national: [{ code: 'CO-ANT' }] }],
      3,
      7,
    );

    expect(
      service._resultCountrySubnationalRepository.bulkUpdateSubnational,
    ).toHaveBeenCalledWith(55, [], 7, 1);
  });
});
