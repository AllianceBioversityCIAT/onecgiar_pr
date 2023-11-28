import { HttpStatus, Injectable } from '@nestjs/common';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { ClarisaSubnationalScopeRepository } from './clarisa-subnational-scope.repository';
import { env } from 'process';

@Injectable()
export class ClarisaSubnationalScopeService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _clarisaSubnationalScopeRepository: ClarisaSubnationalScopeRepository,
  ) {}

  async findAll() {
    try {
      const response = await this._clarisaSubnationalScopeRepository.find();

      return this._returnResponse.format({
        response: response,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  async findOne(id: number) {
    try {
      const response = await this._clarisaSubnationalScopeRepository.findBy({
        id,
      });

      return this._returnResponse.format({
        response: response,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }
}
