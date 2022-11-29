import { PartialType } from '@nestjs/mapped-types';
import { CreateResultRegionDto } from './create-result-region.dto';

export class UpdateResultRegionDto extends PartialType(CreateResultRegionDto) {}
