import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HlmDialogService } from '@spartan/dialog';
import { BilateralAiJobWatcherComponent } from './bilateral-ai-job-watcher.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { environment } from '../../../../../environments/environment';

const JOBS_URL = `${environment.apiBaseUrl}api/bilateral/center/ai/jobs`;
const HAS_ACTIVE_JOBS_KEY = 'prms.bilateral-ai.has-active-jobs';

/**
 * `AIQ-T-10` — the watcher is pure DI plumbing: no inputs, no logic, no template. Everything worth
 * testing is what its mere instantiation causes DOWNSTREAM in the two `providedIn: 'root'` services
 * it injects, so this suite proves the REAL `BilateralAiService` against a mocked `HttpClient`
 * (`HttpTestingController`), never a mocked `BilateralAiService` — a mocked service could not prove
 * that constructing the watcher is what makes the app-wide instantiation happen at all (the
 * disqualifier this task names, and exactly what `P-26` needs).
 */
describe('BilateralAiJobWatcherComponent', () => {
  let httpMock: HttpTestingController;
  let openDialogSpy: jest.Mock;

  function configure(): void {
    openDialogSpy = jest.fn().mockReturnValue({ closed$: { subscribe: jest.fn() }, close: jest.fn() });

    TestBed.configureTestingModule({
      imports: [BilateralAiJobWatcherComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: HlmDialogService, useValue: { open: openDialogSpy } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    localStorage.clear();
  });

  it('Falsifier / red run: with the hint key set, one list request fires on init (real BilateralAiService, mocked HttpClient)', () => {
    localStorage.setItem(HAS_ACTIVE_JOBS_KEY, '1');
    configure();

    TestBed.createComponent(BilateralAiJobWatcherComponent);

    httpMock.expectOne(JOBS_URL).flush({ response: { jobs: [], summary: { lanes_total: 2, lanes_busy: 0, others_waiting: 0 } } });
    httpMock.verify();
  });

  it('Falsifier / red run: without the hint key, zero requests fire on init — disqualifies a watcher that polls unconditionally', () => {
    configure();

    TestBed.createComponent(BilateralAiJobWatcherComponent);

    httpMock.expectNone(JOBS_URL);
    httpMock.verify();
  });

  it('renders nothing visible', () => {
    configure();

    const fixture: ComponentFixture<BilateralAiJobWatcherComponent> = TestBed.createComponent(BilateralAiJobWatcherComponent);
    fixture.detectChanges();
    // Drain whatever the constructor fired (none expected without the hint key) so httpMock stays clean.
    httpMock.match(() => true).forEach(req => req.flush({ response: { jobs: [], summary: { lanes_total: 0, lanes_busy: 0, others_waiting: 0 } } }));

    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(fixture.nativeElement.children.length).toBe(0);
  });

  it('instantiates AiProcessesDrawerLauncherService app-wide: its effect opens the dialog once BilateralAiService.drawerOpen is set', () => {
    configure();

    TestBed.createComponent(BilateralAiJobWatcherComponent);
    httpMock.match(() => true).forEach(req => req.flush({ response: { jobs: [], summary: { lanes_total: 0, lanes_busy: 0, others_waiting: 0 } } }));

    // Same singleton the watcher just injected — proves the launcher was constructed and is
    // already listening, not merely importable.
    const bilateralAiSE = TestBed.inject(BilateralAiService);
    expect(openDialogSpy).not.toHaveBeenCalled();

    bilateralAiSE.drawerOpen.set(true);
    TestBed.inject(ApplicationRef).tick();

    expect(openDialogSpy).toHaveBeenCalledTimes(1);
  });
});
