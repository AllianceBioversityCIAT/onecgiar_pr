// @akili-spec quality-assurance/qa-field-catalog
import { NotForQaEntry } from './types';

/** Columns of in-scope tables deliberately not catalogued, each with a reason (QAC-R-7). */

const AUDIT = 'audit / soft-delete column, not form data';
const IDENTITY = 'surrogate primary key (identity), not form data';
const ENVELOPE =
  'result envelope (identity / type / level / status / version): exposed by the catalog result types and phase, not as a field (REVIEW D21)';
const WORKFLOW = 'bilateral / review / QA workflow state, not form data';
const LEGACY = 'legacy column, not written by the 2026 (P25) form';
const DISCRIMINATOR =
  'discriminator set by the server; used only as a binding filter, not a field';

const nfq = (
  table: string,
  reason: string,
  ...columns: string[]
): NotForQaEntry[] => columns.map((column) => ({ table, column, reason }));

export const NOT_FOR_QA: NotForQaEntry[] = [
  // result
  ...nfq(
    'result',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result', IDENTITY, 'id'),
  ...nfq(
    'result',
    ENVELOPE,
    'result_code',
    'result_type_id',
    'result_level_id',
    'version_id',
    'status',
    'status_id',
    'reported_year_id',
  ),
  ...nfq(
    'result',
    WORKFLOW,
    'in_qa',
    'last_action_type',
    'justification_action_type',
    'source',
    'creation_method',
    'external_submitter',
    'external_submitted_date',
    'external_submitted_comment',
    'external_platform_id',
    'external_platform_code',
    'external_reference',
    'reviewed_by',
    'reviewed_at',
  ),
  ...nfq('result', LEGACY, 'legacy_id'),
  ...nfq(
    'result',
    'flag that gates the form version (annual updating), exposed through the catalog valid_from / valid_to, not as a field',
    'is_replicated',
  ),
  ...nfq(
    'result',
    'legacy single-value impact area column, written null by the P25 save; the 2026 value lives in result_impact_area_score',
    'gender_impact_area_id',
    'climate_impact_area_id',
    'nutrition_impact_area_id',
    'environmental_biodiversity_impact_area_id',
    'poverty_impact_area_id',
  ),
  ...nfq(
    'result',
    'hidden in the P25 form (is_krs is not rendered for P25)',
    'is_krs',
    'krs_url',
  ),

  // result_impact_area_score
  ...nfq(
    'result_impact_area_score',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_impact_area_score', IDENTITY, 'id'),

  // results_toc_result
  ...nfq(
    'results_toc_result',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_toc_result',
    LEGACY,
    'action_area_id',
    'action_area_outcome_id',
    'mapping_sdg',
    'mapping_impact',
    'is_sdg_action_impact',
    'version_dashboard_id',
  ),
  ...nfq(
    'results_toc_result',
    'derived from the Submitter selection, not a form control',
    'initiative_id',
  ),

  // results_toc_result_indicators
  ...nfq(
    'results_toc_result_indicators',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_toc_result_indicators',
    IDENTITY,
    'result_toc_result_indicator_id',
  ),
  ...nfq(
    'results_toc_result_indicators',
    LEGACY,
    'status',
    'indicator_contributing',
  ),
  ...nfq(
    'results_toc_result_indicators',
    'filter used by the validation function (not applicable indicators), not a field',
    'is_not_aplicable',
  ),

  // result_indicators_targets
  ...nfq(
    'result_indicators_targets',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_indicators_targets', IDENTITY, 'indicators_targets'),
  ...nfq(
    'result_indicators_targets',
    'read-only copy of the ToC target (display), or no control in this form',
    'number_target',
    'target_date',
    'toc_indicator_target_id',
    'indicator_question',
    'target_progress_narrative',
  ),

  // results_center
  ...nfq(
    'results_center',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_center', IDENTITY, 'id'),
  ...nfq('results_center', LEGACY, 'is_primary'),

  // results_by_institution
  ...nfq(
    'results_by_institution',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_by_institution', IDENTITY, 'id'),
  ...nfq(
    'results_by_institution',
    'knowledge product matching helper, not form data',
    'is_predicted',
    'result_kp_mqap_institution_id',
  ),

  // result_by_institutions_by_deliveries_type
  ...nfq(
    'result_by_institutions_by_deliveries_type',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_by_institutions_by_deliveries_type', IDENTITY, 'id'),

  // results_by_inititiative
  ...nfq(
    'results_by_inititiative',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_by_inititiative', IDENTITY, 'id'),

  // results_by_projects
  ...nfq(
    'results_by_projects',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_by_projects', IDENTITY, 'id'),
  ...nfq(
    'results_by_projects',
    'no control in the contributors form',
    'is_lead',
  ),

  // linked_result
  ...nfq(
    'linked_result',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('linked_result', IDENTITY, 'id'),

  // result_region / result_country / result_country_subnational
  ...nfq('result_region', AUDIT, 'created_date', 'last_updated_date'),
  ...nfq('result_region', IDENTITY, 'result_region_id'),
  ...nfq('result_country', AUDIT, 'created_date', 'last_updated_date'),
  ...nfq('result_country', IDENTITY, 'result_country_id'),
  ...nfq(
    'result_country_subnational',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'result_country_subnational',
    IDENTITY,
    'result_country_subnational_id',
  ),
  ...nfq('result_country_subnational', DISCRIMINATOR, 'geo_scope_role_id'),

  // evidence
  ...nfq(
    'evidence',
    AUDIT,
    'created_by',
    'creation_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'evidence',
    'foreign key to the result derived automatically (knowledge product link), not a form control',
    'knowledge_product_related',
  ),
  ...nfq(
    'evidence',
    'belongs to the innovation development user-demand flow, hidden in 2026',
    'innov_dev_user_demand',
  ),

  // evidence_sharepoint
  ...nfq(
    'evidence_sharepoint',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('evidence_sharepoint', IDENTITY, 'id'),

  // results_investment_discontinued_options
  ...nfq(
    'results_investment_discontinued_options',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_investment_discontinued_options',
    IDENTITY,
    'results_investment_discontinued_option_id',
  ),

  // result_innovation_merge_split
  ...nfq(
    'result_innovation_merge_split',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'result_innovation_merge_split',
    IDENTITY,
    'result_innovation_merge_split_id',
  ),
];
