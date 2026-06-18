import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ResultTypeEnum } from '../../../../../shared/constants/result-type.enum';
import { ResultsService } from '../../../../results/results.service';
import { ResultsKnowledgeProductsService } from '../../../../results/results-knowledge-products/results-knowledge-products.service';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';

describe('CreateFrameworkResultEntityService', () => {
  let service: CreateFrameworkResultEntityService;

  const mockResultsService = {
    createOwnerResultV2: jest.fn(),
  };
  const mockResultsKnowledgeProductsService = {
    create: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;
  const baseResult = {
    initiative_id: 15,
    result_type_id: ResultTypeEnum.POLICY_CHANGE,
    result_name: 'Test Result',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFrameworkResultEntityService,
        { provide: ResultsService, useValue: mockResultsService },
        {
          provide: ResultsKnowledgeProductsService,
          useValue: mockResultsKnowledgeProductsService,
        },
      ],
    }).compile();

    service = module.get(CreateFrameworkResultEntityService);
  });

  it('should create a standard result and return its id', async () => {
    mockResultsService.createOwnerResultV2.mockResolvedValueOnce({
      status: HttpStatus.CREATED,
      response: { id: 101 },
    });

    const result = await service.execute({ result: baseResult } as any, user);

    expect(mockResultsService.createOwnerResultV2).toHaveBeenCalledWith(
      baseResult,
      user,
    );
    expect(result).toEqual({
      createdResultId: 101,
      knowledgeProductResponse: undefined,
      initiativeId: 15,
    });
  });

  it('should create a knowledge product result', async () => {
    const knowledgeProduct = {
      title: 'KP Title',
      result_data: {},
    };
    const kpResponse = { id: 202, title: 'KP Title' };

    mockResultsKnowledgeProductsService.create.mockResolvedValueOnce({
      status: HttpStatus.CREATED,
      response: kpResponse,
    });

    const result = await service.execute(
      {
        result: {
          ...baseResult,
          result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
        },
        knowledge_product: knowledgeProduct,
      } as any,
      user,
    );

    expect(mockResultsKnowledgeProductsService.create).toHaveBeenCalled();
    expect(mockResultsService.createOwnerResultV2).not.toHaveBeenCalled();
    expect(result.createdResultId).toBe(202);
    expect(result.knowledgeProductResponse).toEqual(kpResponse);
  });

  it('should use knowledge product title when result name is empty', async () => {
    const knowledgeProduct = {
      title: 'Derived Title',
    };

    mockResultsKnowledgeProductsService.create.mockResolvedValueOnce({
      status: HttpStatus.CREATED,
      response: { id: 303 },
    });

    await service.execute(
      {
        result: {
          ...baseResult,
          result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
          result_name: '   ',
        },
        knowledge_product: knowledgeProduct,
      } as any,
      user,
    );

    expect(knowledgeProduct).toEqual(
      expect.objectContaining({
        result_data: expect.objectContaining({
          result_name: 'Derived Title',
        }),
      }),
    );
  });

  it('should reject missing result header', async () => {
    await expect(service.execute({} as any, user)).rejects.toMatchObject({
      message: 'The result header information is required.',
    });
  });

  it('should reject invalid initiative id', async () => {
    await expect(
      service.execute(
        { result: { ...baseResult, initiative_id: 0 } } as any,
        user,
      ),
    ).rejects.toMatchObject({
      message:
        'A valid initiative identifier is required to create the result.',
    });
  });

  it('should reject knowledge product results without knowledge_product payload', async () => {
    await expect(
      service.execute(
        {
          result: {
            ...baseResult,
            result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
          },
        } as any,
        user,
      ),
    ).rejects.toMatchObject({
      message:
        'Knowledge product payload is required for knowledge product results.',
    });
  });

  it('should propagate creation failures from downstream services', async () => {
    const failure = {
      status: HttpStatus.BAD_REQUEST,
      message: 'Creation failed',
    };
    mockResultsService.createOwnerResultV2.mockResolvedValueOnce(failure);

    await expect(
      service.execute({ result: baseResult } as any, user),
    ).rejects.toEqual(failure);
  });
});
