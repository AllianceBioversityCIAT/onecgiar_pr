import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { IpsrRepository } from './ipsr.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { isProduction } from '../../shared/utils/validation.utils';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';

@Injectable()
export class IpsrService {
  constructor(
    protected readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
    protected readonly _ipsrRespository: IpsrRepository,
    private readonly _resultsInvestmentDiscontinuedOptionRepository: ResultsInvestmentDiscontinuedOptionRepository,
  ) {}

  async findAllInnovations(initiativeId: number[]) {
    try {
      const innovation =
        await this._ipsrRespository.getResultsInnovation(initiativeId);
      return this._returnResponse.format({
        response: innovation,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  async findInnovationDetail(resultId: number) {
    try {
      const result =
        await this._ipsrRespository.getResultInnovationDetail(resultId);
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
      const result =
        await this._ipsrRespository.getResultInnovationById(resultId);
      if (!result[0]) {
        throw {
          response: result,
          message: 'The result was not found.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const discontinued_options =
        await this._resultsInvestmentDiscontinuedOptionRepository.find({
          where: {
            result_id: resultId,
            is_active: true,
          },
        });

      result[0].discontinued_options = discontinued_options;

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

  async getIpsrList(initDate: Date, lastDate: Date) {
    try {
      const ipsrList = await this._ipsrRespository.getIpsrList(
        initDate,
        lastDate,
      );

      if (!ipsrList[0]) {
        throw {
          response: ipsrList,
          message: 'No results found for the selected dates.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: ipsrList,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
