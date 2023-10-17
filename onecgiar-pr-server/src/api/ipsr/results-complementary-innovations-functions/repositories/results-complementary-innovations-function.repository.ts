import { Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource, Repository } from 'typeorm';
import { ResultsComplementaryInnovationsFunction } from '../entities/results-complementary-innovations-function.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsComplementaryInnovationsFunctionRepository
  extends Repository<ResultsComplementaryInnovationsFunction>
  implements LogicalDelete<ResultsComplementaryInnovationsFunction>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(
      ResultsComplementaryInnovationsFunction,
      dataSource.createEntityManager(),
    );
  }

  logicalDelete(
    resultId: number,
  ): Promise<ResultsComplementaryInnovationsFunction> {
    const queryData = `update results_complementary_innovations_function rcif 
        inner join results_complementary_innovation rci on rci.result_complementary_innovation_id = rcif.result_complementary_innovation_id 
        set rcif.is_active = 0
        where rcif.is_active > 0
            and rci.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsComplementaryInnovationsFunctionRepository.name,
          debug: true,
        }),
      );
  }
}
