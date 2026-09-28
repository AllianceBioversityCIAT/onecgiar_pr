import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GeographicLocationController } from './geographic-location.controller';
import { GeographicLocationService } from './geographic-location.service';

// BIL-RTE-T-2 (Reviewer FAIL #2, attempt 1) — design.md §5.1: the Center-write guard must run
// BEFORE `saveGeoScopeV2`, and a denial must stop the write. Mirrors
// `results.controller.spec.ts`'s `saveGeographic` tests (v1 entry) for the v2 entry.
describe('GeographicLocationController', () => {
  let controller: GeographicLocationController;
  const mockService = {
    saveGeoScopeV2: jest.fn().mockResolvedValue({ status: 200 }),
    getGeoScopeV2: jest.fn().mockResolvedValue({ status: 200, response: {} }),
    assertCenterWriteForBilateral: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<GeographicLocationService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeographicLocationController],
      providers: [
        { provide: GeographicLocationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<GeographicLocationController>(
      GeographicLocationController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('saveGeographic sets result_id, consults the Center-write guard first, then delegates', async () => {
    const dto = { countries: [] } as any;

    await controller.saveGeographic(dto, 11, user);

    expect(mockService.assertCenterWriteForBilateral).toHaveBeenCalledWith(
      11,
      user,
    );
    expect(mockService.saveGeoScopeV2).toHaveBeenCalledWith(
      { ...dto, result_id: 11 },
      user,
    );
  });

  // Falsifier (b): a denial must stop the write and surface as the thrown exception.
  it('saveGeographic never calls saveGeoScopeV2 when the Center-write guard denies', async () => {
    mockService.assertCenterWriteForBilateral.mockRejectedValueOnce(
      new ForbiddenException('Result 11 is under Science Program review.'),
    );
    const dto = { countries: [] } as any;

    await expect(controller.saveGeographic(dto, 11, user)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockService.saveGeoScopeV2).not.toHaveBeenCalled();
  });

  it('getGeographic delegates', async () => {
    await controller.getGeographic(12);
    expect(mockService.getGeoScopeV2).toHaveBeenCalledWith(12);
  });
});
