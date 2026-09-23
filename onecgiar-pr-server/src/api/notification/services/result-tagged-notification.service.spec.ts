import { ResultTaggedNotificationService } from './result-tagged-notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../enum/notification.enum';
import { SourceEnum } from '../../results/entities/result.entity';

describe('ResultTaggedNotificationService', () => {
  let service: ResultTaggedNotificationService;
  let notificationService: { emitResultNotification: jest.Mock };
  let notificationRepo: { find: jest.Mock };
  let roleByUserRepo: { getUserIdsByCenter: jest.Mock };
  let resultRepo: { findOne: jest.Mock };
  let centerRepo: { find: jest.Mock; findOne: jest.Mock };
  let projectRepo: { find: jest.Mock };
  let resultsCenterRepo: { find: jest.Mock };
  let resultsByProjectsRepo: { find: jest.Mock };

  const RESULT_ID = 77;
  const EMITTER = 9;

  /** A result owned by SP04, which is what AC3's `[SP_NumberSP]` renders from. */
  const resultOwnedBySp04 = {
    id: RESULT_ID,
    result_code: 4321,
    title: 'A pooled funding result',
    obj_result_by_initiatives: [
      { initiative_role_id: 2, obj_initiative: { official_code: 'SP99' } },
      { initiative_role_id: 1, obj_initiative: { official_code: 'SP04' } },
    ],
  };

  beforeEach(() => {
    notificationService = {
      emitResultNotification: jest.fn().mockResolvedValue(undefined),
    };
    notificationRepo = { find: jest.fn().mockResolvedValue([]) };
    roleByUserRepo = { getUserIdsByCenter: jest.fn().mockResolvedValue([]) };
    resultRepo = { findOne: jest.fn().mockResolvedValue(resultOwnedBySp04) };
    centerRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    projectRepo = { find: jest.fn().mockResolvedValue([]) };
    resultsCenterRepo = { find: jest.fn().mockResolvedValue([]) };
    resultsByProjectsRepo = { find: jest.fn().mockResolvedValue([]) };

    service = new ResultTaggedNotificationService(
      notificationService as any,
      notificationRepo as any,
      roleByUserRepo as any,
      resultRepo as any,
      centerRepo as any,
      projectRepo as any,
      resultsCenterRepo as any,
      resultsByProjectsRepo as any,
    );
  });

  const lastEmitCall = () =>
    notificationService.emitResultNotification.mock.calls.at(-1);

  describe('notifyTaggedCenters (AC1)', () => {
    it('emits to the users of the tagged centre with the AC3 copy', async () => {
      centerRepo.find.mockResolvedValueOnce([
        {
          code: 'CENTER-01',
          clarisa_institution: { name: 'Africa Rice Center' },
        },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11, 12]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['CENTER-01']);

      const [level, type, userIds, emitter, resultId, suffix] = lastEmitCall();
      expect(level).toBe(NotificationLevelEnum.RESULT);
      expect(type).toBe(NotificationTypeEnum.RESULT_CENTER_TAGGED);
      expect(userIds).toEqual([11, 12]);
      expect(emitter).toBe(EMITTER);
      expect(resultId).toBe(RESULT_ID);
      expect(suffix).toBe(
        'created by SP04 has tagged the Africa Rice Center. Click to see the result.',
      );
    });

    it('names the owning Science Program from the initiative_role_id = 1 row', async () => {
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      // SP99 sits first in the array but is not the owner.
      expect(lastEmitCall()[5]).toContain('SP04');
      expect(lastEmitCall()[5]).not.toContain('SP99');
    });

    it('falls back to the centre code when the institution name is missing', async () => {
      centerRepo.find.mockResolvedValueOnce([{ code: 'C1' }]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(lastEmitCall()[5]).toContain('has tagged the C1.');
    });

    it('does nothing when no centre codes are given', async () => {
      await service.notifyTaggedCenters(RESULT_ID, EMITTER, []);
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
      expect(resultRepo.findOne).not.toHaveBeenCalled();
    });

    it('skips a centre with no users rather than emitting an empty notification', async () => {
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('does not emit when the result no longer exists', async () => {
      resultRepo.findOne.mockResolvedValueOnce(null);
      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyTaggedBilateralProjects (AC2)', () => {
    it('routes to the centre that owns the project, via organization_code', async () => {
      projectRepo.find.mockResolvedValueOnce([
        { id: 1962, shortName: 'P-1568-WBS0', organizationCode: 67 },
      ]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'CENTER-06', institutionId: 67 },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([21]);

      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [1962]);

      expect(centerRepo.find).toHaveBeenCalled();
      expect(roleByUserRepo.getUserIdsByCenter).toHaveBeenCalledWith(
        'CENTER-06',
      );
      const [, type, , , , suffix] = lastEmitCall();
      expect(type).toBe(NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED);
      expect(suffix).toContain('has tagged the P-1568-WBS0.');
    });

    // CLARISA leaves the Alliance-descended institutions with organization_code = NULL; those
    // rows carry the acronym instead. Same fallback BilateralProjectsService relies on.
    it('falls back to the acronym alias map when organization_code is null', async () => {
      projectRepo.find.mockResolvedValueOnce([
        {
          id: 5,
          shortName: 'B-123',
          organizationCode: null,
          sourceCenterAcronym: 'BIOVERSITY',
        },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([31]);

      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [5]);

      // BCT-T-1 forward pointer #2: `centerRepo.findOne` is never called by this path any more
      // (the resolver reads the alias map in memory), so that assertion could never fail.
      // Replaced with a meaningful one: the Center table is still loaded, exactly once.
      expect(centerRepo.find).toHaveBeenCalledTimes(1);
      expect(roleByUserRepo.getUserIdsByCenter).toHaveBeenCalledWith(
        'CENTER-02',
      );
    });

    // BCT-T-4 forward pointer #1 (BCT-NFR-5): the Center index must be loaded once per call,
    // never once per project.
    it('loads the Center index once per call, not once per project', async () => {
      projectRepo.find.mockResolvedValueOnce([
        { id: 1, shortName: 'P1', organizationCode: 67 },
        { id: 2, shortName: 'P2', organizationCode: 68 },
        { id: 3, shortName: 'P3', organizationCode: 69 },
      ]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'CENTER-06', institutionId: 67 },
        { code: 'CENTER-07', institutionId: 68 },
        { code: 'CENTER-08', institutionId: 69 },
      ]);
      // Distinct recipients per Center — same user id on every target would get deduped by
      // `emitFor`'s per-user set and mask the call count this test is actually checking.
      roleByUserRepo.getUserIdsByCenter
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([2])
        .mockResolvedValueOnce([3]);

      await service.notifyTaggedBilateralProjects(
        RESULT_ID,
        EMITTER,
        [1, 2, 3],
      );

      expect(centerRepo.find).toHaveBeenCalledTimes(1);
      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        3,
      );
    });

    it('skips a project whose owning centre cannot be resolved', async () => {
      projectRepo.find.mockResolvedValueOnce([
        { id: 5, shortName: 'X', organizationCode: null },
      ]);

      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [5]);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('ignores non-numeric and non-positive project ids', async () => {
      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [
        0,
        -3,
        'abc' as any,
      ]);
      expect(projectRepo.find).not.toHaveBeenCalled();
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });
  });

  // BR4, as decided: one notification per affected organisation, not one per link.
  describe('de-duplication (BR4)', () => {
    it('does not notify the same users twice when a centre appears twice in one call', async () => {
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValue([11, 12]);

      // The same code twice — a centre that is both lead and contributor.
      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1', 'C1']);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
    });

    it('drops users already told about this result by either tagged type', async () => {
      notificationRepo.find.mockResolvedValueOnce([
        { target_user: 11 },
        { target_user: 12 },
      ]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11, 12, 13]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(lastEmitCall()[2]).toEqual([13]);
    });

    it('suppresses the emit entirely when every recipient was already notified', async () => {
      notificationRepo.find.mockResolvedValueOnce([{ target_user: 11 }]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('looks the already-notified set up against both tagged types', async () => {
      centerRepo.find.mockResolvedValueOnce([{ code: 'C1' }]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      const where = notificationRepo.find.mock.calls[0][0].where;
      expect(where.result_id).toBe(RESULT_ID);
      expect(where.obj_notification_type.type._value).toEqual([
        NotificationTypeEnum.RESULT_CENTER_TAGGED,
        NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
      ]);
    });
  });

  // BCT-T-4 — bilateral tagging emitter (BCT-R-7..R-12).
  describe('notifyBilateralContributorsOnSubmission (BCT-R-7..R-12)', () => {
    const pendingReviewBilateralResult = {
      id: RESULT_ID,
      status_id: 5,
      source: SourceEnum.Bilateral,
      obj_result_by_initiatives: [],
    };

    const leadingCenterRow = (acronym: string | undefined = 'AR') => ({
      center_id: 'AR',
      is_leading_result: true,
      is_active: true,
      clarisa_center_object: {
        code: 'AR',
        clarisa_institution: acronym
          ? { acronym, name: 'Africa Rice Center Full Name' }
          : undefined,
      },
    });

    const centerRow = (code: string, name: string) => ({
      center_id: code,
      is_leading_result: false,
      is_active: true,
      clarisa_center_object: {
        code,
        clarisa_institution: { name },
      },
    });

    it.each([1, 8, 7])(
      'does nothing when the result status is %i (not Pending Review)',
      async (statusId) => {
        resultRepo.findOne.mockResolvedValueOnce({
          id: RESULT_ID,
          status_id: statusId,
          source: SourceEnum.Bilateral,
        });

        await service.notifyBilateralContributorsOnSubmission(
          RESULT_ID,
          EMITTER,
        );

        expect(resultsCenterRepo.find).not.toHaveBeenCalled();
        expect(
          notificationService.emitResultNotification,
        ).not.toHaveBeenCalled();
      },
    );

    it('does nothing when the result is Pending Review but not bilateral', async () => {
      resultRepo.findOne.mockResolvedValueOnce({
        id: RESULT_ID,
        status_id: 5,
        source: SourceEnum.Result,
      });

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(resultsCenterRepo.find).not.toHaveBeenCalled();
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('notifies the project owner first, skipping the lead project itself and never sending a Center-tagged message to the leading Center, using the acronym in the lead-in', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([leadingCenterRow('AR')]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([
        {
          project_id: 100,
          is_lead: true,
          obj_clarisa_project: {
            id: 100,
            shortName: 'LeadProj',
            organizationCode: 1,
          },
        },
        {
          project_id: 200,
          is_lead: false,
          obj_clarisa_project: {
            id: 200,
            shortName: 'P-CIP',
            organizationCode: 67,
          },
        },
      ]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'AR', institutionId: 1 },
        { code: 'CIP', institutionId: 67 },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([21]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
      expect(roleByUserRepo.getUserIdsByCenter).toHaveBeenCalledWith('CIP');
      expect(roleByUserRepo.getUserIdsByCenter).not.toHaveBeenCalledWith('AR');
      const [, type, userIds, , , suffix] = lastEmitCall();
      expect(type).toBe(NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED);
      expect(userIds).toEqual([21]);
      // Acronym, not the full institution name — and the project label carries " of your center".
      expect(suffix).toBe(
        'reported by AR has tagged the P-CIP of your center. Click to see the result.',
      );
    });

    // Reviewer FAIL issue 1 (attempt 2) — AC36: a project owned by the *reporting* Center is a
    // legitimate project target (only the lead PROJECT and the leading Center's own Center-tagged
    // row are excluded). Proves the emitter id travels through to `emitResultNotification`
    // untouched; the actual submitter-exclusion filtering is `notification.service.spec.ts`'s job,
    // per the DoD, so this test does not assert on which of EMITTER/42 ends up notified.
    it('notifies the other AfricaRice Center Users for an AfricaRice-owned project, passing the emitter id through (AC36)', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([leadingCenterRow('AR')]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([
        {
          project_id: 400,
          is_lead: false,
          obj_clarisa_project: {
            id: 400,
            shortName: 'P-AR',
            organizationCode: 1,
          },
        },
      ]);
      centerRepo.find.mockResolvedValueOnce([{ code: 'AR', institutionId: 1 }]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([EMITTER, 42]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(roleByUserRepo.getUserIdsByCenter).toHaveBeenCalledWith('AR');
      const [, type, , emitter] = lastEmitCall();
      expect(type).toBe(NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED);
      expect(emitter).toBe(EMITTER);
    });

    // Reviewer FAIL issue 3 (attempt 2) — the Center-code fallback (`acronym || code`). The
    // Leader note: the fixture's code ('AR-CODE-Z') deliberately differs from every acronym used
    // elsewhere in this describe block ('AR'), so an acronym/code mix-up in the implementation
    // could not pass this test by accident.
    it("falls back to the Center's code when the leading Center's institution has no acronym", async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        {
          center_id: 'AR-CODE-Z',
          is_leading_result: true,
          is_active: true,
          clarisa_center_object: {
            code: 'AR-CODE-Z',
            clarisa_institution: { name: 'Some Institution Without Acronym' },
          },
        },
        centerRow('CIP', 'CIP Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([21]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(lastEmitCall()[5]).toBe(
        'reported by AR-CODE-Z has tagged the CIP Name. Click to see the result.',
      );
    });

    // Reviewer FAIL issue 3 (attempt 2) — the fully degraded lead-in when no leading Center row
    // resolves at all, plus issue 2's ids-only log assertion for that same warning.
    it('falls back to "a CGIAR Center" when there is no leading Center row, and logs only the result id', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        centerRow('CIP', 'CIP Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([21]);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(lastEmitCall()[5]).toBe(
        'reported by a CGIAR Center has tagged the CIP Name. Click to see the result.',
      );
      expect(warnSpy).toHaveBeenCalledWith(
        `No reporting Center resolved for bilateral result ${RESULT_ID} — using the degraded lead-in`,
      );
    });

    it('notifies three hand-tagged Centers, one call per Center naming that Center, and never the reporting Center', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        leadingCenterRow('AR'),
        centerRow('CIP', 'CIP Name'),
        centerRow('IITA', 'IITA Name'),
        centerRow('ICRISAT', 'ICRISAT Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter
        .mockResolvedValueOnce([1])
        .mockResolvedValueOnce([2])
        .mockResolvedValueOnce([3]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        3,
      );
      expect(roleByUserRepo.getUserIdsByCenter).not.toHaveBeenCalledWith('AR');
      const labels = notificationService.emitResultNotification.mock.calls.map(
        (call) => call[5],
      );
      expect(labels[0]).toContain('CIP Name');
      expect(labels[1]).toContain('IITA Name');
      expect(labels[2]).toContain('ICRISAT Name');
    });

    it('sends one notification with the project text when a Center is both derived and a project owner (AC37)', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        leadingCenterRow('AR'),
        centerRow('CIP', 'CIP Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([
        {
          project_id: 200,
          is_lead: false,
          obj_clarisa_project: {
            id: 200,
            shortName: 'P-CIP',
            organizationCode: 67,
          },
        },
      ]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'CIP', institutionId: 67 },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValue([21]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
      expect(lastEmitCall()[1]).toBe(
        NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
      );
      expect(lastEmitCall()[5]).toContain('P-CIP of your center');
    });

    it('does not re-notify a user already told about this result (AC32)', async () => {
      notificationRepo.find.mockResolvedValueOnce([{ target_user: 21 }]);
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        leadingCenterRow('AR'),
        centerRow('CIP', 'CIP Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([21]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('does notify a Center newly added before re-submission, while an already-notified Center stays silent (AC32)', async () => {
      notificationRepo.find.mockResolvedValueOnce([{ target_user: 21 }]);
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        leadingCenterRow('AR'),
        centerRow('CIP', 'CIP Name'),
        centerRow('IITA', 'IITA Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter
        .mockResolvedValueOnce([21])
        .mockResolvedValueOnce([99]);

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
      expect(lastEmitCall()[2]).toEqual([99]);
      expect(lastEmitCall()[5]).toContain('IITA Name');
    });

    it('skips a Center with zero Center Users without throwing, and still notifies the others (AC31)', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([
        leadingCenterRow('AR'),
        centerRow('CIP', 'CIP Name'),
        centerRow('IITA', 'IITA Name'),
      ]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([5]);

      await expect(
        service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER),
      ).resolves.toBeUndefined();

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
      expect(lastEmitCall()[5]).toContain('IITA Name');
    });

    it('skips a project whose owner cannot be resolved and still notifies the remaining targets (AC38)', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsByProjectsRepo.find.mockResolvedValueOnce([
        {
          project_id: 300,
          is_lead: false,
          obj_clarisa_project: {
            id: 300,
            shortName: 'Unresolvable',
            organizationCode: null,
            sourceCenterAcronym: null,
          },
        },
      ]);
      resultsCenterRepo.find.mockResolvedValueOnce([
        leadingCenterRow('AR'),
        centerRow('IITA', 'IITA Name'),
      ]);
      centerRepo.find.mockResolvedValueOnce([]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([5]);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
      expect(lastEmitCall()[1]).toBe(NotificationTypeEnum.RESULT_CENTER_TAGGED);
      expect(lastEmitCall()[5]).toContain('IITA Name');
      // BCT-NFR-6: ids only — the result id and the project id, never the label or a user id
      // from the fixture (e.g. 'IITA', 'IITA Name', the recipient id 5).
      expect(warnSpy).toHaveBeenCalledWith(
        `No owning centre resolved for bilateral project 300 on result ${RESULT_ID} — skipping its tagged-project notification`,
      );
      const [loggedMessage] = warnSpy.mock.calls[0];
      expect(loggedMessage).not.toContain('IITA');
      expect(loggedMessage).not.toContain('5');
    });

    it('swallows a thrown repository error rather than letting it escape (BCT-NFR-1), logging only the result id', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockRejectedValueOnce(new Error('boom'));
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await expect(
        service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER),
      ).resolves.toBeUndefined();

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
      // BCT-NFR-6: the catch-all log carries the result id and the (generic, non-PII) error
      // message only — nothing from any fixture's users or labels, because none were reached.
      expect(warnSpy).toHaveBeenCalledWith(
        `Failed to emit bilateral tagging notifications for result ${RESULT_ID}: boom`,
      );
    });

    // BCT-NFR-2: no dependency on user_notification_settings exists on the constructor at all
    // (see the `service = new ResultTaggedNotificationService(...)` call above) — every other
    // test in this describe block would already fail if the method tried to read one, since it
    // is not among the injected repositories.
    it('completes using only the repositories the constructor declares (no notification-settings read, BCT-NFR-2)', async () => {
      resultRepo.findOne.mockResolvedValue(pendingReviewBilateralResult);
      resultsCenterRepo.find.mockResolvedValueOnce([leadingCenterRow('AR')]);
      resultsByProjectsRepo.find.mockResolvedValueOnce([]);

      await expect(
        service.notifyBilateralContributorsOnSubmission(RESULT_ID, EMITTER),
      ).resolves.toBeUndefined();
    });
  });
});
