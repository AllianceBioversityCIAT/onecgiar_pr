import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaPolicyStageDto } from './create-clarisa-policy-stage.dto';

export class UpdateClarisaPolicyStageDto extends PartialType(
  CreateClarisaPolicyStageDto,
) {}
