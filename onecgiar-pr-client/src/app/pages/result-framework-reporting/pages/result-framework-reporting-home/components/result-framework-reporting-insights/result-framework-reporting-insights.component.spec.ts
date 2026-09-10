import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

jest.mock('chart.js/auto', () => {
  class ChartMock {
    static register = jest.fn();
    destroy = jest.fn();
    constructor(
      public canvas: any,
      public config: any
    ) {
      (globalThis as any).__insightsCharts.push(this);
    }
  }
  return { Chart: ChartMock, default: ChartMock };
});

import { ResultFrameworkReportingInsightsComponent } from './result-framework-reporting-insights.component';
import { ResultFrameworkReportingHomeService } from '../../services/result-framework-reporting-home.service';

const charts = (): any[] => (globalThis as any).__insightsCharts;

const version = (statuses: any[]) => ({ versionId: 1, phaseName: 'p', phaseYear: 2026, totalResults: 0, statuses });

describe('ResultFrameworkReportingInsightsComponent', () => {
  let component: ResultFrameworkReportingInsightsComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingInsightsComponent>;
  let homeServiceMock: any;

  const setup = async (template = '<canvas #statusDonutCanvas></canvas><canvas #spBarCanvas></canvas>') => {
    await TestBed.configureTestingModule({
      imports: [ResultFrameworkReportingInsightsComponent],
      providers: [{ provide: ResultFrameworkReportingHomeService, useValue: homeServiceMock }],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ResultFrameworkReportingInsightsComponent, { set: { template } })
      .compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingInsightsComponent);
    component = fixture.componentInstance;
    return fixture;
  };

  beforeEach(() => {
    (globalThis as any).__insightsCharts = [];
    homeServiceMock = {
      compactView: signal(false),
      isLoadingSPLists: signal(false),
      mySPsList: signal<any[]>([]),
      otherSPsList: signal<any[]>([]),
      otherProjectsList: signal<any[]>([])
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------- basic signals
  describe('derived signals', () => {
    beforeEach(async () => {
      await setup();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('mirrors compactView and isLoadingSPLists from the home service', () => {
      expect(component.compact()).toBe(false);
      expect(component.isLoading()).toBe(false);
      homeServiceMock.compactView.set(true);
      homeServiceMock.isLoadingSPLists.set(true);
      expect(component.compact()).toBe(true);
      expect(component.isLoading()).toBe(true);
    });

    it('totalResults sums totalResults and tolerates missing values', () => {
      homeServiceMock.mySPsList.set([{ totalResults: 4 }, { totalResults: null }, null]);
      expect(component.totalResults()).toBe(4);
      expect(component.totalPrograms()).toBe(3);
      expect(component.hasData()).toBe(true);
    });

    it('hasData is false when nothing has been reported', () => {
      homeServiceMock.mySPsList.set([{ totalResults: 0 }]);
      expect(component.totalResults()).toBe(0);
      expect(component.hasData()).toBe(false);
    });
  });

  // -------------------------------------------------------------- statusSlices
  describe('statusSlices', () => {
    beforeEach(async () => {
      await setup();
    });

    it('is empty when there are no programs', () => {
      expect(component.statusSlices()).toEqual([]);
    });

    it('tolerates programs without versions and versions without statuses', () => {
      homeServiceMock.mySPsList.set([null, { versions: undefined }, { versions: [{ statuses: undefined }] }]);
      expect(component.statusSlices()).toEqual([]);
    });

    it('aggregates statuses across programs/versions and sorts by the meta order', () => {
      homeServiceMock.mySPsList.set([
        { versions: [version([{ statusId: 1, statusName: 'Editing', count: 3 }])] },
        {
          versions: [
            version([
              { statusId: 1, statusName: 'Editing', count: 2 },
              { statusId: 3, statusName: 'Submitted', count: 7 }
            ])
          ]
        }
      ]);

      const slices = component.statusSlices();
      expect(slices).toHaveLength(2);
      expect(slices[0].statusId).toBe(3);
      expect(slices[0].count).toBe(7);
      expect(slices[0].label).toBe('Submitted');
      expect(slices[0].chartVar).toBe('--pr-color-primary-300');
      expect(slices[1].statusId).toBe(1);
      expect(slices[1].count).toBe(5);
      expect((slices[0] as any).order).toBeUndefined();
    });

    it('falls back to the raw name and neutral tokens for an unknown status id', () => {
      homeServiceMock.mySPsList.set([{ versions: [version([{ statusId: 42, statusName: 'Unknown', count: 1 }])] }]);

      const [slice] = component.statusSlices();
      expect(slice.label).toBe('Unknown');
      expect(slice.fullLabel).toBe('Unknown');
      expect(slice.chartVar).toBe('--pr-color-accents-3');
      expect(slice.chipClass).toBe('bg-[var(--pr-color-accents-1)] text-[var(--pr-color-accents-6)]');
      expect(slice.dotClass).toBe('bg-[var(--pr-color-accents-3)]');
    });
  });

  // ------------------------------------------------------------ spProgressRows
  describe('spProgressRows', () => {
    beforeEach(async () => {
      await setup();
    });

    it('skips programs with no results at all', () => {
      homeServiceMock.mySPsList.set([{ initiativeCode: 'SP1', totalResults: 0 }, { initiativeCode: 'SP2' }, null]);
      expect(component.spProgressRows()).toEqual([]);
      expect(component.barChartHeight()).toBe(20);
    });

    it('computes reported vs total, the percentage and sorts by total desc', () => {
      homeServiceMock.mySPsList.set([
        {
          initiativeCode: 'SP1',
          initiativeShortName: 'Short 1',
          initiativeName: 'Long 1',
          totalResults: 4,
          versions: [
            version([
              { statusId: 3, statusName: 'Submitted', count: 1 },
              { statusId: 1, statusName: 'Editing', count: 2 }
            ])
          ]
        },
        {
          initiativeCode: 'SP2',
          initiativeShortName: null,
          initiativeName: 'Long 2',
          totalResults: 10,
          versions: [version([{ statusId: 2, statusName: 'QAed', count: 5 }]), { statuses: undefined }]
        },
        { initiativeCode: 'SP3', initiativeName: 'Long 3', totalResults: 2, versions: undefined }
      ]);

      const rows = component.spProgressRows();
      expect(rows.map(r => r.code)).toEqual(['SP2', 'SP1', 'SP3']);
      expect(rows[0]).toEqual({ code: 'SP2', name: 'Long 2', total: 10, reported: 5, pct: 50 });
      expect(rows[1]).toEqual({ code: 'SP1', name: 'Short 1', total: 4, reported: 1, pct: 25 });
      expect(rows[2]).toEqual({ code: 'SP3', name: 'Long 3', total: 2, reported: 0, pct: 0 });
      expect(component.barChartHeight()).toBe(3 * 34 + 20);
    });

    it('handles a program whose totalResults is null once it has versions', () => {
      const rows = (component as any).countReported({ versions: [version([{ statusId: 3, statusName: 'Submitted', count: 2 }])] });
      expect(rows).toBe(2);
      expect((component as any).countReported(null)).toBe(0);
      expect((component as any).countReported({})).toBe(0);
    });
  });

  // ------------------------------------------------------------------ cssColor
  describe('cssColor', () => {
    beforeEach(async () => {
      await setup();
    });

    it('returns the resolved custom property when the token is defined', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '  #123456 ' } as any);
      expect((component as any).cssColor('--pr-color-primary-300')).toBe('#123456');
    });

    it('falls back to a neutral grey when the token resolves to nothing', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '' } as any);
      expect((component as any).cssColor('--nope')).toBe('#c7c9d1');
    });
  });

  // ------------------------------------------------------------- chart rendering
  describe('chart rendering', () => {
    it('does not build any chart while there is no data', async () => {
      await setup();
      fixture.detectChanges();
      expect(charts()).toHaveLength(0);
    });

    it('does not build any chart when the canvases are missing', async () => {
      homeServiceMock.mySPsList.set([
        { initiativeCode: 'SP1', initiativeName: 'One', totalResults: 2, versions: [version([{ statusId: 3, statusName: 'Submitted', count: 2 }])] }
      ]);
      await setup('');
      fixture.detectChanges();
      expect(charts()).toHaveLength(0);
    });

    it('builds the donut and the bar chart once there is data', async () => {
      homeServiceMock.mySPsList.set([
        { initiativeCode: 'SP1', initiativeName: 'One', totalResults: 4, versions: [version([{ statusId: 3, statusName: 'Submitted', count: 2 }])] }
      ]);
      await setup();
      fixture.detectChanges();

      expect(charts()).toHaveLength(2);
      const [donut, bars] = charts();
      expect(donut.config.type).toBe('doughnut');
      expect(bars.config.type).toBe('bar');
    });

    it('destroys the previous charts when the data changes and on destroy', async () => {
      homeServiceMock.mySPsList.set([
        { initiativeCode: 'SP1', initiativeName: 'One', totalResults: 4, versions: [version([{ statusId: 3, statusName: 'Submitted', count: 2 }])] }
      ]);
      await setup();
      fixture.detectChanges();
      const [firstDonut, firstBars] = charts();

      homeServiceMock.mySPsList.set([
        { initiativeCode: 'SP2', initiativeName: 'Two', totalResults: 6, versions: [version([{ statusId: 2, statusName: 'QAed', count: 3 }])] }
      ]);
      fixture.detectChanges();

      expect(firstDonut.destroy).toHaveBeenCalled();
      expect(firstBars.destroy).toHaveBeenCalled();
      expect(charts().length).toBe(4);

      const [, , lastDonut, lastBars] = charts();
      component.ngOnDestroy();
      expect(lastDonut.destroy).toHaveBeenCalled();
      expect(lastBars.destroy).toHaveBeenCalled();
    });

    it('ngOnDestroy is safe when no chart was ever built', async () => {
      await setup();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ------------------------------------------------------- chart configurations
  describe('chart configuration callbacks', () => {
    beforeEach(async () => {
      await setup();
    });

    it('renderDonut labels each slice with its count', () => {
      const canvas = document.createElement('canvas');
      const slices = [
        { statusId: 3, label: 'Submitted', fullLabel: 'Submitted', count: 4, chartVar: '--x', chipClass: '', dotClass: '' }
      ] as any;

      (component as any).renderDonut(canvas, slices);
      const { config } = charts()[0];

      expect(config.data.labels).toEqual(['Submitted']);
      expect(config.data.datasets[0].data).toEqual([4]);
      expect(config.options.plugins.tooltip.callbacks.label({ parsed: 4, label: 'Submitted' })).toBe(' 4 Submitted');
    });

    it('renderBars fills the remaining track and only tooltips the real dataset', () => {
      const canvas = document.createElement('canvas');
      const rows = [{ code: 'SP1', name: 'One', total: 4, reported: 1, pct: 25 }];

      (component as any).renderBars(canvas, rows);
      const { config } = charts()[0];

      expect(config.data.labels).toEqual(['SP1']);
      expect(config.data.datasets[0].data).toEqual([25]);
      expect(config.data.datasets[1].data).toEqual([75]);
      expect(config.options.plugins.tooltip.filter({ datasetIndex: 0 })).toBe(true);
      expect(config.options.plugins.tooltip.filter({ datasetIndex: 1 })).toBe(false);
      expect(config.options.plugins.tooltip.callbacks.label({ dataIndex: 0 })).toBe(' One: 1/4 Submitted or QAed (25%)');
    });
  });
});
