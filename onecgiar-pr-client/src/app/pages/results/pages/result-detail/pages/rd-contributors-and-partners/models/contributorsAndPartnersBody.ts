import { TheoryOfChangeBody } from '../../rd-theory-of-change/model/theoryOfChangeBody';

export class ContributorsAndPartnersBody extends TheoryOfChangeBody {
  public no_applicable_partner: boolean = false;
  public mqap_institutions: UnmappedMQAPInstitutionDto[] = [];
  public institutions: InstitutionsInterface[] = [];
  public contributing_np_projects: NonPooledProjectDto[];
  public contributing_center: ResultsCenterDto[];
  public is_lead_by_partner: boolean | null;
  owner_initiative: OwnerInitiative;
  has_innovation_link: boolean = false;
  linked_results: any[] = [];
}

export interface OwnerInitiative {
  id: number;
  official_code: string;
  initiative_name: string;
  short_name: string;
  initiative_role_id: string;
  is_active: number;
}

export class InstitutionsInterface {
  id: string;
  result_id: string;
  institutions_id: number;
  institution_roles_id: string;
  is_active: boolean;
  is_predicted: boolean;
  result_kp_mqap_institution_id: string | null;
  created_date: string;
  last_updated_date: string;
  is_leading_result: boolean;
  obj_institutions: {
    name: number;
    website_link: string;
    obj_institution_type_code: {
      name: string;
      id: number;
    };
  };
  delivery: {
    id: number;
    partner_delivery_type_id: number;
    result_by_institution_id: string;
    is_active: boolean;
    created_by: number;
    created_date: string;
    last_updated_by: number;
    last_updated_date: string;
  }[];
}

export class UnmappedMQAPInstitutionDto {
  id: string;
  result_id: string;
  institutions_id: number;
  institution_roles_id: string;
  is_active: boolean;
  is_predicted: boolean;
  result_kp_mqap_institution_id: string;
  created_date: string;
  last_updated_date: string;
  institutions_type_name: string;
  is_leading_result: boolean;
  result_kp_mqap_institution_object: {
    result_kp_mqap_institution_id: string;
    result_knowledge_product_id: string;
    intitution_name: string;
    institutions_type_name: string;
    predicted_institution_id: number;
    confidant: number;
    results_by_institutions_id: null;
    is_active: boolean;
    created_date: string;
    last_updated_date: string;
  };
  obj_institutions: {
    name: number;
    website_link: string;
    obj_institution_type_code: {
      name: string;
    };
  };
  delivery: {
    id: number;
    partner_delivery_type_id: number;
    result_by_institution_id: string;
    is_active: boolean;
    created_by: number;
    created_date: string;
    last_updated_by: number;
    last_updated_date: string;
  }[];
}

export class NonPooledProjectDto {
  id?: number;
  grant_title: string;
  center_grant_id: string;
  is_active?: boolean;
  created_date?: Date;
  last_updated_date?: Date;
  results_id?: number;
  lead_center: string | number;
  funder: number | string;
  created_by?: number;
  last_updated_by?: number;
}

export class ResultsCenterDto {
  id: number;
  from_cgspace: boolean;
  is_active: boolean;
  created_date: Date;
  last_updated_date: Date;
  result_id: number;
  created_by: number;
  last_updated_by: number;
  code: string;
  name: string;
  acronym: string;
  is_leading_result: boolean;
}
