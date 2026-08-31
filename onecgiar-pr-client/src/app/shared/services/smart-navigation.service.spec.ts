import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SmartNavigationService } from './smart-navigation.service';

describe('SmartNavigationService', () => {
  let service: SmartNavigationService;
  let routerEvents$: Subject<unknown>;
  let mockRouter: Partial<Router> & { events: Subject<unknown>; navigateByUrl: jest.Mock; url: string };

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();
    mockRouter = {
      url: '/result-framework-reporting/home',
      events: routerEvents$,
      navigateByUrl: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        SmartNavigationService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(SmartNavigationService);
  });

  it('initializes with current router url in history', () => {
    expect(service.getHistory()).toEqual(['/result-framework-reporting/home']);
  });

  it('filters out "/" and "/login" roots', () => {
    service.recordUrl('/');
    service.recordUrl('/login');
    service.recordUrl('/result-framework-reporting/home');

    expect(service.getHistory()).toEqual(['/result-framework-reporting/home']);
  });

  it('records subsequent NavigationEnd events without duplicates', () => {
    routerEvents$.next(new NavigationEnd(1, '/result-framework-reporting/entity-details/SP02', '/result-framework-reporting/entity-details/SP02'));
    routerEvents$.next(new NavigationEnd(2, '/result-framework-reporting/entity-details/SP02', '/result-framework-reporting/entity-details/SP02'));
    routerEvents$.next(new NavigationEnd(3, '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01', '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01'));

    expect(service.getHistory()).toEqual([
      '/result-framework-reporting/home',
      '/result-framework-reporting/entity-details/SP02',
      '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01'
    ]);
  });

  describe('getBackTarget and getPreviousUrl', () => {
    it('detects coming from Science programs when user is on entity details', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      service.recordUrl('/result-framework-reporting/home');
      service.recordUrl('/result-framework-reporting/entity-details/SP02');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
    });

    it('returns to Science programs even after switching tabs inside the program (not looped)', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP03?tocView=aows';
      service.recordUrl('/result-framework-reporting/home');
      service.recordUrl('/result-framework-reporting/entity-details/SP03/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP03?tocView=aows');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
    });

    it('detects coming from Overview tab to By-AOW reporting view', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      service.recordUrl('/result-framework-reporting/entity-details/SP02/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Overview');
      expect(target.url).toBe('/result-framework-reporting/entity-details/SP02/overview');
    });

    it('detects coming from grouped AoW table to By-AOW reporting view', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      service.recordUrl('/result-framework-reporting/entity-details/SP02');
      service.recordUrl('/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to all Areas of Work');
      expect(target.url).toBe('/result-framework-reporting/entity-details/SP02');
    });

    it('detects coming from Portfolio overview', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      service.recordUrl('/result-framework-reporting/portfolio-overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP02');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Portfolio overview');
      expect(target.url).toBe('/result-framework-reporting/portfolio-overview');
    });

    it('detects coming from Results list', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      service.recordUrl('/result/results-outlet/results-list');
      service.recordUrl('/result-framework-reporting/entity-details/SP02');

      const target = service.getBackTarget();
      expect(target.label).toBe('Back to Results list');
      expect(target.url).toBe('/result/results-outlet/results-list');
    });

    it('provides fallback when direct landing on By-AOW without prior history', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      (service as unknown as { history: string[] }).history = [mockRouter.url];

      const target = service.getBackTarget(mockRouter.url, 'SP02');
      expect(target.label).toBe('Back to Overview');
      expect(target.url).toBe('/result-framework-reporting/entity-details/SP02/overview');
    });

    it('provides fallback when direct landing on entity details root without prior history', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02';
      (service as unknown as { history: string[] }).history = [mockRouter.url];

      const target = service.getBackTarget(mockRouter.url, 'SP02');
      expect(target.label).toBe('Back to Science programs');
      expect(target.url).toBe('/result-framework-reporting/home');
    });
  });

  describe('back navigation execution', () => {
    it('navigates to previous URL on back()', () => {
      mockRouter.url = '/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01';
      service.recordUrl('/result-framework-reporting/entity-details/SP02/overview');
      service.recordUrl('/result-framework-reporting/entity-details/SP02?tocView=byAow&tocAow=AOW01');

      service.back();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/result-framework-reporting/entity-details/SP02/overview');
    });

    it('navigates to fallback URL if explicitly provided', () => {
      service.back('/custom-fallback');

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/custom-fallback');
    });
  });
});
