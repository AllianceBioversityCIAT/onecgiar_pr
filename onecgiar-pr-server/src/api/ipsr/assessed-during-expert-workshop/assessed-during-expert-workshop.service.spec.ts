import { Test, TestingModule } from '@nestjs/testing';
import { AssessedDuringExpertWorkshopService } from './assessed-during-expert-workshop.service';

describe('AssessedDuringExpertWorkshopService', () => {
  let service: AssessedDuringExpertWorkshopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessedDuringExpertWorkshopService],
    }).compile();

    service = module.get<AssessedDuringExpertWorkshopService>(AssessedDuringExpertWorkshopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
