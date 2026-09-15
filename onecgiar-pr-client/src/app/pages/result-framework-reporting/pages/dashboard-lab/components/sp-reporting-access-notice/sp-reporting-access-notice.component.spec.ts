import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SpReportingAccessNoticeComponent } from './sp-reporting-access-notice.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PLATFORM_GUIDE_COPY } from '../../../../../results/pages/results-outlet/pages/results-list/components/results-center-reporting-guide/platform-guide-copy';

describe('SpReportingAccessNoticeComponent', () => {
  let fixture: ComponentFixture<SpReportingAccessNoticeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpReportingAccessNoticeComponent],
      providers: [
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            dataControlSE: { reportingCurrentPhase: { phaseYear: 2026 } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpReportingAccessNoticeComponent);
    fixture.detectChanges();
  });

  it('renders the pooled-funding access notice and browse link', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="sp-reporting-access-notice"]')).toBeTruthy();
    expect(el.textContent).toContain(PLATFORM_GUIDE_COPY.w12NoSpTitle);
    expect(el.textContent).toContain(PLATFORM_GUIDE_COPY.w12NoSpLink);
  });

  it('shows emerging hint by default', () => {
    expect(fixture.nativeElement.textContent).toContain(PLATFORM_GUIDE_COPY.emergingTitle);
  });

  it('hides emerging hint when showEmergingHint is false', () => {
    fixture.componentRef.setInput('showEmergingHint', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(PLATFORM_GUIDE_COPY.emergingTitle);
  });
});
