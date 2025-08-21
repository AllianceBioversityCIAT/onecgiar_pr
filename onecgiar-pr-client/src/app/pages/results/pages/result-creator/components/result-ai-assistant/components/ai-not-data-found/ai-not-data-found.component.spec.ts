import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiNotDataFoundComponent } from './ai-not-data-found.component';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

describe('AiNotDataFoundComponent', () => {
  let component: AiNotDataFoundComponent;
  let fixture: ComponentFixture<AiNotDataFoundComponent>;
  let createResultManagementServiceMock: Partial<CreateResultManagementService>;

  beforeEach(async () => {
    createResultManagementServiceMock = {
      closeModal: jest.fn(),
      goBackToUploadNewFile: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, CustomFieldsModule],
      providers: [{ provide: CreateResultManagementService, useValue: createResultManagementServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(AiNotDataFoundComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('closeModal', () => {
    it('should call closeModal', () => {
      component.createResultManagementService.closeModal();
      expect(createResultManagementServiceMock.closeModal).toHaveBeenCalled();
    });
  });

  describe('goBackToUploadNewFile', () => {
    it('should call goBackToUploadNewFile', () => {
      component.createResultManagementService.goBackToUploadNewFile();
      expect(createResultManagementServiceMock.goBackToUploadNewFile).toHaveBeenCalled();
    });
  });
});
