import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { AoWBilateralRepository } from '../../../../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultsTocResultRepository } from '../../../../results/results-toc-results/repositories/results-toc-results.repository';
import { ReportingTocContextService } from '../../../reporting-toc-context/reporting-toc-context.service';
import { LinkFrameworkResultTocService } from './link-framework-result-toc.service';
import { FrameworkResultTocIndicatorsService } from './framework-result-toc-indicators.service';

describe('LinkFrameworkResultTocService', () => {
  let service: LinkFrameworkResultTocService;

  const mockReportingTocContextService = {
    resolve: jest.fn(),
  };
  const mockTocResultsRepository = {
    findResultById: jest.fn(),
  };
  const mockResultsTocResultRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mockFrameworkResultTocIndicatorsService = {
    upsertTocIndicators: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReportingTocContextService.resolve.mockResolvedValue({
      phaseUuid: 'PHASE-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkFrameworkResultTocService,
        {
          provide: ReportingTocContextService,
          useValue: mockReportingTocContextService,
        },
        {
          provide: AoWBilateralRepository,
          useValue: mockTocResultsRepository,
        },
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        {
          provide: FrameworkResultTocIndicatorsService,
          useValue: mockFrameworkResultTocIndicatorsService,
        },
      ],
    }).compile();

    service = module.get(LinkFrameworkResultTocService);
  });

  it('should return null when toc_result_id is omitted', async () => {
    const result = await service.execute({} as any, user, 101, 15);

    expect(result).toBeNull();
    expect(mockTocResultsRepository.findResultById).not.toHaveBeenCalled();
  });

  it('should create a new ToC record and upsert indicators', async () => {
    mockTocResultsRepository.findResultById.mockResolvedValueOnce({
      id: 555,
      category: 'OUTPUT',
    });
    mockResultsTocResultRepository.findOne.mockResolvedValueOnce(null);
    mockResultsTocResultRepository.save.mockResolvedValueOnce({
      result_toc_result_id: 900,
    });

    const payload = {
      toc_result_id: 555,
      indicators: { indicator_id: 777 },
      number_target: '10',
      target_date: '2026',
      contributing_indicator: 2,
    };

    const result = await service.execute(payload as any, user, 101, 15);

    expect(mockTocResultsRepository.findResultById).toHaveBeenCalledWith(
      555,
      'PHASE-1',
    );
    expect(mockResultsTocResultRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        toc_result_id: 555,
        toc_level_id: 1,
        result_id: 101,
        initiative_ids: 15,
        created_by: user.id,
      }),
    );
    expect(
      mockFrameworkResultTocIndicatorsService.upsertTocIndicators,
    ).toHaveBeenCalledWith(
      900,
      555,
      payload.indicators,
      2,
      user.id,
      '10',
      '2026',
    );
    expect(result).toBe(900);
  });

  it('should update an existing ToC record', async () => {
    mockTocResultsRepository.findResultById.mockResolvedValueOnce({
      id: 888,
      category: 'OUTCOME',
    });
    mockResultsTocResultRepository.findOne.mockResolvedValueOnce({
      result_toc_result_id: 333,
    });

    const result = await service.execute(
      { toc_result_id: 888, toc_progressive_narrative: 'Narrative' } as any,
      user,
      202,
      15,
    );

    expect(mockResultsTocResultRepository.update).toHaveBeenCalledWith(
      333,
      expect.objectContaining({
        toc_result_id: 888,
        toc_level_id: 2,
        toc_progressive_narrative: 'Narrative',
        last_updated_by: user.id,
      }),
    );
    expect(mockResultsTocResultRepository.save).not.toHaveBeenCalled();
    expect(result).toBe(333);
  });

  it('should reject invalid toc_result_id values', async () => {
    await expect(
      service.execute({ toc_result_id: 'invalid' } as any, user, 101, 15),
    ).rejects.toMatchObject({
      message: 'The provided ToC result identifier is invalid.',
    });
  });

  it('should reject missing ToC results', async () => {
    mockTocResultsRepository.findResultById.mockResolvedValueOnce(null);

    await expect(
      service.execute({ toc_result_id: 555 } as any, user, 101, 15),
    ).rejects.toMatchObject({
      message:
        'No ToC result was found with the provided identifier in the Integration catalogue.',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should reject unsupported ToC categories', async () => {
    mockTocResultsRepository.findResultById.mockResolvedValueOnce({
      id: 555,
      category: 'UNKNOWN',
    });

    await expect(
      service.execute({ toc_result_id: 555 } as any, user, 101, 15),
    ).rejects.toMatchObject({
      message:
        'The ToC result category is not supported for automatic level mapping.',
    });
  });
});
