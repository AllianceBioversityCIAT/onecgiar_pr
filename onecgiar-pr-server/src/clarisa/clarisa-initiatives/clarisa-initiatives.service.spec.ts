import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { HttpStatus } from '@nestjs/common';

describe('ClarisaInitiativesService', () => {
  let service: ClarisaInitiativesService;
  let repo: jest.Mocked<ClarisaInitiativesRepository>;

  const repoMock: Partial<jest.Mocked<ClarisaInitiativesRepository>> = {
    getAllInitiatives: jest.fn(),
    getAllInitiativesWithoutCurrentInitiative: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaInitiativesService,
        HandlersError,
        { provide: ClarisaInitiativesRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get<ClarisaInitiativesService>(ClarisaInitiativesService);
    repo = module.get(
      ClarisaInitiativesRepository,
    ) as jest.Mocked<ClarisaInitiativesRepository>;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns initiatives wrapped', async () => {
      (repo.getAllInitiatives as any).mockResolvedValue([{ id: 1 }]);
      const res = await service.findAll();
      expect(repo.getAllInitiatives).toHaveBeenCalled();
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual([{ id: 1 }]);
    });
  });

  describe('getAllInitiativesWithoutCurrentInitiative', () => {
    it('returns NOT_FOUND when empty', async () => {
      (repo.getAllInitiativesWithoutCurrentInitiative as any).mockResolvedValue(
        [],
      );
      const res = await service.getAllInitiativesWithoutCurrentInitiative(7);
      expect(
        repo.getAllInitiativesWithoutCurrentInitiative,
      ).toHaveBeenCalledWith(7, undefined);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('returns OK with data when found', async () => {
      const data = [{ id: 2 }];
      (repo.getAllInitiativesWithoutCurrentInitiative as any).mockResolvedValue(
        data,
      );
      const res = await service.getAllInitiativesWithoutCurrentInitiative(3);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual(data);
    });
    
    it('filters by portfolio when provided (p22)', async () => {
      (repo.getAllInitiativesWithoutCurrentInitiative as any).mockResolvedValue(
        [{ id: 1 }],
      );
      const res = await service.getAllInitiativesWithoutCurrentInitiative(10, 'p22');
      expect(repo.getAllInitiativesWithoutCurrentInitiative).toHaveBeenCalledWith(
        10,
        2,
      );
      expect(res.status).toBe(HttpStatus.OK);
    });

    it('filters by portfolio when provided (p25)', async () => {
      (repo.getAllInitiativesWithoutCurrentInitiative as any).mockResolvedValue(
        [{ id: 1 }],
      );
      const res = await service.getAllInitiativesWithoutCurrentInitiative(10, 'p25');
      expect(repo.getAllInitiativesWithoutCurrentInitiative).toHaveBeenCalledWith(
        10,
        3,
      );
      expect(res.status).toBe(HttpStatus.OK);
    });
  });

  describe('getByPortfolio', () => {
    it('p22 filters only by portfolio_id', async () => {
      (repo.find as any).mockResolvedValue([{ id: 1 }]);
      const res = await service.getByPortfolio('p22');
      expect(repo.find).toHaveBeenCalled();
      const args = (repo.find as jest.Mock).mock.calls[0][0];
      expect(args.where).toEqual({ portfolio_id: 2 });
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual([{ id: 1 }]);
    });

    it('p25 adds cgiar_entity_type_id IN(22,23,24)', async () => {
      (repo.find as any).mockResolvedValue([{ id: 2 }]);
      const res = await service.getByPortfolio('p25');
      expect(repo.find).toHaveBeenCalled();
      const args = (repo.find as jest.Mock).mock.calls[0][0];
      expect(args.where.portfolio_id).toBe(3);
      // Ensure condition was added
      expect('cgiar_entity_type_id' in args.where).toBe(true);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual([{ id: 2 }]);
    });

    it('invalid portfolio returns BAD_REQUEST via handler', async () => {
      const res = await service.getByPortfolio('foo');
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
});
