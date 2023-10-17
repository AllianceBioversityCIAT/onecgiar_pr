import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaCentersRepository } from './clarisa-centers.repository';

@Injectable()
export class ClarisaCentersService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaCentersRepository: ClarisaCentersRepository,
  ) {}

  async findAll() {
    try {
      const clarisaCenter =
        await this._clarisaCentersRepository.getAllCenters();

      if (!clarisaCenter.length) {
        throw {
          response: {},
          message: 'Centers Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: clarisaCenter,
        message: 'Validates correctly with CLARISA',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
