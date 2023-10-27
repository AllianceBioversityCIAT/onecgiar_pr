import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsCenterRepository } from './results-centers.repository';

@Injectable()
export class ResultsCentersService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
  ) {}

  async findREsultCenterByResultId(resultId: number) {
    try {
      const centers =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );
      if (!centers.length) {
        throw {
          response: {},
          message: 'Result Centers Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: centers,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
