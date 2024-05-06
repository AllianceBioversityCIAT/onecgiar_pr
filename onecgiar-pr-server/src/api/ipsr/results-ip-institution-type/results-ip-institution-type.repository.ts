import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsIpInstitutionType } from './entities/results-ip-institution-type.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';

@Injectable()
export class ResultsIpInstitutionTypeRepository
  extends BaseRepository<ResultsIpInstitutionType>
  implements LogicalDelete<ResultsIpInstitutionType>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsIpInstitutionType>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          how_many,
          ${config.new_ipsr_id} result_ip_results_id,
          institution_types_id,
          institution_roles_id,
          evidence_link,
          other_institution,
          graduate_students
      FROM
          result_ip_result_institution_types
      WHERE
          result_ip_results_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_result_institution_types (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              how_many,
              result_ip_results_id,
              institution_types_id,
              institution_roles_id,
              evidence_link,
              other_institution,
              graduate_students
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          how_many,
          ${config.new_ipsr_id} result_ip_results_id,
          institution_types_id,
          institution_roles_id,
          evidence_link,
          other_institution,
          graduate_students
      FROM
          result_ip_result_institution_types
      WHERE
          result_ip_results_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          id
      FROM
          result_ip_result_institution_types
      WHERE
          result_ip_results_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
    };
  }

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
