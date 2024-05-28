import { Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource } from 'typeorm';
import { ResultIpSdgTargets } from '../entities/result-ip-sdg-targets.entity';
import { env } from 'process';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultIpSdgTargetRepository
  extends BaseRepository<ResultIpSdgTargets>
  implements LogicalDelete<ResultIpSdgTargets>
{
  createQueries(
    config: ReplicableConfigInterface<ResultIpSdgTargets>,
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
          result_by_innovation_package_id,
          clarisa_sdg_usnd_code,
          clarisa_sdg_target_id
      FROM
          result_ip_sdg_targets
      WHERE
          result_by_innovation_package_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_sdg_targets (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              result_by_innovation_package_id,
              clarisa_sdg_usnd_code,
              clarisa_sdg_target_id
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_ipsr_id} AS result_by_innovation_package_id,
          clarisa_sdg_usnd_code,
          clarisa_sdg_target_id
      FROM
          result_ip_sdg_targets
      WHERE
          result_by_innovation_package_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_ip_sdg_target_id
      FROM
          result_ip_sdg_targets
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
    super(ResultIpSdgTargets, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rist from result_ip_sdg_targets rist 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rist.result_by_innovation_package_id 
    where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpSdgTargetRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpSdgTargets> {
    const dataQuery = `update result_ip_sdg_targets rist 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rist.result_by_innovation_package_id 
    set rist.is_active = 0
    where rist.is_active > 0
      and rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpSdgTargetRepository.name,
          debug: true,
        }),
      );
  }

  async getSdgs(resultByInnovationPackageId: number) {
    const query = `
        SELECT 
            ris.clarisa_sdg_target_id AS id,
            (
                SELECT
                    cst.sdg_target_code
                FROM
                    clarisa_sdgs_targets cst
                WHERE cst.id = ris.clarisa_sdg_target_id
            ) AS sdg_target_code,
            (
                SELECT
                    cst.sdg_target
                FROM
                    clarisa_sdgs_targets cst
                WHERE cst.id = ris.clarisa_sdg_target_id
            ) AS sdg_target
        FROM
            result_ip_sdg_targets ris
        WHERE ris.is_active > 0
            AND result_by_innovation_package_id = ?
        ORDER BY ris.clarisa_sdg_target_id ASC;
        `;

    try {
      const sdgsTarget: ResultIpSdgTargets[] = await this.query(query, [
        resultByInnovationPackageId,
      ]);
      return sdgsTarget;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpSdgTargetRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getSdgsByIpAndSdgId(
    resultByInnovationPackageId: number,
    sdgId: number,
  ) {
    const query = `
        SELECT 
            *
        FROM
            result_ip_sdg_targets ris
        WHERE ris.is_active > 0
            AND result_by_innovation_package_id = ?
            AND clarisa_sdg_target_id = ?
        `;

    try {
      const sdgsTarget: ResultIpSdgTargets[] = await this.query(query, [
        resultByInnovationPackageId,
        sdgId,
      ]);
      return sdgsTarget?.length ? sdgsTarget[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpSdgTargetRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateSdg(
    resultByInnovationPackageId: number,
    sdgsArray: number[],
    user: number,
  ) {
    const sdgs = sdgsArray ?? [];

    const updateInactive = `
        UPDATE
            result_ip_sdg_targets
        SET
            is_active = 0,
            last_updated_date = NOW(),
            last_updated_by = ${user}
        WHERE is_active > 0
            AND result_by_innovation_package_id = ?
            AND clarisa_sdg_target_id NOT IN (${sdgs});
        `;

    const updateActive = `
        UPDATE
            result_ip_sdg_targets
        SET
            is_active = 1,
            last_updated_date = NOW(),
            last_updated_by = ${user}
        WHERE result_by_innovation_package_id = ?
            AND clarisa_sdg_target_id IN (${sdgs});
        `;

    const updateAllInactive = `
        UPDATE
            result_ip_sdg_targets
        SET
            is_active = 0,
            last_updated_date = NOW(),
            last_updated_by = ${user}
        WHERE result_by_innovation_package_id = ?;
        `;

    try {
      if (sdgs?.length) {
        await this.query(updateInactive, [resultByInnovationPackageId]);

        return await this.query(updateActive, [resultByInnovationPackageId]);
      } else {
        return await this.query(updateAllInactive, [
          resultByInnovationPackageId,
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpSdgTargetRepository.name,
        error: `Update SDGs ${error}`,
        debug: true,
      });
    }
  }

  async mapSdgsToc(coreId: number, initId: number) {
    try {
      const query = `
      SELECT
          DISTINCT cst.id AS clarisa_sdg_target_id,
          tsr.sdg_id AS clarisa_sdg_usnd_code
      FROM
          ${env.DB_OST}.clarisa_sdg_targets cst
          LEFT JOIN ${env.DB_OST}.toc_sdg_results_sdg_targets tsrst ON tsrst.sdg_target_id = cst.id
          LEFT JOIN ${env.DB_OST}.toc_sdg_results tsr ON tsr.toc_result_id = tsrst.sdg_toc_result_id
          LEFT JOIN ${env.DB_OST}.toc_results_sdg_results trsr ON trsr.sdg_toc_result_id = tsr.toc_result_id
          LEFT JOIN ${env.DB_OST}.toc_results tr1 ON tr1.toc_result_id = trsr.toc_result_id
      WHERE
          tsrst.is_active = 1
          AND tr1.toc_result_id IN (
              SELECT
                  tr2.toc_internal_id
              FROM
                  prdb.toc_result tr2
                  LEFT JOIN prdb.results_toc_result rtr ON rtr.toc_result_id = tr2.toc_result_id
                  AND rtr.is_active = 1
              WHERE
                  rtr.results_id = ?
                  AND rtr.initiative_id = ?
                  AND tr2.inititiative_id = ?
                  AND tr2.is_active = 1
          );
        `;

      const sdgsTarget: any[] = await this.dataSource.query(query, [
        coreId,
        initId,
        initId,
      ]);
      return sdgsTarget;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpSdgTargetRepository.name,
        error: `Map SDGs ToC ${error}`,
        debug: true,
      });
    }
  }
}
