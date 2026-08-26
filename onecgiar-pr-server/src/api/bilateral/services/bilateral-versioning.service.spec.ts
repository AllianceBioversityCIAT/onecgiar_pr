import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BilateralVersioningService } from './bilateral-versioning.service';
import { SourceEnum } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

describe('BilateralVersioningService', () => {
  const ACTIVE_PHASE = { id: 7, phase_name: 'Reporting 2026' };
  const STAR = { id: 12, name: 'STAR', acronym: 'STAR' };

  /** An approved API result sitting in the 2025 phase — the shape that can be carried forward. */
  const approvedPreviousPhase = (overrides: any = {}) => ({
    id: 31921,
    result_code: '28565',
    version_id: 6,
    is_active: true,
    source: SourceEnum.Bilateral,
    status_id: ResultStatusData.Approved.value,
    result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    external_platform_id: STAR.id,
    obj_result_by_initiatives: [
      { initiative_id: 51, initiative_role_id: 1, is_active: true },
    ],
    ...overrides,
  });

  const makeService = (options: any = {}) => {
    const source = options.source ?? approvedPreviousPhase();
    const rowsByPhase = options.rowsByPhase ?? [source];
    const created = options.created ?? {
      ...source,
      id: 99001,
      version_id: ACTIVE_PHASE.id,
    };

    // `find` is called both to list every version of a code and to locate the new row after
    // replication, so the stub returns the pre-replication set until versionProcessV2 runs.
    let replicated = false;

    const resultRepository = {
      find: jest.fn(async () =>
        replicated ? [...rowsByPhase, created] : rowsByPhase,
      ),
      findOne: jest.fn(async () => source),
      update: jest.fn(async () => ({ affected: 1 })),
    };
    const versionRepository = {
      // `'phase' in options`, not `??` — passing `phase: null` is how a test says "no open
      // phase", and `??` would quietly hand back the active one instead.
      findOne: jest.fn(async () =>
        'phase' in options ? options.phase : ACTIVE_PHASE,
      ),
    };
    const versioningService = {
      versionProcessV2: jest.fn(async () => {
        replicated = true;
        return {};
      }),
    };
    const resultsCenterRepository = {
      getAllResultsCenterByResultId: jest.fn(async () => options.centers ?? []),
    };
    const userRepository = {
      findOne: jest.fn(async () => ({
        id: 1776,
        email: 'admin@prms.pr',
        first_name: 'Admin',
        last_name: 'PRMS',
      })),
    };

    const service = new BilateralVersioningService(
      resultRepository as any,
      versionRepository as any,
      versioningService as any,
      resultsCenterRepository as any,
      userRepository as any,
    );
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    return {
      service,
      resultRepository,
      versioningService,
      resultsCenterRepository,
    };
  };

  const run = (service: BilateralVersioningService, body: any = {}) =>
    service.versionResult(
      { result_code: '28565', ...body } as any,
      STAR as any,
    );

  it('carries an approved previous-phase result forward and leaves it in Draft', async () => {
    const { service, versioningService, resultRepository } = makeService();

    const response = await run(service);

    // The entity is the result's own role-1 Science Program: the caller sends a code, nothing more.
    expect(versioningService.versionProcessV2).toHaveBeenCalledWith(
      31921,
      51,
      expect.objectContaining({ id: 1776 }),
    );
    expect(resultRepository.update).toHaveBeenCalledWith(
      { id: 99001 },
      expect.objectContaining({ status_id: ResultStatusData.Draft.value }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        result_code: '28565',
        previous: { result_id: 31921, phase_id: 6 },
        current: expect.objectContaining({
          result_id: 99001,
          phase_id: ACTIVE_PHASE.id,
          status: 'draft',
          status_id: ResultStatusData.Draft.value,
        }),
      }),
    );
  });

  it('echoes external_reference back so the caller can match its own record', async () => {
    const { service } = makeService();
    const response = await run(service, { external_reference: 'STAR-9f2c' });
    expect(response.external_reference).toBe('STAR-9f2c');
  });

  it('rejects a blank result_code', async () => {
    const { service } = makeService();
    await expect(
      service.versionResult({ result_code: '  ' } as any, STAR as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a result_code that matches nothing active', async () => {
    const { service } = makeService({ rowsByPhase: [] });
    await expect(run(service)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses when the result only exists in the current phase', async () => {
    const onlyCurrent = approvedPreviousPhase({ version_id: ACTIVE_PHASE.id });
    const { service } = makeService({
      source: onlyCurrent,
      rowsByPhase: [onlyCurrent],
      created: { ...onlyCurrent, id: 1 },
    });
    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
  });

  // Carried forward once. A second call must not put a rival row in the same phase.
  it('refuses when a version already exists in the current phase', async () => {
    const source = approvedPreviousPhase();
    const { service, versioningService } = makeService({
      rowsByPhase: [
        source,
        { ...source, id: 99001, version_id: ACTIVE_PHASE.id },
      ],
    });
    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
    expect(versioningService.versionProcessV2).not.toHaveBeenCalled();
  });

  it('refuses a W1/W2 result — this endpoint is only for bilaterals', async () => {
    const { service } = makeService({
      source: approvedPreviousPhase({ source: SourceEnum.Result }),
    });
    await expect(run(service)).rejects.toBeInstanceOf(BadRequestException);
  });

  // Knowledge Products are owned by CGSpace; the platform-wide block stays.
  it('refuses a Knowledge Product', async () => {
    const { service, versioningService } = makeService({
      source: approvedPreviousPhase({
        result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
      }),
    });
    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
    expect(versioningService.versionProcessV2).not.toHaveBeenCalled();
  });

  it.each([
    ['editing', ResultStatusData.Editing.value],
    ['submitted', ResultStatusData.Submitted.value],
    ['pending review', ResultStatusData.PendingReview.value],
    ['rejected', ResultStatusData.Rejected.value],
  ])('refuses a result that is %s, not approved', async (_label, statusId) => {
    const { service } = makeService({
      source: approvedPreviousPhase({ status_id: statusId }),
    });
    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses when there is no open reporting phase', async () => {
    const { service } = makeService({ phase: null });
    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
  });

  describe('ownership', () => {
    it('refuses a platform that did not report the result', async () => {
      const { service, versioningService } = makeService({
        source: approvedPreviousPhase({ external_platform_id: 999 }),
      });
      await expect(run(service)).rejects.toBeInstanceOf(ForbiddenException);
      expect(versioningService.versionProcessV2).not.toHaveBeenCalled();
    });

    it('refuses when the API key resolved no platform', async () => {
      const { service } = makeService();
      await expect(
        service.versionResult({ result_code: '28565' } as any, undefined),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    // No originating platform means a centre authored it in the tool, so the lead centre is
    // the only thing tying the request to the data.
    it('falls back to the lead centre when the result has no originating platform', async () => {
      const { service, versioningService } = makeService({
        source: approvedPreviousPhase({ external_platform_id: null }),
        centers: [
          { code: 'CENTER-11', is_leading_result: 0 },
          { code: 'CENTER-02', is_leading_result: 1 },
        ],
      });

      await run(service);

      expect(versioningService.versionProcessV2).toHaveBeenCalled();
    });

    it('refuses when the lead centre is outside the platform scope', async () => {
      const { service } = makeService({
        source: approvedPreviousPhase({ external_platform_id: null }),
        centers: [{ code: 'CENTER-11', is_leading_result: 1 }],
      });
      await expect(run(service)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses when there is neither platform nor lead centre', async () => {
      const { service } = makeService({
        source: approvedPreviousPhase({ external_platform_id: null }),
        centers: [{ code: 'CENTER-11', is_leading_result: 0 }],
      });
      await expect(run(service)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a platform with no configured centre scope', async () => {
      const { service } = makeService({
        source: approvedPreviousPhase({ external_platform_id: null }),
        centers: [{ code: 'CENTER-02', is_leading_result: 1 }],
      });
      await expect(
        service.versionResult(
          { result_code: '28565' } as any,
          {
            id: 77,
            acronym: 'UNKNOWN_TOOL',
          } as any,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('refuses when the result has no primary Science Program', async () => {
    const { service } = makeService({
      source: approvedPreviousPhase({
        obj_result_by_initiatives: [
          { initiative_id: 60, initiative_role_id: 2, is_active: true },
        ],
      }),
    });
    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
  });

  // A silent no-op would otherwise be reported as a success.
  it('does not report success when replication left no row', async () => {
    const source = approvedPreviousPhase();
    const resultRepository = {
      find: jest.fn(async () => [source]),
      findOne: jest.fn(async () => source),
      update: jest.fn(),
    };
    const service = new BilateralVersioningService(
      resultRepository as any,
      { findOne: jest.fn(async () => ACTIVE_PHASE) } as any,
      { versionProcessV2: jest.fn(async () => ({})) } as any,
      { getAllResultsCenterByResultId: jest.fn(async () => []) } as any,
      { findOne: jest.fn(async () => ({ id: 1776 })) } as any,
    );
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
    expect(resultRepository.update).not.toHaveBeenCalled();
  });
});
