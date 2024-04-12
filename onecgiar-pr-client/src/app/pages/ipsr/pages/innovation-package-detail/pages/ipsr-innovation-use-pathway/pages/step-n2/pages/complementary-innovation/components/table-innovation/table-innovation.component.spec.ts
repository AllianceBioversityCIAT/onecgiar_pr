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
import { of } from 'rxjs';
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
      declarations: [TableInnovationComponent, PrFieldHeaderComponent, PrInputComponent, PrTextareaComponent, PrRadioButtonComponent, PrButtonComponent, PrFieldValidationsComponent, YesOrNotByBooleanPipe],
      imports: [HttpClientTestingModule, FormsModule, DialogModule, TooltipModule, RadioButtonModule],
      providers: [{ provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TableInnovationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit selectInnovationEvent when selectInnovation is called', () => {
    const result = { selected: false };
    const selectInnovationSpy = jest.spyOn(component.selectInnovationEvent, 'emit');
    component.selectInnovation(result as any);
    expect(selectInnovationSpy).toHaveBeenCalledWith(result);
    expect(result.selected).toBe(true);
  });

  it('should set status to true and isReadonly to true when getComplementaryInnovation is called with result_type_id 11 and isRead 0', () => {
    const id = 1;
    const isRead = 0;
    const result = { result_type_id: 11 };
    const mockResponse = {
      response: {
        findResultComplementaryInnovation: {
          projects_organizations_working_on_innovation: [],
          specify_projects_organizations: []
        },
        findResult: {
          title: '',
          description: ''
        },
        findComplementaryInnovationFuctions: []
      }
    };

    jest.spyOn(component.api.resultsSE, 'GETComplementaryById').mockReturnValue(of(mockResponse));
    component.getComplementaryInnovation(id, isRead, result);
    expect(component.status).toBe(true);
    expect(component.isReadonly).toBe(true);
    expect(component.idInnovation).toBe(id);
  });

  it('should open a new page when getComplementaryInnovation is called with result_type_id not equal to 11', () => {
    const result = { result_type_id: 10, result_code: '123', version_id: 1 };
    const windowOpenSpy = jest.spyOn(window, 'open');
    component.getComplementaryInnovation(1, 0, result);
    expect(windowOpenSpy).toHaveBeenCalledWith('/result/result-detail/123/general-information?phase=1', '_blank');
  });

  it('should add a new input to referenceMaterials when addNewInput is called and referenceMaterials length is less than 3', () => {
    component.informationComplentary.referenceMaterials = [];
    component.addNewInput();
    expect(component.informationComplentary.referenceMaterials.length).toBe(1);
  });

  it('should set statusAdd to true when addNewInput is called and referenceMaterials length is equal to 3', () => {
    component.informationComplentary.referenceMaterials = [{ link: 'link1' }, { link: 'link2' }, { link: 'link3' }];
    component.addNewInput();
    expect(component.statusAdd).toBe(true);
  });

  it('should call PATCHcomplementaryinnovation and emit saveedit when onSave is called', () => {
    component.selectComplementary = [1, 2, 3];
    component.idInnovation = 1;

    const PatchSpy = jest.spyOn(component.api.resultsSE, 'PATCHcomplementaryinnovation').mockReturnValue(of({}));
    const emitSpy = jest.spyOn(component.saveedit, 'emit');
    component.onSave();
    expect(PatchSpy).toHaveBeenCalledWith(component.informationComplentary, component.idInnovation);
    expect(component.status).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('should call DELETEcomplementaryinnovation and emit saveedit when Ondelete is called', () => {
    const id = 1;
    const alertFeSpy = jest.spyOn(mockCustomizedAlertsFeService, 'show');
    const deleteComplementary = jest.spyOn(component.api.resultsSE, 'DELETEcomplementaryinnovation').mockReturnValue(of({}));
    const emitSpy = jest.spyOn(component.saveedit, 'emit');
    component.Ondelete(id);
    expect(alertFeSpy).toHaveBeenCalled();
    expect(deleteComplementary).toHaveBeenCalledWith(id);
    expect(component.status).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith(true);
  });
});
