// @akili-spec quality-assurance/qa-field-catalog
import * as fs from 'fs';
import * as path from 'path';
import { getMetadataArgsStorage } from 'typeorm';
import { ResultIpStepThreeEvidence } from '../ipsr/innovation-pathway/entities/result-ip-step-three-evidence.entity';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CATALOG_SCOPE } from './definitions/scope';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { validateCatalogShape } from './definitions/shape-validator';
import {
  CatalogField,
  CatalogSubField,
  Condition,
  PathBinding,
  StorageBinding,
  SubFieldStorageBinding,
} from './definitions/types';

/**
 * QAC-T-30: IPSR step 3 (evidence-based assessment of the core innovation and of every complementary element). Expected values come
 * from the 2026 form (step-n3 components), the writer (innovation-pathway-step-three.service.ts, evidences.repository.ts) and the
 * live functions validation_ipsr_step_three_P25 (VS3) / validation_ipsr_step_one_P25 (VS1), not from the catalog under test.
 * `assertIpsrStep3` is the assertion function; the falsifiers run it on a MUTATED copy of the real catalog.
 */
const WORKSHOP = 'ipsr_step_1.is_expert_workshop_organized';
const ASSESSED = 'ipsr_step_3.assessed_during_workshop';
const COMPLEMENTARY = 'ipsr_step_3.complementary_components';

const get = (fields: CatalogField[], key: string): CatalogField => {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`missing field ${key}`);
  return f;
};
const sub = (
  f: { key: string; subfields?: CatalogSubField[] },
  key: string,
): CatalogSubField => {
  const s = f.subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`missing subfield ${f.key}/${key}`);
  return s;
};
const json = (v: unknown) => JSON.stringify(v);

const CURRENT_LEVEL_RULE: Condition = {
  all: [
    { field: WORKSHOP, operator: 'eq', value: true },
    { field: ASSESSED, operator: 'in', value: [1, 2] },
  ],
};
const LINK: Condition = {
  field: 'evidence_source',
  operator: 'eq',
  value: 0,
};
const UPLOAD: Condition = {
  field: 'evidence_source',
  operator: 'eq',
  value: 1,
};

// ---- Evidence items (S3E dialog) --------------------------------------------------------------
interface SubExpect {
  type: CatalogSubField['type'];
  required?: boolean;
  required_when?: Condition;
  visible_when?: Condition;
  control_list?: string;
  /** `column:<table>.<column>` or `path:<table>.<column>` (first and only step of the file row). */
  storage: string;
}

const EVIDENCE_ITEM: Array<[string, SubExpect]> = [
  [
    'evidence_source',
    {
      type: 'single_select',
      required: true,
      control_list: 'evidence_sources',
      storage: 'column:evidence.is_sharepoint',
    },
  ],
  [
    'link',
    {
      type: 'text',
      required_when: LINK,
      visible_when: LINK,
      storage: 'column:evidence.link',
    },
  ],
  [
    'is_public_file',
    {
      type: 'boolean',
      required_when: UPLOAD,
      visible_when: UPLOAD,
      storage: 'path:evidence_sharepoint.is_public_file',
    },
  ],
  [
    'file_name',
    {
      type: 'text',
      required_when: UPLOAD,
      visible_when: UPLOAD,
      storage: 'path:evidence_sharepoint.file_name',
    },
  ],
  [
    'file_url',
    {
      type: 'text',
      required_when: UPLOAD,
      visible_when: UPLOAD,
      storage: 'column:evidence.link',
    },
  ],
  [
    'gender_related',
    { type: 'boolean', storage: 'column:evidence.gender_related' },
  ],
  // the label "Climate adaptation and mitigation" is stored in the inherited column `youth_related`
  [
    'climate_related',
    { type: 'boolean', storage: 'column:evidence.youth_related' },
  ],
  [
    'nutrition_related',
    { type: 'boolean', storage: 'column:evidence.nutrition_related' },
  ],
  [
    'environmental_biodiversity_related',
    {
      type: 'boolean',
      storage: 'column:evidence.environmental_biodiversity_related',
    },
  ],
  [
    'poverty_related',
    { type: 'boolean', storage: 'column:evidence.poverty_related' },
  ],
  [
    'innovation_use_related',
    { type: 'boolean', storage: 'column:evidence.innovation_use_related' },
  ],
  ['description', { type: 'text', storage: 'column:evidence.description' }],
];

const storageId = (s: SubFieldStorageBinding | StorageBinding): string => {
  if (s.kind === 'column') return `column:${s.table}.${s.column}`;
  if (s.kind === 'path') {
    return `path:${s.steps[s.steps.length - 1].table}.${s.value_column}`;
  }
  return s.kind;
};

function assertSub(owner: string, s: CatalogSubField, e: SubExpect): void {
  const k = `${owner}/${s.key}`;
  if (s.type !== e.type) throw new Error(`${k}: type ${s.type} != ${e.type}`);
  if ((s.control_list ?? null) !== (e.control_list ?? null))
    throw new Error(`${k}: control_list`);
  if (Boolean(s.required) !== Boolean(e.required))
    throw new Error(`${k}: required must be ${Boolean(e.required)}`);
  if (json(s.required_when) !== json(e.required_when))
    throw new Error(`${k}: required_when`);
  if (json(s.visible_when) !== json(e.visible_when))
    throw new Error(`${k}: visible_when`);
  if (storageId(s.storage) !== e.storage)
    throw new Error(`${k}: storage ${storageId(s.storage)} != ${e.storage}`);
}

/** The evidence steps from the element row: ACTIVE link of the level -> ACTIVE evidence of type 7. */
const evidenceStepsOf = (level: string) => [
  {
    table: 'result_ip_step_three_evidence',
    join: [
      {
        from: 'result_by_innovation_package_id',
        to: 'result_by_innovation_package_id',
      },
    ],
    filter: { ipsr_evidence_level: level, is_active: 1 },
  },
  {
    table: 'evidence',
    join: [{ from: 'evidence_id', to: 'id' }],
    filter: { evidence_type_id: 7, is_active: 1 },
  },
];
const CORE_STEP = {
  table: 'result_by_innovation_package',
  join: [{ from: 'id', to: 'result_innovation_package_id' }],
  filter: { ipsr_role_id: 1, is_active: 1 },
};

function assertEvidenceList(
  owner: string,
  list: {
    subfields?: CatalogSubField[];
    storage: StorageBinding | SubFieldStorageBinding;
    type: string;
    visible_when?: Condition;
    required_when?: Condition;
  },
  level: string,
  fromCore: boolean,
): void {
  if (list.type !== 'list') throw new Error(`${owner}: must be a list`);
  const p = list.storage as PathBinding;
  const want = fromCore
    ? [CORE_STEP, ...evidenceStepsOf(level)]
    : evidenceStepsOf(level);
  if (
    p.kind !== 'path' ||
    json(p.steps) !== json(want) ||
    p.value_column !== 'id'
  )
    throw new Error(`${owner}: evidence binding is wrong (level ${level})`);
  // The level gate is NOT expressible (ids of the level lists are not the level numbers and differ by environment): stating one
  // would compare numbers with ids.
  if (list.visible_when || list.required_when)
    throw new Error(
      `${owner}: no level gate may be stated (level ids differ by environment, no "not" operator)`,
    );
  expect(list.subfields?.map((s) => s.key)).toEqual(
    EVIDENCE_ITEM.map(([k]) => k),
  );
  for (const [key, e] of EVIDENCE_ITEM)
    assertSub(owner, sub(list as any, key), e);
}

// ---- Current use of the core innovation -------------------------------------------------------
const ALWAYS = { required: true };
const DISAGG_OFF = {
  required_when: {
    field: 'sex_and_age_disaggregation',
    operator: 'eq',
    value: false,
  } as Condition,
  visible_when: {
    field: 'sex_and_age_disaggregation',
    operator: 'eq',
    value: false,
  } as Condition,
};
const eq = (field: string, value: number): Condition => ({
  field,
  operator: 'eq',
  value,
});

const USE_LISTS: Array<{
  key: string;
  table: string;
  to: string;
  filter: Record<string, number>;
  value: string;
  subs: Array<[string, SubExpect]>;
}> = [
  {
    key: 'ipsr_step_3.core.current_use.actors',
    table: 'result_ip_result_actors',
    to: 'result_ip_result_id',
    filter: { is_active: 1 },
    value: 'result_ip_actors_id',
    subs: [
      [
        'actor_type',
        {
          type: 'single_select',
          control_list: 'actor_types',
          ...ALWAYS,
          storage: 'column:result_ip_result_actors.actor_type_id',
        },
      ],
      [
        'other_actor_type',
        {
          type: 'text',
          required_when: eq('actor_type', 5),
          visible_when: eq('actor_type', 5),
          storage: 'column:result_ip_result_actors.other_actor_type',
        },
      ],
      [
        'sex_and_age_disaggregation',
        {
          type: 'boolean',
          storage: 'column:result_ip_result_actors.sex_and_age_disaggregation',
        },
      ],
      [
        'women',
        {
          type: 'number',
          ...DISAGG_OFF,
          storage: 'column:result_ip_result_actors.women',
        },
      ],
      [
        'women_youth',
        {
          type: 'number',
          ...DISAGG_OFF,
          storage: 'column:result_ip_result_actors.women_youth',
        },
      ],
      [
        'men',
        {
          type: 'number',
          ...DISAGG_OFF,
          storage: 'column:result_ip_result_actors.men',
        },
      ],
      [
        'men_youth',
        {
          type: 'number',
          ...DISAGG_OFF,
          storage: 'column:result_ip_result_actors.men_youth',
        },
      ],
      [
        'how_many',
        {
          type: 'number',
          required_when: {
            field: 'sex_and_age_disaggregation',
            operator: 'eq',
            value: true,
          },
          storage: 'column:result_ip_result_actors.how_many',
        },
      ],
      [
        'evidence_link',
        {
          type: 'text',
          ...ALWAYS,
          storage: 'column:result_ip_result_actors.evidence_link',
        },
      ],
    ],
  },
  {
    key: 'ipsr_step_3.core.current_use.organizations',
    table: 'result_ip_result_institution_types',
    to: 'result_ip_results_id',
    filter: { institution_roles_id: 6, is_active: 1 },
    value: 'institution_types_id',
    subs: [
      [
        'institution_type',
        {
          type: 'single_select',
          control_list: 'institution_types',
          ...ALWAYS,
          storage:
            'column:result_ip_result_institution_types.institution_types_id',
        },
      ],
      [
        'other_institution',
        {
          type: 'text',
          required_when: eq('institution_type', 78),
          visible_when: eq('institution_type', 78),
          storage:
            'column:result_ip_result_institution_types.other_institution',
        },
      ],
      [
        'how_many',
        {
          type: 'number',
          ...ALWAYS,
          storage: 'column:result_ip_result_institution_types.how_many',
        },
      ],
      [
        'graduate_students',
        {
          type: 'number',
          visible_when: eq('institution_type', 50),
          storage:
            'column:result_ip_result_institution_types.graduate_students',
        },
      ],
      [
        'evidence_link',
        {
          type: 'text',
          ...ALWAYS,
          storage: 'column:result_ip_result_institution_types.evidence_link',
        },
      ],
    ],
  },
  {
    key: 'ipsr_step_3.core.current_use.measures',
    table: 'result_ip_result_measures',
    to: 'result_ip_result_id',
    filter: { is_active: 1 },
    value: 'unit_of_measure',
    subs: [
      [
        'unit_of_measure',
        {
          type: 'text',
          ...ALWAYS,
          storage: 'column:result_ip_result_measures.unit_of_measure',
        },
      ],
      [
        'quantity',
        {
          type: 'number',
          ...ALWAYS,
          storage: 'column:result_ip_result_measures.quantity',
        },
      ],
      [
        'evidence_link',
        {
          type: 'text',
          ...ALWAYS,
          storage: 'column:result_ip_result_measures.evidence_link',
        },
      ],
    ],
  },
];

export function assertIpsrStep3(fields: CatalogField[]): void {
  // 1. workshop answer and current levels
  const assessed = get(fields, ASSESSED);
  if (
    json(assessed.visible_when) !==
    json({ field: WORKSHOP, operator: 'eq', value: true })
  )
    throw new Error(
      'assessed_during_workshop: visible only when a workshop was organized (S3:20-22)',
    );
  if (json(assessed.required_when) !== json(assessed.visible_when))
    throw new Error('assessed_during_workshop: required_when (VS1:121)');
  for (const k of [
    'ipsr_step_3.core.current_readiness_level',
    'ipsr_step_3.core.current_use_level',
  ]) {
    const f = get(fields, k);
    if (json(f.visible_when) !== json(CURRENT_LEVEL_RULE))
      throw new Error(
        `${k}: the table shows for the answers 1 and 2 (S3W:11-16)`,
      );
    if (json(f.required_when) !== json(CURRENT_LEVEL_RULE))
      throw new Error(
        `${k}: the form requires it for 1 and 2 (pr-select default required)`,
      );
    if (f.required || f.required_confirmed)
      throw new Error(
        `${k}: VS1 states only the answer 1, so it is not confirmed`,
      );
  }

  // 2. core evidence-based levels: both required by the form, the function states only "not both empty"
  for (const [k, col] of [
    ['ipsr_step_3.core.readiness_level', 'readiness_level_evidence_based'],
    ['ipsr_step_3.core.use_level', 'use_level_evidence_based'],
  ] as const) {
    const f = get(fields, k);
    if (!f.required)
      throw new Error(`${k}: the form requires it (S3:28-29,47-48)`);
    if (f.required_confirmed)
      throw new Error(
        `${k}: VS3:10-18 fails only when both are empty, so required_confirmed is false`,
      );
    const s = f.storage as any;
    if (
      s.table !== 'result_by_innovation_package' ||
      s.value_column !== col ||
      json(s.filter) !== json({ ipsr_role_id: 1, is_active: 1 })
    )
      throw new Error(`${k}: binding (core row, ${col})`);
  }

  // 3. core evidence lists
  for (const [k, level] of [
    ['ipsr_step_3.core.readiness_evidences', 'readiness'],
    ['ipsr_step_3.core.use_evidences', 'use'],
  ] as const) {
    const f = get(fields, k);
    if (f.required || !f.required_confirmed)
      throw new Error(
        `${k}: VS3 states the rule (level != 0), not expressible: required false, confirmed true`,
      );
    assertEvidenceList(k, f, level, true);
  }

  // 4. current use of the core innovation
  for (const u of USE_LISTS) {
    const f = get(fields, u.key);
    if (f.type !== 'list' || f.required || !f.required_confirmed)
      throw new Error(
        `${u.key}: list, any-of rule not expressible (required false, confirmed true)`,
      );
    if (f.visible_when || f.required_when)
      throw new Error(
        `${u.key}: the use-level-0 gate is not expressible (level ids differ by environment)`,
      );
    const want = [
      CORE_STEP,
      {
        table: u.table,
        join: [{ from: 'result_by_innovation_package_id', to: u.to }],
        filter: u.filter,
      },
    ];
    const p = f.storage as PathBinding;
    if (
      p.kind !== 'path' ||
      json(p.steps) !== json(want) ||
      p.value_column !== u.value
    )
      throw new Error(`${u.key}: binding (path through the core element)`);
    expect(f.subfields?.map((s) => s.key)).toEqual(u.subs.map(([k]) => k));
    for (const [key, e] of u.subs) assertSub(u.key, sub(f, key), e);
  }

  // 5. complementary elements
  const comp = get(fields, COMPLEMENTARY);
  const cs = comp.storage as any;
  if (
    cs.kind !== 'relation' ||
    cs.table !== 'result_by_innovation_package' ||
    json(cs.filter) !== json({ ipsr_role_id: 2, is_active: 1 })
  )
    throw new Error('complementary_components: role-2 rows');
  expect(comp.subfields?.map((s) => s.key)).toEqual([
    'current_readiness_level',
    'current_use_level',
    'readiness_level',
    'readiness_evidences',
    'use_level',
    'use_evidences',
  ]);
  for (const [k, col, list] of [
    [
      'current_readiness_level',
      'current_innovation_readiness_level',
      'readiness_levels',
    ],
    ['current_use_level', 'current_innovation_use_level', 'use_levels'],
  ] as const) {
    assertSub(COMPLEMENTARY, sub(comp, k), {
      type: 'single_select',
      control_list: list,
      required_when: CURRENT_LEVEL_RULE,
      visible_when: CURRENT_LEVEL_RULE,
      storage: `column:result_by_innovation_package.${col}`,
    });
  }
  for (const [k, col, list] of [
    ['readiness_level', 'readiness_level_evidence_based', 'readiness_levels'],
    ['use_level', 'use_level_evidence_based', 'use_levels'],
  ] as const) {
    assertSub(COMPLEMENTARY, sub(comp, k), {
      type: 'single_select',
      control_list: list,
      required: true,
      storage: `column:result_by_innovation_package.${col}`,
    });
  }
  assertEvidenceList(
    `${COMPLEMENTARY}/readiness_evidences`,
    sub(comp, 'readiness_evidences'),
    'readiness',
    false,
  );
  assertEvidenceList(
    `${COMPLEMENTARY}/use_evidences`,
    sub(comp, 'use_evidences'),
    'use',
    false,
  );
}

// ---- The entity mirrors the migration ---------------------------------------------------------
const MIGRATION = path.resolve(
  __dirname,
  '../../migrations/1790347604000-IpsrStepThreeEvidence.ts',
);

interface ColSpec {
  type: string;
  nullable: boolean;
  length?: number;
}
/** Columns of the CREATE TABLE statement of the migration, read from its source. */
function migrationColumns(): Record<string, ColSpec> {
  const src = fs.readFileSync(MIGRATION, 'utf8');
  const create = src.slice(src.indexOf('CREATE TABLE IF NOT EXISTS'));
  const out: Record<string, ColSpec> = {};
  const re =
    /\\`(\w+)\\` (bigint|varchar\((\d+)\)|tinyint|timestamp)( NOT NULL)?/g;
  for (const m of create.matchAll(re)) {
    out[m[1]] = {
      type: m[2].startsWith('varchar') ? 'varchar' : m[2],
      length: m[3] ? Number(m[3]) : undefined,
      nullable: !m[4],
    };
  }
  return out;
}

interface ColArgs {
  name: string;
  options: { type?: unknown; nullable?: boolean; length?: unknown };
}
function entityColumns(): ColArgs[] {
  return getMetadataArgsStorage()
    .columns.filter((c) => c.target === ResultIpStepThreeEvidence)
    .map((c) => ({
      name: (c.options.name ?? c.propertyName) as string,
      options: c.options,
    }));
}

export function assertEntityMirrorsMigration(
  cols: ColArgs[],
  migration: Record<string, ColSpec>,
): void {
  expect(cols.map((c) => c.name).sort()).toEqual(Object.keys(migration).sort());
  for (const c of cols) {
    const m = migration[c.name];
    if (c.options.type !== m.type)
      throw new Error(`${c.name}: type ${String(c.options.type)} != ${m.type}`);
    if (Boolean(c.options.nullable) !== m.nullable)
      throw new Error(`${c.name}: nullability`);
    if (m.length !== undefined && c.options.length !== m.length)
      throw new Error(
        `${c.name}: length ${String(c.options.length)} != ${m.length}`,
      );
  }
}

describe('QAC-T-30 IPSR step 3', () => {
  it('the real catalog satisfies the IPSR step-3 rules', () => {
    expect(() => assertIpsrStep3(CATALOG_FIELDS)).not.toThrow();
  });

  it('keeps the shape valid (paths through three tables, depth-2 lists, conditions on sibling subfields)', () => {
    const errors = validateCatalogShape({
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields: CATALOG_FIELDS,
      notForQa: NOT_FOR_QA,
      pendingCatalog: PENDING_CATALOG,
    } as any);
    expect(errors).toEqual([]);
  });

  it('keeps every frozen key and adds the planned keys of inventory 2026-B 3.7 verbatim', () => {
    const keys = CATALOG_FIELDS.map((f) => f.key);
    for (const k of [
      ASSESSED,
      'ipsr_step_3.core.current_readiness_level',
      'ipsr_step_3.core.current_use_level',
      'ipsr_step_3.core.readiness_level',
      'ipsr_step_3.core.use_level',
      COMPLEMENTARY,
      'ipsr_step_3.core.readiness_evidences',
      'ipsr_step_3.core.use_evidences',
      'ipsr_step_3.core.current_use.actors',
      'ipsr_step_3.core.current_use.organizations',
      'ipsr_step_3.core.current_use.measures',
    ])
      expect(keys).toContain(k);
    const comp = get(CATALOG_FIELDS, COMPLEMENTARY);
    for (const k of ['current_readiness_level', 'current_use_level'])
      expect(comp.subfields?.map((s) => s.key)).toContain(k);
  });

  describe('classification of the columns', () => {
    it('the evidence-link table is in scope and its columns are all classified (bound or NOT_FOR_QA)', () => {
      expect(CATALOG_SCOPE).toContain(ResultIpStepThreeEvidence);
      expect(
        NOT_FOR_QA.filter((e) => e.table === 'result_ip_step_three_evidence')
          .map((e) => e.column)
          .sort(),
      ).toEqual(['created_date', 'id']);
      expect(
        PENDING_CATALOG.filter(
          (e) => e.table === 'result_ip_step_three_evidence',
        ),
      ).toEqual([]);
    });

    it('only the legacy columns of step 3 are pending on the element row: potential situation and the four legacy evidence columns', () => {
      for (const t of [
        'result_ip_result_actors',
        'result_ip_result_institution_types',
        'result_ip_result_measures',
      ]) {
        expect(PENDING_CATALOG.filter((e) => e.table === t)).toEqual([]);
      }
      expect(
        PENDING_CATALOG.filter(
          (e) => e.table === 'result_by_innovation_package',
        )
          .map((e) => e.column)
          .sort(),
      ).toEqual(
        [
          'potential_innovation_readiness_level',
          'potential_innovation_use_level',
          'readinees_evidence_link',
          'readiness_details_of_evidence',
          'use_details_of_evidence',
          'use_evidence_link',
        ].sort(),
      );
    });

    it('the four legacy evidence columns are PENDING with the leader-approved reason and are not NOT_FOR_QA', () => {
      const reason =
        'ipsr_step_3.*.readiness_evidences / use_evidences — packages without step-3 link rows (saved before P2-3824, no backfill, migration 1790347604000:25-26; or carried over to a new phase, evidences.repository.ts:23-29) hold their only readiness/use evidence in this column; the form shows it as the first, "legacy" item (innovation-pathway-step-three.service.ts:1030-1050; ipsr-step3-evidence-list.component.html:97-101) and VS3:19-47, 231-264 validates it';
      for (const column of [
        'readinees_evidence_link',
        'use_evidence_link',
        'readiness_details_of_evidence',
        'use_details_of_evidence',
      ]) {
        const row = PENDING_CATALOG.find(
          (e) =>
            e.table === 'result_by_innovation_package' && e.column === column,
        );
        expect(row?.reason).toBe(reason);
        expect(
          NOT_FOR_QA.some(
            (e) =>
              e.table === 'result_by_innovation_package' && e.column === column,
          ),
        ).toBe(false);
      }
    });
  });

  describe('the entity mirrors the migration exactly', () => {
    it('column names, types, nullability and length match the CREATE TABLE of the migration', () => {
      expect(() =>
        assertEntityMirrorsMigration(entityColumns(), migrationColumns()),
      ).not.toThrow();
      expect(Object.keys(migrationColumns()).sort()).toEqual([
        'created_date',
        'evidence_id',
        'id',
        'ipsr_evidence_level',
        'is_active',
        'result_by_innovation_package_id',
      ]);
    });

    it('declares the unique and the composite index of the migration under the same names', () => {
      const idx = getMetadataArgsStorage().indices.filter(
        (i) => i.target === ResultIpStepThreeEvidence,
      );
      expect(
        idx.map((i) => [i.name, i.unique ?? false, i.columns]).sort(),
      ).toEqual(
        [
          [
            'IDX_ip_step_three_evidence_component',
            false,
            ['result_by_innovation_package_id', 'ipsr_evidence_level'],
          ],
          ['UQ_ip_step_three_evidence_evidence', true, ['evidence_id']],
        ].sort(),
      );
    });

    it('is detected when a column drifts from the migration (varchar length)', () => {
      const cols = entityColumns().map((c) =>
        c.name === 'ipsr_evidence_level'
          ? { ...c, options: { ...c.options, length: 30 } }
          : c,
      );
      expect(() =>
        assertEntityMirrorsMigration(cols, migrationColumns()),
      ).toThrow(/length/);
    });

    it('is detected when a column is nullable in the entity but NOT NULL in the table', () => {
      const cols = entityColumns().map((c) =>
        c.name === 'evidence_id'
          ? { ...c, options: { ...c.options, nullable: true } }
          : c,
      );
      expect(() =>
        assertEntityMirrorsMigration(cols, migrationColumns()),
      ).toThrow(/nullability/);
    });
  });

  describe('falsifiers (assertion function on a mutated copy of the real catalog)', () => {
    const mutate = (
      key: string,
      edit: (f: CatalogField) => Partial<CatalogField>,
    ): CatalogField[] =>
      CATALOG_FIELDS.map((f) => (f.key === key ? { ...f, ...edit(f) } : f));
    const mutateSub = (
      parent: string,
      subKey: string,
      edit: (s: CatalogSubField) => Partial<CatalogSubField>,
    ): CatalogField[] =>
      mutate(parent, (f) => ({
        subfields: f.subfields?.map((s) =>
          s.key === subKey ? { ...s, ...edit(s) } : s,
        ),
      }));
    const mutateEvidenceSub = (
      parent: string,
      listKey: string | null,
      subKey: string,
      edit: (s: CatalogSubField) => Partial<CatalogSubField>,
    ): CatalogField[] =>
      listKey
        ? mutateSub(parent, listKey, (l) => ({
            subfields: l.subfields?.map((s) =>
              s.key === subKey ? { ...s, ...edit(s) } : s,
            ),
          }))
        : mutateSub(parent, subKey, edit);

    const CORE_R = 'ipsr_step_3.core.readiness_evidences';

    it('an evidence list that reads the wrong level is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate(CORE_R, (f) => ({
            storage: {
              ...(f.storage as PathBinding),
              steps: (f.storage as PathBinding).steps.map((st) =>
                st.table === 'result_ip_step_three_evidence'
                  ? {
                      ...st,
                      filter: { ...st.filter, ipsr_evidence_level: 'use' },
                    }
                  : st,
              ),
            },
          })),
        ),
      ).toThrow(/evidence binding is wrong \(level readiness\)/);
    });

    it('an evidence list that keeps deactivated evidence (evidence filter dropped) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate(CORE_R, (f) => ({
            storage: {
              ...(f.storage as PathBinding),
              steps: (f.storage as PathBinding).steps.map((st) =>
                st.table === 'evidence'
                  ? { ...st, filter: { evidence_type_id: 7 } }
                  : st,
              ),
            },
          })),
        ),
      ).toThrow(/evidence binding/);
    });

    it('a core list that is not scoped to the core element (role filter dropped) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate(CORE_R, (f) => ({
            storage: {
              ...(f.storage as PathBinding),
              steps: (f.storage as PathBinding).steps.map((st) =>
                st.table === 'result_by_innovation_package'
                  ? { ...st, filter: { is_active: 1 } }
                  : st,
              ),
            },
          })),
        ),
      ).toThrow(/evidence binding/);
    });

    it('a level gate over the level ids (the in [1..9] of the level numbers) is rejected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate(CORE_R, () => ({
            required_when: {
              field: 'ipsr_step_3.core.readiness_level',
              operator: 'in',
              value: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            },
          })),
        ),
      ).toThrow(/no level gate/);
    });

    it('the link required for an upload evidence (source gate dropped) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateEvidenceSub(CORE_R, null, 'link', () => ({
            required_when: undefined,
            required: true,
          })),
        ),
      ).toThrow(/link/);
    });

    it('the tags of the evidence item required (the dialog marks them optional) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateEvidenceSub(CORE_R, null, 'poverty_related', () => ({
            required: true,
          })),
        ),
      ).toThrow(/poverty_related: required/);
    });

    it('the climate tag read from the wrong column is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateEvidenceSub(CORE_R, null, 'climate_related', () => ({
            storage: {
              kind: 'column',
              table: 'evidence',
              column: 'climate_related',
            },
          })),
        ),
      ).toThrow(/climate_related: storage/);
    });

    it('the complementary evidence read from the wrong level is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateSub(COMPLEMENTARY, 'use_evidences', (s) => ({
            storage: {
              ...(s.storage as PathBinding),
              steps: (s.storage as PathBinding).steps.map((st) =>
                st.table === 'result_ip_step_three_evidence'
                  ? {
                      ...st,
                      filter: {
                        ...st.filter,
                        ipsr_evidence_level: 'readiness',
                      },
                    }
                  : st,
              ),
            },
          })),
        ),
      ).toThrow(/use_evidences: evidence binding is wrong \(level use\)/);
    });

    it('the complementary evidence-based level left optional (the form requires it) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateSub(COMPLEMENTARY, 'use_level', () => ({ required: false })),
        ),
      ).toThrow(/use_level: required must be true/);
    });

    it('the core evidence-based level optional (the form marks it required) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate('ipsr_step_3.core.use_level', () => ({ required: false })),
        ),
      ).toThrow(/the form requires it/);
    });

    it('the core level declared confirmed (the function only states "not both empty") is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate('ipsr_step_3.core.readiness_level', () => ({
            required_confirmed: true,
          })),
        ),
      ).toThrow(/required_confirmed is false/);
    });

    it('the current levels required only for the answer 1 (the form shows the table for 1 and 2) are detected', () => {
      const only1: Condition = {
        all: [
          { field: WORKSHOP, operator: 'eq', value: true },
          { field: ASSESSED, operator: 'eq', value: 1 },
        ],
      };
      expect(() =>
        assertIpsrStep3(
          mutate('ipsr_step_3.core.current_use_level', () => ({
            visible_when: only1,
          })),
        ),
      ).toThrow(/answers 1 and 2/);
      expect(() =>
        assertIpsrStep3(
          mutateSub(COMPLEMENTARY, 'current_readiness_level', () => ({
            required_when: only1,
          })),
        ),
      ).toThrow(/current_readiness_level: required_when/);
    });

    it('the workshop answer shown without a workshop (visible_when dropped) is detected', () => {
      expect(() =>
        assertIpsrStep3(mutate(ASSESSED, () => ({ visible_when: undefined }))),
      ).toThrow(/visible only when a workshop was organized/);
    });

    it('a current-use list read from the package instead of the core element is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate('ipsr_step_3.core.current_use.measures', (f) => ({
            storage: {
              ...(f.storage as PathBinding),
              steps: (f.storage as PathBinding).steps.slice(1),
            },
          })),
        ),
      ).toThrow(/path through the core element/);
    });

    it('organizations without the step 3 role filter (they would mix the step 1 partners) are detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutate('ipsr_step_3.core.current_use.organizations', (f) => ({
            storage: {
              ...(f.storage as PathBinding),
              steps: (f.storage as PathBinding).steps.map((st, i) =>
                i === 1 ? { ...st, filter: { is_active: 1 } } : st,
              ),
            },
          })),
        ),
      ).toThrow(/organizations: binding/);
    });

    it('an optional evidence link of the current use rows (the form and VS3 require it) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateSub(
            'ipsr_step_3.core.current_use.actors',
            'evidence_link',
            () => ({
              required: false,
            }),
          ),
        ),
      ).toThrow(/actors\/evidence_link: required must be true/);
      expect(() =>
        assertIpsrStep3(
          mutateSub(
            'ipsr_step_3.core.current_use.measures',
            'evidence_link',
            () => ({
              required: false,
            }),
          ),
        ),
      ).toThrow(/measures\/evidence_link: required must be true/);
    });

    it('the other-actor text required for every actor (not only type 5) is detected', () => {
      expect(() =>
        assertIpsrStep3(
          mutateSub(
            'ipsr_step_3.core.current_use.actors',
            'other_actor_type',
            () => ({
              required_when: undefined,
              required: true,
            }),
          ),
        ),
      ).toThrow(/other_actor_type/);
    });

    it('the production shape validator rejects a gate on a key that is not in the catalog', () => {
      const errors = validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields: mutate(CORE_R, () => ({
          required_when: {
            field: 'ipsr_step_3.core.nonexistent_level',
            operator: 'in',
            value: [1],
          },
        })),
        notForQa: NOT_FOR_QA,
        pendingCatalog: PENDING_CATALOG,
      } as any);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
