import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { ClarisaInnovationUseLevelRepository } from './clarisa-innovation-use-levels.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { In } from 'typeorm';

@Injectable()
export class ClarisaInnovationUseLevelsService {
  private logger: Logger = new Logger(ClarisaInnovationUseLevelsService.name);
  constructor(
    private readonly _clarisaInnovationUseLevelRepository: ClarisaInnovationUseLevelRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAll() {
    try {
      const response = await this._clarisaInnovationUseLevelRepository.find();
      this.logger.debug(response);
      if (!response?.length) {
        this.logger.debug('No innovation use levels were found in findAll');
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

  async findAllV2() {
    try {
      const response = await this._clarisaInnovationUseLevelRepository.find({
        where: { id: In([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) },
      });
      this.logger.debug(response);
      if (!response.length) {
        this.logger.debug('No innovation use levels were found in findAllV2');
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
