import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaGlobalTargetDto } from './create-clarisa-global-target.dto';

export class UpdateClarisaGlobalTargetDto extends PartialType(
  CreateClarisaGlobalTargetDto,
) {}
