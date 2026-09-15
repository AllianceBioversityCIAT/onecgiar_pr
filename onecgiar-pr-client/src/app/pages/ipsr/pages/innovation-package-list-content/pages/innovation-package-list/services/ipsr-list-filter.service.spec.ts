import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PhasesService } from '../../../../../../../shared/services/global/phases.service';
import { ResultsApiService } from '../../../../../../../shared/services/api/results-api.service';
import { buildIpsrPhaseOptions, buildIpsrProgramOptions, buildIpsrStatusOptions, IpsrListFilterService } from './ipsr-list-filter.service';

describe('buildIpsrProgramOptions', () => {
  it('derives {official_code, displayName} from a known fixture', () => {
    const initiatives = [
      { initiative_id: 1, official_code: 'INIT-01', short_name: 'Init One', official_code_short_name: 'INIT-01 Init One' },
      { initiative_id: 2, official_code: 'INIT-02', short_name: 'Init Two', official_code_short_name: 'INIT-02 Init Two' }
    ];

    const options = buildIpsrProgramOptions(initiatives);

    expect(options).toEqual([
      expect.objectContaining({ official_code: 'INIT-01', displayName: 'INIT-01 Init One' }),
      expect.objectContaining({ official_code: 'INIT-02', displayName: 'INIT-02 Init Two' })
    ]);
  });

  it('excludes a source row that has no official_code', () => {
    const initiatives = [
      { initiative_id: 1, official_code: 'INIT-01', official_code_short_name: 'INIT-01 Init One' },
      { initiative_id: 2, official_code: null, official_code_short_name: 'Ghost row' }
    ];

    const options = buildIpsrProgramOptions(initiatives);

    expect(options.length).toBe(1);
    expect(options[0].official_code).toBe('INIT-01');
  });

  it('falls back to official_code + short_name when official_code_short_name is missing', () => {
    const options = buildIpsrProgramOptions([{ initiative_id: 3, official_code: 'INIT-03', short_name: 'Third' }]);

    expect(options[0].displayName).toBe('INIT-03 Third');
  });

  it('returns an empty array for an empty source list', () => {
    expect(buildIpsrProgramOptions([])).toEqual([]);
    expect(buildIpsrProgramOptions(null as any)).toEqual([]);
  });
});

describe('buildIpsrPhaseOptions', () => {
  it('derives attr/name/selected from a known fixture, adding the (Open)/(Closed) suffix', () => {
    const phases = [
      { id: 201, status: true, phase_name: '2025 IPSR', obj_portfolio: { acronym: 'IPSR' } },
      { id: 202, status: false, phase_name: '2024 IPSR', obj_portfolio: { acronym: 'IPSR' } }
    ];

    const options = buildIpsrPhaseOptions(phases);

    expect(options).toEqual([
      expect.objectContaining({ id: 201, attr: '2025 IPSR - IPSR', name: '2025 IPSR - IPSR (Open)', selected: true }),
      expect.objectContaining({ id: 202, attr: '2024 IPSR - IPSR', name: '2024 IPSR - IPSR (Closed)', selected: false })
    ]);
  });

  it('excludes a source row that has no id (present in source, not a usable filter target)', () => {
    const phases = [
      { id: 201, status: true, phase_name: '2025 IPSR' },
      { id: null, status: true, phase_name: 'Malformed phase' }
    ];

    const options = buildIpsrPhaseOptions(phases);

    expect(options.length).toBe(1);
    expect(options[0].id).toBe(201);
  });

  it('omits the acronym suffix when obj_portfolio has no acronym', () => {
    const options = buildIpsrPhaseOptions([{ id: 301, status: true, phase_name: '2026 IPSR', obj_portfolio: null }]);

    expect(options[0].attr).toBe('2026 IPSR');
    expect(options[0].name).toBe('2026 IPSR (Open)');
  });

  it('returns an empty array for an empty source list', () => {
    expect(buildIpsrPhaseOptions([])).toEqual([]);
    expect(buildIpsrPhaseOptions(undefined as any)).toEqual([]);
  });
});

describe('buildIpsrStatusOptions', () => {
  it('derives the distinct, non-blank status values from a known fixture', () => {
    const resultList = [
      { result_id: 1, status: 'New' },
      { result_id: 2, status: 'Editing' },
      { result_id: 3, status: 'New' }
    ];

    expect(buildIpsrStatusOptions(resultList)).toEqual(['New', 'Editing']);
  });

  it('excludes a row present in source whose status is blank/null (not a real filter option)', () => {
    const resultList = [
      { result_id: 1, status: 'New' },
      { result_id: 2, status: null },
      { result_id: 3, status: '   ' },
      { result_id: 4, status: undefined }
    ];

    expect(buildIpsrStatusOptions(resultList)).toEqual(['New']);
  });

  it('returns an empty array for an empty source list', () => {
    expect(buildIpsrStatusOptions([])).toEqual([]);
    expect(buildIpsrStatusOptions(null as any)).toEqual([]);
  });
});

describe('IpsrListFilterService', () => {
  let mockPhasesService: { phases: { ipsr: any[]; reporting: any[] }; getPhasesObservable: jest.Mock };
  let mockResultsApiService: { GET_ClarisaPortfolios: jest.Mock };
  let service: IpsrListFilterService;

  function configure(ipsrPhases: any[] = [], portfoliosResponse: any[] = []) {
    mockPhasesService = {
      phases: { ipsr: ipsrPhases, reporting: [] },
      getPhasesObservable: jest.fn(() => new Subject<any[]>().asObservable())
    };
    mockResultsApiService = {
      GET_ClarisaPortfolios: jest.fn(() => of(portfoliosResponse))
    };

    TestBed.configureTestingModule({
      providers: [
        IpsrListFilterService,
        { provide: PhasesService, useValue: mockPhasesService },
        { provide: ResultsApiService, useValue: mockResultsApiService }
      ]
    });

    service = TestBed.inject(IpsrListFilterService);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('defaults (IPSR-DD-4: empty selection = unfiltered)', () => {
    beforeEach(() => configure([{ id: 1, status: true, phase_name: 'Phase 1' }]));

    it('every selected* signal defaults to an empty array', () => {
      expect(service.selectedPrograms()).toEqual([]);
      expect(service.selectedPhases()).toEqual([]);
      expect(service.selectedStatus()).toEqual([]);
    });
  });

  describe('phaseOptions', () => {
    it('derives from PhasesService.phases.ipsr on construction', async () => {
      configure([{ id: 201, status: true, phase_name: '2025 IPSR', obj_portfolio: { acronym: 'IPSR' } }]);

      // PhasesService/ResultsApiService are resolved one microtask after construction to avoid an
      // NG0200 HTTP_INTERCEPTORS cycle in the real app (see ipsr-list-filter.service.ts constructor).
      await Promise.resolve();

      expect(service.phaseOptions()).toEqual([
        expect.objectContaining({ id: 201, attr: '2025 IPSR - IPSR', name: '2025 IPSR - IPSR (Open)', selected: true })
      ]);
    });

    it('stays an empty array when PhasesService.phases.ipsr is empty', async () => {
      configure([]);

      await Promise.resolve();

      expect(service.phaseOptions()).toEqual([]);
    });

    it('refreshes when PhasesService emits on getPhasesObservable (post-construction phase load)', async () => {
      const phasesSubject = new Subject<any[]>();
      mockPhasesService = {
        phases: { ipsr: [], reporting: [] },
        getPhasesObservable: jest.fn(() => phasesSubject.asObservable())
      };
      mockResultsApiService = {
        GET_ClarisaPortfolios: jest.fn(() => of([]))
      };
      TestBed.configureTestingModule({
        providers: [
          IpsrListFilterService,
          { provide: PhasesService, useValue: mockPhasesService },
          { provide: ResultsApiService, useValue: mockResultsApiService }
        ]
      });
      service = TestBed.inject(IpsrListFilterService);

      expect(service.phaseOptions()).toEqual([]);

      // Let the deferred constructor microtask resolve PhasesService and subscribe.
      await Promise.resolve();

      // Simulate PhasesService resolving its versioning fetch after this service subscribed.
      mockPhasesService.phases.ipsr = [{ id: 301, status: false, phase_name: '2026 IPSR' }];
      phasesSubject.next(mockPhasesService.phases.reporting);

      expect(service.phaseOptions()).toEqual([expect.objectContaining({ id: 301, name: '2026 IPSR (Closed)' })]);
    });

    it(
      'does not throw NG0205 when its own injector is destroyed before the deferred microtask fires ' +
        '(regression: jest.useFakeTimers() patches queueMicrotask globally, so the constructor callback can flush ' +
        'AFTER TestBed has torn the injector down — see complementary-innovation.component.spec.ts)',
      () => {
        jest.useFakeTimers();
        try {
          configure([{ id: 201, status: true, phase_name: '2025 IPSR' }]);

          // The constructor's queueMicrotask callback has NOT run yet — fake timers hold it
          // pending instead of letting it fire as a real microtask. Destroy the testing module's
          // injector now, before that callback flushes, reproducing the exact ordering that threw
          // `NG0205: Injector has already been destroyed` in the real spec.
          TestBed.resetTestingModule();

          // Flushing the pending (fake) microtask must not throw even though the injector this
          // service captured is now destroyed.
          expect(() => jest.advanceTimersByTime(0)).not.toThrow();

          // And it must not have gone on to touch PhasesService either — the guard should have
          // returned before reaching `this.injector.get(...)`.
          expect(service.phaseOptions()).toEqual([]);
        } finally {
          jest.useRealTimers();
        }
      }
    );
  });

  describe('programOptions / updateMyInitiatives', () => {
    beforeEach(() => configure([]));

    it('populates programOptions from a known initiatives fixture', () => {
      service.updateMyInitiatives([{ initiative_id: 1, official_code: 'INIT-01', official_code_short_name: 'INIT-01 Init One' }]);

      expect(service.programOptions()).toEqual([expect.objectContaining({ official_code: 'INIT-01', displayName: 'INIT-01 Init One' })]);
    });

    it('resets to an empty array when called with an empty list', () => {
      service.updateMyInitiatives([{ initiative_id: 1, official_code: 'INIT-01', official_code_short_name: 'INIT-01 Init One' }]);
      service.updateMyInitiatives([]);

      expect(service.programOptions()).toEqual([]);
    });
  });

  describe('statusOptions / refreshStatusOptions', () => {
    beforeEach(() => configure([]));

    it('populates statusOptions from a known ipsrResultList fixture, excluding a blank-status row', () => {
      service.refreshStatusOptions([{ status: 'New' }, { status: 'Editing' }, { status: '' }]);

      expect(service.statusOptions()).toEqual(['New', 'Editing']);
    });

    it('resets to an empty array for an empty result list', () => {
      service.refreshStatusOptions([{ status: 'New' }]);
      service.refreshStatusOptions([]);

      expect(service.statusOptions()).toEqual([]);
    });
  });

  describe('portfolioOptions (populated via loadSecondaryFacetOptions(), IPSR-DD-3)', () => {
    it('does NOT call GET_ClarisaPortfolios() on bare construction/injection', () => {
      configure([], [{ id: 1, acronym: 'P22' }]);

      expect(mockResultsApiService.GET_ClarisaPortfolios).not.toHaveBeenCalled();
      expect(service.portfolioOptions()).toEqual([]);
    });

    it('populates portfolioOptions from GET_ClarisaPortfolios() (unwrapped array response) after loadSecondaryFacetOptions()', () => {
      const portfolios = [{ id: 1, acronym: 'P22' }, { id: 2, acronym: 'P25' }];
      configure([], portfolios);

      service.loadSecondaryFacetOptions();

      expect(mockResultsApiService.GET_ClarisaPortfolios).toHaveBeenCalledTimes(1);
      expect(service.portfolioOptions()).toEqual(portfolios);
    });

    it('silently falls back to an empty list when GET_ClarisaPortfolios() errors (design.md §9)', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      mockPhasesService = {
        phases: { ipsr: [], reporting: [] },
        getPhasesObservable: jest.fn(() => new Subject<any[]>().asObservable())
      };
      mockResultsApiService = {
        GET_ClarisaPortfolios: jest.fn(() => throwError(() => new Error('fail')))
      };
      TestBed.configureTestingModule({
        providers: [
          IpsrListFilterService,
          { provide: PhasesService, useValue: mockPhasesService },
          { provide: ResultsApiService, useValue: mockResultsApiService }
        ]
      });
      service = TestBed.inject(IpsrListFilterService);

      service.loadSecondaryFacetOptions();

      expect(service.portfolioOptions()).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('is idempotent: two loadSecondaryFacetOptions() calls issue exactly one GET_ClarisaPortfolios() request', () => {
      const portfolios = [{ id: 1, acronym: 'P22' }];
      configure([], portfolios);

      service.loadSecondaryFacetOptions();
      service.loadSecondaryFacetOptions();

      expect(mockResultsApiService.GET_ClarisaPortfolios).toHaveBeenCalledTimes(1);
      expect(service.portfolioOptions()).toEqual(portfolios);
    });
  });

  describe('applyFilters / cancelFilters ("More filters" popover temp-then-apply staging, design.md §2.3)', () => {
    beforeEach(() => configure([]));

    it('applyFilters() copies tempSelectedPortfolios into selectedPortfolios, using a temp value DIFFERENT from the current selected value', () => {
      service.selectedPortfolios.set([{ id: 1, acronym: 'P22' }]);
      service.tempSelectedPortfolios.set([{ id: 2, acronym: 'P25' }]);

      service.applyFilters();

      expect(service.selectedPortfolios()).toEqual([{ id: 2, acronym: 'P25' }]);
    });

    it('applyFilters() does not leak primary-row (Program/Phase/Status) state', () => {
      service.selectedPrograms.set([{ official_code: 'INIT-01' }]);
      service.selectedPhases.set([{ id: 1 }]);
      service.selectedStatus.set(['New']);
      service.tempSelectedPortfolios.set([{ id: 9, acronym: 'P25' }]);

      service.applyFilters();

      expect(service.selectedPrograms()).toEqual([{ official_code: 'INIT-01' }]);
      expect(service.selectedPhases()).toEqual([{ id: 1 }]);
      expect(service.selectedStatus()).toEqual(['New']);
    });

    it('cancelFilters() discards the temp edit without applying it to selectedPortfolios', () => {
      const selectedPortfolios = [{ id: 1, acronym: 'P22' }];
      service.selectedPortfolios.set(selectedPortfolios);
      // Temp is a DIFFERENT value than selected — proves cancel is not a no-op that merely
      // matches an already-equal temp/selected pair.
      service.tempSelectedPortfolios.set([{ id: 2, acronym: 'P25' }]);

      service.cancelFilters();

      expect(service.selectedPortfolios()).toEqual(selectedPortfolios);
    });

    it('re-opening the popover after cancel reseeds tempSelectedPortfolios from the still-unapplied selectedPortfolios, not from the discarded temp edit', () => {
      const selectedPortfolios = [{ id: 1, acronym: 'P22' }];
      service.selectedPortfolios.set(selectedPortfolios);
      service.tempSelectedPortfolios.set([{ id: 99, acronym: 'DISCARDED' }]);

      service.cancelFilters();

      // Simulates the popover being reopened after cancel: tempSelectedPortfolios must already
      // reflect selectedPortfolios, not the aborted edit that was just discarded.
      expect(service.tempSelectedPortfolios()).toEqual(selectedPortfolios);
      expect(service.tempSelectedPortfolios()).not.toEqual([{ id: 99, acronym: 'DISCARDED' }]);
    });
  });
});
