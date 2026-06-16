import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ShareResultRequestService } from '../../../../results/share-result-request/share-result-request.service';
import { ResultsByProjectsService } from '../../../../results/results_by_projects/results_by_projects.service';
import { ResultsByInstitutionsService } from '../../../../results/results_by_institutions/results_by_institutions.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';

describe('ApplyFrameworkResultAssociationsService', () => {
  let service: ApplyFrameworkResultAssociationsService;

  const mockShareResultRequestService = {
    resultRequest: jest.fn(),
  };
  const mockResultsByProjectsService = {
    linkBilateralProjectToResult: jest.fn(),
  };
  const mockResultsByInstitutionsService = {
    handleContributingCenters: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyFrameworkResultAssociationsService,
        {
          provide: ShareResultRequestService,
          useValue: mockShareResultRequestService,
        },
        {
          provide: ResultsByProjectsService,
          useValue: mockResultsByProjectsService,
        },
        {
          provide: ResultsByInstitutionsService,
          useValue: mockResultsByInstitutionsService,
        },
      ],
    }).compile();

    service = module.get(ApplyFrameworkResultAssociationsService);
  });

  it('should do nothing when payload has no associations', async () => {
    await service.execute({} as any, user, 101);

    expect(mockShareResultRequestService.resultRequest).not.toHaveBeenCalled();
    expect(
      mockResultsByProjectsService.linkBilateralProjectToResult,
    ).not.toHaveBeenCalled();
    expect(
      mockResultsByInstitutionsService.handleContributingCenters,
    ).not.toHaveBeenCalled();
  });

  it('should share contributors when contributors_result_toc_result is provided', async () => {
    const contributors = [
      {
        initiative_id: 20,
        planned_result: true,
        result_toc_results: [],
      },
    ];

    await service.execute(
      { contributors_result_toc_result: contributors } as any,
      user,
      202,
    );

    expect(mockShareResultRequestService.resultRequest).toHaveBeenCalledWith(
      {
        initiativeShareId: [20],
        isToc: false,
        contributors_result_toc_result: contributors,
      },
      202,
      user,
    );
  });

  it('should link valid bilateral projects and ignore invalid ids', async () => {
    await service.execute(
      {
        bilateral_project: [
          { project_id: 9001 },
          { project_id: '9002' },
          { project_id: 'invalid' },
        ],
      } as any,
      user,
      303,
    );

    expect(
      mockResultsByProjectsService.linkBilateralProjectToResult,
    ).toHaveBeenCalledTimes(2);
    expect(
      mockResultsByProjectsService.linkBilateralProjectToResult,
    ).toHaveBeenNthCalledWith(1, 303, 9001, user.id);
    expect(
      mockResultsByProjectsService.linkBilateralProjectToResult,
    ).toHaveBeenNthCalledWith(2, 303, 9002, user.id);
  });

  it('should persist contributing centers when key is present', async () => {
    const centers = [
      { code: 'CIM', is_leading_result: true },
      { code: 'IITA', is_leading_result: false },
    ];

    await service.execute({ contributing_center: centers } as any, user, 404);

    expect(
      mockResultsByInstitutionsService.handleContributingCenters,
    ).toHaveBeenCalledWith(centers, { result_id: 404 }, user);
  });

  it('should pass empty array when contributing_center key exists but is not an array', async () => {
    await service.execute({ contributing_center: null } as any, user, 505);

    expect(
      mockResultsByInstitutionsService.handleContributingCenters,
    ).toHaveBeenCalledWith([], { result_id: 505 }, user);
  });
});
