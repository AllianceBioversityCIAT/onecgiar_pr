// @akili-spec quality-assurance/qa-field-catalog
import { Logger } from '@nestjs/common';
import { QaCatalogSyncService } from './qa-catalog-sync.service';
import { QaCatalogSource } from './qa-catalog.service';
import { computeCatalogContentHash } from './definitions/content-hash';

// Fresh copy on every call: "existing" rows and "code" rows must never share references.
const makeSource = (): QaCatalogSource => ({
  resultTypes: [
    { key: 'policy_change', label: 'Policy change', level: 'outcome' },
    { key: 'knowledge_product', label: 'Knowledge product', level: 'output' },
  ],
  sections: [
    {
      key: 'general',
      label: 'General',
      order: 1,
      result_types: ['*'],
      valid_from: 2025,
      valid_to: null,
    },
  ],
  fields: [
    {
      key: 'title',
      label: 'Title',
      type: 'text',
      section: 'general',
      order: 1,
      result_types: ['*'],
      required: true,
      required_confirmed: true,
      valid_from: 2025,
      valid_to: null,
      storage: { kind: 'column', table: 'result', column: 'title' },
    },
    {
      key: 'geo',
      label: 'Geographic scope',
      description: 'Where',
      type: 'list',
      section: 'general',
      order: 2,
      result_types: ['*'],
      required: false,
      required_confirmed: false,
      valid_from: 2025,
      valid_to: null,
      storage: {
        kind: 'relation',
        table: 'result_region',
        fk_to_result: 'result_id',
        value_column: 'region_id',
        filter: { is_active: true, kind: 'x' },
      },
      subfields: [
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          storage: { kind: 'column', table: 'result_region', column: 'name' },
        },
      ],
    },
  ],
  versions: { 2026: { portfolio: 'P25', revision: 1 } },
});

// DB rows written by hand (not through the service's mapping), with extra DB-only columns and
// JSON keys in a different order than the code declares them.
const dbRows = () => ({
  resultTypes: [
    { key: 'policy_change', label: 'Policy change', level: 'outcome' },
    { key: 'knowledge_product', label: 'Knowledge product', level: 'output' },
  ],
  sections: [
    {
      key: 'general',
      label: 'General',
      order: 1,
      result_types: ['*'],
      valid_from: 2025,
      valid_to: null,
    },
  ],
  fields: [
    {
      id: 1,
      key: 'title',
      parent_key: '',
      label: 'Title',
      description: null,
      type: 'text',
      control_list: null,
      section_key: 'general',
      order: 1,
      result_types: ['*'],
      required: 1,
      required_confirmed: 1,
      required_when: null,
      valid_from: 2025,
      valid_to: null,
      storage: { column: 'title', table: 'result', kind: 'column' },
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    },
    {
      id: 2,
      key: 'geo',
      parent_key: '',
      label: 'Geographic scope',
      description: 'Where',
      type: 'list',
      control_list: null,
      section_key: 'general',
      order: 2,
      result_types: ['*'],
      required: 0,
      required_confirmed: 0,
      required_when: null,
      valid_from: 2025,
      valid_to: null,
      storage: {
        value_column: 'region_id',
        table: 'result_region',
        kind: 'relation',
        fk_to_result: 'result_id',
        filter: { kind: 'x', is_active: true },
      },
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    },
    {
      id: 3,
      key: 'name',
      parent_key: 'geo',
      label: 'Name',
      description: null,
      type: 'text',
      control_list: null,
      section_key: 'general',
      order: 0,
      result_types: ['*'],
      required: 1,
      required_confirmed: 0,
      required_when: null,
      valid_from: 2025,
      valid_to: null,
      storage: { kind: 'column', table: 'result_region', column: 'name' },
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    },
  ],
  versions: [
    {
      phase_year: 2026,
      portfolio: 'P25',
      revision: 1,
      content_hash: computeCatalogContentHash(makeSource(), 2026),
      synced_at: new Date('2026-01-01'),
    },
  ],
});

const mockRepo = (rows: unknown[]) => ({
  find: jest.fn().mockResolvedValue(rows),
  insert: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  upsert: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  softDelete: jest.fn().mockResolvedValue(undefined),
  softRemove: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
});

const build = (rows = dbRows()) => {
  const repos = {
    resultType: mockRepo(rows.resultTypes),
    section: mockRepo(rows.sections),
    field: mockRepo(rows.fields),
    version: mockRepo(rows.versions),
  };
  const service = new QaCatalogSyncService(
    repos.resultType as any,
    repos.section as any,
    repos.field as any,
    repos.version as any,
  );
  return { service, repos };
};

const writes = (repo: ReturnType<typeof mockRepo>) =>
  repo.insert.mock.calls.length +
  repo.update.mock.calls.length +
  repo.save.mock.calls.length +
  repo.upsert.mock.calls.length;
const totalWrites = (r: ReturnType<typeof build>['repos']) =>
  Object.values(r).reduce((n, repo) => n + writes(repo), 0);
const destructive = ['delete', 'remove', 'softDelete', 'softRemove', 'clear'];
const destructiveCalls = (r: ReturnType<typeof build>['repos']) =>
  Object.values(r).reduce(
    (n, repo) =>
      n +
      destructive.reduce((m, k) => m + (repo as any)[k].mock.calls.length, 0),
    0,
  );

describe('QaCatalogSyncService (QAC-R-6, QAC-R-3)', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('(a) empty tables: inserts every code entry (2 types, 1 section, 3 field rows, 1 version)', async () => {
    const { service, repos } = build({
      resultTypes: [],
      sections: [],
      fields: [],
      versions: [],
    });

    const result = await service.sync(makeSource());

    expect(result.inserted).toBe(7);
    expect(result.updated).toBe(0);
    expect(repos.resultType.insert).toHaveBeenCalledTimes(1);
    expect(repos.resultType.insert.mock.calls[0][0]).toHaveLength(2);
    expect(repos.section.insert.mock.calls[0][0]).toHaveLength(1);
    const fieldRows = repos.field.insert.mock.calls[0][0];
    expect(fieldRows).toHaveLength(3);
    // DD-10: top-level rows carry '' (never null); subfield carries its parent's key.
    expect(fieldRows.map((f: any) => [f.key, f.parent_key])).toEqual([
      ['title', ''],
      ['geo', ''],
      ['name', 'geo'],
    ]);
    const version = repos.version.insert.mock.calls[0][0];
    expect([].concat(version)[0]).toMatchObject({
      phase_year: 2026,
      portfolio: 'P25',
      revision: 1,
    });
    expect([].concat(version)[0].content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(logSpy).toHaveBeenCalledWith(
      'qa-catalog sync: inserted=7 updated=0 orphans=[]',
    );
  });

  it('(b) identical tables (JSON keys reordered, tinyint booleans): zero writes', async () => {
    const { service, repos } = build();

    const result = await service.sync(makeSource());

    expect(result).toEqual({ inserted: 0, updated: 0, orphans: [] });
    expect(totalWrites(repos)).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(
      'qa-catalog sync: inserted=0 updated=0 orphans=[]',
    );
  });

  it('(c) one label changed in code: exactly one update touching only that field', async () => {
    const { service, repos } = build();
    const source = makeSource();
    source.fields[0].label = 'Result title';

    const result = await service.sync(source);

    // one field row + the year's version row (its content hash follows the catalog)
    expect(result.updated).toBe(2);
    expect(result.inserted).toBe(0);
    expect(totalWrites(repos)).toBe(2);
    expect(writes(repos.field)).toBe(1);
    expect(repos.field.update).toHaveBeenCalledTimes(1);
    const [criteria, patch] = repos.field.update.mock.calls[0];
    expect(criteria).toEqual({ key: 'title', parent_key: '' });
    expect(patch).toEqual({ label: 'Result title' });
  });

  it('(c2) a changed JSON binding is detected and written', async () => {
    const { service, repos } = build();
    const source = makeSource();
    (source.fields[1].storage as any).value_column = 'other_id';

    await service.sync(source);

    expect(writes(repos.field)).toBe(1);
    expect(repos.field.update.mock.calls[0][1]).toEqual({
      storage: expect.objectContaining({ value_column: 'other_id' }),
    });
  });

  it('(c3) a field retired in code (valid_to set) is updated, never removed (QAC-R-3)', async () => {
    const { service, repos } = build();
    const source = makeSource();
    source.fields[0].valid_to = 2025;

    const result = await service.sync(source);

    expect(result.updated).toBeGreaterThanOrEqual(1);
    expect(repos.field.update.mock.calls[0][1]).toEqual({ valid_to: 2025 });
    expect(destructiveCalls(repos)).toBe(0);
  });

  it('(d) orphan row (key no longer in code): not deleted, warning names the key', async () => {
    const rows = dbRows();
    rows.fields.push({
      ...rows.fields[0],
      id: 99,
      key: 'removed_field',
    });
    const { service, repos } = build(rows);

    const result = await service.sync(makeSource());

    expect(result.orphans).toEqual(['field:removed_field']);
    expect(destructiveCalls(repos)).toBe(0);
    expect(totalWrites(repos)).toBe(0);
    const warned = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(warned).toContain('removed_field');
    expect(logSpy).toHaveBeenCalledWith(
      'qa-catalog sync: inserted=0 updated=0 orphans=[field:removed_field]',
    );
  });

  it('(e) repository throws: sync resolves, error logged without message content', async () => {
    const { service, repos } = build();
    repos.field.find.mockRejectedValue(
      new Error('ER_ACCESS_DENIED password=hunter2 user=jdoe@cgiar.org'),
    );

    await expect(service.sync(makeSource())).resolves.toBeDefined();
    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls
      .map((c) => c.map(String).join(' '))
      .join('\n');
    expect(logged).toContain('qa-catalog sync failed');
    expect(logged).not.toContain('hunter2');
    expect(logged).not.toContain('jdoe@cgiar.org');
  });

  it('(f) never calls any delete/remove/clear on any repository, across all scenarios', async () => {
    const rows = dbRows();
    rows.sections.push({ ...rows.sections[0], key: 'old_section' });
    rows.fields.push({ ...rows.fields[0], id: 98, key: 'old_field' });
    rows.versions.push({ ...rows.versions[0], phase_year: 2019 });
    rows.resultTypes.push({ key: 'old_type', label: 'Old', level: 'output' });
    const { service, repos } = build(rows);
    const source = makeSource();
    source.fields[0].label = 'Changed';

    await service.sync(source);

    expect(destructiveCalls(repos)).toBe(0);
    expect(repos.section.update).not.toHaveBeenCalled();
  });

  it('onApplicationBootstrap runs the sync against the code catalog', async () => {
    const { service } = build();
    const spy = jest.spyOn(service, 'sync');
    await service.onApplicationBootstrap();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('updates the version row when the effective catalog hash changes', async () => {
    const { service, repos } = build();
    const source = makeSource();
    source.fields[0].label = 'Result title';

    await service.sync(source);

    expect(repos.version.update).toHaveBeenCalledTimes(1);
    const [criteria, patch] = repos.version.update.mock.calls[0];
    expect(criteria).toEqual({ phase_year: 2026 });
    expect(patch.content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(patch.content_hash).not.toBe(dbRows().versions[0].content_hash);
    expect(typeof patch.synced_at).toBe('function');
    expect(patch.synced_at()).toBe('CURRENT_TIMESTAMP');
  });
});
