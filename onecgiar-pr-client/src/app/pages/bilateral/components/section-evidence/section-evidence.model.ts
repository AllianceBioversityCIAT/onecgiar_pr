export interface BilateralEvidenceItem {
  id?: number;
  link?: string;
  description?: string;
  is_sharepoint?: boolean;
  file?: File;
  is_public_file?: boolean | null;
  sp_document_id?: string;
  sp_file_name?: string;
  sp_folder_path?: string;
  percentage?: number;
  creation_date?: Date | string;
  last_updated_date?: Date | string;

  /**
   * P2-3375: per-evidence tags, same field names the W1/W2 endpoint already accepts — this section
   * posts to `api/results/evidences/create/:resultId`, the very route rd-evidences uses, so nothing
   * is needed from the backend.
   *
   * ⚠️ `youth_related` carries the *Climate* checkbox. That is not a typo: it is the existing binding
   * in W1/W2 (rd-evidences.component.ts:31, where the comment says the same) and the column the API
   * expects. Renaming it here would silently stop climate evidence from being recorded.
   */
  gender_related?: boolean;
  youth_related?: boolean;
  nutrition_related?: boolean;
  environmental_biodiversity_related?: boolean;
  poverty_related?: boolean;
  innovation_readiness_related?: boolean;
  innovation_use_related?: boolean;
  policy_change_related?: boolean;
  capacity_sharing_related?: boolean;
  knowledge_product_metadata_related?: boolean;
  other_output_related?: boolean;
  other_outcome_related?: boolean;
}

export interface BilateralEvidenceBody {
  evidences: BilateralEvidenceItem[];
  gender_tag_level: string;
  climate_change_tag_level: string;
  nutrition_tag_level: string;
  environmental_biodiversity_tag_level: string;
  poverty_tag_level: string;
}
