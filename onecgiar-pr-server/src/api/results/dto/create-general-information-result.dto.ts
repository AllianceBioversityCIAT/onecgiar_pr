export class CreateGeneralInformationResultDto {
  public result_id: number;
  public initiative_id: number;
  public result_type_id: number;
  public result_level_id: number;
  public result_name: string;
  public result_description: string;
  public gender_tag_id: number;
  public climate_change_tag_id: number;
  public institutions: institutionsInterface[];
  public institutions_type: institutionsTypeInterface[];
  public krs_url!: string
  public is_krs!: boolean;

}

interface institutionsInterface{
  institutions_id: number;
}

interface institutionsTypeInterface{
  institutions_type_id: number;
}
