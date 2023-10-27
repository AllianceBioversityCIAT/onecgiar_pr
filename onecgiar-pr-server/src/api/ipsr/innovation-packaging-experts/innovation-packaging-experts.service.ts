import { Injectable, HttpStatus } from '@nestjs/common';
import { InnovationPackagingExpertRepository } from './repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from './repositories/expertises.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class InnovationPackagingExpertsService {
  constructor(
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository,
    protected readonly _handlersError: HandlersError,
  ) {}

  async findAllExpertises() {
    try {
      const request = await this._expertisesRepository.find({
        order: { order: 'ASC' },
      });
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
