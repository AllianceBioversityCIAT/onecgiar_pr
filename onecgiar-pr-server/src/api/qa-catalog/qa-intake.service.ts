// @akili-spec quality-assurance/qa-intake
import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ClarisaApiKeyValidationMis } from '../bilateral/interfaces/clarisa-api-key-validation.interface';
import {
  QaIntakeNotTaken,
  QaIntakeResponse,
  QaIntakeTaken,
  QaReleaseNotReleased,
  QaReleaseOutcome,
  QaReleaseReleased,
  QaReleaseReason,
  QaReleaseResponse,
} from './dto/qa-intake-response.dto';
import {
  QA_INTAKE_ACTION,
  QaIntakeAction,
  QA_INTAKE_ROUTE,
  QA_RELEASE_ROUTE,
  QA_WRITE_FAILED_MESSAGE,
} from './qa-intake.constants';
import { QaIntakeRepository, QaReleaseLockedRow } from './qa-intake.repository';
import { QaCatalogService } from './qa-catalog.service';
import { IneligibleReason, QaResultsRepository } from './qa-results.repository';
import { ResultStatusData } from '../../shared/constants/result-status.enum';

const SUBMITTED_STATUS_ID = ResultStatusData.Submitted.value;

/** QIN-DD-6: the audit action each release outcome writes. */
const RELEASE_ACTION_BY_OUTCOME: Record<QaReleaseOutcome, QaIntakeAction> = {
  qaed: QA_INTAKE_ACTION.RELEASE_QAED,
  not_qaed: QA_INTAKE_ACTION.RELEASE_NOT_QAED,
};

/** The already-validated input (the DTO of QIN-T-4 is structurally assignable to it). */
export interface QaIntakeInput {
  phase_year: number;
  result_ids: readonly number[];
}

/** The already-validated release input (the DTO of QIN-T-4 is structurally assignable to it). Items are unique by id. */
export interface QaReleaseInput {
  phase_year: number;
  items: readonly { result_id: number; outcome: QaReleaseOutcome }[];
}

/** The compare-and-set matched fewer rows than classified: state drifted under the lock (QIN-R-8). No ids, no SQL. */
export class QaIntakeCasMismatchError extends Error {
  constructor(expected: number, matched: number) {
    super(`QA intake CAS matched ${matched} of ${expected} rows`);
    this.name = 'QaIntakeCasMismatchError';
  }
}

/**
 * QIN-R-2 / R-3 / R-5 / R-7 / R-8 / R-9 (design section 7, item 2): marks eligible Submitted results In QA.
 * One transaction per call: lock the rows, classify under the lock with the feed's own `classify` (QIN-DD-2),
 * one CAS UPDATE for the rows that change, one audit INSERT for the same rows. Writes only `result.in_qa` and the audit.
 *
 * `release` (design section 7, item 3, QIN-R-4) is the same skeleton in the other direction: it ends QA with an outcome.
 */
@Injectable()
export class QaIntakeService {
  private readonly logger = new Logger(QaIntakeService.name);

  constructor(
    private readonly qaCatalogService: QaCatalogService,
    private readonly qaResultsRepository: QaResultsRepository,
    private readonly qaIntakeRepository: QaIntakeRepository,
    private readonly dataSource: DataSource,
  ) {}

  async intake(
    input: QaIntakeInput,
    platform: ClarisaApiKeyValidationMis,
  ): Promise<QaIntakeResponse> {
    const startedAt = Date.now();
    const year = input.phase_year;
    // Same 404 as `/api/qa/catalog` for a year with no catalog (QIN-R-2); thrown before any read or write.
    this.qaCatalogService.getCatalog(year);
    // QIN-R-2: duplicates collapse, first appearance wins.
    const ids = [...new Set(input.result_ids)];

    const response = await this.guarded(QA_INTAKE_ROUTE, year, () =>
      this.dataSource.transaction((manager) =>
        this.applyIntake(ids, year, platform, manager),
      ),
    );

    // QIN NFR Observability: route, year, counts, duration - never the key, ids or values.
    const changed = response.taken.filter((t) => t.changed).length;
    this.logger.log(
      `route=${QA_INTAKE_ROUTE} year=${year} changed=${changed} unchanged=${response.taken.length - changed} rejected=${response.not_taken.length} duration_ms=${Date.now() - startedAt}`,
    );
    return response;
  }

  /**
   * QIN-R-4 / R-5 / R-7 / R-8 / R-9 (design section 7 item 3). Same skeleton as `intake`: 404 without a catalog, then one
   * transaction (lock, classify, CAS UPDATEs, assert, audit INSERT), all through `manager`, behind the generic-failure boundary.
   */
  async release(
    input: QaReleaseInput,
    platform: ClarisaApiKeyValidationMis,
  ): Promise<QaReleaseResponse> {
    const startedAt = Date.now();
    const year = input.phase_year;
    // Same 404 as `/api/qa/catalog` for a year with no catalog (QIN-R-2); thrown before any read or write.
    this.qaCatalogService.getCatalog(year);

    const response = await this.guarded(QA_RELEASE_ROUTE, year, () =>
      this.dataSource.transaction((manager) =>
        this.applyRelease(input.items, year, platform, manager),
      ),
    );

    // QIN NFR Observability: route, year, counts, duration - never the key, ids or values.
    const qaed = response.released.filter((r) => r.outcome === 'qaed').length;
    this.logger.log(
      `route=${QA_RELEASE_ROUTE} year=${year} released_qaed=${qaed} released_not_qaed=${response.released.length - qaed} rejected=${response.not_released.length} duration_ms=${Date.now() - startedAt}`,
    );
    return response;
  }

  /** Everything between BEGIN and COMMIT: every statement goes through `manager` (P-10). */
  private async applyRelease(
    items: QaReleaseInput['items'],
    year: number,
    platform: ClarisaApiKeyValidationMis,
    manager: EntityManager,
  ): Promise<QaReleaseResponse> {
    const ids = items.map((item) => item.result_id);
    const locked = await this.qaIntakeRepository.lockRowsForRelease(
      ids,
      year,
      manager,
    );
    // classify owns `not_found` (unknown or inactive) and the result_code. Its other reasons are intake's, not release's:
    // QIN-R-4 asks only for In QA + Submitted + requested phase. Classify checks status before phase, release the reverse, so
    // `other_phase` and the rest come from the locked row below.
    const classified = new Map(
      (await this.qaResultsRepository.classify(ids, year, manager)).map((c) => [
        c.result_id,
        c,
      ]),
    );

    const released: QaReleaseReleased[] = [];
    const notReleased: QaReleaseNotReleased[] = [];
    for (const { result_id, outcome } of items) {
      const c = classified.get(result_id);
      const row = locked.get(result_id);
      const reason = this.releaseReason(c?.reason, row);
      if (reason === null) {
        released.push({ result_id, result_code: c.result_code, outcome });
      } else {
        notReleased.push({
          result_id,
          result_code: c?.result_code ?? null,
          reason,
        });
      }
    }

    // One CAS UPDATE per outcome present. Each asserts its own count (QIN-R-8): a short count means the state drifted
    // since the lock read. Throw: the whole batch rolls back, including a statement that already ran.
    for (const [outcome, write] of [
      [
        'qaed',
        (r: readonly number[]) =>
          this.qaIntakeRepository.releaseQaed(r, manager),
      ],
      [
        'not_qaed',
        (r: readonly number[]) =>
          this.qaIntakeRepository.releaseNotQaed(r, manager),
      ],
    ] as const) {
      const planned = released
        .filter((r) => r.outcome === outcome)
        .map((r) => r.result_id);
      const matched = await write(planned);
      if (matched !== planned.length) {
        throw new QaIntakeCasMismatchError(planned.length, matched);
      }
    }

    await this.qaIntakeRepository.insertAudit(
      released.map(({ result_id, outcome }) => ({
        result_id,
        action: RELEASE_ACTION_BY_OUTCOME[outcome],
        phase_year: year,
        platform_id: platform.id,
        platform_acronym: platform.acronym,
      })),
      manager,
    );
    return { phase_year: year, released, not_released: notReleased };
  }

  /** QIN-R-4 reason order: not_found, other_phase, not_in_qa, not_submitted. `null` = releasable. */
  private releaseReason(
    classifyReason: IneligibleReason | null | undefined,
    row: QaReleaseLockedRow | undefined,
  ): QaReleaseReason | null {
    if (
      classifyReason === undefined ||
      classifyReason === 'not_found' ||
      !row
    ) {
      return 'not_found';
    }
    if (!row.in_phase) return 'other_phase';
    // QIN-DD-11: a result reaches QAed only through intake, so `in_qa = 0` is refused whatever its status.
    if (!row.in_qa) return 'not_in_qa';
    if (row.status_id !== SUBMITTED_STATUS_ID) return 'not_submitted';
    return null;
  }

  /** Everything between BEGIN and COMMIT: every statement goes through `manager` (P-10). */
  private async applyIntake(
    ids: readonly number[],
    year: number,
    platform: ClarisaApiKeyValidationMis,
    manager: EntityManager,
  ): Promise<QaIntakeResponse> {
    const inQa = await this.qaIntakeRepository.lockRows(ids, manager);
    const classified = await this.qaResultsRepository.classify(
      ids,
      year,
      manager,
    );

    const taken: QaIntakeTaken[] = [];
    const notTaken: QaIntakeNotTaken[] = [];
    for (const c of classified) {
      if (c.reason === null) {
        taken.push({
          result_id: c.result_id,
          result_code: c.result_code,
          // Eligible and already In QA: nothing to write, nothing to audit (QIN-R-3).
          changed: inQa.get(c.result_id) !== true,
        });
      } else {
        notTaken.push({
          result_id: c.result_id,
          result_code: c.result_code,
          reason: c.reason,
        });
      }
    }

    const changedIds = taken.filter((t) => t.changed).map((t) => t.result_id);
    if (changedIds.length > 0) {
      const matched = await this.qaIntakeRepository.markInQa(
        changedIds,
        manager,
      );
      // QIN-R-8: a short count means the state drifted since classify. Throw: the whole batch rolls back.
      if (matched !== changedIds.length) {
        throw new QaIntakeCasMismatchError(changedIds.length, matched);
      }
      await this.qaIntakeRepository.insertAudit(
        changedIds.map((result_id) => ({
          result_id,
          action: QA_INTAKE_ACTION.INTAKE,
          phase_year: year,
          platform_id: platform.id,
          platform_acronym: platform.acronym,
        })),
        manager,
      );
    }
    return { phase_year: year, taken, not_taken: notTaken };
  }

  /** The one generic-failure boundary around the write (design section 7 item 4): nothing the driver says leaves it. */
  private async guarded<T>(
    route: string,
    year: number,
    write: () => Promise<T>,
  ): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const kind =
        error instanceof Error ? error.constructor.name : typeof error;
      this.logger.error(`route=${route} year=${year} write failed (${kind})`);
      throw new InternalServerErrorException(QA_WRITE_FAILED_MESSAGE);
    }
  }
}
