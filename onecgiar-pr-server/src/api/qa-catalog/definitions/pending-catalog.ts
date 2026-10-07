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
 * T-1 (knowledge product): the results_kp_* child tables are reached through `results_knowledge_product` (path bindings); QAC-T-22 bound
 * all of them except `results_kp_authors.orcid` and `results_kp_altmetrics.journal` (not shown, awaiting an owner decision). The estimates_* budget columns were bound by QAC-T-18 and removed.
 *
 * Common-section fields that own no column of their own, so no entry can name them:
 *  - `contributors.other_contributors` (read-only view of other programs' ToC rows): described by the subfields of
 *    `contributors.science_programs` since QAC-T-15 (each program carries its own planned answer and ToC mappings).
 *
 * QAC-T-15 (2026-10-07) bound the columns of the ToC mappings (`results_toc_result_indicators`, `result_indicators_targets`),
 * the centers and science-programs `from_toc` flags, and `result_by_institutions_by_deliveries_type` (partner roles) and
 * removed their entries. `partners.kp_author_affiliations` (and its `roles`) was catalogued by QAC-T-22; the still uncatalogued field
 * that reads the partner-role rows is `ipsr_step_1.scaling_partners.partner_role` (its columns are covered by the external partners role path).
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
  // C-3 Contributors & partners
  // `results_center.from_cgspace` was bound by QAC-T-22 (`from_cgspace` subfield of `contributors.centers` and `contributors.other_centers`).
  ...stage2(
    'results_by_projects',
    'results_by_projects.contribution_percentage (stored, no control; P2-3760)',
    'contribution_percentage',
  ),
  ...stage2(
    'results_by_institution',
    'partners.external_partners.from_toc',
    'from_toc',
  ),

  // C-4 Geographic location
  // QAC-T-16: `geo.countries` / `geo.extra_countries` now bind these columns (their `subnational` subfield); the entries stay only
  // for the still uncatalogued IPSR key, which shares them (a column shared with a catalogued field may appear here).
  ...twoHop(
    'result_country_subnational',
    'ipsr_step_1.countries.sub_national',
    'result_country_id',
    'clarisa_subnational_scope_code',
  ),

  // C-5 Evidence (QAC-T-17: description, source, the file fields and every flag column are bound by `evidence.items`;
  // evidence_sharepoint.document_id / folder_path moved to NOT_FOR_QA)
  {
    table: 'evidence',
    column: 'is_supplementary',
    reason:
      'evidence.is_supplementary — validated by the live function but no control in the form; for QA, not yet described (REVIEW D22); currently a binding filter',
  },

  // C-6 Linked results
  ...stage2('linked_result', 'linked.results.legacy_link', 'legacy_link'),

  // T-1 Knowledge product: QAC-T-22 bound the read-only CGSpace/WoS metadata, authors, keywords, Altmetric and FAIR columns (or classified
  // them NOT_FOR_QA). Two columns are not shown by the form and have no owner decision yet, so they wait here.
  ...stage2(
    'results_kp_authors',
    'knowledge_product.authors.orcid (not shown by the form, inventory 2026-A §7)',
    'orcid',
  ),
  ...stage2(
    'results_kp_altmetrics',
    'knowledge_product.altmetric.journal (not shown by the form, inventory 2026-A §7)',
    'journal',
  ),

  // Innovation development estimates budgets (result_initiative_budget / non_pooled_projetct_budget / result_institutions_budget):
  // `kind_cash` / `is_determined` were bound by QAC-T-18 (innovation_dev.estimates_pooled|non_pooled|partners, path bindings) and left
  // this list; QAC-T-20 binds the same columns again for innovation_use.investment.*. They still serve ipsr_step_4.*_investment (not
  // catalogued yet), covered by those bindings until that field is described.

  // Policy change: `amount`, `status_amount` and `actors_influenced` were bound by QAC-T-21 (policy_change.usd_amount|amount_status|actors_influenced) and left this list.

  // Innovation use (QAC-T-10)
  // QAC-T-20: `results_innovations_use.has_innovation_link` is bound by `innovation_use.linked_result.has_innovation_link` and left this list.
  ...legacy2025(
    'results_innovations_use',
    'scaling studies question (hidden for non-IPSR from 2026) and legacy male/female counters',
    'has_scaling_studies',
    'male_using',
    'female_using',
  ),
  // QAC-T-20: `result_actors.age_disaggregation_not_available` / `youth_split_applied_by_system` are bound as subfields of
  // `innovation_use.*.actors` and left this list.
  ...legacy2025(
    'result_actors',
    'legacy / other-type flags of the actors block (not on the 2026 form)',
    'has_women',
    'has_women_youth',
    'has_men',
    'has_men_youth',
    'addressing_demands',
  ),
  // QAC-T-20: `results_by_institution_type.graduate_students` is bound as a subfield of `innovation_use.*.organizations` and left this list.
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
