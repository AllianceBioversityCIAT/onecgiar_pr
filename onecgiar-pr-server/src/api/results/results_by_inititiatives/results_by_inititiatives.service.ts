import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsByInititiativeDto } from './dto/create-results_by_inititiative.dto';
import { UpdateResultsByInititiativeDto } from './dto/update-results_by_inititiative.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from './resultByInitiatives.repository';

@Injectable()
export class ResultsByInititiativesService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository
  ){}

  create(createResultsByInititiativeDto: CreateResultsByInititiativeDto) {
    return 'This action adds a new resultsByInititiative';
  }

  findAll() {
    try {
      this._resultByInitiativesRepository.find();
    } catch (error) {
      
    }
    return `This action returns all resultsByInititiatives`;
  }

  async findAllByResultId(id: number) {
    try {
      const initiatives = await this._resultByInitiativesRepository.InitiativeByResult(id);
      if(!initiatives.length){
        throw {
          response: {},
          message: 'Initiatives by Result not found',
          status: HttpStatus.NOT_FOUND
        }
      }

      return {
        
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  update(id: number, updateResultsByInititiativeDto: UpdateResultsByInititiativeDto) {
    return `This action updates a #${id} resultsByInititiative`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInititiative`;
  }
}
