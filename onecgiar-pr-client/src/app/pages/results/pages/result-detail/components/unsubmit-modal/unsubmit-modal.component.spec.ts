import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnsubmitModalComponent } from './unsubmit-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrWordCounterComponent } from '../../../../../../custom-fields/pr-word-counter/pr-word-counter.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';

describe('UnsubmitModalComponent', () => {
  let component: UnsubmitModalComponent;
  let fixture: ComponentFixture<UnsubmitModalComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        PATCH_unsubmit: () => of({ response: [] }),
        GET_TypeByResultLevel: () => of({ response: [] }),
        GET_resultById: () => of({ response: [] }),
      },
      alertsFe: {
        show: jest.fn()
      }
    }
    await TestBed.configureTestingModule({
      declarations: [
        UnsubmitModalComponent,
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
        TextareaModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnsubmitModalComponent);
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
    it('should call PATCH_unsubmit, set requesting to true and handle successful submission',() => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_unsubmit');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(component.comment);
      expect(component.requesting).toBeFalsy();
      expect(component.unsubmitModalSE.showModal).toBeFalsy();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'unsubmodal',
        title: `Success`,
        description: `The result has been unsubmitted.`,
        status: 'success',
      });
    });
    it('should handle error on PATCH_unsubmit call',() => {
      const errorMessage = {
        error:{
          message: 'error message'
        }
        };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_unsubmit')
        .mockReturnValue(throwError(errorMessage));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(component.comment);
      expect(component.requesting).toBeFalsy();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'unsubmodalerror',
        title: `Error in unsubmitted`,
        description: '',
        status: 'error',
      });
    });
  });
});

