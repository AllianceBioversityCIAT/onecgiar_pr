import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../../../shared/globalInterfaces/token.dto';
import { ShareResultRequestService } from '../../../../results/share-result-request/share-result-request.service';
import { ResultsByProjectsService } from '../../../../results/results_by_projects/results_by_projects.service';
import { ResultsByInstitutionsService } from '../../../../results/results_by_institutions/results_by_institutions.service';
import { ApplyFrameworkResultAssociationsService } from './apply-framework-result-associations.service';
import { ResultTaggedNotificationService } from '../../../../notification/services/result-tagged-notification.service';
import { ContributorsPartnersService } from '../../../contributors-partners/contributors-partners.service';

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
    savePartnersInstitutionsByResultV2: jest.fn(),
  };
  const mockResultTaggedNotificationService = {
    notifyTaggedBilateralProjects: jest.fn().mockResolvedValue(undefined),
  };
  const mockContributorsPartnersService = {
    updateContributorsAndPartners: jest.fn().mockResolvedValue(undefined),
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
          provide: ResultTaggedNotificationService,
          useValue: mockResultTaggedNotificationService,
        },
        {
          provide: ResultsByInstitutionsService,
          useValue: mockResultsByInstitutionsService,
        },
        {
          provide: ContributorsPartnersService,
          useValue: mockContributorsPartnersService,
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
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
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

  it('should pass initiativeFromToc when contributors carry from_toc (P2-3114)', async () => {
    const contributors = [
      { id: 20, from_toc: true, planned_result: true, result_toc_results: [] },
      { id: 21, from_toc: false, planned_result: true, result_toc_results: [] },
    ];

    await service.execute(
      { contributors_result_toc_result: contributors } as any,
      user,
      808,
    );

    expect(mockShareResultRequestService.resultRequest).toHaveBeenCalledWith(
      {
        initiativeShareId: [20, 21],
        isToc: false,
        contributors_result_toc_result: contributors,
        initiativeFromToc: { 20: true, 21: false },
      },
      808,
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
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
    ).toHaveBeenCalledWith(
      {
        result_id: 404,
        contributing_center: centers,
        institutions: undefined,
        mqap_institutions: [],
      },
      user,
    );
  });

  it('should persist partner institutions with from_toc on create (P2-3114)', async () => {
    const institutions = [
      { institutions_id: 42, from_toc: true },
      { institutions_id: 99, from_toc: false },
    ];

    await service.execute({ institutions } as any, user, 606);

    expect(
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
    ).toHaveBeenCalledWith(
      {
        result_id: 606,
        contributing_center: [],
        institutions,
        mqap_institutions: [],
      },
      user,
    );
  });

  it('should pass empty array when contributing_center key exists but is not an array', async () => {
    await service.execute({ contributing_center: null } as any, user, 505);

    expect(
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
    ).toHaveBeenCalledWith(
      {
        result_id: 505,
        contributing_center: [],
        institutions: undefined,
        mqap_institutions: [],
      },
      user,
    );
  });

  it('should link bilateral projects without wiping them when contributing_center is also provided (P2-3001)', async () => {
    const centers = [{ code: 'CIM', is_leading_result: true }];
    const bilateralProjects = [{ project_id: 9001 }, { project_id: 9002 }];

    mockResultsByProjectsService.linkBilateralProjectToResult.mockResolvedValue(
      {
        status: 201,
      },
    );
    mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2.mockResolvedValue(
      { status: 200 },
    );

    await service.execute(
      {
        contributing_center: centers,
        bilateral_project: bilateralProjects,
      } as any,
      user,
      707,
    );

    expect(
      mockResultsByProjectsService.linkBilateralProjectToResult,
    ).toHaveBeenCalledTimes(2);
    expect(
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        result_id: 707,
        contributing_center: centers,
      }),
      user,
    );
    expect(
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
    ).toHaveBeenCalledWith(
      expect.not.objectContaining({ bilateral_project: expect.anything() }),
      user,
    );
  });

  /**
   * P2-3604 — the emerging creation panel asks "are you reporting the use of an innovation that has
   * already been reported and quality assessed?", refuses to create the result until it is answered,
   * and posts the answer inside `result`. Nothing here read it, so the record was created with the
   * default and the reporter found "No" with nothing linked. QA reproduced it three times on result
   * 9070.
   */
  describe('innovation link answered at creation (P2-3604)', () => {
    it('persists the link through the single writer when the answer is Yes', async () => {
      await service.execute(
        {
          result: { has_innovation_link: true, linked_results: [8375] },
        } as any,
        user,
        9070,
      );

      expect(
        mockContributorsPartnersService.updateContributorsAndPartners,
      ).toHaveBeenCalledWith(
        9070,
        { has_innovation_link: true, linked_results: [8375] },
        user,
      );
    });

    it('writes nothing when the answer is No — an untouched result stays as it is', async () => {
      await service.execute(
        { result: { has_innovation_link: false, linked_results: [] } } as any,
        user,
        9070,
      );

      expect(
        mockContributorsPartnersService.updateContributorsAndPartners,
      ).not.toHaveBeenCalled();
    });

    it('writes nothing when the question was never asked', async () => {
      await service.execute({ result: { title: 'x' } } as any, user, 9070);

      expect(
        mockContributorsPartnersService.updateContributorsAndPartners,
      ).not.toHaveBeenCalled();
    });

    it('writes nothing when Yes arrives with no innovation selected', async () => {
      await service.execute(
        { result: { has_innovation_link: true, linked_results: [] } } as any,
        user,
        9070,
      );

      expect(
        mockContributorsPartnersService.updateContributorsAndPartners,
      ).not.toHaveBeenCalled();
    });

    /**
     * The result is already created by the time this runs, so a failure here must not turn a
     * successful creation into an error the reporter cannot recover from — the link stays editable
     * in Contributors and partners.
     */
    it('does not fail the creation when the link could not be persisted', async () => {
      mockContributorsPartnersService.updateContributorsAndPartners.mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(
        service.execute(
          {
            result: { has_innovation_link: true, linked_results: [8375] },
          } as any,
          user,
          9070,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
