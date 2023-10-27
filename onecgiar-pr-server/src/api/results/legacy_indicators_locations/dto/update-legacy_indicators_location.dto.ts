import { PartialType } from '@nestjs/mapped-types';
import { CreateLegacyIndicatorsLocationDto } from './create-legacy_indicators_location.dto';

export class UpdateLegacyIndicatorsLocationDto extends PartialType(
  CreateLegacyIndicatorsLocationDto,
) {}
