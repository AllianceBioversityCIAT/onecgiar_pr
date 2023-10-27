import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaPolicyStageRepository } from './clarisa-policy-stages.repository';

@Injectable()
export class ClarisaPolicyStagesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaPolicyStageRepository: ClarisaPolicyStageRepository,
  ) {}

  async findAll() {
    try {
      const clarisaPolicyStage =
        await this._clarisaPolicyStageRepository.find();

      return {
        response: clarisaPolicyStage,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
