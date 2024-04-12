import { Injectable, HttpStatus } from '@nestjs/common';
import { ReturnResponse } from '../../../shared/handlers/error.utils';
import { InvestmentDiscontinuedOptionRepository } from './investment-discontinued-options.repository';
import { isProduction } from '../../../shared/utils/validation.utils';

@Injectable()
export class InvestmentDiscontinuedOptionsService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _investmentDiscontinuedOptionRepository: InvestmentDiscontinuedOptionRepository,
  ) {}

  async findAll(resultTypeId: number) {
    try {
      const res = await this._investmentDiscontinuedOptionRepository.find({
        where: { result_type_id: resultTypeId },
      });
      return this._returnResponse.format({
        message: 'InvestmentDiscontinuedOptions found',
        response: res,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }
}
