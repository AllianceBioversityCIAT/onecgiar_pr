import { PartialType } from '@nestjs/mapped-types';
import { CreateResultIpMeasureDto } from './create-result-ip-measure.dto';

export class UpdateResultIpMeasureDto extends PartialType(
  CreateResultIpMeasureDto,
) {}
