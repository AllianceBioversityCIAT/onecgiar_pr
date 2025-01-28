import { PartialType } from '@nestjs/swagger';
import { CreateContributionToIndicatorDto } from './create-contribution-to-indicator.dto';

export class UpdateContributionToIndicatorDto extends PartialType(
  CreateContributionToIndicatorDto,
) {}
