import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResultRepository } from '../../../../results/result.repository';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { CreateResultFromFrameworkHandler } from './create-result-from-framework.handler';
import { CreateResultFromFrameworkCommand } from './create-result-from-framework.command';
import { CreateFrameworkResultEntityService } from './create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';

describe('CreateResultFromFrameworkHandler', () => {
  let handler: CreateResultFromFrameworkHandler;

  const mockCreateFrameworkResultEntityService = {
    execute: jest.fn(),
  };
  const mockLinkFrameworkResultTocService = {
    execute: jest.fn(),
  };
  const mockApplyFrameworkResultAssociationsService = {
    execute: jest.fn(),
  };
  const mockResultRepository = {
    getResultById: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;
  const payload = {
    result: {
      initiative_id: 15,
      result_type_id: 2,
      result_name: 'Test Result',
    },
    toc_result_id: 555,
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateResultFromFrameworkHandler,
        {
          provide: CreateFrameworkResultEntityService,
          useValue: mockCreateFrameworkResultEntityService,
        },
        {
          provide: LinkFrameworkResultTocService,
          useValue: mockLinkFrameworkResultTocService,
        },
        {
          provide: ApplyFrameworkResultAssociationsService,
          useValue: mockApplyFrameworkResultAssociationsService,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
      ],
    }).compile();

    handler = module.get(CreateResultFromFrameworkHandler);
  });

  it('should orchestrate creation, ToC linking, and associations', async () => {
    const resultSummary = { id: 101, result_level_id: 2 };
    const knowledgeProductResponse = { id: 101, title: 'KP' };

    mockCreateFrameworkResultEntityService.execute.mockResolvedValueOnce({
      createdResultId: 101,
      knowledgeProductResponse,
      initiativeId: 15,
    });
    mockResultRepository.getResultById.mockResolvedValueOnce(resultSummary);
    mockLinkFrameworkResultTocService.execute.mockResolvedValueOnce(900);
    mockApplyFrameworkResultAssociationsService.execute.mockResolvedValueOnce(
      undefined,
    );

    const result = await handler.execute(
      new CreateResultFromFrameworkCommand(payload, user),
    );

    expect(mockCreateFrameworkResultEntityService.execute).toHaveBeenCalledWith(
      payload,
      user,
    );
    expect(mockResultRepository.getResultById).toHaveBeenCalledWith(101);
    expect(mockLinkFrameworkResultTocService.execute).toHaveBeenCalledWith(
      payload,
      user,
      101,
      15,
    );
    expect(
      mockApplyFrameworkResultAssociationsService.execute,
    ).toHaveBeenCalledWith(payload, user, 101);
    expect(result).toEqual({
      response: {
        result: resultSummary,
        knowledgeProduct: knowledgeProductResponse,
        tocResultLinkId: 900,
      },
      message: 'Result created successfully through the reporting workflow.',
      status: HttpStatus.CREATED,
    });
  });

  it('should return null knowledgeProduct when entity service does not provide one', async () => {
    mockCreateFrameworkResultEntityService.execute.mockResolvedValueOnce({
      createdResultId: 202,
      initiativeId: 15,
    });
    mockResultRepository.getResultById.mockResolvedValueOnce({ id: 202 });
    mockLinkFrameworkResultTocService.execute.mockResolvedValueOnce(null);
    mockApplyFrameworkResultAssociationsService.execute.mockResolvedValueOnce(
      undefined,
    );

    const result = await handler.execute(
      new CreateResultFromFrameworkCommand(payload, user),
    );

    expect(result.response.knowledgeProduct).toBeNull();
    expect(result.response.tocResultLinkId).toBeNull();
  });

  it('should throw when created result cannot be retrieved', async () => {
    mockCreateFrameworkResultEntityService.execute.mockResolvedValueOnce({
      createdResultId: 303,
      initiativeId: 15,
    });
    mockResultRepository.getResultById.mockResolvedValueOnce(null);

    await expect(
      handler.execute(new CreateResultFromFrameworkCommand(payload, user)),
    ).rejects.toMatchObject({
      message: 'The result could not be retrieved after creation.',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect(mockLinkFrameworkResultTocService.execute).not.toHaveBeenCalled();
    expect(
      mockApplyFrameworkResultAssociationsService.execute,
    ).not.toHaveBeenCalled();
  });
});
