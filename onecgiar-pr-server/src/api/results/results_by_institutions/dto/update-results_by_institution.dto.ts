import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsByInstitutionDto } from './create-results_by_institution.dto';

export class UpdateResultsByInstitutionDto extends PartialType(CreateResultsByInstitutionDto) {}
