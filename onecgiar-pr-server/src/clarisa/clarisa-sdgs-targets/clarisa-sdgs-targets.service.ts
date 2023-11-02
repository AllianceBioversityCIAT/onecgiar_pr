import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaSdgsTargetsRepository } from './clarisa-sdgs-targets.repository';

@Injectable()
export class ClarisaSdgsTargetsService {
  constructor(
    private readonly _sdgsTargets: ClarisaSdgsTargetsRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const sdgsTargets = await this._sdgsTargets.Sdgs();

      return {
        response: sdgsTargets,
        message: 'All SDGs targets',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
