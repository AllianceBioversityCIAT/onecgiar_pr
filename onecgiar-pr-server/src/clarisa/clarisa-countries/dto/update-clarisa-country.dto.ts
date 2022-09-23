import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaCountryDto } from './create-clarisa-country.dto';

export class UpdateClarisaCountryDto extends PartialType(CreateClarisaCountryDto) {}
