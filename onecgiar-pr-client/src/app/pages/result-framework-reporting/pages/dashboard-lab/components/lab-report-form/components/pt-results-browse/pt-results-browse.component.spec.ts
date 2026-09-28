import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PtResultsBrowseComponent } from './pt-results-browse.component';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';

describe('PtResultsBrowseComponent', () => {
  let component: PtResultsBrowseComponent;
  let fixture: ComponentFixture<PtResultsBrowseComponent>;
  let mockResultsApiService: { GET_progressTrackerResults: jest.Mock };

  const okEnvelope = (results: unknown[]) => ({
    statusCode: 200,
    message: 'ok',
    response: {
      status: 'ok',
      results,
      evidence_count: results.length,
      generated_at: '2026-09-22T18:47:26.657864+00:00',
      evidence_fingerprint: 'f9adbe6f47c1e67fba54eac88e3c7f50aefa75c6bf4b1bbe9359e586aa01a181',
      source: {
        system: 'progress-tracker',
        environment: 'staging',
        pt_url: 'https://staging-performance-tracker.synapsis-analytics.com/program/Food?indicator=8006329bfd49'
      }
    }
  });

  const notFoundEnvelope = () => ({
    statusCode: 200,
    message: 'ok',
    response: { status: 'not_found' }
  });

  // Reviewer fix: seeded with upstream-looking text so the "never leaks" assertion can actually
  // fail if the component ever binds `envelope.message` / `response.message` into the template —
  // an envelope with no message field at all made that assertion pass regardless (inert fixture).
  const unavailableEnvelope = () => ({
    statusCode: 200,
    message: 'Upstream timeout calling https://staging-performance-tracker.synapsis-analytics.com via execute-api',
    response: {
      status: 'unavailable',
      message: 'timeout at synapsis-analytics.com'
    }
  });

  const sampleProposal = {
    result_key: '8006329bfd49:1',
    result_type: 'innovation_development',
    result_type_label: 'Innovation development',
    title: 'Fragility and Conflict Sensitivity Hub established as strategic mechanism',
    description: 'The Fragility and Conflict Sensitivity Hub has been established since January 2026.',
    evidence: [{ item_key: 'E1', kind: 'text', name: 'Qualitative submission note', url: null }],
    countries: ['Kenya', 'Colombia'],
    impact_areas: { gender: 0, climate: 1, environment: 0, nutrition: 0, poverty: 1, justification: 'text' },
    gender_split: { women: null, men: null },
    knowledge_product_handle: null,
    confidence: 0.75,
    rationale: 'Hub establishment is clearly achieved and distinct from toolkit outputs.',
    missing_info: ['Specific countries where Hub coordinates activities']
  };

  const kpProposal = {
    ...sampleProposal,
    result_key: '8006329bfd49:2',
    knowledge_product_handle: '10568/128401'
  };

  beforeEach(async () => {
    mockResultsApiService = {
      GET_progressTrackerResults: jest.fn().mockReturnValue(of(notFoundEnvelope()))
    };

    await TestBed.configureTestingModule({
      imports: [PtResultsBrowseComponent],
      providers: [{ provide: ResultsApiService, useValue: mockResultsApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(PtResultsBrowseComponent);
    component = fixture.componentInstance;
  });

  it('renders the idle state and issues no request when no indicator id is set yet', () => {
    fixture.detectChanges();

    expect(mockResultsApiService.GET_progressTrackerResults).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-test="pt-idle"]')).toBeTruthy();
  });

  it('fetches when tocIndicatorId becomes set, sending no query keys beyond the allow-list (empty object)', () => {
    fixture.componentRef.setInput('tocIndicatorId', 123);
    fixture.detectChanges();

    expect(mockResultsApiService.GET_progressTrackerResults).toHaveBeenCalledTimes(1);
    expect(mockResultsApiService.GET_progressTrackerResults).toHaveBeenCalledWith(123, {});
  });

  // Reviewer fix: `setInput(123)` twice never re-runs anything by itself — signal inputs dedupe via
  // `Object.is`, so the old version of this test was a presence-assertion, not behavioral proof.
  // The only path where the `PTB-R-22` guard actually matters is A → null/'' → A (same indicator,
  // panel briefly not addressed) versus A → B (a real indicator change).
  it('PTB-R-22 guard: A → null → A collapses to one fetch; A → B fetches twice with the new id', () => {
    fixture.componentRef.setInput('tocIndicatorId', 123);
    fixture.detectChanges();
    fixture.componentRef.setInput('tocIndicatorId', null);
    fixture.detectChanges();
    fixture.componentRef.setInput('tocIndicatorId', 123);
    fixture.detectChanges();

    expect(mockResultsApiService.GET_progressTrackerResults).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('tocIndicatorId', 456);
    fixture.detectChanges();

    expect(mockResultsApiService.GET_progressTrackerResults).toHaveBeenCalledTimes(2);
    expect(mockResultsApiService.GET_progressTrackerResults).toHaveBeenLastCalledWith(456, {});
  });

  // Reviewer fix (stale-response race): the panel stays mounted `[hidden]` across indicators
  // (`PTB-R-22`), so `tocIndicatorId` can change while a previous request is still in flight — a
  // cold indicator A (~20s) followed by a cache-hit indicator B (~1s) must not let A's late
  // envelope overwrite B's already-rendered state/provenance.
  it('cancels a stale in-flight request when tocIndicatorId changes before it resolves', () => {
    const subjectA = new Subject<any>();
    mockResultsApiService.GET_progressTrackerResults.mockImplementation((id: number) => {
      if (id === 111) {
        return subjectA;
      }
      return of(okEnvelope([{ ...sampleProposal, result_key: 'B:1', title: 'Indicator B proposal' }]));
    });

    fixture.componentRef.setInput('tocIndicatorId', 111);
    fixture.detectChanges();
    expect(component.status()).toBe('loading');

    fixture.componentRef.setInput('tocIndicatorId', 222);
    fixture.detectChanges();

    expect(component.status()).toBe('results');
    expect(fixture.nativeElement.querySelector('[data-test="pt-proposal-B:1"]')).toBeTruthy();

    // A's late envelope arrives after B already rendered — switchMap must have discarded A's
    // subscription, so this must not overwrite B's state.
    subjectA.next(okEnvelope([{ ...sampleProposal, result_key: 'A:1', title: 'Indicator A proposal' }]));
    fixture.detectChanges();

    expect(component.status()).toBe('results');
    expect(fixture.nativeElement.querySelector('[data-test="pt-proposal-B:1"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-test="pt-proposal-A:1"]')).toBeNull();
  });

  describe('loading state (PTB-AC-3)', () => {
    it('renders the loading state with the Manual escape reachable next to the spinner, not hidden behind it', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(new Subject());

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      expect(component.status()).toBe('loading');
      const loadingEl = fixture.nativeElement.querySelector('[data-test="pt-loading"]');
      expect(loadingEl).toBeTruthy();

      const manualBtn = fixture.nativeElement.querySelector('[data-test="pt-switch-to-manual-loading"]');
      expect(manualBtn).toBeTruthy();

      const switchSpy = jest.fn();
      component.switchToManual.subscribe(switchSpy);
      manualBtn.click();
      expect(switchSpy).toHaveBeenCalledTimes(1);

      // Mutual exclusivity: no other state's root renders at the same time.
      expect(fixture.nativeElement.querySelector('[data-test="pt-results"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-test="pt-empty"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-test="pt-not-found"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-test="pt-unavailable"]')).toBeNull();
    });
  });

  describe('results state (PTB-AC-4)', () => {
    it('renders type, confidence, evidence, rationale and missing_info for each proposal, and the KPI deep link', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([sampleProposal])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      expect(component.status()).toBe('results');
      const root = fixture.nativeElement.querySelector('[data-test="pt-results"]');
      expect(root).toBeTruthy();

      const card = fixture.nativeElement.querySelector('[data-test="pt-proposal-8006329bfd49:1"]');
      expect(card).toBeTruthy();
      expect(card.querySelector('[data-test="pt-proposal-type"]').textContent).toContain('Innovation development');
      expect(card.querySelector('[data-test="pt-proposal-confidence"]').textContent).toContain('75%');
      expect(card.querySelector('[data-test="pt-proposal-rationale"]').textContent).toContain(
        'Hub establishment is clearly achieved'
      );
      expect(card.querySelector('[data-test="pt-proposal-evidence"]').textContent).toContain('Qualitative submission note');
      expect(card.querySelector('[data-test="pt-proposal-missing-info"]').textContent).toContain(
        'Specific countries where Hub coordinates activities'
      );

      const link = fixture.nativeElement.querySelector('[data-test="pt-open-in-tracker"]');
      expect(link).toBeTruthy();
      expect(link.getAttribute('href')).toBe(
        'https://staging-performance-tracker.synapsis-analytics.com/program/Food?indicator=8006329bfd49'
      );
      expect(link.getAttribute('rel')).toBe('noopener');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('shows guidance-only countries, impact areas and gender split (PTB-R-18)', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([sampleProposal])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      const guidance = fixture.nativeElement.querySelector('[data-test="pt-proposal-guidance"]');
      expect(guidance).toBeTruthy();
      expect(guidance.textContent).toContain('Kenya');
      expect(guidance.textContent).toContain('Colombia');
      expect(guidance.textContent).toContain('climate 1');
      expect(guidance.textContent).not.toContain('justification');
    });

    it('shows the knowledge-product handle only when isKnowledgeProduct is true and the proposal carries one', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([kpProposal])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.componentRef.setInput('isKnowledgeProduct', true);
      fixture.detectChanges();

      const handle = fixture.nativeElement.querySelector('[data-test="pt-proposal-handle"]');
      expect(handle).toBeTruthy();
      expect(handle.textContent).toContain('10568/128401');
    });

    it('shows the type-locked note when indicatorFixesResultType is true', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([sampleProposal])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.componentRef.setInput('indicatorFixesResultType', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-test="pt-proposal-type-locked-note"]')).toBeTruthy();
    });

    it('emits proposalSelected with the full proposal, including envelope-level provenance, on Use this result', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([sampleProposal])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      const selectedSpy = jest.fn();
      component.proposalSelected.subscribe(selectedSpy);

      const useBtn = fixture.nativeElement.querySelector('[data-test="pt-use-this-result-8006329bfd49:1"]');
      expect(useBtn).toBeTruthy();
      useBtn.click();

      expect(selectedSpy).toHaveBeenCalledTimes(1);
      const emitted = selectedSpy.mock.calls[0][0];
      expect(emitted.result_key).toBe('8006329bfd49:1');
      expect(emitted.title).toBe(sampleProposal.title);
      expect(emitted.generated_at).toBe('2026-09-22T18:47:26.657864+00:00');
      expect(emitted.evidence_fingerprint).toBe('f9adbe6f47c1e67fba54eac88e3c7f50aefa75c6bf4b1bbe9359e586aa01a181');
    });

    it('disables Use this result while busy is true', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([sampleProposal])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();

      const useBtn = fixture.nativeElement.querySelector('[data-test="pt-use-this-result-8006329bfd49:1"]');
      expect(useBtn.disabled).toBe(true);
    });
  });

  describe('empty state (PTB-AC-5)', () => {
    it('renders the empty state, not an error, when status is ok with zero results', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(okEnvelope([])));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      expect(component.status()).toBe('empty');
      expect(fixture.nativeElement.querySelector('[data-test="pt-empty"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-test="pt-unavailable"]')).toBeNull();
    });
  });

  describe('not_found state (PTB-AC-6)', () => {
    it('renders the not_found state with copy and the Manual entry escape', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(notFoundEnvelope()));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      expect(component.status()).toBe('not_found');
      const el = fixture.nativeElement.querySelector('[data-test="pt-not-found"]');
      expect(el).toBeTruthy();
      expect(el.textContent).toContain('not known to the Progress Tracker');

      const switchSpy = jest.fn();
      component.switchToManual.subscribe(switchSpy);
      fixture.nativeElement.querySelector('[data-test="pt-switch-to-manual-not-found"]').click();
      expect(switchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('unavailable state (PTB-AC-7) — reachable two ways (PTB-R-8)', () => {
    it('renders unavailable on an HTTP-200 envelope with status:"unavailable", with the Manual entry escape, and never leaks upstream text', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(of(unavailableEnvelope()));

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      expect(component.status()).toBe('unavailable');
      const el = fixture.nativeElement.querySelector('[data-test="pt-unavailable"]');
      expect(el).toBeTruthy();
      expect(el.textContent).not.toContain('synapsis-analytics.com');
      expect(el.textContent).not.toContain('execute-api');

      const switchSpy = jest.fn();
      component.switchToManual.subscribe(switchSpy);
      fixture.nativeElement.querySelector('[data-test="pt-switch-to-manual-unavailable"]').click();
      expect(switchSpy).toHaveBeenCalledTimes(1);
    });

    it('renders unavailable on a transport-level rejection, without echoing the raw error', () => {
      mockResultsApiService.GET_progressTrackerResults.mockReturnValue(
        throwError(() => new Error('connect ECONNREFUSED synapsis-analytics.com:443'))
      );

      fixture.componentRef.setInput('tocIndicatorId', 123);
      fixture.detectChanges();

      expect(component.status()).toBe('unavailable');
      const el = fixture.nativeElement.querySelector('[data-test="pt-unavailable"]');
      expect(el).toBeTruthy();
      expect(el.textContent).not.toContain('ECONNREFUSED');
      expect(el.textContent).not.toContain('synapsis-analytics.com');
    });
  });
});
