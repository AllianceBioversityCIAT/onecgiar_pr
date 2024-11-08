export class IpsrStep3Body {
  innovatonUse = new InnovatonUse();
  result_innovation_package = new Resultinnovationpackage();
  result_ip_result_complementary: Resultipresultcomplementary[] = [];
  result_ip_result_core = new Resultipresultcomplementary();
  link_workshop_list: string;
}

export class Resultipresultcomplementary {
  created_by: string;
  readinees_evidence_link?: any;
  use_evidence_link?: any;
  readiness_level_evidence_based?: any;
  use_level_evidence_based?: any;
  obj_result: any;
  readiness_details_of_evidence: string;
  use_details_of_evidence: string;
  open: boolean = true;
  showDetailsOfReadiness: boolean;
  showDetailsOfUseLevel: boolean;
}

class Resultinnovationpackage {
  use_level_evidence_based = null;
  readiness_level_evidence_based = null;
  is_expert_workshop_organized = null;
}

export class ExpertWorkshopOrganized {
  first_name: string;
  last_name: string;
  email: string;
  workshop_role: string;
}

class InnovatonUse {
  actors: ActorN3[] = [];
  organization: OrganizationN3[] = [];
  measures: MeasureN3[] = [];
}

export class MeasureN3 {
  unit_of_measure: string;
  quantity: number;
  is_active: boolean;
  evidence_link: string;
  result_ip_result_measures_id: any;
}

export class OrganizationN3 {
  institution_types_id: number;
  institution_sub_type_id: number;
  how_many: number;
  graduate_students: string;
  // Aux
  hide: boolean;
  is_active: boolean;
  evidence_link: string;
  other_institution: string;
  id: any;
}

export class ActorN3 {
  result_actors_id: any;
  actor_type_id: number;
  women: number;
  women_youth: number;
  previousWomen: number;
  previousWomen_youth: number;
  previousMen: number;
  previousMen_youth: number;
  men: number;
  men_youth: number;
  is_active: boolean;
  evidence_link: string;
  women_non_youth: string | number;
  men_non_youth: string | number;
  showWomenExplanation: boolean;
  other_actor_type: any;
  sex_and_age_disaggregation: any;
  how_many: any;
  result_ip_actors_id: any;
  showWomenExplanationwomen?: boolean;
  showMenExplanationmen?: boolean;
}
