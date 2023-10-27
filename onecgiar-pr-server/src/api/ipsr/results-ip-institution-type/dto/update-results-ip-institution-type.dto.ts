import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsIpInstitutionTypeDto } from './create-results-ip-institution-type.dto';

export class UpdateResultsIpInstitutionTypeDto extends PartialType(
  CreateResultsIpInstitutionTypeDto,
) {}
