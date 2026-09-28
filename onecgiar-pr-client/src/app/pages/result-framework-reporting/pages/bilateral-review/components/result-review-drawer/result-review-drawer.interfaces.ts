export type NullableNumericValue = number | string | null;
export type NullableNumericId = string | number | null;
export type NumericId = string | number;

export interface ResultToReview {
  id: string;
  project_id: string;
  project_name: string;
  result_code: string;
  result_title: string;
  indicator_category: string;
  status_name: string;
  status_id?: string | number;
  acronym: string;
  toc_title: string;
  indicator: string;
  submission_date: string;
  lead_center?: string;
  /**
   * Science-Program role on this bilateral result. The backend already sends both
   * (`results.service.ts` maps them from `initiative_role_id` / `_name`); they were simply
   * never declared here. ⚠️ The wire sends the id as a STRING (`'1'` = primary submitter,
   * `'2'` = contributor) — compare with `String(...)`, never `=== 1`.
   */
  initiative_role_id?: string | number;
  initiative_role_name?: string;
  // @akili-spec bilateral/review-list-source-and-reporter (BSR-T-1, BSR-T-4, BSR-R-1, design.md §4.1)
  /** Additive — already returned by `getResultsByProgramAndCenters` (`results.service.ts` mapper,
   *  `BSR-T-1`); declared here so `BilateralReviewTableComponent`'s SOURCE column (`BSR-T-4`) can
   *  read them typed. `'AI' | 'MANUAL' | 'BULK' | 'EXTERNAL' | 'UNKNOWN'` in practice, but the
   *  derivation (`resolveBilateralSource`) treats it as an open string. */
  creation_method?: string;
  /** CLARISA `mis.acronym` captured at ingestion, or `null` when the result was not ingested via
   *  an external platform (`BSR-R-1`, `design.md` §4.1). */
  external_platform_code?: string | null;
  /** Resolved display name of the submitter — `external_submitter`'s name, falling back to
   *  `created_by`'s, `null` when neither resolves (`BSR-R-2`). */
  reporter_name?: string | null;
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
  contributors_result_toc_result: any[];
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
  // @akili-spec bilateral/review-list-source-and-reporter (BSR-T-5, BSR-R-9, design.md P-5)
  /** Additive — already returned by `getCommonFieldsBilateralResultById`
   *  (`result.repository.ts:3406-3407`); declared here so the drawer header's Source line
   *  (`BSR-T-5`) can read it typed. Same open-string treatment as `ResultToReview.creation_method`
   *  (`BSR-T-1`/`BSR-T-4`) — `resolveBilateralSource` does the mapping, not this type. NOTE: the
   *  detail query does not select `external_platform_code`, so the drawer's derivation is always
   *  called with `platformCode: undefined`. Measured against the live TEST database (1505 active
   *  bilateral results): `EXTERNAL` (1152 rows), `AI` (129) and `MANUAL` (129) never carry a
   *  non-blank `external_platform_code` TODAY — but that is a fact about this pre-`BSR-T-2`,
   *  migration-backfilled population, not a durable property of `EXTERNAL` rows: ingestion has
   *  always written `external_platform_code` (`bilateral.service.ts:4212`). The measured gap is
   *  `UNKNOWN`: 84 of its 95 rows DO carry a code (`W3RU`=54, `STAR`=24, `FETCHER`=6), and with
   *  `platformCode: undefined` those fall to the matrix's placeholder row (`BSR-R-4` rows 6-7),
   *  so the drawer renders an em-dash where the list renders `Via API · W3RU`. That class is
   *  FIXED legacy, not growing — `BSR-T-2` stamping `EXTERNAL` on ingestion moves new rows OUT of
   *  `UNKNOWN`, it cannot grow it. What DOES grow is `EXTERNAL`+code: every row `BSR-T-2` newly
   *  stamps `EXTERNAL` also carries the code ingestion has always captured, rendering
   *  `Via API` in the drawer vs `Via API · <code>` in the list (`BSR-R-4` rows 4-5). Closing both
   *  classes needs a server edit to `getCommonFieldsBilateralResultById` to also select
   *  `r.external_platform_code`, which is out of this task's scope (`BSR-R-9` only names
   *  `creation_method`). */
  creation_method?: string;
  /** Additive — `CASE WHEN r.creation_method = 'AI' THEN 1 ELSE 0 END AS is_ai_generated`
   *  (`result.repository.ts:3406`). Declared per the task brief; NOT consumed by the Source
   *  derivation — `BSR-R-4`'s matrix branches on `creation_method` alone (`resolveBilateralSource`
   *  ignores this field entirely), so no display behaviour is invented around it here. */
  is_ai_generated?: number;
  // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6, contract from T-5, design.md §5.3)
  /** The portfolio start year of the result's version. `null` (a version without a portfolio) means
   *  "not P25-onward" — never treat it as P25-onward and never derive the year from a phase id or a
   *  constant (R-7.c). `isP25Onward` (this component) is `portfolio_start_year >= 2025`. */
  portfolio_start_year?: number | null;
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
  investment_projects?: BilateralInnovationUseInvestmentProject[];
}

export interface BilateralInnovationUseInvestmentProject {
  non_pooled_projetct_budget_id?: string;
  project_id?: string;
  kind_cash?: number | null;
  is_determined?: boolean | null;
  name?: string;
}

export interface BilateralInnovationUseActor {
  is_active?: boolean;
  result_actors_id?: string;
  women?: NullableNumericValue;
  women_youth?: NullableNumericValue;
  women_non_youth?: NullableNumericValue;
  men?: NullableNumericValue;
  men_youth?: NullableNumericValue;
  men_non_youth?: NullableNumericValue;
  other_actor_type?: string | null;
  sex_and_age_disaggregation?: boolean;
  how_many?: NullableNumericValue;
  actor_type_id?: NullableNumericId;
  obj_actor_type?: { actor_type_id: NumericId; name: string };
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
  investment_projects?: any[];
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
