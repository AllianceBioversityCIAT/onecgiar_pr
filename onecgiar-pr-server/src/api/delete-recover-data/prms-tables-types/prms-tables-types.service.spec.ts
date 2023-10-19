import { Test, TestingModule } from '@nestjs/testing';
import { PrmsTablesTypesService } from './prms-tables-types.service';

describe('PrmsTablesTypesService', () => {
  let service: PrmsTablesTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrmsTablesTypesService],
    }).compile();

    service = module.get<PrmsTablesTypesService>(PrmsTablesTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
