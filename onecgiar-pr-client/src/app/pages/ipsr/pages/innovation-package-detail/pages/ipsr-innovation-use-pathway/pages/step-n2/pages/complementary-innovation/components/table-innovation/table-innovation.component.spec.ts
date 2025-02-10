import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableInnovationComponent } from './table-innovation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrTextareaComponent } from '../../../../../../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { DialogModule } from 'primeng/dialog';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrFieldValidationsComponent } from '../../../../../../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { TooltipModule } from 'primeng/tooltip';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CustomizedAlertsFeService } from '../../../../../../../../../../../../shared/services/customized-alerts-fe.service';

describe('TableInnovationComponent', () => {
  let component: TableInnovationComponent;
  let fixture: ComponentFixture<TableInnovationComponent>;
  let mockCustomizedAlertsFeService: any;

  beforeEach(async () => {
    mockCustomizedAlertsFeService = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        TableInnovationComponent,
        PrFieldHeaderComponent,
        PrInputComponent,
        PrTextareaComponent,
        PrRadioButtonComponent,
        PrButtonComponent,
        PrFieldValidationsComponent,
        YesOrNotByBooleanPipe
      ],
      imports: [HttpClientTestingModule, FormsModule, DialogModule, TooltipModule, RadioButtonModule],
      providers: [{ provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TableInnovationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit selectEvent when selectInnovation is called', () => {
    const result = { selected: false };
    const selectInnovationSpy = jest.spyOn(component.selectEvent, 'emit');
    component.selectInnovation(result as any);
    expect(selectInnovationSpy).toHaveBeenCalledWith(result);
    expect(result.selected).toBe(true);
  });

  it('should emit cancelEvent when cancelInnovationEvent is called', () => {
    const result = { id: 1 };
    const cancelEventSpy = jest.spyOn(component.cancelEvent, 'emit');
    component.cancelInnovationEvent(result);
    expect(cancelEventSpy).toHaveBeenCalledWith(result);
  });

  it('should open new window with correct URL when openNewWindow is called', () => {
    const result = {
      result_code: 'TEST123',
      version_id: 1
    };
    const windowSpy = jest.spyOn(window, 'open').mockImplementation();
    component.openNewWindow(result);
    expect(windowSpy).toHaveBeenCalledWith(`/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`, '_blank');
  });

  it('should show confirmation dialog and delete innovation when onDelete is called', () => {
    const id = 1;
    const callback = jest.fn();

    component.onDelete(id, callback);

    expect(mockCustomizedAlertsFeService.show).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'confirm-delete-result',
        title: 'Are you sure you want to remove this complementary innovation?',
        status: 'success',
        confirmText: 'Yes, delete'
      }),
      expect.any(Function)
    );
  });

  it('should open new window with correct URL when openNewWindow is called', () => {
    const result = {
      result_code: 'TEST123',
      version_id: 1
    };
    const windowSpy = jest.spyOn(window, 'open').mockImplementation();

    component.openNewWindow(result);

    const expectedUrl = `/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`;
    expect(windowSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
  });
});
