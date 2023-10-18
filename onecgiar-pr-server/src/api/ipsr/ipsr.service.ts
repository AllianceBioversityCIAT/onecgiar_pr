import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { IpsrRepository } from './ipsr.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { env } from 'process';

@Injectable()
export class IpsrService {
  constructor(
    protected readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
    protected readonly _ipsrRespository: IpsrRepository,
  ) {}

  async findAllInnovations(initiativeId: number[]) {
    try {
      const innovation = await this._ipsrRespository.getResultsInnovation(
        initiativeId,
      );
      return this._returnResponse.format({
        response: innovation,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  async findInnovationDetail(resultId: number) {
    try {
      const result = await this._ipsrRespository.getResultInnovationDetail(
        resultId,
      );
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findOneInnovation(resultId: number) {
    try {
      const result = await this._ipsrRespository.getResultInnovationById(
        resultId,
      );
      if (!result[0]) {
        throw {
          response: result,
          message: 'The result was not found.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: result[0],
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async allInnovationPackages() {
    try {
      const allResults = await this._ipsrRespository.getAllInnovationPackages();

      if (!allResults[0]) {
        throw {
          response: allResults,
          message:
            "At the moment we don't have any Innovation Packages results.",
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: allResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
