import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaSdgsTargetDto } from './create-clarisa-sdgs-target.dto';

export class UpdateClarisaSdgsTargetDto extends PartialType(
  CreateClarisaSdgsTargetDto,
) {}
