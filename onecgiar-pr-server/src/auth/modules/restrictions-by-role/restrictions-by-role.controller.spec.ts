import { Test, TestingModule } from '@nestjs/testing';
import { RestrictionsByRoleController } from './restrictions-by-role.controller';
import { RestrictionsByRoleService } from './restrictions-by-role.service';

describe('RestrictionsByRoleController', () => {
  let controller: RestrictionsByRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestrictionsByRoleController],
      providers: [RestrictionsByRoleService],
    }).compile();

    controller = module.get<RestrictionsByRoleController>(
      RestrictionsByRoleController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
