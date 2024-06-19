export class PartnersBody {
  public no_applicable_partner: boolean = false;
  public mqap_institutions: UnmappedMQAPInstitutionDto[] = [];
  public institutions: InstitutionsInterface[] = [];
}

class InstitutionsInterface {
  id: string;
  result_id: string;
  institutions_id: number;
  institution_roles_id: string;
  is_active: boolean;
  is_predicted: boolean;
  result_kp_mqap_institution_id: string | null;
  created_date: string;
  last_updated_date: string;
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
  result_kp_mqap_institution_obj: {
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
