import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaRegionsRepository } from './ClariasaRegions.repository';

@Injectable()
export class ClarisaRegionsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
  ) {}

  async findAllNoParent() {
    try {
      const region =
        await this._clarisaRegionsRepository.getAllNoParentRegions();
      return {
        response: region,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes(error);
    }
  }
}
