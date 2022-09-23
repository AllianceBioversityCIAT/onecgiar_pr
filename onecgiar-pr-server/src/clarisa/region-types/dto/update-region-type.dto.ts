import { PartialType } from '@nestjs/mapped-types';
import { CreateRegionTypeDto } from './create-region-type.dto';

export class UpdateRegionTypeDto extends PartialType(CreateRegionTypeDto) {}
