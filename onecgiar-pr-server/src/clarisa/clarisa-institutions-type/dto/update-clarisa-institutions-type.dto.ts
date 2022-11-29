import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInstitutionsTypeDto } from './create-clarisa-institutions-type.dto';

export class UpdateClarisaInstitutionsTypeDto extends PartialType(
  CreateClarisaInstitutionsTypeDto,
) {}
