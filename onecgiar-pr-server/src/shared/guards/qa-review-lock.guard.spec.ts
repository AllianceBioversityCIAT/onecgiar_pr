import { ConflictException, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import {
  QA_REVIEW_LOCK_LOOKUPS,
  QA_REVIEW_LOCK_TARGET,
  QaReviewLockGuard,
  QaReviewLockTarget,
} from './qa-review-lock.guard';
import { RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE } from '../constants/qa-review-lock.constant';
import { SummaryController } from '../../api/results/summary/summary.controller';
import { SummaryService } from '../../api/results/summary/summary.service';
import { ResultsController } from '../../api/results/results.controller';
import { EvidencesController } from '../../api/results/evidences/evidences.controller';
import { LinkedResultsController } from '../../api/results/linked-results/linked-results.controller';
import { ResultsTocResultsController } from '../../api/results/results-toc-results/results-toc-results.controller';
import { ResultsByInstitutionsController } from '../../api/results/results_by_institutions/results_by_institutions.controller';
import { ResultsKnowledgeProductsController } from '../../api/results/results-knowledge-products/results-knowledge-products.controller';
import { NonPooledProjectsController } from '../../api/results/non-pooled-projects/non-pooled-projects.controller';
import { ResultCountriesController } from '../../api/results/result-countries/result-countries.controller';
import { ResultRegionsController } from '../../api/results/result-regions/result-regions.controller';
import { AdminPanelController } from '../../api/results/admin-panel/admin-panel.controller';
import { ResultsValidationModuleController } from '../../api/results/results-validation-module/results-validation-module.controller';
import { SubmissionsController } from '../../api/results/submissions/submissions.controller';
import { GeographicLocationController } from '../../api/results-framework-reporting/geographic-location/geographic-location.controller';
import { ContributorsPartnersController } from '../../api/results-framework-reporting/contributors-partners/contributors-partners.controller';
import { InnovationUseController } from '../../api/results-framework-reporting/innovation-use/innovation-use.controller';
import { InnovationDevController } from '../../api/results-framework-reporting/innovation_dev/innovation_dev.controller';
import { ImpactLevelController } from '../../api/results-framework-reporting/impact-level/impact-level.controller';
import { AiController } from '../../api/ai/ai.controller';
import { InnovationPathwayController } from '../../api/ipsr/innovation-pathway/innovation-pathway.controller';
import { ResultInnovationPackageController } from '../../api/ipsr/result-innovation-package/result-innovation-package.controller';
import { ResultsPackageTocResultController } from '../../api/ipsr/results-package-toc-result/results-package-toc-result.controller';
import { ResultsInnovationPackagesEnablerTypeController } from '../../api/ipsr/results-innovation-packages-enabler-type/results-innovation-packages-enabler-type.controller';
import { IpsrGeneralInformationController } from '../../api/ipsr-framework/ipsr_general_information/ipsr_general_information.controller';
import { PathwayController } from '../../api/ipsr-framework/pathway/pathway.controller';
import { IpsrContributorsPartnersController } from '../../api/ipsr-framework/ipsr_contributors-partners/ipsr_contributors-partners.controller';
import { BilateralCenterController } from '../../api/bilateral/bilateral-center.controller';
import { BilateralController } from '../../api/bilateral/bilateral.controller';
import { QaCatalogController } from '../../api/qa-catalog/qa-catalog.controller';

/**
 * QA review lock on USER section saves (P2-3912).
 *
 * 1. The guard: how it finds the result, the predicate it sends, 409 vs pass.
 * 2. Coverage: every user section-save handler carries it; system writers do not.
 * 3. One real HTTP call through Nest, so the guard's own dependencies resolve and a locked
 *    result never reaches the service.
 */

const req = (params: any = {}, body: any = undefined) => ({ params, body });

function makeGuard(
  target: QaReviewLockTarget | undefined,
  query: jest.Mock,
): { guard: QaReviewLockGuard; ctx: (r: any) => any } {
  const reflector = { get: jest.fn(() => target) } as unknown as Reflector;
  const guard = new QaReviewLockGuard(reflector, { query } as any);
  const ctx = (r: any) => ({
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => r }),
  });
  return { guard, ctx };
}

describe('QaReviewLockGuard', () => {
  it('rejects with 409 and the lock message when the result is In QA in an open phase', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 12619 }]);
    const { guard, ctx } = makeGuard({ param: 'resultId' }, query);

    await expect(
      guard.canActivate(ctx(req({ resultId: '12619' })) as any),
    ).rejects.toEqual(
      new ConflictException(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE),
    );

    const [sql, params] = query.mock.calls[0];
    const flat = sql.replace(/\s+/g, ' ');
    expect(flat).toMatch(/JOIN `version` v ON v\.id = r\.version_id/);
    expect(flat).toMatch(/r\.in_qa = 1/);
    expect(flat).toMatch(/v\.status = 1/);
    expect(params).toEqual([12619]);
  });

  it('lets the request through when no row matches (not In QA, or the phase is closed)', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const { guard, ctx } = makeGuard({ param: 'resultId' }, query);
    await expect(
      guard.canActivate(ctx(req({ resultId: 12619 })) as any),
    ).resolves.toBe(true);
  });

  it('reads the id from the body when the route carries it there', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const { guard, ctx } = makeGuard({ body: 'result_id' }, query);
    await guard.canActivate(ctx(req({}, { result_id: 77 })) as any);
    expect(query.mock.calls[0][1]).toEqual([77]);
  });

  it('maps a row id to its result through the lookup table first', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ result_id: 501 }])
      .mockResolvedValueOnce([{ id: 501 }]);
    const { guard, ctx } = makeGuard(
      { param: 'id', lookup: QA_REVIEW_LOCK_LOOKUPS.nonPooledProject },
      query,
    );
    await expect(
      guard.canActivate(ctx(req({ id: '9' })) as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(query.mock.calls[0][0]).toMatch(
      /SELECT `results_id` AS result_id FROM `non_pooled_project` WHERE `id` IN \(\?\)/,
    );
    expect(query.mock.calls[0][1]).toEqual([9]);
    expect(query.mock.calls[1][1]).toEqual([501]);
  });

  it('maps every item of an array body (enablers) to its Innovation Package', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ result_id: 40 }, { result_id: 40 }])
      .mockResolvedValueOnce([]);
    const { guard, ctx } = makeGuard(
      {
        bodyArrayKey: 'result_by_innovation_package_id',
        lookup: QA_REVIEW_LOCK_LOOKUPS.resultByInnovationPackage,
      },
      query,
    );
    await guard.canActivate(
      ctx(
        req({}, [
          { result_by_innovation_package_id: 3 },
          { result_by_innovation_package_id: 4 },
        ]),
      ) as any,
    );
    expect(query.mock.calls[0][1]).toEqual([3, 4]);
    expect(query.mock.calls[1][1]).toEqual([40]);
  });

  it.each([
    ['no id at all', req({})],
    ['a non-numeric id', req({ resultId: 'abc' })],
    ['a zero id', req({ resultId: '0' })],
  ])('does not query and lets the route answer on %s', async (_l, r) => {
    const query = jest.fn();
    const { guard, ctx } = makeGuard({ param: 'resultId' }, query);
    await expect(guard.canActivate(ctx(r) as any)).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('is a no-op on a handler without the decorator', async () => {
    const query = jest.fn();
    const { guard, ctx } = makeGuard(undefined, query);
    await expect(
      guard.canActivate(ctx(req({ resultId: 1 })) as any),
    ).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('QA review lock — route coverage', () => {
  const lockOf = (ctrl: any, method: string) =>
    Reflect.getMetadata(QA_REVIEW_LOCK_TARGET, ctrl.prototype[method]);
  const handlerFor = (ctrl: any, verb: string, path: string): string => {
    const names = Object.getOwnPropertyNames(ctrl.prototype).filter(
      (n) =>
        n !== 'constructor' &&
        Reflect.getMetadata('path', ctrl.prototype[n]) === path &&
        // RequestMethod: GET 0, POST 1, PUT 2, DELETE 3, PATCH 4
        Reflect.getMetadata('method', ctrl.prototype[n]) ===
          { POST: 1, PUT: 2, DELETE: 3, PATCH: 4 }[verb],
    );
    if (names.length === 0) throw new Error(`no handler ${verb} ${path}`);
    return names[0];
  };

  // [controller, verb, path, expected target]
  const USER_SAVES: [any, string, string, QaReviewLockTarget][] = [
    [
      ResultsController,
      'PATCH',
      'update/geographic/:resiltId',
      { param: 'resiltId' },
    ],
    [
      ResultsController,
      'PATCH',
      'bilateral/review-update/data-standard/:resultId',
      { param: 'resultId' },
    ],
    [
      ResultsController,
      'PATCH',
      'bilateral/review-update/toc-metadata/:resultId',
      { param: 'resultId' },
    ],
    [
      ResultsController,
      'PATCH',
      'bilateral/:resultId/title',
      { param: 'resultId' },
    ],
    [
      ResultsController,
      'PATCH',
      'bilateral/general-info/:resultId',
      { param: 'resultId' },
    ],
    [
      GeographicLocationController,
      'PATCH',
      'update/geographic/:resultId',
      { param: 'resultId' },
    ],
    [
      ContributorsPartnersController,
      'PATCH',
      'update/unplanned/result/:resultId',
      { param: 'resultId' },
    ],
    [
      ContributorsPartnersController,
      'PATCH',
      ':resultId',
      { param: 'resultId' },
    ],
    [
      ResultsByInstitutionsController,
      'PATCH',
      'create/partners/:id',
      { param: 'id' },
    ],
    [
      ResultsTocResultsController,
      'POST',
      'create/toc/result/:resultId',
      { param: 'resultId' },
    ],
    [EvidencesController, 'POST', 'create/:resultId', { param: 'resultId' }],
    [
      LinkedResultsController,
      'POST',
      'create/:resultId',
      { param: 'resultId' },
    ],
    [
      SummaryController,
      'PATCH',
      'innovation-use/create/result/:resultId',
      { param: 'resultId' },
    ],
    [
      SummaryController,
      'PATCH',
      'capacity-developent/create/result/:resultId',
      { param: 'resultId' },
    ],
    [
      SummaryController,
      'PATCH',
      'innovation-dev/create/result/:resultId',
      { param: 'resultId' },
    ],
    [
      SummaryController,
      'PATCH',
      'policy-changes/create/result/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationUseController,
      'PATCH',
      '/create/result/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationDevController,
      'POST',
      'evidence_demand/create/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationDevController,
      'PATCH',
      'innovation-dev/create/result/:resultId',
      { param: 'resultId' },
    ],
    [
      ImpactLevelController,
      'PATCH',
      'save/result/:resultId',
      { param: 'resultId' },
    ],
    [
      ResultsKnowledgeProductsController,
      'PATCH',
      'upsert/:resultId',
      { param: 'resultId' },
    ],
    [
      NonPooledProjectsController,
      'PATCH',
      ':id',
      { param: 'id', lookup: QA_REVIEW_LOCK_LOOKUPS.nonPooledProject },
    ],
    [ResultCountriesController, 'POST', 'create', { body: 'result_id' }],
    [ResultRegionsController, 'POST', '/', { body: 'result_id' }],
    [AiController, 'PATCH', 'dac-scores/:resultId', { param: 'resultId' }],
    [
      AiController,
      'POST',
      'sessions/:sessionId/save',
      { param: 'sessionId', lookup: QA_REVIEW_LOCK_LOOKUPS.aiReviewSession },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'save/step-one/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'retrieve/aa-outcomes/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'save/step-two/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'POST',
      'save/complementary-innovation/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'updated/complementary-innovation/:complementaryInnovationId',
      { param: 'complementaryInnovationId' },
    ],
    [
      InnovationPathwayController,
      'DELETE',
      'delete/complementary-innovation/:complementaryInnovationId',
      { param: 'complementaryInnovationId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'save/step-three/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'save/step-four/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'save/step-four/partners/:resultId',
      { param: 'resultId' },
    ],
    [
      InnovationPathwayController,
      'PATCH',
      'save/step-four/bilaterals/:resultId',
      { param: 'resultId' },
    ],
    [
      ResultInnovationPackageController,
      'PATCH',
      'general-information/:resultId',
      { param: 'resultId' },
    ],
    [
      ResultsPackageTocResultController,
      'PATCH',
      'save/:resultId',
      { param: 'resultId' },
    ],
    [
      ResultsInnovationPackagesEnablerTypeController,
      'POST',
      'createInnovationEnablers',
      {
        bodyArrayKey: 'result_by_innovation_package_id',
        lookup: QA_REVIEW_LOCK_LOOKUPS.resultByInnovationPackage,
      },
    ],
    [
      IpsrGeneralInformationController,
      'PATCH',
      'general-information/:resultId',
      { param: 'resultId' },
    ],
    [
      PathwayController,
      'PATCH',
      'save/step-four/:resultId',
      { param: 'resultId' },
    ],
    [
      PathwayController,
      'PATCH',
      'save/step-four/bilaterals/:resultId',
      { param: 'resultId' },
    ],
    [
      IpsrContributorsPartnersController,
      'PATCH',
      ':resultId',
      { param: 'resultId' },
    ],
    [
      BilateralCenterController,
      'PATCH',
      'change-type/:resultId',
      { param: 'resultId' },
    ],
    [
      BilateralCenterController,
      'PATCH',
      'primary-assignment/:resultId',
      { param: 'resultId' },
    ],
    [
      BilateralCenterController,
      'PATCH',
      'planned-result/:resultId',
      { param: 'resultId' },
    ],
    [
      BilateralCenterController,
      'PATCH',
      'toc-mapping/:resultId',
      { param: 'resultId' },
    ],
    [
      BilateralCenterController,
      'PATCH',
      'contributors/:resultId',
      { param: 'resultId' },
    ],
  ];

  it.each(
    USER_SAVES.map(([c, v, p, t]) => [`${c.name} ${v} ${p}`, c, v, p, t]),
  )(
    'user save %s is locked while In QA',
    (_label, ctrl, verb, path, target) => {
      expect(
        lockOf(ctrl, handlerFor(ctrl, verb as string, path as string)),
      ).toEqual(target);
    },
  );

  // System writers and non-section routes stay out of the lock on purpose.
  const NOT_LOCKED: [any, string, string][] = [
    [ResultsKnowledgeProductsController, 'PATCH', 'resync/:resultId'],
    [AdminPanelController, 'PATCH', 'bulk/kps'],
    [ResultsValidationModuleController, 'PATCH', 'save/green-checks/:resultId'],
    [SubmissionsController, 'PATCH', 'submit/:resultId'],
    [SubmissionsController, 'PATCH', 'unsubmit/:resultId'],
    [BilateralController, 'POST', 'create'],
    [QaCatalogController, 'POST', 'results/intake'],
    [QaCatalogController, 'POST', 'results/release'],
  ];

  it.each(NOT_LOCKED.map(([c, v, p]) => [`${c.name} ${v} ${p}`, c, v, p]))(
    '%s is not locked',
    (_label, ctrl, verb, path) => {
      expect(
        lockOf(ctrl, handlerFor(ctrl, verb as string, path as string)),
      ).toBeUndefined();
    },
  );
});

describe('QA review lock — through Nest (policy change save)', () => {
  let app: INestApplication;
  const savePolicyChanges = jest.fn().mockResolvedValue({
    response: {},
    message: 'saved',
    status: 200,
  });
  const query = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SummaryController],
      providers: [
        { provide: SummaryService, useValue: { savePolicyChanges } },
        { provide: DataSource, useValue: { query } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app?.close());
  beforeEach(() => {
    savePolicyChanges.mockClear();
    query.mockReset();
  });

  it('answers 409 and never calls the service while QA holds the result', async () => {
    query.mockResolvedValue([{ id: 12619 }]);
    const res = await request(app.getHttpServer())
      .patch('/policy-changes/create/result/12619')
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.message).toBe(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE);
    expect(savePolicyChanges).not.toHaveBeenCalled();
  });

  it('saves normally once QA released it', async () => {
    query.mockResolvedValue([]);
    const res = await request(app.getHttpServer())
      .patch('/policy-changes/create/result/12619')
      .send({});
    expect(res.status).toBe(200);
    expect(savePolicyChanges).toHaveBeenCalledTimes(1);
  });
});
