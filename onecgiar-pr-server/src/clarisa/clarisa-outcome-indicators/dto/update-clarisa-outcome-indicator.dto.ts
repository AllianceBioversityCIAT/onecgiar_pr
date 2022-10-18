import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaOutcomeIndicatorDto } from './create-clarisa-outcome-indicator.dto';

export class UpdateClarisaOutcomeIndicatorDto extends PartialType(
  CreateClarisaOutcomeIndicatorDto,
) {}
