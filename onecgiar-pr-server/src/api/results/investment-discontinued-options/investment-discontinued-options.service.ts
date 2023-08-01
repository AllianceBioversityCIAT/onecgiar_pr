import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateInvestmentDiscontinuedOptionDto } from './dto/create-investment-discontinued-option.dto';
import { UpdateInvestmentDiscontinuedOptionDto } from './dto/update-investment-discontinued-option.dto';
import { ReturnResponse } from '../../../shared/handlers/error.utils';
import { InvestmentDiscontinuedOptionRepository } from './investment-discontinued-options.repository';
import { PartialType } from '@nestjs/mapped-types';
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
