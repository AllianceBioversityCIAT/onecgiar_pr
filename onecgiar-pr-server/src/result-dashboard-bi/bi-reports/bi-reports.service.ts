import { Injectable } from '@nestjs/common';
import { CreateBiReportDto } from './dto/create-bi-report.dto';
import { UpdateBiReportDto } from './dto/update-bi-report.dto';
import { ClarisaCredentialsBiService } from '../clarisa-credentials-bi.service';
import { BiReportRepository } from './repository/bi-report.repository';

@Injectable()
export class BiReportsService {

  constructor(private biReportRepository: BiReportRepository){}

  create(createBiReportDto: CreateBiReportDto,) {
    return this.biReportRepository.createNewRegisterBi(createBiReportDto);
  }

  findAll(report_name:string) {
    return this.biReportRepository.getReportByName(report_name);
  }

  findOne(id: number) {
    return this.biReportRepository.getTokenAndReportById(id);
  }

  findAllReports(){
    return this.biReportRepository.getReportsBi();
  }

  findOneReportName(report_name: string) {
    return this.biReportRepository.getTokenAndReportByName(report_name);
  }
}
