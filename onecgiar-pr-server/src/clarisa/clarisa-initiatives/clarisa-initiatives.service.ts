import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaInitiativeDto } from './dto/create-clarisa-initiative.dto';
import { UpdateClarisaInitiativeDto } from './dto/update-clarisa-initiative.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';

@Injectable()
export class ClarisaInitiativesService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository
  ){}
  create(createClarisaInitiativeDto: CreateClarisaInitiativeDto) {
    return createClarisaInitiativeDto;
  }

  async getAllInitiativesWithoutCurrentInitiative(resultId:number){
    try {
      const initiative = await this._clarisaInitiativesRepository.getAllInitiativesWithoutCurrentInitiative(resultId);
      if (!initiative.length) {
        throw {
          response: {},
          message: 'Initiative Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      
      return {
        response: initiative,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error)
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findAll() {
    return `This action returns all clarisaInitiatives`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInitiative`;
  }

  update(id: number, updateClarisaInitiativeDto: UpdateClarisaInitiativeDto) {
    return `This action updates a #${id} clarisaInitiative ${updateClarisaInitiativeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInitiative`;
  }
}
