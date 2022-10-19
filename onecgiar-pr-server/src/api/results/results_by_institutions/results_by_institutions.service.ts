import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultsByInstitutionsService {

  constructor(
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
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
          message: 'Institutions Not fount',
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
