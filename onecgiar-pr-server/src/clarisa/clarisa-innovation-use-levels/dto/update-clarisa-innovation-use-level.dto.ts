import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInnovationUseLevelDto } from './create-clarisa-innovation-use-level.dto';

export class UpdateClarisaInnovationUseLevelDto extends PartialType(
  CreateClarisaInnovationUseLevelDto,
) {}
