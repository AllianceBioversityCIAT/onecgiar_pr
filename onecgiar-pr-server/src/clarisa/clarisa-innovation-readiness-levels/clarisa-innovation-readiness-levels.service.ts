import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationReadinessLevelRepository } from './clarisa-innovation-readiness-levels.repository';

@Injectable()
export class ClarisaInnovationReadinessLevelsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInnovationReadinessLevelRepository: ClarisaInnovationReadinessLevelRepository,
  ) {}

  async findAll() {
    try {
      const InnovationReadinessLevel =
        await this._clarisaInnovationReadinessLevelRepository.find();

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
