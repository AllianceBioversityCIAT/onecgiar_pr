export class EvidencesBody {
  public result_id: number;
  public evidences: EvidencesCreateInterface[] = [];
  // public supplementary: EvidencesCreateInterface[] = [];
  public gender_tag_level: string;
  public climate_change_tag_level: string;
  public nutrition_tag_level: string;
  public environmental_biodiversity_tag_level: string;
  public poverty_tag_level: string;
}

export interface EvidencesCreateInterface {
  is_knowledge_product?: boolean;
  link?: string;
  description?: string;
  gender_related?: boolean;
  youth_related?: boolean;
  nutrition_related?: boolean;
  environmental_biodiversity_related?: boolean;
  poverty_related?: boolean;
  is_sharepoint?: boolean;
  file?: File;
  fileUuid?: string;
}
