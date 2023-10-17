import { Injectable, HttpStatus } from '@nestjs/common';
import { ClarisaInnovationUseLevelRepository } from './clarisa-innovation-use-levels.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaInnovationUseLevelsService {
  constructor(
    private readonly _clarisaInnovationUseLevelRepository: ClarisaInnovationUseLevelRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const response = await this._clarisaInnovationUseLevelRepository.find();
      if (!response.length) {
        throw {
          response: {},
          message: 'No innovation use levels were found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: response,
        message: 'All innovation use levels were found',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({
        error,
        debug: true,
      });
    }
  }
}
