import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { GeographicLocationService } from './geographic-location.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionsService } from '../../results/result-regions/result-regions.service';
import { ResultCountriesService } from '../../results/result-countries/result-countries.service';
import { ResultRepository } from '../../results/result.repository';
import { ResultsService } from '../../results/results.service';
import { ElasticService } from '../../../elastic/elastic.service';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { CreateGeographicLocationDto } from './dto/create-geographic-location.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

/**
 * 🛑 `findGeographicLocation` answers `geo_scope_id: 0` for a result with no scope — this service's
 * own "none" placeholder (`let scope = 0`). Clients hand that number straight back on the next save,
 * and 0 is the one value `result.geographic_scope_id` cannot take: `clarisa_geographic_scope` holds
 * no valid scope id is 0 (`GeoScopeEnum`: 1, 2, 3, 5, 50), so the write died on
 * `FK_c02a8848d0317d55d1bd882833e` with a 500 the
 * reporter never saw — Save draft simply appeared to do nothing.
 *
 * Measured in prdb (test) on 15-Sep-2026: `geographic_scope_id` is NULLABLE with default NULL,
 * 2,223 rows are NULL and **not one row is 0**. NULL is how "none" is stored, so NULL is what the
 * placeholder must be normalised back to.
 */
describe('GeographicLocationService — the 0 placeholder never reaches the column', () => {
  let service: GeographicLocationService;
  let resultRepository: { update: jest.Mock };

  const user = { id: 2 } as TokenDto;

  const bodyWith = (geoScopeId: number): CreateGeographicLocationDto =>
    ({
      result_id: 11633,
      geo_scope_id: geoScopeId,
      regions: [],
      countries: [],
      has_regions: null,
      has_countries: null,
      extra_geo_scope_id: null,
      extra_regions: [],
      extra_countries: [],
      has_extra_regions: null,
      has_extra_countries: null,
      has_extra_geo_scope: null,
    }) as unknown as CreateGeographicLocationDto;

  const savedScope = () =>
    resultRepository.update.mock.calls[
      resultRepository.update.mock.calls.length - 1
    ][1].geographic_scope_id;

  beforeEach(async () => {
    resultRepository = { update: jest.fn().mockResolvedValue({ affected: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeographicLocationService,
        {
          provide: HandlersError,
          useValue: { returnErrorRes: jest.fn((e) => e) },
        },
        {
          provide: ResultRegionsService,
          useValue: { createV2: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: ResultCountriesService,
          useValue: { createV2: jest.fn().mockResolvedValue(null) },
        },
        { provide: ResultRepository, useValue: resultRepository },
        {
          provide: ResultsService,
          useValue: {
            findAllSimplified: jest.fn().mockResolvedValue({
              status: HttpStatus.NOT_FOUND,
              response: [],
            }),
          },
        },
        {
          provide: ElasticService,
          useValue: { sendBulkOperationToElastic: jest.fn() },
        },
        { provide: ResultRegionRepository, useValue: {} },
        { provide: ResultCountryRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<GeographicLocationService>(GeographicLocationService);
  });

  it('writes NULL, not 0, when no geographic scope has been chosen', async () => {
    await service.saveGeoScopeV2(bodyWith(0), user);

    expect(resultRepository.update).toHaveBeenCalled();
    expect(savedScope()).toBeNull();
  });

  it.each([
    ['Global', 1],
    ['Regional', 2],
    ['Multi-national', 3],
    ['National', 4],
    ['Sub-national', 5],
    ['yet to be determined', 50],
  ])('stores %s (%i) untouched', async (_label, id) => {
    await service.saveGeoScopeV2(bodyWith(id as number), user);

    expect(savedScope()).toBe(id);
  });
});
