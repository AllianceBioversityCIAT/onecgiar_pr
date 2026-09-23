import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, HttpStatus } from '@nestjs/common';
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
import { SourceEnum } from '../../results/entities/result.entity';
import { BilateralAccessService } from '../../results/bilateral-access/bilateral-access.service';

/**
 * 🛑 `findGeographicLocation` answers `geo_scope_id: 0` for a result with no scope — this service's
 * own "none" placeholder (`let scope = 0`). Clients hand that number straight back on the next save,
 * and 0 is the one value `result.geographic_scope_id` cannot take: `clarisa_geographic_scope` holds
 * the table holds 1, 2, 3, 4, 5 and 50 and no 0 — read off prdb (test) on 15-Sep-2026. 🛑 Not the
 * client's `GeoScopeEnum` (1, 2, 3, 5, 50): the front folds the legacy 4 ("National") into COUNTRY,
 * so it lists fewer ids than the column accepts. The write died on
 * `FK_c02a8848d0317d55d1bd882833e` with a 500 the
 * reporter never saw — Save draft simply appeared to do nothing.
 *
 * Measured in prdb (test) on 15-Sep-2026: `geographic_scope_id` is NULLABLE with default NULL,
 * 2,223 rows are NULL and **not one row is 0**. NULL is how "none" is stored, so NULL is what the
 * placeholder must be normalised back to.
 */
describe('GeographicLocationService — the 0 placeholder never reaches the column', () => {
  let service: GeographicLocationService;
  let resultRepository: { update: jest.Mock; findOne: jest.Mock };
  let bilateralAccessService: { assertCenterWrite: jest.Mock };

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
    resultRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(null),
    };
    bilateralAccessService = {
      assertCenterWrite: jest.fn().mockResolvedValue(undefined),
    };

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
        { provide: BilateralAccessService, useValue: bilateralAccessService },
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

// BIL-RTE-T-2 — design.md §5.1: the Center-write guard for the v2 geography entry point, kept
// out of `saveGeoScopeV2` (called internally by the admin-only data-standard review path) and
// consulted from the controller instead. Falsifier case (d): a non-bilateral result never
// consults `BilateralAccessService`.
describe('GeographicLocationService.assertCenterWriteForBilateral — BIL-RTE-T-2', () => {
  let service: GeographicLocationService;
  let resultRepository: { update: jest.Mock; findOne: jest.Mock };
  let bilateralAccessService: { assertCenterWrite: jest.Mock };

  const user = { id: 2 } as TokenDto;

  beforeEach(async () => {
    resultRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(null),
    };
    bilateralAccessService = {
      assertCenterWrite: jest.fn().mockResolvedValue(undefined),
    };

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
        { provide: ResultsService, useValue: {} },
        {
          provide: ElasticService,
          useValue: { sendBulkOperationToElastic: jest.fn() },
        },
        { provide: ResultRegionRepository, useValue: {} },
        { provide: ResultCountryRepository, useValue: {} },
        { provide: BilateralAccessService, useValue: bilateralAccessService },
      ],
    }).compile();

    service = module.get<GeographicLocationService>(GeographicLocationService);
  });

  it('case (d): a non-bilateral result never consults the helper', async () => {
    resultRepository.findOne.mockResolvedValueOnce({
      id: 800,
      source: SourceEnum.Result,
      status_id: 5,
    });

    await service.assertCenterWriteForBilateral(800, user);

    expect(bilateralAccessService.assertCenterWrite).not.toHaveBeenCalled();
  });

  it('a not-found result never consults the helper', async () => {
    resultRepository.findOne.mockResolvedValueOnce(null);

    await service.assertCenterWriteForBilateral(801, user);

    expect(bilateralAccessService.assertCenterWrite).not.toHaveBeenCalled();
  });

  it('a bilateral result consults the helper with the geography label', async () => {
    resultRepository.findOne.mockResolvedValueOnce({
      id: 802,
      source: SourceEnum.Bilateral,
      status_id: 5,
    });

    await service.assertCenterWriteForBilateral(802, user);

    expect(bilateralAccessService.assertCenterWrite).toHaveBeenCalledWith(
      expect.objectContaining({ id: 802, status_id: 5 }),
      'geography',
      user,
    );
  });

  it('propagates a denial from the helper', async () => {
    resultRepository.findOne.mockResolvedValueOnce({
      id: 803,
      source: SourceEnum.Bilateral,
      status_id: 5,
    });
    bilateralAccessService.assertCenterWrite.mockRejectedValueOnce(
      new ForbiddenException(
        'Result 803 is under Science Program review (rule: center).',
      ),
    );

    await expect(
      service.assertCenterWriteForBilateral(803, user),
    ).rejects.toThrow(ForbiddenException);
  });
});
