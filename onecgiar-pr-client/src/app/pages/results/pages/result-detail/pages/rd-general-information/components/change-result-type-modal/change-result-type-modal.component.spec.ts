import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeResultTypeModalComponent } from './change-result-type-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ResultsListFilterService } from '../../../../../results-outlet/pages/results-list/services/results-list-filter.service';
import { ChangeResultTypeServiceService } from '../../services/change-result-type-service.service';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { PrInputComponent } from '../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { PrFieldValidationsComponent } from '../../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { FormsModule } from '@angular/forms';

describe('ChangeResultTypeModalComponent', () => {
  let component: ChangeResultTypeModalComponent;
  let fixture: ComponentFixture<ChangeResultTypeModalComponent>;
  let mockApiService: any;
  let mockResultsListFilterService: any;
  let mockChangeResultTypeService: any;
  let mockRouter: any;
  const mockGET_mqapValidationResponse = { id: 123, title: 'Mock Title' };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        currentResultCode: '123',
        currentResultPhase: '456',
        currentResultId: '789',
        POST_createWithHandle: () => of({}),
        PATCH_createWithHandleChangeType: () => of({}),
        GET_mqapValidation: () => of({response:mockGET_mqapValidationResponse}),
      },
      dataControlSE: {
        changeResultTypeModal: false
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockResultsListFilterService = {
      filters: {
        resultLevel: [
          { id: 1, options: [{ id: 1, selected: false }] },
          { id: 2, options: [{ id: 2, selected: false }] },
        ],
      },
    };

    mockChangeResultTypeService = {
      showFilters: true,
      showConfirmation: false,
      step: 0,
      justification: '',
      otherJustification: '',
    };

    mockRouter = {
      url: '/result/results-outlet/results-list',
      navigateByUrl: jest.fn(),
    };

    await TestBed.configureTestingModule({
      declarations: [
        ChangeResultTypeModalComponent,
        PrInputComponent,
        PrFieldHeaderComponent,
        YesOrNotByBooleanPipe,
        PrFieldValidationsComponent
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultsListFilterService, useValue: mockResultsListFilterService },
        { provide: ChangeResultTypeServiceService, useValue: mockChangeResultTypeService },
        { provide: Router, useValue: mockRouter },
      ],
      imports: [
        HttpClientTestingModule,
        DialogModule,
        FormsModule
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(ChangeResultTypeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnChanges()', () => {
    it('should handle ngOnChanges', () => {
      const changes = {
        body: {
          currentValue: {
            result_code: '123',
            version_id: '456'
          }
        }
      } as any;
      component.ngOnChanges(changes);

      expect(component.body['result_code']).toBe('123');
      expect(component.body['version_id']).toBe('456');
    });
  });

  describe('CGSpaceDesc()', () => {
    it('should generate the correct disclaimer string', () => {
      component.body.result_name = 'result'
      const result = component.CGSpaceDesc();

      expect(result).toContain('<strong>Disclaimer:</strong>');
      expect(result).toContain('result');
      expect(result).toContain('will be replace by the CGSpace title.');
    });
  });

  describe('modalConfirmOrContinueText()', () => {
    it('should return "Confirm" if selectedResultType id is not 6', () => {
      component.selectedResultType = {
        id: 1,
        name: 'Test',
        description: 'Test',
        resultLevelId: 1,
        selected: false
      };
      const result = component.modalConfirmOrContinueText();
      expect(result).toBe('Confirm');
    });

    it('should return "Confirm" if selectedResultType id is 6 and changeType step is 1', () => {
      component.selectedResultType = {
        id: 6,
        name: 'Test',
        description: 'Test',
        resultLevelId: 1,
        selected: false
      };
      component.changeType.step = 1;
      const result = component.modalConfirmOrContinueText();
      expect(result).toBe('Confirm');
    });


    it('should return "Continue" if selectedResultType id is 6 and changeType step is not 1', () => {
      component.selectedResultType = {
        id: 6,
        name: 'Test',
        description: 'Test',
        resultLevelId: 1,
        selected: false,
      };
      component.changeType.step = 0;
      const result = component.modalConfirmOrContinueText();
      expect(result).toBe('Continue');
    });
  });

  describe('disableOptionValidation()', () => {
    it('should have disableOptionValidation return true', () => {
      component.body.result_type_id = 1;
      component.body.result_level_id = 1;

      const option1 = {
        id: 1,
        name: 'Test1',
        description: 'Test1',
        resultLevelId: 1,
        selected: false
      };
      const option2 = {
        id: 2,
        name: 'Test2',
        description: 'Test2',
        resultLevelId: 2,
        selected: false
      };
      const result1 = component.disableOptionValidation(option1);
      const result2 = component.disableOptionValidation(option2);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
    });

    it('should have disableOptionValidation return false', () => {
      component.body.result_type_id = 1;
      component.body.result_level_id = 1;

      const option = {
        id: 2,
        name: 'Test2',
        description: 'Test2',
        resultLevelId: 3,
        selected: false
      };
      const result = component.disableOptionValidation(option);

      expect(result).toBeFalsy();
    });
  });

  describe('onSelectOneChip()', () => {
    it('should handle onSelectOneChip', () => {
      const option = {
        id: 1,
        name: 'Test',
        description: 'Test',
        resultLevelId: 1,
        selected: false
      };
      component.disableOptionValidation = jest.fn(() => false);

      component.onSelectOneChip(option);

      expect(component.selectedResultType.selected).toBeTruthy();
      expect(component.changeType.showFilters).toBeTruthy();
      expect(component.changeType.showConfirmation).toBe(option.id !== 6);
    });
  });

  describe('onCloseModal()', () => {
    it('should reset modal state on close', () => {
      component.onCloseModal();

      expect(component.changeType.step).toBe(0);
      expect(component.selectedResultType).toBe(null);
      expect(component.changeType.justification).toBe('');
      expect(component.cgSpaceTitle).toBe('');
      expect(component.cgSpaceHandle).toBe('');
      expect(component.changeType.showConfirmation).toBeFalsy();
      expect(component.changeType.showFilters).toBeTruthy();
      expect(mockApiService.dataControlSE.changeResultTypeModal).toBeFalsy();
    });
  });

  describe('onCancelModal()', () => {
    it('should handle cancelation for selected result type 6', () => {
      component.selectedResultType = {
        id: 6,
        description: 'description',
        name: 'name',
        resultLevelId: 1,
        selected: false
      };
      component.changeType.step = 0;

      component.onCancelModal();

      expect(mockApiService.dataControlSE.changeResultTypeModal).toBeFalsy();
    });
    it('should handle cancelation for selected result type 6 and step 1', () => {
      component.selectedResultType = {
        id: 6,
        description: 'description',
        name: 'name',
        resultLevelId: 1,
        selected: false
      };
      component.changeType.step = 1;

      component.onCancelModal();

      expect(component.changeType.showConfirmation).toBeFalsy();
      expect(component.changeType.showFilters).toBeTruthy();
      expect(component.changeType.step).toBe(0);
      expect(component.changeType.justification).toBe('');
      expect(component.changeType.otherJustification).toBe('');
    });
    it('should handle cancelation for result types other than 6', () => {
      component.selectedResultType = {
        id: 5,
        description: 'description',
        name: 'name',
        resultLevelId: 1,
        selected: false
      };

      component.onCancelModal();

      expect(mockApiService.dataControlSE.changeResultTypeModal).toBeFalsy();
      expect(component.changeType.showFilters).toBeTruthy();
    });
  });

  describe('isContinueButtonDisabled()', () => {
    it('should disable continue button when isChagingType is true', () => {
      component.isChagingType = true;

      const result = component.isContinueButtonDisabled();

      expect(result).toBeTruthy();
    });
  });
  it('should disable continue button when selectedResultType is not set', () => {
    component.isChagingType = false;
    component.selectedResultType = null;

    const result = component.isContinueButtonDisabled();

    expect(result).toBeTruthy();
  });
  it('should disable continue button when selectedResultType is 6 and step 0 with cgSpaceTitle empty', () => {
    component.isChagingType = false;
    component.selectedResultType = {
      id: 6,
      description: 'description',
      name: 'name',
      resultLevelId: 1,
      selected: false
    };
    component.changeType.step = 0;
    component.cgSpaceTitle = '';

    const result = component.isContinueButtonDisabled();

    expect(result).toBeTruthy();
  });
  it('should disable continue button when selectedResultType is 6 and step 1 with justification empty', () => {
    component.isChagingType = false;
    component.selectedResultType = {
      id: 6,
      description: 'description',
      name: 'name',
      resultLevelId: 1,
      selected: false
    };
    component.changeType.step = 1;
    component.changeType.justification = '';

    const result = component.isContinueButtonDisabled();

    expect(result).toBeTruthy();
  });
  it('should disable continue button when selectedResultType is not 6 and justification is empty', () => {
    component.isChagingType = false;
    component.selectedResultType = {
      id: 5,
      description: 'description',
      name: 'name',
      resultLevelId: 1,
      selected: false
    };
    component.changeType.justification = '';

    const result = component.isContinueButtonDisabled();

    expect(result).toBeTruthy();
  });
  it('should disable continue button when selectedResultType is not 6 and justification is "Other" but otherJustification is empty', () => {
    component.isChagingType = false;
    component.selectedResultType = {
      id: 5,
      description: 'description',
      name: 'name',
      resultLevelId: 1,
      selected: false
    };
    component.changeType.justification = 'Other';
    component.changeType.otherJustification = '';

    const result = component.isContinueButtonDisabled();

    expect(result).toBeTruthy();
  });
  it('should enable continue button when conditions are met', () => {
    component.isChagingType = false;
    component.selectedResultType = {
      id: 5,
      description: 'description',
      name: 'name',
      resultLevelId: 1,
      selected: false
    };
    component.changeType.justification = 'Some Justification';

    const result = component.isContinueButtonDisabled();

    expect(result).toBeFalsy();
  });

  describe('isContinueButtonDisabled()', () => {

    it('should change result type for Knowledge Product and show success alert on success when changeType.justification is not "Other"', () => {
      component.changeType.justification = 'test';
      const postCreateWithHandleSpy = jest.spyOn(mockApiService.resultsSE, 'POST_createWithHandle')
      const showSuccessAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');
      const routerNavigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);
      const spy = jest.spyOn(component,'onCloseModal');
      component.changeResultTypeKP();

      expect(component.isChagingType).toBeFalsy();
      expect(postCreateWithHandleSpy).toHaveBeenCalled();
      expect(showSuccessAlertSpy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      expect(routerNavigateByUrlSpy).toHaveBeenCalledWith('/result/results-outlet/results-list');
    });
    it('should change result type for Knowledge Product and show success alert on success when changeType.justification = "Other"', () => {
      component.changeType.justification = 'Other'
      const postCreateWithHandleSpy = jest.spyOn(mockApiService.resultsSE, 'POST_createWithHandle')
      const showSuccessAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');
      const routerNavigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);
      const spy = jest.spyOn(component,'onCloseModal');
      component.changeResultTypeKP();

      expect(component.isChagingType).toBeFalsy();
      expect(postCreateWithHandleSpy).toHaveBeenCalled();
      expect(showSuccessAlertSpy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      expect(routerNavigateByUrlSpy).toHaveBeenCalledWith('/result/results-outlet/results-list');
    });
    it('should show error alert on failure', async () => {
      const postCreateWithHandleSpy = jest.spyOn(mockApiService.resultsSE, 'POST_createWithHandle')
        .mockReturnValue(throwError({ error: { message: 'Some error' } }));
      const showErrorAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.changeResultTypeKP();

      expect(component.isChagingType).toBeFalsy();
      expect(postCreateWithHandleSpy).toHaveBeenCalled();
      expect(showErrorAlertSpy).toHaveBeenCalledWith({ id: 'reportResultError', title: 'Error!', description: 'Some error', status: 'error' });
    });
  });

  describe('changeResultTypeOther', () => {
    it('should show success alert on successful request when changeType.justification is not "Other"', async () => {
      component.selectedResultType = {
        id: 6,
        description: 'description',
        name: 'name',
        resultLevelId: 1,
        selected: false
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_createWithHandleChangeType')
      const showSuccessAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);

      component.changeResultTypeOther();

      expect(component.isChagingType).toBeFalsy();
      expect(spy).toHaveBeenCalled();
      expect(showSuccessAlertSpy).toHaveBeenCalledWith({ id: 'reportResultSuccess', title: 'Result type successfully updated', status: 'success', closeIn: 600 });
      expect(navigateByUrlSpy).toHaveBeenCalledWith(`/result/results-outlet/results-list`);
    });
    it('should show success alert on successful request when changeType.justification is "Other"', async () => {
      component.selectedResultType = {
        id: 6,
        description: 'description',
        name: 'name',
        resultLevelId: 1,
        selected: false
      };
      component.changeType.justification = 'Other';
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_createWithHandleChangeType')
      const showSuccessAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);

      component.changeResultTypeOther();

      expect(component.isChagingType).toBeFalsy();
      expect(spy).toHaveBeenCalled();
      expect(showSuccessAlertSpy).toHaveBeenCalledWith({ id: 'reportResultSuccess', title: 'Result type successfully updated', status: 'success', closeIn: 600 });
      expect(navigateByUrlSpy).toHaveBeenCalledWith(`/result/results-outlet/results-list`);
    });
    it('should show error alert on failure', async () => {
      component.selectedResultType = {
        id: 6,
        description: 'description',
        name: 'name',
        resultLevelId: 1,
        selected: false
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_createWithHandleChangeType')
      .mockReturnValue(throwError({ error: { message: 'Some error' } }));
      const showErrorAlertSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.changeResultTypeOther();

      expect(spy).toHaveBeenCalled();
      expect(component.isChagingType).toBeFalsy();
      expect(showErrorAlertSpy).toHaveBeenCalledWith({ id: 'reportResultError', title: 'Error!', description: 'Some error', status: 'error' });
    });
  });

  describe('changeResultType', () => {
    it('should show confirmation modal on step 0 for result type 6', () => {
      component.selectedResultType = {
        id: 6,
        resultLevelId: 2,
        name: 'name',
        description: 'description',
        selected: true
      };
      component.changeType.step = 0;

      component.changeResultType();

      expect(component.changeType.showConfirmation).toBeTruthy();
      expect(component.changeType.showFilters).toBeFalsy();
      expect(component.changeType.step).toBe(1);
    });
    it('should call changeResultTypeKP on step 1 for result type 6', () => {
      component.selectedResultType = {
        id: 6,
        resultLevelId: 2,
        name: 'name',
        description: 'description',
        selected: true
      };
      component.changeType.step = 1;
      const changeResultTypeKPSpy = jest.spyOn(component, 'changeResultTypeKP');

      component.changeResultType();

      expect(changeResultTypeKPSpy).toHaveBeenCalled();
    });
    it('should do nothing for unknown result type', () => {
      component.selectedResultType = {
        id: 6,
        resultLevelId: 2,
        name: 'name',
        description: 'description',
        selected: true
      };
      component.changeType.step = 3;

      const changeResultTypeKPSpy = jest.spyOn(component, 'changeResultTypeKP');
      const changeResultTypeOtherSpy = jest.spyOn(component, 'changeResultTypeOther');

      component.changeResultType();

      expect(changeResultTypeKPSpy).not.toHaveBeenCalled();
      expect(changeResultTypeOtherSpy).not.toHaveBeenCalled();
    });
    it('should call changeResultTypeOther for other result types', () => {
      component.selectedResultType = {
        id: 1,
        resultLevelId: 2,
        name: 'name',
        description: 'description',
        selected: true
      };
      const changeResultTypeOtherSpy = jest.spyOn(component, 'changeResultTypeOther');

      component.changeResultType();

      expect(component.changeType.showFilters).toBeTruthy();
      expect(changeResultTypeOtherSpy).toHaveBeenCalled();
    });
  });

  describe('changeResultType', () => {
    it('should set validating to true and handle successful validation', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_mqapValidation')

      component.GET_mqapValidation();

      expect(spy).toHaveBeenCalled();
      expect(mockApiService.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(component.cgSpaceHandle);
      expect(component.mqapJson).toEqual({ id: "789", title: 'Mock Title' });
      expect(component.cgSpaceTitle).toBe('Mock Title');
      expect(component.validating).toBeFalsy();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'reportResultSuccess',
        title: 'Metadata successfully retrieved',
        description: 'Title: Mock Title',
        status: 'success',
      });
    });
    it('should set validating to false and handle validation error', () => {
      const mockError = { error: { message: 'Validation Error' } };
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_mqapValidation')
      .mockReturnValue(throwError(mockError));

      component.GET_mqapValidation();

      expect(spy).toHaveBeenCalled();
      expect(mockApiService.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(component.cgSpaceHandle);
      expect(component.cgSpaceTitle).toBe('');
      expect(component.validating).toBeFalsy();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'reportResultError',
        title: 'Error!',
        description: 'Validation Error',
        status: 'error',
      });
    });
  });
});
