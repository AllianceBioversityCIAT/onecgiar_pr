import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BilateralVersioningRulesService } from './bilateral-versioning-rules.service';
import { SourceEnum } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

/**
 * These rules decide what may be carried into a new phase, and they are shared by both
 * versioning entry points — the API (P2-3228) and the reporting tool (P2-3229). Testing them
 * here rather than once per caller is the point of the extraction: if the two paths ever
 * disagree about eligibility, it is because someone changed this file, and these tests are
 * what will say so.
 */
describe('BilateralVersioningRulesService', () => {
  const ACTIVE_PHASE = { id: 7, phase_name: 'Reporting 2026' };

  const approvedPreviousPhase = (overrides: any = {}) => ({
    id: 31921,
    result_code: '28565',
    version_id: 6,
    is_active: true,
    source: SourceEnum.Bilateral,
    status_id: ResultStatusData.Approved.value,
    result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    obj_result_by_initiatives: [
      { initiative_id: 51, initiative_role_id: 1, is_active: true },
    ],
    ...overrides,
  });

  const makeService = (options: any = {}) => {
    const rows = options.rows ?? [approvedPreviousPhase()];
    const resultRepository = {
      find: jest.fn(async () => rows),
      findOne: jest.fn(async () => options.withRelations ?? rows[0]),
      query: jest.fn(async () => options.centerRows ?? []),
    };
    const versionRepository = {
      findOne: jest.fn(async () =>
        'phase' in options ? options.phase : ACTIVE_PHASE,
      ),
    };
    return {
      service: new BilateralVersioningRulesService(
        resultRepository as any,
        versionRepository as any,
      ),
      resultRepository,
    };
  };

  describe('getActiveReportingPhase', () => {
    it('returns the open reporting phase', async () => {
      const { service } = makeService();
      await expect(service.getActiveReportingPhase()).resolves.toEqual(
        ACTIVE_PHASE,
      );
    });

    it('refuses when no phase is open', async () => {
      const { service } = makeService({ phase: null });
      await expect(service.getActiveReportingPhase()).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('resolveVersionableResult', () => {
    const resolve = (service: BilateralVersioningRulesService) =>
      service.resolveVersionableResult('28565', ACTIVE_PHASE.id);

    it('returns the previous-phase row when everything checks out', async () => {
      const { service } = makeService();
      await expect(resolve(service)).resolves.toEqual(
        expect.objectContaining({ id: 31921, version_id: 6 }),
      );
    });

    it('refuses a code that matches nothing active', async () => {
      const { service } = makeService({ rows: [] });
      await expect(resolve(service)).rejects.toBeInstanceOf(NotFoundException);
    });

    // Carried forward once. A second call must not put a rival row in the same phase.
    it('refuses when a version already exists in the current phase', async () => {
      const source = approvedPreviousPhase();
      const { service } = makeService({
        rows: [source, { ...source, id: 99001, version_id: ACTIVE_PHASE.id }],
      });
      await expect(resolve(service)).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses when the result only exists in the current phase', async () => {
      const { service } = makeService({
        rows: [approvedPreviousPhase({ version_id: ACTIVE_PHASE.id })],
      });
      await expect(resolve(service)).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a W1/W2 result', async () => {
      const { service } = makeService({
        rows: [approvedPreviousPhase({ source: SourceEnum.Result })],
      });
      await expect(resolve(service)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    // CGSpace owns their metadata; the block is platform-wide, not an API gap.
    it('refuses a Knowledge Product', async () => {
      const { service } = makeService({
        rows: [
          approvedPreviousPhase({
            result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
          }),
        ],
      });
      await expect(resolve(service)).rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      ['editing', ResultStatusData.Editing.value],
      ['submitted', ResultStatusData.Submitted.value],
      ['pending review', ResultStatusData.PendingReview.value],
      ['rejected', ResultStatusData.Rejected.value],
    ])('refuses a result that is %s, not approved', async (_l, statusId) => {
      const { service } = makeService({
        rows: [approvedPreviousPhase({ status_id: statusId })],
      });
      await expect(resolve(service)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('resolveTargetEntityId', () => {
    it('returns the role-1 initiative of the result', async () => {
      const { service } = makeService();
      await expect(
        service.resolveTargetEntityId(approvedPreviousPhase() as any, '28565'),
      ).resolves.toBe(51);
    });

    it('ignores an inactive role-1 row', async () => {
      const { service } = makeService({
        withRelations: {
          obj_result_by_initiatives: [
            { initiative_id: 51, initiative_role_id: 1, is_active: false },
          ],
        },
      });
      await expect(
        service.resolveTargetEntityId(approvedPreviousPhase() as any, '28565'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses when there is no primary Science Program', async () => {
      const { service } = makeService({
        withRelations: {
          obj_result_by_initiatives: [
            { initiative_id: 60, initiative_role_id: 2, is_active: true },
          ],
        },
      });
      await expect(
        service.resolveTargetEntityId(approvedPreviousPhase() as any, '28565'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('resolveLeadCenterCode', () => {
    it('returns the leading centre code', async () => {
      const { service } = makeService({ centerRows: [{ code: 'CENTER-02' }] });
      await expect(service.resolveLeadCenterCode(31921)).resolves.toBe(
        'CENTER-02',
      );
    });

    it('returns null when the result has no leading centre', async () => {
      const { service } = makeService({ centerRows: [] });
      await expect(service.resolveLeadCenterCode(31921)).resolves.toBeNull();
    });
  });

  describe('findInPhase', () => {
    it('finds the row for a given phase', async () => {
      const source = approvedPreviousPhase();
      const { service } = makeService({
        rows: [source, { ...source, id: 99001, version_id: ACTIVE_PHASE.id }],
      });
      await expect(
        service.findInPhase('28565', ACTIVE_PHASE.id),
      ).resolves.toEqual(expect.objectContaining({ id: 99001 }));
    });

    it('returns undefined when the phase has no row', async () => {
      const { service } = makeService();
      await expect(
        service.findInPhase('28565', ACTIVE_PHASE.id),
      ).resolves.toBeUndefined();
    });
  });
});
