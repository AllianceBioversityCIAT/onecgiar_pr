import { Injectable } from '@nestjs/common';
import { CreateTypeOneReportDto } from './dto/create-type-one-report.dto';
import { UpdateTypeOneReportDto } from './dto/update-type-one-report.dto';

@Injectable()
export class TypeOneReportService {
  create(createTypeOneReportDto: CreateTypeOneReportDto) {
    return 'This action adds a new typeOneReport';
  }

  findAll() {
    return `This action returns all typeOneReport`;
  }

  findOne(id: number) {
    return `This action returns a #${id} typeOneReport`;
  }

  update(id: number, updateTypeOneReportDto: UpdateTypeOneReportDto) {
    return `This action updates a #${id} typeOneReport`;
  }

  remove(id: number) {
    return `This action removes a #${id} typeOneReport`;
  }
}
