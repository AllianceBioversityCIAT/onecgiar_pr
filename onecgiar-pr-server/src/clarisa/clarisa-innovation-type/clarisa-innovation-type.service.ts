import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationTypeRepository } from './clarisa-innovation-type.repository';

@Injectable()
export class ClarisaInnovationTypeService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInnovationTypeRepository: ClarisaInnovationTypeRepository,
  ) {}

  async findAll() {
    try {
      const innocationType = await this._clarisaInnovationTypeRepository.find();

      return {
        response: innocationType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
