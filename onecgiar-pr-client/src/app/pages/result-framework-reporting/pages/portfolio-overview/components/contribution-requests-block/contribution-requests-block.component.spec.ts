// @akili-spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa (CRP-T-3)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortfolioContributionRequestsBlockComponent } from './contribution-requests-block.component';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { ContributionRequestCounts, PortfolioContributionRequests } from '../../../../../../shared/interfaces/portfolio-contribution-requests.interface';
import { notAffectedBy, EMPTY_SELECTION } from '../../services/portfolio-filters';

const URL_PART = 'portfolio/contribution-requests';
const counts = (pending = 0, accepted = 0, declined = 0): ContributionRequestCounts => ({ pending, accepted, declined });

// totals.pending = 3 (each request once); SP01 asked SP05 and SP05 asked SP02, so SP05 shows received 1 and sent 1.
const payload = (over: Partial<PortfolioContributionRequests> = {}): { response: PortfolioContributionRequests } => ({
  response: {
    versionId: 36,
    phaseYear: 2026,
    totals: counts(3, 2, 1),
    byProgram: [
      { initiativeId: 1, code: 'SP01', shortName: 'One', sent: counts(1), received: counts() },
      { initiativeId: 2, code: 'SP02', shortName: 'Two', sent: counts(), received: counts(1, 1, 0) },
      { initiativeId: 5, code: 'SP05', shortName: 'Five', sent: counts(1, 1, 1), received: counts(2, 0, 0) }
    ],
    pending: [
      { requestId: 1, resultCode: 2001, title: 'Newer result', requesterCode: 'SP01', approvingCode: 'SP05', requestedDate: '2026-10-20T00:00:00.000Z' },
      { requestId: 2, resultCode: 2002, title: 'Older result', requesterCode: 'SP05', approvingCode: 'SP02', requestedDate: '2026-09-01T00:00:00.000Z' },
      { requestId: 3, resultCode: 2003, title: 'No date result', requesterCode: 'SP02', approvingCode: 'SP05', requestedDate: null }
    ],
    ...over
  }
});

describe('PortfolioContributionRequestsBlockComponent (CRP-T-3)', () => {
  const copy = PORTFOLIO_OVERVIEW_COPY.contributions;
  let http: HttpTestingController;
  let spy: jest.SpyInstance;

  function create(versionId: number | null = 36) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    spy = jest.spyOn(TestBed.inject(ResultsApiService), 'GET_PortfolioContributionRequests');
    const fixture = TestBed.createComponent(PortfolioContributionRequestsBlockComponent);
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
  const rowCodes = (f: Fixture) => qa(f, '[data-testid="contributions-row-label"]').map(el => text(el));

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  describe('fetching (CRP-R-3, CRP-R-4)', () => {
    it('one versionId means exactly one request, with the version in the query', async () => {
      const f = create(36);
      const reqs = pending();
      expect(reqs).toHaveLength(1);
      expect(reqs[0].request.url).toContain('versionId=36');
      await answer(f, reqs[0]);
      expect(spy).toHaveBeenCalledTimes(1);
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
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('changing a NON-empty `programs` set never calls the API again (input that must fail: a 2nd call)', async () => {
      const f = create(36);
      await answer(f, pending()[0]);
      expect(spy).toHaveBeenCalledTimes(1);
      f.componentRef.setInput('programs', new Set(['SP05']));
      f.detectChanges();
      f.componentRef.setInput('programs', new Set(['SP01', 'SP02']));
      f.detectChanges();
      f.componentRef.setInput('programs', new Set<string>());
      f.detectChanges();
      expect(pending()).toHaveLength(0);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('states (CRP-R-3)', () => {
    it('skeleton while loading, then ready with the table; no percent or NaN at any point', async () => {
      const f = create();
      expect(q(f, '[data-testid="contributions-skeleton"]')).not.toBeNull();
      expect(q(f, '[data-testid="contributions-table"]')).toBeNull();
      expect(text(q(f, '[data-testid="contributions-block"]'))).not.toMatch(/%|NaN/);
      await answer(f, pending()[0]);
      expect(q(f, '[data-testid="contributions-skeleton"]')).toBeNull();
      expect(q(f, '[data-testid="contributions-table"]')).not.toBeNull();
      expect(text(q(f, 'h2'))).toBe(copy.title);
      expect(text(q(f, '[data-testid="contributions-block"]'))).not.toMatch(/%|NaN/);
    });

    it('error shows a generic message with Retry, leaks nothing, and Retry makes exactly one more request', async () => {
      const f = create();
      pending()[0].flush({ message: 'SELECT * FROM share_result_request WHERE secret' }, { status: 500, statusText: 'Server Error http://internal.example/api' });
      f.detectChanges();
      expect(text(q(f, '[data-testid="contributions-error-text"]'))).toBe(copy.error);
      expect(text(q(f, '[data-testid="contributions-block"]'))).not.toMatch(/SELECT|internal\.example|500/);
      (q(f, '[data-testid="contributions-retry"]') as HTMLElement).click();
      f.detectChanges();
      const again = pending();
      expect(again).toHaveLength(1);
      expect(spy).toHaveBeenCalledTimes(2);
      await answer(f, again[0]);
      expect(q(f, '[data-testid="contributions-table"]')).not.toBeNull();
    });

    it('empty phase: message and no table', async () => {
      const f = create();
      await answer(f, pending()[0], payload({ totals: counts(), byProgram: [], pending: [] }));
      expect(text(q(f, '[data-testid="contributions-empty"]'))).toBe('No contribution requests in this phase');
      expect(q(f, '[data-testid="contributions-table"]')).toBeNull();
      expect(q(f, '[data-testid="contributions-kpis"]')).toBeNull();
    });
  });

  describe('ready (CRP-R-1, R-6)', () => {
    it('KPI row shows the portfolio totals (each request once), not the per-side sums', async () => {
      const f = create();
      await answer(f, pending()[0]);
      const values = qa(f, '[data-testid="contributions-kpi-value"]').map(el => text(el));
      expect(values).toEqual(['3', '2', '1']);
      expect(q(f, '[data-testid="contributions-totals-caption"]')).toBeNull();
    });

    it('rows ordered by received Pending desc then code', async () => {
      const f = create();
      await answer(f, pending()[0]);
      expect(rowCodes(f)).toEqual(['SP05', 'SP02', 'SP01']);
    });

    it('header phase chip shows the phase year once ready, and not while loading', async () => {
      const f = create();
      expect(q(f, '[data-testid="contributions-phase"]')).toBeNull();
      await answer(f, pending()[0]);
      const chip = q(f, '[data-testid="contributions-phase"]');
      expect(Array.from(chip?.querySelectorAll('span') ?? []).map(el => text(el))).toEqual([copy.phaseLabel, '2026']);
    });

    it('table has a caption and header cells with scope', async () => {
      const f = create();
      await answer(f, pending()[0]);
      expect(text(q(f, '[data-testid="contributions-table"] caption'))).toBe(copy.tableCaption);
      expect(qa(f, '[data-testid="contributions-table"] thead th').every(th => th.getAttribute('scope'))).toBe(true);
    });
  });

  describe('Program filter (CRP-R-4)', () => {
    it('narrows the rows and the All pending list; totals stay unchanged and the whole-portfolio note appears', async () => {
      const f = create();
      await answer(f, pending()[0]);
      f.componentRef.setInput('programs', new Set(['SP01']));
      f.detectChanges();
      expect(rowCodes(f)).toEqual(['SP01']);
      expect(qa(f, '[data-testid="contributions-kpi-value"]').map(el => text(el))).toEqual(['3', '2', '1']);
      expect(text(q(f, '[data-testid="contributions-totals-caption"]'))).toBe('Totals cover the whole portfolio');
      expect(text(q(f, '[data-testid="contributions-all-toggle"]'))).toBe(copy.allPending(1));
      expect(text(q(f, '[data-testid="contributions-block"]'))).not.toMatch(/%/);
    });

    it('a Program filter that matches no row says so, not the empty-phase message', async () => {
      const f = create();
      await answer(f, pending()[0]);
      f.componentRef.setInput('programs', new Set(['SP99']));
      f.detectChanges();
      expect(text(q(f, '[data-testid="contributions-no-rows"]'))).toBe(copy.noMatch);
    });

    it('not-affected text lists Funding when active, via notAffectedBy contributions with extra funding', async () => {
      const f = create();
      await answer(f, pending()[0]);
      const selection = { ...EMPTY_SELECTION, funding: new Set(['bilateral']), status: new Set(['editing']) } as typeof EMPTY_SELECTION;
      f.componentRef.setInput('notAffected', notAffectedBy('contributions', selection, ['funding']));
      f.detectChanges();
      const note = text(q(f, '[data-testid="contributions-not-affected"]'));
      expect(note).toContain('Funding source');
      expect(note).toContain('Status');
    });

    it('no not-affected text when nothing is listed', async () => {
      const f = create();
      await answer(f, pending()[0]);
      expect(q(f, '[data-testid="contributions-not-affected"]')).toBeNull();
    });
  });

  describe('pending lists (CRP-R-2)', () => {
    it('the expand button toggles aria-expanded and shows that P/A pending requests (requester or approver), oldest first', async () => {
      const f = create();
      await answer(f, pending()[0]);
      const button = qa(f, '[data-testid="contributions-expand"]')[0]; // SP05 is first
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(q(f, '[data-testid="contributions-detail"]')).toBeNull();
      button.click();
      f.detectChanges();
      expect(qa(f, '[data-testid="contributions-expand"]')[0].getAttribute('aria-expanded')).toBe('true');
      const codes = qa(f, '[data-testid="contributions-detail"] [data-testid="contributions-result-link"]').map(a => text(a));
      expect(codes).toEqual(['2002', '2001', '2003']);
      qa(f, '[data-testid="contributions-expand"]')[0].click();
      f.detectChanges();
      expect(qa(f, '[data-testid="contributions-expand"]')[0].getAttribute('aria-expanded')).toBe('false');
      expect(q(f, '[data-testid="contributions-detail"]')).toBeNull();
    });

    it('the result link opens in a new tab with noopener and carries the phase', async () => {
      const f = create();
      await answer(f, pending()[0]);
      f.componentRef.instance.toggleAll();
      f.detectChanges();
      const link = q(f, '[data-testid="contributions-result-link"]') as HTMLAnchorElement;
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('href')).toContain('/result/result-detail/2002/general-information?phase=36');
    });

    it('All pending (N) toggles the full list, oldest first, with from to and a no-date row tolerated', async () => {
      const f = create();
      await answer(f, pending()[0]);
      const toggle = q(f, '[data-testid="contributions-all-toggle"]') as HTMLElement;
      expect(text(toggle)).toBe(copy.allPending(3));
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(q(f, '[data-testid="contributions-all-list"]')).toBeNull();
      toggle.click();
      f.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      const rows = qa(f, '[data-testid="contributions-all-list"] [data-testid="contributions-pending-row"]').map(r => text(r));
      expect(rows).toHaveLength(3);
      expect(rows[0]).toContain('2002');
      expect(rows[0]).toContain('SP05 → SP02');
      expect(rows[0]).toContain('2026-09-01');
      expect(rows[1]).toContain('2001');
      expect(rows[2]).toContain('2003');
      expect(rows[2]).toContain(copy.noDate);
      expect(text(q(f, '[data-testid="contributions-block"]'))).not.toMatch(/%|NaN/);
    });
  });
});
