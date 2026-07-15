import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QaStatusComponent } from './qa-status.component';
import { QaStatusBoard } from './qa-status.interfaces';

const MOCK_BOARD: QaStatusBoard = {
  boardTitle: 'Performance refactor QA',
  boardSubtitle: 'Tracking the perf refactor changes',
  globalMetrics: {
    before: { domScansPerSecIdle: 120, tabSwitchWallClockSec: 2.4, blockingTimeMs: 800 },
    after: { domScansPerSecIdle: 4, tabSwitchWallClockSec: 0.3, blockingTimeMs: 60 },
    summary: 'Tab switching is now near-instant.',
    testsPassing: 'All 42 tests passing'
  },
  items: [
    {
      id: 'item-1',
      ticket: 'P2-2969',
      title: 'Remove ngDoCheck DOM scan',
      status: 'done',
      whatChanged: 'Replaced ngDoCheck with signals.',
      howToTest: ['Open a result', 'Switch tabs'],
      affects: ['Result detail'],
      risks: ['Validate green checks'],
      metricsBefore: { domScans: 120 },
      metricsAfter: { domScans: 4 },
      screenshots: ['item-1.png']
    },
    {
      id: 'item-2',
      title: 'Lazy-load heavy tab',
      status: 'en-progreso',
      whatChanged: 'Deferred a heavy component.',
      screenshots: []
    }
  ]
};

describe('QaStatusComponent', () => {
  let fixture: ComponentFixture<QaStatusComponent>;
  let component: QaStatusComponent;
  let httpMock: HttpTestingController;

  const ASSET_URL = './assets/qa-status/perf-refactor.json';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QaStatusComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(QaStatusComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpMock.expectOne(ASSET_URL).flush(MOCK_BOARD);
    expect(component).toBeTruthy();
  });

  it('should fetch the board JSON on init and render the items', () => {
    fixture.detectChanges(); // triggers ngOnInit -> load()
    const req = httpMock.expectOne(ASSET_URL);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_BOARD);
    fixture.detectChanges();

    expect(component.board()).toEqual(MOCK_BOARD);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Performance refactor QA');
    expect(text).toContain('Remove ngDoCheck DOM scan');
    expect(text).toContain('Lazy-load heavy tab');
  });

  it('should render one card header per item', () => {
    fixture.detectChanges();
    httpMock.expectOne(ASSET_URL).flush(MOCK_BOARD);
    fixture.detectChanges();

    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('button.qa-card__header');
    expect(headers.length).toBe(MOCK_BOARD.items.length);
  });

  it('should toggle expansion of an item', () => {
    fixture.detectChanges();
    httpMock.expectOne(ASSET_URL).flush(MOCK_BOARD);
    fixture.detectChanges();

    expect(component.isExpanded('item-1')).toBe(false);
    component.toggle('item-1');
    expect(component.isExpanded('item-1')).toBe(true);

    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('What changed');
    expect(text).toContain('Replaced ngDoCheck with signals.');
  });

  it('should map status values to labels and chip classes', () => {
    expect(component.statusLabel('done')).toBe('Done');
    expect(component.statusLabel('listo-para-pruebas')).toBe('Ready for testing');
    expect(component.chipClass('en-progreso')).toContain('qa-chip--en-progreso');
    // unknown status falls back gracefully
    expect(component.statusLabel('nope' as never)).toBe('Unknown');
  });

  it('should expose string and object metrics correctly', () => {
    expect(component.metricsText('2062 scans/sec → 0')).toBe('2062 scans/sec → 0');
    expect(component.metricsText({ domScans: 4 })).toBeNull();
    expect(component.metricsEntries({ domScans: 4 })).toEqual([{ key: 'domScans', value: 4 }]);
    expect(component.metricsEntries('plain text')).toEqual([]);
    expect(component.hasMetrics('text')).toBe(true);
    expect(component.hasMetrics({})).toBe(false);
    expect(component.hasMetrics(undefined)).toBe(false);
  });

  it('should resolve screenshot references to servable asset URLs', () => {
    expect(component.screenshotSrc('shot.png')).toBe('./assets/qa-status/shot.png');
    expect(component.screenshotSrc('/Users/foo/bar/baseline.png')).toBe('./assets/qa-status/baseline.png');
    expect(component.screenshotSrc('https://cdn/x.png')).toBe('https://cdn/x.png');
    expect(component.screenshotSrc('./assets/qa-status/y.png')).toBe('./assets/qa-status/y.png');
  });

  it('should set loadError when the request fails', () => {
    fixture.detectChanges();
    httpMock.expectOne(ASSET_URL).error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(component.loadError()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Could not load the QA status board');
  });
});
