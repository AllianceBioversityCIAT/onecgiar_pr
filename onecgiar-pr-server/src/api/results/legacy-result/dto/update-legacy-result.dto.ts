import { PartialType } from '@nestjs/mapped-types';
import { CreateLegacyResultDto } from './create-legacy-result.dto';

export class UpdateLegacyResultDto extends PartialType(CreateLegacyResultDto) {}
