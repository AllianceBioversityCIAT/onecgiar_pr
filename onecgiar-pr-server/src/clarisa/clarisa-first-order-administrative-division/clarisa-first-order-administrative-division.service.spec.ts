import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaFirstOrderAdministrativeDivisionService } from './clarisa-first-order-administrative-division.service';

describe('ClarisaFirstOrderAdministrativeDivisionService', () => {
  let service: ClarisaFirstOrderAdministrativeDivisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaFirstOrderAdministrativeDivisionService],
    }).compile();

    service = module.get<ClarisaFirstOrderAdministrativeDivisionService>(
      ClarisaFirstOrderAdministrativeDivisionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
