interface Institution {
  code: number;
  name: string;
}

interface InstitutionType {
  acronym: string;
  id: number;
  institution_type_code: number;
  name: string;
  website_link: string;
}

export interface ClarisaInstitutionDto {
  institutions_id: number;
  institutions_name: string;
  institutions_acronym: string;
  website_link: string;
  institutions_type_id: string;
  institutions_type_name: string;
  headquarter_name: string;
  is_center: boolean;
}

export interface InstitutionMapped extends ClarisaInstitutionDto {
  full_name: string;
}
