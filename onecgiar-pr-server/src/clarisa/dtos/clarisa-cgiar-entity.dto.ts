import { ClarisaCgiarEntityTypeDto } from './clarisa-cgiar-entity-type.dto';

export class ClarisaCgiarEntityDto {
  code: string;
  name: string;
  acronym?: string;
  financial_code?: string;
  institutionId?: number;
  cgiarEntityTypeDTO: ClarisaCgiarEntityTypeDto;
}
