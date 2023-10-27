import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultStatusRepository } from './result-status.repository';

@Injectable()
export class ResultStatusService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultStatusRepository: ResultStatusRepository,
  ) {}

  async findAll() {
    try {
      const statusList = await this._resultStatusRepository.getAllStatuses();

      return {
        response: statusList,
        message: 'All result status',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
