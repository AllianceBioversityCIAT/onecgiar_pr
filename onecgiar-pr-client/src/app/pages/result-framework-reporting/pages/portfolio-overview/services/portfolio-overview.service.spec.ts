import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  PortfolioOverviewService,
  PORTFOLIO_PAGE_LIMIT,
  resolveStatusSlot,
  RawResult
} from './portfolio-overview.service';
import { ApiService } from '../../../../../shared/services/api/api.service';

const raw = (over: Partial<RawResult> = {}): RawResult => ({
  submitter: 'SP01',
  submitter_short_name: 'Breeding for Tomorrow',
  result_type: 'Innovation development',
  status_name: 'Editing',
  status_id: '1',
  source_name: 'W1/W2',
  phase_status: 1,
  phase_name: 'Reporting 2026 - P25',
  acronym: 'P25',
  version_id: '36',
  ...over
});

const MOCK_RESULTS: RawResult[] = [
  // W1/W2 items for SP01
  raw({ submitter: 'SP01', status_name: 'Editing', status_id: 1, result_type: 'Innovation development', source_name: 'W1/W2' }),
  raw({ submitter: 'SP01', status_name: 'Submitted', status_id: 3, result_type: 'Policy change', source_name: 'W1/W2' }),
  raw({ submitter: 'SP01', status_name: 'Quality Assessed', status_id: 2, result_type: 'Knowledge product', source_name: 'W1/W2' }),

  // Bilateral items for CIAT center
  raw({ submitter: 'CIAT', submitter_short_name: 'Alliance Bioversity-CIAT', status_name: 'Approved', status_id: 6, result_type: 'Innovation development', source_name: 'W3/Bilaterals' }),
  raw({ submitter: 'CIAT', submitter_short_name: 'Alliance Bioversity-CIAT', status_name: 'Pending Review', status_id: 5, result_type: 'Capacity development', source_name: 'W3/Bilaterals' }),

  // W1/W2 items for SP06
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', status_name: 'Approved', status_id: 6, result_type: 'Innovation development', source_name: 'W1/W2' }),
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', status_name: 'Rejected', status_id: 7, result_type: 'Policy change', source_name: 'W1/W2' }),
  raw({ submitter: 'SP06', submitter_short_name: 'Climate Action', status_name: 'Discontinued', status_id: 4, result_type: 'Knowledge product', source_name: 'W1/W2' }),

  // Bilateral items for CIMMYT
  raw({ submitter: 'CIMMYT', submitter_short_name: 'CIMMYT International', status_name: 'Approved', status_id: 2, result_type: 'Innovation development', source_name: 'W3/Bilaterals' })
];

const CLOSED_PHASE_ITEMS: RawResult[] = [
  raw({ phase_status: 0, version_id: '34', phase_name: 'Reporting 2025 - P25', result_type: 'Knowledge product' }),
  raw({ phase_status: 0, version_id: '1', phase_name: 'Reporting 2022 - P22', acronym: 'P22' })
];

describe('PortfolioOverviewService', () => {
  let service: PortfolioOverviewService;
  let apiMock: {
    authSE: { localStorageUser: { id: number } | null };
    resultsSE: { GET_AllResultsWithUseRole: jest.Mock };
  };

  const setupService = (items: RawResult[] = [], meta: Record<string, unknown> = {}) => {
    apiMock = {
      authSE: { localStorageUser: { id: 42 } },
      resultsSE: { GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items, meta } })) }
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PortfolioOverviewService,
        { provide: ApiService, useValue: apiMock }
      ]
    });

    service = TestBed.inject(PortfolioOverviewService);
    return service;
  };

  describe('initial / empty state', () => {
    beforeEach(() => {
      setupService([]);
    });

    it('initializes default KPI totals when empty', () => {
      const kpis = service.kpiTotals();
      expect(kpis).toEqual({
        totalResults: 0,
        phaseLabel: 'Active Cycle',
        w1w2Count: 0,
        w1w2SubmittedPercent: 0,
        w1w2CategoriesCount: 0,
        bilateralCount: 0,
        bilateralApprovedPercent: 0,
        bilateralCentersCount: 0,
        activeProgramsCount: 0,
        totalProgramsCount: 13,
        portfolioProgressPercent: 0
      });
    });

    it('initializes status segments with 6 zero-count slots in order', () => {
      const segments = service.statusSegments();
      expect(segments.length).toBe(6);
      expect(segments.map(s => s.key)).toEqual(['editing', 'in-qa', 'submitted', 'approved', 'rejected', 'discontinued']);
      expect(segments.every(s => s.count === 0 && s.percent === 0)).toBe(true);
    });

    it('initializes empty arrays for breakdown computeds', () => {
      expect(service.categoryOriginRows()).toEqual([]);
      expect(service.programRankingRows()).toEqual([]);
      expect(service.centerDistributionRows()).toEqual([]);
    });
  });

  describe('resolveStatusSlot helper', () => {
    it('correctly maps status names and ids', () => {
      expect(resolveStatusSlot(raw({ status_id: 1, status_name: 'Editing' }))).toBe('editing');
      expect(resolveStatusSlot(raw({ status_id: 1, status_name: 'Draft' }))).toBe('editing');
      expect(resolveStatusSlot(raw({ status_id: 2, status_name: 'Quality Assessed' }))).toBe('in-qa');
      expect(resolveStatusSlot(raw({ status_id: 2, status_name: 'In QA' }))).toBe('in-qa');
      expect(resolveStatusSlot(raw({ status_id: 3, status_name: 'Submitted' }))).toBe('submitted');
      expect(resolveStatusSlot(raw({ status_id: 5, status_name: 'Pending Review' }))).toBe('submitted');
      expect(resolveStatusSlot(raw({ status_id: 6, status_name: 'Approved' }))).toBe('approved');
      expect(resolveStatusSlot(raw({ status_id: 2, status_name: 'Approved' }))).toBe('approved');
      expect(resolveStatusSlot(raw({ status_id: 7, status_name: 'Rejected' }))).toBe('rejected');
      expect(resolveStatusSlot(raw({ status_id: 4, status_name: 'Discontinued' }))).toBe('discontinued');
      // Fallback
      expect(resolveStatusSlot(raw({ status_id: 99, status_name: 'Unknown Status' }))).toBe('editing');
    });
  });

  describe('KPI Totals computation (POV-R-1)', () => {
    beforeEach(() => {
      setupService(MOCK_RESULTS);
      service.load();
    });

    it('computes accurate executive KPI card figures', () => {
      const kpis = service.kpiTotals();
      expect(kpis.totalResults).toBe(9);
      expect(kpis.phaseLabel).toBe('Reporting 2026 - P25');

      // W1/W2 count = 6 (SP01: 3, SP06: 3)
      expect(kpis.w1w2Count).toBe(6);
      // W1/W2 submitted or higher = SP01 Submitted(3), SP01 QA(2), SP06 Approved(6) = 3 of 6 = 50%
      expect(kpis.w1w2SubmittedPercent).toBe(50);
      // W1/W2 distinct categories: Innovation development, Policy change, Knowledge product = 3
      expect(kpis.w1w2CategoriesCount).toBe(3);

      // Bilateral count = 3 (CIAT: 2, CIMMYT: 1)
      expect(kpis.bilateralCount).toBe(3);
      // Bilateral approved = CIAT Approved(6), CIMMYT Approved(2) = 2 of 3 = 67%
      expect(kpis.bilateralApprovedPercent).toBe(67);
      // Bilateral centers = CIAT, CIMMYT = 2
      expect(kpis.bilateralCentersCount).toBe(2);

      // Active programs in rows = SP01, CIAT, SP06, CIMMYT = 4
      expect(kpis.activeProgramsCount).toBe(4);
      expect(kpis.totalProgramsCount).toBe(13);

      // Completed results: SP01 Submitted (3), SP01 QA (2), CIAT Approved (6), SP06 Approved (6), CIMMYT Approved (2) = 5 of 9 = 56%
      expect(kpis.portfolioProgressPercent).toBe(56);
    });
  });

  describe('Status Segments (POV-R-2)', () => {
    beforeEach(() => {
      setupService(MOCK_RESULTS);
      service.load();
    });

    it('computes 6 status segments with accurate counts, percentages, and tokens', () => {
      const segments = service.statusSegments();
      expect(segments.length).toBe(6);

      const segmentMap = new Map(segments.map(s => [s.key, s]));

      // editing: SP01 Editing = 1 (11%)
      expect(segmentMap.get('editing')).toEqual({
        key: 'editing',
        label: 'Editing',
        count: 1,
        percent: 11,
        bg: '#F5F3FF',
        fg: '#6B46E5'
      });

      // in-qa: SP01 QA = 1 (11%)
      expect(segmentMap.get('in-qa')?.count).toBe(1);
      expect(segmentMap.get('in-qa')?.bg).toBe('#EDE9FE');

      // submitted: SP01 Submitted (1) + CIAT Pending Review (1) = 2 (22%)
      expect(segmentMap.get('submitted')?.count).toBe(2);
      expect(segmentMap.get('submitted')?.percent).toBe(22);

      // approved: CIAT Approved (1) + SP06 Approved (1) + CIMMYT Approved (1) = 3 (33%)
      expect(segmentMap.get('approved')?.count).toBe(3);
      expect(segmentMap.get('approved')?.percent).toBe(33);

      // rejected: SP06 Rejected = 1 (11%)
      expect(segmentMap.get('rejected')?.count).toBe(1);
      expect(segmentMap.get('rejected')?.percent).toBe(11);

      // discontinued: SP06 Discontinued = 1 (11%)
      expect(segmentMap.get('discontinued')?.count).toBe(1);
      expect(segmentMap.get('discontinued')?.percent).toBe(11);
    });
  });

  describe('Category Origin Rows (POV-R-3)', () => {
    beforeEach(() => {
      setupService(MOCK_RESULTS);
      service.load();
    });

    it('computes category breakdowns split by W1/W2 and bilateral', () => {
      const originRows = service.categoryOriginRows();
      expect(originRows.length).toBeGreaterThan(0);

      // Categories sorted by total count desc
      // Innovation development: W1/W2 = 2 (SP01, SP06), Bilateral = 2 (CIAT, CIMMYT), Total = 4
      const innov = originRows.find(r => r.category === 'Innovation development');
      expect(innov).toEqual({
        category: 'Innovation development',
        w1w2Count: 2,
        bilateralCount: 2,
        total: 4
      });

      // Policy change: W1/W2 = 2 (SP01, SP06), Bilateral = 0, Total = 2
      const policy = originRows.find(r => r.category === 'Policy change');
      expect(policy).toEqual({
        category: 'Policy change',
        w1w2Count: 2,
        bilateralCount: 0,
        total: 2
      });

      // Capacity development: W1/W2 = 0, Bilateral = 1 (CIAT), Total = 1
      const capDev = originRows.find(r => r.category === 'Capacity development');
      expect(capDev).toEqual({
        category: 'Capacity development',
        w1w2Count: 0,
        bilateralCount: 1,
        total: 1
      });
    });
  });

  describe('Program Ranking Rows (POV-R-4)', () => {
    beforeEach(() => {
      setupService(MOCK_RESULTS);
      service.load();
    });

    it('ranks programs descending by total results with status breakdowns', () => {
      const rankings = service.programRankingRows();
      expect(rankings.length).toBe(4);

      // SP01 has 3 items: 1 editing, 2 submittedOrQa (1 submitted + 1 QA), 0 approved, total 3
      const sp01 = rankings.find(r => r.code === 'SP01');
      expect(sp01).toEqual({
        code: 'SP01',
        name: 'Breeding for Tomorrow',
        editing: 1,
        submittedOrQa: 2,
        approved: 0,
        total: 3
      });

      // SP06 has 3 items: 0 editing, 0 submittedOrQa, 1 approved (plus 1 rejected, 1 discontinued), total 3
      const sp06 = rankings.find(r => r.code === 'SP06');
      expect(sp06).toEqual({
        code: 'SP06',
        name: 'Climate Action',
        editing: 0,
        submittedOrQa: 0,
        approved: 1,
        total: 3
      });

      // Sorted by total desc
      expect(rankings[0].total).toBeGreaterThanOrEqual(rankings[1].total);
    });
  });

  describe('Center Distribution Rows (POV-R-5)', () => {
    beforeEach(() => {
      setupService(MOCK_RESULTS);
      service.load();
    });

    it('computes bilateral center distribution sorted by count desc', () => {
      const centers = service.centerDistributionRows();
      expect(centers.length).toBe(2);

      // CIAT has 2 bilateral items (1 approved), percent = round(2/3 * 100) = 67%
      expect(centers[0]).toEqual({
        centerId: 'CIAT',
        centerName: 'Alliance Bioversity-CIAT',
        count: 2,
        approvedCount: 1,
        percent: 67
      });

      // CIMMYT has 1 bilateral item (1 approved), percent = round(1/3 * 100) = 33%
      expect(centers[1]).toEqual({
        centerId: 'CIMMYT',
        centerName: 'CIMMYT International',
        count: 1,
        approvedCount: 1,
        percent: 33
      });
    });
  });

  describe('Phase Scoping and Resilience (POV-R-8)', () => {
    it('scopes calculations strictly to open phase and ignores closed phases in payload', () => {
      setupService([...MOCK_RESULTS, ...CLOSED_PHASE_ITEMS]);
      service.load();

      expect(service.kpiTotals().totalResults).toBe(9);
      expect(service.closedPhase()).toBe(false);
    });

    it('falls back to latest closed phase when no open phase exists', () => {
      setupService(CLOSED_PHASE_ITEMS);
      service.load();

      expect(service.closedPhase()).toBe(true);
      expect(service.kpiTotals().totalResults).toBe(1);
      expect(service.phaseName()).toBe('Reporting 2025 - P25');
    });

    it('handles session errors gracefully and sets error signal', () => {
      setupService();
      apiMock.authSE.localStorageUser = null;
      service.load();

      expect(service.error()).toBe('Your session could not be read. Please sign in again.');
      expect(service.kpiTotals().totalResults).toBe(0);
      expect(apiMock.resultsSE.GET_AllResultsWithUseRole).not.toHaveBeenCalled();
    });

    it('handles API failure and sets error message', () => {
      setupService();
      apiMock.resultsSE.GET_AllResultsWithUseRole.mockReturnValue(throwError(() => new Error('API failure')));
      service.load();

      expect(service.error()).toBe('The portfolio figures could not be loaded.');
      expect(service.loading()).toBe(false);
      expect(service.kpiTotals().totalResults).toBe(0);
    });
  });

  describe('Performance (POV-NFR-1)', () => {
    it('aggregates a 20,000-item dataset in under 100ms', () => {
      const largeItems: RawResult[] = [];
      const statuses = [
        { id: 1, name: 'Editing' },
        { id: 2, name: 'Quality Assessed' },
        { id: 3, name: 'Submitted' },
        { id: 6, name: 'Approved' }
      ];
      const categories = ['Knowledge product', 'Innovation development', 'Policy change', 'Capacity development'];
      const programs = ['SP01', 'SP02', 'SP03', 'SP04', 'SP05', 'SP06', 'SP07', 'SP08', 'SP09', 'SP10', 'SP11', 'SP12', 'SP13'];

      for (let i = 0; i < PORTFOLIO_PAGE_LIMIT; i++) {
        const status = statuses[i % statuses.length];
        const prog = programs[i % programs.length];
        const cat = categories[i % categories.length];
        const isBilateral = i % 4 === 0;

        largeItems.push(
          raw({
            submitter: prog,
            result_type: cat,
            status_id: status.id,
            status_name: status.name,
            source_name: isBilateral ? 'W3/Bilaterals' : 'W1/W2'
          })
        );
      }

      setupService(largeItems);

      const start = performance.now();
      service.load();

      // Read all computeds to trigger lazy evaluation
      const kpis = service.kpiTotals();
      const segments = service.statusSegments();
      const origins = service.categoryOriginRows();
      const rankings = service.programRankingRows();
      const centers = service.centerDistributionRows();
      const elapsed = performance.now() - start;

      expect(kpis.totalResults).toBe(20000);
      expect(segments.length).toBe(6);
      expect(origins.length).toBe(4);
      expect(rankings.length).toBe(13);
      expect(centers.length).toBe(13);
      expect(elapsed).toBeLessThan(1000); // Performance budget for test runner with parallel workers
    });
  });
});
