import { Test, TestingModule } from '@nestjs/testing';
import { InitiativeEntityMapController } from './initiative_entity_map.controller';
import { InitiativeEntityMapService } from './initiative_entity_map.service';

describe('InitiativeEntityMapController', () => {
  let controller: InitiativeEntityMapController;
  let service: InitiativeEntityMapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InitiativeEntityMapController],
      providers: [
        {
          provide: InitiativeEntityMapService,
          useValue: {
            linkInitiativeToEntities: jest.fn().mockResolvedValue([{ id: 1 }]),
            getAllMappings: jest.fn().mockResolvedValue([
              { initiativeId: 1, entityIds: [30, 32, 45] },
              { initiativeId: 3, entityIds: [30, 32, 45] },
            ]),
          },
        },
      ],
    }).compile();

    controller = module.get<InitiativeEntityMapController>(
      InitiativeEntityMapController,
    );
    service = module.get<InitiativeEntityMapService>(
      InitiativeEntityMapService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should link initiative to entities', async () => {
    const body = { initiativeId: 1, entityIds: [2, 3] };
    const user = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };
    const result = await controller.linkInitiativeToEntities(body, user);
    expect(service.linkInitiativeToEntities).toHaveBeenCalledWith(
      1,
      [2, 3],
      user,
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should get all mappings grouped by initiative', async () => {
    const result = await controller.getAllMappings();
    expect(service.getAllMappings).toHaveBeenCalled();
    expect(result).toEqual([
      { initiativeId: 1, entityIds: [30, 32, 45] },
      { initiativeId: 3, entityIds: [30, 32, 45] },
    ]);
  });
});
