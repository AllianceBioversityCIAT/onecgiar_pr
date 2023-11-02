import { PartialType } from '@nestjs/mapped-types';
import { CreateLegacyIndicatorsPartnerDto } from './create-legacy_indicators_partner.dto';

export class UpdateLegacyIndicatorsPartnerDto extends PartialType(
  CreateLegacyIndicatorsPartnerDto,
) {}
