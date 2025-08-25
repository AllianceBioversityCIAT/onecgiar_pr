import { Test, TestingModule } from '@nestjs/testing';
import { InitiativeEntityMapService } from './initiative_entity_map.service';
import { InitiativeEntityMapRepository } from './initiative_entity_map.repository';

describe('InitiativeEntityMapService', () => {
  let service: InitiativeEntityMapService;
  let repo: InitiativeEntityMapRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitiativeEntityMapService,
        {
          provide: InitiativeEntityMapRepository,
          useValue: {
            delete: jest.fn().mockResolvedValue(undefined),
            save: jest.fn().mockResolvedValue([{ id: 1 }]),
            find: jest.fn().mockResolvedValue([
              { id: 1, initiativeId: 1, entityId: 30 },
              { id: 2, initiativeId: 1, entityId: 32 },
              { id: 3, initiativeId: 1, entityId: 45 },
              { id: 4, initiativeId: 3, entityId: 30 },
              { id: 5, initiativeId: 3, entityId: 32 },
              { id: 6, initiativeId: 3, entityId: 45 },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get<InitiativeEntityMapService>(
      InitiativeEntityMapService,
    );
    repo = module.get<InitiativeEntityMapRepository>(
      InitiativeEntityMapRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should link initiative to entities and set audit fields', async () => {
    const user = { id: 99 } as any;
    const result = await service.linkInitiativeToEntities(1, [2, 3], user);

    expect(repo.delete).toHaveBeenCalledWith({ initiativeId: 1 });
    expect(repo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        initiativeId: 1,
        entityId: 2,
        created_by: 99,
        last_updated_by: 99,
      }),
      expect.objectContaining({
        initiativeId: 1,
        entityId: 3,
        created_by: 99,
        last_updated_by: 99,
      }),
    ]);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should get all mappings grouped by initiative with response object', async () => {
    const result = await service.getAllMappings();
    expect(repo.find).toHaveBeenCalled();
    expect(result).toEqual({
      response: [
        { initiativeId: 1, entityIds: [30, 32, 45] },
        { initiativeId: 3, entityIds: [30, 32, 45] },
      ],
      message: 'The initiative-entity mappings were retrieved successfully',
      status: 200,
    });
  });
});
