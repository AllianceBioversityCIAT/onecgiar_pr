import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsValidationModuleDto } from './create-results-validation-module.dto';

export class UpdateResultsValidationModuleDto extends PartialType(CreateResultsValidationModuleDto) {}
