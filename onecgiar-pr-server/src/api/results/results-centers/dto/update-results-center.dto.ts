import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsCenterDto } from './create-results-center.dto';

export class UpdateResultsCenterDto extends PartialType(
  CreateResultsCenterDto,
) {}
