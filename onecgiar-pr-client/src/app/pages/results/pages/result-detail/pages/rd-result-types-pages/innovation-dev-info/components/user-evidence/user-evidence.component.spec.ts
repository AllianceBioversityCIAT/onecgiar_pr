import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UserEvidenceComponent } from './user-evidence.component';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../../../../shared/services/data-control.service';

describe('UserEvidenceComponent', () => {
  let component: UserEvidenceComponent;
  let fixture: ComponentFixture<UserEvidenceComponent>;

  beforeEach(async () => {
    const mockApiService = {
      alertsFe: { show: jest.fn() },
      rolesSE: { readOnly: false },
      dataControlSE: { currentResult: {} },
      resultsSE: {
        POST_createUploadSessionP25: jest.fn(),
        GET_loadFileInUploadSession: jest.fn(),
        PUT_loadFileInUploadSession: jest.fn()
      }
    } as any;
    const mockDataControlService = {
      isKnowledgeProduct: false,
      isInnoDev: true,
      isInnoUse: false
    } as any;
    await TestBed.configureTestingModule({
      declarations: [ UserEvidenceComponent ],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: DataControlService, useValue: mockDataControlService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserEvidenceComponent);
    component = fixture.componentInstance;
    // Provide required @Input()s
    (component as any).evidence = { is_sharepoint: false } as any;
    (component as any).index = 1;
    (component as any).isOptional = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clean source switching to link (cleanSP on false)', () => {
    component.evidence = {
      is_sharepoint: true,
      sp_file_name: 'x',
      link: 'y',
      file: {} as any
    } as any;
    component.cleanSource(false);
    expect(component.evidence.sp_file_name).toBeNull();
    expect(component.evidence.link).toBeNull();
    expect(component.evidence.file).toBeNull();
  });

  it('should clean source switching to sharepoint (cleanLink on true)', () => {
    component.evidence = {
      is_sharepoint: false,
      link: 'http://example.com',
      is_public_file: 1
    } as any;
    component.cleanSource(true);
    expect(component.evidence.link).toBeNull();
    expect(component.evidence.is_public_file).toBeNull();
  });

  it('validateCloudLink should detect cloud providers when not sharepoint', () => {
    component.evidence = { is_sharepoint: false, link: 'https://drive.google.com/file/abc' } as any;
    expect(component.validateCloudLink()).toBeTruthy();
    component.evidence = { is_sharepoint: true, link: 'https://drive.google.com/file/abc' } as any;
    expect(component.validateCloudLink()).toBeFalsy();
  });

  it('validateCGLink should match cgspace patterns', () => {
    component.evidence = { link: 'https://cgspace.cgiar.org/handle/10568/12345' } as any;
    expect(component.validateCGLink()).toBeTruthy();
    component.evidence = { link: 'https://cgspace.cgiar.org/items/00000000-0000-0000-0000-000000000000' } as any;
    expect(component.validateCGLink()).toBeTruthy();
    component.evidence = { link: 'https://example.com' } as any;
    expect(component.validateCGLink()).toBeFalsy();
  });

  it('validateFileTypes should check extension and size', () => {
    const valid = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    expect(component.validateFileTypes(valid)).toBeTruthy();
    // Simulate >1GB by crafting object
    const big: any = new File(['x'], 'doc.pdf');
    Object.defineProperty(big, 'size', { value: 2 * 1024 * 1024 * 1024 });
    expect(component.validateFileTypes(big as File)).toBeFalsy();
  });

  it('onFileSelected should set incorrectFile on invalid type', () => {
    const invalid = new File(['data'], 'file.xyz');
    const event = { target: { files: [invalid] } } as any;
    component.onFileSelected(event);
    expect(component.incorrectFile).toBeTruthy();
  });

  it('onFileSelected should set file info and trigger upload for valid file', () => {
    const valid = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    const spyUpload = jest.spyOn<any, any>(component as any, 'uploadSelectedFile').mockImplementation(() => {});
    const event = { target: { files: [valid] } } as any;
    component.onFileSelected(event);
    expect(component.evidence.sp_file_name).toBe('doc.pdf');
    expect(component.incorrectFile).toBeFalsy();
    expect(spyUpload).toHaveBeenCalled();
  });

  it('onFileDropped should set incorrectFile when invalid', () => {
    const invalid = new File(['data'], 'file.xyz');
    const evt: any = { preventDefault: () => {}, stopPropagation: () => {}, dataTransfer: { files: [invalid] } };
    component.onFileDropped(evt);
    expect(component.incorrectFile).toBeTruthy();
  });

  it('onFileDropped should set file info and trigger upload for valid', () => {
    const valid = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    const spyUpload = jest.spyOn<any, any>(component as any, 'uploadSelectedFile').mockImplementation(() => {});
    const evt: any = { preventDefault: () => {}, stopPropagation: () => {}, dataTransfer: { files: [valid] } };
    component.onFileDropped(evt);
    expect(component.evidence.sp_file_name).toBe('doc.pdf');
    expect(spyUpload).toHaveBeenCalled();
  });

  it('onDeleteSPLink should clean sharepoint fields', () => {
    component.evidence = { sp_file_name: 'a', link: 'b', file: {} } as any;
    component.onDeleteSPLink();
    expect(component.evidence.sp_file_name).toBeNull();
    expect(component.evidence.link).toBeNull();
    expect(component.evidence.file).toBeNull();
  });

  it('dynamicAlertStatusBasedOnVisibility should vary with is_public_file', () => {
    component.evidence = { is_public_file: 1 } as any;
    expect(component.dynamicAlertStatusBasedOnVisibility()).toContain('publicly accessible');
    component.evidence = { is_public_file: 0 } as any;
    expect(component.dynamicAlertStatusBasedOnVisibility()).toContain('NOT public');
  });

  it('getEvidenceRelatedTitle should change per context flags', () => {
    (TestBed.inject(DataControlService) as any).isInnoDev = false;
    (TestBed.inject(DataControlService) as any).isInnoUse = false;
    expect(component.getEvidenceRelatedTitle()).toContain('Impact Area tags');
    (TestBed.inject(DataControlService) as any).isInnoDev = true;
    expect(component.getEvidenceRelatedTitle()).toContain('Readiness level');
    (TestBed.inject(DataControlService) as any).isInnoDev = false;
    (TestBed.inject(DataControlService) as any).isInnoUse = true;
    expect(component.getEvidenceRelatedTitle()).toContain('Use');
  });
});
