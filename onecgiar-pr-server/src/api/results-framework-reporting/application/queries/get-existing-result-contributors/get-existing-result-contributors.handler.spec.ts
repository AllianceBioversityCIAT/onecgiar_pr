import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { GetExistingResultContributorsToIndicatorsHandler } from './get-existing-result-contributors.handler';
import { GetExistingResultContributorsToIndicatorsQuery } from './get-existing-result-contributors.query';
import { ExistingResultContributorsLoaderService } from './existing-result-contributors-loader.service';
import { ContributorsRoleResolverService } from './contributors-role-resolver.service';

describe('GetExistingResultContributorsToIndicatorsHandler', () => {
  let handler: GetExistingResultContributorsToIndicatorsHandler;

  const mockLoaderService = {
    parseResultTocResultId: jest.fn(),
    validateTocResultIndicatorId: jest.fn(),
    loadContributions: jest.fn(),
    filterContributorsWithIndicator: jest.fn(),
  };
  const mockRoleResolverService = {
    resolve: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetExistingResultContributorsToIndicatorsHandler,
        {
          provide: ExistingResultContributorsLoaderService,
          useValue: mockLoaderService,
        },
        {
          provide: ContributorsRoleResolverService,
          useValue: mockRoleResolverService,
        },
      ],
    }).compile();

    handler = module.get(GetExistingResultContributorsToIndicatorsHandler);
  });

  it('should return mapped contributors when matches exist', async () => {
    const contributors = [
      {
        result_toc_result_id: 11,
        result_id: 101,
        toc_result_id: 5,
        obj_results: {
          title: 'Result Alpha',
          result_code: 'RES-101',
          version_id: 30,
          status_id: 2,
          obj_status: { status_name: 'Submitted' },
        },
        obj_results_toc_result_indicators: [
          {
            toc_results_indicator_id: 'IND-55',
            obj_result_indicator_targets: [
              { contributing_indicator: 2.5, is_active: true },
              { contributing_indicator: 1, is_active: true },
            ],
          },
        ],
      },
    ];

    mockLoaderService.parseResultTocResultId.mockReturnValue(5);
    mockLoaderService.validateTocResultIndicatorId.mockReturnValue('IND-55');
    mockLoaderService.loadContributions.mockResolvedValue(contributors);
    mockLoaderService.filterContributorsWithIndicator.mockResolvedValue(
      contributors,
    );
    mockRoleResolverService.resolve.mockResolvedValue({
      rolesByResult: new Map([[101, { role_id: 4, role_name: 'Lead' }]]),
      userGeneralRole: null,
    });

    const result = await handler.execute(
      new GetExistingResultContributorsToIndicatorsQuery(user, 5, 'IND-55'),
    );

    expect(mockLoaderService.parseResultTocResultId).toHaveBeenCalledWith(5);
    expect(mockLoaderService.validateTocResultIndicatorId).toHaveBeenCalledWith(
      'IND-55',
    );
    expect(mockLoaderService.loadContributions).toHaveBeenCalledWith(
      5,
      'IND-55',
    );
    expect(mockRoleResolverService.resolve).toHaveBeenCalledWith(user, [101]);
    expect(result).toEqual({
      response: {
        contributors: [
          {
            result_id: 101,
            title: 'Result Alpha',
            result_code: 'RES-101',
            status_name: 'Submitted',
            version_id: 30,
            status_id: 2,
            role_id: 4,
            contributing_indicator: 3.5,
          },
        ],
        resultTocResultId: 5,
        tocResultIndicatorId: 'IND-55',
      },
      message: 'Existing result contributors retrieved successfully.',
      status: HttpStatus.OK,
    });
  });

  it('should return empty contributors when filter finds no indicator links', async () => {
    mockLoaderService.parseResultTocResultId.mockReturnValue(8);
    mockLoaderService.validateTocResultIndicatorId.mockReturnValue('IND-99');
    mockLoaderService.loadContributions.mockResolvedValue([
      { result_toc_result_id: 21, result_id: 303, toc_result_id: 8 },
    ]);
    mockLoaderService.filterContributorsWithIndicator.mockResolvedValue(null);

    const result = await handler.execute(
      new GetExistingResultContributorsToIndicatorsQuery(user, 8, 'IND-99'),
    );

    expect(mockRoleResolverService.resolve).not.toHaveBeenCalled();
    expect(result).toEqual({
      response: {
        contributors: [],
        resultTocResultId: 8,
        tocResultIndicatorId: 'IND-99',
      },
      message: 'No contributions found for the specified indicator.',
      status: HttpStatus.OK,
    });
  });

  it('should fall back to general application role when result role is missing', async () => {
    const contributors = [
      {
        result_toc_result_id: 31,
        result_id: 501,
        toc_result_id: 7,
        obj_results: {
          title: 'Result Delta',
          result_code: 'RES-501',
          version_id: 10,
          status_id: 6,
          obj_status: { status_name: 'Approved' },
        },
      },
    ];

    mockLoaderService.parseResultTocResultId.mockReturnValue(7);
    mockLoaderService.validateTocResultIndicatorId.mockReturnValue('IND-12');
    mockLoaderService.loadContributions.mockResolvedValue(contributors);
    mockLoaderService.filterContributorsWithIndicator.mockResolvedValue(
      contributors,
    );
    mockRoleResolverService.resolve.mockResolvedValue({
      rolesByResult: new Map(),
      userGeneralRole: 1,
    });

    const result = await handler.execute(
      new GetExistingResultContributorsToIndicatorsQuery(user, 7, 'IND-12'),
    );

    expect(result.response.contributors[0]).toEqual(
      expect.objectContaining({
        result_id: 501,
        role_id: 1,
        contributing_indicator: null,
      }),
    );
  });
});
