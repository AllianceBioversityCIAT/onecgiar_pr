import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { NonPooledProject } from './entities/non-pooled-project.entity';

@Injectable()
export class NonPooledProjectRepository extends Repository<NonPooledProject> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledProject, dataSource.createEntityManager());
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

  async getAllNPProjectById(resultId: number, grantTitle: string) {
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
      	and npp.grant_title ${!grantTitle?`is null`: `= ${grantTitle}`}
      order by npp.id desc;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData, [resultId]);
      return npProject?.length? npProject[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllNPProjectByNPId(resultId: number, nppId: number) {
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
      	and npp.id = ?;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData, [resultId, nppId || null]);
      return npProject?.length? npProject[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllNPProjectByResultId(resultId: number) {
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
        and npp.is_active > 0;
    `;
    try {
      const npProject: NonPooledProject[] = await this.query(queryData, [resultId]);
      return npProject;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateNPProjectById(resultId: number, titleArray: string[], userId: number) {
    const titles = titleArray??[];
    const upDateInactive = `
        update non_pooled_project  
        set is_active = 0, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and results_id = ?
          and grant_title not in (${`'${titles.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateActive = `
        update non_pooled_project  
        set is_active = 1, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where results_id = ?
          and grant_title in (${`'${titles.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateAllInactive = `
      update non_pooled_project  
        set is_active = 0, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and results_id = ?;
    `;

    try {
      if(titles?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId
        ]);
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
