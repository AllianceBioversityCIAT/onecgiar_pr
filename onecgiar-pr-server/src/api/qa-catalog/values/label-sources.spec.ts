// @akili-spec quality-assurance/qa-value-labels
// QVL-R-8 / QVL-DD-5: the registry of label sources is checked three ways, and a fourth, small guard keeps constants honest.
//   1. Completeness: every control list a select entry of a catalogued year names has a source. The walk is over the real
//      `CATALOG_FIELDS` objects at every depth, never a grep of the source text (P-4: a grep sees 46 lists, the walk 55).
//   2. Entity metadata: every table and column a table or chained source reads exists in the TypeORM entity metadata (P-7, P-17, D-6b).
//      ToC sources live in another database with no entity here: their repository SQL is cited and read as text instead.
//   3. Client mirror: each constant's cited file is read as text (the real file, never a copy) and every label occurs in it (D-1a).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';
import { CLOSED_CONTROL_LISTS } from '../definitions/closed-control-lists';
import { CATALOG_FIELDS } from '../definitions/sections';
import { CatalogField, CatalogSubField } from '../definitions/types';
import { isValidIn } from '../definitions/validity';
import { CATALOG_VERSIONS } from '../definitions/versions';
import {
  Citation,
  ConstantLabels,
  LABEL_SOURCES,
  LabelSource,
  TOC_LABEL_ONLY_SOURCES,
  resolveTocLabelSource,
} from './label-sources';
import { LOOKUP_SOURCES } from './lookup-sources';

// --- 1. completeness ------------------------------------------------------------------------------------------------

type Node = CatalogField | CatalogSubField;

/** The control list of every select entry (field, subfield, depth-2 subfield) valid in `year`. */
function selectLists(fields: CatalogField[], year: number): Set<string> {
  const lists = new Set<string>();
  const walk = (node: Node) => {
    const isSelect =
      node.type === 'single_select' || node.type === 'multi_select';
    if (isSelect && node.control_list) lists.add(node.control_list);
    for (const sub of node.subfields ?? []) walk(sub);
  };
  for (const f of fields) if (isValidIn(f, year)) walk(f);
  return lists;
}

/** Union over every catalogued year. */
function catalogLists(fields: CatalogField[] = CATALOG_FIELDS): string[] {
  const all = new Set<string>();
  for (const year of Object.keys(CATALOG_VERSIONS).map(Number)) {
    selectLists(fields, year).forEach((l) => all.add(l));
  }
  return [...all].sort();
}

const unregistered = (
  lists: string[],
  registry: Readonly<Record<string, LabelSource>>,
) => lists.filter((l) => !Object.prototype.hasOwnProperty.call(registry, l));

describe('QVL-R-8: every catalogued control list has a label source', () => {
  const lists = catalogLists();

  it('the walk reaches the 55 lists of the 2026 catalog (guards an empty or shallow walk, P-4)', () => {
    expect(lists.length).toBe(55);
    // depth-2 subfields and computed names are the ones a shallow walk or a grep misses
    expect(lists).toEqual(
      expect.arrayContaining([
        'subnational_areas', // geo.countries.subnational: field -> subfield
        'toc_levels', // contributors.science_programs.toc_entries.level: depth 2
        'impact_area_components_climate', // template-literal name
        'complementary_innovation_enabler_types', // constant name
        'actor_use_nature', // passed as an argument
      ]),
    );
  });

  it('every list has a source (a missing list is named in the failure)', () => {
    expect(unregistered(lists, LABEL_SOURCES)).toEqual([]);
  });

  it('no source is kept for a list the catalog no longer names', () => {
    expect(
      Object.keys(LABEL_SOURCES).filter((l) => !lists.includes(l)),
    ).toEqual([]);
  });

  it('a list added to the catalog without a source is reported by name (the check itself works)', () => {
    const extra = {
      key: 'fx.new',
      type: 'single_select',
      control_list: 'a_brand_new_list',
      valid_from: 2026,
      valid_to: null,
      subfields: [],
    } as unknown as CatalogField;
    // a registry that covers every real list, so only the new one can be missing
    const covering = Object.fromEntries(
      lists.map((l) => [l, LABEL_SOURCES.countries]),
    );
    expect(
      unregistered(catalogLists([...CATALOG_FIELDS, extra]), covering),
    ).toEqual(['a_brand_new_list']);
  });
});

// --- 2. entity metadata ---------------------------------------------------------------------------------------------

const SRC = resolve(__dirname, '../../..');

/** Loads every entity file (the same trees `config/orm.config.ts` globs) so the metadata storage holds all tables. */
function loadEntities(): void {
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) scan(path);
      else if (entry.endsWith('.entity.ts')) jest.requireActual(path);
    }
  };
  for (const tree of ['api', 'auth', 'clarisa', 'toc']) scan(join(SRC, tree));
}

type AnyClass = abstract new (...args: any[]) => unknown;

function entityColumns(): Map<string, Set<string>> {
  loadEntities();
  const storage = getMetadataArgsStorage();
  const out = new Map<string, Set<string>>();
  for (const table of storage.tables) {
    if (typeof table.target !== 'function') continue;
    const chain = new Set<unknown>();
    let current: unknown = table.target;
    while (typeof current === 'function' && current !== Function.prototype) {
      chain.add(current);
      current = Object.getPrototypeOf(current);
    }
    const names = new Set<string>();
    storage.columns
      .filter((c) => chain.has(c.target))
      .forEach((c) => names.add(c.options?.name ?? c.propertyName));
    storage.joinColumns
      .filter((j) => chain.has(j.target))
      .forEach((j) => names.add(j.name ?? `${j.propertyName}Id`));
    const name = table.name ?? snakeCase((table.target as AnyClass).name);
    out.set(name, new Set([...(out.get(name) ?? []), ...names]));
  }
  return out;
}

/** Every (list, table, column) a table or chained source reads: key columns, selected columns and the chain's `via`. */
function readsOf(source: LabelSource): Array<[string, string]> {
  if (source.kind === 'table') {
    return [source.keyColumn, ...source.columns].map((c) => [source.table, c]);
  }
  if (source.kind === 'chained') {
    return [
      ...[source.keyColumn, ...source.columns].map((c): [string, string] => [
        source.table,
        c,
      ]),
      ...[source.next.keyColumn, ...source.next.columns].map(
        (c): [string, string] => [source.next.table, c],
      ),
    ];
  }
  return [];
}

describe('D-6b: every table and column of a table or chained source exists in the entity metadata (P-7, P-17)', () => {
  const columns = entityColumns();
  const reading = Object.entries(LABEL_SOURCES).flatMap(([list, source]) =>
    readsOf(source).map(([table, column]) => ({ list, table, column })),
  );

  it('the registry reads tables at all (guards an empty walk)', () => {
    expect(new Set(reading.map((r) => r.table)).size).toBeGreaterThan(25);
  });

  it.each([...new Set(reading.map((r) => r.table))].sort().map((t) => [t]))(
    'table %s is an entity table',
    (table) => {
      expect(columns.has(table)).toBe(true);
    },
  );

  it.each(
    [
      ...new Map(
        reading.map((r) => [`${r.table}.${r.column}`, r] as const),
      ).values(),
    ]
      .sort((a, b) =>
        `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`),
      )
      .map((r) => [`${r.table}.${r.column}`, r.table, r.column]),
  )('column %s exists in its entity', (_label, table, column) => {
    expect(columns.get(table)?.has(column)).toBe(true);
  });

  it('a chained source follows a column its first hop selects', () => {
    for (const [list, source] of Object.entries(LABEL_SOURCES)) {
      if (source.kind !== 'chained') continue;
      expect([list, source.columns.includes(source.next.via)]).toEqual([
        list,
        true,
      ]);
    }
  });
});

describe('ToC sources (exempt from entity metadata): resolved through the lookup registry, repository SQL cited', () => {
  const tocs = Object.entries(LABEL_SOURCES).filter(
    ([, s]) => s.kind === 'toc',
  ) as Array<[string, Extract<LabelSource, { kind: 'toc' }>]>;

  it('the registry has ToC sources', () => {
    expect(tocs.map(([l]) => l).sort()).toEqual([
      'eoi_outcomes',
      'toc_melia_studies',
      'toc_results',
      'toc_results_indicators',
    ]);
  });

  it.each(tocs.map(([l, s]) => [l, s]))(
    '%s resolves with DB_TOC configured, and is unavailable without it',
    (_list, source) => {
      const resolved = resolveTocLabelSource(source.source, {
        DB_TOC: 'toc_x',
      });
      expect(resolved?.schema).toBe('toc_x');
      expect(resolved?.primaryKey).toBeTruthy();
      expect(resolveTocLabelSource(source.source, {})).toBeUndefined();
    },
  );

  it.each(tocs.map(([l, s]) => [l, s]))(
    '%s matches on columns it selects',
    (_list, source) => {
      const resolved = resolveTocLabelSource(source.source, { DB_TOC: 'x' });
      const selected = [resolved?.primaryKey, ...source.columns];
      expect(source.matchColumns.filter((c) => !selected.includes(c))).toEqual(
        [],
      );
    },
  );

  it('a source the lookup registry lacks is declared once here, never a second copy of one it has', () => {
    expect(
      Object.keys(TOC_LABEL_ONLY_SOURCES).filter((k) => k in LOOKUP_SOURCES),
    ).toEqual([]);
    for (const [, s] of tocs) {
      const known =
        s.source in LOOKUP_SOURCES || s.source in TOC_LABEL_ONLY_SOURCES;
      expect([s.source, known]).toEqual([s.source, true]);
    }
  });

  it.each(tocs.map(([l, s]) => [l, s]))(
    '%s cites repository SQL that names its table and every column',
    (_list, source) => {
      const resolved = resolveTocLabelSource(source.source, { DB_TOC: 'x' });
      expect(textOf(source.sql, 'whole')).toContain(`${resolved?.table}`);
      const lines = textOf(source.sql, 'lines');
      for (const c of source.columns) {
        expect([c, new RegExp(`\\b${c}\\b`).test(lines)]).toEqual([c, true]);
      }
    },
  );
});

// --- 3. client mirror -------------------------------------------------------------------------------------------------

const REPO = resolve(__dirname, '../../../../..');
const ROOTS = {
  client: join(REPO, 'onecgiar-pr-client/src/app'),
  server: join(REPO, 'onecgiar-pr-server/src'),
} as const;

/** The real file, read as text. `lines` is the cited range, `whole` the full file. */
function textOf(cite: Citation, part: 'whole' | 'lines'): string {
  const all = readFileSync(join(ROOTS[cite.tree], cite.file), 'utf8');
  if (part === 'whole') return all;
  const rows = all.split('\n');
  return cite.lines
    .split(',')
    .map((range) => {
      const [from, to = from] = range.split('-').map(Number);
      return rows.slice(from - 1, to).join('\n');
    })
    .join('\n');
}

/** Every constant label of a source: its own constant, and the constant overrides of a table source. */
function constants(source: LabelSource): ConstantLabels[] {
  if (source.kind === 'constant') return [source];
  if (source.kind === 'table' && source.overrides) return [source.overrides];
  return [];
}

describe('D-1a: every constant label occurs in the client (or server) file it cites', () => {
  const rows = Object.entries(LABEL_SOURCES).flatMap(([list, source]) =>
    constants(source).flatMap((constant) =>
      Object.entries(constant.labels).map(([id, label]) => ({
        list,
        id,
        label,
        cites: constant.cites,
      })),
    ),
  );

  it('the registry has constants at all (guards an empty walk)', () => {
    expect(new Set(rows.map((r) => r.list)).size).toBe(10); // 9 constant lists + the type 9 override
    expect(rows.length).toBeGreaterThan(25);
  });

  it.each(rows.map((r) => [`${r.list}[${r.id}] ${r.label}`, r]))(
    '%s',
    (_name, row) => {
      for (const cite of row.cites) {
        // the citation points at a real file with that many lines
        expect(textOf(cite, 'whole').length).toBeGreaterThan(0);
      }
      const inFile = row.cites.some((c) =>
        textOf(c, 'whole').includes(row.label),
      );
      expect([row.label, inFile]).toEqual([row.label, true]);
      // and inside the cited line range, so the `file:line` of the contract is true
      const inLines = row.cites.some((c) =>
        textOf(c, 'lines').includes(row.label),
      );
      expect([row.label, inLines]).toEqual([row.label, true]);
    },
  );

  it('a constant label carries no markup and no surrounding blanks', () => {
    for (const r of rows) {
      expect([
        r.label,
        r.label === r.label.trim() && !/[<>]/.test(r.label),
      ]).toEqual([r.label, true]);
    }
  });

  it('every id of a closed control list has a constant label, keyed as a string', () => {
    for (const [list, source] of Object.entries(LABEL_SOURCES)) {
      const closed = CLOSED_CONTROL_LISTS[list];
      if (source.kind !== 'constant' || !closed) continue;
      const keys = Object.keys(source.labels);
      expect([
        list,
        closed.map(String).filter((id) => !keys.includes(id)),
      ]).toEqual([list, []]);
    }
  });
});

// --- composers: worked examples, literal expected values ------------------------------------------------------------

describe('composers (QVL-R-3 canonical text)', () => {
  const compose = (list: string, row: Record<string, unknown>) => {
    const s = LABEL_SOURCES[list];
    if (s.kind === 'table' || s.kind === 'toc') return s.compose(row);
    if (s.kind === 'chained') return s.compose(row);
    throw new Error(`${list} has no composer`);
  };

  it('a result is "code - title"', () => {
    expect(
      compose('results', { result_code: 1234, title: ' Maize yield ' }),
    ).toBe('1234 - Maize yield');
  });

  it('a program is "official code - name"', () => {
    expect(
      compose('initiatives', { official_code: 'SP01', name: 'Climate Action' }),
    ).toBe('SP01 - Climate Action');
  });

  it('a center is "acronym - name", from the institution row', () => {
    expect(
      compose('centers', { acronym: 'CIAT', name: 'International Center' }),
    ).toBe('CIAT - International Center');
    expect(
      compose('centers', { acronym: '  ', name: 'International Center' }),
    ).toBe('International Center');
  });

  it('a user is the trimmed first and last name, and nothing is null', () => {
    expect(compose('users', { first_name: ' Ana ', last_name: 'Ruiz ' })).toBe(
      'Ana Ruiz',
    );
    expect(compose('users', { first_name: 'Ana', last_name: null })).toBe(
      'Ana',
    );
    expect(compose('users', { first_name: ' ', last_name: '' })).toBeNull();
  });

  it('a subnational area is the first non-empty of name, local name, romanization name', () => {
    const row = {
      name: '',
      local_name: ' ',
      romanization_system_name: 'Dar es Salaam',
    };
    expect(compose('subnational_areas', row)).toBe('Dar es Salaam');
    expect(compose('subnational_areas', { ...row, local_name: 'Pwani' })).toBe(
      'Pwani',
    );
    expect(compose('subnational_areas', { ...row, name: 'Coast' })).toBe(
      'Coast',
    );
    expect(compose('subnational_areas', { name: null })).toBeNull();
  });

  it('a project is its full name, falling back to the short name when blank', () => {
    expect(
      compose('projects', { full_name: 'Full name', short_name: 'Short' }),
    ).toBe('Full name');
    expect(compose('projects', { full_name: '  ', short_name: 'Short' })).toBe(
      'Short',
    );
    expect(
      compose('projects', { full_name: null, short_name: null }),
    ).toBeNull();
  });

  it('a plain name list reads its one column, trimmed, and a blank is null', () => {
    expect(compose('countries', { name: ' Kenya ' })).toBe('Kenya');
    expect(compose('countries', { name: '' })).toBeNull();
    expect(
      compose('complementary_innovation_enabler_types', { group: 'Policy' }),
    ).toBe('Policy');
    expect(compose('discontinued_reasons', { option: 'Funding ended' })).toBe(
      'Funding ended',
    );
  });

  it('the type 9 override is the only one on result types', () => {
    const s = LABEL_SOURCES.result_types;
    expect(s.kind === 'table' && s.overrides?.labels).toEqual({
      9: 'Impact result',
    });
    expect(compose('result_types', { name: 'Impact contribution' })).toBe(
      'Impact contribution',
    );
  });
});
