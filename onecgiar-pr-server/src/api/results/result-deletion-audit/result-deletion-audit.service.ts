import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultDeletionAudit } from './entities/result-deletion-audit.entity';
import { ResultDeletionAuditSource } from './result-deletion-audit-source.enum';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Injectable()
export class ResultDeletionAuditService {
  private readonly logger = new Logger(ResultDeletionAuditService.name);

  constructor(
    @InjectRepository(ResultDeletionAudit)
    private readonly repository: Repository<ResultDeletionAudit>,
  ) {}

  async recordDeletion(params: {
    resultId: number;
    userId: number;
    deletionSource: ResultDeletionAuditSource;
    justification?: string | null;
  }): Promise<void> {
    const justification =
      params.justification?.trim().length > 0
        ? params.justification.trim()
        : null;

    const row = this.repository.create({
      result_id: params.resultId,
      deleted_by_user_id: params.userId,
      created_by: params.userId,
      last_updated_by: params.userId,
      justification,
      deletion_source: params.deletionSource,
    });

    await this.repository.save(row);
  }

  /**
   * One sentence explaining that a result the user is still working on has been deleted — who did
   * it and when — or `null` when this table knows nothing about it.
   *
   * Why it exists: a reporter can keep a section open for hours. If the result is deleted in the
   * meantime, the save comes back `404 Result not found.`, which reads like a platform failure and
   * gets reported as a bug (Slack `#prms-*`, 16-sep-2026: the result was deleted from Manage Data
   * at 09:57 and the reporter saved at 10:09, twelve minutes later). The audit row already had the
   * answer — nothing read it. This turns the dead end into "talk to this person".
   *
   * 🛑 It NEVER throws. The caller is an error path already: a failure here must not replace a
   * clean 404 with a 500. On any problem it returns `null` and the caller keeps its own message.
   */
  async describeDeletion(resultId: number): Promise<string | null> {
    try {
      const row = await this.repository.findOne({
        where: { result_id: resultId },
        relations: { obj_deleted_by: true },
        order: { created_date: 'DESC' },
      });

      if (!row) return null;

      const when = this.formatUtc(row.created_date);
      const author = this.describeAuthor(row);

      // The date can be missing on a row written before the column existed; the sentence still has
      // to work, so each half is optional and only what is known is stated.
      const head = when
        ? `This result was deleted on ${when}${author ? ` by ${author}` : ''}.`
        : `This result was deleted${author ? ` by ${author}` : ''}.`;

      const justification = row.justification?.trim();
      const reason = justification ? ` Reason: "${justification}".` : '';
      const contact = author
        ? ' Please contact them if it needs to be restored.'
        : '';

      return `${head} Nothing you entered was saved.${reason}${contact}`;
    } catch (error) {
      this.logger.warn(
        `Could not read the deletion audit for result ${resultId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  /** `Juan Carlos Cadavid (j.cadavid@cgiar.org)`, or as much of it as the user row still has. */
  private describeAuthor(row: ResultDeletionAudit): string {
    const user = row.obj_deleted_by;
    const name = [user?.first_name, user?.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ');
    const email = user?.email?.trim();

    if (name && email) return `${name} (${email})`;
    return name || email || '';
  }

  /**
   * `16 Sep 2026, 14:57 UTC`. Always UTC and always labelled: the server stores UTC and the
   * readers are in a dozen time zones, so a bare time would be wrong for most of them.
   */
  private formatUtc(date: Date | string | null | undefined): string {
    if (!date) return '';
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return '';

    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = MONTHS[value.getUTCMonth()];
    const hours = String(value.getUTCHours()).padStart(2, '0');
    const minutes = String(value.getUTCMinutes()).padStart(2, '0');

    return `${day} ${month} ${value.getUTCFullYear()}, ${hours}:${minutes} UTC`;
  }
}
