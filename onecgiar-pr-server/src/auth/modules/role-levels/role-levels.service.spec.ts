import { Test, TestingModule } from '@nestjs/testing';
import { RoleLevelsService } from './role-levels.service';

describe('RoleLevelsService', () => {
  let service: RoleLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleLevelsService],
    }).compile();

    service = module.get<RoleLevelsService>(RoleLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
