import { Injectable, HttpStatus } from '@nestjs/common';
import { ReturnResponse } from '../../../shared/handlers/error.utils';
import { InvestmentDiscontinuedOptionRepository } from './investment-discontinued-options.repository';
import { env } from 'process';

@Injectable()
export class InvestmentDiscontinuedOptionsService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _investmentDiscontinuedOptionRepository: InvestmentDiscontinuedOptionRepository,
  ) {}

  async findAll() {
    try {
      const res = await this._investmentDiscontinuedOptionRepository.find();
      return this._returnResponse.format({
        message: 'InvestmentDiscontinuedOptions found',
        response: res,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }
}
