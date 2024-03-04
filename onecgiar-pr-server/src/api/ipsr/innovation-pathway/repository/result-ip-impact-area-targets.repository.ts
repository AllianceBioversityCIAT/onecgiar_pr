import { Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource } from 'typeorm';
import { ResultIpImpactArea } from '../entities/result-ip-impact-area.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { ReplicableConfigInterface, ConfigCustomQueryInterface } from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultIpImpactAreaRepository
  extends BaseRepository<ResultIpImpactArea>
  implements LogicalDelete<ResultIpImpactArea>
{

  createQueries(
    config: ReplicableConfigInterface<ResultIpImpactArea>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_ipsr_id} AS result_by_innovation_package_id,
          impact_area_indicator_id
      FROM
          result_ip_impact_area_target
      WHERE
          result_by_innovation_package_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_impact_area_target (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              result_by_innovation_package_id,
              impact_area_indicator_id
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_ipsr_id} AS result_by_innovation_package_id,
          impact_area_indicator_id
      FROM
          result_ip_impact_area_target
      WHERE
          result_by_innovation_package_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_by_innovation_package_id
      FROM
          result_ip_impact_area_target
      WHERE
          result_by_innovation_package_id = ${config.new_ipsr_id}
          AND is_active > 0;
      `,
    };
  }

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
