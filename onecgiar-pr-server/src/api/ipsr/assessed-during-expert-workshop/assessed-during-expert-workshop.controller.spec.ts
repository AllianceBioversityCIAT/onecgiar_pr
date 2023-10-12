import { Test, TestingModule } from '@nestjs/testing';
import { AssessedDuringExpertWorkshopController } from './assessed-during-expert-workshop.controller';
import { AssessedDuringExpertWorkshopService } from './assessed-during-expert-workshop.service';

describe('AssessedDuringExpertWorkshopController', () => {
  let controller: AssessedDuringExpertWorkshopController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessedDuringExpertWorkshopController],
      providers: [AssessedDuringExpertWorkshopService],
    }).compile();

    controller = module.get<AssessedDuringExpertWorkshopController>(
      AssessedDuringExpertWorkshopController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
