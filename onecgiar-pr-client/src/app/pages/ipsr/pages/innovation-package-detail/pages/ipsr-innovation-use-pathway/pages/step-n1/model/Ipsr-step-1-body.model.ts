import { Resultipresultcomplementary } from '../../step-n3/model/Ipsr-step-3-body.model';

export class IpsrStep1Body {
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
  institutions: Institutions[] = [];
  experts: Expert[] = [];
  result_ip: Result_ip = new Result_ip();
  scalig_ambition: Scalig_ambition = new Scalig_ambition();
  result_ip_result_core: Resultipresultcomplementary = new Resultipresultcomplementary();
  result_ip_expert_workshop_organized = [];
  link_workshop_list: string = null;
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
  is_not_diverse_justification: null = null;
  consensus_initiative_work_package_id: string = null;
  relevant_country_id: string = null;
  regional_leadership_id: string = null;
  regional_integrated_id: string = null;
  active_backstopping_id: string = null;
  use_level_evidence_based: null = null;
  readiness_level_evidence_based: null = null;
  is_expert_workshop_organized: boolean = null;
  initiative_expected_time: null = null;
  initiative_unit_time_id: null = null;
  bilateral_expected_time: null = null;
  bilateral_unit_time_id: null = null;
  partner_expected_time: null = null;
  partner_unit_time_id: null = null;
  is_result_ip_published: boolean = null;
  ipsr_pdf_report: null = null;
  assessed_during_expert_workshop_id: null = null;
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
