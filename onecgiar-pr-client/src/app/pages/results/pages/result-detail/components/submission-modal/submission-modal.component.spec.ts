import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionModalComponent } from './submission-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrWordCounterComponent } from '../../../../../../custom-fields/pr-word-counter/pr-word-counter.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';


describe('SubmissionModalComponent', () => {
  let component: SubmissionModalComponent;
  let fixture: ComponentFixture<SubmissionModalComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        PATCH_submit: () => of({ response: [] }),
        GET_TypeByResultLevel: () => of({ response: [] }),
        GET_resultById: () => of({ response: [] }),
      },
      alertsFe: {
        show: jest.fn()
      }
    }

    await TestBed.configureTestingModule({
      declarations: [
        SubmissionModalComponent,
        PrButtonComponent,
        PrTextareaComponent,
        PrWordCounterComponent,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent
      ],
      imports: [
        HttpClientTestingModule,
        DialogModule,
        TooltipModule,
        FormsModule,
        InputTextareaModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmissionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('cleanObject', () => {
    it('should clean comment property', () => {
      component.comment = 'Some comment';

      component.cleanObject();

      expect(component.comment).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('should call PATCH_submit, set requesting to true and handle successful submission',() => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_submit');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(component.comment);
      expect(component.requesting).toBeFalsy();
      expect(component.submissionModalSE.showModal).toBeFalsy();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'submodal',
        title: `Success`,
        description: `The result has been submitted.`,
        status: 'success',
      });
    });
    it('should handle error on PATCH_submit call',() => {
      const errorMessage = {
        error:{
          message: 'error message'
        }
        };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_submit')
        .mockReturnValue(throwError(errorMessage));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(component.comment);
      expect(component.requesting).toBeFalsy();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'submodalerror',
        title: `Error in submitting`,
        description: `error message`,
        status: 'error',
      });
    });
  });
});
