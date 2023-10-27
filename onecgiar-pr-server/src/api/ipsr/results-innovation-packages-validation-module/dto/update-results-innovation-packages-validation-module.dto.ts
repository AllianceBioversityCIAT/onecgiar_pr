import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsInnovationPackagesValidationModuleDto } from './create-results-innovation-packages-validation-module.dto';

export class UpdateResultsInnovationPackagesValidationModuleDto extends PartialType(
  CreateResultsInnovationPackagesValidationModuleDto,
) {}
