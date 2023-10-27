import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationCharacteristicRepository } from './clarisa-innovation-characteristics.repository';

@Injectable()
export class ClarisaInnovationCharacteristicsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInnovationCharacteristicRepository: ClarisaInnovationCharacteristicRepository,
  ) {}

  async findAll() {
    try {
      const InnovationReadinessLevel =
        await this._clarisaInnovationCharacteristicRepository.find();

      return {
        response: InnovationReadinessLevel,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
