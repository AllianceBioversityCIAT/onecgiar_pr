export class InnovationDevInfoBody {
  public result_innovation_dev_id: number;
  public short_title: string;
  public innovation_characterization_id: number;
  public innovation_nature_id: number;
  public innovation_readiness_level_id: number = null;
  public is_new_variety: boolean;
  public number_of_varieties: number;
  public innovation_developers: string;
  public innovation_collaborators: string;
  public evidences_justification: string;
  public has_scaling_studies: boolean; 
  public innovation_acknowledgement: string;
  public result = { title: '' };
  public pictures: LinkType[] = [{ link: '' }];
  public reference_materials: LinkType[] = [{ link: '' }];
  public innovatonUse: InnovatonUse = new InnovatonUse();
  public innovation_pdf: boolean;
  public innovation_user_to_be_determined: boolean;
  public initiative_expected_investment: InitiativeExpectedInvestment[] = [];
  public bilateral_expected_investment: BilateralExpectedInvestment[] = [];
  public institutions_expected_investment: InstitutionsExpectedInvestment[] = [];
  public previous_irl: number;
}

class InnovatonUse {
  actors: Actor[] = [];
  organization: Organization[] = [];
  measures: Measure[] = [];
}

export class Measure {
  unit_of_measure: string = null;
  quantity: number = null;
  is_active: boolean = null;
  result_ip_measure_id: any;
  addressing_demands: string;
}

export class Organization {
  institution_types_id: number;
  institution_sub_type_id: number;
  how_many: number;
  other_institution: string;
  graduate_students: string;
  // Aux
  hide: boolean;
  is_active: boolean;
  id: any;
  addressing_demands: string;
}

export class Actor {
  actor_type_id: number;
  women: number;
  women_youth: number;
  men: number;
  men_youth: number;
  is_active: boolean;
  women_non_youth: any;
  men_non_youth: any;
  previousWomen: any;
  previousWomen_youth: any;
  other_actor_type: any;
  sex_and_age_disaggregation: boolean;
  how_many: any;
  result_actors_id: number;
  has_men: any;
  has_men_youth: any;
  has_women: any;
  has_women_youth: any;
  addressing_demands: string;
}

export class LinkType {
  id?: string = '';
  link?: string = '';
  description?: string | null = null;
  result_id?: string = '';
  gender_related?: string | null = null;
  youth_related?: string | null = null;
  nutrition_related?: string | null = null;
  environmental_biodiversity_related?: string | null = null;
  poverty_related?: string | null = null;
  is_supplementary?: string | null = null;
  is_active?: number = 1;
  creation_date?: string = '';
  last_updated_date?: string = '';
  evidence_type_id?: string = '';
}

class BilateralExpectedInvestment {
  public is_active: boolean = false;
  public created_date: string = '';
  public last_updated_date: string = '';
  public created_by: string = '';
  public last_updated_by: string = '';
  public non_pooled_projetct_budget_id: string = '';
  public non_pooled_projetct_id: number = 0;
  public in_kind?: any;
  public in_cash?: any;
  public kind_cash?: any;
  public is_determined?: any;
  public obj_non_pooled_projetct: ObjNonPooledProjetct = new ObjNonPooledProjetct();
}

class ObjNonPooledProjetct {
  public id: number = 0;
  public grant_title: string = '';
  public center_grant_id: string = '';
  public results_id: string = '';
  public lead_center_id: string = '';
  public funder_institution_id: number = 0;
  public is_active: boolean = false;
  public created_by: number = 0;
  public created_date: string = '';
  public last_updated_by: number = 0;
  public last_updated_date: string = '';
  public non_pooled_project_type_id: string = '';
}

class InitiativeExpectedInvestment {
  public is_active: boolean = false;
  public created_date: string = '';
  public last_updated_date: string = '';
  public created_by: string = '';
  public last_updated_by: string = '';
  public result_initiative_budget_id: string = '';
  public result_initiative_id: number = 0;
  public current_year?: any;
  public next_year?: any;
  public kind_cash?: any;
  public is_determined?: any;
  public obj_result_initiative: ObjResultInitiative = new ObjResultInitiative();
}

class ObjResultInitiative {
  public id: number = 0;
  public result_id: string = '';
  public initiative_id: number = 0;
  public initiative_role_id: string = '';
  public is_active: boolean = false;
  public created_by: number = 0;
  public created_date: string = '';
  public last_updated_by: number = 0;
  public last_updated_date: string = '';
  public obj_initiative: ObjInitiative = new ObjInitiative();
}

class ObjInitiative {
  public id: number = 0;
  public official_code: string = '';
  public name: string = '';
  public short_name: string = '';
  public active: boolean = false;
  public toc_id: string = '';
}

class InstitutionsExpectedInvestment {
  public institution: Institution = new Institution();
  public budget: any[] = [];
  public kind_cash?: any;
  public is_determined?: any;
}

class Institution {
  public id: string = '';
  public result_id: string = '';
  public institutions_id: number = 0;
  public institution_roles_id: string = '';
  public is_active: number = 0;
  public created_date: string = '';
  public created_by: number = 0;
  public last_updated_date: string = '';
  public last_updated_by: number = 0;
  public institutions_name: string = '';
  public institutions_acronym: string = '';
  public institutions_type_name: string = '';
}
