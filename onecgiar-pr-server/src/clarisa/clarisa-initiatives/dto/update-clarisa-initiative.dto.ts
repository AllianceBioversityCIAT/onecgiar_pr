import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInitiativeDto } from './create-clarisa-initiative.dto';

export class UpdateClarisaInitiativeDto extends PartialType(
  CreateClarisaInitiativeDto,
) {}
