import { PartialType } from '@nestjs/mapped-types';
import { CreateResultCountryDto } from './create-result-country.dto';

export class UpdateResultCountryDto extends PartialType(
  CreateResultCountryDto,
) {}
