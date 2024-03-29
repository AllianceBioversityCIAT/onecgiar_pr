import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaMeliaStudyTypeRepository } from './ClariasaMeliasStudyType.repository';

@Injectable()
export class ClarisaMeliaStudyTypeService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaMeliaStudyTypeRepository: ClarisaMeliaStudyTypeRepository,
  ) {}

  async findAll() {
    try {
      const meliaTypes = await this._clarisaMeliaStudyTypeRepository.find();
      return {
        response: meliaTypes,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes(error);
    }
  }
}
