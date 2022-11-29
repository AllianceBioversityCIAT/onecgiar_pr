import { Test, TestingModule } from '@nestjs/testing';
import { InitiativeRolesController } from './initiative_roles.controller';
import { InitiativeRolesService } from './initiative_roles.service';

describe('InitiativeRolesController', () => {
  let controller: InitiativeRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InitiativeRolesController],
      providers: [InitiativeRolesService],
    }).compile();

    controller = module.get<InitiativeRolesController>(
      InitiativeRolesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
