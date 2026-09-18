// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { BilateralQualityAssessmentService } from './bilateral-quality-assessment.service';
import { BilateralQualityAssessmentRepository } from '../../repositories/bilateral-quality-assessment.repository';
import { BilateralQualityPayloadBuilder } from './bilateral-quality-payload.builder';
import { BilateralQualityAssessmentClient } from './bilateral-quality-assessment.client';
import { ResultsKnowledgeProductsRepository } from '../../../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultTypeEnum } from '../../../../shared/constants/result-type.enum';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { contentHash, QualityPayload } from './bilateral-quality-rules';
import { UnresolvableLabelError } from './mappers/errors';
import { BilateralResultFormReadError } from './bilateral-quality-payload.builder';

/**
 * BIL-QAI-T-6 — orchestrator: shared `assertSubmittable` (proven from `bilateral-center.
 * service.spec.ts`, not here — see the disqualifier note below), running-row lock, `assess`,
 * `getLatest`, and the v0.2 status mapping.
 *
 * Expected values are taken literally from `design.md` §4.5 "PRMS status mapping" and §5
 * "Orchestrator", never recomputed by calling the functions under test — except where a
 * fixture is built with the already-independently-tested pure `contentHash` from
 * `bilateral-quality-rules.spec.ts`, which is trusted test-fixture plumbing, not the
 * assertion itself.
 *
 * Disqualifier (carried from the Leader's brief): a test that stubs `assertSubmittable` when
 * testing `assess` proves nothing about gate parity. This file never sees `assertSubmittable`
 * at all — it is private to `BilateralCenterService` and is never called from here; the
 * gate-parity proof (the 11 `submitForReview` cases and the new `assess` cases sharing the
 * same rejection messages) lives in `bilateral-center.service.spec.ts`, exercising the real
 * method. This file starts one level below that: it is handed an already-validated `Result`.
 */

const user: TokenDto = {
  id: 42,
  email: 'center@cgiar.org',
  first_name: 'Center',
  last_name: 'User',
};

function buildResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 77,
    result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
    version_id: 12,
    status_id: 1,
    ...overrides,
  } as any;
}

function buildPayload(overrides: Partial<QualityPayload> = {}): QualityPayload {
  return {
    contract_version: '0.2',
    request_id: 'placeholder',
    result: { type: 'Innovation development' },
    sections: {
      general_information: { title: 'A title' },
      contributors_and_partners: { lead_center: 'AfricaRice' },
      geographic_location: { scope: 'National' },
      evidence: [],
      type_specific: { type: 'innovation_development', fields: {} },
    },
    constraints: { timeout_seconds: 60 },
    ...overrides,
  };
}

describe('BilateralQualityAssessmentService', () => {
  let service: BilateralQualityAssessmentService;
  let repository: jest.Mocked<BilateralQualityAssessmentRepository>;
  let payloadBuilder: jest.Mocked<BilateralQualityPayloadBuilder>;
  let client: jest.Mocked<BilateralQualityAssessmentClient>;
  let kpRepository: jest.Mocked<ResultsKnowledgeProductsRepository>;
  let managerQuery: jest.Mock;
  let managerCreate: jest.Mock;
  let managerSave: jest.Mock;

  beforeEach(async () => {
    managerQuery = jest
      .fn()
      .mockImplementation((sql: string) =>
        Promise.resolve(
          sql.includes('SELECT id FROM result WHERE id = ? FOR UPDATE')
            ? [{ id: 77 }]
            : [],
        ),
      );
    managerCreate = jest.fn((_entity: unknown, payload: unknown) => payload);
    managerSave = jest.fn(async (_entity: unknown, payload: any) => ({
      id: '501',
      ...payload,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralQualityAssessmentService,
        {
          provide: BilateralQualityAssessmentRepository,
          useValue: {
            findLatestByResultId: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            manager: {
              transaction: jest.fn(async (cb: any) =>
                cb({
                  query: managerQuery,
                  create: managerCreate,
                  save: managerSave,
                }),
              ),
            },
          },
        },
        {
          provide: BilateralQualityPayloadBuilder,
          useValue: {
            build: jest
              .fn()
              .mockImplementation((_resultId: number, opts: any) =>
                Promise.resolve(buildPayload({ request_id: opts.requestId })),
              ),
          },
        },
        {
          provide: BilateralQualityAssessmentClient,
          useValue: {
            timeoutSeconds: jest.fn().mockReturnValue(60),
            assess: jest.fn(),
          },
        },
        {
          provide: ResultsKnowledgeProductsRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get(BilateralQualityAssessmentService);
    repository = module.get(BilateralQualityAssessmentRepository);
    payloadBuilder = module.get(BilateralQualityPayloadBuilder);
    client = module.get(BilateralQualityAssessmentClient);
    kpRepository = module.get(ResultsKnowledgeProductsRepository);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a token without an email before building a payload or calling the AI', async () => {
    await expect(
      service.assess({ ...user, email: '' }, buildResult()),
    ).rejects.toThrow('Unable to identify the signed-in user');

    expect(payloadBuilder.build).not.toHaveBeenCalled();
    expect(client.assess).not.toHaveBeenCalled();
  });

  describe('assess — running-row lock', () => {
    it('returns 202 with the existing id when the running-lock query finds a young row', async () => {
      managerQuery
        .mockResolvedValueOnce([{ id: 77 }])
        .mockResolvedValueOnce([{ id: '900' }]);

      const outcome = await service.assess(user, buildResult());

      expect(outcome.httpStatus).toBe(202);
      expect(outcome.dto).toEqual({
        id: 900,
        result_id: 77,
        status: 'running',
        is_current: true,
      });
      expect(client.assess).not.toHaveBeenCalled();
      expect(managerSave).not.toHaveBeenCalled();
    });

    it('computes the age threshold from the client timeout plus the documented grace, in SQL', async () => {
      (client.timeoutSeconds as jest.Mock).mockReturnValue(45);
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 10,
      });

      await service.assess(user, buildResult());

      expect(managerQuery.mock.calls[0]).toEqual([
        'SELECT id FROM result WHERE id = ? FOR UPDATE',
        [77],
      ]);
      expect(managerQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'running'"),
        [77, 55],
      );
    });

    it('proceeds to claim a new running row when the lock query finds nothing (e.g. a stale row outside the window)', async () => {
      managerQuery
        .mockResolvedValueOnce([{ id: 77 }])
        .mockResolvedValueOnce([]);
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 10,
      });

      const outcome = await service.assess(user, buildResult());

      expect(managerSave).toHaveBeenCalled();
      expect(outcome.httpStatus).toBe(200);
    });
  });

  describe('assess — hash short-circuit', () => {
    it('returns the stored row with is_current true and never calls the AI when the hash matches', async () => {
      const payload = buildPayload();
      const hash = contentHash(payload);
      (payloadBuilder.build as jest.Mock).mockResolvedValueOnce(payload);
      (repository.findLatestByResultId as jest.Mock).mockResolvedValueOnce({
        id: '10',
        result_id: '77',
        status: 'completed',
        content_hash: hash,
        ai_status: null,
        degraded_reason: null,
        contract_version: '0.2',
        overall_verdict: 'green',
        overall_score: null,
        overall_summary: 'Looks good',
        sections: {},
        evidence: [],
        criteria_version: null,
        elapsed_ms: 500,
        unavailable_reason: null,
        created_at: new Date('2026-01-01T00:00:00Z'),
      });

      const outcome = await service.assess(user, buildResult());

      expect(client.assess).not.toHaveBeenCalled();
      expect(managerSave).not.toHaveBeenCalled();
      expect(outcome.httpStatus).toBe(200);
      expect((outcome.dto as any).is_current).toBe(true);
      expect((outcome.dto as any).id).toBe(10);
    });

    it('does not short-circuit on a hash match when the latest row is unavailable (no verdict was produced)', async () => {
      const payload = buildPayload();
      const hash = contentHash(payload);
      (payloadBuilder.build as jest.Mock).mockResolvedValueOnce(payload);
      (repository.findLatestByResultId as jest.Mock).mockResolvedValueOnce({
        id: '10',
        status: 'unavailable',
        content_hash: hash,
      });
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 10,
      });

      const outcome = await service.assess(user, buildResult());

      expect(client.assess).toHaveBeenCalled();
      expect(outcome.httpStatus).toBe(200);
    });
  });

  describe('assess — Knowledge Product branch (no AI call)', () => {
    it('never invokes HttpService.post (via the client) for a KP result, and stores skipped_kp_rule with both v0.2 columns null', async () => {
      (kpRepository.findOne as jest.Mock).mockResolvedValueOnce({
        is_melia: false,
        knowledge_product_type: 'Report',
        result_knowledge_product_metadata_array: [],
      });

      await service.assess(
        user,
        buildResult({ result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT }),
      );

      expect(client.assess).not.toHaveBeenCalled();
      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe('skipped_kp_rule');
      expect(patch.overall_verdict).toBe('green');
      expect(patch.ai_status).toBeNull();
      expect(patch.degraded_reason).toBeNull();
    });

    it('reads CGSpace vs WoS by "source === CGSpace" / "source !== CGSpace" (results-knowledge-products.service.ts:2035-2037), matching a Journal Article that agrees', async () => {
      (kpRepository.findOne as jest.Mock).mockResolvedValueOnce({
        is_melia: false,
        knowledge_product_type: 'Journal Article',
        result_knowledge_product_metadata_array: [
          {
            source: 'CGSpace',
            year: 2026,
            is_isi: true,
            is_peer_reviewed: true,
            accesibility: 'Open Access',
            is_active: true,
          },
          {
            source: 'Web of Science',
            year: 2026,
            is_isi: true,
            is_peer_reviewed: true,
            accesibility: 'Open Access',
            is_active: true,
          },
        ],
      });

      await service.assess(
        user,
        buildResult({ result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT }),
      );

      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.overall_verdict).toBe('green');
    });

    it('always passes evidence_count to the KP rule (from the built payload evidence length)', async () => {
      const payloadWithEvidence = buildPayload({
        sections: {
          ...buildPayload().sections,
          evidence: [
            {
              description: 'x',
              link: 'https://x',
              source: 'url',
              visibility: 'public',
              tags: [],
            },
          ],
        },
      });
      (payloadBuilder.build as jest.Mock).mockResolvedValueOnce(
        payloadWithEvidence,
      );
      (kpRepository.findOne as jest.Mock).mockResolvedValueOnce({
        is_melia: false,
        knowledge_product_type: 'Report',
        result_knowledge_product_metadata_array: [],
      });

      await service.assess(
        user,
        buildResult({ result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT }),
      );

      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.evidence).toHaveLength(1);
      expect(patch.evidence[0]).toEqual({
        index: 0,
        verdict: 'grey',
        reason: 'Not assessed for knowledge products',
      });
    });
  });

  describe('assess — AI status mapping (design.md §4.5)', () => {
    it('AI "completed" -> row completed, ai_status completed, degraded_reason null', async () => {
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 250,
      });

      await service.assess(user, buildResult());

      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe('completed');
      expect(patch.ai_status).toBe('completed');
      expect(patch.degraded_reason).toBeNull();
      expect(patch.unavailable_reason).toBeNull();
    });

    it('AI "partial" -> row completed, ai_status partial, reason stored, unavailable_reason null', async () => {
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'partial',
        degraded_reason: 'One evidence link could not be opened.',
        elapsed_ms: 250,
      });

      await service.assess(user, buildResult());

      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe('completed');
      expect(patch.ai_status).toBe('partial');
      expect(patch.degraded_reason).toBe(
        'One evidence link could not be opened.',
      );
      expect(patch.unavailable_reason).toBeNull();
    });

    it('AI "unavailable" -> row unavailable, unavailable_reason ai_unavailable, reason stored, ai_status null', async () => {
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ai_unavailable',
        degraded_reason: 'The service could not complete the review.',
        elapsed_ms: 12000,
      });

      await service.assess(user, buildResult());

      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe('unavailable');
      expect(patch.unavailable_reason).toBe('ai_unavailable');
      expect(patch.degraded_reason).toBe(
        'The service could not complete the review.',
      );
      expect(patch.ai_status).toBeNull();
    });

    it.each(['timeout', 'http_error', 'malformed', 'not_configured'] as const)(
      'transport failure "%s" -> row unavailable with that reason, both v0.2 columns null, HTTP 200 to the caller',
      async (failure) => {
        (client.assess as jest.Mock).mockResolvedValue({
          outcome: failure,
          elapsed_ms: 60000,
        });

        const outcome = await service.assess(user, buildResult());

        const [, patch] = (repository.update as jest.Mock).mock.calls[0];
        expect(patch.status).toBe('unavailable');
        expect(patch.unavailable_reason).toBe(failure);
        expect(patch.ai_status).toBeNull();
        expect(patch.degraded_reason).toBeNull();
        expect(outcome.httpStatus).toBe(200);
      },
    );

    it('a grey section verdict passes through unchanged (applyGreyRule only touches evidence)', async () => {
      const response = buildAiResponse();
      response.sections.type_specific = {
        ...response.sections.type_specific,
        verdict: 'grey',
      };
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response,
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 10,
      });

      await service.assess(user, buildResult());

      const [, patch] = (repository.update as jest.Mock).mock.calls[0];
      expect(patch.sections.type_specific.verdict).toBe('grey');
    });
  });

  describe('assess — logging (BIL-QAI-AC-15)', () => {
    it('logs ai_status and never logs any part of degraded_reason', async () => {
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      const leakMarker = 'LEAK-MARKER-9f3';
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'partial',
        degraded_reason: leakMarker,
        elapsed_ms: 10,
      });

      await service.assess(user, buildResult());

      expect(logSpy).toHaveBeenCalled();
      for (const call of logSpy.mock.calls) {
        const line = String(call[0]);
        expect(line).not.toContain(leakMarker);
      }
      const line = String(logSpy.mock.calls[0][0]);
      expect(line).toContain('ai_status=partial');
      logSpy.mockRestore();
    });
  });

  describe('assess — one requestId end to end', () => {
    it('passes the same requestId to the payload builder and onward in the payload sent to the client', async () => {
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 10,
      });

      await service.assess(user, buildResult());

      const [, builderOpts] = (payloadBuilder.build as jest.Mock).mock.calls[0];
      const [sentPayload, sentContext] = (client.assess as jest.Mock).mock
        .calls[0];
      expect(sentPayload.request_id).toBe(builderOpts.requestId);
      expect(sentContext).toEqual({
        resultId: Number(buildResult().id),
        userEmail: user.email,
      });
      expect(typeof builderOpts.requestId).toBe('string');
      expect(builderOpts.requestId.length).toBeGreaterThan(0);
    });

    it('derives constraints.timeout_seconds from the client, never a hard-coded 60', async () => {
      (client.timeoutSeconds as jest.Mock).mockReturnValue(45);
      (client.assess as jest.Mock).mockResolvedValue({
        outcome: 'ok',
        response: buildAiResponse(),
        ai_status: 'completed',
        degraded_reason: null,
        elapsed_ms: 10,
      });

      await service.assess(user, buildResult());

      const [, builderOpts] = (payloadBuilder.build as jest.Mock).mock.calls[0];
      expect(builderOpts.timeoutSeconds).toBe(45);
    });
  });

  describe('assess — BilateralResultFormReadError mapping', () => {
    it('maps a form-read failure to a generic 4xx and never surfaces the embedded upstream message', async () => {
      (payloadBuilder.build as jest.Mock).mockRejectedValueOnce(
        new BilateralResultFormReadError(
          77,
          404,
          'Bilateral result not found — LEAK-UPSTREAM-BODY',
        ),
      );

      const call = service.assess(user, buildResult());

      await expect(call).rejects.toBeInstanceOf(BadRequestException);
      await expect(call).rejects.not.toThrow(/LEAK-UPSTREAM-BODY/);
    });

    it('maps an unresolvable-label failure to the same 400 path, keeping its own (safe) message', async () => {
      (payloadBuilder.build as jest.Mock).mockRejectedValueOnce(
        new UnresolvableLabelError(
          'Could not resolve the ToC indicator label.',
        ),
      );

      await expect(service.assess(user, buildResult())).rejects.toThrow(
        'Could not resolve the ToC indicator label.',
      );
    });
  });

  describe('getLatest', () => {
    it('returns { latest: null } when no assessment has ever run', async () => {
      (repository.findLatestByResultId as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const result = await service.getLatest(77);

      expect(result).toEqual({ latest: null });
      expect(payloadBuilder.build).not.toHaveBeenCalled();
    });

    it('includes a running row (unlike the additive result-read block, which excludes it)', async () => {
      const payload = buildPayload();
      const hash = contentHash(payload);
      (payloadBuilder.build as jest.Mock).mockResolvedValueOnce(payload);
      (repository.findLatestByResultId as jest.Mock).mockResolvedValueOnce({
        id: '10',
        result_id: '77',
        status: 'running',
        content_hash: hash,
        ai_status: null,
        degraded_reason: null,
        contract_version: '0.2',
        overall_verdict: null,
        overall_score: null,
        overall_summary: null,
        sections: {},
        evidence: [],
        criteria_version: null,
        elapsed_ms: null,
        unavailable_reason: null,
        created_at: new Date('2026-01-01T00:00:00Z'),
      });

      const result: any = await service.getLatest(77);

      expect(result.status).toBe('running');
      expect(result.is_current).toBe(true);
    });
  });
});

function buildAiResponse() {
  const section = (verdict: 'green' | 'amber' | 'red' | 'grey' = 'green') => ({
    verdict,
    comments: `${verdict} comments`,
    strengths: [] as string[],
    issues: [] as string[],
  });
  return {
    request_id: 'req-1',
    criteria_version: 'QA-2026-v1',
    overall: { verdict: 'green' as const, summary: 'Looks good overall.' },
    sections: {
      general_information: section(),
      contributors_and_partners: section(),
      geographic_location: section(),
      evidence: section(),
      type_specific: section(),
    },
    evidence: [],
  };
}
