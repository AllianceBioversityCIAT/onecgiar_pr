import { HttpStatus, Injectable } from '@nestjs/common';
import { ReturnResponse } from '../../../shared/handlers/error.utils';
import { ResultCountrySubnationalRepository } from './repositories/result-country-subnational.repository';
import { EnvironmentExtractor } from '../../../shared/utils/environment-extractor';

@Injectable()
export class ResultCountrySubnationalService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
  ) {}

  async findAll() {
    try {
      const response = await this._resultCountrySubnationalRepository.find();

      return this._returnResponse.format({
        response: response,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findOne(id: number) {
    try {
      const response = await this._resultCountrySubnationalRepository.findBy({
        result_country_subnational_id: id,
      });

      return this._returnResponse.format({
        response: response,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }
}
