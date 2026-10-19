import type { PortfolioResultDimensions } from '../../../../../shared/interfaces/portfolio-result-dimensions.interface';
import type { RawResult } from './portfolio-overview.service';
import {
  EMPTY_SELECTION,
  FILTER_DIMENSIONS,
  SECTION_HONOURS,
  activeDimensions,
  buildDimensionIndex,
  buildOptions,
  isActive,
  matchesRow,
  notAffectedBy,
  parseQueryParams,
  resultsCenterLinkable,
  sanitize,
  toQueryParams,
  type FilterRow,
  type PortfolioFilterSelection
} from './portfolio-filters';
import { resolveStatusSlot as resolveFromService } from './portfolio-overview.service';
import { resolveStatusSlot } from './portfolio-status-slot';

const sel = (partial: Partial<Record<keyof PortfolioFilterSelection, string[]>>): PortfolioFilterSelection => ({
  program: new Set(partial.program ?? []),
  project: new Set(partial.project ?? []),
  center: new Set(partial.center ?? []),
  typology: new Set(partial.typology ?? []),
  status: new Set(partial.status ?? [])
});

const W1W2 = 'W1/W2';
const W3 = 'W3/Bilaterals';

// S-2.1 fixtures (R1..R3) and S-2.3 fixtures (R4 = W3, R5 = W1/W2).
const R1: FilterRow = { id: 1, submitter: 'SP02', submitter_short_name: 'Climate Action', lead_center: 'CIAT', result_type: 'Knowledge product', status_id: 1, status_name: 'Editing', source_name: W1W2 };
const R2: FilterRow = { id: 2, submitter: 'SP02', submitter_short_name: 'Climate Action', lead_center: 'ILRI', result_type: 'Policy change', status_id: 3, status_name: 'Submitted', source_name: W1W2 };
const R3: FilterRow = { id: 3, submitter: 'SP03', submitter_short_name: 'Breeding', lead_center: 'IRRI', result_type: 'Knowledge product', status_id: 1, status_name: 'Editing', source_name: W1W2 };
const R4: FilterRow = { id: 4, submitter: 'SP02', submitter_short_name: 'Climate Action', lead_center: 'CIAT', result_type: 'Innovation development', status_id: 6, status_name: 'Approved', source_name: W3 };
const R5: FilterRow = { id: 5, submitter: 'SP03', submitter_short_name: 'Breeding', lead_center: 'IRRI', result_type: 'Other output', status_id: 1, status_name: 'Editing', source_name: W1W2 };
const ROWS = [R1, R2, R3, R4, R5];

const MAP: PortfolioResultDimensions = {
  versionId: 36,
  phaseName: 'Reporting 2026 - P25',
  // P (10) is linked to W3 result R4 and W1/W2 result R5; Q (11) only to W1/W2 result R5.
  projectLinks: [
    [4, 10],
    [5, 10],
    [5, 11]
  ],
  // R2 is LED by ILRI but CIAT contributes: the lead_center column says ILRI, the map says CIAT too.
  centerLinks: [
    [1, 'CENTER-1'],
    [2, 'CENTER-1'],
    [2, 'CENTER-2'],
    [3, 'CENTER-3'],
    [4, 'CENTER-1'],
    [999, 'CENTER-9']
  ],
  projects: [
    { id: 10, shortName: 'Project P', fullName: 'Project P full name' },
    { id: 11, shortName: 'Project Q', fullName: 'Project Q full name' }
  ],
  centers: [
    { code: 'CENTER-1', acronym: 'CIAT', name: 'Alliance Bioversity-CIAT' },
    { code: 'CENTER-2', acronym: 'ILRI', name: 'International Livestock Research Institute' },
    { code: 'CENTER-3', acronym: 'IRRI', name: 'International Rice Research Institute' },
    { code: 'CENTER-9', acronym: 'OFFPAGE', name: 'Center linked to a result outside the page' }
  ],
  w3ProjectIds: [10]
};
const INDEX = buildDimensionIndex(MAP);
const matching = (selection: PortfolioFilterSelection, rows: FilterRow[] = ROWS, index = INDEX) =>
  rows.filter(r => matchesRow(r, selection, index) === 'match').map(r => r.id);

describe('portfolio-filters (pure logic)', () => {
  describe('one map for the status slot (GLF-T-2 disqualifier)', () => {
    it('is the same function whether imported from the pure file or from the service', () => {
      expect(resolveFromService).toBe(resolveStatusSlot);
      expect(resolveStatusSlot(R4 as RawResult)).toBe('approved');
    });
  });

  describe('selection helpers (R-1, R-9)', () => {
    it('EMPTY_SELECTION is inactive and has no active dimension', () => {
      expect(isActive(EMPTY_SELECTION)).toBe(false);
      expect(activeDimensions(EMPTY_SELECTION)).toEqual([]);
    });

    it('lists active dimensions in bar order, not insertion order', () => {
      expect(FILTER_DIMENSIONS).toEqual(['program', 'project', 'center', 'typology', 'status']);
      expect(activeDimensions(sel({ status: ['editing'], program: ['SP02'], center: ['CENTER-1'] }))).toEqual(['program', 'center', 'status']);
      expect(isActive(sel({ status: ['editing'] }))).toBe(true);
      expect(isActive(sel({ status: ['editing'] }), 'program')).toBe(false);
    });
  });

  describe('matchesRow (S-2.1 .. S-2.4)', () => {
    it('S-2.1: AND across dimensions, OR inside one', () => {
      const programAndCenter = sel({ program: ['SP02', 'SP03'], center: ['CENTER-1'] });
      expect(matching(programAndCenter, [R1, R2, R3])).toEqual([1, 2]);
      expect(matching(sel({ program: ['SP02', 'SP03'], center: ['CENTER-1'], status: ['editing'] }), [R1, R2, R3])).toEqual([1]);
    });

    it('S-2.1 falsifier: OR across dimensions would also match R3 (SP03, IRRI, Editing) - it must not', () => {
      expect(matchesRow(R3, sel({ program: ['SP02'], status: ['editing'] }), INDEX)).toBe('miss');
      expect(matchesRow(R3, sel({ program: ['SP02', 'SP03'], center: ['CENTER-1'] }), INDEX)).toBe('miss');
    });

    it('S-2.2: matches a Center through the map, never through lead_center (R2 led by ILRI, CIAT contributes)', () => {
      expect(R2.lead_center).toBe('ILRI');
      expect(matchesRow(R2, sel({ center: ['CENTER-1'] }), INDEX)).toBe('match');
      // lead_center = display acronym; selecting by it must not work, only the code through the index does
      expect(matchesRow(R1, sel({ center: ['CIAT'] }), INDEX)).toBe('miss');
    });

    it('S-2.2 BUT: a row with no ACTIVE link to the Center does not match (index holds active pairs only)', () => {
      // R5 has lead_center IRRI and no center link at all in the map (an inactive row is never shipped)
      expect(matchesRow(R5, sel({ center: ['CENTER-3'] }), INDEX)).toBe('miss');
    });

    it('S-2.3: a project matches W3 and W1/W2 rows alike', () => {
      expect(matching(sel({ project: ['10'] }))).toEqual([4, 5]);
      expect(matching(sel({ project: ['11'] }))).toEqual([5]);
      expect(matching(sel({ project: ['10', '11'] }))).toEqual([4, 5]);
    });

    it('S-2.4: a level token expands to every type of that level; unclassified needs its own token', () => {
      const unclassified: FilterRow = { id: 6, submitter: 'SP02', result_type: 'Something new', status_id: 1 };
      const noType: FilterRow = { id: 7, submitter: 'SP02', status_id: 1 };
      const rows = [...ROWS, unclassified, noType];
      expect(matching(sel({ typology: ['output'] }), rows)).toEqual([1, 3, 4, 5]);
      expect(matching(sel({ typology: ['outcome'] }), rows)).toEqual([2]);
      expect(matching(sel({ typology: ['unclassified'] }), rows)).toEqual([6, 7]);
    });

    it('Typology output matches a Knowledge product row (a type is an output)', () => {
      expect(matchesRow(R1, sel({ typology: ['output'] }), INDEX)).toBe('match');
    });

    it('a normalized type token matches that type only, case and spacing insensitively', () => {
      const spaced: FilterRow = { id: 8, submitter: 'SP02', result_type: '  Knowledge   PRODUCT ', status_id: 1 };
      expect(matchesRow(spaced, sel({ typology: ['knowledge product'] }), INDEX)).toBe('match');
      expect(matchesRow(R2, sel({ typology: ['knowledge product'] }), INDEX)).toBe('miss');
    });

    it('status uses the slot, so status_id 5 (Pending Review) is the submitted slot', () => {
      const pending: FilterRow = { id: 9, submitter: 'SP02', status_id: 5, status_name: 'Pending Review' };
      expect(matchesRow(pending, sel({ status: ['submitted'] }), INDEX)).toBe('match');
      expect(matchesRow(pending, sel({ status: ['editing'] }), INDEX)).toBe('miss');
    });

    it('an empty selection matches every row, even with no index', () => {
      expect(matching(EMPTY_SELECTION, ROWS, INDEX)).toEqual([1, 2, 3, 4, 5]);
      expect(matchesRow(R1, EMPTY_SELECTION, null)).toBe('match');
    });

    it('S-13.1 BUT: a missing index answers unknown for Center and Project, never false', () => {
      expect(matchesRow(R1, sel({ center: ['CENTER-1'] }), null)).toBe('unknown');
      expect(matchesRow(R1, sel({ project: ['10'] }), undefined)).toBe('unknown');
    });

    it('a definite miss on a cheap dimension wins over an unknown one', () => {
      expect(matchesRow(R1, sel({ program: ['SP09'], center: ['CENTER-1'] }), null)).toBe('miss');
      expect(matchesRow(R1, sel({ program: ['SP02'], center: ['CENTER-1'] }), null)).toBe('unknown');
    });

    it('Program, Typology and Status keep working with no index', () => {
      expect(matchesRow(R1, sel({ program: ['SP02'], status: ['editing'], typology: ['output'] }), null)).toBe('match');
    });

    it('a row with no id or an id absent from the map misses a Center filter (index present)', () => {
      const noId: FilterRow = { submitter: 'SP02' };
      expect(matchesRow(noId, sel({ center: ['CENTER-1'] }), INDEX)).toBe('miss');
    });
  });

  describe('buildDimensionIndex', () => {
    it('collapses pairs into per-result sets (string project ids)', () => {
      expect(INDEX.centers.get(2)).toEqual(new Set(['CENTER-1', 'CENTER-2']));
      expect(INDEX.projects.get(5)).toEqual(new Set(['10', '11']));
      expect(INDEX.projects.get(1)).toBeUndefined();
    });
  });

  describe('buildOptions (R-3)', () => {
    const options = buildOptions(ROWS, MAP);

    it('S-3.1: project Q, linked only to W1/W2, is not an option; P is', () => {
      expect(options.project.map(o => o.value)).toEqual(['10']);
      expect(options.project[0]).toEqual({ value: '10', label: 'Project P', hint: 'Project P full name' });
    });

    it('Program: present codes, natural order, "code - short name" label', () => {
      const withAccelerator: FilterRow[] = [...ROWS, { id: 20, submitter: 'AID', submitter_short_name: 'Gender', status_id: 1 }, { id: 21, submitter: 'SP10', submitter_name: 'Ten' }];
      const programs = buildOptions(withAccelerator, MAP).program;
      expect(programs.map(o => o.value)).toEqual(['SP02', 'SP03', 'SP10', 'AID']);
      expect(programs[0].label).toBe('SP02 — Climate Action');
      expect(programs[2].label).toBe('SP10 — Ten');
    });

    it('Center: only Centers linked to a page row, by acronym A-Z, label = acronym', () => {
      expect(options.center.map(o => o.label)).toEqual(['CIAT', 'ILRI', 'IRRI']);
      expect(options.center.map(o => o.value)).toEqual(['CENTER-1', 'CENTER-2', 'CENTER-3']);
    });

    it('Center: a code with no catalogue row is kept and labelled by its code', () => {
      const orphan = buildOptions(ROWS, { ...MAP, centerLinks: [...MAP.centerLinks, [1, 'CENTER-99']] });
      expect(orphan.center.find(o => o.value === 'CENTER-99')?.label).toBe('CENTER-99');
    });

    it('Typology: grouped by level in fixed order, present types A-Z under each', () => {
      expect(options.typology.map(g => g.level)).toEqual(['output', 'outcome']);
      expect(options.typology[0]).toEqual({
        level: 'output',
        value: 'output',
        label: 'Output',
        types: [
          { value: 'innovation development', label: 'Innovation development' },
          { value: 'knowledge product', label: 'Knowledge product' },
          { value: 'other output', label: 'Other output' }
        ]
      });
      expect(options.typology[1].types).toEqual([{ value: 'policy change', label: 'Policy change' }]);
    });

    it('Typology: unclassified rows get their own last group', () => {
      const withOdd = buildOptions([...ROWS, { id: 6, result_type: 'Something new' }, { id: 7 }], MAP);
      const last = withOdd.typology[withOdd.typology.length - 1];
      expect(last.level).toBe('unclassified');
      expect(last.value).toBe('unclassified');
      expect(last.types).toEqual([{ value: 'something new', label: 'Something new' }]);
    });

    it('Status: always the six slots, in the status section order', () => {
      expect(options.status.map(o => o.value)).toEqual(['editing', 'in-qa', 'submitted', 'approved', 'rejected', 'discontinued']);
      expect(options.status.map(o => o.label)).toEqual(['Editing', 'In QA', 'Submitted', 'Approved', 'Rejected', 'Discontinued']);
    });

    it('with no map, Project and Center are empty and the other three still build', () => {
      const noMap = buildOptions(ROWS, null);
      expect(noMap.project).toEqual([]);
      expect(noMap.center).toEqual([]);
      expect(noMap.program.length).toBe(2);
      expect(noMap.status.length).toBe(6);
    });
  });

  describe('sanitize (R-14)', () => {
    const options = buildOptions(ROWS, MAP);

    it('drops unknown values per dimension and keeps the known ones', () => {
      const out = sanitize(
        sel({ program: ['SP02', 'ZZ99'], project: ['10', '777'], center: ['CENTER-1', 'NOPE'], typology: ['output', 'knowledge product', 'bogus'], status: ['editing', 'nope'] }),
        options
      );
      expect([...out.program]).toEqual(['SP02']);
      expect([...out.project]).toEqual(['10']);
      expect([...out.center]).toEqual(['CENTER-1']);
      expect([...out.typology]).toEqual(['output', 'knowledge product']);
      expect([...out.status]).toEqual(['editing']);
    });

    it('does not mutate its input', () => {
      const input = sel({ program: ['ZZ99'] });
      sanitize(input, options);
      expect([...input.program]).toEqual(['ZZ99']);
    });
  });

  describe('URL codec (R-14, DD-11)', () => {
    it('S-14.1: parse then sanitize drops ZZ99 and keeps SP02 and editing', () => {
      const parsed = parseQueryParams('?program=SP02,ZZ99&status=editing');
      expect([...parsed.program]).toEqual(['SP02', 'ZZ99']);
      const clean = sanitize(parsed, buildOptions(ROWS, MAP));
      expect([...clean.program]).toEqual(['SP02']);
      expect([...clean.status]).toEqual(['editing']);
      expect(toQueryParams(clean)).toEqual({ program: 'SP02', status: 'editing' });
    });

    it('toQueryParams omits empty dimensions', () => {
      expect(toQueryParams(EMPTY_SELECTION)).toEqual({});
      expect(toQueryParams(sel({ center: ['CENTER-1', 'CENTER-2'] }))).toEqual({ center: 'CENTER-1,CENTER-2' });
    });

    it('round-trips a type name with a comma, a space and a percent sign through an object and a raw query string', () => {
      const original = sel({ typology: ['output', 'weird, name 100%', 'knowledge product'], program: ['SP02'] });
      const params = toQueryParams(original);
      const fromObject = parseQueryParams(params);
      expect([...fromObject.typology]).toEqual(['output', 'weird, name 100%', 'knowledge product']);
      const raw = `?${new URLSearchParams(params).toString()}`;
      const fromString = parseQueryParams(raw);
      expect([...fromString.typology]).toEqual(['output', 'weird, name 100%', 'knowledge product']);
      expect([...fromString.program]).toEqual(['SP02']);
    });

    it('ignores unknown params, empty pieces and array values', () => {
      const parsed = parseQueryParams({ program: ['SP02', 'SP03'], status: ',editing,,', junk: 'x' });
      expect([...parsed.program]).toEqual(['SP02', 'SP03']);
      expect([...parsed.status]).toEqual(['editing']);
      expect(isActive(parseQueryParams(''))).toBe(false);
      expect(isActive(parseQueryParams({}))).toBe(false);
    });

    it('drops a malformed percent escape instead of throwing', () => {
      const parsed = parseQueryParams({ typology: 'ok,%E0%A4%A' });
      expect([...parsed.typology]).toEqual(['ok']);
    });
  });

  describe('SECTION_HONOURS and notAffectedBy (R-9)', () => {
    it('declares which dimensions each section honours', () => {
      expect(SECTION_HONOURS.kpi).toEqual(FILTER_DIMENSIONS);
      expect(SECTION_HONOURS.status).toEqual(FILTER_DIMENSIONS);
      expect(SECTION_HONOURS.typology).toEqual(FILTER_DIMENSIONS);
      expect(SECTION_HONOURS.centers).toEqual(FILTER_DIMENSIONS);
      expect(SECTION_HONOURS.toc).toEqual(['program']);
      expect(SECTION_HONOURS.projects).toEqual(['program', 'center']);
    });

    it('S-9.1: toc is not affected by Center, Status (bar order); projects by Status; the rest by nothing', () => {
      const selection = sel({ status: ['editing'], center: ['CENTER-1'] });
      expect(notAffectedBy('toc', selection)).toEqual(['center', 'status']);
      expect(notAffectedBy('projects', selection)).toEqual(['status']);
      for (const section of ['kpi', 'status', 'typology', 'centers'] as const) {
        expect(notAffectedBy(section, selection)).toEqual([]);
      }
    });

    it('lists nothing when nothing is active, and ignores a dimension the section honours', () => {
      expect(notAffectedBy('toc', EMPTY_SELECTION)).toEqual([]);
      expect(notAffectedBy('toc', sel({ program: ['SP02'] }))).toEqual([]);
    });

    it('extra adds a dimension (Centers block between cycles: Project), still in bar order, only when active', () => {
      expect(notAffectedBy('centers', sel({ project: ['10'], status: ['editing'] }), ['project'])).toEqual(['project']);
      expect(notAffectedBy('centers', sel({ status: ['editing'] }), ['project'])).toEqual([]);
      expect(notAffectedBy('projects', sel({ project: ['10'], status: ['editing'] }), ['project'])).toEqual(['project', 'status']);
    });
  });

  describe('resultsCenterLinkable (R-5)', () => {
    it('is true for nothing, one Program, one Status, or one of each', () => {
      expect(resultsCenterLinkable(EMPTY_SELECTION)).toBe(true);
      expect(resultsCenterLinkable(sel({ status: ['editing'] }))).toBe(true);
      expect(resultsCenterLinkable(sel({ status: ['editing'], program: ['SP02'] }))).toBe(true);
    });

    it('S-5.2 BUT: false with a Center also selected', () => {
      expect(resultsCenterLinkable(sel({ status: ['editing'], program: ['SP02'], center: ['CENTER-1'] }))).toBe(false);
    });

    it('S-5.2 AND: false with two statuses, or two programs', () => {
      expect(resultsCenterLinkable(sel({ status: ['editing', 'approved'] }))).toBe(false);
      expect(resultsCenterLinkable(sel({ program: ['SP02', 'SP03'] }))).toBe(false);
    });

    it('is false with a Project or a Typology selected', () => {
      expect(resultsCenterLinkable(sel({ project: ['10'] }))).toBe(false);
      expect(resultsCenterLinkable(sel({ typology: ['output'] }))).toBe(false);
    });
  });
});
