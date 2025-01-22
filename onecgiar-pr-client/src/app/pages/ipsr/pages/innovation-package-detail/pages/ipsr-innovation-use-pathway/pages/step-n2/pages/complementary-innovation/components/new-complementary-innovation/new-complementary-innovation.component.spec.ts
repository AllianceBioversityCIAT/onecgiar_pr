import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewComplementaryInnovationComponent } from './new-complementary-innovation.component';
import { of } from 'rxjs';
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

  it('should return true when short_title is empty', () => {
    component.bodyNewComplementaryInnovation.short_title = '';
    component.bodyNewComplementaryInnovation.title = 'Title';
    component.selectedValues = [{ complementary_innovation_functions_id: 1 }];
    component.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = true;

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should return true when title is empty', () => {
    component.bodyNewComplementaryInnovation.short_title = 'Short Title';
    component.bodyNewComplementaryInnovation.title = '';
    component.selectedValues = [{ complementary_innovation_functions_id: 1 }];
    component.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = true;

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should return true when selectedValues is empty', () => {
    component.bodyNewComplementaryInnovation.short_title = 'Short Title';
    component.bodyNewComplementaryInnovation.title = 'Title';
    component.selectedValues = [];
    component.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = true;

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should return true when projects_organizations_working_on_innovation is null', () => {
    component.bodyNewComplementaryInnovation.short_title = 'Short Title';
    component.bodyNewComplementaryInnovation.title = 'Title';
    component.selectedValues = [{ complementary_innovation_functions_id: 1 }];
    component.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = null;

    expect(component.disableSaveButton()).toBe(true);
  });

  it('should return false when all required fields are filled', () => {
    component.bodyNewComplementaryInnovation.short_title = 'Short Title';
    component.bodyNewComplementaryInnovation.title = 'Title';
    component.selectedValues = [{ complementary_innovation_functions_id: 1 }];
    component.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation = true;

    expect(component.disableSaveButton()).toBe(false);
  });

  it('should initialize linksComplemntaryInnovation with three empty links', () => {
    expect(component.linksComplemntaryInnovation).toEqual([{ link: '' }, { link: '' }, { link: '' }]);
  });

  it('should filter out empty links and update bodyNewComplementaryInnovation when onSave is called', () => {
    component.linksComplemntaryInnovation = [{ link: 'https://example.com' }, { link: '' }, { link: 'https://example.org' }];
    component.selectedValues = [{ complementary_innovation_functions_id: 1 }, { complementary_innovation_functions_id: 2 }];
    component.ipsrDataControlSE.detailData = { ...component.ipsrDataControlSE.detailData, inititiative_id: '123' };
    component.bodyNewComplementaryInnovation.other_funcions = undefined;

    component.onSave(() => {
      expect(component.linksComplemntaryInnovation).toEqual([{ link: 'https://example.com' }, { link: 'https://example.org' }]);
      expect(component.bodyNewComplementaryInnovation.complementaryFunctions).toEqual([
        { complementary_innovation_functions_id: 1 },
        { complementary_innovation_functions_id: 2 }
      ]);
      expect(component.bodyNewComplementaryInnovation.initiative_id).toBe(123);
      expect(component.bodyNewComplementaryInnovation.other_funcions).toBe('');
    });
  });

  it('should emit createInnovationEvent with the response when onSave is called', () => {
    const mockApiResponse = {
      response: {
        createResult: {
          initiative_id: 1
        }
      }
    };
    const emitSpy = jest.spyOn(component.createInnovationEvent, 'emit');
    const apiResultsSEPostNewCompletaryInnovationSpy = jest
      .spyOn(component.api.resultsSE, 'POSTNewCompletaryInnovation')
      .mockReturnValue(of(mockApiResponse));

    component.onSave(() => {
      expect(apiResultsSEPostNewCompletaryInnovationSpy).toHaveBeenCalledWith(component.bodyNewComplementaryInnovation);
    });

    expect(emitSpy).toHaveBeenCalledWith({ initiative_id: 1, initiative_official_code: 'INIT-01' });
  });
});
