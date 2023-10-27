import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInnovationReadinessLevelDto } from './create-clarisa-innovation-readiness-level.dto';

export class UpdateClarisaInnovationReadinessLevelDto extends PartialType(
  CreateClarisaInnovationReadinessLevelDto,
) {}
