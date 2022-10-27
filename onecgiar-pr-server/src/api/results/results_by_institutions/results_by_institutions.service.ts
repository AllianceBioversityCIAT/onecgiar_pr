import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { SaveResultsByInstitutionDto } from './dto/save_results_by_institution.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../result.repository';
import { Version } from '../versions/entities/version.entity';
import { VersionsService } from '../versions/versions.service';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByInstitutionsByDeliveriesType } from '../result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { Result } from '../entities/result.entity';

@Injectable()
export class ResultsByInstitutionsService {

  constructor(
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _handlersError: HandlersError
  ){}

  create(createResultsByInstitutionDto: CreateResultsByInstitutionDto) {
    return createResultsByInstitutionDto;
  }

  async getGetInstitutionsByResultId(id: number){
    try {
      const intitutions =  await this._resultByIntitutionsRepository.getResultByInstitutionFull(id);
      if(!intitutions.length){
        throw {
          response: {},
          message: 'Institutions Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGetInstitutionsActorsByResultId(id: number){
    try {
      const intitutions =  await this._resultByIntitutionsRepository.getResultByInstitutionActorsFull(id);
      if(!intitutions.length){
        throw {
          response: {},
          message: 'Institutions Actors Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGetInstitutionsPartnersByResultId(id: number){
    try {
      const institutions =  await this._resultByIntitutionsRepository.getResultByInstitutionPartnersFull(id);
      const result = await this._resultRepository.getResultById(id);
      if(institutions.length){
        const institutionsId: number[] = institutions.map(el => el.id);
        const delivery = await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByResultByInstitution(institutionsId);
        institutions.map(inst => {
          inst['deliveries'] = delivery.filter( dl => dl.result_by_institution_id == inst.id).map(res => res.partner_delivery_type_id);
        })
      }
      
      return {
        response: {
          no_applicable_partner: result.no_applicable_partner? true: false,
          institutions
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async savePartnersInstitutionsByResult(data: SaveResultsByInstitutionDto, user: TokenDto){
    try {
      const rExists = await this._resultRepository.getResultById(data.result_id);
      if(!rExists){
        throw {
          response: {},
          message: 'Result Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const result = await this._resultByIntitutionsRepository.updateIstitutions(data.result_id, data.institutions, false, user.id, data?.no_applicable_partner);
      const vrs: Version = <Version>version.response;
      rExists.no_applicable_partner = data.no_applicable_partner;
      await this._resultRepository.save(rExists);
      if(!data?.no_applicable_partner){
        for (let index = 0; index < data.institutions.length; index++) {
          const isInstitutions = await this._resultByIntitutionsRepository.getResultByInstitutionExists(data.result_id, data.institutions[index].institutions_id, false);
          if(!isInstitutions){
            const institutionsNew: ResultsByInstitution = new ResultsByInstitution();
            institutionsNew.created_by = user.id;
            institutionsNew.institution_roles_id = 2;
            institutionsNew.institutions_id = data.institutions[index].institutions_id;
            institutionsNew.last_updated_by = user.id;
            institutionsNew.result_id = data.result_id;
            institutionsNew.version_id = vrs.id;
            institutionsNew.is_active = true;
            const responseInstitution = await this._resultByIntitutionsRepository.save(institutionsNew);
            const delivery = data.institutions[index].deliveries;
            let InstitutionsDeliveriesArray: ResultByInstitutionsByDeliveriesType[] = [];
            for (let i = 0; i < delivery.length; i++) {
              const newInstitutionsDeliveries = new ResultByInstitutionsByDeliveriesType();
              newInstitutionsDeliveries.result_by_institution_id = responseInstitution.id;
              newInstitutionsDeliveries.partner_delivery_type_id = delivery[i];
              newInstitutionsDeliveries.last_updated_by = user.id;
              newInstitutionsDeliveries.versions_id = vrs.id;
              newInstitutionsDeliveries.created_by = user.id;
              InstitutionsDeliveriesArray.push(newInstitutionsDeliveries);
            }      
            await this._resultByInstitutionsByDeliveriesTypeRepository.save(InstitutionsDeliveriesArray);
          }else{
            const delivery = data.institutions[index].deliveries;
            await this._resultByInstitutionsByDeliveriesTypeRepository.inactiveResultDeLivery(isInstitutions.id, data.institutions[index].deliveries);
            let InstitutionsDeliveriesArray: ResultByInstitutionsByDeliveriesType[] = [];
            if(delivery){
              for (let i = 0; i < delivery.length; i++) {
                const exist = await this._resultByInstitutionsByDeliveriesTypeRepository.getDeliveryByTypeAndResultByInstitution(isInstitutions.id, data.institutions[index].deliveries[i]);
                if(!exist){
                  const newInstitutionsDeliveries = new ResultByInstitutionsByDeliveriesType();
                  newInstitutionsDeliveries.result_by_institution_id = isInstitutions.id;
                  newInstitutionsDeliveries.partner_delivery_type_id = delivery[i];
                  newInstitutionsDeliveries.last_updated_by = user.id;
                  newInstitutionsDeliveries.versions_id = vrs.id;
                  newInstitutionsDeliveries.created_by = user.id;
                  InstitutionsDeliveriesArray.push(newInstitutionsDeliveries);
                }
              } 
              await this._resultByInstitutionsByDeliveriesTypeRepository.save(InstitutionsDeliveriesArray);
            }
          }
        }

      }

      return {
        response: {
          result
        },
        message: 'Successfully update partners',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findAll() {
    return `This action returns all resultsByInstitutions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByInstitution`;
  }

  update(
    id: number,
    updateResultsByInstitutionDto: UpdateResultsByInstitutionDto,
  ) {
    return `This action updates a #${id} resultsByInstitution ${updateResultsByInstitutionDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInstitution`;
  }
}