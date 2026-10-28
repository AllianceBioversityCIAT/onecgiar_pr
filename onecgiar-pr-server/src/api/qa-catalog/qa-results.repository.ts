// @akili-spec quality-assurance/qa-results-feed
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SourceEnum } from '../results/entities/result.entity';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import {
  CATALOGUED_RESULT_TYPE_IDS,
  RESULT_TYPE_ID_BY_KEY,
  RESULT_TYPE_KEY_BY_ID,
} from './definitions/result-type-ids';

/** QRF-R-8 reasons, in the order the checks run (first failing check wins). */
export type IneligibleReason =
  | 'not_found'
  | 'not_submitted'
  | 'other_phase'
  | 'not_w1w2'
  | 'type_not_catalogued'
  | 'no_lead_program';

/** QRF-DD-3 (pending OQ-4): a `phase_year` spans Reporting and IPSR versions. Single knob. */
const PHASE_APP_MODULE_IDS: readonly number[] = [
  AppModuleIdEnum.REPORTING,
  AppModuleIdEnum.IPSR,
];
const SUBMITTED_STATUS_ID = ResultStatusData.Submitted.value;
/** QRF-DD-3 / P-6: W1/W2 results carry the column default `source = 'Result'`. */
const W1W2_SOURCE = SourceEnum.Result;
/** Initiative role of the lead program (P-9, `result.repository.ts` exemplar). */
const LEAD_ROLE_ID = 1;

export interface EligibilityFilter {
  phaseYear: number;
  /** CLARISA initiative ids, matched against the LEAD program only; empty/absent = no filter. */
  programIds?: readonly number[];
  /** Catalog keys; empty/absent = no filter. A key with no id matches nothing. */
  resultTypeKeys?: readonly string[];
}

export interface EligiblePageRequest extends EligibilityFilter {
  page: number;
  pageSize: number;
}

/** One list item (QRF-R-5). `submitted_at` is UTC ISO-8601, null only for a Submitted row with no submission history. */
export interface EligibleResultRow {
  result_id: number;
  result_code: number;
  program: { clarisa_id: number; code: string };
  result_type_key: string;
  submitted_at: string | null;
}

/** QRF-R-6 breakdown of the filtered set. */
export interface EligibleBreakdown {
  by_program: { clarisa_id: number; code: string; count: number }[];
  by_result_type: { key: string; count: number }[];
}

export interface ClassifiedResult {
  result_id: number;
  /** `null` = eligible. */
  reason: IneligibleReason | null;
  /** Catalog key; set whenever the result type is catalogued (also for ineligible rows), else null. */
  result_type_key: string | null;
}

interface ClassifyRow {
  result_id: number;
  is_active: number | boolean | null;
  status_id: number | null;
  source: string | null;
  result_type_id: number | null;
  phase_year: number | null;
  app_module_id: number | null;
  has_lead_program: number | boolean | null;
}

interface EligibilityClauses {
  /** `FROM ... WHERE ...` shared by page, count and breakdown. */
  from: string;
  params: unknown[];
  /** The filter can match nothing (e.g. only unknown type keys): no query is needed. */
  matchesNothing: boolean;
}

const placeholders = (n: number) => Array(n).fill('?').join(', ');

/**
 * Raw parameterized SQL over the existing `prdb` tables (no entity, no migration). One eligibility
 * predicate (QRF-R-3) is built once and reused by `findPage`, `count`, `breakdown`; `classify`
 * re-evaluates the same conditions row by row so that both routes agree.
 */
@Injectable()
export class QaResultsRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Page of eligible results ordered by `submitted_at` then `result_id` (QRF-R-5). */
  async findPage(req: EligiblePageRequest): Promise<EligibleResultRow[]> {
    const clauses = this.buildEligibility(req);
    if (clauses.matchesNothing) return [];
    // QRF-DD-5: submit history = active `submission` rows with status = true.
    const sql = `SELECT r.id AS result_id,
  r.result_code AS result_code,
  r.result_type_id AS result_type_id,
  ci.id AS program_clarisa_id,
  ci.official_code AS program_code,
  (SELECT UNIX_TIMESTAMP(MAX(s.created_date))
     FROM submission s
    WHERE s.results_id = r.id AND s.is_active = 1 AND s.status = 1) AS submitted_epoch
${clauses.from}
ORDER BY submitted_epoch ASC, r.id ASC
LIMIT ? OFFSET ?`;
    const rows: Record<string, unknown>[] = await this.dataSource.query(sql, [
      ...clauses.params,
      req.pageSize,
      (req.page - 1) * req.pageSize,
    ]);
    return rows.map((row) => ({
      result_id: Number(row.result_id),
      result_code: Number(row.result_code),
      program: {
        clarisa_id: Number(row.program_clarisa_id),
        code: String(row.program_code),
      },
      result_type_key: RESULT_TYPE_KEY_BY_ID[Number(row.result_type_id)],
      submitted_at:
        row.submitted_epoch === null || row.submitted_epoch === undefined
          ? null
          : new Date(Number(row.submitted_epoch) * 1000).toISOString(),
    }));
  }

  /** `total` of the filtered set (QRF-R-4 scenario: counted over the filtered set only). */
  async count(filter: EligibilityFilter): Promise<number> {
    const clauses = this.buildEligibility(filter);
    if (clauses.matchesNothing) return 0;
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT COUNT(*) AS total\n${clauses.from}`,
      clauses.params,
    );
    return Number(rows[0]?.total ?? 0);
  }

  /** QRF-R-6: counts of the filtered set by lead program and by result type key. */
  async breakdown(filter: EligibilityFilter): Promise<EligibleBreakdown> {
    const clauses = this.buildEligibility(filter);
    if (clauses.matchesNothing) return { by_program: [], by_result_type: [] };
    const [programRows, typeRows]: Record<string, unknown>[][] =
      await Promise.all([
        this.dataSource.query(
          `SELECT ci.id AS clarisa_id, ci.official_code AS code, COUNT(*) AS total
${clauses.from}
GROUP BY ci.id, ci.official_code
ORDER BY ci.official_code ASC, ci.id ASC`,
          clauses.params,
        ),
        this.dataSource.query(
          `SELECT r.result_type_id AS result_type_id, COUNT(*) AS total
${clauses.from}
GROUP BY r.result_type_id
ORDER BY r.result_type_id ASC`,
          clauses.params,
        ),
      ]);
    return {
      by_program: programRows.map((row) => ({
        clarisa_id: Number(row.clarisa_id),
        code: String(row.code),
        count: Number(row.total),
      })),
      by_result_type: typeRows.map((row) => ({
        key: RESULT_TYPE_KEY_BY_ID[Number(row.result_type_id)],
        count: Number(row.total),
      })),
    };
  }

  /**
   * QRF-R-8: every requested id (deduplicated, in request order) with the FIRST failing check in the
   * order not_found, not_submitted, other_phase, not_w1w2, type_not_catalogued, no_lead_program.
   * Reads without the eligibility predicate, so the failing reason is observable.
   */
  async classify(
    ids: readonly number[],
    phaseYear: number,
  ): Promise<ClassifiedResult[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return [];
    const rows: ClassifyRow[] = await this.dataSource.query(
      `SELECT r.id AS result_id,
  r.is_active AS is_active,
  r.status_id AS status_id,
  r.source AS source,
  r.result_type_id AS result_type_id,
  v.phase_year AS phase_year,
  v.app_module_id AS app_module_id,
  EXISTS (
    SELECT 1
      FROM results_by_inititiative rbi
      INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
     WHERE rbi.result_id = r.id AND rbi.is_active = 1 AND rbi.initiative_role_id = ${LEAD_ROLE_ID}
  ) AS has_lead_program
FROM result r
LEFT JOIN version v ON v.id = r.version_id
WHERE r.id IN (${placeholders(unique.length)})`,
      unique,
    );
    const byId = new Map(rows.map((row) => [Number(row.result_id), row]));
    return unique.map((id) => {
      const row = byId.get(id);
      return {
        result_id: id,
        reason: row ? this.firstFailingReason(row, phaseYear) : 'not_found',
        result_type_key: row ? this.typeKeyOf(row) : null,
      };
    });
  }

  private typeKeyOf(row: ClassifyRow): string | null {
    return RESULT_TYPE_KEY_BY_ID[Number(row.result_type_id)] ?? null;
  }

  /** An inactive (soft-deleted) result is treated as `not_found`: it does not exist for QA. */
  private firstFailingReason(
    row: ClassifyRow,
    phaseYear: number,
  ): IneligibleReason | null {
    if (!row.is_active) return 'not_found';
    if (Number(row.status_id) !== SUBMITTED_STATUS_ID) return 'not_submitted';
    if (
      Number(row.phase_year) !== phaseYear ||
      !PHASE_APP_MODULE_IDS.includes(Number(row.app_module_id))
    ) {
      return 'other_phase';
    }
    if (row.source !== W1W2_SOURCE) return 'not_w1w2';
    if (this.typeKeyOf(row) === null) return 'type_not_catalogued';
    if (!row.has_lead_program) return 'no_lead_program';
    return null;
  }

  /** QRF-R-3 predicate + QRF-R-4 filters. Every value is bound; only trusted constants are inlined. */
  private buildEligibility(filter: EligibilityFilter): EligibilityClauses {
    const requestedKeys = filter.resultTypeKeys ?? [];
    const typeIds =
      requestedKeys.length === 0
        ? [...CATALOGUED_RESULT_TYPE_IDS]
        : [
            ...new Set(
              requestedKeys
                .map((key) => RESULT_TYPE_ID_BY_KEY[key])
                .filter((id): id is number => id !== undefined),
            ),
          ];
    const programIds = filter.programIds ?? [];

    const params: unknown[] = [
      filter.phaseYear,
      ...PHASE_APP_MODULE_IDS,
      ...typeIds,
    ];
    let programClause = '';
    if (programIds.length > 0) {
      programClause = `\n  AND rbi.inititiative_id IN (${placeholders(programIds.length)})`;
      params.push(...programIds);
    }

    const from = `FROM result r
INNER JOIN version v ON v.id = r.version_id
INNER JOIN results_by_inititiative rbi
  ON rbi.result_id = r.id AND rbi.is_active = 1 AND rbi.initiative_role_id = ${LEAD_ROLE_ID}
INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
WHERE r.is_active = 1
  AND r.status_id = ${SUBMITTED_STATUS_ID}
  AND r.source = '${W1W2_SOURCE}'
  AND v.phase_year = ?
  AND v.app_module_id IN (${placeholders(PHASE_APP_MODULE_IDS.length)})
  AND r.result_type_id IN (${placeholders(typeIds.length)})${programClause}`;

    return { from, params, matchesNothing: typeIds.length === 0 };
  }
}
