import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsPackageCenterDto } from './create-results-package-center.dto';

export class UpdateResultsPackageCenterDto extends PartialType(CreateResultsPackageCenterDto) {}
