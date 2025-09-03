import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { GlobalParameterService } from './global-parameter.service';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';

describe('GlobalParameterService', () => {
  let service: GlobalParameterService;

  const mockRepo = {
    find: jest.fn(),
    getPlatformGlobalVariables: jest.fn(),
    findOneByName: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<GlobalParameterRepository>;

  const mockRoleRepo = {
    isUserAdmin: jest.fn(),
  } as unknown as jest.Mocked<RoleByUserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalParameterService,
        ReturnResponse,
        { provide: GlobalParameterRepository, useValue: mockRepo },
        { provide: RoleByUserRepository, useValue: mockRoleRepo },
      ],
    }).compile();

    service = module.get(GlobalParameterService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns list with OK', async () => {
      (mockRepo.find as jest.Mock).mockResolvedValueOnce([{ name: 'X', value: '1' }]);
      const res = await service.findAll();
      expect(mockRepo.find).toHaveBeenCalledWith({ select: service.baseColumnNames });
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual([{ name: 'X', value: '1' }]);
    });

    it('handles repository errors', async () => {
      (mockRepo.find as jest.Mock).mockRejectedValueOnce(new Error('boom'));
      const res = await service.findAll();
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('findByCategoryId', () => {
    it('returns filtered list with OK', async () => {
      (mockRepo.find as jest.Mock).mockResolvedValueOnce([{ name: 'Y', value: '0' }]);
      const res = await service.findByCategoryId(3);
      expect(mockRepo.find).toHaveBeenCalledWith({
        select: service.baseColumnNames,
        where: { global_parameter_category_id: 3 },
      });
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response[0].name).toBe('Y');
    });
  });

  describe('getPlatformGlobalVariables', () => {
    it('maps 1/0 to booleans and others to strings', async () => {
      (mockRepo.getPlatformGlobalVariables as jest.Mock).mockResolvedValueOnce([
        { name: 'featA', value: '1' },
        { name: 'featB', value: '0' },
        { name: 'url', value: 'https://x' },
      ]);
      const res = await service.getPlatformGlobalVariables();
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual({ featA: true, featB: false, url: 'https://x' });
    });

    it('handles errors', async () => {
      (mockRepo.getPlatformGlobalVariables as jest.Mock).mockRejectedValueOnce(
        new Error('fail'),
      );
      const res = await service.getPlatformGlobalVariables();
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('findOneByName', () => {
    it('returns the first element', async () => {
      (mockRepo.findOneByName as jest.Mock).mockResolvedValueOnce([{ name: 'Z', value: '1' }]);
      const res = await service.findOneByName('Z');
      expect(mockRepo.findOneByName).toHaveBeenCalledWith('Z');
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual({ name: 'Z', value: '1' });
    });

    it('handles errors', async () => {
      (mockRepo.findOneByName as jest.Mock).mockRejectedValueOnce(new Error('err'));
      const res = await service.findOneByName('any');
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateGlobalParameter', () => {
    const user = { id: 1 } as any;

    it('forbids non-admin users', async () => {
      (mockRoleRepo.isUserAdmin as jest.Mock).mockResolvedValueOnce(false);
      const res = await service.updateGlobalParameter({ name: 'A', value: 'x' } as any, user);
      expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('validates name presence', async () => {
      (mockRoleRepo.isUserAdmin as jest.Mock).mockResolvedValueOnce(true);
      const res = await service.updateGlobalParameter({ value: 'x' } as any, user);
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns not found if parameter missing', async () => {
      (mockRoleRepo.isUserAdmin as jest.Mock).mockResolvedValueOnce(true);
      (mockRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.updateGlobalParameter({ name: 'A', value: 'x' } as any, user);
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('saves updated parameter and returns OK', async () => {
      (mockRoleRepo.isUserAdmin as jest.Mock).mockResolvedValueOnce(true);
      (mockRepo.findOne as jest.Mock).mockResolvedValueOnce({ name: 'A', value: 'old' });
      (mockRepo.save as jest.Mock).mockResolvedValueOnce({ name: 'A', value: 'x' });
      const res = await service.updateGlobalParameter({ name: 'A', value: 'x' } as any, user);
      expect(mockRepo.save).toHaveBeenCalledWith({ name: 'A', value: 'x' });
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual({ name: 'A', value: 'x' });
    });

    it('handles save error', async () => {
      (mockRoleRepo.isUserAdmin as jest.Mock).mockResolvedValueOnce(true);
      (mockRepo.findOne as jest.Mock).mockResolvedValueOnce({ name: 'A', value: 'old' });
      (mockRepo.save as jest.Mock).mockRejectedValueOnce(new Error('db error'));
      const res = await service.updateGlobalParameter({ name: 'A', value: 'x' } as any, user);
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});

