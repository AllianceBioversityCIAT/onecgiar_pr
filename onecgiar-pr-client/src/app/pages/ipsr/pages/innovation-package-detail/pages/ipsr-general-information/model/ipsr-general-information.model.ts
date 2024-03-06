export class IpsrGeneralInformationBody {
  title = null;
  description = null;
  lead_contact_person = null;
  gender_tag_level_id = null;
  climate_change_tag_level_id = null;
  is_krs: boolean = null;
  krs_url = null;
  reported_year_id = null;
  evidence_gender_tag = null;
  evidence_climate_tag = null;
  nutrition_tag_level_id: number;
  evidence_nutrition_tag: string;
  environmental_biodiversity_tag_level_id: number;
  evidence_environment_tag: string;
  poverty_tag_level_id: number;
  evidence_poverty_tag: string;
  is_replicated?: boolean;
}
