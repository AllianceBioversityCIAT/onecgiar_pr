import { Test, TestingModule } from '@nestjs/testing';
import { RestrictionsByRoleService } from './restrictions-by-role.service';

describe('RestrictionsByRoleService', () => {
  let service: RestrictionsByRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RestrictionsByRoleService],
    }).compile();

    service = module.get<RestrictionsByRoleService>(RestrictionsByRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
