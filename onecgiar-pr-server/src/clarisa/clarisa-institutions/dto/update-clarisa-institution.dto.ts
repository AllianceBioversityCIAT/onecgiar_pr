import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInstitutionDto } from './create-clarisa-institution.dto';

export class UpdateClarisaInstitutionDto extends PartialType(
  CreateClarisaInstitutionDto,
) {}
