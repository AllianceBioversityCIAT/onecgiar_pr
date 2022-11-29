import { Test, TestingModule } from '@nestjs/testing';
import { InitiativeRolesService } from './initiative_roles.service';

describe('InitiativeRolesService', () => {
  let service: InitiativeRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InitiativeRolesService],
    }).compile();

    service = module.get<InitiativeRolesService>(InitiativeRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
