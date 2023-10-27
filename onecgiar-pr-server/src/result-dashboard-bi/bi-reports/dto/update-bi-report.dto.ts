import { PartialType } from '@nestjs/mapped-types';
import { CreateBiReportDto } from './create-bi-report.dto';

export class UpdateBiReportDto extends PartialType(CreateBiReportDto) {
  id: number;
}
