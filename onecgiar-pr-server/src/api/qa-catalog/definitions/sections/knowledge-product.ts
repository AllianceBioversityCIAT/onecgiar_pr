// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-9 · inventory 2026-A §5 T-1 (`knowledge_product`, page KPI). Keys frozen as written in the inventory.
// Stage 1 per DD-11 + D17 (read-only fields enter stage 1 as read-only values). The model has no read-only
// flag; the read-only nature is recorded in comments only (a `description` is form help text, QAC-R-11). Only rows stored in `results_knowledge_product`
// (one row per result, keyed by `results_id`) are catalogued here.
// QAC-T-22: the read-only metadata the page shows from CGSpace / WoS / Altmetric (KPI = knowledge-product-info.component.html) is catalogued
// with PATH bindings (result -> results_knowledge_product -> results_kp_* child row). The page prints a "(CGSpace)" variant and a "(WoS)" /
// "(Unpaywall)" variant of several values; storage keeps both in `results_kp_metadata`, one row per `source`, so each variant is its own field:
//  - the CGSpace variant reads the FIRST active metadata row (`result_kp_metadata_id` asc), the one the server maps as `metadataCG`
//    (results-knowledge-products.mapper.ts:432-445, `metadata[0]`); its `source` is the repository name (CGSpace, MELSpace, WorldFish DSpace),
//    which varies, so it is not filtered on;
//  - the WoS variant reads the row whose `source` is 'WOS' (the same discriminator the KP export uses, results-knowledge-products.repository.ts:192).
// The form paints the WoS inputs only when a WoS row exists (KPI.html:73-79,96-102,117-123,143-149; knowledge-product-metadata.mapper.ts:123-125
// reads WoS only for a Journal Article with a DOI) and the CGSpace inputs of a non-journal type only when the record's issue year is the phase
// year (mapper :127-131); that is display gating on stored data and is not a catalog condition.
// The repository row's `source` is catalogued as `knowledge_product.repository` (the form prints it in the "(<source>)" labels and alerts,
// KPI.html:5-6,63,69,92,108,131). `results_kp_authors.orcid` and `results_kp_altmetrics.journal` are not shown and stay PENDING_CATALOG.
// Read-only fields: no help text in the form, `required: false`, unconfirmed. The function V-KP:15-17 does ask, for a journal article, for a
// non-blank ISI status and accessibility (`valid_text(is_isi)` and `valid_text(accesibility)` of the repository row); the type test is a LIKE
// pattern on free text that `required_when` cannot express, so they stay optional (contract known gap 16).
// `knowledge_product.references` ("Reference to other knowledge products", KPI.html:168) has NO storage: the server returns a constant null
// (results-knowledge-products.mapper.ts:388 `references_other_knowledge_products = null`), so it is not catalogued (nothing to bind).
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  PathBinding,
  PathStep,
} from '../types';
import { FROM_2026, whenEq } from './shared';

export const KNOWLEDGE_PRODUCT_SECTION: CatalogSection = {
  key: 'knowledge_product',
  label: 'Knowledge product',
  order: 50,
  result_types: ['knowledge_product'],
  ...FROM_2026,
};

const SECTION = KNOWLEDGE_PRODUCT_SECTION.key;
const TABLE = 'results_knowledge_product';
const TYPES = ['knowledge_product'];

// Read-only display (synced from the repository, not typed by the reporter; the form has no help text for these,
// so they carry no `description` and the read-only nature stays here): no live rule, optional, not confirmed (REVIEW D12 b, D17).
const readOnlyText = (
  key: string,
  label: string,
  order: number,
  column: string,
): CatalogField => ({
  key,
  label,
  type: 'text',
  section: SECTION,
  order,
  result_types: TYPES,
  required: false,
  required_confirmed: false,
  ...FROM_2026,
  storage: { kind: 'column', table: TABLE, column },
});

/** `result -> results_knowledge_product` (one active row per result). */
const KP_ROW: PathStep = {
  table: TABLE,
  join: [{ from: 'id', to: 'results_id' }],
  filter: { is_active: 1 },
};

/** `results_knowledge_product -> <child table>` on `result_knowledge_product_id`. */
const kpChild = (
  table: string,
  filter: PathStep['filter'],
  pick?: PathStep['pick'],
): PathStep => ({
  table,
  join: [
    { from: 'result_knowledge_product_id', to: 'result_knowledge_product_id' },
  ],
  filter,
  ...(pick ? { pick } : {}),
});

/** The CGSpace (repository) metadata row: the first active one, as the server reads `metadataCG`. */
const CG_ROW = kpChild(
  'results_kp_metadata',
  { is_active: 1 },
  { order_by: 'result_kp_metadata_id', direction: 'asc' },
);
/** The Web of Science metadata row. */
const WOS_ROW = kpChild('results_kp_metadata', { is_active: 1, source: 'WOS' });

const metadata = (
  step: PathStep,
  value_column: string,
  columns?: string[],
): PathBinding => ({
  kind: 'path',
  steps: [KP_ROW, step],
  value_column,
  ...(columns ? { columns } : {}),
});

/** A read-only value of the metadata row (no help text, optional, unconfirmed). */
const metadataField = (
  key: string,
  label: string,
  type: CatalogField['type'],
  order: number,
  storage: PathBinding,
): CatalogField => ({
  key,
  label,
  type,
  section: SECTION,
  order,
  result_types: TYPES,
  required: false,
  required_confirmed: false,
  ...FROM_2026,
  storage,
});

/** A read-only list of strings (authors, keywords): one element per stored row, its text as the single subfield. */
const textList = (
  key: string,
  label: string,
  order: number,
  table: string,
  filter: PathStep['filter'],
  column: string,
  subfieldKey: string,
  subfieldLabel: string,
): CatalogField => ({
  key,
  label,
  type: 'list',
  section: SECTION,
  order,
  result_types: TYPES,
  required: false,
  required_confirmed: false,
  ...FROM_2026,
  storage: {
    kind: 'path',
    steps: [KP_ROW, kpChild(table, filter)],
    value_column: column,
  },
  subfields: [
    {
      key: subfieldKey,
      label: subfieldLabel,
      type: 'text',
      storage: { kind: 'column', table, column },
    },
  ],
});

/** Text of a FAIR field (`fair_fields`, reference data) of the score row's `fair_field_id`. */
const fairFieldText = (
  key: string,
  label: string,
  value_column: string,
): CatalogSubField => ({
  key,
  label,
  type: 'text',
  storage: {
    kind: 'lookup',
    source: 'prms.fair_fields',
    keys: [{ from: 'fair_field_id', to: 'fair_field_id' }],
    value_column,
  },
});

export const KNOWLEDGE_PRODUCT_FIELDS: CatalogField[] = [
  {
    key: 'knowledge_product.is_melia',
    label: 'Is this knowledge product a MELIA Product?',
    type: 'boolean',
    section: SECTION,
    order: 1,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'is_melia' },
  },
  {
    key: 'knowledge_product.melia_previous_submitted',
    label: 'Do you have a MELIA study planned in your TOC?',
    type: 'boolean',
    section: SECTION,
    order: 2,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('knowledge_product.is_melia', true),
    // QAC-T-25: shown only for a MELIA product (knowledge-product-info.component.html:20 `*ngIf isMeliaProduct === true`); same gate as required_when.
    visible_when: whenEq('knowledge_product.is_melia', true),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: TABLE,
      column: 'melia_previous_submitted',
    },
  },
  {
    key: 'knowledge_product.melia_type',
    label: 'Select MELIA type',
    type: 'single_select',
    control_list: 'melia_types',
    section: SECTION,
    order: 3,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    // The function also takes this branch when `melia_previous_submitted` is NULL; the model has no
    // "is null" operator, so the condition is the explicit "No" answer.
    required_when: {
      all: [
        whenEq('knowledge_product.is_melia', true),
        whenEq('knowledge_product.melia_previous_submitted', false),
      ],
    },
    // QAC-T-25: same gate as required_when (knowledge-product-info.component.html:33, `*ngIf ostSubmitted === false`, inside the isMeliaProduct block :20).
    visible_when: {
      all: [
        whenEq('knowledge_product.is_melia', true),
        whenEq('knowledge_product.melia_previous_submitted', false),
      ],
    },
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'melia_type_id' },
  },
  {
    key: 'knowledge_product.toc_melia_study',
    label:
      'Select the MELIA study from the drop-down (this drop-down is synced with your TOC)',
    type: 'single_select',
    control_list: 'toc_melia_studies',
    section: SECTION,
    order: 4,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: {
      all: [
        whenEq('knowledge_product.is_melia', true),
        whenEq('knowledge_product.melia_previous_submitted', true),
      ],
    },
    // QAC-T-25: same gate as required_when (knowledge-product-info.component.html:48, `*ngIf ostSubmitted === true`, inside the isMeliaProduct block :20).
    visible_when: {
      all: [
        whenEq('knowledge_product.is_melia', true),
        whenEq('knowledge_product.melia_previous_submitted', true),
      ],
    },
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'toc_melia_study_id' },
  },
  readOnlyText('knowledge_product.handle', 'Handle', 5, 'handle'),
  // Repository the record comes from: the `source` of the CGSpace row, printed in the "(<source>)" of the labels and in the two alerts
  // (KPI.html:5-6,11-12,63,69,92,108,131). The form has no label of its own for it, so the label is a plain "Repository".
  metadataField(
    'knowledge_product.repository',
    'Repository',
    'text',
    26,
    metadata(CG_ROW, 'source'),
  ),
  // KPI.html:61-66. QAC-T-25: the value is a YEAR (column `online_year`; the mapper keeps only the year, extractOnlyYearFromDateString), so the label says so.
  metadataField(
    'knowledge_product.online_date',
    'Date online (CGSpace) (year)',
    'number',
    6,
    metadata(CG_ROW, 'online_year'),
  ),
  // KPI.html:67-72: the stored `year`; when it is empty or 0 the server shows the online year instead (mapper `issue_year`, :426-427)
  metadataField(
    'knowledge_product.issue_date_cg',
    'Issue date (CGSpace) (year)',
    'number',
    7,
    metadata(CG_ROW, 'year'),
  ),
  // KPI.html:73-79
  metadataField(
    'knowledge_product.issue_date_wos',
    'Issue date (WoS) (year)',
    'number',
    8,
    metadata(WOS_ROW, 'year'),
  ),
  // KPI.html:81-86: chips, one per author (name only; the ORCID is stored but not shown)
  textList(
    'knowledge_product.authors',
    'Authors',
    9,
    'results_kp_authors',
    { is_active: 1 },
    'author_name',
    'name',
    'Author',
  ),
  readOnlyText(
    'knowledge_product.type',
    'Knowledge product type',
    10,
    'knowledge_product_type',
  ),
  // KPI.html:90-102
  metadataField(
    'knowledge_product.peer_reviewed_cg',
    'Peer reviewed (CGSpace)',
    'boolean',
    11,
    metadata(CG_ROW, 'is_peer_reviewed'),
  ),
  metadataField(
    'knowledge_product.peer_reviewed_wos',
    'Peer reviewed (WoS)',
    'boolean',
    12,
    metadata(WOS_ROW, 'is_peer_reviewed'),
  ),
  // KPI.html:106-123: ISI status ("Yes" / "No" / "Not provided"); V-KP:15-17 wants it non-blank for a journal article (synced, not typed)
  metadataField(
    'knowledge_product.is_isi_cg',
    'Web of Science Core Collection (former ISI) (CGSpace)',
    'boolean',
    13,
    metadata(CG_ROW, 'is_isi'),
  ),
  metadataField(
    'knowledge_product.is_isi_wos',
    'Web of Science Core Collection (former ISI) (WoS)',
    'boolean',
    14,
    metadata(WOS_ROW, 'is_isi'),
  ),
  // KPI.html:126: the CGSpace row's DOI (not `results_knowledge_product.doi`, REVIEW A-14)
  metadataField(
    'knowledge_product.doi',
    'DOI',
    'text',
    15,
    metadata(CG_ROW, 'doi'),
  ),
  // KPI.html:129-142: CGSpace shows `open_access` when it is stored, else "Open Access" / "Limited Access" derived from `accesibility`
  // (knowledge-product-metadata.mapper.ts:61-67), so both stored values are subfields of one object (the repository row). The live
  // function checks `valid_text(accesibility)` for a journal article (V-KP:15-17). The WoS variant shows only `accesibility`
  // (mapper :76), so it stays a single text value.
  {
    key: 'knowledge_product.accessibility_cg',
    label: 'Accessibility (CGSpace)',
    type: 'object',
    section: SECTION,
    order: 16,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: metadata(CG_ROW, 'open_access'),
    subfields: [
      {
        key: 'open_access',
        label: 'Open access',
        type: 'text',
        storage: {
          kind: 'column',
          table: 'results_kp_metadata',
          column: 'open_access',
        },
      },
      {
        key: 'accessibility',
        label: 'Accessibility',
        type: 'text',
        storage: {
          kind: 'column',
          table: 'results_kp_metadata',
          column: 'accesibility',
        },
      },
    ],
  },
  metadataField(
    'knowledge_product.accessibility_wos',
    'Accessibility (Unpaywall)',
    'text',
    17,
    metadata(WOS_ROW, 'accesibility'),
  ),
  readOnlyText('knowledge_product.licence', 'License', 18, 'licence'),
  // KPI.html:153-154: the page prints each set joined with "; " (mapper :102-103); stored one row per keyword (`is_agrovoc` splits the sets)
  textList(
    'knowledge_product.keywords',
    'Keywords',
    19,
    'results_kp_keywords',
    { is_active: 1, is_agrovoc: 0 },
    'keyword',
    'keyword',
    'Keyword',
  ),
  textList(
    'knowledge_product.agrovoc_keywords',
    'AGROVOC Keywords',
    20,
    'results_kp_keywords',
    { is_active: 1, is_agrovoc: 1 },
    'keyword',
    'keyword',
    'Keyword',
  ),
  // The column name is misspelt in code (`comodity`); kept as is.
  readOnlyText('knowledge_product.commodity', 'Commodity', 21, 'comodity'),
  readOnlyText(
    'knowledge_product.sponsors',
    'Investors/Sponsors',
    22,
    'sponsors',
  ),
  {
    // KPI.html:157-167 (help text :159, the `<i>` tags dropped). The page shows the Altmetric badge image linked to the details page, or
    // "Not Available" (KPI.html:161-167,202-204). The badge is drawn from the score, so the numeric score is catalogued with it even though
    // the page does not print the number; the counters, the journal and the smaller image sizes are not shown (NOT_FOR_QA).
    key: 'knowledge_product.altmetric',
    label: 'Altmetric Attention Score',
    description:
      'The Altmetric Attention Score might vary over time. Before the end of the reporting period, this information will be automatically refreshed on this page to reflect the latest score.',
    type: 'object',
    section: SECTION,
    order: 23,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'path',
      steps: [KP_ROW, kpChild('results_kp_altmetrics', { is_active: 1 })],
      value_column: 'altmetric_id',
    },
    subfields: [
      {
        // the link target is built from the id: https://www.altmetric.com/details/<altmetric_id> (results-knowledge-products.mapper.ts:164)
        key: 'details_id',
        label: 'Altmetric details',
        type: 'text',
        storage: {
          kind: 'column',
          table: 'results_kp_altmetrics',
          column: 'altmetric_id',
        },
      },
      {
        key: 'score',
        label: 'Altmetric Attention Score',
        type: 'number',
        storage: {
          kind: 'column',
          table: 'results_kp_altmetrics',
          column: 'score',
        },
      },
      {
        // the badge: `image_large ?? image_medium ?? image_small` (mapper :164-168 / :458-461); the large one is the catalogued value
        key: 'badge_image',
        label: 'Altmetric badge',
        type: 'text',
        storage: {
          kind: 'column',
          table: 'results_kp_altmetrics',
          column: 'image_large',
        },
      },
    ],
  },
  {
    // KPI.html:171-200 (help text = `fairGuideline`, knowledge-product-info.component.ts:47-50: the link tag dropped, the repository name
    // falls back to "the repository", the form's own fallback, KPI.ts:47-49). One element per stored score row of the CURRENT scores (baseline
    // rows are not shown): the four dimension rings F, A, I, R (score x 100 as percent, KPI.html:180) and their checks F1..R1 (a check is
    // shown when the score is truthy, KPI.html:193-196; "name - description", :196). The dimension rows are those named F/A/I/R; the
    // `total` row is stored too but the page drops it (knowledge-product-metadata.mapper.ts:31-41), and the model cannot filter it out.
    key: 'knowledge_product.fair',
    label: 'FAIR score for this knowledge product',
    description:
      "FAIR (findability, accessibility, interoperability, and reusability) scores are used to support reporting that aligns with the CGIAR Open and FAIR Data Assets Policy. FAIR scores are calculated based on the presence or absence of metadata in the repository. If you wish to enhance the FAIR score for a knowledge product, review the metadata flagged with a red icon below and liaise with your Center's knowledge management team to implement improvements.",
    type: 'list',
    section: SECTION,
    order: 25,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'path',
      steps: [
        KP_ROW,
        kpChild('results_kp_fair_scores', { is_baseline: 0, is_active: 1 }),
      ],
      value_column: 'fair_field_id',
    },
    subfields: [
      {
        key: 'fair_field_id',
        label: 'FAIR field',
        type: 'number',
        storage: {
          kind: 'column',
          table: 'results_kp_fair_scores',
          column: 'fair_field_id',
        },
      },
      fairFieldText('name', 'FAIR indicator', 'short_name'),
      fairFieldText('description', 'Description', 'description'),
      {
        key: 'score',
        label: 'Score',
        type: 'number',
        storage: {
          kind: 'column',
          table: 'results_kp_fair_scores',
          column: 'fair_value',
        },
      },
    ],
  },
];
