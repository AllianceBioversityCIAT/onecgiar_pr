
import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPortfoliosService } from './clarisa-portfolios.service';
import { ClarisaPortfoliosRepository } from './clarisa-portfolios.repository';
import { ClarisaPortfolios } from './entities/clarisa-portfolios.entity';
import { In } from 'typeorm';

describe('ClarisaPortfoliosService', () => {
  let service: ClarisaPortfoliosService;
  let repo: ClarisaPortfoliosRepository;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 2, name: 'Portfolio 2', startDate: 2022, endDate: 2024, isActive: true },
        { id: 3, name: 'Portfolio 3', startDate: 2025, endDate: 2027, isActive: false },
      ] as ClarisaPortfolios[]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaPortfoliosService,
        {
          provide: ClarisaPortfoliosRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ClarisaPortfoliosService>(ClarisaPortfoliosService);
    repo = module.get<ClarisaPortfoliosRepository>(ClarisaPortfoliosRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return portfolios with ids 2 and 3', async () => {
    const result = await service.findAll();
    expect(repo.find).toHaveBeenCalledWith({
      where: { id: In([2, 3]) },
    });
    expect(result).toEqual([
      { id: 2, name: 'Portfolio 2', startDate: 2022, endDate: 2024, isActive: true },
      { id: 3, name: 'Portfolio 3', startDate: 2025, endDate: 2027, isActive: false },
    ]);
  });
});
