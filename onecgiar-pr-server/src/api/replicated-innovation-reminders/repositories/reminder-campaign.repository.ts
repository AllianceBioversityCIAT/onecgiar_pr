// @akili-spec changes/replicated-innovation-reminders
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import {
  ReplicatedInnovationReminderCampaign,
  ReplicatedReminderStatus,
} from '../entities/replicated-innovation-reminder-campaign.entity';
import { ReplicatedInnovationReminderLog } from '../entities/replicated-innovation-reminder-log.entity';

export interface CampaignFinalState {
  status: ReplicatedReminderStatus.SENT | ReplicatedReminderStatus.FAILED;
  sent_count: number;
  skipped_count: number;
  failed_count: number;
  unreachable_count: number;
  last_error: string | null;
  sent_at: Date;
}

export interface ReminderLogInsert {
  campaign_id: number;
  recipient_email: string;
  result_ids: string;
  cc_count: number;
  redirected: boolean;
}

const LAST_ERROR_MAX = 500;

/** True for the MySQL duplicate-key error, however the driver wraps it (`RIR-R-8`). */
export function isDuplicateEntryError(error: any): boolean {
  return (
    error?.code === 'ER_DUP_ENTRY' ||
    error?.driverError?.code === 'ER_DUP_ENTRY' ||
    error?.errno === 1062 ||
    error?.driverError?.errno === 1062
  );
}

/**
 * `RIR-T-4` — persistence the dispatcher needs: the claim, the stale release, the final stamp and
 * the send-log INSERT (design §2.2, §5, `RIR-DD-2`).
 *
 * The claim relies on `UpdateResult.affected`, which TypeORM's MySQL query runner fills from the
 * driver's `affectedRows` (the same pattern `WebhookDeliveryRepository.claimDue` already runs in
 * production on the same two-server topology, `RIR-P-7`). It is safe as a claim because the claim
 * changes `status`, so a matched row is always a changed row.
 */
@Injectable()
export class ReminderCampaignRepository extends Repository<ReplicatedInnovationReminderCampaign> {
  constructor(private readonly dataSource: DataSource) {
    super(
      ReplicatedInnovationReminderCampaign,
      dataSource.createEntityManager(),
    );
  }

  /** Campaign with its phase, for the dispatcher. */
  findWithPhase(id: number) {
    return this.findOne({ where: { id }, relations: { obj_version: true } });
  }

  /**
   * `allowed` -> SENDING in one statement, stamping `claimedAt`. Returns true only for the instance
   * that won it. The cron passes [PENDING]; Send now passes [PENDING, FAILED] (a retry).
   */
  async claim(
    id: number,
    claimedAt: Date,
    allowed: ReplicatedReminderStatus[],
  ): Promise<boolean> {
    const result = await this.createQueryBuilder()
      .update(ReplicatedInnovationReminderCampaign)
      .set({ status: ReplicatedReminderStatus.SENDING, claimed_at: claimedAt })
      .where('id = :id', { id })
      .andWhere('status IN (:...statuses)', { statuses: allowed })
      .execute();
    return !!result.affected;
  }

  /** SENDING claims older than `olderThan` -> FAILED so a retry can re-claim them. */
  async releaseStale(olderThan: Date): Promise<number> {
    const result = await this.createQueryBuilder()
      .update(ReplicatedInnovationReminderCampaign)
      .set({
        status: ReplicatedReminderStatus.FAILED,
        last_error: 'stale claim released',
      })
      .where('status = :status', { status: ReplicatedReminderStatus.SENDING })
      .andWhere('claimed_at <= :olderThan', { olderThan })
      .execute();
    return result.affected ?? 0;
  }

  /**
   * Ids of PENDING campaigns whose UTC `scheduled_at` has arrived, oldest first, and ONLY of the
   * active Reporting phase: a due campaign of a closed phase must never be sent by the cron
   * (same predicate as `VersioningService.$_findActivePhase`).
   */
  async findDueIds(now: Date): Promise<number[]> {
    const rows = await this.createQueryBuilder('c')
      .innerJoin('c.obj_version', 'v')
      .select('c.id', 'id')
      .where('c.status = :status', { status: ReplicatedReminderStatus.PENDING })
      .andWhere('c.scheduled_at <= :now', { now })
      .andWhere('v.status = :vStatus', { vStatus: true })
      .andWhere('v.is_active = :vActive', { vActive: true })
      .andWhere('v.app_module_id = :moduleId', {
        moduleId: AppModuleIdEnum.REPORTING,
      })
      .orderBy('c.scheduled_at', 'ASC')
      .getRawMany<{ id: string }>();
    return rows.map((row) => Number(row.id));
  }

  /**
   * Stamp the end of a dispatch. Guarded on `status = SENDING` AND `claimed_at = <this run's claim>`,
   * so it can never overwrite a cancel, a stale-release, or a newer claim by another run. Returns
   * false when nothing was updated (the result is NOT saved).
   *
   * Count semantics across retries (a FAILED campaign can be re-claimed by Send now):
   * - `sent_count` ADDS this run's sends to the stored total (40 then 60 => 100);
   * - `skipped_count`, `failed_count`, `unreachable_count` are THIS run's values: a retry skips the
   *   earlier recipients through the log, so adding skipped would double-count earlier sends, and
   *   unreachable is a snapshot of the pending set.
   */
  async finalize(
    id: number,
    claimedAt: Date,
    final: CampaignFinalState,
  ): Promise<boolean> {
    const { sent_count, ...rest } = final;
    const result = await this.createQueryBuilder()
      .update(ReplicatedInnovationReminderCampaign)
      .set({
        ...rest,
        sent_count: () => 'sent_count + :sentInc',
        last_error: final.last_error
          ? final.last_error.slice(0, LAST_ERROR_MAX)
          : null,
      })
      .setParameter('sentInc', Math.max(0, Math.trunc(sent_count)))
      .where('id = :id', { id })
      .andWhere('status = :status', {
        status: ReplicatedReminderStatus.SENDING,
      })
      .andWhere('claimed_at = :claimedAt', { claimedAt })
      .execute();
    return !!result.affected;
  }

  /**
   * INSERT the send-log row (autocommit, before the emit). A duplicate (campaign, recipient) throws
   * `ER_DUP_ENTRY`; the dispatcher recognises it with `isDuplicateEntryError` and skips (`RIR-R-8`).
   */
  async insertLog(row: ReminderLogInsert): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(ReplicatedInnovationReminderLog)
      .values(row)
      .execute();
  }
}
