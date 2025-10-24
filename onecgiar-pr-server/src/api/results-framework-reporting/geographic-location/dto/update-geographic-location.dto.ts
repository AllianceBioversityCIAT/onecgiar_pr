import { PartialType } from '@nestjs/mapped-types';
import { CreateGeographicLocationDto } from './create-geographic-location.dto';

export class UpdateGeographicLocationDto extends PartialType(CreateGeographicLocationDto) {}
