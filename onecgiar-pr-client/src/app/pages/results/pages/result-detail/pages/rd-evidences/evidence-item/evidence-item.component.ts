import { Component, Input, EventEmitter, Output } from '@angular/core';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-evidence-item',
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.scss']
})
export class EvidenceItemComponent {
  @Input() evidence: EvidencesCreateInterface;
  @Input() index: number;
  @Input() isSuppInfo: boolean;
  @Input() isOptional: boolean = false;
  @Output() deleteEvent = new EventEmitter();
  incorrectFile = false;

  evidencesType = [
    { id: 0, name: 'Link' },
    { id: 1, name: 'Upload file' }
  ];

  isPubilcFileOptions = [
    { id: 0, name: 'No' },
    { id: 1, name: 'Yes' }
  ];

  publicFileDesc = `
  <li>You confirm that the SharePoint link is publicly accessible.</li>
  <li>You confirm that all intellectual property rights related to the document at the SharePoint link have been observed. This includes any rights relevant to the document owner’s Center affiliation and any specific rights tied to content within the document, such as images.</li>
  <li>You agree to the SharePoint link being displayed on the CGIAR Results Dashboard.</li>
  `;

  constructor(public dataControlSE: DataControlService, public api: ApiService) {}

  validateFileTypes(file: File) {
    const validFileTypes = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.pptx', '.jpeg', '.xlsx'];
    const extension = '.' + file.name.split('.').pop();
    const fileSizeInGB = file.size / (1024 * 1024 * 1024);
    return validFileTypes.includes(extension) && fileSizeInGB <= 1;
  }

  isInvalidLink(value: string) {
    const regex = new RegExp(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/\S*)?$/i);

    return regex.test(value);
  }

  deleteItem() {
    this.api.alertsFe.show({ id: 'confirm-delete-evidence', title: `Are you sure you want to delete this evidence?`, status: 'warning', confirmText: 'Yes, delete' }, () => {
      this.deleteEvent.emit();
    });
  }

  onFileSelected(event: any) {
    const selectedFile: File = event.target.files[0];
    if (selectedFile) {
      if (this.validateFileTypes(selectedFile)) {
        this.evidence.file = selectedFile;
        this.evidence.sp_file_name = selectedFile.name;
        this.incorrectFile = false;
      } else {
        this.incorrectFile = true;
      }
    }
  }

  onFileDropped(event: any) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const selectedFile = files[0];
      if (this.validateFileTypes(selectedFile)) {
        this.evidence.file = selectedFile;
        this.evidence.sp_file_name = selectedFile.name;
        this.incorrectFile = false;
      } else {
        this.incorrectFile = true;
        setTimeout(() => {
          this.incorrectFile = false;
        }, 3000);
      }
    }
  }

  onDragOver(event: any) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: any) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDeleteSPLink() {
    this.cleanSP();
  }

  cleanSP() {
    this.evidence.sp_file_name = null;
    this.evidence.link = null;
    this.evidence.file = null;
  }

  cleanLink() {
    this.evidence.link = null;
    this.evidence.is_public_file = null;
  }

  cleanSource(e) {
    if (e) {
      this.cleanLink();
    } else {
      this.cleanSP();
    }
  }
}
