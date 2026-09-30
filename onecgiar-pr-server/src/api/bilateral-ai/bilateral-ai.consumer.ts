import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { BILATERAL_AI_PROCESSING_RMQ_PATTERN } from '../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue.constants';
import { getBilateralAiMaxAttempts } from './bilateral-ai.config';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralAiDispatchService } from './services/bilateral-ai-dispatch.service';

@Controller()
export class BilateralAiConsumer {
  private readonly logger = new Logger(BilateralAiConsumer.name);

  constructor(
    private readonly bilateralAiService: BilateralAiService,
    private readonly dispatchService: BilateralAiDispatchService,
  ) {}

  @EventPattern(BILATERAL_AI_PROCESSING_RMQ_PATTERN)
  async process(
    @Payload() payload: { jobId: string },
    @Ctx() context: RmqContext,
  ) {
    // `AIQ-T-2` (`design.md` §2.3): every message asks `decide` whether to run, resume, park,
    // redirect, or wait on the lock before touching `processJob` at all.
    //
    // Reviewer B, attempt 2: `decide` is now the DB-heaviest step (`findOne`, `connect`,
    // `GET_LOCK`, two counts, `attemptStart`) and previously sat outside any try block. Nest's
    // `ServerRMQ` only nacks when no handler exists, so an uncaught throw here left the message
    // neither acked nor nacked — with `noAck:false` and `prefetchCount` = the global cap, two DB
    // blips would exhaust every prefetch slot and freeze this container's AI consumer until a
    // restart. Treated like `lock-timeout`: not a job failure, attempts stay untouched, log job
    // id + message only (no payload), and let the broker redeliver
    // (`onecgiar-pr-server/CLAUDE.md` §7 "log structured failure ... let the broker re-deliver").
    let decision: Awaited<ReturnType<typeof this.dispatchService.decide>>;
    try {
      decision = await this.dispatchService.decide(payload.jobId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Bilateral AI dispatch decide failed for job ${payload.jobId}, requeueing: ${reason}`,
      );
      context.getChannelRef().nack(context.getMessage(), false, true);
      return;
    }

    switch (decision.kind) {
      case 'lock-timeout':
        // Not a job failure — attempts stay untouched, the broker redelivers.
        context.getChannelRef().nack(context.getMessage(), false, true);
        return;
      case 'noop':
      case 'park':
        context.getChannelRef().ack(context.getMessage());
        return;
      case 'redirect':
        // The oldest eligible job was already published under the lock; this message (for the
        // now-parked job) is simply acked (`AIQ-DD-3`).
        context.getChannelRef().ack(context.getMessage());
        return;
      case 'run':
      case 'resume-retry':
        await this.runOrRetry(payload.jobId, decision.kind, context);
        return;
    }
  }

  private async runOrRetry(
    jobId: string,
    kind: 'run' | 'resume-retry',
    context: RmqContext,
  ): Promise<void> {
    // `BILATERAL_AI_MAX_ATTEMPTS` (design.md §5 "Retry semantics") — the same ceiling
    // `processJob`'s attempt-start reads; a second, hardcoded ceiling here would strand a
    // `retrying = 1` job the moment the two disagree (`APF-DD-3`).
    const maxRetries = getBilateralAiMaxAttempts();
    try {
      // `run` was already claimed by `dispatchService.decide` under the lock; `processJob` must
      // not re-run its own claim for that job (`AIQ-T-2`). `resume-retry` needs no lock and takes
      // today's unchanged path.
      await this.bilateralAiService.processJob(jobId, {
        skipClaim: kind === 'run',
      });
      context.getChannelRef().ack(context.getMessage());
    } catch (error) {
      const job = await this.bilateralAiService.getJobRaw(jobId);
      const attempts = job?.attempts ?? 0;
      const reason = error instanceof Error ? error.message : 'Unknown error';
      if (attempts < maxRetries) {
        this.logger.error(
          `Bilateral AI job ${jobId} will be retried (attempt ${attempts}/${maxRetries}): ${reason}`,
        );
        context.getChannelRef().nack(context.getMessage(), false, true);
      } else {
        this.logger.error(
          `Bilateral AI job ${jobId} failed after ${maxRetries} attempts. Discarding. Last error: ${reason}`,
        );
        context.getChannelRef().ack(context.getMessage());
      }
    }
  }
}
