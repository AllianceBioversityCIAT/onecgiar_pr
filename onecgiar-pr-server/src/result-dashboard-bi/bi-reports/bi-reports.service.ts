import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateBiReportDto } from './dto/create-bi-report.dto';
import { BiReportRepository } from './repository/bi-report.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { GetBiSubpagesDto } from './dto/get-bi-subpages.dto';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';

@Injectable()
export class BiReportsService {
  constructor(
    private biReportRepository: BiReportRepository,
    private readonly _returnResponse: ReturnResponse,
  ) {}

  create(createBiReportDto: CreateBiReportDto) {
    return this.biReportRepository.createNewRegisterBi(createBiReportDto);
  }

  async findAll() {
    try {
      const response = await this.biReportRepository.getAllReports();

      return this._returnResponse.format({
        message: 'Reports found',
        response,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  findOne(id: number) {
    return this.biReportRepository.getTokenAndReportById(id);
  }

  findAllReports() {
    return this.biReportRepository.getReportsBi();
  }

  findOneReportName(getBiSubpagesDto: GetBiSubpagesDto) {
    return this.biReportRepository.getTokenAndReportByName(getBiSubpagesDto);
  }

  azureToken() {
    return this.biReportRepository.getBarerTokenAzure();
  }
}
