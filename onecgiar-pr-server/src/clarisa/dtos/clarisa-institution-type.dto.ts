export class ClarisaInstitutionTypeDto {
  code: number;
  name: string;
  description?: string;
  legacy?: boolean;
  parent?: ClarisaInstitutionTypeDto;
}
