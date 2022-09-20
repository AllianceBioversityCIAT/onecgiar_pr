import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaCountriesRegionDto } from './create-clarisa-countries-region.dto';

export class UpdateClarisaCountriesRegionDto extends PartialType(CreateClarisaCountriesRegionDto) {}
