import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsByIpInnovationUseMeasureDto } from './create-results-by-ip-innovation-use-measure.dto';

export class UpdateResultsByIpInnovationUseMeasureDto extends PartialType(
  CreateResultsByIpInnovationUseMeasureDto,
) {}
