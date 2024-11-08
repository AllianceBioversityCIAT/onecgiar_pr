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
  innovation_readiness_related?: boolean;
  innovation_use_related?: boolean;
  poverty_related?: boolean;
  is_sharepoint?: number;
  is_public_file?: number;
  sp_document_id?: string;
  sp_evidence_id?: string;
  sp_file_name?: string;
  sp_folder_path?: string;
}
