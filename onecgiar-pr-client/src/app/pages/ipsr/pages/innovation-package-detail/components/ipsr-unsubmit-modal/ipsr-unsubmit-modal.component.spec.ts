import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrUnsubmitModalComponent } from './ipsr-unsubmit-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrWordCounterComponent } from '../../../../../../custom-fields/pr-word-counter/pr-word-counter.component';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { DialogModule } from 'primeng/dialog';
import { PrFieldValidationsComponent } from '../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { InputTextarea } from 'primeng/inputtextarea';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TextareaModule } from 'primeng/textarea';

describe('IpsrUnsubmitModalComponent', () => {
  let component: IpsrUnsubmitModalComponent;
  let fixture: ComponentFixture<IpsrUnsubmitModalComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService:any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        PATCHSubmissionsUnsubmitIpsr:() => of({ response: {
          innoPckg: {
            status_id: 'status_id'
          }
        }}),
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockIpsrDataControlService = {
      detailData: {
        status_id: 'status_id'
      },
      modals: {
        unsubmit: true
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        IpsrUnsubmitModalComponent,
        PrButtonComponent,
        PrTextareaComponent,
        PrWordCounterComponent,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent,
      ],
      imports: [
        HttpClientTestingModule,
        TooltipModule,
        FormsModule,
        DialogModule,
        BrowserAnimationsModule,
        TextareaModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: IpsrDataControlService,
          useValue: mockIpsrDataControlService
        },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrUnsubmitModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('cleanObject', () => {
    it('should clean the comment on cleanObject', () => {
      component.comment = 'comment';
      component.cleanObject();
      expect(component.comment).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('should set requesting to true and call PATCHSubmissionsUnsubmitIpsr', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCHSubmissionsUnsubmitIpsr');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const comment = 'comment';
      component.comment = comment
      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(comment);
      expect(mockIpsrDataControlService.detailData.status_id).toBe('status_id');
      expect(spyShow).toHaveBeenCalledWith({
        id: 'unsubmodal',
        title: 'Success',
        description: 'The result has been unsubmitted.',
        status: 'success'
      });
      expect(mockIpsrDataControlService.modals.unsubmit).toBeFalsy();
      expect(component.requesting).toBeFalsy();
    });
  });
  it('should set requesting to false and show error alert on PATCHSubmissionsUnsubmitIpsr error', () => {
    const errorResponse = { message: 'Error in unsubmitted' };
    const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
    const spy = jest.spyOn(mockApiService.resultsSE, 'PATCHSubmissionsUnsubmitIpsr').mockReturnValue(throwError(errorResponse));

    component.onSubmit();

    expect(component.requesting).toBeFalsy();
    expect(spy).toHaveBeenCalled();
    expect(spyShow).toHaveBeenCalledWith({
      id: 'unsubmodalerror',
      title: 'Error in unsubmitted',
      description: '',
      status: 'error'
    });
  });
});
