import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrVizChartComponent, VizChartTableModel, EChartsOption, REGISTERED_ECHARTS_MODULES } from './pr-viz-chart.component';
import * as echarts from 'echarts/core';

const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn(() => false),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance)
}));

jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {},
  RadarChart: class RadarChart {}
}));

jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {},
  RadarComponent: class RadarComponent {}
}));

jest.mock('echarts/renderers', () => ({
  SVGRenderer: class SVGRenderer {}
}));

jest.mock('echarts/features', () => ({
  UniversalTransition: class UniversalTransition {}
}));

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  triggerResize() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe('PrVizChartComponent', () => {
  let component: PrVizChartComponent;
  let fixture: ComponentFixture<PrVizChartComponent>;
  let originalResizeObserver: any;
  let matchMediaMock: jest.Mock;

  const mockTableModel: VizChartTableModel = {
    caption: 'Results by report year',
    headers: ['Year', 'Count'],
    rows: [
      ['2023', 10],
      ['2024', 25]
    ]
  };

  const sampleOptions: EChartsOption = {
    title: { text: 'Test Chart' },
    xAxis: { type: 'category', data: ['2023', '2024'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [10, 25] }]
  };

  beforeAll(() => {
    originalResizeObserver = (global as any).ResizeObserver;
    (global as any).ResizeObserver = MockResizeObserver;
  });

  afterAll(() => {
    (global as any).ResizeObserver = originalResizeObserver;
  });

  beforeEach(async () => {
    MockResizeObserver.instances = [];
    jest.clearAllMocks();
    mockChartInstance.isDisposed.mockReturnValue(false);

    matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));
    window.matchMedia = matchMediaMock;

    await TestBed.configureTestingModule({
      imports: [PrVizChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrVizChartComponent);
    component = fixture.componentInstance;
  });

  describe('Module Registration & Initialization', () => {
    it('registers exactly the 15 declared modules', () => {
      // 13 → 14: additive `TreeChart` registration for the ToC map (`changes/overview-toc-map`,
      // TCM-T-1); 14 → 15: additive `LineChart` for the reporting-trend card — no existing
      // module removed.
      expect(REGISTERED_ECHARTS_MODULES.length).toBe(15);
    });

    it('initializes echarts with SVG renderer and emits chartInit', () => {
      const chartInitSpy = jest.fn();
      component.chartInit.subscribe(chartInitSpy);

      fixture.detectChanges();

      expect(echarts.init).toHaveBeenCalledTimes(1);
      const [containerEl, theme, opts] = (echarts.init as jest.Mock).mock.calls[0];
      expect(containerEl).toBe(component.chartContainer()?.nativeElement);
      expect(theme).toBeUndefined();
      expect(opts).toEqual({ renderer: 'svg' });

      expect(chartInitSpy).toHaveBeenCalledWith(mockChartInstance);
      expect(component.getInstance()).toBe(mockChartInstance);
    });
  });

  describe('Structural Table Pairing (VCE-R-2)', () => {
    it('renders the accessible sr-only table when tableModel is provided', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.componentRef.setInput('chartTitle', 'Custom Chart Title');
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).not.toBeNull();
      expect(table.getAttribute('aria-label')).toBe('Custom Chart Title');

      const caption = table.querySelector('caption');
      expect(caption?.textContent?.trim()).toBe('Results by report year');

      const headers = Array.from(table.querySelectorAll('thead th[scope="col"]')).map(
        (th: any) => th.textContent?.trim()
      );
      expect(headers).toEqual(['Year', 'Count']);

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      expect(rows.length).toBe(2);

      const firstRowHeader = rows[0].querySelector('th[scope="row"]')?.textContent?.trim();
      const firstRowCell = rows[0].querySelector('td')?.textContent?.trim();
      expect(firstRowHeader).toBe('2023');
      expect(firstRowCell).toBe('10');

      const secondRowHeader = rows[1].querySelector('th[scope="row"]')?.textContent?.trim();
      const secondRowCell = rows[1].querySelector('td')?.textContent?.trim();
      expect(secondRowHeader).toBe('2024');
      expect(secondRowCell).toBe('25');

      const warningAlert = fixture.nativeElement.querySelector('[role="alert"]');
      expect(warningAlert).toBeNull();
      expect(mockChartInstance.setOption).toHaveBeenCalled();
    });

    it('wraps the table in a div.sr-only instead of putting sr-only on the table (OSF-DD-14)', () => {
      // `.sr-only` sets `width:1px`, but under `table-layout: auto` a specified width is a
      // minimum, not a cap — `sr-only` on a `<table>` cannot constrain it, and an absolutely
      // positioned descendant with nothing clipping it inflates the document's scroll area
      // (execution.md §2). The wrapper `<div>` honours `width:1px`; the table keeps its
      // semantics for assistive tech.
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('div.sr-only');
      expect(wrapper).not.toBeNull();

      const table = wrapper.querySelector('table');
      expect(table).not.toBeNull();
      expect(table.classList.contains('sr-only')).toBe(false);
      expect(table.getAttribute('aria-label')).toBe(mockTableModel.caption);
    });

    it('falls back to tableModel caption for aria-label when chartTitle is empty', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.componentRef.setInput('chartTitle', '');
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table');
      expect(table.getAttribute('aria-label')).toBe('Results by report year');
    });

    it('renders accessibility warning and clears chart when options provided without required tableModel', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', null);
      fixture.componentRef.setInput('requireTable', true);
      fixture.detectChanges();

      const warningAlert = fixture.nativeElement.querySelector('div.sr-only[role="alert"]');
      expect(warningAlert).not.toBeNull();
      expect(warningAlert.textContent).toContain(
        'Warning: Chart rendered without required accessibility tableModel'
      );

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeNull();
      expect(mockChartInstance.clear).toHaveBeenCalled();
      expect(mockChartInstance.setOption).not.toHaveBeenCalled();
    });

    it('allows rendering without table when requireTable is explicitly false', () => {
      fixture.componentRef.setInput('options', sampleOptions);
      fixture.componentRef.setInput('tableModel', null);
      fixture.componentRef.setInput('requireTable', false);
      fixture.detectChanges();

      const warningAlert = fixture.nativeElement.querySelector('div.sr-only[role="alert"]');
      expect(warningAlert).toBeNull();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeNull();
      expect(mockChartInstance.setOption).toHaveBeenCalledWith(sampleOptions, true);
    });
  });

  describe('Reduced Motion Handling (VCE-R-3)', () => {
    it('forces animation: false when prefers-reduced-motion matches without mutating input options', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      const inputOptions = { ...sampleOptions };
      fixture.componentRef.setInput('options', inputOptions);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.detectChanges();

      expect(mockChartInstance.setOption).toHaveBeenCalledWith(
        expect.objectContaining({
          animation: false
        }),
        true
      );

      expect((inputOptions as any).animation).toBeUndefined();
    });

    it('keeps animation intact when prefers-reduced-motion does not match', () => {
      matchMediaMock.mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }));

      const inputOptionsWithAnimation = { ...sampleOptions, animation: true };
      fixture.componentRef.setInput('options', inputOptionsWithAnimation);
      fixture.componentRef.setInput('tableModel', mockTableModel);
      fixture.detectChanges();

      expect(mockChartInstance.setOption).toHaveBeenCalledWith(
        expect.objectContaining({
          animation: true
        }),
        true
      );
    });
  });

  describe('ResizeObserver & Click Events (VCE-R-1 / VCE-R-3)', () => {
    it('observes container with ResizeObserver and resizes chart on trigger', () => {
      fixture.detectChanges();

      expect(MockResizeObserver.instances.length).toBe(1);
      const observerInstance = MockResizeObserver.instances[0];
      expect(observerInstance.observe).toHaveBeenCalledWith(
        component.chartContainer()?.nativeElement
      );

      observerInstance.triggerResize();
      expect(mockChartInstance.resize).toHaveBeenCalledTimes(1);

      component.resize();
      expect(mockChartInstance.resize).toHaveBeenCalledTimes(2);
    });

    it('emits chartClick output when click listener fires', () => {
      const clickSpy = jest.fn();
      component.chartClick.subscribe(clickSpy);

      fixture.detectChanges();

      expect(mockChartInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
      const clickHandler = mockChartInstance.on.mock.calls.find((c: any[]) => c[0] === 'click')?.[1];
      expect(clickHandler).toBeDefined();

      const clickPayload = { seriesIndex: 0, dataIndex: 1, name: '2024', value: 25 };
      clickHandler(clickPayload);

      expect(clickSpy).toHaveBeenCalledWith(clickPayload);
    });
  });

  describe('Loading State (VCE-R-5)', () => {
    it('renders skeleton loading overlay and sets aria-hidden on chart container when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.pr-viz-chart-loading-overlay');
      expect(overlay).not.toBeNull();
      expect(overlay.getAttribute('role')).toBe('status');
      expect(overlay.getAttribute('aria-label')).toBe('Loading chart');

      const skeleton = fixture.nativeElement.querySelector('.pr-skeleton');
      expect(skeleton).not.toBeNull();

      const chartHost = component.chartContainer()?.nativeElement;
      expect(chartHost?.getAttribute('aria-hidden')).toBe('true');
    });

    it('does not render loading overlay when loading is false', () => {
      fixture.componentRef.setInput('loading', false);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('.pr-viz-chart-loading-overlay');
      expect(overlay).toBeNull();

      const chartHost = component.chartContainer()?.nativeElement;
      expect(chartHost?.getAttribute('aria-hidden')).toBeNull();
    });
  });

  describe('Cleanup on Destroy (VCE-R-1)', () => {
    it('disposes echarts instance and disconnects ResizeObserver on ngOnDestroy', () => {
      fixture.detectChanges();

      const observerInstance = MockResizeObserver.instances[0];

      fixture.destroy();

      expect(mockChartInstance.dispose).toHaveBeenCalledTimes(1);
      expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
      expect(component.getInstance()).toBeUndefined();
    });
  });
});
