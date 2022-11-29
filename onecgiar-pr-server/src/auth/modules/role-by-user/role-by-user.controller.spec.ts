import { Test, TestingModule } from '@nestjs/testing';
import { RoleByUserController } from './role-by-user.controller';
import { RoleByUserService } from './role-by-user.service';

describe('RoleByUserController', () => {
  let controller: RoleByUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleByUserController],
      providers: [RoleByUserService],
    }).compile();

    controller = module.get<RoleByUserController>(RoleByUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
