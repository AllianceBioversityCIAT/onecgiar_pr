import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionTypeDto } from './dto/create-results_by_institution_type.dto';
import { UpdateResultsByInstitutionTypeDto } from './dto/update-results_by_institution_type.dto';
import { ResultByIntitutionsTypeRepository } from './result_by_intitutions_type.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultsByInstitutionTypesService {

  constructor(
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _handlersError: HandlersError
  ){}

  create(createResultsByInstitutionTypeDto: CreateResultsByInstitutionTypeDto) {
    return createResultsByInstitutionTypeDto;
  }

  findAll() {
    return `This action returns all resultsByInstitutionTypes`;
  }

  async getGetInstitutionsTypeByResultId(id: number){
    try {
      const intitutionsType =  await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypeFull(id);
      if(!intitutionsType.length){
        throw {
          response: {},
          message: 'Institutions Type Not fount',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutionsType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGetInstitutionsTypeActorsByResultId(id: number){
    try {
      const intitutionsType =  await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypeActorFull(id);
      if(!intitutionsType.length){
        throw {
          response: {},
          message: 'Institutions Type Actors Not fount',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutionsType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getGetInstitutionsTypePartnersByResultId(id: number){
    try {
      const intitutionsType =  await this._resultByIntitutionsTypeRepository.getResultByInstitutionTypePartnersFull(id);
      if(!intitutionsType.length){
        throw {
          response: {},
          message: 'Institutions Type Partners Not fount',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: intitutionsType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByInstitutionType`;
  }

  update(
    id: number,
    updateResultsByInstitutionTypeDto: UpdateResultsByInstitutionTypeDto,
  ) {
    return `This action updates a #${id} resultsByInstitutionType ${updateResultsByInstitutionTypeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInstitutionType`;
  }
}
