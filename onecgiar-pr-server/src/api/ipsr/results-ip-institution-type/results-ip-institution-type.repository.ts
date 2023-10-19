import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsIpInstitutionType } from './entities/results-ip-institution-type.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsIpInstitutionTypeRepository
  extends Repository<ResultsIpInstitutionType>
  implements LogicalDelete<ResultsIpInstitutionType>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsIpInstitutionType, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete ririt from result_ip_result_institution_types ririt 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = ririt.result_ip_results_id 
    where rbip.result_innovation_package_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsIpInstitutionTypeRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsIpInstitutionType> {
    const queryData = `update result_ip_result_institution_types ririt 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = ririt.result_ip_results_id 
    set ririt.is_active = 0
    where ririt.is_active > 0
      and rbip.result_innovation_package_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsIpInstitutionTypeRepository.name,
          debug: true,
        }),
      );
  }
}
