import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationTeamDiversityComponent } from './innovation-team-diversity.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../../shared/directives/feedback-validation-directive.module';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

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

  describe('isComplete', () => {
    it('returns false when innovation_team_diversity is undefined (no options set)', () => {
      expect(component.isComplete).toBe(false);
    });

    it('returns false when radioButtonValue is unset on the question', () => {
      component.options = {
        innovation_team_diversity: {
          question_text: 'q112',
          question_description: 'desc',
          options: []
        }
      } as any;

      expect(component.isComplete).toBe(false);
    });

    it('returns true when radioButtonValue is set on the question', () => {
      component.options = {
        innovation_team_diversity: {
          question_text: 'q112',
          question_description: 'desc',
          options: [],
          radioButtonValue: '1'
        }
      } as any;

      expect(component.isComplete).toBe(true);
    });
  });

  describe('appFeedbackValidation wiring (template)', () => {
    beforeEach(() => {
      component.options = {
        innovation_team_diversity: {
          question_text: 'q112',
          question_description: 'desc',
          options: []
        }
      } as any;
      fixture.detectChanges();
    });

    it('binds [isComplete] to the component getter and reflects incompleteness', () => {
      const feedbackEl: HTMLElement = fixture.nativeElement.querySelector('[appFeedbackValidation]');
      expect(feedbackEl).toBeTruthy();
      expect(component.isComplete).toBe(false);

      (component.options as any).innovation_team_diversity.radioButtonValue = '1';
      fixture.detectChanges();

      expect(component.isComplete).toBe(true);
    });
  });
});
