export class CreateGeneralInformationResultDto {
  public result_id: number;
  public initiative_id: number;
  public result_type_id: number;
  public result_level_id: number;
  public result_name: string;
  public result_description: string;
  public gender_tag_id: number;
  public climate_change_tag_id: number;
  public institutions: number[];
  public institutions_type: number[];
}
