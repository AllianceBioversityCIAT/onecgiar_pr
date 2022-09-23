import { Test, TestingModule } from '@nestjs/testing';
import { PermissionByRoleController } from './permission-by-role.controller';
import { PermissionByRoleService } from './permission-by-role.service';

describe('PermissionByRoleController', () => {
  let controller: PermissionByRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionByRoleController],
      providers: [PermissionByRoleService],
    }).compile();

    controller = module.get<PermissionByRoleController>(PermissionByRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
