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
 * What this service still owns: refusing to report success when replication left nothing.
 * The shared replicator creates the copy in Editing; this API path must leave it there for
 * Submit for Review.
 *
 * `assertCallerMayVersion` — "who may ask" on the API side — moved to
 * `BilateralVersioningRulesService` (`@akili-spec changes/bilateral-create-upsert-by-code`,
 * UBC-DD-6), shared with `create`'s resolve step. Its exhaustive cases now live in the rules
 * service's own spec; the `ownership` block below only proves this service delegates to it
 * and honours its rejection.
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
        ? {
            ...source,
            id: 99001,
            version_id: ACTIVE_PHASE.id,
            status_id: ResultStatusData.Editing.value,
          }
        : options.created;

    const rules = {
      getActiveReportingPhase: jest.fn(async () => ACTIVE_PHASE),
      resolveVersionableResult: jest.fn(async () => source),
      resolveTargetEntityId: jest.fn(async () => 51),
      findInPhase: jest.fn(async () => created),
      assertCallerMayVersion:
        options.assertCallerMayVersion ?? jest.fn(async () => undefined),
    };
    const versioningService = { versionProcessV2: jest.fn(async () => ({})) };
    const userRepository = {
      findOne: jest.fn(async () => ({
        id: 1776,
        email: 'admin@prms.pr',
        first_name: 'Admin',
        last_name: 'PRMS',
      })),
    };

    const service = new BilateralVersioningService(
      rules as any,
      versioningService as any,
      userRepository as any,
    );
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);

    return { service, rules, versioningService };
  };

  const run = (service: BilateralVersioningService, body: any = {}) =>
    service.versionResult(
      { result_code: '28565', ...body } as any,
      STAR as any,
    );

  it('carries the result forward in Editing for Submit for Review', async () => {
    const { service, versioningService } = makeService();

    const response = await run(service);

    // The entity is the result's own role-1 Science Program: the caller sends a code, nothing more.
    expect(versioningService.versionProcessV2).toHaveBeenCalledWith(
      31921,
      51,
      expect.objectContaining({ id: 1776 }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        result_code: '28565',
        previous: { result_id: 31921, phase_id: 6 },
        current: expect.objectContaining({
          result_id: 99001,
          phase_id: ACTIVE_PHASE.id,
          status: 'editing',
          status_id: ResultStatusData.Editing.value,
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
    const { service } = makeService({ created: null });

    await expect(run(service)).rejects.toBeInstanceOf(ConflictException);
  });

  // @akili-spec changes/bilateral-create-upsert-by-code — UBC-DD-6: the exhaustive ownership
  // cases (foreign platform, lead-centre fallback, unscoped platform, ...) now live in
  // versioning-rules/bilateral-versioning-rules.service.spec.ts, describe('assertCallerMayVersion
  // — ownership shared by /version and create'), against the real implementation. This is
  // strictly narrower on purpose: it proves versionResult calls that method with the source and
  // platform it resolved, and that a rejection from it stops the flow before replication — not
  // a second copy of the eligibility matrix.
  describe('ownership — delegated to the shared rule', () => {
    it('calls the shared rule with the resolved source and the calling platform', async () => {
      const { service, rules } = makeService();
      await run(service);
      expect(rules.assertCallerMayVersion).toHaveBeenCalledWith(
        approvedPreviousPhase(),
        '28565',
        STAR,
      );
    });

    it('propagates the shared rule rejection and never replicates', async () => {
      const { service, versioningService } = makeService({
        assertCallerMayVersion: jest
          .fn()
          .mockRejectedValue(new ForbiddenException('not yours')),
      });
      await expect(run(service)).rejects.toBeInstanceOf(ForbiddenException);
      expect(versioningService.versionProcessV2).not.toHaveBeenCalled();
    });
  });
});
