import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInnovationTypeDto } from './create-clarisa-innovation-type.dto';

export class UpdateClarisaInnovationTypeDto extends PartialType(
  CreateClarisaInnovationTypeDto,
) {}
