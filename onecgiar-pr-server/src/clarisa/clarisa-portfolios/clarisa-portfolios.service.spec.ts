import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPortfoliosService } from './clarisa-portfolios.service';

describe('ClarisaPortfoliosService', () => {
  let service: ClarisaPortfoliosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaPortfoliosService],
    }).compile();

    service = module.get<ClarisaPortfoliosService>(ClarisaPortfoliosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
