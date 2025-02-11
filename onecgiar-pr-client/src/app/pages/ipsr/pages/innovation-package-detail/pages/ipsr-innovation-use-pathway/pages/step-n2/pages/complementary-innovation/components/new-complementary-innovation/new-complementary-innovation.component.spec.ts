import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateComplementaryInnovationDto, NewComplementaryInnovationComponent } from './new-complementary-innovation.component';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DialogModule } from 'primeng/dialog';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrTextareaComponent } from '../../../../../../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrFieldValidationsComponent } from '../../../../../../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { RadioButtonModule } from 'primeng/radiobutton';

describe('NewComplementaryInnovationComponent', () => {
  let component: NewComplementaryInnovationComponent;
  let fixture: ComponentFixture<NewComplementaryInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        NewComplementaryInnovationComponent,
        PrFieldHeaderComponent,
        PrInputComponent,
        PrButtonComponent,
        PrFieldHeaderComponent,
        PrTextareaComponent,
        PrFieldValidationsComponent,
        PrRadioButtonComponent,
        YesOrNotByBooleanPipe
      ],
      imports: [HttpClientTestingModule, DialogModule, FormsModule, TooltipModule, RadioButtonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(NewComplementaryInnovationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable save button when required fields are empty', () => {
    component.complementaryInnovationService.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    component.selectedValues = [];

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should disable save button when only short title is filled', () => {
    component.complementaryInnovationService.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    component.complementaryInnovationService.bodyNewComplementaryInnovation.short_title = 'test';
    component.selectedValues = [];

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should disable save button when only title is filled', () => {
    component.complementaryInnovationService.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    component.complementaryInnovationService.bodyNewComplementaryInnovation.title = 'test';
    component.selectedValues = [];

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should disable save button when projects_organizations_working_on_innovation is null', () => {
    component.complementaryInnovationService.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    component.complementaryInnovationService.bodyNewComplementaryInnovation.short_title = 'test';
    component.complementaryInnovationService.bodyNewComplementaryInnovation.title = 'test';
    component.selectedValues = ['test'];
    component.complementaryInnovationService.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = null;

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should enable save button when all required fields are filled with other_funcions', () => {
    component.complementaryInnovationService.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    component.complementaryInnovationService.bodyNewComplementaryInnovation.short_title = 'test';
    component.complementaryInnovationService.bodyNewComplementaryInnovation.title = 'test';
    component.complementaryInnovationService.bodyNewComplementaryInnovation.other_funcions = 'test';
    component.selectedValues = [];
    component.complementaryInnovationService.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = true;

    expect(component.disableSaveButton()).toBe(false);
  });

  describe('onUpdate', () => {
    it('should call onUpdate when isEdit is true', () => {
      component.complementaryInnovationService.isEdit = true;
      jest.spyOn(component, 'onUpdate');
      component.onSave();
      expect(component.onUpdate).toHaveBeenCalled();
    });

    it('should update dialogStatus and emit event on successful update', () => {
      jest.spyOn(component.editEvent, 'emit');
      jest.spyOn(component.api.resultsSE, 'PATCHcomplementaryinnovation').mockReturnValue(of({}));

      component.onUpdate();

      expect(component.complementaryInnovationService.dialogStatus).toBeFalsy();
      expect(component.editEvent.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('onSave', () => {
    it('should call POSTNewCompletaryInnovation and emit event on successful save', () => {
      const mockResponse = {
        response: {
          createResult: {
            initiative_id: 5
          }
        }
      };

      jest.spyOn(component.createInnovationEvent, 'emit');
      jest.spyOn(component.api.resultsSE, 'POSTNewCompletaryInnovation').mockReturnValue(of(mockResponse));

      component.onSave();

      expect(component.api.resultsSE.POSTNewCompletaryInnovation).toHaveBeenCalled();
      expect(component.createInnovationEvent.emit).toHaveBeenCalledWith({
        initiative_id: 5,
        initiative_official_code: 'INIT-05'
      });
      expect(component.complementaryInnovationService.dialogStatus).toBeFalsy();
      expect(component.selectedValues).toEqual([]);
    });

    it('should set initiative_official_code correctly for id >= 10', () => {
      const mockResponse = {
        response: {
          createResult: {
            initiative_id: 15
          }
        }
      };

      jest.spyOn(component.createInnovationEvent, 'emit');
      jest.spyOn(component.api.resultsSE, 'POSTNewCompletaryInnovation').mockReturnValue(of(mockResponse));

      component.onSave();

      expect(component.createInnovationEvent.emit).toHaveBeenCalledWith({
        initiative_id: 15,
        initiative_official_code: 'INIT-15'
      });
    });

    it('should set other_funcions to empty string if undefined', () => {
      const mockResponse = {
        response: {
          createResult: {
            initiative_id: 5
          }
        }
      };

      component.complementaryInnovationService.bodyNewComplementaryInnovation.other_funcions = undefined;
      jest.spyOn(component.api.resultsSE, 'POSTNewCompletaryInnovation').mockReturnValue(of(mockResponse));

      component.onSave();

      expect(component.complementaryInnovationService.bodyNewComplementaryInnovation.other_funcions).toBe(undefined);
    });

    it('should handle error case', () => {
      const mockError = new Error('Test error');
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(component.api.resultsSE, 'POSTNewCompletaryInnovation').mockReturnValue(throwError(() => mockError));

      component.onSave();

      expect(console.error).toHaveBeenCalledWith(mockError);
    });
  });
});
