import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Result } from '../../../results/entities/result.entity';
import {
  IMPACT_AREA_TAG_COLUMN,
  IMPACT_TAG_LEVEL_PRINCIPAL,
  ImpactAreaId,
} from '../constants/impact-area-tag-column';
import { ResultTypeEnum } from '../../../../shared/constants/result-type.enum';

export interface ImpactAreaCounts {
  areas: Array<{ impact_area_id: number; count: number }>;
  total: number;
}

const AREA_IDS = Object.keys(IMPACT_AREA_TAG_COLUMN).map(
  Number,
) as ImpactAreaId[];

/**
 * E6 (IRS-R-11): one aggregate over the active impact results (level 1 / type 9) of a version that
 * an initiative owns (`results_by_inititiative` role 1). An area counts a result only when its tag
 * column equals the Principal tag level id (3). Every area is always returned, zeros included.
 */
@Injectable()
export class ImpactLevelCountsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async countByArea(
    initiativeId: number,
    versionId: number,
  ): Promise<ImpactAreaCounts> {
    const principal = IMPACT_TAG_LEVEL_PRINCIPAL;
    const anyPrincipal = AREA_IDS.map(
      (id) => `r.${IMPACT_AREA_TAG_COLUMN[id]} = ${principal}`,
    ).join(' OR ');

    const qb = this.dataSource
      .createQueryBuilder(Result, 'r')
      .innerJoin(
        'r.obj_result_by_initiatives',
        'rbi',
        'rbi.is_active = 1 AND rbi.initiative_role_id = 1 AND rbi.initiative_id = :initiativeId',
        { initiativeId },
      );

    AREA_IDS.forEach((id, i) => {
      const expr = `COUNT(DISTINCT CASE WHEN r.${IMPACT_AREA_TAG_COLUMN[id]} = ${principal} THEN r.id END)`;
      if (i === 0) qb.select(expr, `area_${id}`);
      else qb.addSelect(expr, `area_${id}`);
    });
    qb.addSelect(
      `COUNT(DISTINCT CASE WHEN ${anyPrincipal} THEN r.id END)`,
      'total',
    )
      .where('r.is_active = 1')
      .andWhere('r.version_id = :versionId', { versionId })
      .andWhere('r.result_level_id = 1')
      .andWhere(`r.result_type_id = ${ResultTypeEnum.IMPACT_CONTRIBUTION}`);

    const raw = (await qb.getRawOne()) ?? {};
    return {
      areas: AREA_IDS.map((id) => ({
        impact_area_id: id,
        count: Number(raw[`area_${id}`] ?? 0),
      })),
      total: Number(raw.total ?? 0),
    };
  }
}
