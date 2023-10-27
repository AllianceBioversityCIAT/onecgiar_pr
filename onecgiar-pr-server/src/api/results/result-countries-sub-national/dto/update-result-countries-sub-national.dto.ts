import { PartialType } from '@nestjs/mapped-types';
import { CreateResultCountriesSubNationalDto } from './create-result-countries-sub-national.dto';

export class UpdateResultCountriesSubNationalDto extends PartialType(
  CreateResultCountriesSubNationalDto,
) {}
