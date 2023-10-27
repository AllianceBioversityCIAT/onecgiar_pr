import { Injectable, HttpStatus } from '@nestjs/common';
import { ClarisaImpactAreaInticatorsRepository } from './ClarisaImpactAreaIndicators.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaImpactAreaIndicatorsService {
  constructor(
    private readonly _clarisaImpactAreaInticatorsRepository: ClarisaImpactAreaInticatorsRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const carisaImpactIndicators =
        await this._clarisaImpactAreaInticatorsRepository.getAllImpactAreaIndicators();

      return {
        response: carisaImpactIndicators,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
