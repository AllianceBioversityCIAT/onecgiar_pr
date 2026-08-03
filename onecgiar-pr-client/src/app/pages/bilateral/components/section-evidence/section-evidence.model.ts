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
}

export interface BilateralEvidenceBody {
  evidences: BilateralEvidenceItem[];
  gender_tag_level: string;
  climate_change_tag_level: string;
  nutrition_tag_level: string;
  environmental_biodiversity_tag_level: string;
  poverty_tag_level: string;
}
