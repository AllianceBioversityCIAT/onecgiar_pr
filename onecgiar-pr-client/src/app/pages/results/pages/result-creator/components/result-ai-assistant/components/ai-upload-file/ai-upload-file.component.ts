import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';

interface PdfError {
  message?: string;
  name?: string;
}

GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

@Component({
  selector: 'app-ai-upload-file',
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-upload-file.component.html',
  styleUrl: './ai-upload-file.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiUploadFileComponent {
  cdr = inject(ChangeDetectorRef);
  createResultManagementService = inject(CreateResultManagementService);
  customizedAlertsFeSE = inject(CustomizedAlertsFeService);

  isDragging = signal<boolean>(false);
  acceptedFormats: string[] = ['.pdf', '.docx', '.txt'];

  // File related methods
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  async handleFile(file: File) {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    if (!this.isValidFileType(file)) {
      this.showInvalidTypeAlert();
      return;
    }

    if (!this.isValidFileSize(file)) {
      this.showSizeExceededAlert();
      return;
    }

    if (isPdf) {
      const pageCheck = await this.isValidPageCount(file);
      if (pageCheck === 'password') {
        this.customizedAlertsFeSE.show({
          id: 'protected-document',
          title: 'PROTECTED DOCUMENT',
          description: 'The document is password protected. Please upload a file without protection.',
          status: 'error',
          closeIn: 500
        });
        return;
      } else if (pageCheck === false) {
        this.customizedAlertsFeSE.show({
          id: 'page-limit-exceeded',
          title: 'PAGE LIMIT EXCEEDED',
          description: `The PDF exceeds the ${this.createResultManagementService.pageLimit} page limit. Please select a shorter document.`,
          status: 'error',
          closeIn: 500
        });
        return;
      }
    }

    this.fileSelected(file);
    this.cdr.detectChanges();
  }

  isValidFileType(file: File): boolean {
    return this.acceptedFormats.some(format => file.name.toLowerCase().endsWith(format));
  }

  isValidFileSize(file: File): boolean {
    return file.size <= this.createResultManagementService.maxSizeMB * 1024 * 1024;
  }

  fileSelected(file: File) {
    this.createResultManagementService.selectedFile.set(file);
  }

  async isValidPageCount(file: File): Promise<boolean | 'password'> {
    if (typeof file.arrayBuffer !== 'function') {
      console.error('File object does not have arrayBuffer method.');
      return false;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      return pdf.numPages <= this.createResultManagementService.pageLimit;
    } catch (err: unknown) {
      const pdfError = err as PdfError;
      if (pdfError && (pdfError.message?.includes('Password') || pdfError.name === 'PasswordException')) {
        return 'password';
      }
      console.error('Error reading PDF pages:', err);
      return false;
    }
  }

  showSizeExceededAlert() {
    this.customizedAlertsFeSE.show({
      id: 'file-size-exceeded',
      title: 'FILE SIZE EXCEEDED',
      description: `The uploaded document exceeds the ${this.createResultManagementService.maxSizeMB} MB limit. Please select a smaller file.`,
      status: 'error',
      closeIn: 500
    });
  }

  showInvalidTypeAlert() {
    this.customizedAlertsFeSE.show({
      id: 'unsupported-file-type',
      title: 'UNSUPPORTED FILE TYPE',
      description: `Supported formats are: ${this.acceptedFormats.join(', ')}`,
      status: 'error',
      closeIn: 500
    });
  }
}
