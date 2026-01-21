import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/entities/base-service';
import { ResultImpactAreaScore } from './entities/result-impact-area-score.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

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
}
