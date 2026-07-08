import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationTeamDiversityComponent } from './innovation-team-diversity.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../../shared/directives/feedback-validation-directive.module';

describe('InnovationTeamDiversityComponent', () => {
  let component: InnovationTeamDiversityComponent;
  let fixture: ComponentFixture<InnovationTeamDiversityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        InnovationTeamDiversityComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent,
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        FeedbackValidationDirectiveModule
      ],

    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationTeamDiversityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have default values on initialization', () => {
    expect(component.body).toEqual(new InnovationDevInfoBody());
    expect(component.options).toBeUndefined();
    expect(component.example11).toBeNull();
  });

  describe('isTeamDiversityComplete (P2-3060)', () => {
    it('returns false when options are undefined', () => {
      component.options = undefined as any;
      expect(component.isTeamDiversityComplete()).toBe(false);
    });

    it('returns false when no option is selected', () => {
      component.options = { innovation_team_diversity: {} } as any;
      expect(component.isTeamDiversityComplete()).toBe(false);
    });

    it('returns false when radioButtonValue is null or empty', () => {
      component.options = { innovation_team_diversity: { radioButtonValue: null } } as any;
      expect(component.isTeamDiversityComplete()).toBe(false);
      component.options = { innovation_team_diversity: { radioButtonValue: '' } } as any;
      expect(component.isTeamDiversityComplete()).toBe(false);
    });

    it('returns true when radioButtonValue is set', () => {
      component.options = { innovation_team_diversity: { radioButtonValue: 123 } } as any;
      expect(component.isTeamDiversityComplete()).toBe(true);
    });
  });

  describe('appFeedbackValidation DOM marker (P2-3060 end-to-end)', () => {
    const getMarker = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('.pr-field.mandatory');

    it('renders a mandatory marker without .complete when no option is selected (alert active)', () => {
      component.options = { innovation_team_diversity: { options: [], radioButtonValue: null } } as any;
      fixture.detectChanges();
      const marker = getMarker();
      expect(marker).not.toBeNull();
      expect(marker!.classList.contains('complete')).toBe(false);
    });

    it('adds .complete to the marker when an option is selected (alert cleared)', () => {
      component.options = { innovation_team_diversity: { options: [], radioButtonValue: 456 } } as any;
      fixture.detectChanges();
      const marker = getMarker();
      expect(marker).not.toBeNull();
      expect(marker!.classList.contains('complete')).toBe(true);
    });
  });
});
