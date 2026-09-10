import { Test } from '@nestjs/testing';
import { ResultRepository } from '../result.repository';
import { ResultsService } from '../results.service';
import { ReviewDecisionEnum } from '../dto/review-decision.dto';
import { WebhookRecipientType } from './entities/webhook-endpoint.entity';
import { WebhookDeliveryRepository } from './webhook-delivery.repository';

/**
 * P2-3166 AC1 — the enqueue side, exercised through `ResultsService`.
 *
 * `ResultsService` takes 61 constructor dependencies, so this uses Nest's `useMocker` to auto-provide
 * them and overrides only the two the hook touches. That is a new pattern in this repo; the
 * alternative was 61 hand-written mocks in a spec about two of them.
 *
 * `enqueueBilateralWebhook` is private, which is correct — nothing outside the review flow should
 * call it — so it is invoked through the instance rather than being made public for the test.
 */
describe('ResultsService — bilateral webhook enqueue (P2-3166 AC1)', () => {
  let service: ResultsService;
  let resultRepository: { findOne: jest.Mock };
  let webhookRepository: {
    findActiveEndpoint: jest.Mock;
    enqueue: jest.Mock;
  };

  const enqueue = (decision = ReviewDecisionEnum.APPROVE, resultId = 555) =>
    (
      service as unknown as {
        enqueueBilateralWebhook: (
          id: number,
          d: ReviewDecisionEnum,
        ) => Promise<void>;
      }
    ).enqueueBilateralWebhook(resultId, decision);

  beforeEach(async () => {
    resultRepository = { findOne: jest.fn() };
    webhookRepository = {
      findActiveEndpoint: jest.fn(),
      enqueue: jest.fn().mockResolvedValue({ id: 900 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: ResultRepository, useValue: resultRepository },
        { provide: WebhookDeliveryRepository, useValue: webhookRepository },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    service = moduleRef.get<ResultsService>(ResultsService);
  });

  describe('when the result came from an external platform', () => {
    beforeEach(() => {
      resultRepository.findOne.mockResolvedValue({
        id: 555,
        external_platform_id: 42,
      });
    });

    it('queues one delivery against that platform’s active endpoint', async () => {
      webhookRepository.findActiveEndpoint.mockResolvedValue({ id: 7 });

      await enqueue(ReviewDecisionEnum.REJECT);

      expect(webhookRepository.findActiveEndpoint).toHaveBeenCalledWith(
        WebhookRecipientType.PLATFORM,
        42,
      );
      expect(webhookRepository.enqueue).toHaveBeenCalledWith(
        555,
        7,
        ReviewDecisionEnum.REJECT,
      );
    });

    it('queues nothing when the platform has no endpoint registered', async () => {
      webhookRepository.findActiveEndpoint.mockResolvedValue(null);

      await enqueue();

      expect(webhookRepository.enqueue).not.toHaveBeenCalled();
    });
  });

  /**
   * The counterexample that matters. `source` is 'API' for a centre-authored bilateral result, for an
   * AI draft promotion, and for anything under SGP-02 — none of which has a platform to notify.
   * Anyone "simplifying" the resolver to `source === 'API'` breaks exactly here.
   */
  describe('when the result has no originating platform', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['zero', 0],
    ])(
      'queues nothing when external_platform_id is %s',
      async (_label, value) => {
        resultRepository.findOne.mockResolvedValue({
          id: 555,
          external_platform_id: value,
        });

        await enqueue();

        expect(webhookRepository.findActiveEndpoint).not.toHaveBeenCalled();
        expect(webhookRepository.enqueue).not.toHaveBeenCalled();
      },
    );

    it('queues nothing when the result itself cannot be found', async () => {
      resultRepository.findOne.mockResolvedValue(null);

      await enqueue();

      expect(webhookRepository.enqueue).not.toHaveBeenCalled();
    });
  });

  /**
   * NFR-1. The decision is already committed by the time the hook runs, so nothing here may turn a
   * successful review into an error response.
   */
  describe('never fails the review decision', () => {
    it('swallows a repository lookup failure', async () => {
      resultRepository.findOne.mockRejectedValue(new Error('db unreachable'));

      await expect(enqueue()).resolves.toBeUndefined();
    });

    it('swallows a failure while writing the outbox row', async () => {
      resultRepository.findOne.mockResolvedValue({
        id: 555,
        external_platform_id: 42,
      });
      webhookRepository.findActiveEndpoint.mockResolvedValue({ id: 7 });
      webhookRepository.enqueue.mockRejectedValue(new Error('insert failed'));

      await expect(enqueue()).resolves.toBeUndefined();
    });
  });

  it('reads only the two columns it needs', async () => {
    resultRepository.findOne.mockResolvedValue({
      id: 555,
      external_platform_id: 42,
    });
    webhookRepository.findActiveEndpoint.mockResolvedValue({ id: 7 });

    await enqueue();

    expect(resultRepository.findOne).toHaveBeenCalledWith({
      where: { id: 555 },
      select: ['id', 'external_platform_id'],
    });
  });
});
