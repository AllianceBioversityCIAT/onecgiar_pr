import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsByInstitutionTypeDto } from './create-results_by_institution_type.dto';

export class UpdateResultsByInstitutionTypeDto extends PartialType(CreateResultsByInstitutionTypeDto) {}
