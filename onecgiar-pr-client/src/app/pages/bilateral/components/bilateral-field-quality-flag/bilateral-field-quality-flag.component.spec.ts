import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralQualityAssessmentUiService } from '../../services/bilateral-quality-assessment-ui.service';
import { BilateralFieldQualityFlagComponent } from './bilateral-field-quality-flag.component';

describe('BilateralFieldQualityFlagComponent', () => {
  let fixture: ComponentFixture<BilateralFieldQualityFlagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralFieldQualityFlagComponent],
      providers: [{
        provide: BilateralQualityAssessmentUiService,
        useValue: {
          flagForField: jest.fn(() => ({ verdict: 'amber', issues: ['Add the country.'] })),
          flagForSection: jest.fn(() => null),
          setFieldMarkerRendered: jest.fn(),
        },
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralFieldQualityFlagComponent);
    fixture.componentRef.setInput('section', 'geographic_location');
    fixture.componentRef.setInput('field', 'countries');
    fixture.detectChanges();
  });

  it('treats every visible text fragment as the same disclosure control', () => {
    const button = fixture.nativeElement.querySelector('.bfq__line') as HTMLButtonElement;
    const fragments = fixture.nativeElement.querySelectorAll(
      '.bfq__dot, .bfq__verdict, .bfq__cue, .bfq__chevron',
    ) as NodeListOf<HTMLElement>;

    // The wrapper has no pointer events, so clicks landing on any fragment are handled by the one
    // full-row button. This protects the interaction reported in UAT: no word is a dead zone.
    for (const fragment of fragments) {
      fragment.click();
      fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      button.click();
      fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('copies the complete AI feedback when its expanded text is clicked', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    (fixture.nativeElement.querySelector('.bfq__line') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.bfq__body') as HTMLElement).click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith('AI feedback for this field\nAdd the country.');
    expect(fixture.nativeElement.querySelector('.bfq__copy')?.textContent).toContain('Copied');
  });
});
