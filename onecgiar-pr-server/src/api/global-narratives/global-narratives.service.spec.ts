import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { GlobalNarrativesService } from './global-narratives.service';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { GlobalNarrativeRepository } from './repositories/global-narratives.repository';

describe('GlobalNarrativesService', () => {
  let service: GlobalNarrativesService;

  const mockRepo = {
    findOneByOrFail: jest.fn(),
  } as unknown as jest.Mocked<GlobalNarrativeRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalNarrativesService,
        ReturnResponse,
        { provide: GlobalNarrativeRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(GlobalNarrativesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneById', () => {
    it('returns formatted response with selected fields', async () => {
      (mockRepo.findOneByOrFail as jest.Mock).mockResolvedValueOnce({
        id: 5,
        name: 'Narrative',
        value: 'Text',
        extra: 'x',
      });

      const res = await service.findOneById(5);
      expect(mockRepo.findOneByOrFail).toHaveBeenCalledWith({ id: 5 });
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual({ id: 5, name: 'Narrative', value: 'Text' });
      expect(res.message).toBe('Parameter found with id: 5');
    });

    it('rejects when repository rejects', async () => {
      (mockRepo.findOneByOrFail as jest.Mock).mockRejectedValueOnce(
        new Error('not found'),
      );
      await expect(service.findOneById(99)).rejects.toThrow('not found');
    });
  });

  describe('findOneByName', () => {
    it('returns formatted response with selected fields', async () => {
      (mockRepo.findOneByOrFail as jest.Mock).mockResolvedValueOnce({
        id: 7,
        name: 'Title',
        value: 'V',
      });

      const res = await service.findOneByName('Title');
      expect(mockRepo.findOneByOrFail).toHaveBeenCalledWith({ name: 'Title' });
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual({ id: 7, name: 'Title', value: 'V' });
      expect(res.message).toBe('Parameter found with name: Title');
    });

    it('rejects when repository rejects', async () => {
      (mockRepo.findOneByOrFail as jest.Mock).mockRejectedValueOnce(
        new Error('boom'),
      );
      await expect(service.findOneByName('X')).rejects.toThrow('boom');
    });
  });
});
