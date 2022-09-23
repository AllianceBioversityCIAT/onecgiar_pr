import { Test, TestingModule } from '@nestjs/testing';
import { PermissionByRoleService } from './permission-by-role.service';

describe('PermissionByRoleService', () => {
  let service: PermissionByRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionByRoleService],
    }).compile();

    service = module.get<PermissionByRoleService>(PermissionByRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
