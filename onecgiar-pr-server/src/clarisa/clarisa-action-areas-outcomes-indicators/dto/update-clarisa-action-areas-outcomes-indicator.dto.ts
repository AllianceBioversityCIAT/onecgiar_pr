import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaActionAreasOutcomesIndicatorDto } from './create-clarisa-action-areas-outcomes-indicator.dto';

export class UpdateClarisaActionAreasOutcomesIndicatorDto extends PartialType(
  CreateClarisaActionAreasOutcomesIndicatorDto,
) {}
