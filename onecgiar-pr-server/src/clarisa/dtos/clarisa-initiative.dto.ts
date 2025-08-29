import { ClarisaInitiativeStageDto } from '../clarisa-initiative-stage/dto/clarisa-initiative-stage.dto';

export class ClarisaInitiativeDto {
  id: number;
  name: string;
  short_name: string;
  official_code: string;
  type_id?: number;
  active: boolean;
  status: string;
  stageId: number;
  description: string;
  action_area_id: number;
  action_area_description: string;
  stages?: ClarisaInitiativeStageDto[];
}

export interface CgiarEntityInitiativeDto {
  id: number;
  code: string;
  name: string;
  acronym: string | null;
  short_name: string;
  start_date: string;
  end_date: string;
  level: number;
  entity_type: {
    code: number;
    name: string;
  };
  portfolio?: {
    code: number;
    name: string;
  };
}
