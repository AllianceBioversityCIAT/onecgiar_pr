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
 * removed their entries. `partners.kp_author_affiliations` (and its `roles`) was catalogued by QAC-T-22 and
 * `ipsr_step_1.scaling_partners.partner_role` by QAC-T-28 (its columns are covered by the external partners role path).
 *
 * QAC-T-30 (2026.29): the IPSR step 3 evidence lists (`result_ip_step_three_evidence`, now an entity in scope), the current use of the core
 * innovation and the evidence-based levels of both element roles are catalogued; their entries were removed. The four legacy evidence columns of
 * `result_by_innovation_package` (`readinees_evidence_link`, `use_evidence_link`, `readiness_details_of_evidence`, `use_details_of_evidence`) stay
 * PENDING (leader decision): packages without link rows hold their only step 3 evidence there.
 * QAC-T-29: the step 2.1 modal fields and the step 2.2 enabler types (`ipsr_step_2_1.complementary_innovations.*`, `ipsr_step_2_2.enabler_elements.*`) are catalogued; no step 2 column is pending.
 */
/** Exported so the step 3 spec asserts the reason verbatim. */
export const LEGACY_STEP3_EVIDENCE_REASON =
  'ipsr_step_3.*.readiness_evidences / use_evidences — packages without step-3 link rows (saved before P2-3824, no backfill, migration 1790347604000:25-26; or carried over to a new phase, evidences.repository.ts:23-29) hold their only readiness/use evidence in this column; the form shows it as the first, "legacy" item (innovation-pathway-step-three.service.ts:1030-1050; ipsr-step3-evidence-list.component.html:97-101) and VS3:19-47, 231-264 validates it';

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

  // C-4 Geographic location (QAC-T-16: `geo.countries` / `geo.extra_countries` bind the `result_country_subnational` columns through their
  // `subnational` subfield; QAC-T-28: `ipsr_step_1.countries` does too, so the table has no pending entry left)

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
  // this list; QAC-T-20 binds the same columns again for innovation_use.investment.*. QAC-T-31 binds them a third time for
  // ipsr_step_4.*_investment (the IPSR step 4 tables).

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

  // IPSR (QAC-T-11) · result_by_innovation_package (QAC-T-30: the evidence-based levels are bound for both roles)
  // QAC-T-30 attempt 2: kept pending (leader decision), not NOT_FOR_QA: for those packages this column is the only evidence there is
  ...[
    'readinees_evidence_link',
    'use_evidence_link',
    'readiness_details_of_evidence',
    'use_details_of_evidence',
  ].map((column) => ({
    table: 'result_by_innovation_package',
    column,
    reason: LEGACY_STEP3_EVIDENCE_REASON,
  })),
  ...legacy2025(
    'result_by_innovation_package',
    "IPSR step 3 'Potential situation (12 months later)' (hidden from 2026, values still sent)",
    'potential_innovation_readiness_level',
    'potential_innovation_use_level',
  ),

  // IPSR (QAC-T-11) · step 1 tables (QAC-T-28: `ipsr_step_1.*` is fully catalogued; only the contributing_toc flag stays pending)
  ...stage2(
    'result_ip_eoi_outcomes',
    'contributing_toc flag (not on the 2026 form)',
    'contributing_toc',
  ),

  // IPSR step 2.1 / 2.2 tables: QAC-T-29 (2026.28) bound every column (results_complementary_innovation, its functions, the enabler types) and removed their entries
  // IPSR step 3 (QAC-T-30, 2026.29): the evidence links, the current use of the core innovation and the evidence-based levels are bound; what stays pending of step 3 is the legacy potential-situation pair and the four legacy single-link evidence columns above
];
