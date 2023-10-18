import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaActionAreaOutcomeRepository } from './clarisa-action-area-outcome.repository';

@Injectable()
export class ClarisaActionAreaOutcomeService {
  constructor(
    private readonly _clarisaActionAreaOutcomes: ClarisaActionAreaOutcomeRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const aaOutcomes = await this._clarisaActionAreaOutcomes.aaOutcomes();

      return {
        response: aaOutcomes,
        message: 'All Action Area Outcomes targets',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
