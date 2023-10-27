import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocLevelRepository } from './toc-level.repository';

@Injectable()
export class TocLevelService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _tocLevelRepository: TocLevelRepository,
  ) {}

  async findAll() {
    try {
      const tocResults = await this._tocLevelRepository.getAllTocLevel();
      if (!tocResults.length) {
        throw {
          response: {},
          message: 'ToC Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
