import { ClarisaInstitutionCountryDto } from './clarisa-institution-country.dto';
import { ClarisaInstitutionTypeDto } from './clarisa-institution-type.dto';

export class ClarisaInstitutionDto {
  code: number;
  name: string;
  acronym: string;
  websiteLink: string;
  added: Date;
  institutionType: ClarisaInstitutionTypeDto;
  countryOfficeDTO: ClarisaInstitutionCountryDto[];
  is_active?: boolean;
}
