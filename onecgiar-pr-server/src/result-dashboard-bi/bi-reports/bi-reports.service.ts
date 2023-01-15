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

  findAll() {
    return this.biReportRepository.getTokenPowerBi();
  }

  findOne(id: number) {
    return `This action returns a #${id} biReport`;
  }

  findAllReports(){
    return this.biReportRepository.getReportsBi();
  }
}
