import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInstitutionsByDeliveriesType } from './entities/result-by-institutions-by-deliveries-type.entity';

@Injectable()
export class ResultByInstitutionsByDeliveriesTypeRepository extends Repository<ResultByInstitutionsByDeliveriesType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultByInstitutionsByDeliveriesType, dataSource.createEntityManager());
  }

  async getDeliveryByTypeAndResultByInstitution(resultByInstitution: number, deliveryType: number){
    const query = `
    select 
    rbibdt.id,
    rbibdt.is_active,
    rbibdt.created_date,
    rbibdt.last_updated_date,
    rbibdt.partner_delivery_type_id,
    rbibdt.result_by_institution_id,
    rbibdt.versions_id,
    rbibdt.created_by,
    rbibdt.last_updated_by
    from result_by_institutions_by_deliveries_type rbibdt 
    where rbibdt.is_active > 0
    	and rbibdt.result_by_institution_id = ?
    	and rbibdt.partner_delivery_type_id = ?;
    `;

    try {
      const result: ResultByInstitutionsByDeliveriesType[] = await this.query(query, [
        resultByInstitution, deliveryType
        ]);
      return result.length? result[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInstitutionsByDeliveriesType.name,
        error: error,
        debug: true,
      });
    }
  }

  async getDeliveryByResultByInstitution(resultByInstitutionsId: number[]){
    const query = `
    select 
    rbibdt.id,
    rbibdt.is_active,
    rbibdt.created_date,
    rbibdt.last_updated_date,
    rbibdt.partner_delivery_type_id,
    rbibdt.result_by_institution_id,
    rbibdt.versions_id,
    rbibdt.created_by,
    rbibdt.last_updated_by
    from result_by_institutions_by_deliveries_type rbibdt 
    where rbibdt.is_active > 0
    	and rbibdt.result_by_institution_id in (${resultByInstitutionsId.toString()});
    `;

    try {
      const result: ResultByInstitutionsByDeliveriesType[] = await this.query(query);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInstitutionsByDeliveriesType.name,
        error: error,
        debug: true,
      });
    }
  }

  async inactiveResultDeLivery(resultByInstitution: number, deliveryType: number[]){
    const updateInactive = `
    update result_by_institutions_by_deliveries_type 
    set is_active = 0,
    	last_updated_date  = NOW(),
    	last_updated_by = 1
    	where is_active > 0
    		and result_by_institution_id = ?
    		and partner_delivery_type_id not in (${deliveryType.toString()});
    `;

    const updateActive = `
    update result_by_institutions_by_deliveries_type 
    set is_active = 1,
    	last_updated_date  = NOW(),
    	last_updated_by = 1
    	where result_by_institution_id = ?
    		and partner_delivery_type_id in (${deliveryType.toString()});
    `;

    const inactiveAll = `
    update result_by_institutions_by_deliveries_type 
    set is_active = 0,
    	last_updated_date  = NOW(),
    	last_updated_by = 1
    	where result_by_institution_id = ?;
    `;
    try {
      if(deliveryType.length){
        const resultInactive = await this.query(updateInactive, [
          resultByInstitution
          ]);

          return await this.query(updateActive, [
          resultByInstitution
          ]);
      }else{
        return await this.query(inactiveAll, [
          resultByInstitution
          ]);
      }

    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInstitutionsByDeliveriesType.name,
        error: error,
        debug: true,
      });
    }
  }

}