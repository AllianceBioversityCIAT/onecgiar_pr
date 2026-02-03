export interface ResultToReview {
  id: string;
  project_id: string;
  project_name: string;
  result_code: string;
  result_title: string;
  indicator_category: string;
  status_name: string;
  acronym: string;
  toc_title: string;
  indicator: string;
  submission_date: string;
  lead_center?: string;
}

export interface GroupedResult {
  project_id: string;
  project_name: string;
  results: ResultToReview[];
}

export interface BilateralResultDetail {
  commonFields: BilateralCommonFields;
  tocMetadata: BilateralTocMetadata | BilateralTocMetadata[];
  geographicScope: BilateralGeographicScope;
  contributingCenters: BilateralContributingCenter[];
  contributingInstitutions: BilateralContributingInstitution[];
  contributingProjects: BilateralContributingProject[];
  contributingInitiatives: BilateralContributingInitiative[] | BilateralContributingInitiativesObject;
  evidence: BilateralEvidence[];
  resultTypeResponse: BilateralResultTypeResponse[];
}

export interface BilateralInnovationDevResponse {
  innovation_type_name: string;
}

export interface BilateralCommonFields {
  result_type_id: number;
  project_name: string;
  center_name: string;
  id: string;
  result_code: string;
  external_submitter: number;
  submitter_name: string;
  result_level_id: number;
  result_title: string;
  result_description: string | null;
  result_category: string;
  status_id?: string;
}

export interface BilateralTocMetadata {
  planned_result: boolean | number;
  initiative_id?: number;
  official_code?: string;
  short_name?: string;
  result_toc_results?: BilateralTocResult[];
  acronym?: string;
  toc_result_id?: number;
  result_title?: string;
  indicator_id?: string;
  indicator_description?: string;
}

export interface BilateralTocResult {
  result_toc_result_id: number;
  toc_result_id: number;
  planned_result: boolean;
  initiative_id: number;
  toc_progressive_narrative: string | null;
  toc_level_id: number;
  indicators: BilateralTocIndicator[];
}

export interface BilateralTocIndicator {
  result_toc_result_indicator_id: number;
  toc_results_indicator_id: string;
  indicator_contributing: number | null;
  status_id: number | null;
  targets: BilateralTocIndicatorTarget[];
}

export interface BilateralTocIndicatorTarget {
  indicators_targets: number;
  number_target: number;
  contributing_indicator: number;
  target_date: number;
  target_progress_narrative: string | null;
  indicator_question: string | null;
}

export interface BilateralGeographicScope {
  regions: any[];
  countries: any[];
  geo_scope_id: number;
  has_extra_geo_scope: boolean | null;
  has_countries: boolean;
  has_regions: boolean;
  extra_geo_scope_id: number | null;
  extra_regions: any[];
  extra_countries: any[];
  has_extra_regions: boolean | null;
  has_extra_countries: boolean | null;
}

export interface BilateralContributingCenter {
  id: number;
  primary: number;
  from_cgspace: number;
  is_active: number;
  created_date: string;
  last_updated_date: string;
  result_id: string;
  created_by: number;
  last_updated_by: number | null;
  code: string;
  name: string;
  acronym: string;
  is_leading_result: number;
}

export interface BilateralContributingInstitution {
  id?: number;
  name?: string;
  acronym?: string;
  is_active: boolean;
  is_predicted: boolean;
  created_date: string;
  last_updated_date: string;
  is_leading_result: boolean;
  result_id: string;
  institutions_id: number;
  institution_roles_id: string;
  result_kp_mqap_institution_id: string | null;
  delivery: any[];
  obj_institutions: {
    name: string;
    website_link: string;
    obj_institution_type_code: {
      id: number;
      name: string;
    };
  };
}

export interface BilateralContributingProject {
  is_active: boolean;
  created_date: string;
  last_updated_date: string;
  created_by: string;
  last_updated_by: string | null;
  id: number;
  result_id: string;
  project_id: string;
  obj_clarisa_project: BilateralClarisaProject;
}

export interface BilateralClarisaProject {
  id: string;
  shortName: string;
  fullName: string;
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
  remaining: string;
  annual: string;
  sourceOfFunding: string;
  organizationCode: string;
  funderCode: string | null;
  interimDirectorReview: string;
  projectResults: string;
  modificationJustification: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isActive: boolean | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface BilateralContributingInitiative {
  initiative_role?: string;
  official_code: string;
  id?: number;
  initiative_name?: string;
  short_name?: string;
  initiative_role_id?: number | null;
  request_status_id?: number;
  share_result_request_id?: number;
  is_active?: number;
}

export interface BilateralContributingInitiativesObject {
  contributing_and_primary_initiative?: BilateralContributingInitiative[];
  accepted_contributing_initiatives: BilateralContributingInitiative[];
  pending_contributing_initiatives: BilateralContributingInitiative[];
}

export interface BilateralEvidence {
  link: string;
}

export interface BilateralInnovationUseResponse {
  actors?: BilateralInnovationUseActor[];
  organizations?: any[];
  measures?: BilateralInnovationUseMeasure[];
  investment_partners?: BilateralInnovationUseInvestmentPartner[];
}

export interface BilateralInnovationUseActor {
  is_active?: boolean;
  result_actors_id?: string;
  women?: number | string | null;
  women_youth?: number | string | null;
  women_non_youth?: number | string | null;
  men?: number | string | null;
  men_youth?: number | string | null;
  men_non_youth?: number | string | null;
  other_actor_type?: string | null;
  sex_and_age_disaggregation?: boolean;
  how_many?: number | string | null;
  actor_type_id?: string | number | null;
  obj_actor_type?: { actor_type_id: string | number; name: string };
}

export interface BilateralInnovationUseMeasure {
  is_active?: boolean;
  result_ip_measure_id?: string;
  unit_of_measure?: string;
  quantity?: number | null;
}

export interface BilateralInnovationUseInvestmentPartner {
  id?: number;
  name?: string;
  kind_cash?: number | null;
  is_determined?: boolean | null;
}

export interface BilateralResultTypeResponse {
  metadata: BilateralResultTypeMetadata[];
  source: string;
  year: string;
  knowledge_product_type: string;
  is_peer_reviewed: number;
  is_isi: number;
  accesibility: string;
  licence: string;
  is_agrovoc: number;
  keyword: string;
  keywords: BilateralKeyword[];
  innovation_type_name: string;
  innovation_nature_id: number;
  innovation_developers: string;
  innovation_readiness_level_id: number;
  level: string;
  name: string;
  policy_type_name: string;
  policy_stage_name: string;
  policy_type_id: number;
  policy_stage_id: number;
  implementing_organization: BilateralImplementingOrganization[];
  institutions: any[];
  male_using: string;
  female_using: string;
  non_binary_using: string;
  has_unkown_using: string;
  term_name: string;
  delivery_method_name: string;
  capdev_term_id: number;
  capdev_delivery_method_id: number;
}

export interface BilateralImplementingOrganization {
  acronym: string;
  institution_id: number;
  institution_name: string;
}

export interface BilateralKeyword {
  result_kp_keyword_id: string;
  is_agrovoc: number;
  keyword: string;
}

export interface BilateralResultTypeMetadata {
  result_kp_metadata_id: string;
  source: string;
  year: string;
  is_peer_reviewed: number;
  is_isi: number;
  accesibility: string;
}
