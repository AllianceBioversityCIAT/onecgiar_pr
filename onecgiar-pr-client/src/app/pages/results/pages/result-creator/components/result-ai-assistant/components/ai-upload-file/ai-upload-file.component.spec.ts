import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AiUploadFileComponent } from './ai-upload-file.component';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';
import { signal } from '@angular/core';

// Mock pdfjs-dist at module level
jest.mock('pdfjs-dist', () => {
  const getDocumentMock = jest.fn();
  const GlobalWorkerOptions = { workerSrc: '' } as any;
  return { getDocument: getDocumentMock, GlobalWorkerOptions };
});

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

describe('AiUploadFileComponent', () => {
  let fixture: ComponentFixture<AiUploadFileComponent>;
  let component: AiUploadFileComponent;

  const selectedFileSetMock = jest.fn();

  const createResultManagementServiceMock: Partial<CreateResultManagementService> = {
    selectedFile: signal<File | null>(null),
    selectedInitiative: signal<number | null>(null)
  } as Partial<CreateResultManagementService>;

  const alertsServiceMock = {
    show: jest.fn()
  } as unknown as CustomizedAlertsFeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiUploadFileComponent],
      providers: [
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        { provide: CustomizedAlertsFeService, useValue: alertsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AiUploadFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(GlobalWorkerOptions.workerSrc).toBeDefined();
  });

  describe('drag and drop', () => {
    it('onDragOver should set isDragging to true', () => {
      const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
      component.onDragOver(event as DragEvent);
      expect(component.isDragging()).toBe(true);
    });

    it('onDragLeave should set isDragging to false', () => {
      const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
      component.isDragging.set(true);
      component.onDragLeave(event as DragEvent);
      expect(component.isDragging()).toBe(false);
    });

    it('onDrop should stop dragging and handle file', async () => {
      const file = new File(['data'], 'test.txt', { type: 'text/plain' });
      const handleFileSpy = jest.spyOn(component, 'handleFile').mockResolvedValue();
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [file] }
      } as any;

      component.isDragging.set(true);
      component.onDrop(event as DragEvent);

      expect(component.isDragging()).toBe(false);
      expect(handleFileSpy).toHaveBeenCalledWith(file);
    });
  });

  describe('file selection', () => {
    it('onFileSelected should call handleFile when a file is provided', () => {
      const file = new File(['data'], 'test.txt', { type: 'text/plain' });
      const fileList = { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) } as unknown as FileList;
      const input = { files: fileList } as unknown as HTMLInputElement;
      const event = { target: input } as unknown as Event;
      const handleFileSpy = jest.spyOn(component, 'handleFile').mockResolvedValue();
      component.onFileSelected(event);
      expect(handleFileSpy).toHaveBeenCalledWith(file);
    });

    it('isValidFileType should validate by extension', () => {
      expect(component.isValidFileType(new File(['a'], 'a.pdf'))).toBe(true);
      expect(component.isValidFileType(new File(['a'], 'a.docx'))).toBe(true);
      expect(component.isValidFileType(new File(['a'], 'a.txt'))).toBe(true);
      expect(component.isValidFileType(new File(['a'], 'a.png'))).toBe(false);
    });

    it('isValidFileSize should enforce max size', () => {
      component.maxSizeMB = 1; // 1MB
      const underLimit = new File([new Uint8Array(1024 * 1024 - 1)], 'small.txt');
      const overLimit = new File([new Uint8Array(1024 * 1024 + 1)], 'big.txt');
      expect(component.isValidFileSize(underLimit)).toBe(true);
      expect(component.isValidFileSize(overLimit)).toBe(false);
    });
  });

  describe('handleFile validations', () => {
    it('should show invalid type alert when file type is not supported', async () => {
      const file = new File(['x'], 'image.png', { type: 'image/png' });
      await component.handleFile(file);
      expect(alertsServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'unsupported-file-type', status: 'error' }));
      expect(selectedFileSetMock).not.toHaveBeenCalled();
    });

    it('should show size exceeded alert when file is too large', async () => {
      component.maxSizeMB = 1;
      const file = new File([new Uint8Array(1024 * 1024 * 2)], 'big.pdf');
      await component.handleFile(file);
      expect(alertsServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-size-exceeded', status: 'error' }));
      expect(selectedFileSetMock).not.toHaveBeenCalled();
    });

    it('should show page limit exceeded alert when PDF has too many pages', async () => {
      const tooMany = 999;
      (getDocument as jest.Mock).mockImplementation(() => ({
        promise: Promise.resolve({ numPages: tooMany })
      }));
      const file = new File([new Uint8Array([1, 2, 3])], 'doc.pdf');
      await component.handleFile(file);
      expect(alertsServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'page-limit-exceeded', status: 'error' }));
      expect(selectedFileSetMock).not.toHaveBeenCalled();
    });
  });
});
