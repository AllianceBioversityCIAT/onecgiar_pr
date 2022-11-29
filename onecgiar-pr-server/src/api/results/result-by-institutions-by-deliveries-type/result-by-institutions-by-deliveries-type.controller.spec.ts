import { Test, TestingModule } from '@nestjs/testing';
import { ResultByInstitutionsByDeliveriesTypeController } from './result-by-institutions-by-deliveries-type.controller';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';

describe('ResultByInstitutionsByDeliveriesTypeController', () => {
  let controller: ResultByInstitutionsByDeliveriesTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultByInstitutionsByDeliveriesTypeController],
      providers: [ResultByInstitutionsByDeliveriesTypeService],
    }).compile();

    controller = module.get<ResultByInstitutionsByDeliveriesTypeController>(ResultByInstitutionsByDeliveriesTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
