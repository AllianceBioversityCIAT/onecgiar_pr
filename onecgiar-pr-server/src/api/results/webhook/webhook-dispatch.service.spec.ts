import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { of, throwError } from 'rxjs';
import { BilateralService } from '../../bilateral/bilateral.service';
import { ResultReviewHistoryRepository } from '../result-review-history/result-review-history.repository';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import { WebhookRecipientType } from './entities/webhook-endpoint.entity';
import { WebhookAlertService } from './webhook-alert.service';
import { WebhookDeliveryRepository } from './webhook-delivery.repository';
import { WebhookDispatchService } from './webhook-dispatch.service';
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_SIGNATURE_HEADER,
} from './webhook-dispatch.constants';

/**
 * P2-3166 WH-T-7. These assert the properties the ACs actually depend on — retries survive, the
 * alert fires once, no URL escapes — rather than exercising every branch for coverage.
 */
describe('WebhookDispatchService', () => {
  let service: WebhookDispatchService;
  let deliveryRepository: jest.Mocked<Partial<WebhookDeliveryRepository>>;
  let bilateralService: jest.Mocked<Partial<BilateralService>>;
  let reviewHistoryRepository: jest.Mocked<
    Partial<ResultReviewHistoryRepository>
  >;
  let httpService: jest.Mocked<Partial<HttpService>>;
  let alertService: jest.Mocked<Partial<WebhookAlertService>>;

  const SECRET = 'test-secret';
  const ENDPOINT_URL = 'https://external.example.org/prms/callback';

  const endpoint = {
    id: 7,
    recipient_type: WebhookRecipientType.PLATFORM,
    recipient_id: 42,
    recipient_acronym: 'EXT',
    url: ENDPOINT_URL,
    secret: SECRET,
    is_active: true,
  };

  const delivery = (overrides: Partial<WebhookDelivery> = {}) =>
    ({
      id: 100,
      result_id: 555,
      endpoint_id: 7,
      decision: 'REJECT',
      status: WebhookDeliveryStatus.SENDING,
      attempts: 0,
      payload: null,
      last_http_status: null,
      last_error: null,
      next_attempt_at: new Date(),
      alerted_at: null,
      ...overrides,
    }) as WebhookDelivery;

  beforeEach(async () => {
    deliveryRepository = {
      releaseStale: jest.fn().mockResolvedValue(0),
      claimDue: jest.fn().mockResolvedValue([]),
      findEndpointById: jest.fn().mockResolvedValue(endpoint),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      markAlerted: jest.fn().mockResolvedValue(true),
    };

    bilateralService = {
      findOne: jest.fn().mockResolvedValue({
        response: { id: 555, title: 'A bilateral result' },
        message: 'ok',
        status: 200,
      }),
    };

    reviewHistoryRepository = {
      getReviewHistoryByResultId: jest
        .fn()
        .mockResolvedValue([{ comment: '  Missing evidence  ' }]),
    };

    httpService = {
      post: jest.fn().mockReturnValue(of({ status: 200, data: {} })),
    };

    alertService = {
      alertDeliveryExhausted: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDispatchService,
        { provide: WebhookDeliveryRepository, useValue: deliveryRepository },
        { provide: BilateralService, useValue: bilateralService },
        {
          provide: ResultReviewHistoryRepository,
          useValue: reviewHistoryRepository,
        },
        { provide: HttpService, useValue: httpService },
        { provide: WebhookAlertService, useValue: alertService },
      ],
    }).compile();

    service = module.get<WebhookDispatchService>(WebhookDispatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('claiming (NFR-3 — idempotency)', () => {
    it('sends nothing when no delivery is due', async () => {
      await service.dispatchDue();

      expect(httpService.post).not.toHaveBeenCalled();
    });

    // A second overlapping cron run must find nothing, which is what `claimDue` returning [] models.
    // Without the claim-before-send order this is exactly where a duplicate POST would appear.
    it('does not send twice when a second run finds the row already claimed', async () => {
      (deliveryRepository.claimDue as jest.Mock)
        .mockResolvedValueOnce([delivery()])
        .mockResolvedValueOnce([]);

      await service.dispatchDue();
      await service.dispatchDue();

      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('releases rows stuck in SENDING before claiming', async () => {
      await service.dispatchDue();

      expect(deliveryRepository.releaseStale).toHaveBeenCalled();
      const [cutoff] = (deliveryRepository.releaseStale as jest.Mock).mock
        .calls[0];
      expect(cutoff).toBeInstanceOf(Date);
    });
  });

  describe('successful delivery', () => {
    beforeEach(() => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
    });

    it('marks the delivery SENT and clears the retry schedule', async () => {
      await service.dispatchDue();

      expect(deliveryRepository.update).toHaveBeenCalledWith(
        100,
        expect.objectContaining({
          status: WebhookDeliveryStatus.SENT,
          attempts: 1,
          last_http_status: 200,
          next_attempt_at: null,
        }),
      );
    });

    it('signs the body with the endpoint secret (HMAC-SHA256 of the exact bytes sent)', async () => {
      await service.dispatchDue();

      const [, body, config] = (httpService.post as jest.Mock).mock.calls[0];
      const expected = createHmac('sha256', SECRET).update(body).digest('hex');

      expect(config.headers[WEBHOOK_SIGNATURE_HEADER]).toBe(expected);
    });

    it('omits the signature when the endpoint has no secret', async () => {
      (deliveryRepository.findEndpointById as jest.Mock).mockResolvedValue({
        ...endpoint,
        secret: null,
      });

      await service.dispatchDue();

      const [, , config] = (httpService.post as jest.Mock).mock.calls[0];
      expect(config.headers[WEBHOOK_SIGNATURE_HEADER]).toBeUndefined();
    });
  });

  describe('payload (AC2)', () => {
    beforeEach(() => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
    });

    it('reuses the bilateral enrichment output rather than re-serializing', async () => {
      await service.dispatchDue();

      expect(bilateralService.findOne).toHaveBeenCalledWith(555);

      const [, body] = (httpService.post as jest.Mock).mock.calls[0];
      const payload = JSON.parse(body);
      expect(payload.data).toEqual({ id: 555, title: 'A bilateral result' });
      expect(payload.result_id).toBe(555);
      expect(payload.decision).toBe('REJECT');
    });

    it('carries the rejection justification, trimmed', async () => {
      await service.dispatchDue();

      const [, body] = (httpService.post as jest.Mock).mock.calls[0];
      expect(JSON.parse(body).justification).toBe('Missing evidence');
    });

    // The contract P2-3157 fixed when it removed the hardcoded 'Approved' literal: no comment means
    // the field is absent, never an empty string.
    it('omits justification entirely when the reviewer left no comment', async () => {
      (
        reviewHistoryRepository.getReviewHistoryByResultId as jest.Mock
      ).mockResolvedValue([{ comment: '   ' }]);

      await service.dispatchDue();

      const [, body] = (httpService.post as jest.Mock).mock.calls[0];
      const payload = JSON.parse(body);
      expect('justification' in payload).toBe(false);
    });

    it('still delivers when the review history cannot be read', async () => {
      (
        reviewHistoryRepository.getReviewHistoryByResultId as jest.Mock
      ).mockRejectedValue(new Error('db down'));

      await service.dispatchDue();

      expect(httpService.post).toHaveBeenCalled();
      const [, body] = (httpService.post as jest.Mock).mock.calls[0];
      expect('justification' in JSON.parse(body)).toBe(false);
    });
  });

  describe('failure and retry (AC4)', () => {
    it('increments attempts and schedules a retry on a 5xx, keeping the row', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 503, data: {} }),
      );

      await service.dispatchDue();

      const [, patch] = (deliveryRepository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe(WebhookDeliveryStatus.FAILED);
      expect(patch.attempts).toBe(1);
      expect(patch.last_http_status).toBe(503);
      expect(patch.next_attempt_at).toBeInstanceOf(Date);
      expect(patch.next_attempt_at.getTime()).toBeGreaterThan(Date.now());
    });

    it('records a 4xx as a failure rather than throwing out of the run', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 404, data: {} }),
      );

      await expect(service.dispatchDue()).resolves.toBeUndefined();

      const [, patch] = (deliveryRepository.update as jest.Mock).mock.calls[0];
      expect(patch.last_http_status).toBe(404);
    });

    it('backs off exponentially between attempts', async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 500, data: {} }),
      );

      const delays: number[] = [];
      for (const attempts of [0, 1, 2]) {
        (deliveryRepository.update as jest.Mock).mockClear();
        (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
          delivery({ attempts }),
        ]);

        const before = Date.now();
        await service.dispatchDue();

        const [, patch] = (deliveryRepository.update as jest.Mock).mock
          .calls[0];
        delays.push(patch.next_attempt_at.getTime() - before);
      }

      expect(delays[1]).toBeGreaterThan(delays[0]);
      expect(delays[2]).toBeGreaterThan(delays[1]);
    });
  });

  describe('transport errors', () => {
    beforeEach(() => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
    });

    // AC-9. Axios puts the request URL in `message` and `config`, so the raw error must never be
    // persisted — support reads `last_error` and it is quoted back in the alert.
    it('never persists the destination URL in last_error', async () => {
      const axiosLikeError = Object.assign(
        new Error(`timeout of 15000ms exceeded for ${ENDPOINT_URL}`),
        { code: 'ECONNABORTED' },
      );
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => axiosLikeError),
      );

      await service.dispatchDue();

      const [, patch] = (deliveryRepository.update as jest.Mock).mock.calls[0];
      expect(patch.last_error).not.toContain(ENDPOINT_URL);
      expect(patch.last_error).not.toContain('external.example.org');
      expect(patch.last_error).toContain('ECONNABORTED');
    });
  });

  describe('exhaustion and the alert (AC5)', () => {
    const lastAttempt = () => delivery({ attempts: WEBHOOK_MAX_ATTEMPTS - 1 });

    beforeEach(() => {
      (httpService.post as jest.Mock).mockReturnValue(
        of({ status: 500, data: {} }),
      );
    });

    it('marks EXHAUSTED and alerts once the attempt cap is reached', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        lastAttempt(),
      ]);

      await service.dispatchDue();

      const [, patch] = (deliveryRepository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe(WebhookDeliveryStatus.EXHAUSTED);
      expect(patch.next_attempt_at).toBeNull();
      expect(alertService.alertDeliveryExhausted).toHaveBeenCalledTimes(1);
    });

    // `markAlerted` is the exactly-once guard; when it reports the row was already stamped, no second
    // alert may go out even though the row is processed again.
    it('does not alert twice for the same delivery', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        lastAttempt(),
      ]);
      (deliveryRepository.markAlerted as jest.Mock).mockResolvedValue(false);

      await service.dispatchDue();

      expect(alertService.alertDeliveryExhausted).not.toHaveBeenCalled();
    });

    it('names the recipient by acronym and never passes a URL to the alert', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        lastAttempt(),
      ]);

      await service.dispatchDue();

      const [alert] = (alertService.alertDeliveryExhausted as jest.Mock).mock
        .calls[0];
      expect(alert.recipientAcronym).toBe('EXT');
      expect(JSON.stringify(alert)).not.toContain('external.example.org');
    });

    it('abandons a delivery whose endpoint was disabled after it was queued', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
      (deliveryRepository.findEndpointById as jest.Mock).mockResolvedValue({
        ...endpoint,
        is_active: false,
      });

      await service.dispatchDue();

      expect(httpService.post).not.toHaveBeenCalled();
      const [, patch] = (deliveryRepository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe(WebhookDeliveryStatus.EXHAUSTED);
    });
  });

  describe('payload assembly failure', () => {
    it('retries rather than losing the delivery when enrichment throws', async () => {
      (deliveryRepository.claimDue as jest.Mock).mockResolvedValue([
        delivery(),
      ]);
      (bilateralService.findOne as jest.Mock).mockRejectedValue(
        new Error('enrichment blew up'),
      );

      await service.dispatchDue();

      expect(httpService.post).not.toHaveBeenCalled();
      const [, patch] = (deliveryRepository.update as jest.Mock).mock.calls[0];
      expect(patch.status).toBe(WebhookDeliveryStatus.FAILED);
      expect(patch.last_error).toContain('Payload assembly failed');
    });
  });
});
