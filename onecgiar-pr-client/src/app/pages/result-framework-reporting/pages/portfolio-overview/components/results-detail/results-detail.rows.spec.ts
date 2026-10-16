// @akili-spec changes/portfolio-overview-revamp/filtered-detail-export (FDE-T-1)
// Expected values are hard-coded from requirements.md scenarios, never computed with the code under test.
import type { PortfolioResultDimensions } from '../../../../../../shared/interfaces/portfolio-result-dimensions.interface';
import type { RawResult } from '../../services/portfolio-overview.service';
import {
  buildDetailLabels,
  exportFileName,
  pageOf,
  resultUrl,
  searchRows,
  sortRows,
  toDetailRows,
  toExportRows,
  type DetailLabels,
  type DetailRow
} from './results-detail.rows';

const row = (over: Partial<RawResult> = {}): RawResult => ({
  id: 1,
  result_code: 100,
  title: 'A title',
  result_type: 'Knowledge product',
  submitter: 'SP02',
  source_name: 'W1/W2',
  status_name: 'Editing',
  status_id: 1,
  phase_name: 'Reporting 2026 - P25',
  version_id: 25,
  is_replicated: 0,
  lead_center: 'CIAT',
  ...over
});

const NO_LABELS: DetailLabels = { projects: new Map(), centers: new Map() };

const dims = (): PortfolioResultDimensions => ({
  versionId: 25,
  phaseName: 'Reporting 2026 - P25',
  projectLinks: [
    [1, 7],
    [1, 8]
  ],
  centerLinks: [
    [1, 'C1'],
    [1, 'C2'],
    [1, 'C3']
  ],
  projects: [
    { id: 7, shortName: 'Zeta', fullName: 'Zeta full' },
    { id: 8, shortName: 'Alpha', fullName: null }
  ],
  centers: [
    { code: 'C1', acronym: 'CIAT', name: 'Alliance' },
    { code: 'C2', acronym: 'IRRI', name: 'Rice' },
    { code: 'C3', acronym: 'ABC', name: 'Abc' }
  ],
  w3ProjectIds: [7]
});

describe('toDetailRows', () => {
  it('S-2.3 multiplicity: two page rows with the same id give two detail rows', () => {
    const out = toDetailRows([row({ id: 5 }), row({ id: 5, phase_name: 'Other' })], 'ready', NO_LABELS);
    expect(out.length).toBe(2);
    expect(out[1].phase).toBe('Other');
  });

  it('S-3.1: map loading or error gives "Unavailable" in both map columns, never the dash', () => {
    for (const status of ['loading', 'error', 'idle'] as const) {
      const [r] = toDetailRows([row()], status, NO_LABELS);
      expect(r.contributingCenters).toBe('Unavailable');
      expect(r.projects).toBe('Unavailable');
    }
  });

  it('map ready with no links gives the dash', () => {
    const [r] = toDetailRows([row()], 'ready', NO_LABELS);
    expect(r.contributingCenters).toBe('—');
    expect(r.projects).toBe('—');
  });

  it('map ready: contributing = map acronyms minus lead, A to Z; projects short names A to Z', () => {
    const labels = buildDetailLabels(dims());
    const [r] = toDetailRows([row({ lead_center: 'CIAT' })], 'ready', labels);
    expect(r.contributingCenters).toBe('ABC, IRRI');
    expect(r.projects).toBe('Alpha, Zeta');
  });

  it('unknown type gives Level "Unclassified"; known types map like the typology block', () => {
    const [a, b, c] = toDetailRows(
      [row({ result_type: 'Mystery' }), row({ result_type: 'Policy change' }), row({ result_type: 'Knowledge product' })],
      'ready',
      NO_LABELS
    );
    expect(a.level).toBe('Unclassified');
    expect(b.level).toBe('Outcome');
    expect(c.level).toBe('Output');
  });

  it('empty fields read the dash; source, status and origin read like the sections', () => {
    const [r] = toDetailRows(
      [row({ result_type: '', submitter: '', lead_center: null, source_name: 'W3/Bilaterals', status_name: 'Quality Assessed', status_id: 2, is_replicated: '1' })],
      'ready',
      NO_LABELS
    );
    expect(r.type).toBe('—');
    expect(r.program).toBe('—');
    expect(r.leadCenter).toBe('—');
    expect(r.source).toBe('W3/Bilateral');
    expect(r.status).toBe('In QA');
    expect(r.origin).toBe('Replicated');
  });

  it('origin is New unless is_replicated is 1, "1" or true', () => {
    const out = toDetailRows([row({ is_replicated: 0 }), row({ is_replicated: null }), row({ is_replicated: true })], 'ready', NO_LABELS);
    expect(out.map(r => r.origin)).toEqual(['New', 'New', 'Replicated']);
  });
});

const thirty = (): DetailRow[] =>
  toDetailRows(
    Array.from({ length: 30 }, (_, i) => row({ id: i, result_code: i + 1, title: `Title ${String.fromCharCode(97 + ((i * 7) % 26))}${i}` })),
    'ready',
    NO_LABELS
  );

describe('sortRows + pageOf (S-4.1: whole set, then page)', () => {
  it('sorts 30 rows by title asc and page 1 holds the first 25 of the WHOLE set', () => {
    // Titles are "Title <letter><i>" with letter = (i*7)%26: i=0 -> a0, i=26 -> a26 (182%26=0), i=15 -> b15 (105%26=1) ...
    const sorted = sortRows(thirty(), 'title', 'asc');
    const titles = sorted.map(r => r.title);
    expect(titles.slice(0, 3)).toEqual(['Title a0', 'Title a26', 'Title b15']);
    expect(titles[29]).toBe('Title z11');
    const page = pageOf(sorted, 1, 25);
    expect(page.rows.length).toBe(25);
    expect(page.rows[0].title).toBe('Title a0');
    expect(page.rows.map(r => r.title)).not.toContain('Title z11');
  });

  it('code sorts numerically: 9 before 10 ascending; descending puts 100 first', () => {
    const rows = toDetailRows([row({ result_code: 10 }), row({ result_code: 9 }), row({ result_code: 100 })], 'ready', NO_LABELS);
    expect(sortRows(rows, 'code', 'asc').map(r => r.code)).toEqual(['9', '10', '100']);
    expect(sortRows(rows, 'code', 'desc').map(r => r.code)).toEqual(['100', '10', '9']);
  });

  it('does not mutate the input', () => {
    const rows = toDetailRows([row({ result_code: 2 }), row({ result_code: 1 })], 'ready', NO_LABELS);
    sortRows(rows, 'code', 'asc');
    expect(rows.map(r => r.code)).toEqual(['2', '1']);
  });

  it('pageOf: range, pages and clamping', () => {
    const rows = thirty();
    const p2 = pageOf(rows, 2, 25);
    expect(p2.rows.length).toBe(5);
    expect(p2).toMatchObject({ page: 2, from: 26, to: 30, total: 30, pages: 2 });
    expect(pageOf(rows, 99, 25).page).toBe(2);
    expect(pageOf(rows, -3, 25).page).toBe(1);
    expect(pageOf([], 1, 25)).toMatchObject({ rows: [], from: 0, to: 0, total: 0, pages: 1, page: 1 });
  });
});

describe('searchRows (S-5.1)', () => {
  const rows = (): DetailRow[] => {
    const base = Array.from({ length: 30 }, (_, i) => row({ id: i, result_code: 1000 + i, title: i < 12 ? `Drought tolerance ${i}` : `Other ${i}` }));
    return toDetailRows(base, 'ready', NO_LABELS);
  };

  it('"  DROUGHT " matches the 12 titles starting with Drought', () => {
    expect(searchRows(rows(), '  DROUGHT ').length).toBe(12);
  });

  it('code search matches by substring', () => {
    expect(searchRows(rows(), '1002').map(r => r.code)).toEqual(['1002']);
    expect(searchRows(rows(), '100').length).toBe(10);
  });

  it('blank text returns the same array; no hits returns an empty array', () => {
    const all = rows();
    expect(searchRows(all, '   ')).toBe(all);
    expect(searchRows(all, 'zzzz')).toEqual([]);
  });
});

describe('export (S-8.1, S-8.2)', () => {
  it('toExportRows keys follow R-3 order plus Link, with the full title and no creator fields', () => {
    const long = 'x'.repeat(300);
    const [r] = toExportRows(toDetailRows([row({ title: long, result_code: 55, version_id: 25 })], 'ready', NO_LABELS), 'https://pr.example');
    expect(Object.keys(r)).toEqual([
      'Code',
      'Title',
      'Type',
      'Level',
      'P/A',
      'Source',
      'Status',
      'Origin',
      'Lead Center',
      'Contributing Centers',
      'Projects',
      'Phase',
      'Link'
    ]);
    expect(r['Title']).toBe(long);
    expect(r['Link']).toBe('https://pr.example/result/result-detail/55/general-information?phase=25');
    for (const key of Object.keys(r)) expect(key.toLowerCase()).not.toMatch(/creat|email|user/);
  });

  it('S-8.2: map unavailable gives "Unavailable" in both file cells', () => {
    const [r] = toExportRows(toDetailRows([row()], 'error', NO_LABELS), 'https://pr.example');
    expect(r['Contributing Centers']).toBe('Unavailable');
    expect(r['Projects']).toBe('Unavailable');
  });

  it('exportFileName: slug, date, _partial', () => {
    const date = new Date(2026, 9, 16);
    expect(exportFileName('Reporting 2026 - P25', date, false)).toBe('PRMS_portfolio_results_Reporting_2026_-_P25_2026-10-16.xlsx');
    expect(exportFileName('Reporting 2026 - P25', date, true)).toBe('PRMS_portfolio_results_Reporting_2026_-_P25_2026-10-16_partial.xlsx');
  });

  it('resultUrl follows the result-detail route with ?phase=', () => {
    expect(resultUrl(1234, 25, 'https://pr.example')).toBe('https://pr.example/result/result-detail/1234/general-information?phase=25');
  });
});
