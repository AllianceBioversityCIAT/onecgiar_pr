import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultsByProjectsService } from './results_by_projects.service';
import { ResultsByProjectsRepository } from './results_by_projects.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

describe('ResultsByProjectsService', () => {
  let service: ResultsByProjectsService;
  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRes: jest.fn(({ error }) => error),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsByProjectsService,
        { provide: ResultsByProjectsRepository, useValue: mockRepository },
        { provide: HandlersError, useValue: mockHandlersError },
      ],
    }).compile();

    service = module.get<ResultsByProjectsService>(ResultsByProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should short-circuit when project id is invalid', async () => {
    const response = await service.linkBilateralProjectToResult(
      1,
      undefined,
      5,
    );

    expect(mockRepository.findOne).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(response).toEqual({
      response: null,
      message: 'No bilateral project was provided.',
      status: HttpStatus.OK,
    });
  });

  it('should create a new link when none exists', async () => {
    const createdRecord = { id: 1 } as any;
    mockRepository.findOne.mockResolvedValueOnce(null);
    mockRepository.create.mockReturnValueOnce(createdRecord);
    mockRepository.save.mockResolvedValueOnce(createdRecord);

    const response = await service.linkBilateralProjectToResult(10, 25, 7);

    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { result_id: 10, project_id: 25 },
    });
    expect(mockRepository.create).toHaveBeenCalledWith({
      result_id: 10,
      project_id: 25,
      is_active: true,
      created_by: 7,
      last_updated_by: 7,
    });
    expect(mockRepository.save).toHaveBeenCalledWith(createdRecord);
    expect(response).toEqual({
      response: createdRecord,
      message: 'Link created successfully',
      status: HttpStatus.CREATED,
    });
  });

  it('should reactivate an existing inactive link', async () => {
    const existingRecord = {
      id: 5,
      is_active: false,
      last_updated_by: 9,
    } as any;
    mockRepository.findOne.mockResolvedValueOnce(existingRecord);
    mockRepository.save.mockResolvedValueOnce(existingRecord);

    const response = await service.linkBilateralProjectToResult(4, 12, 3);

    expect(existingRecord.is_active).toBe(true);
    expect(existingRecord.last_updated_by).toBe(3);
    expect(mockRepository.save).toHaveBeenCalledWith(existingRecord);
    expect(response).toEqual({
      response: existingRecord,
      message: 'Link reactivated successfully',
      status: HttpStatus.OK,
    });
  });

  it('should return a bad request when link already exists and is active', async () => {
    const existingRecord = {
      id: 8,
      is_active: true,
      last_updated_by: 3,
    } as any;
    mockRepository.findOne.mockResolvedValueOnce(existingRecord);

    const response = await service.linkBilateralProjectToResult(6, 15, 3);

    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(response).toEqual({
      response: existingRecord,
      message: 'The link between the result and project already exists',
      status: HttpStatus.BAD_REQUEST,
    });
  });
});
