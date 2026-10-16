// @akili-spec changes/portfolio-overview-revamp/w3-projects-section (WPS-T-4)
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortfolioProjectsBlockComponent } from './projects-block.component';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PortfolioBilateralProjects, ProjectCounts } from '../../../../../../shared/interfaces/portfolio-bilateral-projects.interface';

// ECharts ships ESM; the chart wrapper is mocked the way the other overview specs do it.
const mockChartInstance = { setOption: jest.fn(), resize: jest.fn(), clear: jest.fn(), dispose: jest.fn(), isDisposed: jest.fn(() => false), on: jest.fn() };
jest.mock('echarts/core', () => ({ use: jest.fn(), init: jest.fn(() => mockChartInstance) }));
jest.mock('echarts/charts', () => ({ BarChart: class {}, PieChart: class {}, HeatmapChart: class {}, RadarChart: class {}, TreeChart: class {}, LineChart: class {} }));
jest.mock('echarts/components', () => ({
  TitleComponent: class {}, TooltipComponent: class {}, GridComponent: class {}, DatasetComponent: class {},
  LegendComponent: class {}, VisualMapComponent: class {}, RadarComponent: class {}
}));
jest.mock('echarts/renderers', () => ({ SVGRenderer: class {} }));
jest.mock('echarts/features', () => ({ UniversalTransition: class {}, LabelLayout: class {} }));

const URL_PART = 'portfolio/bilateral-projects';
const counts = (mapped: number, withBilateralResults: number, w1w2Contributors: number): ProjectCounts => ({ mapped, withBilateralResults, w1w2Contributors });

// P/A sum = 3 (2 + 1), totals.mapped = 2: the table total row must read 2.
const payload = (over: Partial<PortfolioBilateralProjects> = {}): { response: PortfolioBilateralProjects } => ({
  response: {
    versionId: 36,
    phaseName: 'Reporting 2026',
    phaseYear: 2026,
    totals: counts(2, 1, 1),
    byProgram: [
      { code: 'SP02', shortName: 'Two', name: 'Program Two', ...counts(1, 0, 0) },
      { code: 'SP01', shortName: 'One', name: 'Program One', ...counts(2, 1, 1) }
    ],
    byCenter: [
      { code: null, acronym: null, name: null, ...counts(1, 0, 0) },
      { code: 'CENTER-03', acronym: 'CIAT-inst', name: 'Alliance', ...counts(1, 1, 1) }
    ],
    unmappedWithBilateralResults: 0,
    ...over
  }
});

describe('PortfolioProjectsBlockComponent (WPS-T-4)', () => {
  const copy = PORTFOLIO_OVERVIEW_COPY.projects;
  let http: HttpTestingController;
  let spy: jest.SpyInstance;

  function create(versionId: number | null = 36) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CentersService, useValue: { getData: jest.fn().mockResolvedValue([{ code: 'CENTER-03', acronym: 'Alliance', name: 'Alliance Bioversity-CIAT' }]) } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    spy = jest.spyOn(TestBed.inject(ResultsApiService), 'GET_PortfolioBilateralProjects');
    const fixture = TestBed.createComponent(PortfolioProjectsBlockComponent);
    fixture.componentRef.setInput('versionId', versionId);
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = ReturnType<typeof create>;
  const q = (f: Fixture, selector: string) => f.nativeElement.querySelector(selector) as HTMLElement | null;
  const qa = (f: Fixture, selector: string) => Array.from(f.nativeElement.querySelectorAll(selector)) as HTMLElement[];
  const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const pending = () => http.match(r => r.url.includes(URL_PART));
  const answer = async (f: Fixture, req: TestRequest, body = payload()) => {
    req.flush(body);
    await f.whenStable();
    f.detectChanges();
  };
  const fail = (f: Fixture, req: TestRequest) => {
    req.flush({ message: 'SELECT * FROM projects WHERE secret' }, { status: 500, statusText: 'Server Error http://internal.example/api' });
    f.detectChanges();
  };
  const click = (f: Fixture, testid: string) => {
    (q(f, `[data-testid="${testid}"]`) as HTMLElement).click();
    f.detectChanges();
  };
  const tableRows = (f: Fixture) => qa(f, '[data-testid="projects-table"] tbody tr').map(tr => Array.from(tr.querySelectorAll('th, td')).map(c => text(c.querySelector('[data-testid="projects-row-label"]') ?? c)));

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  describe('fetching (WPS-R-9 S-9.1)', () => {
    it('one versionId means exactly one request, with the version in the query', async () => {
      const f = create(36);
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      expect(reqs[0].request.url).toContain('versionId=36');
      expect(spy).toHaveBeenCalledTimes(1);
      await answer(f, reqs[0]);
      expect(pending()).toHaveLength(0);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('a null versionId requests without a version', async () => {
      const f = create(null);
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      expect(reqs[0].request.url).not.toContain('versionId');
      await answer(f, reqs[0]);
    });

    it('a versionId change cancels the pending call and issues one new request', async () => {
      const f = create(36);
      const first = pending()[0];
      f.componentRef.setInput('versionId', 37);
      f.detectChanges();
      expect(first.cancelled).toBe(true);
      const next = pending();
      expect(next).toHaveLength(1);
      expect(next[0].request.url).toContain('versionId=37');
      await answer(f, next[0]);
    });
  });

  describe('loading', () => {
    it('shows a skeleton and no figure or percent', async () => {
      const f = create();
      expect(q(f, '[data-testid="projects-skeleton"]')).not.toBeNull();
      expect(q(f, '[data-testid="projects-kpis"]')).toBeNull();
      expect(text(q(f, '[data-testid="projects-block"]'))).not.toMatch(/%|NaN/);
      await answer(f, pending()[0]);
    });
  });

  describe('ready (WPS-R-8)', () => {
    it('title, year subtitle and 3 KPI tiles; % of mapped via the formatter', async () => {
      const f = create();
      await answer(f, pending()[0], payload({ totals: counts(30, 17, 1) }));
      expect(text(q(f, 'h2'))).toBe('W3/Bilateral projects');
      expect(text(q(f, '[data-testid="projects-subtitle"]'))).toContain('2026');
      expect(text(q(f, '[data-testid="projects-kpi-mapped"]'))).toContain('30');
      expect(text(q(f, '[data-testid="projects-kpi-mapped"]'))).not.toContain('%');
      expect(text(q(f, '[data-testid="projects-kpi-with-bilateral"] [data-testid="projects-kpi-value"]'))).toBe('17');
      expect(text(q(f, '[data-testid="projects-kpi-with-bilateral"] [data-testid="projects-kpi-percent"]'))).toBe('56.7% of mapped');
      expect(text(q(f, '[data-testid="projects-kpi-w1w2"] [data-testid="projects-kpi-value"]'))).toBe('1');
      expect(text(q(f, '[data-testid="projects-kpi-w1w2"] [data-testid="projects-kpi-percent"]'))).toBe('3.3% of mapped');
    });

    it('starts on By P/A + Chart: chart host present, table absent, caption visible', async () => {
      const f = create();
      await answer(f, pending()[0]);
      expect(q(f, 'app-pr-viz-chart')).not.toBeNull();
      expect(q(f, '[data-testid="projects-table"]')).toBeNull();
      expect(text(q(f, '[data-testid="projects-multi-caption"]'))).toBe(copy.multiProgramCaption);
      expect(q(f, '[data-testid="projects-tab-program"]')).not.toBeNull();
      expect(q(f, '[data-testid="projects-tab-center"]')).not.toBeNull();
    });

    it('view switch uses aria-pressed; Table replaces the chart', async () => {
      const f = create();
      await answer(f, pending()[0]);
      const chartBtn = q(f, '[data-testid="projects-view-chart"]')!;
      const tableBtn = q(f, '[data-testid="projects-view-table"]')!;
      expect(chartBtn.getAttribute('aria-pressed')).toBe('true');
      expect(tableBtn.getAttribute('aria-pressed')).toBe('false');
      click(f, 'projects-view-table');
      expect(chartBtn.getAttribute('aria-pressed')).toBe('false');
      expect(tableBtn.getAttribute('aria-pressed')).toBe('true');
      expect(q(f, '[data-testid="projects-table"]')).not.toBeNull();
      expect(q(f, 'app-pr-viz-chart')).toBeNull();
      expect(q(f, '[data-testid="projects-table"]')!.closest('.overflow-x-auto')).not.toBeNull();
    });

    it('P/A table: natural code order, and the total row is totals.mapped (2), not the column sum (3)', async () => {
      const f = create();
      await answer(f, pending()[0]);
      click(f, 'projects-view-table');
      const rows = tableRows(f);
      expect(rows.map(r => r[0])).toEqual(['SP01', 'SP02', copy.totalLabel]);
      expect(rows[0].slice(1)).toEqual(['2', '1', '1']);
      expect(rows[2].slice(1)).toEqual(['2', '1', '1']);
      expect(rows[2][1]).not.toBe('3');
      expect(q(f, '[aria-sort]')).toBeNull();
    });

    it('Center dimension: labels from the catalogue, A->Z, Unassigned last, no caption', async () => {
      const f = create();
      await answer(f, pending()[0]);
      click(f, 'projects-tab-center');
      expect(q(f, '[data-testid="projects-multi-caption"]')).toBeNull();
      click(f, 'projects-view-table');
      const rows = tableRows(f);
      expect(rows.map(r => r[0])).toEqual(['Alliance', copy.unassigned, copy.totalLabel]);
    });

    it('the caption is back when returning to By P/A', async () => {
      const f = create();
      await answer(f, pending()[0]);
      click(f, 'projects-tab-center');
      click(f, 'projects-tab-program');
      expect(q(f, '[data-testid="projects-multi-caption"]')).not.toBeNull();
    });

    it('footnote: absent at 0, singular at 1, plural at N', async () => {
      const f0 = create();
      await answer(f0, pending()[0], payload({ unmappedWithBilateralResults: 0 }));
      expect(q(f0, '[data-testid="projects-footnote"]')).toBeNull();
      TestBed.resetTestingModule();

      const f1 = create();
      await answer(f1, pending()[0], payload({ unmappedWithBilateralResults: 1 }));
      expect(text(q(f1, '[data-testid="projects-footnote"]'))).toBe('1 project has W3/Bilateral results but no approved P/A mapping, so it is not counted.');
      TestBed.resetTestingModule();

      const f5 = create();
      await answer(f5, pending()[0], payload({ unmappedWithBilateralResults: 5 }));
      expect(text(q(f5, '[data-testid="projects-footnote"]'))).toBe('5 projects have W3/Bilateral results but no approved P/A mapping, so they are not counted.');
    });
  });

  describe('error (S-9.1)', () => {
    it('a 500 shows the generic line + Retry, nothing of the error object', async () => {
      const f = create();
      fail(f, pending()[0]);
      const line = q(f, '[data-testid="projects-error-text"]')!;
      expect(line.getAttribute('role')).toBe('status');
      expect(text(line)).toBe(copy.error);
      const all = text(q(f, '[data-testid="projects-block"]'));
      ['500', 'SELECT', 'secret', 'http', 'Server Error'].forEach(leak => expect(all).not.toContain(leak));
      expect(q(f, '[data-testid="projects-kpis"]')).toBeNull();
      expect(q(f, 'app-pr-viz-chart')).toBeNull();
    });

    it('Retry in error triggers exactly one request per click', async () => {
      const f = create();
      fail(f, pending()[0]);
      click(f, 'projects-retry');
      const second = pending();
      expect(second).toHaveLength(1);
      fail(f, second[0]);
      click(f, 'projects-retry');
      const third = pending();
      expect(third).toHaveLength(1);
      expect(spy).toHaveBeenCalledTimes(3);
      await answer(f, third[0]);
      expect(q(f, '[data-testid="projects-error"]')).toBeNull();
    });

    it('a double click on Retry is still one request', async () => {
      const f = create();
      fail(f, pending()[0]);
      const retry = q(f, '[data-testid="projects-retry"]') as HTMLButtonElement;
      retry.click();
      retry.click();
      f.detectChanges();
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      await answer(f, reqs[0]);
    });

    it('Retry is not rendered while loading or ready, and retry() while ready does not call', async () => {
      const f = create();
      expect(q(f, '[data-testid="projects-retry"]')).toBeNull();
      await answer(f, pending()[0]);
      expect(q(f, '[data-testid="projects-retry"]')).toBeNull();
      f.componentInstance.retry();
      expect(pending()).toHaveLength(0);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty (mapped = 0)', () => {
    const emptyPayload = () => payload({ totals: counts(0, 0, 0), byProgram: [{ code: 'SP01', shortName: 'One', name: 'One', ...counts(0, 0, 0) }], byCenter: [] });

    it('one status line with the year, no tiles, no chart, no tabs, no NaN / dash / 0 / 0', async () => {
      const f = create();
      await answer(f, pending()[0], emptyPayload());
      const line = q(f, '[data-testid="projects-empty"]')!;
      expect(line.getAttribute('role')).toBe('status');
      expect(text(line)).toBe('No W3/Bilateral projects are mapped to a Program for 2026 yet.');
      expect(q(f, '[data-testid="projects-kpis"]')).toBeNull();
      expect(q(f, 'app-pr-viz-chart')).toBeNull();
      expect(q(f, '[data-testid="projects-table"]')).toBeNull();
      expect(q(f, '[data-testid="projects-tab-program"]')).toBeNull();
      expect(text(q(f, '[data-testid="projects-block"]'))).not.toMatch(/NaN|—%|0 \/ 0|%/);
    });

    it('the unmapped footnote can still show in the empty state', async () => {
      const f = create();
      await answer(f, pending()[0], { response: { ...emptyPayload().response, unmappedWithBilateralResults: 3 } });
      expect(text(q(f, '[data-testid="projects-footnote"]'))).toContain('3 projects');
    });
  });

  describe('design rules', () => {
    it('no hex colour, no rem-based type utility, no primeicons', async () => {
      const f = create();
      await answer(f, pending()[0]);
      click(f, 'projects-view-table');
      // The rendered DOM carries Helm-generated classes (text-sm), so the rem check reads OUR template source.
      const html: string = f.nativeElement.innerHTML;
      const source = readFileSync(join(__dirname, 'projects-block.component.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/);
      expect(source).not.toMatch(/\bprimeicons|pi pi-/);
    });

    it('numbers are font-mono tabular-nums and right-aligned', async () => {
      const f = create();
      await answer(f, pending()[0]);
      click(f, 'projects-view-table');
      const cell = q(f, '[data-testid="projects-table"] tbody td')!;
      expect(cell.className).toContain('font-mono');
      expect(cell.className).toContain('tabular-nums');
      expect(cell.className).toContain('text-right');
    });
  });
});
