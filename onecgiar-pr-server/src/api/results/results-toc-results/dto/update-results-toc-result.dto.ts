import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsTocResultDto } from './create-results-toc-result.dto';

export class UpdateResultsTocResultDto extends PartialType(CreateResultsTocResultDto) {}
