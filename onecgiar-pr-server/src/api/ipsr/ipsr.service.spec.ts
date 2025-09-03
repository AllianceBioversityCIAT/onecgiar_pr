import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { IpsrService } from './ipsr.service';
import { IpsrRepository } from './ipsr.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { AdUserRepository } from '../ad_users';
import { InitiativeEntityMapRepository } from '../initiative_entity_map/initiative_entity_map.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';

describe('IpsrService', () => {
  let service: IpsrService;

  const mockIpsrRepository = {
    getResultsInnovation: jest.fn(),
    getResultInnovationDetail: jest.fn(),
    getResultInnovationById: jest.fn(),
    getAllInnovationPackages: jest.fn(),
    getIpsrList: jest.fn(),
  } as unknown as jest.Mocked<IpsrRepository>;

  const mockDiscontinuedRepo = {
    find: jest.fn(),
  } as unknown as jest.Mocked<ResultsInvestmentDiscontinuedOptionRepository>;

  const mockAdUserRepository = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<AdUserRepository>;

  const mockInitiativeEntityMapRepository = {
    find: jest.fn(),
  } as unknown as jest.Mocked<InitiativeEntityMapRepository>;

  const mockRoleByUserRepository = {
    find: jest.fn(),
  } as unknown as jest.Mocked<RoleByUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpsrService,
        HandlersError,
        ReturnResponse,
        { provide: IpsrRepository, useValue: mockIpsrRepository },
        {
          provide: ResultsInvestmentDiscontinuedOptionRepository,
          useValue: mockDiscontinuedRepo,
        },
        { provide: AdUserRepository, useValue: mockAdUserRepository },
        {
          provide: InitiativeEntityMapRepository,
          useValue: mockInitiativeEntityMapRepository,
        },
        { provide: RoleByUserRepository, useValue: mockRoleByUserRepository },
      ],
    }).compile();

    service = module.get(IpsrService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllInnovations', () => {
    it('returns innovations with OK', async () => {
      (
        mockIpsrRepository.getResultsInnovation as jest.Mock
      ).mockResolvedValueOnce([{ id: 1 }]);
      const res = await service.findAllInnovations([1, 2]);
      expect(mockIpsrRepository.getResultsInnovation).toHaveBeenCalledWith([
        1, 2,
      ]);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response[0].id).toBe(1);
    });

    it('handles errors via ReturnResponse', async () => {
      (
        mockIpsrRepository.getResultsInnovation as jest.Mock
      ).mockRejectedValueOnce(new Error('boom'));
      const res = await service.findAllInnovations([3]);
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.message).toBe('boom');
    });
  });

  describe('findInnovationDetail', () => {
    it('returns detail with OK', async () => {
      (
        mockIpsrRepository.getResultInnovationDetail as jest.Mock
      ).mockResolvedValueOnce({ id: 10 });
      const res = await service.findInnovationDetail(10);
      expect(mockIpsrRepository.getResultInnovationDetail).toHaveBeenCalledWith(
        10,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response.id).toBe(10);
    });

    it('returns error when not found', async () => {
      (
        mockIpsrRepository.getResultInnovationDetail as jest.Mock
      ).mockResolvedValueOnce(null);
      const res: any = await service.findInnovationDetail(11);
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.message).toContain('not found');
    });
  });

  describe('findOneInnovation', () => {
    it('returns innovation with ad user and discontinued options', async () => {
      (
        mockIpsrRepository.getResultInnovationById as jest.Mock
      ).mockResolvedValueOnce([{ id: 5, lead_contact_person_id: 99 }]);
      (mockDiscontinuedRepo.find as jest.Mock).mockResolvedValueOnce([
        { opt: 1 },
      ]);
      (mockAdUserRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 99,
        mail: 'a@b.c',
      });

      const res = await service.findOneInnovation(5);
      expect(mockIpsrRepository.getResultInnovationById).toHaveBeenCalledWith(
        5,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response.discontinued_options).toEqual([{ opt: 1 }]);
      expect(res.response.lead_contact_person_data).toEqual({
        id: 99,
        mail: 'a@b.c',
      });
    });

    it('returns innovation when no lead_contact_person_id', async () => {
      (
        mockIpsrRepository.getResultInnovationById as jest.Mock
      ).mockResolvedValueOnce([{ id: 6 }]);
      (mockDiscontinuedRepo.find as jest.Mock).mockResolvedValueOnce([]);
      const res = await service.findOneInnovation(6);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response.lead_contact_person_data).toBeNull();
      expect(res.response.discontinued_options).toEqual([]);
    });

    it('returns error when not found', async () => {
      (
        mockIpsrRepository.getResultInnovationById as jest.Mock
      ).mockResolvedValueOnce([]);
      const res: any = await service.findOneInnovation(7);
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.message).toContain('not found');
    });
  });

  describe('allInnovationPackages', () => {
    it('maps entity and user initiatives', async () => {
      (
        mockIpsrRepository.getAllInnovationPackages as jest.Mock
      ).mockResolvedValueOnce([{ initiative_id: 1, name: 'pkg' }]);
      (
        mockInitiativeEntityMapRepository.find as jest.Mock
      ).mockResolvedValueOnce([
        { id: 1, entityId: 2, initiativeId: 1, entity_obj: { name: 'Entity' } },
      ]);
      (mockRoleByUserRepository.find as jest.Mock).mockResolvedValueOnce([
        { obj_initiative: { portfolio_id: 3 } },
      ]);

      const res = await service.allInnovationPackages({ id: 1 } as any);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response[0].initiative_entity_map[0]).toEqual({
        id: 1,
        entityId: 2,
        initiativeId: 1,
        entityName: 'Entity',
      });
      expect(res.response[0].initiative_entity_user.length).toBe(1);
    });
  });

  describe('getIpsrList', () => {
    it('returns list with OK', async () => {
      (mockIpsrRepository.getIpsrList as jest.Mock).mockResolvedValueOnce([
        { id: 1 },
      ]);
      const res = await service.getIpsrList({} as any);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response[0].id).toBe(1);
    });

    it('returns error when empty', async () => {
      (mockIpsrRepository.getIpsrList as jest.Mock).mockResolvedValueOnce([]);
      const res: any = await service.getIpsrList({} as any);
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.message).toContain('not generated');
    });
  });
});
