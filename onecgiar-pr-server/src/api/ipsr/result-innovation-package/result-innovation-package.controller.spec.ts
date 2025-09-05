import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageController } from './result-innovation-package.controller';
import { ResultInnovationPackageService } from './result-innovation-package.service';

describe('ResultInnovationPackageController', () => {
  let controller: ResultInnovationPackageController;

  const mockService = {
    createHeader: jest.fn().mockResolvedValue({ status: 200 }),
    generalInformation: jest.fn().mockResolvedValue({ status: 200 }),
    findActiveBackstopping: jest.fn().mockResolvedValue({ status: 200 }),
    findConsensusInitiativeWorkPackage: jest
      .fn()
      .mockResolvedValue({ status: 200 }),
    findRegionalIntegrated: jest.fn().mockResolvedValue({ status: 200 }),
    findRegionalLeadership: jest.fn().mockResolvedValue({ status: 200 }),
    findRelevantCountry: jest.fn().mockResolvedValue({ status: 200 }),
    delete: jest.fn().mockResolvedValue({ status: 202 }),
    findUnitTime: jest.fn().mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<ResultInnovationPackageService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationPackageController],
      providers: [
        { provide: ResultInnovationPackageService, useValue: mockService },
      ],
    }).compile();

    controller = module.get(ResultInnovationPackageController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createHeader delegates with dto and user', async () => {
    const dto = { result_id: 2 } as any;
    await controller.createHeader(dto, user);
    expect(mockService.createHeader).toHaveBeenCalledWith(dto, user);
  });

  it('generalInformation delegates with parsed id, dto, user', async () => {
    const dto = { title: 'x' } as any;
    await controller.generalInformation(5 as any, dto, user);
    expect(mockService.generalInformation).toHaveBeenCalledWith(5, dto, user);
  });

  it('findActiveBackstopping delegates', async () => {
    await controller.findActiveBackstopping();
    expect(mockService.findActiveBackstopping).toHaveBeenCalled();
  });

  it('findConsensusInitiativeWorkPackage delegates', async () => {
    await controller.findConsensusInitiativeWorkPackage();
    expect(mockService.findConsensusInitiativeWorkPackage).toHaveBeenCalled();
  });

  it('findRegionalIntegrated delegates', async () => {
    await controller.findRegionalIntegrated();
    expect(mockService.findRegionalIntegrated).toHaveBeenCalled();
  });

  it('findRegionalLeadership delegates', async () => {
    await controller.findRegionalLeadership();
    expect(mockService.findRegionalLeadership).toHaveBeenCalled();
  });

  it('findRelevantCountry delegates', async () => {
    await controller.findRelevantCountry();
    expect(mockService.findRelevantCountry).toHaveBeenCalled();
  });

  it('delete delegates with parsed id and user', async () => {
    await controller.delete(9 as any, user);
    expect(mockService.delete).toHaveBeenCalledWith(9, user);
  });

  it('findUnitTime delegates', async () => {
    await controller.findUnitTime();
    expect(mockService.findUnitTime).toHaveBeenCalled();
  });
});
