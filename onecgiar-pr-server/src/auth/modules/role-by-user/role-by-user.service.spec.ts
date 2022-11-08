import { Test, TestingModule } from '@nestjs/testing';
import { RoleByUserService } from './role-by-user.service';

describe('RoleByUserService', () => {
  let service: RoleByUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleByUserService],
    }).compile();

    service = module.get<RoleByUserService>(RoleByUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
