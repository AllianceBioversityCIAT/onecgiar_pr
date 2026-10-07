// @akili-spec quality-assurance/qa-field-catalog
import { NotFoundException } from '@nestjs/common';
import { QaCatalogService } from './qa-catalog.service';
import { FIXTURE_SOURCE } from './qa-catalog.fixtures';

describe('QaCatalogService.getCatalog', () => {
  const service = new QaCatalogService();
  const keys = (list: { key: string }[]) => list.map((e) => e.key);

  afterEach(() => jest.useRealTimers());

  it('QAC-R-9: 200 shape, catalog_version = year.revision, portfolio from versions', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const res = service.getCatalog(2026, FIXTURE_SOURCE);
    expect(res.portfolio).toBe('P25');
    expect(res.phase).toBe(2026);
    expect(res.catalog_version).toBe('2026.3');
    expect(res.generated_at).toBe('2026-10-06T12:00:00.000Z');
    expect(Object.keys(res).sort()).toEqual(
      [
        'catalog_version',
        'fields',
        'generated_at',
        'phase',
        'portfolio',
        'result_types',
        'sections',
      ].sort(),
    );
  });

  it('QAC-R-3 / R-9 scenario 2025 vs 2026: 2026 omits the field retired in 2025, 2025 has it', () => {
    const y2026 = keys(service.getCatalog(2026, FIXTURE_SOURCE).fields);
    const y2025 = keys(service.getCatalog(2025, FIXTURE_SOURCE).fields);
    expect(y2026).not.toContain('general.legacy_note');
    expect(y2026).not.toContain('legacy.old_policy');
    expect(y2025).toContain('general.legacy_note');
    expect(y2025).toContain('legacy.old_policy');
  });

  it('QAC-R-9: a field only from 2026 is absent in 2025; fields valid in both keep the same key', () => {
    const y2026 = keys(service.getCatalog(2026, FIXTURE_SOURCE).fields);
    const y2025 = keys(service.getCatalog(2025, FIXTURE_SOURCE).fields);
    expect(y2025).not.toContain('innovation.readiness');
    expect(y2026).toContain('innovation.readiness');
    expect(y2025).toContain('general.title');
    expect(y2026).toContain('general.title');
  });

  it('QAC-R-9: ordered by section order then field order', () => {
    expect(keys(service.getCatalog(2026, FIXTURE_SOURCE).fields)).toEqual([
      'general.title',
      'general.countries',
      'innovation.readiness',
    ]);
    expect(keys(service.getCatalog(2025, FIXTURE_SOURCE).fields)).toEqual([
      'general.title',
      'general.countries',
      'general.legacy_note',
      'legacy.old_policy',
    ]);
  });

  it('only sections valid that year with at least one valid field, in section order', () => {
    expect(keys(service.getCatalog(2026, FIXTURE_SOURCE).sections)).toEqual([
      'general',
      'innovation',
    ]);
    expect(keys(service.getCatalog(2025, FIXTURE_SOURCE).sections)).toEqual([
      'general',
      'legacy',
    ]);
  });

  it('result_types filtered to types having at least one field that year', () => {
    // 2026: the '*' general fields reach all three types, including knowledge_product.
    expect(keys(service.getCatalog(2026, FIXTURE_SOURCE).result_types)).toEqual(
      ['policy_change', 'innovation_development', 'knowledge_product'],
    );
  });

  it('result_types excludes a type whose only fields are not valid that year', () => {
    const source = {
      ...FIXTURE_SOURCE,
      fields: FIXTURE_SOURCE.fields.filter(
        (f) => !f.result_types.includes('*'),
      ),
    };
    // without the '*' fields: 2026 reaches only innovation_development
    expect(keys(service.getCatalog(2026, source).result_types)).toEqual([
      'innovation_development',
    ]);
    expect(keys(service.getCatalog(2025, source).result_types)).toEqual([
      'policy_change',
    ]);
  });

  it('keeps result_types: ["*"] verbatim', () => {
    const f = service
      .getCatalog(2026, FIXTURE_SOURCE)
      .fields.find((x) => x.key === 'general.title');
    expect(f.result_types).toEqual(['*']);
    expect(
      service.getCatalog(2026, FIXTURE_SOURCE).sections[0].result_types,
    ).toEqual(['*']);
  });

  it('nests subfields under their parent, inheriting its validity', () => {
    const f = service
      .getCatalog(2026, FIXTURE_SOURCE)
      .fields.find((x) => x.key === 'innovation.readiness');
    expect(f.subfields).toEqual([
      {
        key: 'justification',
        label: 'Justification',
        type: 'text',
        required: true,
      },
    ]);
  });

  it('QAC-R-9: a year not declared in versions throws 404, never an empty catalog', () => {
    expect(() => service.getCatalog(2023, FIXTURE_SOURCE)).toThrow(
      NotFoundException,
    );
  });

  it('QAC-R-9 "Not-catalogued years": a declared year with no catalog content throws 404, not an empty 200', () => {
    const emptySource = { ...FIXTURE_SOURCE, sections: [], fields: [] };
    expect(() => service.getCatalog(2026, emptySource)).toThrow(
      NotFoundException,
    );
    expect(() => service.getCatalog(2026, emptySource)).toThrow(
      'No QA catalog available for phase_year 2026',
    );
  });

  it('QAC-R-9: a declared year whose fields are all invalid for it throws 404', () => {
    // 2024 declared, but every fixture field starts in 2025 or later
    const source = {
      ...FIXTURE_SOURCE,
      versions: {
        ...FIXTURE_SOURCE.versions,
        2024: { portfolio: 'P22', revision: 1 },
      },
    };
    expect(() => service.getCatalog(2024, source)).toThrow(NotFoundException);
  });

  it('QAC-R-9: a year whose fields are valid but every section is retired (projection empty) throws 404, not an empty 200', () => {
    // section retired 2025, its only field starts 2026: validFields is non-empty, the projected result is not
    const readiness = FIXTURE_SOURCE.fields.find(
      (f) => f.key === 'innovation.readiness',
    );
    const source = {
      ...FIXTURE_SOURCE,
      sections: [
        {
          ...FIXTURE_SOURCE.sections.find((s) => s.key === 'innovation'),
          valid_to: 2025,
        },
      ],
      fields: [{ ...readiness, valid_from: 2026, valid_to: null }],
    };
    expect(() => service.getCatalog(2026, source)).toThrow(NotFoundException);
    expect(() => service.getCatalog(2026, source)).toThrow(
      'No QA catalog available for phase_year 2026',
    );
  });

  it('uses the code catalog when no source is injected: 2026 has the common sections (200), an undeclared year is 404', () => {
    const res = service.getCatalog(2026);
    expect(res.catalog_version).toBe('2026.17');
    expect(res.fields.map((f) => f.key)).toEqual(
      expect.arrayContaining(['general.title', 'geo.scope', 'evidence.items']),
    );
    expect(() => service.getCatalog(2023)).toThrow(NotFoundException);
  });

  it('QAC-R-5 (QAC-T-11 rework): innovation_package gets its own unconfirmed IPSR geography keys, never the common geo.* rules the live IPSR function does not apply', () => {
    const res = service.getCatalog(2026);
    const forIpsr = res.fields.filter(
      (f) =>
        f.result_types.includes('*') ||
        f.result_types.includes('innovation_package'),
    );
    const ipsrKeys = forIpsr.map((f) => f.key);
    const geoScope = forIpsr.find((f) => f.key === 'ipsr_step_1.geo_scope');
    expect(geoScope).toBeDefined();
    expect(geoScope.required).toBe(false);
    expect(ipsrKeys).toEqual(
      expect.arrayContaining(['ipsr_step_1.regions', 'ipsr_step_1.countries']),
    );
    expect(ipsrKeys.filter((k) => k.startsWith('geo.'))).toEqual([]);
    // the common geography is still catalogued for the other types
    const common = res.fields.find((f) => f.key === 'geo.scope');
    expect(common.result_types).not.toContain('innovation_package');
    expect(common.result_types).toContain('policy_change');
  });
});
