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
} from './dto/qa-intake-response.dto';
import {
  QA_INTAKE_ACTION,
  QA_INTAKE_ROUTE,
  QA_WRITE_FAILED_MESSAGE,
} from './qa-intake.constants';
import { QaIntakeRepository } from './qa-intake.repository';
import { QaCatalogService } from './qa-catalog.service';
import { QaResultsRepository } from './qa-results.repository';

/** The already-validated input (the DTO of QIN-T-4 is structurally assignable to it). */
export interface QaIntakeInput {
  phase_year: number;
  result_ids: readonly number[];
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

    const response = await this.guarded(year, () =>
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
  private async guarded<T>(year: number, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const kind =
        error instanceof Error ? error.constructor.name : typeof error;
      this.logger.error(
        `route=${QA_INTAKE_ROUTE} year=${year} write failed (${kind})`,
      );
      throw new InternalServerErrorException(QA_WRITE_FAILED_MESSAGE);
    }
  }
}
