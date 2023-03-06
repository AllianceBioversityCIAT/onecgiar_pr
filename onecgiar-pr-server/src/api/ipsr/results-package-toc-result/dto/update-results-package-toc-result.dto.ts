import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsPackageTocResultDto } from './create-results-package-toc-result.dto';

export class UpdateResultsPackageTocResultDto extends PartialType(CreateResultsPackageTocResultDto) {}
