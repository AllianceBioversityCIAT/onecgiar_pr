export class CreateEvidenceDto {
  public result_id: number;
  public evidences: EvidencesCreateInterface[];
  public supplementary: EvidencesCreateInterface[];
}

export interface EvidencesCreateInterface {
  id: string;
  is_knowledge_product?: boolean;
  link: string;
  description?: string;
  gender_related?: boolean;
  youth_related?: boolean;
  nutrition_related?: boolean;
  environmental_biodiversity_related?: boolean;
  poverty_related?: boolean;
  is_sharepoint?: number;
  fileUuid?: string;
  is_public_file?: number;
  sp_id?: string;
}

export class JsonData {}
