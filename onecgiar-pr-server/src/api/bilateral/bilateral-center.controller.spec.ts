import { Test, TestingModule } from '@nestjs/testing';
import { BilateralCenterController } from './bilateral-center.controller';
import { BilateralCenterService } from './services/bilateral-center.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

describe('BilateralCenterController', () => {
  let controller: BilateralCenterController;
  let bilateralCenterService: jest.Mocked<BilateralCenterService>;

  const user: TokenDto = {
    id: 42,
    email: 'test@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralCenterController],
      providers: [
        {
          provide: BilateralCenterService,
          useValue: {
            getProjects: jest
              .fn()
              .mockResolvedValue({ response: { projects: [] } }),
            createResultHeader: jest.fn().mockResolvedValue({
              response: { id: 99, status_id: 1 },
            }),
            changeResultType: jest
              .fn()
              .mockResolvedValue({ response: { resultId: 99 } }),
            updatePrimaryAssignment: jest
              .fn()
              .mockResolvedValue({ response: { resultId: 99 } }),
            getResultInitiativeId: jest.fn().mockResolvedValue({
              response: { initiativeId: 1 },
            }),
            getTocState: jest.fn().mockResolvedValue({
              response: { planned_result: true },
            }),
            updatePlannedResult: jest.fn().mockResolvedValue({ response: {} }),
            saveTocMapping: jest.fn().mockResolvedValue({ response: {} }),
            saveContributors: jest.fn().mockResolvedValue({
              response: { resultId: 1 },
            }),
            submitForReview: jest.fn().mockResolvedValue({
              response: { resultId: 1, status: 5 },
            }),
            assess: jest.fn().mockResolvedValue({
              response: { id: 1, result_id: 77, status: 'completed' },
              message: 'Quality assessment completed',
              status: 200,
            }),
            getLatest: jest.fn().mockResolvedValue({
              response: { latest: null },
              message: 'Latest quality assessment retrieved successfully',
              status: 200,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<BilateralCenterController>(
      BilateralCenterController,
    );
    bilateralCenterService = module.get(BilateralCenterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getProjects should delegate to service', async () => {
    const result = await controller.getProjects(10);
    expect(bilateralCenterService.getProjects).toHaveBeenCalledWith(
      10,
      undefined,
      undefined,
    );
    expect(result).toEqual({ response: { projects: [] } });
  });

  // changes/project-multiselect-filter (PMF-DD-5): the optional `year` query is passed
  // through untouched — the catalog service owns its normalization and active-year
  // fallback, so a non-numeric value must reach it verbatim, never 5xx at the route.
  it('getProjects should pass the optional year query through to the service', async () => {
    await controller.getProjects(10, 2025);
    expect(bilateralCenterService.getProjects).toHaveBeenCalledWith(
      10,
      2025,
      undefined,
    );

    await controller.getProjects(10, 'bogus' as any);
    expect(bilateralCenterService.getProjects).toHaveBeenCalledWith(
      10,
      'bogus',
      undefined,
    );
  });

  // bilateral/project-overview-metrics (BIL-POM-OQ-1 correction): the optional `versionId`
  // query passes through untouched too, so the catalog can scope w1w2ContributorCount.
  it('getProjects should pass the optional versionId query through to the service', async () => {
    await controller.getProjects(10, 2025, 36);
    expect(bilateralCenterService.getProjects).toHaveBeenCalledWith(
      10,
      2025,
      36,
    );
  });

  it('createResultHeader should delegate to service', async () => {
    const dto = { result_level_id: 2, result_type_id: 6 };
    await controller.createResultHeader(user, dto);
    expect(bilateralCenterService.createResultHeader).toHaveBeenCalledWith(
      user,
      dto,
    );
  });

  it('changeResultType should delegate the promoted-draft conversion to the service', async () => {
    const dto = {
      result_level_id: 4,
      result_type_id: 7,
      justification: 'Correction',
    } as any;
    await controller.changeResultType(user, 99, dto);
    expect(bilateralCenterService.changeResultType).toHaveBeenCalledWith(
      user,
      99,
      dto,
    );
  });

  it('updates the project and primary program through the dedicated atomic service', async () => {
    const dto = { project_id: 20, primary_science_program_id: 9 };
    await controller.updatePrimaryAssignment(user, 99, dto);
    expect(bilateralCenterService.updatePrimaryAssignment).toHaveBeenCalledWith(
      user,
      99,
      dto,
    );
  });

  it('getResultInitiativeId should delegate to service', async () => {
    await controller.getResultInitiativeId(5);
    expect(bilateralCenterService.getResultInitiativeId).toHaveBeenCalledWith(
      5,
    );
  });

  it('getTocState should delegate to service', async () => {
    await controller.getTocState(5);
    expect(bilateralCenterService.getTocState).toHaveBeenCalledWith(5);
  });

  it('updatePlannedResult should delegate to service', async () => {
    const body = { planned_result: true };
    await controller.updatePlannedResult(5, body, user);
    expect(bilateralCenterService.updatePlannedResult).toHaveBeenCalledWith(
      5,
      body,
      user,
    );
  });

  it('saveTocMapping should delegate to service', async () => {
    const dto = { result_toc_result: {} } as any;
    await controller.saveTocMapping(5, dto, user);
    expect(bilateralCenterService.saveTocMapping).toHaveBeenCalledWith(
      5,
      dto,
      user,
    );
  });

  it('saveContributors should delegate to service', async () => {
    const dto = { contributing_center: [] };
    await controller.saveContributors(5, dto, user);
    expect(bilateralCenterService.saveContributors).toHaveBeenCalledWith(
      5,
      dto,
      user,
    );
  });

  // P2-3157 — the transition that makes the review loop reachable from the centre UI.
  it('submitForReview should delegate to service', async () => {
    const dto = { assessment_id: 8, decision: 'submitted_anyway' as const };
    await controller.submitForReview(user, 77, dto);
    expect(bilateralCenterService.submitForReview).toHaveBeenCalledWith(
      user,
      77,
      dto,
    );
  });

  // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
  it('assessQuality should delegate to service', async () => {
    await controller.assessQuality(user, 77);
    expect(bilateralCenterService.assess).toHaveBeenCalledWith(user, 77);
  });

  it('getLatestQualityAssessment should delegate to service', async () => {
    await controller.getLatestQualityAssessment(user, 77);
    expect(bilateralCenterService.getLatest).toHaveBeenCalledWith(user, 77);
  });
});
