// @akili-spec quality-assurance/qa-field-catalog
import { NotForQaEntry } from './types';

/** Columns of in-scope tables deliberately not catalogued, each with a reason (QAC-R-7). */

const AUDIT = 'audit / soft-delete column, not form data';
const IDENTITY = 'surrogate primary key (identity), not form data';
const ENVELOPE =
  'result envelope (identity / type / level / status / version): exposed by the catalog result types and phase, not as a field (REVIEW D21)';
const WORKFLOW = 'bilateral / review / QA workflow state, not form data';
const LEGACY = 'legacy column, not written by the 2026 (P25) form';
const FK_PARENT =
  'foreign key to the parent row, the key that reaches the result through a parent (2-hop); not form data';
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

  // results_knowledge_product (QAC-T-9)
  ...nfq(
    'results_knowledge_product',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_knowledge_product', IDENTITY, 'result_knowledge_product_id'),
  ...nfq(
    'results_knowledge_product',
    'foreign key to the result (one row per result), the binding key of the whole table, not form data',
    'results_id',
  ),
  ...nfq(
    'results_knowledge_product',
    'non-P25 picker ("Select MELIA from those included in OST Section 6.3"), hidden in P25',
    'ost_melia_study_id',
  ),
  ...nfq(
    'results_knowledge_product',
    'duplicate of result.title / result.description (catalogued as general.title / general.description)',
    'name',
    'description',
  ),
  ...nfq(
    'results_knowledge_product',
    'the page shows results_kp_metadata.doi, not this column (REVIEW A-14)',
    'doi',
  ),
  ...nfq(
    'results_knowledge_product',
    'raw repository text, not shown in the form',
    'cgspace_regions',
    'cgspace_countries',
  ),

  // results_capacity_developments (QAC-T-9)
  ...nfq(
    'results_capacity_developments',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_capacity_developments',
    IDENTITY,
    'result_capacity_development_id',
  ),
  ...nfq(
    'results_capacity_developments',
    'foreign key to the result (one row per result), the binding key of the whole table, not form data',
    'result_id',
  ),

  // results_innovations_dev (QAC-T-9)
  ...nfq(
    'results_innovations_dev',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_innovations_dev', IDENTITY, 'result_innovation_dev_id'),
  ...nfq(
    'results_innovations_dev',
    'foreign key to the result (one row per result), the binding key of the whole table, not form data',
    'results_id',
  ),
  ...nfq(
    'results_innovations_dev',
    'hidden in 2026 (scaling studies, user-demand block) or legacy text / flag no longer written by the 2026 form',
    'has_scaling_studies',
    'readiness_level',
    'innovation_user_to_be_determined',
    'innovation_acknowledgement',
    'innovation_pdf',
  ),
  ...nfq(
    'results_innovations_dev',
    'owned by the links section (linked.has_innovation_link, stored on result) / Innovation use, not an Innovation development control',
    'has_innovation_link',
  ),
  ...nfq(
    'results_innovations_dev',
    'system-derived from the lead center, not a form control',
    'ip_support_center_id',
  ),

  // results_kp_metadata (QAC-T-9)
  ...nfq(
    'results_kp_metadata',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_kp_metadata', IDENTITY, 'result_kp_metadata_id'),
  ...nfq('results_kp_metadata', FK_PARENT, 'result_knowledge_product_id'),

  // results_kp_authors (QAC-T-9)
  ...nfq(
    'results_kp_authors',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_kp_authors', IDENTITY, 'result_kp_author_id'),
  ...nfq('results_kp_authors', FK_PARENT, 'result_knowledge_product_id'),

  // results_kp_keywords (QAC-T-9)
  ...nfq(
    'results_kp_keywords',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_kp_keywords', IDENTITY, 'result_kp_keyword_id'),
  ...nfq('results_kp_keywords', FK_PARENT, 'result_knowledge_product_id'),

  // results_kp_altmetrics (QAC-T-9)
  ...nfq(
    'results_kp_altmetrics',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_kp_altmetrics', IDENTITY, 'result_kp_altmetrics_id'),
  ...nfq('results_kp_altmetrics', FK_PARENT, 'result_knowledge_product_id'),
  ...nfq(
    'results_kp_altmetrics',
    'Altmetric counters / refresh date, not shown in the 2026 form (inventory 2026-A §7: the numeric score is not displayed)',
    'cited_by_posts',
    'cited_by_delicious',
    'cited_by_facebook_pages',
    'cited_by_blogs',
    'cited_by_forum_users',
    'cited_by_google_plus_users',
    'cited_by_linkedin_users',
    'cited_by_news_outlets',
    'cited_by_peer_review_sites',
    'cited_by_pinterest_users',
    'cited_by_policies',
    'cited_by_stack_exchange_resources',
    'cited_by_reddit_users',
    'cited_by_research_highlight_platforms',
    'cited_by_twitter_users',
    'cited_by_youtube_channels',
    'cited_by_weibo_users',
    'cited_by_wikipedia_pages',
    'last_updated',
  ),

  // results_kp_fair_scores (QAC-T-9)
  ...nfq(
    'results_kp_fair_scores',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_kp_fair_scores', IDENTITY, 'results_kp_fair_score_id'),
  ...nfq('results_kp_fair_scores', FK_PARENT, 'result_knowledge_product_id'),
  ...nfq(
    'results_kp_fair_scores',
    'baseline rows (is_baseline = 1) are not shown in the form (inventory 2026-A §7); used only as a binding filter',
    'is_baseline',
  ),

  // result_initiative_budget (QAC-T-9)
  ...nfq(
    'result_initiative_budget',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_initiative_budget', IDENTITY, 'result_initiative_budget_id'),
  ...nfq('result_initiative_budget', FK_PARENT, 'result_initiative_id'),
  ...nfq(
    'result_initiative_budget',
    'no control in the 2026 form (single total, kind_cash); inventory 2026-A §7',
    'current_year',
    'next_year',
  ),

  // result_institutions_budget (QAC-T-9)
  ...nfq(
    'result_institutions_budget',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'result_institutions_budget',
    IDENTITY,
    'result_institutions_budget_id',
  ),
  ...nfq('result_institutions_budget', FK_PARENT, 'result_institution_id'),
  ...nfq(
    'result_institutions_budget',
    'no control in the 2026 form (single total, kind_cash); inventory 2026-A §7',
    'in_kind',
    'in_cash',
  ),

  // non_pooled_projetct_budget (QAC-T-9; table name does not match the guard's result-table pattern, scope is the only gate)
  ...nfq(
    'non_pooled_projetct_budget',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'non_pooled_projetct_budget',
    IDENTITY,
    'non_pooled_projetct_budget_id',
  ),
  ...nfq('non_pooled_projetct_budget', FK_PARENT, 'result_project_id'),
  ...nfq('non_pooled_projetct_budget', LEGACY, 'non_pooled_projetct_id'),
  ...nfq(
    'non_pooled_projetct_budget',
    'no control in the 2026 form (single total, kind_cash); inventory 2026-A §7',
    'in_kind',
    'in_cash',
  ),

  // result_answers (QAC-T-9; is_active and answer_boolean are covered as binding filters)
  ...nfq(
    'result_answers',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_answers', IDENTITY, 'result_answer_id'),

  // results_policy_changes (QAC-T-10)
  ...nfq(
    'results_policy_changes',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_policy_changes', IDENTITY, 'result_policy_change_id'),
  ...nfq(
    'results_policy_changes',
    'foreign key to the result (one row per result), the binding key of the whole table, not form data',
    'result_id',
  ),
  ...nfq(
    'results_policy_changes',
    "legacy P22 'Links to results' flags; the section is absent from the P25 form",
    'linked_innovation_dev',
    'linked_innovation_use',
  ),
  ...nfq(
    'results_policy_changes',
    "control commented out of the 2026 form (PC:70-74, 'engagement activity or event'; kept for future use)",
    'result_related_engagement',
  ),

  // results_innovations_use (QAC-T-10)
  ...nfq(
    'results_innovations_use',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_innovations_use', IDENTITY, 'result_innovation_use_id'),
  ...nfq(
    'results_innovations_use',
    'foreign key to the result (one row per result), the binding key of the whole table, not form data',
    'results_id',
  ),

  // result_actors (QAC-T-10; is_active and section_id are covered as binding filters, result_actors_id as the list value)
  ...nfq(
    'result_actors',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),

  // results_by_institution_type (QAC-T-10; is_active, section_id and institution_roles_id are covered as binding filters)
  ...nfq(
    'results_by_institution_type',
    AUDIT,
    'created_by',
    'creation_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('results_by_institution_type', IDENTITY, 'id'),

  // result_ip_measure (QAC-T-10; is_active and section_id are covered as binding filters)
  ...nfq(
    'result_ip_measure',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_ip_measure', IDENTITY, 'result_ip_measure_id'),

  // result_innovation_package (QAC-T-11; is_active is not in a filter here, so it is listed)
  ...nfq(
    'result_innovation_package',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'result_innovation_package',
    'primary key = the package result id (one row per result), the binding key of the whole table, not form data',
    'result_innovation_package_id',
  ),

  // result_by_innovation_package (QAC-T-11; is_active, ipsr_role_id, result_innovation_package_id, result_id and
  // result_by_innovation_package_id are covered as binding filter / fk / values)
  ...nfq(
    'result_by_innovation_package',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),

  // result_ip_eoi_outcomes (QAC-T-11)
  ...nfq(
    'result_ip_eoi_outcomes',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_ip_eoi_outcomes', IDENTITY, 'result_ip_eoi_outcome_id'),
  ...nfq(
    'result_ip_eoi_outcomes',
    FK_PARENT,
    'result_by_innovation_package_id',
  ),

  // result_ip_expert_workshop_organized (QAC-T-11; is_active and result_ip_expert_workshop_organized_id are covered)
  ...nfq(
    'result_ip_expert_workshop_organized',
    AUDIT,
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),

  // results_complementary_innovation (QAC-T-11)
  ...nfq(
    'results_complementary_innovation',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_complementary_innovation',
    IDENTITY,
    'result_complementary_innovation_id',
  ),
  ...nfq(
    'results_complementary_innovation',
    'foreign key to the child complementary result (2-hop through result_by_innovation_package); not form data',
    'result_id',
  ),

  // results_complementary_innovations_function (QAC-T-11)
  ...nfq(
    'results_complementary_innovations_function',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_complementary_innovations_function',
    IDENTITY,
    'results_complementary_innovations_function_id',
  ),
  ...nfq(
    'results_complementary_innovations_function',
    FK_PARENT,
    'result_complementary_innovation_id',
  ),

  // results_innovatio_packages_enabler_type (QAC-T-11)
  ...nfq(
    'results_innovatio_packages_enabler_type',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq(
    'results_innovatio_packages_enabler_type',
    IDENTITY,
    'results_innovatio_packages_enabler_type_id',
  ),
  ...nfq(
    'results_innovatio_packages_enabler_type',
    FK_PARENT,
    'result_by_innovation_package_id',
  ),

  // result_ip_result_actors (QAC-T-11)
  ...nfq(
    'result_ip_result_actors',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_ip_result_actors', IDENTITY, 'result_ip_actors_id'),
  ...nfq('result_ip_result_actors', FK_PARENT, 'result_ip_result_id'),

  // result_ip_result_institution_types (QAC-T-11)
  ...nfq(
    'result_ip_result_institution_types',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_ip_result_institution_types', IDENTITY, 'id'),
  ...nfq(
    'result_ip_result_institution_types',
    FK_PARENT,
    'result_ip_results_id',
  ),
  ...nfq(
    'result_ip_result_institution_types',
    DISCRIMINATOR,
    'institution_roles_id',
  ),

  // result_ip_result_measures (QAC-T-11)
  ...nfq(
    'result_ip_result_measures',
    AUDIT,
    'is_active',
    'created_by',
    'created_date',
    'last_updated_by',
    'last_updated_date',
  ),
  ...nfq('result_ip_result_measures', IDENTITY, 'result_ip_result_measures_id'),
  ...nfq('result_ip_result_measures', FK_PARENT, 'result_ip_result_id'),
];
