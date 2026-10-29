import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { PT_AUTO_RETRY_DELAY_MS, PT_EMPTY_DEFAULT_MESSAGE, PtResultsBrowseComponent } from './pt-results-browse.component';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';

/**
 * Partial / slow Progress Tracker answers (PT note, 2026-10-15): partial lists with a notice,
 * the "preparing" empty state, the timeout → one auto retry → "still working" path, and the
 * Check again control that bypasses the panel's retained state.
 */
describe('PtResultsBrowseComponent — partial and slow answers', () => {
  let component: PtResultsBrowseComponent;
  let fixture: ComponentFixture<PtResultsBrowseComponent>;
  let api: { GET_progressTrackerResults: jest.Mock };

  const proposal = {
    result_key: '8006329bfd49:1',
    result_type: 'other_output',
    result_type_label: 'Other output',
    title: 'Toolkit drafted',
    description: 'A toolkit was drafted.',
    evidence: [],
    countries: [],
    impact_areas: null,
    gender_split: null,
    knowledge_product_handle: null,
    confidence: 0.6,
    rationale: '',
    missing_info: []
  };

  const ok = (results: unknown[], extra: Record<string, unknown> = {}) => ({
    statusCode: 200,
    message: 'ok',
    response: { status: 'ok', results, source: { pt_url: 'https://pt.example.org/kpi?x=1' }, ...extra }
  });
  const unavailable = () => ({ statusCode: 200, message: 'x', response: { status: 'unavailable' } });

  const el = (test: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-test="${test}"]`);

  const open = () => {
    fixture.componentRef.setInput('tocIndicatorId', 123);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    api = { GET_progressTrackerResults: jest.fn().mockReturnValue(of(ok([]))) };
    await TestBed.configureTestingModule({
      imports: [PtResultsBrowseComponent],
      providers: [{ provide: ResultsApiService, useValue: api }]
    }).compileComponents();
    fixture = TestBed.createComponent(PtResultsBrowseComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => jest.useRealTimers());

  describe('loading copy', () => {
    it('sets a 20 to 30 seconds expectation', () => {
      api.GET_progressTrackerResults.mockReturnValue(new Subject());
      open();
      expect(el('pt-loading')?.textContent).toContain('20 to 30 seconds');
      expect(el('pt-loading')?.textContent).not.toContain('up to 20 seconds');
    });
  });

  describe('partial answers (generated_by.complete === false / more_results_expected)', () => {
    it('shows generated_by.notice above the proposals with a Check again button', () => {
      api.GET_progressTrackerResults.mockReturnValue(
        of(ok([proposal], { generated_by: { mode: 'ai', complete: false, notice: 'Two evidence groups are still being drafted.' } }))
      );
      open();

      expect(component.status()).toBe('results');
      const notice = el('pt-partial-notice');
      expect(notice?.textContent).toContain('Two evidence groups are still being drafted.');
      expect(el('pt-check-again-partial')).toBeTruthy();
      // The notice sits before the first proposal card.
      const results = el('pt-results')!;
      const children = Array.from(results.children);
      expect(children.indexOf(notice!)).toBeLessThan(children.indexOf(el('pt-proposal-8006329bfd49:1')!));
    });

    it('uses a default notice when more_results_expected is true and no notice is sent', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'ai', more_results_expected: true } })));
      open();
      expect(el('pt-partial-notice')?.textContent).toContain('still drafting more proposals');
    });

    it('shows no notice for a complete answer, nor for a PT build that sends neither flag (2-oct)', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'ai', complete: true } })));
      open();
      expect(el('pt-partial-notice')).toBeNull();

      fixture.componentRef.setInput('tocIndicatorId', 456);
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'ai' } })));
      fixture.detectChanges();
      expect(el('pt-partial-notice')).toBeNull();
    });

    it('Check again re-requests the same KPI even though the panel is retained, without refresh=true', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'ai', complete: false } })));
      open();
      expect(api.GET_progressTrackerResults).toHaveBeenCalledTimes(1);

      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal, { ...proposal, result_key: '8006329bfd49:2' }])));
      el('pt-check-again-partial')!.click();
      fixture.detectChanges();

      expect(api.GET_progressTrackerResults).toHaveBeenCalledTimes(2);
      expect(api.GET_progressTrackerResults).toHaveBeenLastCalledWith(123, {});
      expect(component.proposals().length).toBe(2);
      expect(el('pt-partial-notice')).toBeNull();
    });

    it('a retained panel does not re-fetch on its own: re-addressing the same KPI still collapses to one call', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'ai', complete: false } })));
      open();
      fixture.componentRef.setInput('tocIndicatorId', null);
      fixture.detectChanges();
      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();
      expect(api.GET_progressTrackerResults).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state variants', () => {
    it.each(['preparing', 'live_drafting_busy', 'live_draft_in_progress'])(
      'template fallback "%s" → preparing, with Check again',
      reason => {
        api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'template', fallback_reason: reason } })));
        open();
        expect(component.status()).toBe('preparing');
        expect(el('pt-preparing')?.textContent).toContain('The Progress Tracker is preparing this KPI, check again in a few minutes');
        expect(el('pt-check-again-preparing')).toBeTruthy();
        expect(el('pt-empty')).toBeNull();
      }
    );

    it('preparation.retry_after_s → preparing, Check again enabled only after the countdown', () => {
      jest.useFakeTimers();
      api.GET_progressTrackerResults.mockReturnValue(
        of(ok([], { generated_by: { mode: 'ai' }, preparation: { status: 'preparing', retry_after_s: 3, pending_group_ids: ['g1'] } }))
      );
      open();

      const button = () => el('pt-check-again-preparing') as HTMLButtonElement;
      expect(component.status()).toBe('preparing');
      expect(button().disabled).toBe(true);
      expect(el('pt-check-again-cooldown')?.textContent).toContain('3');

      jest.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(button().disabled).toBe(false);
      expect(el('pt-check-again-cooldown')).toBeNull();

      button().click();
      fixture.detectChanges();
      expect(api.GET_progressTrackerResults).toHaveBeenCalledTimes(2);
    });

    it('clamps a very large retry_after_s', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([], { preparation: { retry_after_s: 99999 } })));
      open();
      expect(component.checkAgainCooldownS()).toBe(300);
      fixture.destroy();
    });

    it('other template reasons stay "nothing to propose", with a link to source.pt_url', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'template', fallback_reason: 'no_evidence' } })));
      open();
      expect(component.status()).toBe('empty');
      expect(el('pt-empty')?.textContent).toContain('nothing to propose');
      const link = el('pt-empty-open-in-tracker') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('https://pt.example.org/kpi?x=1');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(el('pt-check-again-preparing')).toBeNull();
    });

    it.each([
      ['no_reportable_results', 'Progress Tracker reviewed the evidence for this KPI and found no reportable result yet.'],
      ['no_readable_original_evidence', 'Progress Tracker could not read the evidence files for this KPI, so there is nothing to propose yet.']
    ])('template reason %s gets its own empty message and keeps the Progress Tracker link', (reason, message) => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([proposal], { generated_by: { mode: 'template', fallback_reason: reason } })));
      open();
      expect(component.status()).toBe('empty');
      expect(el('pt-empty-message')?.textContent?.trim()).toBe(message);
      expect((el('pt-empty-open-in-tracker') as HTMLAnchorElement).getAttribute('href')).toBe('https://pt.example.org/kpi?x=1');
      expect(el('pt-check-again-preparing')).toBeNull();
    });

    it('shows PT generated_by.notice as plain text under the empty headline', () => {
      const notice =
        'No knowledge product for this KPI was found in the Progress Tracker evidence. The evidence shows another kind of output, such as an event or meeting (other output) and an innovation (innovation development), which don\'t count toward this indicator. The Progress Tracker lists them with the reason.';
      api.GET_progressTrackerResults.mockReturnValue(of(ok([], { generated_by: { mode: 'ai', notice: `<b>${notice}</b>` }, preparation: { no_results_reason: null } })));
      open();
      expect(component.status()).toBe('empty');
      const p = el('pt-empty-notice') as HTMLElement;
      expect(p.textContent?.replace(/\s+/g, ' ').trim()).toBe(`Progress Tracker says: <b>${notice}</b>`);
      expect(p.querySelector('b')).toBeNull();
      expect(el('pt-empty-open-in-tracker')).not.toBeNull();
    });

    it('falls back to preparation.no_results_reason when there is no notice', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([], { generated_by: { mode: 'ai' }, preparation: { no_results_reason: 'Nothing reportable yet.' } })));
      open();
      expect(el('pt-empty-notice')?.textContent).toContain('Nothing reportable yet.');
    });

    it('shows the notice while PT is busy drafting (template live_drafting_busy)', () => {
      const notice = 'AI drafting is busy. Open this KPI again in 6 s.';
      api.GET_progressTrackerResults.mockReturnValue(of(ok([], { generated_by: { mode: 'template', fallback_reason: 'live_drafting_busy', notice } })));
      open();
      expect(component.status()).toBe('preparing');
      expect(el('pt-preparing-notice')?.textContent).toContain(notice);
      fixture.destroy();
    });

    it('renders no notice paragraph when PT sends none', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([], { generated_by: { mode: 'ai' } })));
      open();
      expect(el('pt-empty-notice')).toBeNull();
    });

    it('a known reason outside template mode keeps the generic empty message', () => {
      api.GET_progressTrackerResults.mockReturnValue(of(ok([], { generated_by: { mode: 'ai', fallback_reason: 'no_reportable_results' } })));
      open();
      expect(component.status()).toBe('empty');
      expect(el('pt-empty-message')?.textContent?.trim()).toBe(PT_EMPTY_DEFAULT_MESSAGE);
    });

    it('empty without source.pt_url renders no link', () => {
      api.GET_progressTrackerResults.mockReturnValue(of({ response: { status: 'ok', results: [] } }));
      open();
      expect(component.status()).toBe('empty');
      expect(el('pt-empty-open-in-tracker')).toBeNull();
    });
  });

  describe('timeouts: one automatic retry, then "still working"', () => {
    /** Answers each call through its own Subject so the test controls how long it "takes". */
    let calls: Subject<unknown>[];
    beforeEach(() => {
      jest.useFakeTimers();
      calls = [];
      api.GET_progressTrackerResults.mockImplementation(() => {
        const s = new Subject<unknown>();
        calls.push(s);
        return s;
      });
    });

    const settle = (i: number, value: unknown, afterMs: number) => {
      jest.advanceTimersByTime(afterMs);
      calls[i].next(value);
      calls[i].complete();
      fixture.detectChanges();
    };
    const fail = (i: number, err: unknown, afterMs: number) => {
      jest.advanceTimersByTime(afterMs);
      calls[i].error(err);
      fixture.detectChanges();
    };

    it('a slow unavailable keeps the spinner up, retries once after the delay, and shows the retried answer', () => {
      open();
      settle(0, unavailable(), 27_000);

      expect(component.status()).toBe('loading');
      expect(el('pt-loading-auto-retry')).toBeTruthy();
      expect(el('pt-unavailable')).toBeNull();
      expect(calls.length).toBe(1);

      jest.advanceTimersByTime(PT_AUTO_RETRY_DELAY_MS - 1);
      expect(calls.length).toBe(1);
      jest.advanceTimersByTime(1);
      expect(calls.length).toBe(2);

      settle(1, ok([proposal]), 1_000);
      expect(component.status()).toBe('results');
      expect(component.proposals().length).toBe(1);
    });

    it('a gateway 504 (transport) is treated as still working too', () => {
      open();
      fail(0, { status: 504, message: 'Endpoint request timed out' }, 29_000);
      expect(component.status()).toBe('loading');
      jest.advanceTimersByTime(PT_AUTO_RETRY_DELAY_MS);
      expect(calls.length).toBe(2);
    });

    it('never retries automatically more than once: a second timeout lands on still_working with Check again', () => {
      open();
      settle(0, unavailable(), 27_000);
      jest.advanceTimersByTime(PT_AUTO_RETRY_DELAY_MS);
      fail(1, { status: 0 }, 29_000);

      expect(component.status()).toBe('still_working');
      expect(el('pt-still-working')?.textContent).toContain('still working');
      expect(el('pt-unavailable')).toBeNull();
      expect(el('pt-switch-to-manual-still-working')).toBeTruthy();

      jest.advanceTimersByTime(120_000);
      expect(calls.length).toBe(2);

      (el('pt-check-again-still-working') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(calls.length).toBe(3);
      expect(component.status()).toBe('loading');

      // A manual Check again does not earn another automatic retry.
      settle(2, unavailable(), 27_000);
      jest.advanceTimersByTime(PT_AUTO_RETRY_DELAY_MS * 3);
      expect(calls.length).toBe(3);
      expect(component.status()).toBe('still_working');
    });

    it('a fast unavailable is a real outage: no retry, the unavailable state as before', () => {
      open();
      settle(0, unavailable(), 300);
      expect(component.status()).toBe('unavailable');
      jest.advanceTimersByTime(PT_AUTO_RETRY_DELAY_MS * 2);
      expect(calls.length).toBe(1);
    });

    it('a fast transport failure is unavailable, not still working', () => {
      open();
      fail(0, new Error('boom'), 200);
      expect(component.status()).toBe('unavailable');
    });

    it('switching KPI during the retry wait cancels the pending retry', () => {
      open();
      settle(0, unavailable(), 27_000);
      fixture.componentRef.setInput('tocIndicatorId', 456);
      fixture.detectChanges();
      expect(calls.length).toBe(2);
      jest.advanceTimersByTime(PT_AUTO_RETRY_DELAY_MS * 2);
      expect(calls.length).toBe(2);
      expect(api.GET_progressTrackerResults).toHaveBeenLastCalledWith(456, {});
    });
  });

  it('a transport failure fixture never reaches the template text', () => {
    api.GET_progressTrackerResults.mockReturnValue(throwError(() => ({ status: 504, message: 'secret-host' })));
    open();
    expect(fixture.nativeElement.textContent).not.toContain('secret-host');
  });
});
