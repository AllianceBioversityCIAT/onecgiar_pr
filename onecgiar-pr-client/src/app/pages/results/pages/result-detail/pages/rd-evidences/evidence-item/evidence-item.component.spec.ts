import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvidenceItemComponent } from './evidence-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { PrCheckboxComponent } from '../../../../../../../custom-fields/pr-checkbox/pr-checkbox.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrRadioButtonComponent } from '../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrTextareaComponent } from '../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { PrFieldValidationsComponent } from '../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';

jest.useFakeTimers();

describe('EvidenceItemComponent', () => {
  let component: EvidenceItemComponent;
  let fixture: ComponentFixture<EvidenceItemComponent>;
  const mockEvidences: EvidencesCreateInterface = {
    gender_related: false,
    youth_related: false,
    nutrition_related: false,
    environmental_biodiversity_related: false,
    poverty_related: false
  };
  let mockApiService: any;
  let mockDataControlService: any;

  beforeEach(async () => {
    mockApiService = {
      alertsFe: {
        show: jest.fn()
      }
    };

    mockDataControlService = {
      isKnowledgeProduct: true
    };

    await TestBed.configureTestingModule({
      declarations: [
        EvidenceItemComponent,
        PrCheckboxComponent,
        PrFieldHeaderComponent,
        PrInputComponent,
        PrRadioButtonComponent,
        PrTextareaComponent,
        YesOrNotByBooleanPipe,
        PrFieldValidationsComponent
      ],
      imports: [HttpClientTestingModule, InputTextareaModule, RadioButtonModule, CheckboxModule, ReactiveFormsModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: DataControlService,
          useValue: mockDataControlService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvidenceItemComponent);
    component = fixture.componentInstance;
    component.evidence = mockEvidences;
  });

  describe('validateCGLink', () => {
    it('should return true for a valid legacy link', () => {
      component.evidence.link = 'https://cgspace.cgiar.org/handle/10568/12423';

      const result = component.validateCGLink();

      expect(result).toBeTruthy();
    });

    it('should return true for a valid new link', () => {
      component.evidence.link = 'https://cgspace.cgiar.org/items/b36d43aa-9dfe-4cac-a09f-e1bfab3ecd49';

      const result = component.validateCGLink();

      expect(result).toBeTruthy();
    });

    it('should return false for an invalid link', () => {
      component.evidence.link = 'https://example.com';

      const result = component.validateCGLink();

      expect(result).toBeFalsy();
    });
  });

  describe('validateFileTypes', () => {
    it('should return true for a valid file type', () => {
      const file = createFile('test.jpg', 500);

      const result = component.validateFileTypes(file);

      expect(result).toBeTruthy();
    });
    it('should return false for an invalid file type', () => {
      const file = createFile('test.txt', 500);

      const result = component.validateFileTypes(file);

      expect(result).toBeFalsy();
    });

    it('should return false for an invalid file type and exceeding the size limit', () => {
      const file = createFile('test.txt', 2000);

      const result = component.validateFileTypes(file);

      expect(result).toBeFalsy();
    });
  });

  describe('deleteItem', () => {
    it('should show confirmation alert when deleteItem is called', () => {
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.deleteItem();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onFileSelected', () => {
    it('should set evidence properties when a valid file is selected', () => {
      const mockEvent = {
        target: {
          files: [createFile('test.jpg', 500)]
        }
      };

      component.onFileSelected(mockEvent);

      expect(component.evidence.file).toEqual(mockEvent.target.files[0]);
      expect(component.evidence.sp_file_name).toBe('test.jpg');
      expect(component.incorrectFile).toBeFalsy();
    });

    it('should set incorrectFile to true when an invalid file is selected', () => {
      const mockEvent = {
        target: {
          files: [createFile('test.txt', 500)]
        }
      };

      component.onFileSelected(mockEvent);

      expect(component.incorrectFile).toBeTruthy();
    });
  });

  describe('onFileDropped', () => {
    it('should set evidence properties when a valid file is dropped', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          files: [createFile('test.jpg', 500)]
        }
      };
      component.onFileDropped(mockEvent);

      expect(component.evidence.file).toEqual(mockEvent.dataTransfer.files[0]);
      expect(component.evidence.sp_file_name).toBe('test.jpg');
      expect(component.incorrectFile).toBeFalsy();
    });

    it('should set incorrectFile to true when an invalid file is dropped', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          files: [createFile('test.txt', 500)]
        }
      };

      component.onFileDropped(mockEvent);

      expect(component.incorrectFile).toBeTruthy();

      jest.runAllTimers();

      expect(component.incorrectFile).toBeFalsy();
    });
  });

  describe('onDragOver', () => {
    it('should prevent default and stop propagation', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };
      const spyPreventDefault = jest.spyOn(mockEvent, 'preventDefault');
      const spyStopPropagation = jest.spyOn(mockEvent, 'stopPropagation');

      component.onDragOver(mockEvent);

      expect(spyPreventDefault).toHaveBeenCalled();
      expect(spyStopPropagation).toHaveBeenCalled();
    });
  });

  describe('onDragLeave', () => {
    it('should prevent default and stop propagation', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };
      const spyPreventDefault = jest.spyOn(mockEvent, 'preventDefault');
      const spyStopPropagation = jest.spyOn(mockEvent, 'stopPropagation');

      component.onDragLeave(mockEvent);

      expect(spyPreventDefault).toHaveBeenCalled();
      expect(spyStopPropagation).toHaveBeenCalled();
    });
  });

  describe('onDeleteSPLink', () => {
    it('should call cleanSP', () => {
      const spy = jest.spyOn(component, 'cleanSP');

      component.onDeleteSPLink();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('cleanSP', () => {
    it('should reset sp_file_name, link, and file to null', () => {
      component.cleanSP();

      expect(component.evidence.sp_file_name).toBeNull();
      expect(component.evidence.link).toBeNull();
      expect(component.evidence.file).toBeNull();
    });
  });

  describe('cleanLink', () => {
    it('should reset link, and is_public_file to null', () => {
      component.cleanLink();

      expect(component.evidence.link).toBeNull();
      expect(component.evidence.is_public_file).toBeNull();
    });
  });

  describe('cleanSource', () => {
    it('should call cleanLink if e is true', () => {
      const cleanLinkSpy = jest.spyOn(component, 'cleanLink');
      const cleanSPSpy = jest.spyOn(component, 'cleanSP');

      component.cleanSource(true);

      expect(cleanLinkSpy).toHaveBeenCalled();
      expect(cleanSPSpy).not.toHaveBeenCalled();
    });

    it('should call cleanSP if e is false', () => {
      const cleanLinkSpy = jest.spyOn(component, 'cleanLink');
      const cleanSPSpy = jest.spyOn(component, 'cleanSP');

      component.cleanSource(false);

      expect(cleanLinkSpy).not.toHaveBeenCalled();
      expect(cleanSPSpy).toHaveBeenCalled();
    });
  });
});

function createFile(name: string, sizeInKB: number): File {
  const content = new Uint8Array(sizeInKB * 1024);
  const blob = new Blob([content], { type: 'application/octet-stream' });
  return new File([blob], name);
}
