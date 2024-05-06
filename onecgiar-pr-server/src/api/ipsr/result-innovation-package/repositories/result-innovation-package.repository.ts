import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInnovationPackage } from '../entities/result-innovation-package.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultInnovationPackageRepository
  extends BaseRepository<ResultInnovationPackage>
  implements LogicalDelete<ResultInnovationPackage>
{
  createQueries(
    config: ReplicableConfigInterface<ResultInnovationPackage>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          experts_is_diverse,
          is_not_diverse_justification,
          result_innovation_package_id,
          use_level_evidence_based,
          readiness_level_evidence_based,
          is_expert_workshop_organized,
          consensus_initiative_work_package_id,
          relevant_country_id,
          regional_leadership_id,
          regional_integrated_id,
          active_backstopping_id,
          initiative_expected_time,
          initiative_unit_time_id,
          bilateral_expected_time,
          bilateral_unit_time_id,
          partner_expected_time,
          partner_unit_time_id,
          is_result_ip_published,
          assessed_during_expert_workshop_id,
          ipsr_pdf_report,
          scaling_ambition_blurb
      FROM
          result_innovation_package
      WHERE
          result_innovation_package_id = ${config.old_result_id}
          AND is_active > 0;`,
      insertQuery: `
      INSERT INTO
          result_innovation_package (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              experts_is_diverse,
              is_not_diverse_justification,
              result_innovation_package_id,
              use_level_evidence_based,
              readiness_level_evidence_based,
              is_expert_workshop_organized,
              consensus_initiative_work_package_id,
              relevant_country_id,
              regional_leadership_id,
              regional_integrated_id,
              active_backstopping_id,
              initiative_expected_time,
              initiative_unit_time_id,
              bilateral_expected_time,
              bilateral_unit_time_id,
              partner_expected_time,
              partner_unit_time_id,
              is_result_ip_published,
              assessed_during_expert_workshop_id,
              ipsr_pdf_report,
              scaling_ambition_blurb
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          experts_is_diverse,
          is_not_diverse_justification,
          ${config.new_result_id} AS result_innovation_package_id,
          use_level_evidence_based,
          readiness_level_evidence_based,
          is_expert_workshop_organized,
          consensus_initiative_work_package_id,
          relevant_country_id,
          regional_leadership_id,
          regional_integrated_id,
          active_backstopping_id,
          initiative_expected_time,
          initiative_unit_time_id,
          bilateral_expected_time,
          bilateral_unit_time_id,
          partner_expected_time,
          partner_unit_time_id,
          is_result_ip_published,
          assessed_during_expert_workshop_id,
          ipsr_pdf_report,
          scaling_ambition_blurb
      FROM
          result_innovation_package
      WHERE
          result_innovation_package_id = ${config.old_result_id}
          AND is_active > 0;;
      `,
      returnQuery: `
      SELECT
          result_innovation_package_id
      FROM
          result_innovation_package
      WHERE
          result_innovation_package_id = ${config.new_result_id}
          AND is_active > 0;`,
    };
  }

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultInnovationPackage, dataSource.createEntityManager());
  }
  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rip from result_innovation_package rip where rip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInnovationPackageRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultInnovationPackage> {
    const dataQuery = `update result_innovation_package rip set rip.is_active = 0 where rip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInnovationPackageRepository.name,
          debug: true,
        }),
      );
  }
}
