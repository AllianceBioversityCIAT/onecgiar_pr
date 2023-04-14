import { PartialType } from '@nestjs/mapped-types';
import { CreateResultReportDto } from './create-result-report.dto';

export class UpdateResultReportDto extends PartialType(CreateResultReportDto) {}
