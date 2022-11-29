import { Test, TestingModule } from '@nestjs/testing';
import { GenderTagLevelsService } from './gender_tag_levels.service';

describe('GenderTagLevelsService', () => {
  let service: GenderTagLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GenderTagLevelsService],
    }).compile();

    service = module.get<GenderTagLevelsService>(GenderTagLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
