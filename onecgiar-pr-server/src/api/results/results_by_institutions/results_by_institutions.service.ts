import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { SaveResultsByInstitutionDto } from './dto/save_results_by_institution.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultRepository } from '../result.repository';

@Injectable()
export class ResultsByInstitutionsService {

  constructor(
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultRepository: ResultRepository,
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
      const intitutions =  await this._resultByIntitutionsRepository.getResultByInstitutionPartnersFull(id);
      if(!intitutions.length){
        throw {
          response: {},
          message: 'Institutions Partners Not Found',
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
      const result = await this._resultByIntitutionsRepository.updateIstitutions(data.result_id, data.institutions_id, false, user.id);
      return {
        response: result,
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
