import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';

@Injectable()
export class ClarisaInitiativesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
  ) {}

  async getAllInitiativesWithoutCurrentInitiative(resultId: number) {
    try {
      const initiative =
        await this._clarisaInitiativesRepository.getAllInitiativesWithoutCurrentInitiative(
          resultId,
        );
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
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findAll() {
    try {
      const inititatives =
        await this._clarisaInitiativesRepository.getAllInitiatives();
      return {
        response: inititatives,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
