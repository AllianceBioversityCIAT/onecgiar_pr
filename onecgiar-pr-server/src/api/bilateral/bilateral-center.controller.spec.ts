import { Test, TestingModule } from '@nestjs/testing';
import { BilateralCenterController } from './bilateral-center.controller';
import { BilateralCenterService } from './services/bilateral-center.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

describe('BilateralCenterController', () => {
  let controller: BilateralCenterController;
  let bilateralCenterService: jest.Mocked<BilateralCenterService>;

  const user: TokenDto = {
    id: 42,
    email: 'test@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralCenterController],
      providers: [
        {
          provide: BilateralCenterService,
          useValue: {
            getProjects: jest
              .fn()
              .mockResolvedValue({ response: { projects: [] } }),
            createResultHeader: jest.fn().mockResolvedValue({
              response: { id: 99, status_id: 1 },
            }),
            getResultInitiativeId: jest.fn().mockResolvedValue({
              response: { initiativeId: 1 },
            }),
            getTocState: jest.fn().mockResolvedValue({
              response: { planned_result: true },
            }),
            updatePlannedResult: jest.fn().mockResolvedValue({ response: {} }),
            saveTocMapping: jest.fn().mockResolvedValue({ response: {} }),
            saveContributors: jest.fn().mockResolvedValue({
              response: { resultId: 1 },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<BilateralCenterController>(
      BilateralCenterController,
    );
    bilateralCenterService = module.get(BilateralCenterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getProjects should delegate to service', async () => {
    const result = await controller.getProjects(10);
    expect(bilateralCenterService.getProjects).toHaveBeenCalledWith(10);
    expect(result).toEqual({ response: { projects: [] } });
  });

  it('createResultHeader should delegate to service', async () => {
    const dto = { result_level_id: 2, result_type_id: 6 };
    await controller.createResultHeader(user, dto);
    expect(bilateralCenterService.createResultHeader).toHaveBeenCalledWith(
      user,
      dto,
    );
  });

  it('getResultInitiativeId should delegate to service', async () => {
    await controller.getResultInitiativeId(5);
    expect(bilateralCenterService.getResultInitiativeId).toHaveBeenCalledWith(
      5,
    );
  });

  it('getTocState should delegate to service', async () => {
    await controller.getTocState(5);
    expect(bilateralCenterService.getTocState).toHaveBeenCalledWith(5);
  });

  it('updatePlannedResult should delegate to service', async () => {
    const body = { planned_result: true };
    await controller.updatePlannedResult(5, body, user);
    expect(bilateralCenterService.updatePlannedResult).toHaveBeenCalledWith(
      5,
      body,
      user,
    );
  });

  it('saveTocMapping should delegate to service', async () => {
    const dto = { result_toc_result: {} } as any;
    await controller.saveTocMapping(5, dto, user);
    expect(bilateralCenterService.saveTocMapping).toHaveBeenCalledWith(
      5,
      dto,
      user,
    );
  });

  it('saveContributors should delegate to service', async () => {
    const dto = { contributing_center: [] };
    await controller.saveContributors(5, dto, user);
    expect(bilateralCenterService.saveContributors).toHaveBeenCalledWith(
      5,
      dto,
      user,
    );
  });
});
