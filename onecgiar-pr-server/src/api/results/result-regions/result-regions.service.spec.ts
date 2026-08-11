import { ResultRegionsService } from './result-regions.service';
import { EnumGeoScopeRole } from '../../results-framework-reporting/geo_scope_role/enum/geo_scope_role.enum';

describe('ResultRegionsService', () => {
  const resultRegionRepository = {
    updateRegionsV2: jest.fn(),
    getResultRegionByResultIdAndRegionId: jest.fn(),
    save: jest.fn(),
  };

  let service: ResultRegionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    resultRegionRepository.getResultRegionByResultIdAndRegionId.mockResolvedValue(undefined);
    service = new ResultRegionsService(
      {} as any,
      resultRegionRepository as any,
      { getResultById: jest.fn() } as any,
      {} as any,
      {} as any,
    );
  });

  it('keeps explicitly selected main regions for a Country scope', async () => {
    const result = { id: 77, has_regions: false } as any;

    await (service as any).handleRegions({
      regions: [{ id: 29, name: 'Caribbean' }],
      result,
      hasRegions: true,
      geoScopeId: 3,
      role: EnumGeoScopeRole.MAIN,
    });

    expect(resultRegionRepository.updateRegionsV2).toHaveBeenCalledWith(
      77,
      [29],
      EnumGeoScopeRole.MAIN,
    );
    expect(resultRegionRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        result_id: 77,
        region_id: 29,
        geo_scope_role_id: EnumGeoScopeRole.MAIN,
      }),
    ]);
    expect(result.has_regions).toBe(true);
  });
});
