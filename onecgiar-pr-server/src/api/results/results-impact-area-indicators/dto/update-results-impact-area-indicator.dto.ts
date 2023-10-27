import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsImpactAreaIndicatorDto } from './create-results-impact-area-indicator.dto';

export class UpdateResultsImpactAreaIndicatorDto extends PartialType(
  CreateResultsImpactAreaIndicatorDto,
) {}
