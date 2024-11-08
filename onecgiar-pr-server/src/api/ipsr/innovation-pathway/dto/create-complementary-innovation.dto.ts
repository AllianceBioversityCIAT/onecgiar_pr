export class CreateComplementaryInnovationDto {
  public result_code: number;
  public title: string;
  public short_title: string;
  public description: string;
  public other_funcions: string;
  public projects_organizations_working_on_innovation: boolean;
  public specify_projects_organizations: string;
  public initiative_id: number;
  public is_active: boolean;
  public complementaryFunctions: ComplementaryFunctionsInterface[];
}

export interface ComplementaryFunctionsInterface {
  complementary_innovation_functions_id: number;
}
