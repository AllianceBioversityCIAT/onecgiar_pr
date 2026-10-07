import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  BilateralResubmissionService,
  ResubmissionPreflightPort,
  ResubmissionWritersPort,
} from './bilateral-resubmission.service';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { createClosedWorld } from '../../../shared/test/closed-world.test-helper';
import {
  createInMemoryDb,
  EntityClass,
  Row,
} from '../../../shared/test/in-memory-db.test-helper';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { ResultsByProjects } from '../../results/results_by_projects/entities/results_by_projects.entity';
import { NonPooledProjectBudget } from '../../results/result_budget/entities/non_pooled_proyect_budget.entity';
import { ResultsCenter } from '../../results/results-centers/entities/results-center.entity';
import { ResultsTocResult } from '../../results/results-toc-results/entities/results-toc-result.entity';
import { ResultsTocResultIndicators } from '../../results/results-toc-results/entities/results-toc-results-indicators.entity';
import { ResultIndicatorTarget } from '../../results/results-toc-results/entities/result-toc-result-target-indicators.entity';
import { ResultTocSdgTargets } from '../../results/results-toc-results/entities/result-toc-sdg-target.entity';
import { ResultTocImpactArea } from '../../results/results-toc-results/entities/result-toc-impact-area-target.entity';
import { ResultTocActionArea } from '../../results/results-toc-results/entities/result-toc-action-area.entity';
import { ShareResultRequest } from '../../results/share-result-request/entities/share-result-request.entity';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { ResultCountrySubnational } from '../../results/result-countries-sub-national/entities/result-country-subnational.entity';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultsByInititiative } from '../../results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultReviewHistory } from '../../results/result-review-history/entities/result-review-history.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaProjectMapping } from '../../../clarisa/clarisa-projects/entity/clarisa-project-mapping.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { PrimaryProgramRequestService } from '../../results/share-result-request/services/primary-program-request.service';

// The skeleton and preflight cases never reach the writers (the pipeline is spied or refused earlier).
const passingWriters = (): ResubmissionWritersPort => ({
  countResolvablePartners: jest.fn().mockResolvedValue(1),
  readOwnerInitiativeId: jest.fn().mockResolvedValue(6),
  writeResult: jest.fn().mockResolvedValue(undefined),
  requestPrimary: jest
    .fn()
    .mockResolvedValue({ ok: true, shareResultRequestId: 1 }),
  announcePendingReview: jest.fn().mockResolvedValue(undefined),
});

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-2 (RSB-DD-4, NFR Concurrency).
// The skeleton owns only: lock -> re-read status -> hand off to the pipeline placeholder
// (T-3..T-5). Every case runs the real service against a fake QueryRunner, so "nothing was
// written" is a claim about the SQL actually issued, not an assumption.
describe('BilateralResubmissionService (RSB-T-2)', () => {
  const REJECTED = ResultStatusData.Rejected.value;
  const target = { id: 501, result_code: 28565, status_id: REJECTED } as any;
  // The skeleton cases below do not care about the preflight: a port that lets everything pass.
  const passingPort = (): ResubmissionPreflightPort => ({
    validateTypeSpecificPayload: jest.fn().mockResolvedValue(undefined),
    validateGeoFocus: jest.fn().mockResolvedValue(undefined),
    assertNoDuplicateEvidenceLinks: jest.fn(),
    validateTocMappingInitiatives: jest.fn().mockResolvedValue(undefined),
    resolveContributingProjects: jest.fn().mockResolvedValue({
      resolvedProjects: new Map(),
      payloadLeadProjectId: 77,
    }),
    resolveInitiative: jest.fn().mockResolvedValue({ id: 6, code: 'SP06' }),
    isAligned: jest.fn().mockResolvedValue(true),
    ensureUniqueTitle: jest.fn().mockResolvedValue(undefined),
    isLeadCenterResolvable: jest.fn().mockResolvedValue(true),
    resolveContributorInitiativeIds: jest.fn().mockResolvedValue([]),
    resolveUsers: jest
      .fn()
      .mockResolvedValue({ userId: 9, submittedUserId: 9 }),
  });
  const params = (): any => ({
    target,
    // Enough for the (all-passing) preflight: a primary + a title.
    bilateralDto: {
      result_type_id: 8,
      title: 'Title',
      toc_mapping: { science_program_id: 'SP06' },
    },
    platform: { id: 12, acronym: 'STAR' },
    preflight: passingPort(),
    writers: passingWriters(),
  });

  const arrange = (
    opts: {
      lock?: number | null;
      statusRows?: Array<{ status_id: number }>;
      connectError?: Error;
    } = {},
  ) => {
    const statusRows = opts.statusRows ?? [{ status_id: REJECTED }];
    // Closed world (T-3 advisory B): the connection answers the lock plumbing and the status read;
    // any other statement, and any other method of the runner or the data source, is a violation.
    const world = createClosedWorld();
    const query = jest.fn(async (sql: string) => {
      // `null` is MySQL's answer when GET_LOCK itself errors (RSB-T-2 advisory, T-5 pointer 9).
      if (sql.includes('GET_LOCK'))
        return [{ acquired: 'lock' in opts ? opts.lock : 1 }];
      if (sql.includes('RELEASE_LOCK')) return [{ released: 1 }];
      if (/select\s+status_id/i.test(sql)) return statusRows;
      world.violations.push(`queryRunner.query(${sql.slice(0, 40)})`);
      throw new Error(`unexpected SQL in test: ${sql}`);
    });
    const queryRunner = world.fake('queryRunner', {
      connect: jest.fn(async () => {
        if (opts.connectError) throw opts.connectError;
      }),
      query,
      release: jest.fn().mockResolvedValue(undefined),
    });
    const dataSource = world.fake('dataSource', {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    });
    const service = new BilateralResubmissionService(dataSource as any);
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
    return { service, queryRunner, query, world };
  };

  const sqlOf = (query: jest.Mock) =>
    query.mock.calls.map((call) => String(call[0]));

  it('takes GET_LOCK("rsb:<id>", 0) on a dedicated runner, re-reads the status, then hands off to the pipeline', async () => {
    const { service, query, queryRunner } = arrange();
    const pipeline = jest
      .spyOn(service as any, 'runResubmissionPipeline')
      .mockResolvedValue({ id: 501 });

    await service.resubmit(params());

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('GET_LOCK'),
      ['rsb:501', 0],
    );
    expect(sqlOf(query)[1]).toMatch(/select\s+status_id/i);
    expect(pipeline).toHaveBeenCalledTimes(1);
    expect(pipeline).toHaveBeenCalledWith(expect.objectContaining({ target }));
    // Released on the same runner, after the hand-off.
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('RELEASE_LOCK'),
      ['rsb:501'],
    );
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('lock already held -> 409 "already being resubmitted"; the pipeline never runs and nothing is written', async () => {
    const { service, query, queryRunner } = arrange({ lock: 0 });
    const pipeline = jest.spyOn(service as any, 'runResubmissionPipeline');

    await expect(service.resubmit(params())).rejects.toMatchObject({
      status: 409,
      message: 'Result 28565 is already being resubmitted.',
    });

    expect(pipeline).not.toHaveBeenCalled();
    // Only the failed GET_LOCK was issued: no status read, no RELEASE_LOCK for a lock never
    // obtained, no write. The runner is still returned to the pool.
    expect(sqlOf(query)).toHaveLength(1);
    expect(sqlOf(query)[0]).toContain('GET_LOCK');
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    [ResultStatusData.PendingReview.value, 'pending review'],
    [ResultStatusData.Approved.value, 'approved'],
    [ResultStatusData.Draft.value, 'draft'],
  ])(
    'status changed under us to %s -> 409 naming code and "%s" (re-read after the lock); lock released, pipeline never runs',
    async (statusId, statusName) => {
      const { service, query } = arrange({
        statusRows: [{ status_id: statusId }],
      });
      const pipeline = jest.spyOn(service as any, 'runResubmissionPipeline');

      const attempt = service.resubmit(params());
      await expect(attempt).rejects.toMatchObject({ status: 409 });
      await expect(attempt).rejects.toThrow('28565');
      await expect(attempt).rejects.toThrow(statusName);

      expect(pipeline).not.toHaveBeenCalled();
      expect(query).toHaveBeenLastCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['rsb:501'],
      );
    },
  );

  it('the row vanished between resolve and lock -> refused, lock released, nothing written', async () => {
    const { service, query } = arrange({ statusRows: [] });

    await expect(service.resubmit(params())).rejects.toMatchObject({
      status: 404,
    });

    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('RELEASE_LOCK'),
      ['rsb:501'],
    );
  });

  // RSB-T-2 advisory (reliability), carried to T-5 as pointer 9: GET_LOCK answers NULL when it
  // ERRORS. That is not "somebody else is resubmitting" (409), it is a fault the platform can retry.
  it('GET_LOCK answering NULL (an error) -> 503, NOT the 409 "already being resubmitted"; the pipeline never runs', async () => {
    const { service, query, queryRunner } = arrange({ lock: null });
    const pipeline = jest.spyOn(service as any, 'runResubmissionPipeline');

    const attempt = service.resubmit(params());
    await expect(attempt).rejects.toMatchObject({ status: 503 });
    await expect(attempt).rejects.not.toThrow('already being resubmitted');

    expect(pipeline).not.toHaveBeenCalled();
    // No lock was obtained, so none is released; the runner still goes back to the pool.
    expect(sqlOf(query)).toHaveLength(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('GET_LOCK answering 0 is the 409 (somebody else holds it), and a string "0" too', async () => {
    for (const lock of [0, '0' as any]) {
      const { service } = arrange({ lock });
      await expect(service.resubmit(params())).rejects.toMatchObject({
        status: 409,
        message: 'Result 28565 is already being resubmitted.',
      });
    }
  });

  it('releases the lock and the runner even when the pipeline throws something else', async () => {
    const { service, query, queryRunner } = arrange();
    jest
      .spyOn(service as any, 'runResubmissionPipeline')
      .mockRejectedValue(new Error('boom'));

    await expect(service.resubmit(params())).rejects.toThrow('boom');

    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('RELEASE_LOCK'),
      ['rsb:501'],
    );
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('a RELEASE_LOCK failure never masks the pipeline outcome', async () => {
    const { service, query } = arrange();
    jest
      .spyOn(service as any, 'runResubmissionPipeline')
      .mockResolvedValue({ id: 501 });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('GET_LOCK')) return [{ acquired: 1 }];
      if (/select\s+status_id/i.test(sql)) return [{ status_id: REJECTED }];
      throw new Error('release failed');
    });

    await expect(service.resubmit(params())).resolves.toEqual({ id: 501 });
  });

  it('does not issue RELEASE_LOCK nor release a runner that never connected', async () => {
    const { service, query, queryRunner } = arrange({
      connectError: new Error('no connection'),
    });

    await expect(service.resubmit(params())).rejects.toThrow('no connection');

    expect(query).not.toHaveBeenCalled();
    expect(queryRunner.release).not.toHaveBeenCalled();
  });

  it('the lock name is derived from the result id (two results do not contend)', async () => {
    const { service, query } = arrange();
    jest
      .spyOn(service as any, 'runResubmissionPipeline')
      .mockResolvedValue({ id: 777 });

    await service.resubmit({ ...params(), target: { ...target, id: 777 } });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('GET_LOCK'),
      ['rsb:777', 0],
    );
  });

  it('refusals are ConflictException instances (HTTP 409 through the global filter)', async () => {
    const { service } = arrange({ lock: 0 });
    await expect(service.resubmit(params())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-3 (RSB-R-8, R-12, R-13, R-16; DD-1, DD-2,
// DD-7). The preflight is the only thing between the lock and the first write, so these cases pin
// (a) the ORDER of its steps, (b) that a refusal at step N never reaches step N+1, and (c) that
// nothing but the lock/status SQL is ever issued before the end of the preflight (the first thing
// the pipeline does after it is `writers.readOwnerInitiativeId`, a read that these cases make throw
// a sentinel). What each port
// member really does (and that it writes nothing) is proven through `BilateralService.create()` in
// `bilateral.service.spec.ts`, against the real repositories' spies.
describe('BilateralResubmissionService preflight (RSB-T-3)', () => {
  const REJECTED = ResultStatusData.Rejected.value;
  const target = {
    id: 501,
    result_code: 28565,
    status_id: REJECTED,
    version_id: 36,
  } as any;
  // RSB-T-5: past the preflight the pipeline reads the stored owner, then resets and writes. These
  // cases stop right there, with a sentinel, so "the preflight passed and wrote nothing" stays a
  // claim about the preflight alone.
  const AFTER_PREFLIGHT = 'RSB-T-3 spec: the preflight passed';
  const stopAfterPreflight = (): ResubmissionWritersPort => ({
    ...passingWriters(),
    readOwnerInitiativeId: jest.fn(async () => {
      throw new ConflictException(AFTER_PREFLIGHT);
    }),
  });
  const PLACEHOLDER = AFTER_PREFLIGHT;

  const dtoWith = (overrides: Record<string, unknown> = {}): any => ({
    result_type_id: 8,
    title: 'Corrected title',
    evidence: [{ link: 'https://example.org/a' }],
    contributing_programs: [{ science_program_id: 'SP01' }],
    contributing_bilateral_projects: [{ grant_title: 'P1' }],
    toc_mapping: { science_program_id: ' sp06 ' },
    ...overrides,
  });

  // The label each port member leaves in `calls`, in the order the task fixes.
  const LABELS: Record<keyof ResubmissionPreflightPort, string> = {
    validateTypeSpecificPayload: 'type',
    validateGeoFocus: 'geo',
    assertNoDuplicateEvidenceLinks: 'evidence',
    validateTocMappingInitiatives: 'tocInitiatives',
    resolveContributingProjects: 'projects',
    resolveInitiative: 'initiative',
    isAligned: 'aligned',
    ensureUniqueTitle: 'title',
    isLeadCenterResolvable: 'leadCenter',
    resolveContributorInitiativeIds: 'contributors',
    resolveUsers: 'users',
  };

  /** `impls` replaces the passing default of a member; every member is tracked in `calls`. */
  const arrange = (
    impls: Partial<
      Record<keyof ResubmissionPreflightPort, (...a: any[]) => any>
    > = {},
  ) => {
    const calls: string[] = [];
    const defaults: Record<
      keyof ResubmissionPreflightPort,
      (...a: any[]) => any
    > = {
      validateTypeSpecificPayload: async () => undefined,
      validateGeoFocus: async () => undefined,
      assertNoDuplicateEvidenceLinks: () => undefined,
      validateTocMappingInitiatives: async () => undefined,
      resolveContributingProjects: async () => ({
        resolvedProjects: new Map(),
        payloadLeadProjectId: 77,
        leadProjectCount: 1,
      }),
      resolveInitiative: async () => ({ id: 6, code: 'SP06' }),
      isAligned: async () => true,
      ensureUniqueTitle: async () => undefined,
      isLeadCenterResolvable: async () => true,
      resolveContributorInitiativeIds: async () => [3, 4],
      resolveUsers: async () => ({ userId: 9, submittedUserId: 10 }),
    };
    const port = Object.fromEntries(
      (Object.keys(defaults) as Array<keyof ResubmissionPreflightPort>).map(
        (key) => [
          key,
          jest.fn((...args: any[]) => {
            calls.push(LABELS[key]);
            return (impls[key] ?? defaults[key])(...args);
          }),
        ],
      ),
    ) as unknown as Record<keyof ResubmissionPreflightPort, jest.Mock>;

    // Closed world (T-3 advisory B, delivered in T-4): the data source answers `createQueryRunner`
    // and the runner answers the lock plumbing + the status read. EVERYTHING else (a manager, a
    // transaction, a repository, a write statement) is a recorded violation, so the writers T-5
    // adds cannot slip in unnoticed behind a hand-kept list of spies.
    const world = createClosedWorld();
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('GET_LOCK')) return [{ acquired: 1 }];
      if (sql.includes('RELEASE_LOCK')) return [{ released: 1 }];
      if (/select\s+status_id/i.test(sql)) return [{ status_id: REJECTED }];
      world.violations.push(`queryRunner.query(${sql.slice(0, 40)})`);
      throw new Error(`unexpected SQL in test: ${sql}`);
    });
    const dataSource = world.fake('dataSource', {
      createQueryRunner: jest.fn().mockReturnValue(
        world.fake('queryRunner', {
          connect: jest.fn().mockResolvedValue(undefined),
          query,
          release: jest.fn().mockResolvedValue(undefined),
        }),
      ),
    });
    const service = new BilateralResubmissionService(dataSource as any);
    const logSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    ['warn', 'error'].forEach((level) =>
      jest
        .spyOn((service as any).logger, level)
        .mockImplementation(() => undefined),
    );
    const run = (dto: any = dtoWith()) =>
      service.resubmit({
        target,
        bilateralDto: dto,
        platform: { id: 12, acronym: 'STAR' } as any,
        preflight: port as unknown as ResubmissionPreflightPort,
        writers: stopAfterPreflight(),
      });
    return { run, port, calls, query, logSpy, world, service };
  };

  const issuedSql = (query: jest.Mock) =>
    query.mock.calls.map((call) => String(call[0])).join('\n');

  const expectNothingWritten = (
    query: jest.Mock,
    world?: { violations: string[] },
  ) => {
    expect(issuedSql(query)).not.toMatch(/\b(insert|update|delete|replace)\b/i);
    if (world) expect(world.violations).toEqual([]);
  };

  it('runs the steps in the order the task fixes (users LAST, T-4), then the pipeline moves on to the owner read', async () => {
    const { run, calls, query, world, service } = arrange();
    const resetSpy = jest.spyOn(service, 'resetSectionsForResubmission');

    await expect(run()).rejects.toMatchObject({
      status: 409,
      message: PLACEHOLDER,
    });

    expect(calls).toEqual([
      'type',
      'geo',
      'evidence',
      'tocInitiatives',
      'projects',
      'initiative',
      'aligned',
      'title',
      'leadCenter',
      'contributors',
      'users',
    ]);
    // Zero writes, in a closed world: no manager, no transaction, no repository, no write SQL.
    expectNothingWritten(query, world);
    // The reset is the first WRITE of the pipeline and it comes after the preflight: nothing in the
    // preflight itself calls it (RSB-R-8).
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('hands each step the payload piece it validates, and the title check excludes the result itself (R-16)', async () => {
    const { run, port } = arrange();
    const dto = dtoWith();

    await expect(run(dto)).rejects.toMatchObject({ status: 409 });

    expect(port.validateTypeSpecificPayload).toHaveBeenCalledWith(dto);
    expect(port.validateGeoFocus).toHaveBeenCalledWith(dto);
    expect(port.assertNoDuplicateEvidenceLinks).toHaveBeenCalledWith(
      dto.evidence,
    );
    expect(port.validateTocMappingInitiatives).toHaveBeenCalledWith(
      dto.toc_mapping,
      dto.contributing_programs,
    );
    expect(port.resolveContributingProjects).toHaveBeenCalledWith(
      dto.contributing_bilateral_projects,
    );
    // The primary is normalised the way every other lookup of an SP code is.
    expect(port.resolveInitiative).toHaveBeenCalledWith('SP06');
    // Only the payload's lead project counts (DD-7 amended, R-23): there is no stored fallback.
    expect(port.isAligned).toHaveBeenCalledWith(77, 6);
    expect(port.ensureUniqueTitle).toHaveBeenCalledWith(
      'Corrected title',
      36,
      501,
    );
    // The users are resolved from the payload, after every validation.
    expect(port.resolveUsers).toHaveBeenCalledWith(dto);
  });

  it('the preflight result carries what T-5 will consume: projects, primary, lead project and the resolved users (T-3 forward pointer)', async () => {
    const { service, port } = arrange();
    const resolvedProjects = new Map([['P1', { id: 77 }]]);
    port.resolveContributingProjects.mockResolvedValue({
      resolvedProjects,
      payloadLeadProjectId: 77,
    });

    const result = await (service as any).runPreflight({
      target,
      bilateralDto: dtoWith(),
      platform: { id: 12, acronym: 'STAR' },
      preflight: port,
    });

    expect(result).toEqual({
      resolvedProjects,
      primary: { initiativeId: 6, code: 'SP06' },
      leadProjectId: 77,
      userId: 9,
      submittedUserId: 10,
      // RSF-P-13: handed to the role-2 reset (RSF-T-6).
      contributorInitiativeIds: [3, 4],
    });
  });

  describe('each refusal writes nothing and never reaches a later step', () => {
    it.each([
      [
        'type-specific payload',
        {
          validateTypeSpecificPayload: async () => {
            throw new BadRequestException('Invalid innovation use level: 77.');
          },
        },
        400,
        'Invalid innovation use level: 77.',
        ['type'],
      ],
      [
        'geo_focus / country lookup',
        {
          validateGeoFocus: async () => {
            throw new NotFoundException(
              'No countries found matching any of the provided identifiers: ids=99999, names=N/A.',
            );
          },
        },
        404,
        'No countries found matching any of the provided identifiers: ids=99999, names=N/A.',
        ['type', 'geo'],
      ],
      [
        'duplicate evidence links',
        {
          assertNoDuplicateEvidenceLinks: () => {
            throw new BadRequestException(
              'Duplicate links found in the evidence',
            );
          },
        },
        400,
        'Duplicate links found in the evidence',
        ['type', 'geo', 'evidence'],
      ],
      [
        'science program unknown to CLARISA',
        {
          validateTocMappingInitiatives: async () => {
            throw new BadRequestException(
              'The following science_program_id(s) do not exist in CLARISA: SP99.',
            );
          },
        },
        400,
        'The following science_program_id(s) do not exist in CLARISA: SP99.',
        ['type', 'geo', 'evidence', 'tocInitiatives'],
      ],
      [
        'unresolvable contributing project',
        {
          resolveContributingProjects: async () => {
            throw new BadRequestException(
              'contributing_bilateral_projects: no project matches grant_title "P1".',
            );
          },
        },
        400,
        'contributing_bilateral_projects: no project matches grant_title "P1".',
        ['type', 'geo', 'evidence', 'tocInitiatives', 'projects'],
      ],
    ])('%s', async (_label, impls, status, message, expectedCalls) => {
      const { run, port, calls, query, world } = arrange(impls as any);

      await expect(run()).rejects.toMatchObject({ status, message });

      // Everything up to and including the failing step ran; nothing after it.
      expect(calls).toEqual(expectedCalls);
      expect(port.ensureUniqueTitle).not.toHaveBeenCalled();
      expect(port.isAligned).not.toHaveBeenCalled();
      // The users are resolved last: no validation refusal can leave a user row behind.
      expect(port.resolveUsers).not.toHaveBeenCalled();
      expectNothingWritten(query, world);
      // The lock is still released on the refusal path.
      expect(query).toHaveBeenLastCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['rsb:501'],
      );
    });

    it('no primary Science Program (R-13) -> 400 naming the code; alignment and title never checked', async () => {
      const { run, calls, query, world } = arrange();

      const attempt = run(dtoWith({ toc_mapping: {} }));
      await expect(attempt).rejects.toMatchObject({ status: 400 });
      await expect(attempt).rejects.toThrow(
        'Result 28565 cannot be resubmitted without a primary Science Program (toc_mapping.science_program_id).',
      );

      expect(calls).toEqual([
        'type',
        'geo',
        'evidence',
        'tocInitiatives',
        'projects',
      ]);
      expectNothingWritten(query, world);
    });

    it.each([
      ['missing toc_mapping', { toc_mapping: undefined }],
      [
        'blank science_program_id',
        { toc_mapping: { science_program_id: '  ' } },
      ],
      [
        'null science_program_id',
        { toc_mapping: { science_program_id: null } },
      ],
    ])('no primary: %s', async (_label, overrides) => {
      const { run, calls } = arrange();
      await expect(run(dtoWith(overrides))).rejects.toMatchObject({
        status: 400,
      });
      expect(calls).not.toContain('aligned');
      expect(calls).not.toContain('title');
    });

    it('primary not allocated to the lead project (R-12) -> 400 naming the SP and the result; title never checked', async () => {
      const { run, calls, query, world } = arrange({
        isAligned: async () => false,
      });

      const attempt = run(
        dtoWith({ toc_mapping: { science_program_id: 'sp09' } }),
      );
      await expect(attempt).rejects.toMatchObject({ status: 400 });
      await expect(attempt).rejects.toThrow(
        'SP09 is not allocated to the lead project of result 28565.',
      );

      expect(calls).not.toContain('title');
      expectNothingWritten(query, world);
    });

    // RSB-R-23 (T-3 Pivot Record, user decision 2026-10-06): the payload must yield the lead project
    // the create writers will store. No stored fallback: the T-4 reset deactivates the stored ones.
    it('no lead project in the payload (none sent, or several with none flagged) -> 400 naming the result, zero writes, alignment/title/users never reached', async () => {
      const { run, port, calls, query, world } = arrange({
        resolveContributingProjects: async () => ({
          resolvedProjects: new Map(),
          payloadLeadProjectId: null,
        }),
      });

      const attempt = run();
      await expect(attempt).rejects.toMatchObject({ status: 400 });
      await expect(attempt).rejects.toThrow(
        'Result 28565 cannot be resubmitted without a lead bilateral project (one project, or one flagged is_lead).',
      );

      expect(calls).toEqual([
        'type',
        'geo',
        'evidence',
        'tocInitiatives',
        'projects',
      ]);
      expect(port.isAligned).not.toHaveBeenCalled();
      expect(port.ensureUniqueTitle).not.toHaveBeenCalled();
      expect(port.resolveUsers).not.toHaveBeenCalled();
      expectNothingWritten(query, world);
    });

    it('a primary CLARISA does not know -> the same 400 (cannot be allocated)', async () => {
      const { run, port } = arrange({ resolveInitiative: async () => null });

      await expect(run()).rejects.toThrow(
        'SP06 is not allocated to the lead project of result 28565.',
      );
      expect(port.isAligned).not.toHaveBeenCalled();
    });

    it('a title equal to ANOTHER result (R-16) -> 400, before the users, nothing written', async () => {
      const { run, calls, query, world, port } = arrange({
        ensureUniqueTitle: async () => {
          throw new BadRequestException(
            'A result with the title "Corrected title" already exists.',
          );
        },
      });

      await expect(run()).rejects.toMatchObject({
        status: 400,
        message: 'A result with the title "Corrected title" already exists.',
      });
      expect(calls).toEqual([
        'type',
        'geo',
        'evidence',
        'tocInitiatives',
        'projects',
        'initiative',
        'aligned',
        'title',
      ]);
      expect(port.resolveUsers).not.toHaveBeenCalled();
      expectNothingWritten(query, world);
    });

    it('a users refusal ("User email is required.") is the last step and still writes nothing to the result', async () => {
      const { run, calls, query, world } = arrange({
        resolveUsers: async () => {
          throw new BadRequestException('User email is required.');
        },
      });

      await expect(run()).rejects.toMatchObject({
        status: 400,
        message: 'User email is required.',
      });

      expect(calls[calls.length - 1]).toBe('users');
      // No reset, no manager, no transaction: the refusal precedes every result write.
      expectNothingWritten(query, world);
      expect(query).toHaveBeenLastCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['rsb:501'],
      );
    });
  });

  // @akili-spec bilateral/resubmit-followups — RSF-T-4 (RSF-R-5, R-6, R-11; DD-6; P-13). Same layout
  // as the refusals above, plus every writer of the pipeline as a spy: one call before the throw is
  // a failure.
  describe('RSF-T-4: one lead project, a resolvable lead centre, the contributor ids', () => {
    const LEADS_400 =
      'Result 28565 cannot be resubmitted: 2 bilateral projects are flagged is_lead; flag exactly one.';
    const centre400 = (value: string) =>
      `Result 28565 cannot be resubmitted: lead_center ${value} does not match a CGIAR center.`;

    /** Runs the real service with EVERY writer a spy (not the sentinel-throwing set of `arrange`). */
    const runWithWriterSpies = (
      impls: Parameters<typeof arrange>[0],
      dto: any,
    ) => {
      const harness = arrange(impls);
      const writers = passingWriters();
      const attempt = harness.service.resubmit({
        target,
        bilateralDto: dto,
        platform: { id: 12, acronym: 'STAR' } as any,
        preflight: harness.port as unknown as ResubmissionPreflightPort,
        writers,
      });
      const expectNoWriterCalled = () => {
        Object.entries(writers).forEach(([name, fn]) =>
          expect([name, (fn as jest.Mock).mock.calls.length]).toEqual([
            name,
            0,
          ]),
        );
        expectNothingWritten(harness.query, harness.world);
      };
      return { ...harness, attempt, writers, expectNoWriterCalled };
    };

    it('two flagged lead projects -> 400 naming the result and the count, right after the lead-project check; no writer, no later step', async () => {
      const { attempt, calls, port, expectNoWriterCalled, logSpy } =
        runWithWriterSpies(
          {
            resolveContributingProjects: async () => ({
              resolvedProjects: new Map(),
              payloadLeadProjectId: 78,
              leadProjectCount: 2,
            }),
          },
          dtoWith(),
        );

      await expect(attempt).rejects.toMatchObject({
        status: 400,
        message: LEADS_400,
      });

      expect(calls).toEqual([
        'type',
        'geo',
        'evidence',
        'tocInitiatives',
        'projects',
      ]);
      expect(port.isAligned).not.toHaveBeenCalled();
      expect(port.ensureUniqueTitle).not.toHaveBeenCalled();
      expect(port.isLeadCenterResolvable).not.toHaveBeenCalled();
      expect(port.resolveUsers).not.toHaveBeenCalled();
      expectNoWriterCalled();
      // R-11: the existing RSB-R-21 line, the status only; never the payload.
      expect(logSpy.mock.calls.map((call) => String(call[0]))).toEqual([
        'result_code=28565 operation=updated platform=STAR outcome=rejected(400)',
      ]);
    });

    it.each([
      ['a lone project (count 1)', 1],
      ['one flagged among three (count 1)', 1],
    ])(
      '%s passes the lead count and reaches the owner read',
      async (_label, count) => {
        const { run, calls } = arrange({
          resolveContributingProjects: async () => ({
            resolvedProjects: new Map(),
            payloadLeadProjectId: 77,
            leadProjectCount: count,
          }),
        });

        await expect(run()).rejects.toMatchObject({
          status: 409,
          message: PLACEHOLDER,
        });
        expect(calls).toContain('users');
      },
    );

    it.each([
      ['acronym wins', { acronym: 'ZZ', name: 'Zed Institute' }, 'ZZ'],
      ['then the name', { name: 'Zed Institute' }, 'Zed Institute'],
      ['then the institution id', { institution_id: 9 }, '9'],
      ['an empty object', {}, '(empty)'],
    ])(
      'an unresolvable lead_center (%s) -> 400 with the value sent, never the object; no writer, users never reached',
      async (_label, leadCenter, value) => {
        const dto = dtoWith({ lead_center: leadCenter });
        const { attempt, calls, port, expectNoWriterCalled } =
          runWithWriterSpies(
            { isLeadCenterResolvable: async () => false },
            dto,
          );

        await expect(attempt).rejects.toMatchObject({
          status: 400,
          message: centre400(value),
        });

        expect(port.isLeadCenterResolvable).toHaveBeenCalledWith(leadCenter);
        // Everything up to the lead centre ran; the contributors and the users did not.
        expect(calls[calls.length - 1]).toBe('leadCenter');
        expect(port.resolveContributorInitiativeIds).not.toHaveBeenCalled();
        expect(port.resolveUsers).not.toHaveBeenCalled();
        expectNoWriterCalled();
      },
    );

    it('the unresolvable lead_center leaves one RSB-R-21 line (rejected(400)), without the payload', async () => {
      const { attempt, logSpy } = runWithWriterSpies(
        { isLeadCenterResolvable: async () => false },
        dtoWith({ lead_center: { acronym: 'ZZ' } }),
      );

      await expect(attempt).rejects.toMatchObject({ status: 400 });

      const lines = logSpy.mock.calls.map((call) => String(call[0]));
      expect(lines).toEqual([
        'result_code=28565 operation=updated platform=STAR outcome=rejected(400)',
      ]);
      expect(lines.join(' | ')).not.toContain('ZZ');
    });

    it('a resolvable lead_center passes, and the contributor ids come from the payload programs', async () => {
      const { run, port } = arrange();
      const dto = dtoWith({ lead_center: { acronym: 'IITA' } });

      await expect(run(dto)).rejects.toMatchObject({
        status: 409,
        message: PLACEHOLDER,
      });

      expect(port.isLeadCenterResolvable).toHaveBeenCalledWith({
        acronym: 'IITA',
      });
      expect(port.resolveContributorInitiativeIds).toHaveBeenCalledWith(
        dto.contributing_programs,
      );
    });
  });

  it('a preflight refusal leaves one RSB-R-21 line (outcome=rejected(status)) and never the payload', async () => {
    const { run, logSpy } = arrange({ isAligned: async () => false });

    await expect(run()).rejects.toMatchObject({ status: 400 });

    const lines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(lines).toEqual([
      'result_code=28565 operation=updated platform=STAR outcome=rejected(400)',
    ]);
    expect(lines.join('\n')).not.toContain('Corrected title');
  });
});

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-4 (RSB-R-4, R-15, R-18; DD-5; design §7
// "Section reset"). The reset runs against an IN-MEMORY manager: the tables are arrays of rows,
// `find` and `update` honour the criteria they are given (including `In`), and every case asserts
// the rows that are left ACTIVE. That is a stronger claim than "update was called with X", but it
// is still a model of the database, not the database: the behavioural proof over real MySQL rows is
// RSB-T-7 (tasks.md T-4 "Gap").
describe('BilateralResubmissionService.resetSectionsForResubmission (RSB-T-4)', () => {
  const RESULT = 501;
  const OTHER_RESULT = 999;
  const USER = 42;
  // The reset reads these keys off the rows it finds, so the seeds carry the REAL primary-key
  // property of each entity (not a generic `id`).
  const PK = new Map<EntityClass, string>([
    [ResultsTocResult, 'result_toc_result_id'],
    [ResultsTocResultIndicators, 'result_toc_result_indicator_id'],
    [ShareResultRequest, 'share_result_request_id'],
    [ResultCountry, 'result_country_id'],
  ]);

  /** `seed`: entity class -> rows (is_active written as 1 / 0, like the database does). */
  const arrange = (
    seed: Array<[EntityClass, Row[]]>,
    dbOptions: { failOnUpdate?: number } = {},
  ) => {
    const db = createInMemoryDb(seed, dbOptions);
    const service = new BilateralResubmissionService(db.dataSource);
    const active = (entity: EntityClass) =>
      db
        .rowsOf(entity)
        .filter((row) => db.isActive(entity, row.id))
        .filter((row) => row.result_id === RESULT)
        .map((row) => row.id);
    return {
      service,
      tables: db.tables,
      updated: db.updated,
      world: db.world,
      db,
      active,
      isActive: (entity: EntityClass, id: number) =>
        db.isActive(entity, id, PK.get(entity) ?? 'id'),
    };
  };

  const defaults = {
    userId: USER,
    resultTypeId: ResultTypeEnum.OTHER_OUTPUT,
    primaryChanged: false,
    payloadSendsPartners: true,
    // RSF-T-6: the SP ids the payload lists; 7 is the accepted contributor the role-2 fixtures keep.
    contributorInitiativeIds: [7],
  };
  const row = (id: number, extra: Row = {}): Row => ({
    id,
    result_id: RESULT,
    is_active: 1,
    ...extra,
  });

  it('evidence: two active links of the result are deactivated, another result is untouched', async () => {
    const { service, active, isActive, world } = arrange([
      [Evidence, [row(1), row(2), row(3, { result_id: OTHER_RESULT })]],
    ]);

    await service.resetSectionsForResubmission(RESULT, defaults);

    expect(active(Evidence)).toEqual([]);
    expect(isActive(Evidence, 3)).toBe(true);
    expect(world.violations).toEqual([]);
  });

  it('results_by_projects and their non_pooled_project_budget go together; budgets of other results survive', async () => {
    const { service, active, isActive } = arrange([
      [
        ResultsByProjects,
        [row(1), row(2), row(3, { result_id: OTHER_RESULT })],
      ],
      [
        NonPooledProjectBudget,
        [
          { id: 10, result_project_id: 1, is_active: 1 },
          { id: 11, result_project_id: 2, is_active: 1 },
          { id: 12, result_project_id: 3, is_active: 1 },
        ],
      ],
    ]);

    await service.resetSectionsForResubmission(RESULT, defaults);

    expect(active(ResultsByProjects)).toEqual([]);
    expect(isActive(NonPooledProjectBudget, 10)).toBe(false);
    expect(isActive(NonPooledProjectBudget, 11)).toBe(false);
    expect(isActive(NonPooledProjectBudget, 12)).toBe(true);
    expect(isActive(ResultsByProjects, 3)).toBe(true);
  });

  it('centres: every active NON-lead row goes (false or null flag); the lead row stays', async () => {
    const { service, isActive } = arrange([
      [
        ResultsCenter,
        [
          row(1, { is_leading_result: 1 }),
          row(2, { is_leading_result: 0 }),
          row(3, { is_leading_result: null }),
          row(4, { is_leading_result: 0, result_id: OTHER_RESULT }),
        ],
      ],
    ]);

    await service.resetSectionsForResubmission(RESULT, defaults);

    expect(isActive(ResultsCenter, 1)).toBe(true);
    expect(isActive(ResultsCenter, 2)).toBe(false);
    expect(isActive(ResultsCenter, 3)).toBe(false);
    expect(isActive(ResultsCenter, 4)).toBe(true);
  });

  it('ToC: results_toc_result, indicators, indicator targets, SDG, impact-area and action-area children are all deactivated; another result keeps its ToC', async () => {
    const { service, isActive } = arrange([
      [
        ResultsTocResult,
        [
          row(0, { result_toc_result_id: 10 }),
          row(0, { result_toc_result_id: 11 }),
          row(0, { result_toc_result_id: 12, result_id: OTHER_RESULT }),
        ],
      ],
      [
        ResultsTocResultIndicators,
        [
          {
            result_toc_result_indicator_id: 100,
            results_toc_results_id: 10,
            is_active: 1,
          },
          {
            result_toc_result_indicator_id: 101,
            results_toc_results_id: 12,
            is_active: 1,
          },
        ],
      ],
      [
        ResultIndicatorTarget,
        [
          { id: 1000, result_toc_result_indicator_id: 100, is_active: 1 },
          { id: 1001, result_toc_result_indicator_id: 101, is_active: 1 },
        ],
      ],
      [
        ResultTocSdgTargets,
        [
          { id: 200, result_toc_result_id: 11, is_active: 1 },
          { id: 201, result_toc_result_id: 12, is_active: 1 },
        ],
      ],
      [
        ResultTocImpactArea,
        [{ id: 300, result_toc_result_id: 10, is_active: 1 }],
      ],
      [
        ResultTocActionArea,
        [{ id: 400, result_toc_result_id: 11, is_active: 1 }],
      ],
    ]);

    await service.resetSectionsForResubmission(RESULT, defaults);

    for (const [entity, id] of [
      [ResultsTocResult, 10],
      [ResultsTocResult, 11],
      [ResultsTocResultIndicators, 100],
      [ResultIndicatorTarget, 1000],
      [ResultTocSdgTargets, 200],
      [ResultTocImpactArea, 300],
      [ResultTocActionArea, 400],
    ] as Array<[EntityClass, number]>) {
      expect(isActive(entity, id)).toBe(false);
    }
    for (const [entity, id] of [
      [ResultsTocResult, 12],
      [ResultsTocResultIndicators, 101],
      [ResultIndicatorTarget, 1001],
      [ResultTocSdgTargets, 201],
    ] as Array<[EntityClass, number]>) {
      expect(isActive(entity, id)).toBe(true);
    }
  });

  describe('share requests (Disqualifier: a filtered update, never the blanket logicalDelete)', () => {
    const request = (id: number, extra: Row): Row =>
      row(0, { share_result_request_id: id, ...extra });
    const requests = (): Row[] => [
      request(1, { request_type: 'contribution', request_status_id: 4 }),
      request(2, { request_type: 'contribution', request_status_id: 1 }),
      request(3, { request_type: 'primary', request_status_id: 2 }),
      request(4, { request_type: 'primary', request_status_id: 3 }),
      request(5, { request_type: 'primary', request_status_id: 1 }),
      request(6, {
        request_type: 'contribution',
        request_status_id: 4,
        is_active: 0,
      }),
      request(7, {
        request_type: 'contribution',
        request_status_id: 4,
        result_id: OTHER_RESULT,
      }),
    ];

    it('drafts, pending and declined rounds are deactivated; the ACCEPTED primary and other results survive', async () => {
      const { service, isActive, updated } = arrange([
        [ShareResultRequest, requests()],
      ]);

      await service.resetSectionsForResubmission(RESULT, defaults);

      expect(
        [1, 2, 4, 5].map((id) => isActive(ShareResultRequest, id)),
      ).toEqual([false, false, false, false]);
      expect(isActive(ShareResultRequest, 3)).toBe(true);
      expect(isActive(ShareResultRequest, 7)).toBe(true);
      // `share_result_request` has no last_updated_by column: only the flag is written.
      expect(
        updated
          .filter((u) => u.entity === 'ShareResultRequest')
          .map((u) => u.set),
      ).toEqual([{ is_active: false }]);
    });
  });

  // RSB-T-4 forward pointer 4 (delivered in T-5). The accepted PRIMARY row is the record of the
  // CURRENT owner. A same-owner resubmission keeps it; when the primary CHANGES the old owner is
  // retired (its role 1 goes too), so that row must go with it: `ppr.stateFor` would otherwise report
  // an ACCEPTED primary for an SP whose role 1 is deactivated.
  describe('the accepted primary row follows the owner (T-4 pointer 4)', () => {
    const seed = (): Array<[EntityClass, Row[]]> => [
      [
        ShareResultRequest,
        [
          row(0, {
            share_result_request_id: 3,
            request_type: 'primary',
            request_status_id: 2,
          }),
          row(0, {
            share_result_request_id: 4,
            request_type: 'primary',
            request_status_id: 1,
          }),
        ],
      ],
    ];

    it('primary UNCHANGED: the accepted primary row survives (only the pending round goes)', async () => {
      const { service, isActive } = arrange(seed());

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        primaryChanged: false,
      });

      expect(isActive(ShareResultRequest, 3)).toBe(true);
      expect(isActive(ShareResultRequest, 4)).toBe(false);
    });

    it('primary CHANGED: the accepted primary row of the old owner is deactivated too', async () => {
      const { service, isActive } = arrange(seed());

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        primaryChanged: true,
      });

      expect(isActive(ShareResultRequest, 3)).toBe(false);
      expect(isActive(ShareResultRequest, 4)).toBe(false);
    });
  });

  it('subnationals of every country row of the result go; another result keeps them', async () => {
    const { service, isActive } = arrange([
      [
        ResultCountry,
        [
          { id: 1, result_country_id: 1, result_id: RESULT, is_active: 1 },
          { id: 2, result_country_id: 2, result_id: RESULT, is_active: 0 },
          {
            id: 3,
            result_country_id: 3,
            result_id: OTHER_RESULT,
            is_active: 1,
          },
        ],
      ],
      [
        ResultCountrySubnational,
        [
          { id: 10, result_country_id: 1, is_active: 1 },
          { id: 11, result_country_id: 2, is_active: 1 },
          { id: 12, result_country_id: 3, is_active: 1 },
        ],
      ],
    ]);

    await service.resetSectionsForResubmission(RESULT, defaults);

    expect(isActive(ResultCountrySubnational, 10)).toBe(false);
    expect(isActive(ResultCountrySubnational, 11)).toBe(false);
    expect(isActive(ResultCountrySubnational, 12)).toBe(true);
  });

  describe('PARTNER institutions', () => {
    const institutions = (): Row[] => [
      row(1, { institution_roles_id: 2, institutions_id: 71 }),
      row(2, { institution_roles_id: 2, institutions_id: 72 }),
      row(3, { institution_roles_id: 8, institutions_id: 73 }),
      row(4, {
        institution_roles_id: 2,
        institutions_id: 74,
        result_id: OTHER_RESULT,
      }),
    ];

    it('the payload sends none: the active PARTNER rows are deactivated (role 8 and other results untouched)', async () => {
      const { service, isActive } = arrange([
        [ResultsByInstitution, institutions()],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        payloadSendsPartners: false,
      });

      expect(isActive(ResultsByInstitution, 1)).toBe(false);
      expect(isActive(ResultsByInstitution, 2)).toBe(false);
      expect(isActive(ResultsByInstitution, 3)).toBe(true);
      expect(isActive(ResultsByInstitution, 4)).toBe(true);
    });

    it('the payload sends some: the reset leaves them to updateInstitutions, the replace-safe writer (R-4: {A,B} -> {C} is proven against that writer in bilateral.service.spec)', async () => {
      const { service, isActive } = arrange([
        [ResultsByInstitution, institutions()],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        payloadSendsPartners: true,
      });

      expect(isActive(ResultsByInstitution, 1)).toBe(true);
      expect(isActive(ResultsByInstitution, 2)).toBe(true);
    });
  });

  describe('innovation use (tables enumerated from innovation-use.service.ts:399-486)', () => {
    const seed = (): Array<[EntityClass, Row[]]> => [
      [
        ResultActor,
        [
          row(1, { section_id: 1 }),
          row(2, { section_id: 2 }),
          row(3, { result_id: OTHER_RESULT }),
        ],
      ],
      [
        ResultsByInstitutionType,
        [
          { id: 10, results_id: RESULT, institution_roles_id: 5, is_active: 1 },
          { id: 11, results_id: RESULT, institution_roles_id: 6, is_active: 1 },
          {
            id: 12,
            results_id: OTHER_RESULT,
            institution_roles_id: 5,
            is_active: 1,
          },
        ],
      ],
      [ResultIpMeasure, [row(20), row(21, { result_id: OTHER_RESULT })]],
    ];

    it('Innovation Use: actors, organisation types (role 5 only) and measures are deactivated, every section', async () => {
      const { service, isActive } = arrange(seed());

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        resultTypeId: ResultTypeEnum.INNOVATION_USE,
      });

      expect(isActive(ResultActor, 1)).toBe(false);
      expect(isActive(ResultActor, 2)).toBe(false);
      expect(isActive(ResultActor, 3)).toBe(true);
      expect(isActive(ResultsByInstitutionType, 10)).toBe(false);
      expect(isActive(ResultsByInstitutionType, 11)).toBe(true);
      expect(isActive(ResultsByInstitutionType, 12)).toBe(true);
      expect(isActive(ResultIpMeasure, 20)).toBe(false);
      expect(isActive(ResultIpMeasure, 21)).toBe(true);
    });

    it('any other result type leaves those tables alone (they belong to other sections there)', async () => {
      const { service, isActive } = arrange(seed());

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        resultTypeId: ResultTypeEnum.POLICY_CHANGE,
      });

      expect(isActive(ResultActor, 1)).toBe(true);
      expect(isActive(ResultsByInstitutionType, 10)).toBe(true);
      expect(isActive(ResultIpMeasure, 20)).toBe(true);
    });
  });

  describe("the old owner's role 1 (DD-5)", () => {
    const initiatives = (): Row[] => [
      row(1, { initiative_role_id: 1, initiative_id: 6 }),
      row(2, { initiative_role_id: 2, initiative_id: 7 }),
    ];

    it('same primary: role 1 is NOT deactivated', async () => {
      const { service, isActive } = arrange([
        [ResultsByInititiative, initiatives()],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        primaryChanged: false,
      });

      expect(isActive(ResultsByInititiative, 1)).toBe(true);
      expect(isActive(ResultsByInititiative, 2)).toBe(true);
    });

    it('primary changed: role 1 is deactivated; role 2 (an accepted contributor) is not', async () => {
      const { service, isActive } = arrange([
        [ResultsByInititiative, initiatives()],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        primaryChanged: true,
      });

      expect(isActive(ResultsByInititiative, 1)).toBe(false);
      expect(isActive(ResultsByInititiative, 2)).toBe(true);
    });
  });

  // RSF-T-6 / RSF-R-7: role-2 rows follow the payload (replace). SP06 = initiative 6 (also the
  // primary in the first fixture), SP07 = initiative 7, SP08 = initiative 8.
  describe('accepted contributors follow the payload (RSF-R-7)', () => {
    const roleRows = (): Row[] => [
      row(1, { initiative_role_id: 1, initiative_id: 1 }),
      row(2, { initiative_role_id: 2, initiative_id: 6 }),
      row(3, { initiative_role_id: 2, initiative_id: 7 }),
      row(4, {
        initiative_role_id: 2,
        initiative_id: 8,
        result_id: OTHER_RESULT,
      }),
    ];
    const roleUpdates = (updated: Array<{ entity: string; where: Row }>) =>
      updated.filter((u) => u.entity === 'ResultsByInititiative');

    it('a contributor the payload no longer lists is deactivated; one still listed gets NO update call', async () => {
      const { service, isActive, updated } = arrange([
        [ResultsByInititiative, roleRows()],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        contributorInitiativeIds: [7],
      });

      expect(isActive(ResultsByInititiative, 2)).toBe(false); // SP06 dropped
      expect(isActive(ResultsByInititiative, 3)).toBe(true); // SP07 kept
      expect(isActive(ResultsByInititiative, 4)).toBe(true); // another result
      // Only the dropped row is written: the kept SP07 row is never named by any update.
      expect(roleUpdates(updated)).toHaveLength(1);
      expect((roleUpdates(updated)[0].where as Row).id.value).toEqual([2]);
    });

    it('an empty contributor list retires every role-2 row and makes no role-1 call', async () => {
      const { service, isActive, updated, world } = arrange([
        [ResultsByInititiative, roleRows()],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        primaryChanged: false,
        contributorInitiativeIds: [],
      });

      expect(isActive(ResultsByInititiative, 2)).toBe(false);
      expect(isActive(ResultsByInititiative, 3)).toBe(false);
      expect(isActive(ResultsByInititiative, 1)).toBe(true);
      expect(isActive(ResultsByInititiative, 4)).toBe(true);
      expect(
        roleUpdates(updated).every(
          (u) => (u.where as Row).initiative_role_id !== 1,
        ),
      ).toBe(true);
      expect(world.violations).toEqual([]);
    });

    it('the primary listed in contributing_programs too: this step never touches role 1', async () => {
      const { service, isActive, updated } = arrange([
        [ResultsByInititiative, roleRows()],
      ]);

      // Initiative 1 is the primary (role 1) AND appears in the list; no active role-2 row for it.
      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        primaryChanged: false,
        contributorInitiativeIds: [1],
      });

      expect(isActive(ResultsByInititiative, 1)).toBe(true);
      expect(
        roleUpdates(updated).map((u) => (u.where as Row).initiative_role_id),
      ).not.toContain(1);
      // The other two active role-2 rows of the result are retired.
      expect(isActive(ResultsByInititiative, 2)).toBe(false);
      expect(isActive(ResultsByInititiative, 3)).toBe(false);
    });

    it('an already inactive role-2 row is not touched again', async () => {
      const { service, updated } = arrange([
        [
          ResultsByInititiative,
          [row(2, { initiative_role_id: 2, initiative_id: 6, is_active: 0 })],
        ],
      ]);

      await service.resetSectionsForResubmission(RESULT, {
        ...defaults,
        contributorInitiativeIds: [],
      });

      expect(roleUpdates(updated)).toHaveLength(0);
    });
  });

  describe('what the reset must never do', () => {
    const everything = (): Array<[EntityClass, Row[]]> => [
      [Evidence, [row(1)]],
      [ResultsByProjects, [row(1)]],
      [ResultsCenter, [row(1, { is_leading_result: 0 })]],
      [ResultsTocResult, [row(0, { result_toc_result_id: 1 })]],
      [
        ShareResultRequest,
        [
          row(0, {
            share_result_request_id: 1,
            request_type: 'contribution',
            request_status_id: 4,
          }),
        ],
      ],
      [ResultsByInstitution, [row(1, { institution_roles_id: 2 })]],
      [ResultsByInititiative, [row(1, { initiative_role_id: 1 })]],
      [ResultActor, [row(1)]],
      // The history is permanent (RSB-R-18): earlier entries are never modified.
      [
        ResultReviewHistory,
        [
          { id: 1, result_id: RESULT, action: 'REJECT', is_active: 1 },
          { id: 2, result_id: RESULT, action: 'RESUBMIT', is_active: 1 },
        ],
      ],
    ];
    const full = {
      ...defaults,
      resultTypeId: ResultTypeEnum.INNOVATION_USE,
      primaryChanged: true,
      payloadSendsPartners: false,
    };

    it('never touches result_review_history (RSB-R-18): same rows before and after, and no update names it', async () => {
      const { service, tables, updated } = arrange(everything());
      const before = JSON.parse(
        JSON.stringify(tables.get(ResultReviewHistory)),
      );

      await service.resetSectionsForResubmission(RESULT, full);

      expect(tables.get(ResultReviewHistory)).toEqual(before);
      expect(updated.map((u) => u.entity)).not.toContain('ResultReviewHistory');
      expect(updated.length).toBeGreaterThan(0);
    });

    it('only ever flips is_active and stamps the user: no other column, no hard delete', async () => {
      const { service, updated, world } = arrange(everything());

      await service.resetSectionsForResubmission(RESULT, full);

      for (const { entity, set } of updated) {
        const stamp =
          entity === 'ShareResultRequest'
            ? { is_active: false }
            : { is_active: false, last_updated_by: USER };
        expect({ entity, set }).toEqual({ entity, set: stamp });
      }
      // Closed world: delete, remove, save, insert and raw query would all be violations.
      expect(world.violations).toEqual([]);
    });

    it('runs inside ONE transaction, so a failure part-way cannot leave a half-reset result', async () => {
      const { service, db } = arrange(everything());

      await service.resetSectionsForResubmission(RESULT, full);

      expect(db.transactions).toBe(1);
    });

    // T-4 advisory (B): the test above only counts transactions. This one injects the fault.
    it('a fault on the k-th update rolls the WHOLE reset back: no section is left half-reset', async () => {
      const { service, tables } = arrange(everything(), { failOnUpdate: 4 });
      // Only the tables that hold rows: reading an unseeded table creates an empty one.
      const rowsByTable = () =>
        JSON.parse(
          JSON.stringify(
            [...tables]
              .filter(([, rows]) => rows.length)
              .map(([entity, rows]) => [entity.name, rows]),
          ),
        );
      const before = rowsByTable();

      await expect(
        service.resetSectionsForResubmission(RESULT, full),
      ).rejects.toThrow('injected fault on update #4');

      expect(rowsByTable()).toEqual(before);
    });

    it('is idempotent: a retry after a failed attempt changes no row (every UPDATE finds nothing active)', async () => {
      const { service, tables } = arrange(everything());
      await service.resetSectionsForResubmission(RESULT, full);
      const afterFirst = JSON.parse(JSON.stringify([...tables.values()]));

      await service.resetSectionsForResubmission(RESULT, full);

      expect(JSON.parse(JSON.stringify([...tables.values()]))).toEqual(
        afterFirst,
      );
    });
  });
});

// @akili-spec bilateral/resubmit-rejected-result — RSB-T-5 (RSB-R-1, R-3, R-5, R-9, R-14, R-15, R-17,
// R-18, R-21; DD-3, DD-5, DD-6, DD-10). The pipeline runs against an IN-MEMORY model of the tables
// (rows, one-transaction rollback) and the REAL `PrimaryProgramRequestService.request` / `decline`
// over the same rows, so "the result is still Rejected", "no RESUBMIT row" and "the owner was
// retired" are observations, not call counts. The section WRITERS (`ResubmissionWritersPort.
// writeResult`) are fakes HERE: what they write is proven in `bilateral.service.spec.ts` against the
// real writers. It is a MODEL of the database, not the database: the behavioural proof over real
// MySQL rows is RSB-T-7.
describe('BilateralResubmissionService pipeline (RSB-T-5)', () => {
  const RESULT = 501;
  const SP01 = 1;
  const SP06 = 6;
  const USER = 9;
  const SUBMITTER = 10;
  const PENDING_REVIEW = ResultStatusData.PendingReview.value;
  const REJECTED = ResultStatusData.Rejected.value;
  const PK = new Map<EntityClass, string>([
    [ShareResultRequest, 'share_result_request_id'],
  ]);
  const initiativeIds: Record<string, number> = { SP01, SP06 };
  const codeOf = (id: number) => (id === SP01 ? 'SP01' : 'SP06');

  interface Setup {
    /** The stored owner (active role 1), or `null` for an ownerless result. */
    owner?: number | null;
    /** The payload's primary (default SP01: the same owner). */
    primary?: 'SP01' | 'SP06';
    /** Seed rows of the result's share requests (e.g. an accepted primary). */
    requests?: Row[];
    history?: Row[];
    /** Seed rows of the result's `results_by_institution`. */
    partners?: Row[];
    partnersResolved?: number;
    keepEditing?: boolean;
    /** Replaces the port's `requestPrimary` (default: the REAL `ppr.request` over the model). */
    requestPrimary?: ResubmissionWritersPort['requestPrimary'];
    /** Runs inside `writeResult`, after the snapshot (to simulate a fault or a concurrent change). */
    onWrite?: (db: ReturnType<typeof createInMemoryDb>) => void | Promise<void>;
    failOnInsertInto?: EntityClass;
  }

  const baseTarget = () =>
    ({
      id: RESULT,
      result_code: 28565,
      status_id: REJECTED,
      result_type_id: 8,
      version_id: 36,
    }) as any;

  // T-5 attempt 2 (advisory 4): nothing in a pipeline spec may touch the closed worlds' undeclared
  // members, whatever the assertions of the test itself say.
  const arranged: Array<{ violations: string[]; label: string }> = [];
  afterEach(() => {
    const seenViolations = arranged.flatMap(({ violations, label }) =>
      violations.map((v) => `${label}: ${v}`),
    );
    arranged.length = 0;
    expect(seenViolations).toEqual([]);
  });

  const arrange = (setup: Setup = {}) => {
    const owner = 'owner' in setup ? setup.owner : SP01;
    // Declared before `db` so the data source can hand the lock runner out.
    let statusRead: () => number = () => REJECTED;
    const world = createClosedWorld();
    const runner = world.fake('queryRunner', {
      connect: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(async (sql: string) => {
        if (sql.includes('GET_LOCK')) return [{ acquired: 1 }];
        if (sql.includes('RELEASE_LOCK')) return [{ released: 1 }];
        // The lock plumbing answers from the model: a status that changed is a status the re-read sees.
        if (/select\s+status_id/i.test(sql))
          return [{ status_id: statusRead() }];
        world.violations.push(`queryRunner.query(${sql.slice(0, 40)})`);
        throw new Error(`unexpected SQL in test: ${sql}`);
      }),
    });
    const db = createInMemoryDb(
      [
        [
          Result,
          [
            {
              id: RESULT,
              result_code: 28565,
              status_id: REJECTED,
              result_type_id: 8,
              version_id: 36,
              is_active: 1,
            },
          ],
        ],
        [
          ResultsByInititiative,
          owner
            ? [
                {
                  id: 1,
                  result_id: RESULT,
                  initiative_id: owner,
                  initiative_role_id: 1,
                  is_active: 1,
                },
              ]
            : [],
        ],
        [
          ResultsByProjects,
          [
            {
              id: 1,
              result_id: RESULT,
              project_id: 77,
              is_lead: 1,
              is_active: 1,
            },
          ],
        ],
        [ShareResultRequest, setup.requests ?? []],
        [ResultReviewHistory, setup.history ?? []],
        [ResultsByInstitution, setup.partners ?? []],
        // What `ppr.request` reads THROUGH THE TRANSACTION MANAGER (T-5 attempt 2: the request runs
        // inside the final transaction).
        [
          ClarisaProjectMapping,
          [
            {
              id: 1,
              projectId: 77,
              programCode: 'SP01',
              allocation: 10,
              status: 'Confirmed',
            },
            {
              id: 2,
              projectId: 77,
              programCode: 'SP06',
              allocation: 10,
              status: 'Confirmed',
            },
          ],
        ],
        [
          ClarisaInitiative,
          [
            { id: SP01, official_code: 'SP01', active: 1 },
            { id: SP06, official_code: 'SP06', active: 1 },
          ],
        ],
      ],
      {
        writes: true,
        pk: PK,
        failOnInsertInto: setup.failOnInsertInto,
        dataSourceReads: { createQueryRunner: () => runner },
      },
    );
    arranged.push(
      { violations: world.violations, label: 'queryRunner' },
      { violations: db.world.violations, label: 'db' },
    );
    const statusOf = () =>
      db.rowsOf(Result).find((row) => row.id === RESULT).status_id as number;
    statusRead = statusOf;
    const history = () =>
      db
        .rowsOf(ResultReviewHistory)
        .map(({ action, initiative_id, created_by }) => ({
          action,
          initiative_id,
          created_by,
        }));
    const activeOwner = () =>
      db
        .rowsOf(ResultsByInititiative)
        .find(
          (row) =>
            row.result_id === RESULT &&
            row.initiative_role_id === 1 &&
            db.isActive(ResultsByInititiative, row.id),
        )?.initiative_id ?? null;

    // The REAL primary-request service over the same rows (request + decline).
    const shareRepository = {
      ...db.repositoryOf(ShareResultRequest),
      manager: { transaction: (work: any) => db.dataSource.transaction(work) },
    };
    const ppr = new PrimaryProgramRequestService(
      shareRepository as any,
      {
        find: async () => [
          { id: SP01, official_code: 'SP01' },
          { id: SP06, official_code: 'SP06' },
        ],
        findOne: async ({ where }: any) => ({
          id: where.id,
          official_code: codeOf(where.id),
        }),
      } as any,
      db.repositoryOf(ResultsByProjects) as any,
      {
        find: async () => [
          { programCode: 'SP01', allocation: 10, status: 'Confirmed' },
          { programCode: 'SP06', allocation: 10, status: 'Confirmed' },
        ],
      } as any,
      { isUserAdmin: jest.fn().mockResolvedValue(true) } as any,
      {
        getAllResultsCenterByResultId: jest.fn().mockResolvedValue([]),
      } as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
    );
    ['log', 'warn', 'error'].forEach((level) =>
      jest
        .spyOn((ppr as any).logger, level)
        .mockImplementation(() => undefined),
    );

    // What the model looked like when each collaborator was called (the order falsifiers).
    const seen: Record<string, { status: number; history: number }> = {};
    const snapshot = (label: string) =>
      (seen[label] = { status: statusOf(), history: history().length });
    const calls: string[] = [];

    const writers: ResubmissionWritersPort = {
      countResolvablePartners: jest
        .fn()
        .mockResolvedValue(setup.partnersResolved ?? 1),
      readOwnerInitiativeId: jest.fn(async () => activeOwner()),
      // What the REAL writers leave behind that the rest of the pipeline relies on (the real ones are
      // proven in bilateral.service.spec.ts): the payload's lead project row (`ppr.request` re-reads
      // it) and, unless the primary changes, role 1 of the requested primary.
      writeResult: jest.fn(async (args) => {
        calls.push('writeResult');
        snapshot('writeResult');
        await db.repositoryOf(ResultsByProjects).insert({
          result_id: RESULT,
          project_id: 77,
          is_lead: 1,
        });
        if (!args.suppressPrimaryRole) {
          // `upsertResultInitiative`: reactivate the primary's row, or insert it.
          const primary =
            initiativeIds[args.bilateralDto.toc_mapping.science_program_id];
          const existing = db
            .rowsOf(ResultsByInititiative)
            .find(
              (r) => r.initiative_id === primary && r.initiative_role_id === 1,
            );
          if (existing) existing.is_active = 1;
          else
            await db.repositoryOf(ResultsByInititiative).insert({
              result_id: RESULT,
              initiative_id: primary,
              initiative_role_id: 1,
            });
        }
        await setup.onWrite?.(db);
      }),
      requestPrimary: jest.fn(
        async (resultId, initiativeId, userId, manager) => {
          calls.push('requestPrimary');
          snapshot('requestPrimary');
          return setup.requestPrimary
            ? setup.requestPrimary(resultId, initiativeId, userId, manager)
            : ppr.request(
                resultId,
                initiativeId,
                { id: userId } as any,
                manager,
                {
                  asDraft: false,
                },
              );
        },
      ),
      announcePendingReview: jest.fn(async () => {
        calls.push('announce');
        snapshot('announce');
      }),
    };
    const preflight: ResubmissionPreflightPort = {
      validateTypeSpecificPayload: jest.fn().mockResolvedValue(undefined),
      validateGeoFocus: jest.fn().mockResolvedValue(undefined),
      assertNoDuplicateEvidenceLinks: jest.fn(),
      validateTocMappingInitiatives: jest.fn().mockResolvedValue(undefined),
      resolveContributingProjects: jest.fn().mockResolvedValue({
        resolvedProjects: new Map([['P1', { id: 77 }]]),
        payloadLeadProjectId: 77,
      }),
      resolveInitiative: jest.fn(async (code: string) => ({
        id: initiativeIds[code],
        code,
      })),
      isAligned: jest.fn().mockResolvedValue(true),
      ensureUniqueTitle: jest.fn().mockResolvedValue(undefined),
      isLeadCenterResolvable: jest.fn().mockResolvedValue(true),
      resolveContributorInitiativeIds: jest.fn().mockResolvedValue([]),
      resolveUsers: jest
        .fn()
        .mockResolvedValue({ userId: USER, submittedUserId: SUBMITTER }),
    };

    const service = new BilateralResubmissionService(db.dataSource);
    const original = service.resetSectionsForResubmission.bind(service);
    const resetSpy = jest
      .spyOn(service, 'resetSectionsForResubmission')
      .mockImplementation(async (...args) => {
        calls.push('reset');
        snapshot('reset');
        return original(...args);
      });
    const logSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    ['warn', 'error'].forEach((level) =>
      jest
        .spyOn((service as any).logger, level)
        .mockImplementation(() => undefined),
    );

    const dto = (extra: Record<string, unknown> = {}): any => ({
      result_type_id: 8,
      title: 'Corrected title',
      toc_mapping: { science_program_id: setup.primary ?? 'SP01' },
      keep_editing: setup.keepEditing,
      ...extra,
    });
    const run = (payload: any = dto()) =>
      service.resubmit({
        target: baseTarget(),
        bilateralDto: payload,
        platform: { id: 12, acronym: 'STAR' } as any,
        preflight,
        writers,
      });
    return {
      db,
      ppr,
      service,
      writers,
      preflight,
      run,
      dto,
      resetSpy,
      logSpy,
      calls,
      seen,
      statusOf,
      history,
      activeOwner,
      runner,
      world,
    };
  };

  /** An accepted primary request row of SP01: the record of the current owner. */
  const acceptedPrimary = (): Row => ({
    share_result_request_id: 30,
    result_id: RESULT,
    request_type: 'primary',
    request_status_id: 2,
    shared_inititiative_id: SP01,
    owner_initiative_id: SP01,
    is_active: 1,
  });
  const activePrimaryRows = (db: ReturnType<typeof createInMemoryDb>) =>
    db
      .rowsOf(ShareResultRequest)
      .filter((row) =>
        db.isActive(
          ShareResultRequest,
          row.share_result_request_id,
          'share_result_request_id',
        ),
      )
      .filter((row) => row.request_type === 'primary')
      .map((row) => ({
        sp: row.shared_inititiative_id,
        status: row.request_status_id,
      }));

  describe('(a) same owner: nothing extra, announce once, owner intact', () => {
    it('keeps the owner and its accepted primary row, asks for no primary request, flips 7 -> 5 and announces ONCE, after the commit', async () => {
      const t = arrange({ requests: [acceptedPrimary()] });

      const outcome = await t.run();

      expect(outcome.status_id).toBe(PENDING_REVIEW);
      expect(t.statusOf()).toBe(PENDING_REVIEW);
      // The owner is untouched: role 1 still SP01, its accepted primary row still active.
      expect(t.activeOwner()).toBe(SP01);
      expect(activePrimaryRows(t.db)).toEqual([{ sp: SP01, status: 2 }]);
      expect(t.writers.requestPrimary).not.toHaveBeenCalled();
      expect(t.resetSpy).toHaveBeenCalledWith(
        RESULT,
        expect.objectContaining({ primaryChanged: false }),
      );
      expect(t.writers.writeResult).toHaveBeenCalledWith(
        expect.objectContaining({ suppressPrimaryRole: false }),
      );
      // Announced exactly once, for the SUBMITTER, and only after the flip and its history row.
      expect(t.writers.announcePendingReview).toHaveBeenCalledTimes(1);
      expect(t.writers.announcePendingReview).toHaveBeenCalledWith(
        RESULT,
        SUBMITTER,
      );
      expect(t.seen.announce).toEqual({ status: PENDING_REVIEW, history: 1 });
    });

    it('RSF-T-6: the contributor ids the preflight resolved reach the reset', async () => {
      const t = arrange();
      (
        t.preflight.resolveContributorInitiativeIds as jest.Mock
      ).mockResolvedValue([3, 4]);

      await t.run();

      expect(t.resetSpy).toHaveBeenCalledWith(
        RESULT,
        expect.objectContaining({ contributorInitiativeIds: [3, 4] }),
      );
    });

    it('an announce that throws never fails a resubmission that is already committed', async () => {
      const t = arrange();
      (t.writers.announcePendingReview as jest.Mock).mockRejectedValue(
        new Error('mail down'),
      );

      await expect(t.run()).resolves.toMatchObject({
        status_id: PENDING_REVIEW,
      });

      expect(t.statusOf()).toBe(PENDING_REVIEW);
    });
  });

  describe('(b) a different primary (SP06 != SP01): the old owner is retired, SP06 is asked, nobody is announced', () => {
    it('deactivates SP01 role 1 and its accepted primary, suppresses the writers role 1, requests SP06 PENDING, does NOT announce, and leaves the result ownerless', async () => {
      const t = arrange({ primary: 'SP06', requests: [acceptedPrimary()] });

      await t.run(t.dto());

      expect(t.resetSpy).toHaveBeenCalledWith(
        RESULT,
        expect.objectContaining({ primaryChanged: true }),
      );
      expect(t.writers.writeResult).toHaveBeenCalledWith(
        expect.objectContaining({ suppressPrimaryRole: true }),
      );
      expect(t.writers.requestPrimary).toHaveBeenCalledWith(
        RESULT,
        SP06,
        USER,
        expect.anything(),
      );
      // The REAL ppr.request: the only active primary row is SP06's PENDING one (owner = SP06); the
      // accepted SP01 row went with its owner (T-4 pointer 4).
      expect(activePrimaryRows(t.db)).toEqual([{ sp: SP06, status: 1 }]);
      expect(
        t.db
          .rowsOf(ShareResultRequest)
          .find((row) => row.shared_inititiative_id === SP06),
      ).toMatchObject({ owner_initiative_id: SP06, request_type: 'primary' });
      expect(t.writers.announcePendingReview).not.toHaveBeenCalled();
      expect(t.statusOf()).toBe(PENDING_REVIEW);
      // No active owner: the review decision refuses "awaiting the primary Science Program's
      // acceptance" exactly on this condition (results.service.ts:4323-4331; its own message is
      // asserted in results.service.spec.ts).
      expect(t.activeOwner()).toBeNull();
    });

    it('an ownerless result (after an ownerless decline) counts as CHANGED even when the payload names the old SP (DD-5)', async () => {
      const t = arrange({ owner: null, primary: 'SP01' });

      await t.run(t.dto());

      expect(t.resetSpy).toHaveBeenCalledWith(
        RESULT,
        expect.objectContaining({ primaryChanged: true }),
      );
      expect(t.writers.requestPrimary).toHaveBeenCalledWith(
        RESULT,
        SP01,
        USER,
        expect.anything(),
      );
      expect(t.writers.announcePendingReview).not.toHaveBeenCalled();
    });
  });

  describe('(c) the primary request fails: the status does NOT flip, the result stays Rejected and retryable', () => {
    it.each([
      ['internal_error', { ok: false, reason: 'internal_error' }, 503],
      [
        'not_aligned',
        { ok: false, reason: 'not_aligned', message: 'not allocated' },
        500,
      ],
    ])(
      'request() answers %s: 5xx, status still 7, no RESUBMIT row, no announce, lock released',
      async (_reason, outcome, httpStatus) => {
        const t = arrange({
          primary: 'SP06',
          requestPrimary: async () => outcome as any,
        });

        const attempt = t.run(t.dto());
        await expect(attempt).rejects.toMatchObject({ status: httpStatus });
        // The message says what happened and how to recover; it never carries the payload.
        await expect(attempt).rejects.toThrow(
          'Result 28565 could not be resubmitted: the primary Science Program request failed. The result stays rejected; resend the same request to retry.',
        );

        expect(t.statusOf()).toBe(REJECTED);
        expect(t.history()).toEqual([]);
        expect(t.writers.announcePendingReview).not.toHaveBeenCalled();
        expect(t.runner.query).toHaveBeenLastCalledWith(
          expect.stringContaining('RELEASE_LOCK'),
          ['rsb:501'],
        );
      },
    );

    // FALSIFIER of the order (DD-3): a pipeline that flipped BEFORE asking would show 5 here.
    it('ORDER: when the primary is requested the result is still Rejected and no RESUBMIT row exists; the flip comes after', async () => {
      const t = arrange({ primary: 'SP06' });

      await t.run(t.dto());

      expect(t.seen.requestPrimary).toEqual({ status: REJECTED, history: 0 });
      expect(t.statusOf()).toBe(PENDING_REVIEW);
      expect(t.history()).toHaveLength(1);
    });

    it('ORDER: lock -> preflight -> reset -> writers -> request -> flip (the result is Rejected until the flip)', async () => {
      const t = arrange({ primary: 'SP06' });

      await t.run(t.dto());

      expect(t.calls).toEqual(['reset', 'writeResult', 'requestPrimary']);
      expect(t.seen.reset.status).toBe(REJECTED);
      expect(t.seen.writeResult.status).toBe(REJECTED);
      // The preflight (users last) finished before the first write.
      expect(
        (t.preflight.resolveUsers as jest.Mock).mock.invocationCallOrder[0],
      ).toBeLessThan(t.resetSpy.mock.invocationCallOrder[0]);
      expect(t.resetSpy.mock.invocationCallOrder[0]).toBeLessThan(
        (t.writers.writeResult as jest.Mock).mock.invocationCallOrder[0],
      );
    });

    it('a failed writer (for example a lead-centre demotion that throws, T-4 pointer 3) keeps the result Rejected: no request, no flip, no history, lock released', async () => {
      const t = arrange({
        primary: 'SP06',
        onWrite: () => {
          throw new Error('demotion failed');
        },
      });

      await expect(t.run(t.dto())).rejects.toThrow('demotion failed');

      expect(t.statusOf()).toBe(REJECTED);
      expect(t.history()).toEqual([]);
      expect(t.writers.requestPrimary).not.toHaveBeenCalled();
      expect(t.writers.announcePendingReview).not.toHaveBeenCalled();
      expect(t.runner.query).toHaveBeenLastCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['rsb:501'],
      );
    });

    it('a retry after the failure completes the resubmission (the reset cleans up what the first attempt wrote)', async () => {
      let attempts = 0;
      const t = arrange({
        onWrite: () => {
          if (++attempts === 1) throw new Error('boom');
        },
      });

      await expect(t.run()).rejects.toThrow('boom');
      await expect(t.run()).resolves.toMatchObject({
        status_id: PENDING_REVIEW,
      });

      expect(t.history()).toHaveLength(1);
      expect(t.resetSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('(d) the CAS: 0 rows -> 409 and no RESUBMIT', () => {
    it('somebody moved the result away from Rejected after the lock re-read: 409, no history row, no announce', async () => {
      const t = arrange({
        onWrite: (db) => {
          db.rowsOf(Result)[0].status_id = ResultStatusData.Editing.value;
        },
      });

      const attempt = t.run();
      await expect(attempt).rejects.toMatchObject({ status: 409 });
      await expect(attempt).rejects.toThrow('28565');

      expect(t.history()).toEqual([]);
      expect(t.statusOf()).toBe(ResultStatusData.Editing.value);
      expect(t.writers.announcePendingReview).not.toHaveBeenCalled();
    });

    it('the flip and the RESUBMIT row are ONE transaction: if the history insert fails, the status goes back to Rejected', async () => {
      const t = arrange({ failOnInsertInto: ResultReviewHistory });

      await expect(t.run()).rejects.toThrow(
        'injected fault on insert into ResultReviewHistory',
      );

      // The CAS had already set 5 inside the transaction; the rollback undid it.
      expect(
        t.db.updated.some(
          (u) => u.entity === 'Result' && u.set.status_id === PENDING_REVIEW,
        ),
      ).toBe(true);
      expect(t.statusOf()).toBe(REJECTED);
      expect(t.history()).toEqual([]);
      expect(t.writers.announcePendingReview).not.toHaveBeenCalled();
    });

    // NFR §7 Atomicity (T-5 attempt 2): "status, history and requests either complete together or
    // roll back together". The primary request runs INSIDE the final transaction, before the CAS.
    describe('the primary request is part of the final transaction (NFR §7)', () => {
      it('the request goes through the transaction MANAGER, at a moment the result is still Rejected', async () => {
        const t = arrange({ primary: 'SP06' });

        await t.run(t.dto());

        expect(t.writers.requestPrimary).toHaveBeenCalledWith(
          RESULT,
          SP06,
          USER,
          expect.anything(),
        );
        expect(t.seen.requestPrimary).toEqual({ status: REJECTED, history: 0 });
        // reset + the final write: two transactions, the request is inside the second one.
        expect(t.db.transactions).toBe(2);
      });

      it('the CAS hits 0 rows (409): NO pending primary request remains (it rolled back with the flip)', async () => {
        const t = arrange({
          primary: 'SP06',
          requests: [acceptedPrimary()],
          onWrite: (db) => {
            db.rowsOf(Result)[0].status_id = ResultStatusData.Editing.value;
          },
        });

        await expect(t.run(t.dto())).rejects.toMatchObject({ status: 409 });

        // The request had been inserted; the rollback took it out, and the cancellation the request
        // makes of the open round with it. The reset's own work (the accepted SP01 row retired) was
        // a separate, earlier transaction and stays: that is the retryable Rejected state.
        expect(
          t.db.inserted.some(
            (i) =>
              i.entity === 'ShareResultRequest' &&
              i.row.request_type === 'primary' &&
              i.row.shared_inititiative_id === SP06,
          ),
        ).toBe(true);
        expect(activePrimaryRows(t.db)).toEqual([]);
        expect(t.history()).toEqual([]);
      });

      it('the history insert fails: neither the flip nor the primary request survive', async () => {
        const t = arrange({
          primary: 'SP06',
          failOnInsertInto: ResultReviewHistory,
        });

        await expect(t.run(t.dto())).rejects.toThrow('injected fault');

        expect(t.statusOf()).toBe(REJECTED);
        expect(activePrimaryRows(t.db)).toEqual([]);
      });

      it('request() answers ok:false: the 5xx keeps its mapping and nothing of the request or the flip is left', async () => {
        const t = arrange({
          primary: 'SP06',
          requestPrimary: async (_r, _i, _u, manager) => {
            // The real request wrote its row through the manager before it failed.
            await t.ppr.request(RESULT, SP06, { id: USER } as any, manager, {
              asDraft: false,
            });
            return { ok: false, reason: 'internal_error' };
          },
        });

        await expect(t.run(t.dto())).rejects.toMatchObject({ status: 503 });

        expect(activePrimaryRows(t.db)).toEqual([]);
        expect(t.statusOf()).toBe(REJECTED);
      });
    });

    it('the CAS is conditional on status 7 (the update names `status_id: 7`), never an unconditional status write', async () => {
      const t = arrange();

      await t.run();

      const flips = t.db.updated.filter(
        (u) => u.entity === 'Result' && u.set.status_id === PENDING_REVIEW,
      );
      expect(flips).toHaveLength(1);
      expect(flips[0].where).toEqual({ id: RESULT, status_id: REJECTED });
    });
  });

  describe('(e) keep_editing is ignored', () => {
    it('keep_editing: true still ends in Pending Review (5), never Editing', async () => {
      const t = arrange({ keepEditing: true });

      const outcome = await t.run();

      expect(outcome.status_id).toBe(PENDING_REVIEW);
      expect(t.statusOf()).toBe(PENDING_REVIEW);
    });
  });

  describe('(f) the outcome: same record, humanized status', () => {
    it('returns operation data of the SAME id and result_code, with the humanized status "pending review"; no second result is created', async () => {
      const t = arrange();

      const outcome = await t.run();

      expect(outcome).toEqual({
        id: RESULT,
        result_code: 28565,
        status_id: PENDING_REVIEW,
        status: 'pending review',
      });
      // R-3: not a single insert into `result`; the one row keeps its id and code.
      expect(t.db.inserted.some((i) => i.entity === 'Result')).toBe(false);
      expect(t.db.rowsOf(Result)).toHaveLength(1);
      expect(t.db.rowsOf(Result)[0]).toMatchObject({
        id: RESULT,
        result_code: 28565,
      });
    });

    it('writes the RESUBMIT row with initiative_id = the REQUESTED primary and created_by = the external submitter', async () => {
      const t = arrange({ primary: 'SP06' });

      await t.run(t.dto());

      expect(t.history()).toEqual([
        { action: 'RESUBMIT', initiative_id: SP06, created_by: SUBMITTER },
      ]);
    });
  });

  describe('(g) three cycles: REJECT / RESUBMIT in order, each with its Science Program', () => {
    // The data shape of a review rejection (results.service.ts:4340-4357): status 7 + a REJECT row.
    const rejectedBy = (
      t: ReturnType<typeof arrange>,
      initiative: number,
      ownerAfter: number | null,
    ) => {
      t.db.rowsOf(Result)[0].status_id = REJECTED;
      t.db.rowsOf(ResultReviewHistory).push({
        id: t.db.rowsOf(ResultReviewHistory).length + 1,
        result_id: RESULT,
        action: 'REJECT',
        initiative_id: initiative,
        created_by: 77,
        is_active: 1,
      });
      // Who is the owner after the SP6 accepts is outside this spec: model it directly.
      t.db.rowsOf(ResultsByInititiative).forEach((r) => (r.is_active = 0));
      if (ownerAfter) {
        t.db.rowsOf(ResultsByInititiative).push({
          id: 100 + ownerAfter,
          result_id: RESULT,
          initiative_id: ownerAfter,
          initiative_role_id: 1,
          is_active: 1,
        });
      }
    };

    it('REJECT(SP01), RESUBMIT(SP01), REJECT(SP01), RESUBMIT(SP06), REJECT(SP06), RESUBMIT(SP06)', async () => {
      const t = arrange({
        history: [
          {
            id: 1,
            result_id: RESULT,
            action: 'REJECT',
            initiative_id: SP01,
            created_by: 77,
            is_active: 1,
          },
        ],
      });

      // Cycle 1: same owner SP01.
      await t.run(t.dto());
      rejectedBy(t, SP01, SP01);
      // Cycle 2: the platform moves it to SP06 (ownerless until SP06 accepts; SP06 accepts, then rejects).
      await t.run(t.dto({ toc_mapping: { science_program_id: 'SP06' } }));
      rejectedBy(t, SP06, SP06);
      // Cycle 3: SP06 again, now the owner.
      await t.run(t.dto({ toc_mapping: { science_program_id: 'SP06' } }));

      expect(t.history()).toEqual([
        { action: 'REJECT', initiative_id: SP01, created_by: 77 },
        { action: 'RESUBMIT', initiative_id: SP01, created_by: SUBMITTER },
        { action: 'REJECT', initiative_id: SP01, created_by: 77 },
        { action: 'RESUBMIT', initiative_id: SP06, created_by: SUBMITTER },
        { action: 'REJECT', initiative_id: SP06, created_by: 77 },
        { action: 'RESUBMIT', initiative_id: SP06, created_by: SUBMITTER },
      ]);
      // Earlier entries were never modified or deactivated by the resets (R-18).
      expect(t.db.updated.map((u) => u.entity)).not.toContain(
        'ResultReviewHistory',
      );
    });
  });

  describe('(h) a decline after a resubmission rejects the result again (PDR-R-4) and it is resubmittable again', () => {
    it('SP06 declines the ownerless result through the REAL ppr.decline -> Rejected + REJECT(SP06); the same payload resubmits again and gets a fresh PENDING request', async () => {
      const t = arrange({ primary: 'SP06' });
      await t.run(t.dto());
      const pending = t.db
        .rowsOf(ShareResultRequest)
        .find((row) => row.shared_inititiative_id === SP06);

      const decline = await t.ppr.decline(
        pending.share_result_request_id,
        { id: 55 } as any,
        'We are not the right program',
      );

      expect(decline).toMatchObject({ ok: true, state: 'rejected' });
      expect(t.statusOf()).toBe(REJECTED);
      expect(t.history()).toEqual([
        { action: 'RESUBMIT', initiative_id: SP06, created_by: SUBMITTER },
        { action: 'REJECT', initiative_id: SP06, created_by: 55 },
      ]);

      // Resubmittable again: the lock re-read sees Rejected, the reset retires the DECLINED row.
      await expect(t.run(t.dto())).resolves.toMatchObject({
        status_id: PENDING_REVIEW,
      });

      expect(t.statusOf()).toBe(PENDING_REVIEW);
      expect(activePrimaryRows(t.db)).toEqual([{ sp: SP06, status: 1 }]);
      expect(t.history().map((h) => h.action)).toEqual([
        'RESUBMIT',
        'REJECT',
        'RESUBMIT',
      ]);
    });
  });

  describe('the reset inputs (T-4 forward pointers 2 and 5)', () => {
    it.each([
      [0, false],
      [1, true],
      [3, true],
    ])(
      'partners RESOLVED in CLARISA = %s -> payloadSendsPartners %s (pointer 2: not the raw payload)',
      async (resolved, expected) => {
        const t = arrange({ partnersResolved: resolved });

        await t.run(
          t.dto({ contributing_partners: [{ name: 'Whoever it is' }] }),
        );

        expect(t.writers.countResolvablePartners).toHaveBeenCalledWith(
          expect.objectContaining({
            contributing_partners: [{ name: 'Whoever it is' }],
          }),
        );
        expect(t.resetSpy).toHaveBeenCalledWith(
          RESULT,
          expect.objectContaining({ payloadSendsPartners: expected }),
        );
      },
    );

    it('the reset is told the audit user, the stored result type and nothing else is invented', async () => {
      const t = arrange();

      await t.run();

      expect(t.resetSpy).toHaveBeenCalledWith(RESULT, {
        userId: USER,
        resultTypeId: 8,
        primaryChanged: false,
        payloadSendsPartners: true,
        // The preflight double resolves no contributor (RSF-T-6).
        contributorInitiativeIds: [],
      });
    });

    it('the writers get what the preflight resolved (users, projects) and the untouched payload', async () => {
      const t = arrange();
      const payload = t.dto({ contributing_partners: [] });

      await t.run(payload);

      expect(t.writers.writeResult).toHaveBeenCalledWith({
        target: expect.objectContaining({ id: RESULT }),
        bilateralDto: payload,
        platform: { id: 12, acronym: 'STAR' },
        userId: USER,
        submittedUserId: SUBMITTER,
        resolvedProjects: new Map([['P1', { id: 77 }]]),
        suppressPrimaryRole: false,
      });
    });
  });

  // T-4 forward pointer 2 (gap a), through the REAL reset. `handleInstitutions` returns early when
  // none of the sent partners resolves in CLARISA, so it never deactivates the old ones: the reset
  // must, and `payloadSendsPartners` has to come from the partners that RESOLVE.
  describe('partners (T-4 pointer 2)', () => {
    const stalePartners = (): Row[] => [
      {
        id: 1,
        result_id: RESULT,
        institutions_id: 71,
        institution_roles_id: 2,
        is_active: 1,
      },
      {
        id: 2,
        result_id: RESULT,
        institutions_id: 72,
        institution_roles_id: 2,
        is_active: 1,
      },
    ];
    const activePartners = (t: ReturnType<typeof arrange>) =>
      t.db
        .rowsOf(ResultsByInstitution)
        .filter((row) => t.db.isActive(ResultsByInstitution, row.id))
        .map((row) => row.institutions_id);

    it('partners SENT but NONE resolves: the stale PARTNER rows end up inactive (the writer returned early)', async () => {
      const t = arrange({ partners: stalePartners(), partnersResolved: 0 });

      await t.run(t.dto({ contributing_partners: [{ name: 'Nobody Inc.' }] }));

      expect(activePartners(t)).toEqual([]);
    });

    it('partners that DO resolve: the reset leaves the rows to the replace-safe writer (updateInstitutions), which is why 0 and 1 differ', async () => {
      const t = arrange({ partners: stalePartners(), partnersResolved: 1 });

      await t.run(t.dto({ contributing_partners: [{ institution_id: 73 }] }));

      expect(activePartners(t)).toEqual([71, 72]);
    });

    it('no partners at all: the stale PARTNER rows are deactivated too', async () => {
      const t = arrange({ partners: stalePartners(), partnersResolved: 0 });

      await t.run(t.dto());

      expect(activePartners(t)).toEqual([]);
    });
  });

  describe('RSB-R-21: one log line per attempt, never the payload', () => {
    it('an accepted resubmission leaves exactly one `outcome=accepted` line', async () => {
      const t = arrange();

      await t.run(t.dto({ description: 'a secret description' }));

      const lines = t.logSpy.mock.calls.map((call) => String(call[0]));
      expect(lines).toEqual([
        'result_code=28565 operation=updated platform=STAR outcome=accepted',
      ]);
      expect(lines.join('\n')).not.toContain('secret');
    });

    it('a pipeline failure leaves exactly one `outcome=rejected(<status>)` line and no `accepted` line', async () => {
      const t = arrange({
        primary: 'SP06',
        requestPrimary: async () => ({ ok: false, reason: 'internal_error' }),
      });

      await expect(t.run(t.dto())).rejects.toMatchObject({ status: 503 });

      expect(t.logSpy.mock.calls.map((call) => String(call[0]))).toEqual([
        'result_code=28565 operation=updated platform=STAR outcome=rejected(503)',
      ]);
    });
  });
});
