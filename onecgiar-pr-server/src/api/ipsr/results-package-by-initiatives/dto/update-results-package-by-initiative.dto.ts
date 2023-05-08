import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsPackageByInitiativeDto } from './create-results-package-by-initiative.dto';

export class UpdateResultsPackageByInitiativeDto extends PartialType(CreateResultsPackageByInitiativeDto) {}
