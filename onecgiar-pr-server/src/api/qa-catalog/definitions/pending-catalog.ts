// @akili-spec quality-assurance/qa-field-catalog
import { PendingCatalogEntry } from './types';

/**
 * DD-11 / QAC-R-11: columns of in-scope tables that are FOR QA but not yet catalogued (stage 2).
 * Distinct from NOT_FOR_QA (never for QA). The completeness guard subtracts this list; every entry
 * names an existing column of an in-scope table and carries a reason. A column shared with a
 * catalogued field may also appear here (reason names the uncatalogued field that shares it).
 *
 * Reasons: `optional — stage 2` = no live validation rule, optional in the 2026 form (REVIEW §4);
 * `D2` = the binding needs a hop through a parent row (or an entity-less table), which the current
 * StorageBinding cannot express; deferred by the owner (REVIEW §7), the model is not changed.
 *
 * T-1 (knowledge product) rows stored in results_kp_* child tables and the estimates_* budget rows
 * (result_initiative_budget / non_pooled_projetct_budget / result_institutions_budget) are 2-hop: their tables are in scope and every
 * remaining column is listed here with `twoHop(...)` (or `stage2(...)`), naming the field it serves.
 *
 * Common-section fields that own no column of their own, so no entry can name them:
 *  - `contributors.other_contributors` (read-only view of other programs' ToC rows).
 *
 * Known gap (QAC-T-11, REVIEW D1 + D2): the IPSR step 3 evidence lists live in `result_ip_step_three_evidence`, a table
 * created by migration 1790347604000-IpsrStepThreeEvidence and used with raw SQL (evidences.repository.ts); it has NO
 * TypeORM entity, so the completeness guard cannot see it and no entry here can name its columns. An entity is not
 * created (D2: the approved model is not changed). The deferred keys are `ipsr_step_3.core.readiness_evidences`,
 * `ipsr_step_3.core.use_evidences`, `ipsr_step_3.complementary_components.readiness_evidences` and
 * `ipsr_step_3.complementary_components.use_evidences`, each with its 11 sub-keys (4 lists + 44 sub-keys; the 22
 * sub-keys of the core lists plus the 22 of the complementary lists, which need two levels of nesting, D1).
 * `evidence` and `evidence_sharepoint` (in scope since QAC-T-8) hold the shared columns of those items.
 * The step 2.2 rows (`ipsr_step_2_2.*`, admin-only tab) are deferred by REVIEW D19.
 */
const stage2 = (
  table: string,
  field: string,
  ...columns: string[]
): PendingCatalogEntry[] =>
  columns.map((column) => ({
    table,
    column,
    reason: `${field} — optional — stage 2`,
  }));

const twoHop = (
  table: string,
  field: string,
  ...columns: string[]
): PendingCatalogEntry[] =>
  columns.map((column) => ({
    table,
    column,
    reason: `${field} — required/for QA but 2-hop binding (through a parent row), deferred (REVIEW D2)`,
  }));

/** Required/for QA but stored behind the entity-less step 3 evidence table and two nesting levels (REVIEW D1 + D2). */
const evidenceD1D2 = (
  table: string,
  field: string,
  ...columns: string[]
): PendingCatalogEntry[] =>
  columns.map((column) => ({
    table,
    column,
    reason: `${field} — for QA but the step 3 evidence list is deferred (REVIEW D1 + D2: entity-less table, two nesting levels)`,
  }));

/** Retired from the 2026 form but kept for QA of earlier phases: catalogued in a 2025 load. */
const legacy2025 = (
  table: string,
  field: string,
  ...columns: string[]
): PendingCatalogEntry[] =>
  columns.map((column) => ({
    table,
    column,
    reason: `${field} — not on the 2026 form, for a 2025 load — stage 2`,
  }));

export const PENDING_CATALOG: PendingCatalogEntry[] = [
  // C-2 ToC alignment
  ...twoHop(
    'results_toc_result_indicators',
    'toc.entries.indicator',
    'toc_results_indicator_id',
    'results_toc_results_id',
  ),
  ...twoHop(
    'result_indicators_targets',
    'toc.entries.contribution_to_target',
    'result_toc_result_indicator_id',
    'contributing_indicator',
  ),

  // C-3 Contributors & partners
  ...stage2('results_center', 'contributors.centers.from_toc', 'from_toc'),
  ...stage2(
    'results_center',
    'results_center.from_cgspace (KP lock tooltip)',
    'from_cgspace',
  ),
  ...stage2(
    'results_by_projects',
    'results_by_projects.contribution_percentage (stored, no control; P2-3760)',
    'contribution_percentage',
  ),
  ...stage2(
    'results_by_inititiative',
    'contributors.science_programs.from_toc',
    'from_toc',
  ),
  ...stage2(
    'results_by_inititiative',
    'contributors.science_programs (shares the submitter binding, role 2)',
    'inititiative_id',
  ),
  ...stage2(
    'results_by_institution',
    'partners.external_partners.from_toc',
    'from_toc',
  ),
  ...stage2(
    'results_by_institution',
    'partners.kp_author_affiliations and partners.kp_author_affiliations.clarisa_partner (KP only; shares the external partners binding)',
    'institutions_id',
  ),
  ...twoHop(
    'result_by_institutions_by_deliveries_type',
    'partners.external_partners.roles, partners.kp_author_affiliations.roles and ipsr_step_1.scaling_partners.partner_role',
    'partner_delivery_type_id',
    'result_by_institution_id',
  ),

  // C-4 Geographic location
  ...twoHop(
    'result_country_subnational',
    'geo.subnational, geo.extra_subnational and ipsr_step_1.countries.sub_national',
    'result_country_id',
    'clarisa_subnational_scope_code',
  ),

  // C-5 Evidence
  ...stage2('evidence', 'evidence.items.description', 'description'),
  ...stage2('evidence', 'evidence.items.source', 'is_sharepoint'),
  ...stage2(
    'evidence',
    'evidence.items.innovation_use_related',
    'innovation_use_related',
  ),
  ...stage2(
    'evidence',
    'evidence.items.policy_change_related',
    'policy_change_related',
  ),
  ...stage2(
    'evidence',
    'evidence.items.capacity_sharing_related',
    'capacity_sharing_related',
  ),
  ...stage2(
    'evidence',
    'evidence.items.other_output_related',
    'other_output_related',
  ),
  ...stage2(
    'evidence',
    'evidence.items.other_outcome_related',
    'other_outcome_related',
  ),
  ...stage2(
    'evidence',
    'evidence.items.knowledge_product_related_flag',
    'knowledge_product_metadata_related',
  ),
  {
    table: 'evidence',
    column: 'is_supplementary',
    reason:
      'evidence.is_supplementary — validated by the live function but no control in the form; for QA, not yet described (REVIEW D22); currently a binding filter',
  },
  ...twoHop(
    'evidence_sharepoint',
    'evidence.items.is_public_file and evidence.items.file',
    'evidence_id',
    'document_id',
    'file_name',
    'folder_path',
    'is_public_file',
  ),

  // C-6 Linked results
  ...stage2('linked_result', 'linked.results.legacy_link', 'legacy_link'),

  // T-1 Knowledge product (QAC-T-9): the FAIR scores are stored per field in results_kp_fair_scores
  // (reached through results_knowledge_product, D2); these four denormalised columns hold the same values.
  ...twoHop(
    'results_knowledge_product',
    'knowledge_product.fair (FAIR score, read-only; denormalised columns of results_kp_fair_scores)',
    'findable',
    'accesible',
    'interoperable',
    'reusable',
  ),

  // T-1 Knowledge product (QAC-T-9): rows stored in results_kp_* child tables, reached through
  // results_knowledge_product (2-hop, D2).
  ...twoHop(
    'results_kp_metadata',
    'knowledge_product.is_isi_cg|is_isi_wos',
    'is_isi',
  ),
  ...twoHop(
    'results_kp_metadata',
    'knowledge_product.accessibility_cg|accessibility_wos',
    'accesibility',
    'open_access',
  ),
  ...twoHop(
    'results_kp_metadata',
    'knowledge_product.issue_date_cg|issue_date_wos',
    'year',
  ),
  ...twoHop(
    'results_kp_metadata',
    'knowledge_product.online_date',
    'online_year',
  ),
  ...twoHop('results_kp_metadata', 'knowledge_product.doi', 'doi'),
  ...twoHop(
    'results_kp_metadata',
    'knowledge_product.peer_reviewed_cg|peer_reviewed_wos',
    'is_peer_reviewed',
  ),
  ...stage2(
    'results_kp_metadata',
    'knowledge_product.source (repository of the metadata row, inventory 2026-A §7)',
    'source',
  ),
  ...twoHop('results_kp_authors', 'knowledge_product.authors', 'author_name'),
  ...stage2(
    'results_kp_authors',
    'knowledge_product.authors.orcid (inventory 2026-A §7)',
    'orcid',
  ),
  ...twoHop(
    'results_kp_keywords',
    'knowledge_product.keywords|agrovoc_keywords',
    'keyword',
    'is_agrovoc',
  ),
  ...twoHop(
    'results_kp_altmetrics',
    'knowledge_product.altmetric (details link and badge images)',
    'altmetric_id',
    'image_small',
    'image_medium',
    'image_large',
  ),
  ...stage2(
    'results_kp_altmetrics',
    'knowledge_product.altmetric.score|journal (inventory 2026-A §7)',
    'score',
    'journal',
  ),
  ...twoHop(
    'results_kp_fair_scores',
    'knowledge_product.fair (one row per FAIR field)',
    'fair_field_id',
    'fair_value',
  ),

  // T-3 Innovation development (QAC-T-9): estimates budgets, reached through results_by_inititiative /
  // results_by_projects / results_by_institution (2-hop, D2).
  ...twoHop(
    'result_initiative_budget',
    'innovation_dev.estimates_pooled, innovation_use.investment.programs and ipsr_step_4.initiative_investment (kind_cash / is_determined)',
    'kind_cash',
    'is_determined',
  ),
  ...twoHop(
    'non_pooled_projetct_budget',
    'innovation_dev.estimates_non_pooled, innovation_use.investment.bilateral and ipsr_step_4.bilateral_investment (kind_cash / is_determined; the IPSR project picker `ipsr_step_4.bilateral_investment.project` also waits on D2)',
    'kind_cash',
    'is_determined',
  ),
  ...twoHop(
    'result_institutions_budget',
    'innovation_dev.estimates_partners, innovation_use.investment.partners and ipsr_step_4.partner_investment (kind_cash / is_determined)',
    'kind_cash',
    'is_determined',
  ),

  // Policy change (QAC-T-10): optional rows (UI [required]=false, no live rule)
  ...stage2('results_policy_changes', 'policy_change.usd_amount', 'amount'),
  ...stage2(
    'results_policy_changes',
    'policy_change.amount_status (hard-coded options, no FK)',
    'status_amount',
  ),
  ...stage2(
    'results_policy_changes',
    'policy_change.actors_influenced',
    'actors_influenced',
  ),

  // Innovation use (QAC-T-10)
  ...stage2(
    'results_innovations_use',
    'innovation_use.linked_result.has_innovation_link (same answer as linked.has_innovation_link; live function has the check commented out, REVIEW D15)',
    'has_innovation_link',
  ),
  ...legacy2025(
    'results_innovations_use',
    'scaling studies question (hidden for non-IPSR from 2026) and legacy male/female counters',
    'has_scaling_studies',
    'male_using',
    'female_using',
  ),
  ...stage2(
    'result_actors',
    'innovation_use.*.actors.age_disaggregation_not_available and youth_split_applied_by_system (2026-only, optional)',
    'age_disaggregation_not_available',
    'youth_split_applied_by_system',
  ),
  ...legacy2025(
    'result_actors',
    'legacy / other-type flags of the actors block (not on the 2026 form)',
    'has_women',
    'has_women_youth',
    'has_men',
    'has_men_youth',
    'addressing_demands',
  ),
  ...stage2(
    'results_by_institution_type',
    'innovation_use.*.organizations.graduate_students (shown only for institution type 50, optional)',
    'graduate_students',
  ),
  ...legacy2025(
    'results_by_institution_type',
    'legacy demand text (not on the 2026 form)',
    'addressing_demands',
  ),
  ...legacy2025(
    'result_ip_measure',
    'legacy demand text (not on the 2026 form)',
    'addressing_demands',
  ),
  ...stage2(
    'result_ip_measure',
    'IPSR step 1 / 3 measures (link to the innovation package row; QAC-T-11)',
    'result_ip_id',
  ),
  ...legacy2025(
    'result_scaling_study_urls',
    'scaling study URL list (retired in 2026, IUFT:682-690; REVIEW §4.2: every column pending)',
    'id',
    'result_innov_use_id',
    'result_innov_dev_id',
    'result_innov_package_id',
    'study_url',
    'is_active',
    'created_date',
    'created_by',
    'last_updated_by',
    'last_updated_date',
  ),

  // IPSR (QAC-T-11) · result_innovation_package
  ...stage2(
    'result_innovation_package',
    'ipsr_step_1.scaling_ambition_blurb (generated read-only text) and ipsr_step_1.participants_consent',
    'scaling_ambition_blurb',
    'participants_consent',
  ),
  ...stage2(
    'result_innovation_package',
    'IPSR publication state and PDF report (system columns, not on the 2026 form; inventory 2026-B §7.4)',
    'is_result_ip_published',
    'ipsr_pdf_report',
  ),
  ...legacy2025(
    'result_innovation_package',
    'IPSR step 1 experts / consensus / consultation, package-level evidence twins, step 4 expected-time and scaling studies (not on the 2026 form)',
    'experts_is_diverse',
    'is_not_diverse_justification',
    'consensus_initiative_work_package_id',
    'relevant_country_id',
    'regional_leadership_id',
    'regional_integrated_id',
    'active_backstopping_id',
    'use_level_evidence_based',
    'readiness_level_evidence_based',
    'initiative_expected_time',
    'initiative_unit_time_id',
    'bilateral_expected_time',
    'bilateral_unit_time_id',
    'partner_expected_time',
    'partner_unit_time_id',
    'has_scaling_studies',
  ),

  // IPSR (QAC-T-11) · result_by_innovation_package
  ...stage2(
    'result_by_innovation_package',
    'ipsr_step_3.complementary_components.readiness_level and .use_level (role 2 rows share the column with the core fields)',
    'readiness_level_evidence_based',
    'use_level_evidence_based',
  ),
  ...legacy2025(
    'result_by_innovation_package',
    "IPSR step 3 'Potential situation (12 months later)' (hidden from 2026, values still sent)",
    'potential_innovation_readiness_level',
    'potential_innovation_use_level',
  ),
  ...evidenceD1D2(
    'result_by_innovation_package',
    'ipsr_step_3.*.readiness_evidences / use_evidences (dual-written mirror of the first evidence item; the live validation_ipsr_step_three_P25 still tests it; inventory 2026-B §7.3 proposed NOT_FOR_QA, kept pending because the evidence list it mirrors is deferred)',
    'readinees_evidence_link',
    'use_evidence_link',
    'readiness_details_of_evidence',
    'use_details_of_evidence',
  ),

  // IPSR (QAC-T-11) · step 1 tables
  ...twoHop(
    'result_ip_eoi_outcomes',
    'ipsr_step_1.eoi_outcomes (required by the live function; reaches the package through result_by_innovation_package)',
    'toc_result_id',
  ),
  ...stage2(
    'result_ip_eoi_outcomes',
    'contributing_toc flag (not on the 2026 form)',
    'contributing_toc',
  ),
  ...stage2(
    'result_ip_expert_workshop_organized',
    'ipsr_step_1.workshop_facilitators.email',
    'email',
  ),
  ...stage2(
    'results_by_institution',
    'ipsr_step_1.scaling_partners (role 5; shares the external partners binding, optional)',
    'institutions_id',
  ),
  ...stage2(
    'evidence',
    'ipsr_step_1.workshop_participants_link (evidence type 5, optional; shares the evidence binding)',
    'link',
  ),

  // IPSR (QAC-T-11) · step 2.1 / 2.2 tables (child complementary result: 2-hop; step 2.2: admin-only, REVIEW D19)
  ...twoHop(
    'results_complementary_innovation',
    'ipsr_step_2_1.complementary_innovations.short_title|other_functions|projects_organizations_working_on_innovation|specify_projects_organizations (the child result hangs off result_by_innovation_package; title/description are columns of `result`)',
    'short_title',
    'other_funcions',
    'projects_organizations_working_on_innovation',
    'specify_projects_organizations',
  ),
  ...twoHop(
    'results_complementary_innovations_function',
    'ipsr_step_2_1.complementary_innovations.functions',
    'complementary_innovation_function_id',
  ),
  ...stage2(
    'results_innovatio_packages_enabler_type',
    'ipsr_step_2_2.enabler_elements.enabler_type_level_1 and .enabler_type_level_2 (admin-only tab deferred by REVIEW D19, stage 2; no live rule; also 2-hop, REVIEW D2)',
    'complementary_innovation_enable_type_id',
  ),

  // IPSR (QAC-T-11) · step 3 current use of the core innovation (reaches the package through result_by_innovation_package)
  ...twoHop(
    'result_ip_result_actors',
    'ipsr_step_3.core.current_use.actors and its sub-keys',
    'women',
    'women_youth',
    'men',
    'men_youth',
    'actor_type_id',
    'other_actor_type',
    'evidence_link',
    'sex_and_age_disaggregation',
    'how_many',
  ),
  ...twoHop(
    'result_ip_result_institution_types',
    'ipsr_step_3.core.current_use.organizations and its sub-keys',
    'how_many',
    'institution_types_id',
    'evidence_link',
    'other_institution',
    'graduate_students',
  ),
  ...twoHop(
    'result_ip_result_measures',
    'ipsr_step_3.core.current_use.measures and its sub-keys',
    'unit_of_measure',
    'quantity',
    'evidence_link',
  ),
];
