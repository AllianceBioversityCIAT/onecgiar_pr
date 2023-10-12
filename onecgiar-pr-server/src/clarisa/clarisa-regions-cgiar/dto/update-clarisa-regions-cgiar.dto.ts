import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaRegionsCgiarDto } from './create-clarisa-regions-cgiar.dto';

export class UpdateClarisaRegionsCgiarDto extends PartialType(
  CreateClarisaRegionsCgiarDto,
) {}
