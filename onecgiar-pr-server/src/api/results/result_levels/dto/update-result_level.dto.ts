import { PartialType } from '@nestjs/mapped-types';
import { CreateResultLevelDto } from './create-result_level.dto';

export class UpdateResultLevelDto extends PartialType(CreateResultLevelDto) {}
