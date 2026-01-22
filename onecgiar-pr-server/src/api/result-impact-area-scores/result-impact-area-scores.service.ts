import { HttpStatus, Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/entities/base-service';
import { ResultImpactAreaScore } from './entities/result-impact-area-score.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ImpactAreasScoresComponent } from '../results/impact_areas_scores_components/entities/impact_areas_scores_component.entity';
import { transformDataToArray } from '../../shared/utils/array.util';
import { isEmpty } from 'class-validator';

@Injectable()
export class ResultImpactAreaScoresService extends BaseServiceSimple<
  ResultImpactAreaScore,
  Repository<ResultImpactAreaScore>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultImpactAreaScore,
      dataSource.getRepository(ResultImpactAreaScore),
      'result_id',
      currentUser,
    );
  }

  async validateImpactAreaScores(
    impactAreaIds: number | number[],
    impactAreaScoresToAdd: Partial<ResultImpactAreaScore>[],
  ) {
    if (!isEmpty(impactAreaIds)) {
      const impactAreaIdsArray = transformDataToArray(impactAreaIds);
      const impactAreaScores = await this.dataSource
        .getRepository(ImpactAreasScoresComponent)
        .find({
          where: { id: In(impactAreaIdsArray) },
        })
        .then((components) =>
          components.map((component) => ({
            impact_area_score_id: component.id,
          })),
        );
      const foundIds = new Set(
        impactAreaScores.map((c) => Number(c.impact_area_score_id)),
      );
      const missingIds = impactAreaIdsArray.filter(
        (id) => !foundIds.has(Number(id)),
      );
      if (missingIds.length) {
        throw {
          response: {},
          message: `The impact area scores ${missingIds.join(', ')} do not exist`,
          status: HttpStatus.NOT_FOUND,
        };
      }
      impactAreaScoresToAdd.push(...impactAreaScores);
    }
  }
}
