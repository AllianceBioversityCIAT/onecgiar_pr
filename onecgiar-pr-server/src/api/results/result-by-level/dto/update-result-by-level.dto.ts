import { PartialType } from '@nestjs/mapped-types';
import { CreateResultByLevelDto } from './create-result-by-level.dto';

export class UpdateResultByLevelDto extends PartialType(
  CreateResultByLevelDto,
) {}
