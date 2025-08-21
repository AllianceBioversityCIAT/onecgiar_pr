import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiUploadFileComponent } from './ai-upload-file.component';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

describe('AiUploadFileComponent', () => {
  let component: AiUploadFileComponent;
  let fixture: ComponentFixture<AiUploadFileComponent>;
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

    fixture = TestBed.createComponent(AiUploadFileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
