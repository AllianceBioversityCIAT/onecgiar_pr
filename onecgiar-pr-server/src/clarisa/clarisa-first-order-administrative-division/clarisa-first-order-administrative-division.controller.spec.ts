import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaFirstOrderAdministrativeDivisionController } from './clarisa-first-order-administrative-division.controller';
import { ClarisaFirstOrderAdministrativeDivisionService } from './clarisa-first-order-administrative-division.service';

describe('ClarisaFirstOrderAdministrativeDivisionController', () => {
  let controller: ClarisaFirstOrderAdministrativeDivisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaFirstOrderAdministrativeDivisionController],
      providers: [ClarisaFirstOrderAdministrativeDivisionService],
    }).compile();

    controller = module.get<ClarisaFirstOrderAdministrativeDivisionController>(
      ClarisaFirstOrderAdministrativeDivisionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
