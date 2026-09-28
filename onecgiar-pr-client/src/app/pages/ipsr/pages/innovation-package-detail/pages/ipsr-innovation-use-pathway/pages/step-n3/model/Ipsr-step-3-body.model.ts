/**
 * P2-3824 — the most pieces of evidence one component (core innovation or one complementary
 * innovation / enabler) may carry, readiness and use together. The server enforces the same number;
 * switching to "per level" is a change here and on the server, nowhere else.
 */
export const IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT = 6;

/** The level an evidence list hangs from. */
export type IpsrStep3EvidenceLevel = 'readiness' | 'use';

/** Impact Areas scored 2 (principal) in General information, as the step-three GET names them. */
export type IpsrPrincipalImpactArea = 'gender' | 'climate' | 'nutrition' | 'environment' | 'poverty';

/**
 * P2-3824 — one piece of evidence in IPSR Step 3 (API contract shared with the server).
 * `legacy: true` + `id: null` is the old single link shown as the first evidence of its level;
 * sending it back persists it as a normal row. `file` / `percentage` are client-only (pending upload).
 */
export interface IpsrStepThreeEvidence {
  id: number | null;
  link: string | null;
  description: string | null;
  is_sharepoint: boolean;
  is_public_file: boolean | null;
  sp_document_id?: string | null;
  sp_evidence_id?: string | null;
  sp_file_name?: string | null;
  sp_folder_path?: string | null;
  gender_related?: boolean;
  /** "Climate adaptation and mitigation" — the column name is inherited from the Results form. */
  youth_related?: boolean;
  nutrition_related?: boolean;
  environmental_biodiversity_related?: boolean;
  poverty_related?: boolean;
  innovation_use_related?: boolean;
  legacy?: boolean;
  file?: File | null;
  percentage?: number | string;
}

export class IpsrStep3Body {
  innovatonUse = new InnovatonUse();
  result_innovation_package = new Resultinnovationpackage();
  result_ip_result_complementary: Resultipresultcomplementary[] = [];
  result_ip_result_core = new Resultipresultcomplementary();
  link_workshop_list: string;
  /** P2-3824 — read-only, from the GET; drives the score-2 alerts. Never sent back. */
  principal_impact_areas?: IpsrPrincipalImpactArea[] = [];
}

export class Resultipresultcomplementary {
  created_by: string;
  /** @deprecated P2-3824 — read-only legacy single link; the server dual-writes it from `readiness_evidences`. */
  readinees_evidence_link?: any;
  /** @deprecated P2-3824 — see `readinees_evidence_link`. */
  use_evidence_link?: any;
  readiness_level_evidence_based?: any;
  use_level_evidence_based?: any;
  obj_result: any;
  /** @deprecated P2-3824 — see `readinees_evidence_link`. */
  readiness_details_of_evidence?: string;
  /** @deprecated P2-3824 — see `readinees_evidence_link`. */
  use_details_of_evidence?: string;
  readiness_evidences?: IpsrStepThreeEvidence[] = [];
  use_evidences?: IpsrStepThreeEvidence[] = [];
  open: boolean = true;
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
