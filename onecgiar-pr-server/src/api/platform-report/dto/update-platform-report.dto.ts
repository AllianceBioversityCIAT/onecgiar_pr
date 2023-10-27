import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformReportDto } from './create-platform-report.dto';

export class UpdatePlatformReportDto extends PartialType(
  CreatePlatformReportDto,
) {}
