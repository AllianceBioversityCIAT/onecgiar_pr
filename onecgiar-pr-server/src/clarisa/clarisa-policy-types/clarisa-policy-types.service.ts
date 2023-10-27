import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaPolicyTypeRepository } from './clarisa-policy-types.repository';

@Injectable()
export class ClarisaPolicyTypesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaPolicyTypeRepository: ClarisaPolicyTypeRepository,
  ) {}
  async findAll() {
    try {
      const clarisaPolicyType = await this._clarisaPolicyTypeRepository.find();

      return {
        response: clarisaPolicyType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
