import { Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource, Repository } from 'typeorm';
import { ResultIpImpactArea } from '../entities/result-ip-impact-area.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultIpImpactAreaRepository
  extends Repository<ResultIpImpactArea>
  implements LogicalDelete<ResultIpImpactArea>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpImpactArea, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete ria from result_ip_impact_area_target ria 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = ria.result_by_innovation_package_id 
    where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpImpactAreaRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpImpactArea> {
    const dataQuery = `update result_ip_impact_area_target ria 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = ria.result_by_innovation_package_id 
    set ria.is_active = 0
    where ria.is_active > 0
      and rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpImpactAreaRepository.name,
          debug: true,
        }),
      );
  }

  async getImpactAreas(resultByInnovationPackageId: number) {
    const query = `
        SELECT 
            riia.impact_area_indicator_id AS targetId,
            cia.name,
            cgt.target
        FROM
            result_ip_impact_area_target riia
            LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = riia.impact_area_indicator_id
            LEFT JOIN clarisa_impact_areas cia ON cia.id = cgt.impactAreaId
        WHERE riia.is_active  > 0
            AND riia.result_by_innovation_package_id = ?;
        `;

    try {
      const impactAreas: any[] = await this.query(query, [
        resultByInnovationPackageId,
      ]);
      return impactAreas;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpImpactAreaRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
