import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSecondOrderAdministrativeDivisionController } from './clarisa-second-order-administrative-division.controller';
import { ClarisaSecondOrderAdministrativeDivisionService } from './clarisa-second-order-administrative-division.service';

describe('ClarisaSecondOrderAdministrativeDivisionController', () => {
  let controller: ClarisaSecondOrderAdministrativeDivisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSecondOrderAdministrativeDivisionController],
      providers: [ClarisaSecondOrderAdministrativeDivisionService],
    }).compile();

    controller = module.get<ClarisaSecondOrderAdministrativeDivisionController>(
      ClarisaSecondOrderAdministrativeDivisionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
