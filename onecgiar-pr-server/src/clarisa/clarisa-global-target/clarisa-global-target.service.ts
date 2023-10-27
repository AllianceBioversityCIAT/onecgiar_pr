import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaGobalTargetRepository } from './ClariasaGlobalTarget.repository';

@Injectable()
export class ClarisaGlobalTargetService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaGobalTargetRepository: ClarisaGobalTargetRepository,
  ) {}

  async findAll() {
    try {
      const globalTarget =
        await this._clarisaGobalTargetRepository.getAllGlobalTarget();

      return {
        response: globalTarget,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
