import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaRegionDto } from './create-clarisa-region.dto';

export class UpdateClarisaRegionDto extends PartialType(
  CreateClarisaRegionDto,
) {}
