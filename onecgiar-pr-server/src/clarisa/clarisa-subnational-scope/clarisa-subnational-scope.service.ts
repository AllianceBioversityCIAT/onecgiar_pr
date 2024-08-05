import { HttpStatus, Injectable } from '@nestjs/common';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { ClarisaSubnationalScopeRepository } from './clarisa-subnational-scope.repository';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';

@Injectable()
export class ClarisaSubnationalScopeService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _clarisaSubnationalScopeRepository: ClarisaSubnationalScopeRepository,
  ) {}

  async findAll() {
    try {
      const response = await this._clarisaSubnationalScopeRepository.findBy({
        is_active: true,
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

  async findOne(id: number) {
    try {
      const response = await this._clarisaSubnationalScopeRepository.findBy({
        id,
        is_active: true,
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

  async findByCountryIso2(country_iso2: string) {
    try {
      const response = await this._clarisaSubnationalScopeRepository.find({
        where: {
          country_iso_alpha_2: country_iso2,
          is_active: true,
        },
        order: {
          name: 'ASC',
        },
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
