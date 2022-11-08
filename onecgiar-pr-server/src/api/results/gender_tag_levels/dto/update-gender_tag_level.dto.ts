import { PartialType } from '@nestjs/mapped-types';
import { CreateGenderTagLevelDto } from './create-gender_tag_level.dto';

export class UpdateGenderTagLevelDto extends PartialType(
  CreateGenderTagLevelDto,
) {}
