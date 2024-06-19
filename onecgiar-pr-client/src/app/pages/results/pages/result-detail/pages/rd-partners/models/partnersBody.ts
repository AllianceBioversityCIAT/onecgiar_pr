export class PartnersBody {
  public no_applicable_partner: boolean = false;
  public mqap_institutions: UnmappedMQAPInstitutionDto[] = [];
  public institutions: InstitutionsInterface[] = [];
  // constructor(no_applicable_partner?) {
  //   this.no_applicable_partner = no_applicable_partner ? no_applicable_partner : false;
  // }
}

class InstitutionsInterface {
  // mapped_mqap_institutions: number | string = null;
  institutions_id: number;
  institutions_name: string;
  institutions_type_name: string;
  deliveries?: boolean[] = [false, false, false];
}

export class UnmappedMQAPInstitutionDto {
  // result_kp_mqap_institution_id: number;
  // predicted_institution_id: number;
  // intitution_name: string;
  // confidant: number;
  // user_matched_institution: InstitutionsInterface;
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
  delivery: [
    {
      id: number;
      partner_delivery_type_id: number;
      result_by_institution_id: string;
      is_active: boolean;
      created_by: number;
      created_date: string;
      last_updated_by: number;
      last_updated_date: string;
    }
  ];
}

// {
//     "id": "20726",
//     "result_id": "7545",
//     "institutions_id": 3305,
//     "institution_roles_id": "8",
//     "is_active": true,
//     "is_predicted": true,
//     "result_kp_mqap_institution_id": "7046",
//     "created_date": "2024-06-18T18:49:13.087Z",
//     "last_updated_date": "2024-06-18T18:49:13.087Z",
//     "result_kp_mqap_institution_obj": {
//         "result_kp_mqap_institution_id": "7046",
//         "result_knowledge_product_id": "2279",
//         "intitution_name": "University of Montpellier",
//         "predicted_institution_id": 3305,
//         "confidant": 100,
//         "results_by_institutions_id": null,
//         "is_active": true,
//         "created_date": "2024-06-18T18:49:12.211Z",
//         "last_updated_date": "2024-06-18T18:49:12.211Z"
//     },
//     "delivery": []
// }
