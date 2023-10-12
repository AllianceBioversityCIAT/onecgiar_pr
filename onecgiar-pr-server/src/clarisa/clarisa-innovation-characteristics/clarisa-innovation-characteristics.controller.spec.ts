import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationCharacteristicsController } from './clarisa-innovation-characteristics.controller';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';

describe('ClarisaInnovationCharacteristicsController', () => {
  let controller: ClarisaInnovationCharacteristicsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationCharacteristicsController],
      providers: [ClarisaInnovationCharacteristicsService],
    }).compile();

    controller = module.get<ClarisaInnovationCharacteristicsController>(
      ClarisaInnovationCharacteristicsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
