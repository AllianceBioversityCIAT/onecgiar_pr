import { HttpStatus, Injectable } from '@nestjs/common';
import { ReturnResponse } from 'src/shared/handlers/error.utils';
import { TypeOneReportRepository } from './type-one-report.repository';
import { isProduction } from '../../shared/utils/validation.utils';

@Injectable()
export class TypeOneReportService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _typeOneReportRepository: TypeOneReportRepository,
  ) {}
  async getFactSheetByInit(initId: number) {
    try {
      const results =
        await this._typeOneReportRepository.getFactSheetByInit(initId);

      return this._returnResponse.format({
        message: 'Successful response',
        response: results[0],
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  async getKeyResultStory(initId: number, phase: number) {
    try {
      const results = await this._typeOneReportRepository.getKeyResultStory(
        initId,
        phase,
      );

      return this._returnResponse.format({
        message: 'Successful response',
        response: results,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }
}
