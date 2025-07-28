import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPortfoliosController } from './clarisa-portfolios.controller';
import { ClarisaPortfoliosService } from './clarisa-portfolios.service';
import { ClarisaPortfolios } from './entities/clarisa-portfolios.entity';

describe('ClarisaPortfoliosController', () => {
  let controller: ClarisaPortfoliosController;
  let service: ClarisaPortfoliosService;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Portfolio 1',
          startDate: 2020,
          endDate: 2022,
          isActive: true,
        },
        {
          id: 2,
          name: 'Portfolio 2',
          startDate: 2023,
          endDate: 2025,
          isActive: false,
        },
      ] as ClarisaPortfolios[]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaPortfoliosController],
      providers: [
        {
          provide: ClarisaPortfoliosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ClarisaPortfoliosController>(
      ClarisaPortfoliosController,
    );
    service = module.get<ClarisaPortfoliosService>(ClarisaPortfoliosService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all portfolios', async () => {
    const result = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: 1,
        name: 'Portfolio 1',
        startDate: 2020,
        endDate: 2022,
        isActive: true,
      },
      {
        id: 2,
        name: 'Portfolio 2',
        startDate: 2023,
        endDate: 2025,
        isActive: false,
      },
    ]);
  });
});
