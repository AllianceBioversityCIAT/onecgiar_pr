import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateBiReportDto } from './dto/create-bi-report.dto';
import { BiReportRepository } from './repository/bi-report.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { env } from 'process';

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
      const response = await this.biReportRepository.find({
        order: { report_order: 'ASC' },
        where: { is_active: true },
      });

      return this._returnResponse.format({
        message: 'Reports found',
        response,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  findOne(id: number) {
    return this.biReportRepository.getTokenAndReportById(id);
  }

  findAllReports() {
    return this.biReportRepository.getReportsBi();
  }

  findOneReportName(report_name: string) {
    return this.biReportRepository.getTokenAndReportByName(report_name);
  }

  azureToken() {
    return this.biReportRepository.getBarerTokenAzure();
  }
}
