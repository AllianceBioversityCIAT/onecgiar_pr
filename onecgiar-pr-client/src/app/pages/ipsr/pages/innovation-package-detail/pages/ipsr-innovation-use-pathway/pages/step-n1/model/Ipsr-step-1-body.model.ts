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
  experts_is_diverse: number = null;
  is_not_diverse_justification: string = null;
  consensus_initiative_work_package: number = null;
  relevant_country: number = null;
  regional_leadership: number = null;
  regional_integrated: number = null;
  active_backstopping: number = null;
}

interface Expert {
  first_name: string;
  last_name: string;
  email: string;
  organization_id: number;
  expertises_id: number;
  is_active: boolean;
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
  unit_of_measure: string;
  quantity: number;
  is_active: boolean;
}

export class Organization {
  institution_types_id: number;
  institution_sub_type_id: number;
  how_many: number;
  // Aux
  hide: boolean;
  is_active: boolean;
}

export class Actor {
  actor_type_id: number;
  women: number;
  women_youth: number;
  men: number;
  men_youth: number;
  is_active: boolean;
}

interface SdgTarget {
  clarisa_sdg_usnd_code: number;
  clarisa_sdg_target_id: number;
}

interface ImpactArea {
  impact_area_indicator_id: number;
}

interface ActionAreaOutcome {
  action_area_outcome_id: number;
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
}
