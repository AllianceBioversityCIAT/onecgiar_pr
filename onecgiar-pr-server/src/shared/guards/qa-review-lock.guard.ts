import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE } from '../constants/qa-review-lock.constant';

/**
 * QA review lock for USER section saves.
 *
 * While QA holds a result (`result.in_qa = 1`) in an open phase (`version.status = 1`), a user
 * route that saves a section of it answers 409 with {@link RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE}.
 * Same predicate as `ResultRepository.unsubmitUnlessUnderQaReview` (QIN-R-6).
 *
 * 🛑 Why a route guard and not a check inside the services: several save methods are shared with
 * system processes that write without a user — bilateral ingestion and resubmission
 * (`InnovationUseService.saveInnovationUse`, `applyDspaceMetadata`), the admin bulk KP sync
 * (`syncAgain`), framework creation (`saveGeoScopeV2`, `updateContributorsAndPartners`), the
 * bilateral review flows. A check in those methods would block them too. The guard sits only on
 * the routes a user calls to save a section.
 */
export const QA_REVIEW_LOCK_TARGET = 'qaReviewLockTarget';

/** Where the guarded route carries the result (or something that resolves to it). */
export type QaReviewLockTarget =
  /** A route param that IS the result id. */
  | { param: string }
  /** A body field that IS the result id. */
  | { body: string }
  /** A route param that is a row id of another table; the lookup gives the result id. */
  | { param: string; lookup: QaReviewLockLookup }
  /** A body that is an array of items; each item's key is a row id of another table. */
  | { bodyArrayKey: string; lookup: QaReviewLockLookup };

/**
 * Fixed table/column names (code literals, never input) that map a row id to its result id.
 */
export const QA_REVIEW_LOCK_LOOKUPS = {
  nonPooledProject: {
    table: 'non_pooled_project',
    idColumn: 'id',
    resultColumn: 'results_id',
  },
  aiReviewSession: {
    table: 'ai_review_session',
    idColumn: 'id',
    resultColumn: 'result_id',
  },
  /** The Innovation Package the enabler rows belong to. */
  resultByInnovationPackage: {
    table: 'result_by_innovation_package',
    idColumn: 'result_by_innovation_package_id',
    resultColumn: 'result_innovation_package_id',
  },
} as const;
export type QaReviewLockLookup =
  (typeof QA_REVIEW_LOCK_LOOKUPS)[keyof typeof QA_REVIEW_LOCK_LOOKUPS];

const toIds = (values: unknown[]): number[] =>
  [...new Set(values.map((v) => Number(v)))].filter(
    (n) => Number.isInteger(n) && n > 0,
  );

@Injectable()
export class QaReviewLockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const target = this.reflector.get<QaReviewLockTarget>(
      QA_REVIEW_LOCK_TARGET,
      context.getHandler(),
    );
    if (!target) return true;

    const request = context.switchToHttp().getRequest();
    const resultIds = await this.resolveResultIds(target, request);
    // Nothing usable (missing / malformed id): let the route answer as it always did.
    if (resultIds.length === 0) return true;

    const rows: unknown[] = await this.dataSource.query(
      `SELECT r.id
FROM \`result\` r
JOIN \`version\` v ON v.id = r.version_id
WHERE r.id IN (${resultIds.map(() => '?').join(', ')})
  AND r.in_qa = 1
  AND v.status = 1
LIMIT 1`,
      resultIds,
    );
    if (rows?.length) {
      throw new ConflictException(RESULT_UNDER_QA_REVIEW_EDIT_MESSAGE);
    }
    return true;
  }

  private async resolveResultIds(
    target: QaReviewLockTarget,
    request: any,
  ): Promise<number[]> {
    if ('bodyArrayKey' in target) {
      const items = Array.isArray(request?.body) ? request.body : [];
      const rowIds = toIds(items.map((i: any) => i?.[target.bodyArrayKey]));
      return this.lookup(target.lookup, rowIds);
    }
    if ('lookup' in target) {
      return this.lookup(
        target.lookup,
        toIds([request?.params?.[target.param]]),
      );
    }
    if ('param' in target) return toIds([request?.params?.[target.param]]);
    return toIds([request?.body?.[target.body]]);
  }

  private async lookup(
    lookup: QaReviewLockLookup,
    rowIds: number[],
  ): Promise<number[]> {
    if (rowIds.length === 0) return [];
    const rows: { result_id: unknown }[] = await this.dataSource.query(
      `SELECT \`${lookup.resultColumn}\` AS result_id FROM \`${lookup.table}\` WHERE \`${lookup.idColumn}\` IN (${rowIds.map(() => '?').join(', ')})`,
      rowIds,
    );
    return toIds((rows ?? []).map((r) => r.result_id));
  }
}

/** Marks a user section-save route: 409 while QA holds the result. */
export const LockedWhileInQa = (target: QaReviewLockTarget) =>
  applyDecorators(
    SetMetadata(QA_REVIEW_LOCK_TARGET, target),
    UseGuards(QaReviewLockGuard),
  );
