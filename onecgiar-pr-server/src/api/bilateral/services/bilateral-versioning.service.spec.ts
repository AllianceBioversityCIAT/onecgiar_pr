import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { BilateralVersioningService } from './bilateral-versioning.service';
import { SourceEnum } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

/**
 * What this service still owns after the eligibility rules moved to
 * `BilateralVersioningRulesService`: **who may ask** on the API side — a platform, not a user
 * — and the two things the API path does afterwards, which are landing the copy in Draft and
 * refusing to report success when replication left nothing.
 *
 * The eligibility rules themselves are tested in the rules service's own spec, once, because
 * the reporting tool path shares them.
 */
describe('BilateralVersioningService', () => {
  const ACTIVE_PHASE = { id: 7, phase_name: 'Reporting 2026' };
  const STAR = { id: 12, name: 'STAR', acronym: 'STAR' };

  const approvedPreviousPhase = (overrides: any = {}) => ({
    id: 31921,
    result_code: '28565',
    version_id: 6,
    is_active: true,
    source: SourceEnum.Bilateral,
    status_id: ResultStatusData.Approved.value,
    result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    external_platform_id: STAR.id,
    ...overrides,
  });

  const makeService = (options: any = {}) => {
    const source = options.source ?? approvedPreviousPhase();
    const created =
      options.created === undefined
        ? { ...source, id: 99001, version_id: ACTIVE_PHASE.id }
        : options.created;

    const resultRepository = { update: jest.fn(async () => ({ affected: 1 })) };
    const rules = {
      getActiveReportingPhase: jest.fn(async () => ACTIVE_PHASE),
      resolveVersionableResult: jest.fn(async () => source),
      resolveTargetEntityId: jest.fn(async () => 51),
      findInPhase: jest.fn(async () => created),
    };
    const versioningService = { versionProcessV2: jest.fn(async () => ({})) };
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
      rules as any,
      versioningService as any,
      resultsCenterRepository as any,
      userRepository as any,
    );
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    return { service, resultRepository, rules, versioningService };
  };

  const run = (service: BilateralVersioningService, body: any = {}) =>
    service.versionResult(
      { result_code: '28565', ...body } as any,
      STAR as any,
    );

  it('carries the result forward and leaves it in Draft', async () => {
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

  it('rejects a blank result_code before touching anything', async () => {
    const { service, rules } = makeService();
    await expect(
      service.versionResult({ result_code: '  ' } as any, STAR as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rules.getActiveReportingPhase).not.toHaveBeenCalled();
  });

  it('defers eligibility to the shared rules', async () => {
    const { service, rules } = makeService();
    await run(service);
    expect(rules.resolveVersionableResult).toHaveBeenCalledWith(
      '28565',
      ACTIVE_PHASE.id,
    );
  });

  // A silent no-op would otherwise be reported as a success.
  it('does not report success when replication left no row', async () => {
    const { service, resultRepository } = makeService({ created: null });

    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
    expect(resultRepository.update).not.toHaveBeenCalled();
  });

  describe('ownership — the one check the API path owns', () => {
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
});
