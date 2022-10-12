import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionRolesController } from './institution_roles.controller';
import { InstitutionRolesService } from './institution_roles.service';

describe('InstitutionRolesController', () => {
  let controller: InstitutionRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionRolesController],
      providers: [InstitutionRolesService],
    }).compile();

    controller = module.get<InstitutionRolesController>(
      InstitutionRolesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
