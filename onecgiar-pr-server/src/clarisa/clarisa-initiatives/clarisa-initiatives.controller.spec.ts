import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';

describe('ClarisaInitiativesController', () => {
  let controller: ClarisaInitiativesController;
  let service: ClarisaInitiativesService;

  const serviceMock = {
    getAllInitiativesWithoutCurrentInitiative: jest.fn(),
    findAll: jest.fn(),
    getInitiativesEntitiesGrouped: jest.fn(),
    getByPortfolio: jest.fn(),
  } as unknown as jest.Mocked<ClarisaInitiativesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInitiativesController],
      providers: [
        {
          provide: ClarisaInitiativesService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<ClarisaInitiativesController>(
      ClarisaInitiativesController,
    );
    service = module.get<ClarisaInitiativesService>(ClarisaInitiativesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllInitiativesWithoutCurrentInitiative delegates to service', async () => {
    (
      service.getAllInitiativesWithoutCurrentInitiative as any
    ).mockResolvedValue({ status: 200, response: [] });
    const result = await controller.getAllInitiativesWithoutCurrentInitiative(
      1 as any,
    );
    expect(
      service.getAllInitiativesWithoutCurrentInitiative,
    ).toHaveBeenCalledWith(1);
    expect(result).toEqual({ status: 200, response: [] });
  });

  it('findAll delegates to service', async () => {
    (service.findAll as any).mockResolvedValue({ status: 200, response: [] });
    const result = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual({ status: 200, response: [] });
  });

  it('getInitiativesEntities delegates to service', async () => {
    (service.getInitiativesEntitiesGrouped as any).mockResolvedValue({
      status: 200,
      response: [],
    });
    const result = await controller.getInitiativesEntities();
    expect(service.getInitiativesEntitiesGrouped).toHaveBeenCalled();
    expect(result).toEqual({ status: 200, response: [] });
  });

  it('getByPortfolio delegates to service with param', async () => {
    (service.getByPortfolio as any).mockResolvedValue({
      status: 200,
      response: [],
    });
    const result = await controller.getByPortfolio('p25');
    expect(service.getByPortfolio).toHaveBeenCalledWith('p25');
    expect(result).toEqual({ status: 200, response: [] });
  });
});
