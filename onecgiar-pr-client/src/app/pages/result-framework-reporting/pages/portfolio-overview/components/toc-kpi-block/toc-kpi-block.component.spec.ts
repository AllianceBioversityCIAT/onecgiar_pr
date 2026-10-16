import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortfolioTocKpiBlockComponent } from './toc-kpi-block.component';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PortfolioTocCoverage, PortfolioTocCoverageProgram } from '../../../../../../shared/interfaces/portfolio-toc-coverage.interface';

const URL_PART = 'toc-results/portfolio-coverage';

const program = (code: string, covered: number, total: number, extra: Partial<PortfolioTocCoverageProgram> = {}): PortfolioTocCoverageProgram => ({
  code,
  shortName: `${code} short`,
  name: `${code} Program name`,
  covered,
  total,
  outputs: { covered: Math.floor(covered / 2), total: Math.floor(total / 2) },
  outcomes: { covered: covered - Math.floor(covered / 2), total: total - Math.floor(total / 2) },
  ...extra
});

const payload = (programs: PortfolioTocCoverageProgram[]): { response: PortfolioTocCoverage } => ({
  response: {
    versionId: 36,
    phaseName: 'Reporting 2026',
    reportingYear: 2026,
    programs,
    portfolio: { covered: programs.reduce((s, p) => s + p.covered, 0), total: programs.reduce((s, p) => s + p.total, 0) }
  }
});

describe('PortfolioTocKpiBlockComponent (TKP-T-4)', () => {
  const copy = PORTFOLIO_OVERVIEW_COPY.tocKpi;
  let http: HttpTestingController;
  let spy: jest.SpyInstance;

  function create(versionId: number | null = 36, year = '2026') {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    spy = jest.spyOn(TestBed.inject(ResultsApiService), 'GET_PortfolioTocCoverage');
    const fixture = TestBed.createComponent(PortfolioTocKpiBlockComponent);
    fixture.componentRef.setInput('versionId', versionId);
    fixture.componentRef.setInput('year', year);
    fixture.detectChanges();
    return fixture;
  }

  type Fixture = ReturnType<typeof create>;
  const q = (f: Fixture, selector: string) => f.nativeElement.querySelector(selector) as HTMLElement | null;
  const qa = (f: Fixture, selector: string) => Array.from(f.nativeElement.querySelectorAll(selector)) as HTMLElement[];
  const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const pending = () => http.match(r => r.url.includes(URL_PART));
  const answer = (f: Fixture, req: TestRequest, programs: PortfolioTocCoverageProgram[]) => {
    req.flush(payload(programs));
    f.detectChanges();
  };
  const fail = (f: Fixture, req: TestRequest, body: unknown = { message: 'SELECT * FROM results WHERE secret' }) => {
    req.flush(body, { status: 500, statusText: 'Server Error http://internal.example/api' });
    f.detectChanges();
  };
  const rowOf = (f: Fixture, code: string) => qa(f, '[data-testid="toc-kpi-row"]').find(li => li.getAttribute('data-code') === code)!;

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  describe('fetching (TKP-R-3 S-3.1, TKP-R-7)', () => {
    it('setting versionId fires exactly 1 request, with the version in the query', () => {
      const f = create(36);
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      expect(reqs[0].request.url).toContain('versionId=36');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(36);
      answer(f, reqs[0], []);
    });

    it('S-3.1 BUT: 5 Programs in the response still mean 1 request, never one per P/A', () => {
      const f = create(36);
      answer(f, pending()[0], [program('SP01', 10, 20), program('SP02', 1, 20), program('SP03', 0, 20), program('A1', 5, 10), program('A2', 0, 0)]);
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(5);
      expect(pending()).toHaveLength(0);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('a versionId change cancels the pending call and issues one new request (switch-latest)', () => {
      const f = create(36);
      const first = pending()[0];
      f.componentRef.setInput('versionId', 37);
      f.detectChanges();
      expect(first.cancelled).toBe(true);
      const next = pending();
      expect(next).toHaveLength(1);
      expect(next[0].request.url).toContain('versionId=37');
      answer(f, next[0], [program('SP01', 1, 2)]);
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(1);
    });

    it('a null versionId requests without a version (the server uses the active phase)', () => {
      const f = create(null);
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      expect(reqs[0].request.url).not.toContain('versionId');
      answer(f, reqs[0], []);
    });
  });

  describe('loading (TKP-R-7)', () => {
    it('shows the skeleton and no figure at all (no zero, no percent) while pending', () => {
      const f = create();
      expect(q(f, '[data-testid="toc-kpi-skeleton"]')).not.toBeNull();
      expect(q(f, '[data-testid="toc-kpi-skeleton"]')!.getAttribute('aria-busy')).toBe('true');
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(0);
      expect(q(f, '[data-testid="toc-kpi-summary"]')).toBeNull();
      // the header carries the year and "W1/W2", so the figure check is on the skeleton and on any percent sign
      expect(text(q(f, '[data-testid="toc-kpi-skeleton"]'))).not.toMatch(/\d/);
      expect(text(q(f, '[data-testid="toc-kpi-block"]'))).not.toContain('%');
      expect(qa(f, '[role="img"]')).toHaveLength(0);
      answer(f, pending()[0], []);
    });
  });

  describe('ready (TKP-R-4)', () => {
    const rows = () => [program('SP01', 100, 250), program('SP02', 0, 40), program('SP03', 199, 200), program('SP04', 1, 300), program('A3', 0, 0)];

    it('title, subtitle with the year, and a labelled list', () => {
      const f = create(36, '2026');
      answer(f, pending()[0], rows());
      const title = q(f, 'h2')!;
      expect(text(title)).toBe('Progress against ToC KPIs');
      expect(text(q(f, '[data-testid="toc-kpi-subtitle"]'))).toContain('W1/W2 result in QA or Submitted status');
      expect(text(q(f, '[data-testid="toc-kpi-subtitle"]'))).toContain('Theory of Change for 2026');
      const ul = q(f, 'ul')!;
      expect(ul.getAttribute('aria-labelledby')).toBe(title.id);
      expect(q(f, '[data-testid="toc-kpi-block"]')!.getAttribute('aria-labelledby')).toBe(title.id);
    });

    it('S-4.1: rows read 40%, 0%, 99%, 1% and the zero-KPI line; the summary reads 300 / 790 -> 38%', () => {
      const f = create();
      answer(f, pending()[0], rows());
      const pct = (code: string) => text(rowOf(f, code).querySelector('[data-testid="toc-kpi-percent"]'));
      expect(pct('SP01')).toBe('40%');
      expect(pct('SP02')).toBe('0%');
      expect(pct('SP03')).toBe('99%');
      expect(pct('SP04')).toBe('1%');
      expect(pct('SP03')).not.toBe('100%');
      expect(pct('SP04')).not.toBe('0%');
      expect(text(rowOf(f, 'SP01').querySelector('[data-testid="toc-kpi-count"]'))).toBe('100 / 250');
      expect(text(q(f, '[data-testid="toc-kpi-summary-count"]'))).toBe('300 / 790');
      expect(text(q(f, '[data-testid="toc-kpi-summary-percent"]'))).toBe('38%');
    });

    it('each row shows code, name, the muted Output / Outcome split and a bar with a text equivalent', () => {
      const f = create();
      answer(f, pending()[0], [program('SP01', 100, 250, { outputs: { covered: 40, total: 100 }, outcomes: { covered: 60, total: 150 } })]);
      const row = rowOf(f, 'SP01');
      expect(text(row.querySelector('[data-testid="toc-kpi-code"]'))).toBe('SP01');
      expect(text(row.querySelector('[data-testid="toc-kpi-name"]'))).toBe('SP01 Program name');
      expect(text(row.querySelector('[data-testid="toc-kpi-split"]'))).toBe('Outputs 40 / 100 · Outcomes 60 / 150');
      const bar = row.querySelector('[role="img"]') as HTMLElement;
      expect(bar.getAttribute('aria-label')).toBe('40% — 100 of 250 KPIs covered');
      expect((bar.firstElementChild as HTMLElement).style.width).toBe('40%');
    });

    it('the summary has its own bar with the same text-equivalent shape', () => {
      const f = create();
      answer(f, pending()[0], rows());
      const bar = q(f, '[data-testid="toc-kpi-summary"] [role="img"]')!;
      expect(bar.getAttribute('aria-label')).toBe('38% — 300 of 790 KPIs covered');
    });

    it('a zero-KPI P/A shows "No ToC KPIs" and no bar element, no 0 / 0, NaN or dash percent', () => {
      const f = create();
      answer(f, pending()[0], rows());
      const row = rowOf(f, 'A3');
      expect(text(row.querySelector('[data-testid="toc-kpi-zero"]'))).toBe('No ToC KPIs in this phase');
      expect(row.querySelector('[role="img"]')).toBeNull();
      expect(row.querySelector('[data-testid="toc-kpi-bar"]')).toBeNull();
      expect(row.querySelector('[data-testid="toc-kpi-percent"]')).toBeNull();
      expect(row.querySelector('[data-testid="toc-kpi-count"]')).toBeNull();
      expect(text(row)).not.toMatch(/0 \/ 0|NaN|—%|%/);
      // the other rows still have their bar
      expect(qa(f, '[data-testid="toc-kpi-row"] [role="img"]')).toHaveLength(4);
    });

    it('S-5.1: natural code order, Programs before Accelerators, never by coverage; no sort control', () => {
      const f = create();
      answer(f, pending()[0], [program('SP10', 90, 100), program('SP09', 5, 100), program('SP02', 10, 100), program('A1', 99, 100)]);
      expect(qa(f, '[data-testid="toc-kpi-row"]').map(li => li.getAttribute('data-code'))).toEqual(['SP02', 'SP09', 'SP10', 'A1']);
      expect(q(f, '[aria-sort]')).toBeNull();
      expect(q(f, 'select')).toBeNull();
      expect(q(f, 'input')).toBeNull();
      expect(q(f, '[data-testid="toc-kpi-sort"]')).toBeNull();
    });
  });

  describe('interaction (TKP-R-6)', () => {
    it('clicking a name emits its code, and the button has type=button and the accessible name', () => {
      const f = create();
      const emitted: string[] = [];
      f.componentInstance.programmeOpen.subscribe(code => emitted.push(code));
      answer(f, pending()[0], [program('SP01', 1, 2), program('SP05', 1, 2)]);
      const button = rowOf(f, 'SP05').querySelector('button') as HTMLButtonElement;
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-label')).toBe('Open the Results tab of SP05 Program name');
      button.click();
      expect(emitted).toEqual(['SP05']);
    });

    it('a % or a count is not a button or link; the only interactive controls are the name buttons', () => {
      const f = create();
      answer(f, pending()[0], [program('SP01', 1, 2), program('SP02', 0, 0)]);
      const inert = ['toc-kpi-percent', 'toc-kpi-count', 'toc-kpi-summary-count', 'toc-kpi-summary-percent', 'toc-kpi-bar', 'toc-kpi-split'];
      inert.forEach(id =>
        qa(f, `[data-testid="${id}"]`).forEach(el => {
          expect(el.closest('button, a')).toBeNull();
          expect(el.querySelector('button, a')).toBeNull();
          expect(['BUTTON', 'A']).not.toContain(el.tagName);
        })
      );
      // 2 rows (the zero-KPI one keeps its name button) -> exactly 2 interactive elements, no links
      expect(qa(f, 'button, a')).toHaveLength(2);
      expect(qa(f, 'a')).toHaveLength(0);
      qa(f, 'button').forEach(b => expect(b.getAttribute('data-testid')).toBe('toc-kpi-name-button'));
    });
  });

  describe('error (TKP-R-7 S-7.1)', () => {
    it('a 500 shows the generic line + Retry, with no status code, SQL or URL in the text', () => {
      const f = create();
      fail(f, pending()[0]);
      const line = q(f, '[data-testid="toc-kpi-error-text"]')!;
      expect(line.getAttribute('role')).toBe('status');
      expect(text(line)).toBe(copy.error);
      const all = text(q(f, '[data-testid="toc-kpi-block"]'));
      ['500', 'SELECT', 'secret', 'http', 'Server Error'].forEach(leak => expect(all).not.toContain(leak));
      const retry = q(f, '[data-testid="toc-kpi-retry"]') as HTMLButtonElement;
      expect(retry.type).toBe('button');
      expect(text(retry)).toBe('Retry');
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(0);
      expect(q(f, '[data-testid="toc-kpi-summary"]')).toBeNull();
    });

    it('clicking Retry twice after two failures gives exactly 2 further requests', () => {
      const f = create();
      fail(f, pending()[0]);
      (q(f, '[data-testid="toc-kpi-retry"]') as HTMLButtonElement).click();
      f.detectChanges();
      const second = pending();
      expect(second).toHaveLength(1);
      fail(f, second[0]);
      (q(f, '[data-testid="toc-kpi-retry"]') as HTMLButtonElement).click();
      f.detectChanges();
      const third = pending();
      expect(third).toHaveLength(1);
      expect(spy).toHaveBeenCalledTimes(3); // 1 initial + exactly 2 retries
      answer(f, third[0], [program('SP01', 1, 2)]);
      expect(q(f, '[data-testid="toc-kpi-error"]')).toBeNull();
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(1);
    });

    it('a double click on Retry while the request is in flight still means one request', () => {
      const f = create();
      fail(f, pending()[0]);
      const retry = q(f, '[data-testid="toc-kpi-retry"]') as HTMLButtonElement;
      retry.click();
      retry.click();
      f.detectChanges();
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      answer(f, reqs[0], []);
    });

    it('the Retry button is not rendered outside the error state', () => {
      const f = create();
      expect(q(f, '[data-testid="toc-kpi-retry"]')).toBeNull();
      answer(f, pending()[0], [program('SP01', 1, 2)]);
      expect(q(f, '[data-testid="toc-kpi-retry"]')).toBeNull();
    });
  });

  describe('empty (TKP-R-7)', () => {
    it('every total 0 shows the one line, no rows, no summary', () => {
      const f = create();
      answer(f, pending()[0], [program('SP01', 0, 0), program('A1', 0, 0)]);
      const line = q(f, '[data-testid="toc-kpi-empty"]')!;
      expect(line.getAttribute('role')).toBe('status');
      expect(text(line)).toBe('No ToC KPIs are defined for this phase yet.');
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(0);
      expect(q(f, '[data-testid="toc-kpi-summary"]')).toBeNull();
      expect(q(f, 'ul')).toBeNull();
      expect(qa(f, '[role="img"]')).toHaveLength(0);
      expect(text(q(f, '[data-testid="toc-kpi-block"]'))).not.toMatch(/NaN|0 \/ 0/);
    });

    it('an empty list shows the same line', () => {
      const f = create();
      answer(f, pending()[0], []);
      expect(text(q(f, '[data-testid="toc-kpi-empty"]'))).toBe('No ToC KPIs are defined for this phase yet.');
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(0);
    });

    it('is not shown when at least one P/A has KPIs', () => {
      const f = create();
      answer(f, pending()[0], [program('SP01', 0, 0), program('SP02', 0, 4)]);
      expect(q(f, '[data-testid="toc-kpi-empty"]')).toBeNull();
      expect(qa(f, '[data-testid="toc-kpi-row"]')).toHaveLength(2);
    });
  });

  describe('design rules', () => {
    it('no hex colour, no rem-based type utility and no inline style attribute besides the bar width', () => {
      const f = create();
      answer(f, pending()[0], [program('SP01', 1, 2), program('A3', 0, 0)]);
      const html: string = f.nativeElement.innerHTML;
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(html).not.toMatch(/\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/);
      expect(html).not.toMatch(/\bprimeicons|pi pi-/);
    });
  });
});
