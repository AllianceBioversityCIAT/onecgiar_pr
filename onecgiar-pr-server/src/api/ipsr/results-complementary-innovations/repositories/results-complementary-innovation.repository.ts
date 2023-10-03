import { Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource, Repository } from 'typeorm';
import { ResultsComplementaryInnovation } from '../entities/results-complementary-innovation.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsComplementaryInnovationRepository
  extends Repository<ResultsComplementaryInnovation>
  implements LogicalDelete<ResultsComplementaryInnovation>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsComplementaryInnovation, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultsComplementaryInnovation> {
    const queryData = `update results_complementary_innovation rci set rci.is_active = 0 where rci.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsComplementaryInnovationRepository.name,
          debug: true,
        }),
      );
  }
}
