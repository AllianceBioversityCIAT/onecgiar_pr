import { HttpStatus, Injectable } from '@nestjs/common';
import { CapdevsTermRepository } from './capdevs-terms.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class CapdevsTermsService {
  constructor(
    private readonly _capdevsTermRepository: CapdevsTermRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const capdevsTerm = await this._capdevsTermRepository.find();
      return {
        response: capdevsTerm,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
