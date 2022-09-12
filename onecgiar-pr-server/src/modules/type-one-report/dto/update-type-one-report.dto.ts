import { PartialType } from '@nestjs/mapped-types';
import { CreateTypeOneReportDto } from './create-type-one-report.dto';

export class UpdateTypeOneReportDto extends PartialType(
  CreateTypeOneReportDto,
) {}
