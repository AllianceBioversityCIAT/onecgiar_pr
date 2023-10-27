import { Injectable, HttpStatus } from '@nestjs/common';
import { AssessedDuringExpertWorkshopRepository } from './assessed-during-expert-workshop.repository';
import {
  HandlersError,
  ReturnResponse,
  ReturnResponseDto,
} from '../../../shared/handlers/error.utils';

@Injectable()
export class AssessedDuringExpertWorkshopService {
  constructor(
    private readonly _assessedDuringExpertWorkshopRepository: AssessedDuringExpertWorkshopRepository,
    private readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
  ) {}

  async findAll(): Promise<ReturnResponseDto<any>> {
    try {
      const response =
        await this._assessedDuringExpertWorkshopRepository.find();

      if (!response?.length) {
        throw this._returnResponse.format({
          message: 'Assessed during expert workshop not found',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      return this._returnResponse.format({
        message: 'Assessed during expert workshop found',
        statusCode: HttpStatus.OK,
        response,
      });
    } catch (error) {
      return this._returnResponse.format(error, true);
    }
  }
}
