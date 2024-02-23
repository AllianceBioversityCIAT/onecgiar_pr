import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { NonPooledProject } from './entities/non-pooled-project.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class NonPooledProjectRepository
  extends BaseRepository<NonPooledProject>
  implements LogicalDelete<NonPooledProject>
{
  createQueries(
    config: ReplicableConfigInterface<NonPooledProject>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
        null as id,
        npp.grant_title,
        npp.center_grant_id,
        npp.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as results_id,
        npp.funder_institution_id,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        npp.lead_center_id,
        npp.non_pooled_project_type_id
        from non_pooled_project npp where npp.results_id = ${
          config.old_result_id
        } and is_active > 0
      `,
      insertQuery: `
      insert into non_pooled_project (
        grant_title,
        center_grant_id,
        is_active,
        created_date,
        last_updated_date,
        results_id,
        funder_institution_id,
        created_by,
        last_updated_by,
        lead_center_id,
        non_pooled_project_type_id
        ) select 
        npp.grant_title,
        npp.center_grant_id,
        npp.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as results_id,
        npp.funder_institution_id,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        npp.lead_center_id,
        npp.non_pooled_project_type_id
        from non_pooled_project npp where npp.results_id = ${
          config.old_result_id
        } and is_active > 0`,
      returnQuery: `
        select 
          npp.*
          from non_pooled_project npp where npp.results_id = ${config.new_result_id}
        `,
    };
  }
  private readonly _logger: Logger = new Logger(
    NonPooledProjectRepository.name,
  );
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledProject, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete npp from non_pooled_project npp where npp.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: NonPooledProjectRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<NonPooledProject> {
    const queryData = `update non_pooled_project npp set npp.is_active = 0 where npp.results_id = ? and npp.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: NonPooledProjectRepository.name,
          debug: true,
        }),
      );
  }

  async getAllNPProject() {
    const queryData = `
    select 
      npp.id,
      npp.grant_title,
      npp.center_grant_id,
      npp.is_active,
      npp.created_date,
      npp.last_updated_date,
      npp.results_id,
      npp.lead_center_id,
      npp.funder_institution_id,
      npp.created_by,
      npp.last_updated_by
      from non_pooled_project npp;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData);
      return npProject;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllNPProjectById(
    resultId: number,
    grantTitle: string,
    role: number,
  ) {
    const queryData = `
    select 
      npp.id,
      npp.grant_title,
      npp.center_grant_id,
      npp.is_active,
      npp.created_date,
      npp.last_updated_date,
      npp.results_id,
      npp.lead_center_id,
      npp.funder_institution_id,
      npp.created_by,
      npp.last_updated_by
      from non_pooled_project npp
      WHERE npp.results_id = ?
      	and npp.grant_title ${!grantTitle ? `is null` : `= '${grantTitle}'`}
        and npp.non_pooled_project_type_id = ?
      order by npp.id desc;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData, [
        resultId,
        role,
      ]);
      return npProject?.length ? npProject[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllNPProjectByNPId(resultId: number, nppId: number, role: number) {
    const queryData = `
    select 
      npp.id,
      npp.grant_title,
      npp.center_grant_id,
      npp.is_active,
      npp.created_date,
      npp.last_updated_date,
      npp.results_id,
      npp.lead_center_id,
      npp.funder_institution_id,
      npp.created_by,
      npp.last_updated_by
      from non_pooled_project npp
      WHERE npp.results_id = ?
      	and npp.id = ?
        and npp.non_pooled_project_type_id = ?;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData, [
        resultId,
        nppId || null,
        role,
      ]);
      return npProject?.length ? npProject[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllNPProjectByResultId(resultId: number, type: number) {
    const queryData = `
    select 
      npp.id,
      npp.grant_title,
      npp.center_grant_id,
      npp.is_active,
      npp.created_date,
      npp.last_updated_date,
      npp.results_id,
      npp.lead_center_id as lead_center,
      npp.funder_institution_id as funder,
      npp.created_by,
      npp.last_updated_by
      from non_pooled_project npp
      WHERE npp.results_id = ?
        and npp.is_active > 0
        and npp.non_pooled_project_type_id = ?;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData, [
        resultId,
        type,
      ]);
      return npProject;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateNPProjectById(
    resultId: number,
    titleArray: string[],
    userId: number,
    role: number,
  ) {
    const titles = titleArray ?? [];
    const upDateInactive = `
        update non_pooled_project  
        set is_active = 0, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and results_id = ?
          and non_pooled_project_type_id = ?
          and grant_title not in (${`'${titles
            .toString()
            .replace(/,/g, "','")}'`});
    `;

    const upDateActive = `
        update non_pooled_project  
        set is_active = 1, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where results_id = ?
          and non_pooled_project_type_id = ?
          and grant_title in (${`'${titles.toString().replace(/,/g, "','")}'`});
    `;

    const upDateAllInactive = `
      update non_pooled_project  
        set is_active = 0, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and results_id = ?
          and non_pooled_project_type_id = ?;
    `;

    try {
      if (titles?.length) {
        await this.query(upDateInactive, [userId, resultId, role]);

        return await this.query(upDateActive, [userId, resultId, role]);
      } else {
        return await this.query(upDateAllInactive, [userId, resultId, role]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: `updateEvidences ${error}`,
        debug: true,
      });
    }
  }
}
