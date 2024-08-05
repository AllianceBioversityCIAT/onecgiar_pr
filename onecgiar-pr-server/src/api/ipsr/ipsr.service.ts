import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { IpsrRepository } from './ipsr.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ExcelReportDto } from './dto/excel-report-ipsr.dto';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';

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
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findInnovationDetail(resultId: number) {
    try {
      const result =
        await this._ipsrRespository.getResultInnovationDetail(resultId);
      if (!result) {
        throw new Error('The result was not found.');
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
        throw new Error('The result was not found.');
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
        throw new Error(
          "At the moment we don't have any Innovation Packages results.",
        );
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

  async getIpsrList(excelReportDto: ExcelReportDto) {
    try {
      const ipsrList = await this._ipsrRespository.getIpsrList(excelReportDto);

      if (!ipsrList[0]) {
        throw new Error(
          'No results were found with the filters applied, the report is not generated.',
        );
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
