import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ActorTypeRepository } from './repositories/actors-type.repository';

@Injectable()
export class ResultActorsService {
  constructor(
    protected readonly _handlersError: HandlersError,
    protected readonly _actorTypeRepository: ActorTypeRepository,
  ) {}
  async findAll() {
    try {
      const data = await this._actorTypeRepository.find();
      return {
        response: data,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
