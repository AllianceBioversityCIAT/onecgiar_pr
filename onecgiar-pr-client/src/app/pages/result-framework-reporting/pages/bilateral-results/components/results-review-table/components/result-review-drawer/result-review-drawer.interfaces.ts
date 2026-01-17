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
}

export interface GroupedResult {
  project_id: string;
  project_name: string;
  results: ResultToReview[];
}

export interface BilateralResultDetail {
  commonFields: BilateralCommonFields;
  tocMetadata: BilateralTocMetadata[];
  geographicScope: BilateralGeographicScope;
  contributingCenters: BilateralContributingCenter[];
  contributingInstitutions: BilateralContributingInstitution[];
  contributingProjects: BilateralContributingProject[];
  contributingInitiatives: BilateralContributingInitiative[];
  evidence: BilateralEvidence[];
  resultTypeResponse: BilateralResultTypeResponse[];
}

export interface BilateralCommonFields {
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
}

export interface BilateralTocMetadata {
  planned_result: number;
  acronym: string;
  result_title: string;
  indicator_description: string;
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
  initiative_role: string;
  official_code: string;
}

export interface BilateralEvidence {
  link: string;
}

export interface BilateralResultTypeResponse {
  source: string;
  year: string;
  knowledge_product_type: string;
  is_peer_reviewed: number;
  is_isi: number;
  accesibility: string;
  licence: string;
  is_agrovoc: number;
  keyword: string;
}
