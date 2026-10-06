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
    'contributors.bilateral_projects',
    'result_id',
    'project_id',
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
    'partners.external_partners.roles and partners.kp_author_affiliations.roles',
    'partner_delivery_type_id',
    'result_by_institution_id',
  ),

  // C-4 Geographic location
  ...twoHop(
    'result_country_subnational',
    'geo.subnational and geo.extra_subnational',
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
    'innovation_dev.estimates_pooled (kind_cash / is_determined)',
    'kind_cash',
    'is_determined',
  ),
  ...twoHop(
    'non_pooled_projetct_budget',
    'innovation_dev.estimates_non_pooled (kind_cash / is_determined)',
    'kind_cash',
    'is_determined',
  ),
  ...twoHop(
    'result_institutions_budget',
    'innovation_dev.estimates_partners (kind_cash / is_determined)',
    'kind_cash',
    'is_determined',
  ),
];
