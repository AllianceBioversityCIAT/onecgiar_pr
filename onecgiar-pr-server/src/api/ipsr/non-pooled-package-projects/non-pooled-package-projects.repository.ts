import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { NonPooledPackageProject } from './entities/non-pooled-package-project.entity';

@Injectable()
export class NonPooledPackageProjectRepository extends Repository<NonPooledPackageProject> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledPackageProject, dataSource.createEntityManager());
  }
  async updateNPPackageProjectById(resultPId: number, titleArray: string[], userId: number) {
    const titles = titleArray??[];
    const upDateInactive = `
        update non_pooled_innovation_package_project  
        set is_active = 0, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and results_package_id = ?
          and grant_title not in (${`'${titles.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateActive = `
        update non_pooled_innovation_package_project  
        set is_active = 1, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where results_package_id = ?
          and grant_title in (${`'${titles.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateAllInactive = `
      update non_pooled_innovation_package_project  
        set is_active = 0, 
          last_updated_date = NOW(),
          last_updated_by = ?
        where is_active > 0 
          and results_package_id = ?;
    `;

    try {
      if(titles?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultPId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultPId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultPId
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledPackageProjectRepository.name,
        error: `updateNPProjectById: ${error}`,
        debug: true,
      });
    }
  }
}