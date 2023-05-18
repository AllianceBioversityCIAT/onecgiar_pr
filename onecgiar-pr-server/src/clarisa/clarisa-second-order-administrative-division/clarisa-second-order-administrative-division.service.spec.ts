import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSecondOrderAdministrativeDivisionService } from './clarisa-second-order-administrative-division.service';

describe('ClarisaSecondOrderAdministrativeDivisionService', () => {
  let service: ClarisaSecondOrderAdministrativeDivisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaSecondOrderAdministrativeDivisionService],
    }).compile();

    service = module.get<ClarisaSecondOrderAdministrativeDivisionService>(ClarisaSecondOrderAdministrativeDivisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
