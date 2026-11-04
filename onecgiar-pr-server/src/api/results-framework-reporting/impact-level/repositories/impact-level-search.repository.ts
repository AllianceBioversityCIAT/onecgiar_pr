import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Result } from '../../../results/entities/result.entity';
import { ImpactPreviousResultItem } from '../dto/impact-level-info.dto';

export interface ImpactSearchParams {
  q?: string;
  versionId?: number;
  portfolioId?: number;
  typeIds?: number[];
  excludeResultId?: number;
  page: number;
  limit: number;
  /** Id of the open reporting phase, or null when none is open (design section 5). */
  activeVersionId: number | null;
}

/** Escapes LIKE wildcards (MySQL default escape character is the backslash). */
const escapeForLike = (value: string): string =>
  value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * E5 (IRS-R-10): cross-portfolio search over active results. Read-only; every column and relation
 * used here belongs to `Result` (`obj_result_type`, `obj_version`, `obj_status`) and `Version`
 * (`obj_portfolio`, `phase_year`, `phase_name`, `portfolio_id`).
 */
@Injectable()
export class ImpactLevelSearchRepository {
  constructor(private readonly dataSource: DataSource) {}

  async search(
    params: ImpactSearchParams,
  ): Promise<{ items: ImpactPreviousResultItem[]; total: number }> {
    const qb = this.dataSource
      .createQueryBuilder(Result, 'r')
      .leftJoin('r.obj_result_type', 'rtype')
      .leftJoin('r.obj_version', 'version')
      .leftJoin('version.obj_portfolio', 'portfolio')
      .leftJoin('r.obj_status', 'status')
      .where('r.is_active = :isActive', { isActive: true });

    if (params.excludeResultId !== undefined) {
      qb.andWhere('r.id <> :excludeResultId', {
        excludeResultId: params.excludeResultId,
      });
    }
    if (params.versionId !== undefined) {
      qb.andWhere('r.version_id = :versionId', { versionId: params.versionId });
    }
    if (params.portfolioId !== undefined) {
      qb.andWhere('version.portfolio_id = :portfolioId', {
        portfolioId: params.portfolioId,
      });
    }
    if (params.typeIds?.length) {
      qb.andWhere('r.result_type_id IN (:...typeIds)', {
        typeIds: params.typeIds,
      });
    }
    const q = params.q?.trim();
    if (q) {
      const qLike = `%${escapeForLike(q)}%`;
      if (/^\d+$/.test(q)) {
        qb.andWhere('(r.result_code = :qCode OR r.title LIKE :qLike)', {
          qCode: Number(q),
          qLike,
        });
      } else {
        qb.andWhere('r.title LIKE :qLike', { qLike });
      }
    }

    // Many-to-one joins only, so the count is not inflated by them.
    const total = await qb.clone().getCount();

    const rows: Array<Record<string, any>> = await qb
      .select([
        'r.id AS result_id',
        'r.result_code AS result_code',
        'r.title AS title',
        'rtype.name AS result_type_name',
        'version.phase_name AS phase_name',
        'portfolio.acronym AS portfolio_acronym',
        'status.status_name AS status_name',
      ])
      .addSelect(
        'CASE WHEN r.version_id = :activeVersionId THEN 1 ELSE 0 END',
        'is_active_phase',
      )
      .setParameter('activeVersionId', params.activeVersionId ?? 0)
      .orderBy('is_active_phase', 'DESC')
      .addOrderBy('version.phase_year', 'DESC')
      .addOrderBy('r.result_code', 'ASC')
      .addOrderBy('r.id', 'ASC')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit)
      .getRawMany();

    return {
      total,
      items: rows.map((r) => ({
        result_id: Number(r.result_id),
        result_code: Number(r.result_code),
        title: r.title,
        result_type_name: r.result_type_name ?? null,
        phase_name: r.phase_name ?? null,
        portfolio_acronym: r.portfolio_acronym ?? null,
        status_name: r.status_name ?? null,
      })),
    };
  }
}
