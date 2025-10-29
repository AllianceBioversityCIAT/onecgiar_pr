import { Resultipresultcomplementary } from '../../step-n3/model/Ipsr-step-3-body.model';

export class IpsrStep1Body {
  has_innovation_link: boolean = false;
  has_scaling_studies: boolean = false;
  has_studies_links: boolean = false;
  innov_use_to_be_determined: boolean = false;
  innov_use_2030_to_be_determined: boolean = false;
  evidences_justification: string = '';
  readiness_level_explanation: string = '';
  innovation_readiness_level_id: number = null;
  linked_results: number[] = [];
  scaling_studies_urls: string[] = [];
  previous_irl: number = null;
  investment_programs: Investment[] = [];
  investment_bilateral: Investment[] = [];
  investment_partners: Investment[] = [];
  
  initiative_id: number = null;
  geo_scope_id: number = null;
  countries: Country[] = [];
  regions: any[] = [];
  coreResult: any = null;
  eoiOutcomes: EoiOutcome[] = [];
  actionAreaOutcomes: ActionAreaOutcome[] = [];
  impactAreas: ImpactArea[] = [];
  sdgTargets: SdgTarget[] = [];
  innovatonUse: InnovatonUse = new InnovatonUse();
  innovation_use_2030: InnovatonUse = new InnovatonUse();
  institutions: Institutions[] = [];
  experts: Expert[] = [];
  result_ip: Result_ip = new Result_ip();
  scalig_ambition: Scalig_ambition = new Scalig_ambition();
  result_ip_result_core: Resultipresultcomplementary = new Resultipresultcomplementary();
  result_ip_expert_workshop_organized = [];
  link_workshop_list: string = null;
}

class Investment {
  official_code: string = null;
  name: string = null;
  kind_cash: number = null;
  is_determined: boolean = null;
}

class Scalig_ambition {
  body: string = null;
  title: string = null;
}

export class Expert {
  first_name: string;
  last_name: string;
  email: string;
  organization_id: number;
  // expertises_id: number;
  result_ip_expert_id: any;
  expertises = [];
  is_active: boolean;
}

class Result_ip {
  participants_consent: boolean = null;
  is_active: boolean = null;
  created_date: Date = null;
  last_updated_date: Date = null;
  created_by: string = null;
  last_updated_by: string = null;
  result_innovation_package_id: string = null;
  experts_is_diverse: boolean = null;
  is_not_diverse_justification: string = null;
  consensus_initiative_work_package_id: string = null;
  relevant_country_id: string = null;
  regional_leadership_id: string = null;
  regional_integrated_id: string = null;
  active_backstopping_id: string = null;
  use_level_evidence_based: string = null;
  readiness_level_evidence_based: string = null;
  is_expert_workshop_organized: boolean = null;
  initiative_expected_time: string = null;
  initiative_unit_time_id: string = null;
  bilateral_expected_time: string = null;
  bilateral_unit_time_id: string = null;
  partner_expected_time: string = null;
  partner_unit_time_id: string = null;
  is_result_ip_published: boolean = null;
  ipsr_pdf_report: string = null;
  assessed_during_expert_workshop_id: string = null;
  scaling_ambition_blurb: string = null;
}

interface Institutions {
  institutions_id: number;
  institutions_name: string;
  institutions_type_name: string;
  deliveries: Delivery[];
}

interface Delivery {
  partner_delivery_type_id: number;
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
}

interface SdgTarget {
  clarisa_sdg_usnd_code: number;
  clarisa_sdg_target_id: number;
  sdg_target: string;
  full_name: string;
  sdg_target_code: string;
}

interface ImpactArea {
  impact_area_indicator_id: number;
  target: string;
  full_name: string;
  name: string;
}

interface ActionAreaOutcome {
  action_area_outcome_id: number;
  outcomeStatement: string;
  is_active: boolean;
  full_name: string;
  outcomeSMOcode: string;
}

interface EoiOutcome {
  toc_result_id: number;
}

interface Country {
  id: number;
  name: string;
}

export class CoreResult {
  result_code: string = null;
  title: string = null;
  official_code: string = null;
  version_id: number | string | null = null;
}
