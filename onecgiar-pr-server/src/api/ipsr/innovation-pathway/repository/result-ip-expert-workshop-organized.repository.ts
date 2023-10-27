import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpExpertWorkshopOrganized } from '../entities/result-ip-expert-workshop-organized.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultIpExpertWorkshopOrganizedRepostory
  extends Repository<ResultIpExpertWorkshopOrganized>
  implements LogicalDelete<ResultIpExpertWorkshopOrganized>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpExpertWorkshopOrganized, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultIpExpertWorkshopOrganized> {
    const dataQuery = `update result_ip_expert_workshop_organized riewo set riewo.is_active = 0 where riewo.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertWorkshopOrganizedRepostory.name,
          debug: true,
        }),
      );
  }
}
