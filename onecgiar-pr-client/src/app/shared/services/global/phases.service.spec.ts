import { of, take } from 'rxjs';
import { PhasesService } from './phases.service';

describe('PhasesService', () => {
  let mockApi: any;
  let mockResultsFilterService: any;
  let mockIpsrFilterService: any;
  let service: PhasesService;

  const versioningResponse = [
    {
      id: 101,
      app_module_id: 1, // reporting
      status: true,
      phase_name: '2025 Reporting',
      obj_portfolio: { acronym: 'CRP' }
    },
    {
      id: 102,
      app_module_id: 1, // reporting
      status: false,
      phase_name: '2024 Reporting',
      obj_portfolio: { acronym: 'PORT' }
    },
    {
      id: 201,
      app_module_id: 2, // ipsr
      status: true,
      phase_name: '2025 IPSR',
      obj_portfolio: { acronym: 'IPSR' }
    }
  ];

  beforeEach(() => {
    mockApi = {
      GET_versioning: jest.fn(() => of({ response: versioningResponse }))
    };

    mockResultsFilterService = {
      filters: {
        general: [
          {},
          { options: [] }
        ]
      }
    };

    mockIpsrFilterService = {
      filters: {
        general: [
          {},
          { options: [] }
        ]
      }
    };

    service = new PhasesService(mockApi as any, mockResultsFilterService as any, mockIpsrFilterService as any);
  });

  it('should load phases and map reporting and ipsr correctly', () => {
    // Constructor calls getNewPhases, so at this point data should be set
    expect(mockApi.GET_versioning).toHaveBeenCalled();

    // IPSR mapping
    expect(service.phases.ipsr.length).toBe(1);
    expect(service.phases.ipsr[0].id).toBe(201);
    expect(service.phases.ipsr[0].selected).toBe(true);

    // Reporting mapping
    expect(service.phases.reporting.length).toBe(2);
    expect(service.phases.reporting[0].id).toBe(101);
    expect(service.phases.reporting[0].selected).toBe(true);
    expect(service.phases.reporting[1].id).toBe(102);
    expect(service.phases.reporting[1].selected).toBe(false);
  });

  it('should populate Results filters options with label, attr and name', () => {
    const options = mockResultsFilterService.filters.general[1].options;
    expect(options.length).toBe(2);

    // First (open) reporting option
    expect(options[0].attr).toBe('2025 Reporting - CRP');
    expect(options[0].name).toBe('2025 Reporting - CRP (Open)');
    expect(options[0].selected).toBe(true);

    // Second (closed) reporting option
    expect(options[1].attr).toBe('2024 Reporting - PORT');
    expect(options[1].name).toBe('2024 Reporting - PORT (Closed)');
    expect(options[1].selected).toBe(false);
  });

  it('should populate IPSR filters options with label, name and id', () => {
    const options = mockIpsrFilterService.filters.general[1].options;
    expect(options.length).toBe(1);
    const opt = options[0];
    expect(opt.attr).toBe('2025 IPSR - IPSR');
    expect(opt.name).toBe('2025 IPSR - IPSR (Open)');
    expect(opt.selected).toBe(true);
    expect(opt.id).toBe(201);
  });

  it('should emit reporting phases via getPhasesObservable', done => {
    service.getPhasesObservable().pipe(take(1)).subscribe(list => {
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(101);
      done();
    });
    // Re-trigger emission to ensure subscriber receives a value after subscribing
    service.getNewPhases();
  });

  it('should return currently active reporting phase', () => {
    const active = service.currentlyActivePhaseOnReporting;
    expect(active).toBeDefined();
    expect(active?.id).toBe(101);
    expect(active?.status).toBe(true);
  });

  it('should return undefined when no active reporting phase exists', () => {
    // Override reporting phases to all have status false
    service.phases.reporting = [
      { id: 1, status: false, phase_name: 'Closed Phase' } as any
    ];

    const active = service.currentlyActivePhaseOnReporting;
    expect(active).toBeUndefined();
  });

  it('should handle phases without obj_portfolio (no acronym in label)', () => {
    const responseNoPortfolio = [
      {
        id: 301,
        app_module_id: 1,
        status: true,
        phase_name: '2026 Reporting',
        obj_portfolio: null
      },
      {
        id: 302,
        app_module_id: 2,
        status: false,
        phase_name: '2026 IPSR',
        obj_portfolio: null
      }
    ];

    mockApi.GET_versioning = jest.fn(() => of({ response: responseNoPortfolio }));
    service.getNewPhases();

    // Reporting filter options should NOT have acronym suffix
    const reportingOptions = mockResultsFilterService.filters.general[1].options;
    expect(reportingOptions[0].attr).toBe('2026 Reporting');
    expect(reportingOptions[0].name).toBe('2026 Reporting (Open)');

    // IPSR filter options should NOT have acronym suffix
    const ipsrOptions = mockIpsrFilterService.filters.general[1].options;
    expect(ipsrOptions[0].attr).toBe('2026 IPSR');
    expect(ipsrOptions[0].name).toBe('2026 IPSR (Closed)');
  });

  it('should handle phases with obj_portfolio but empty acronym', () => {
    const responseEmptyAcronym = [
      {
        id: 401,
        app_module_id: 1,
        status: true,
        phase_name: '2027 Reporting',
        obj_portfolio: { acronym: '' }
      },
      {
        id: 402,
        app_module_id: 2,
        status: true,
        phase_name: '2027 IPSR',
        obj_portfolio: { acronym: '' }
      }
    ];

    mockApi.GET_versioning = jest.fn(() => of({ response: responseEmptyAcronym }));
    service.getNewPhases();

    // Empty acronym should produce no suffix (falsy check)
    const reportingOptions = mockResultsFilterService.filters.general[1].options;
    expect(reportingOptions[0].attr).toBe('2027 Reporting');
    expect(reportingOptions[0].name).toBe('2027 Reporting (Open)');

    const ipsrOptions = mockIpsrFilterService.filters.general[1].options;
    expect(ipsrOptions[0].attr).toBe('2027 IPSR');
    expect(ipsrOptions[0].name).toBe('2027 IPSR (Open)');
  });

  it('should handle phases with obj_portfolio but undefined acronym', () => {
    const responseUndefinedAcronym = [
      {
        id: 501,
        app_module_id: 1,
        status: false,
        phase_name: '2028 Reporting',
        obj_portfolio: {}
      }
    ];

    mockApi.GET_versioning = jest.fn(() => of({ response: responseUndefinedAcronym }));
    service.getNewPhases();

    const reportingOptions = mockResultsFilterService.filters.general[1].options;
    expect(reportingOptions[0].attr).toBe('2028 Reporting');
    expect(reportingOptions[0].name).toBe('2028 Reporting (Closed)');
  });
});

// removed duplicate TestBed-based suite
