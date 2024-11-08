import { Component, Input, EventEmitter, Output } from '@angular/core';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-evidence-item',
  templateUrl: './evidence-item.component.html',
  styleUrls: ['./evidence-item.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state(
        'void',
        style({
          opacity: 0
        })
      ),
      transition('void <=> *', [animate('250ms ease-in-out')])
    ])
  ]
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

  constructor(
    public dataControlSE: DataControlService,
    public api: ApiService
  ) {}

  dynamicAlertStatusBasedOnVisibility() {
    if (this.evidence.is_public_file) {
      return `
        <b>If you indicate that the file being uploaded to the PRMS repository is public:</b>
        <li>You confirm that the file is publicly accessible.</li>
        <li>You confirm that all intellectual property rights related to the file have been observed. This includes any rights relevant to the document owner’s Center affiliation and any specific rights tied to content within the document, such as images.</li>
        <li>You agree to the link to the file being displayed in the CGIAR Results Dashboard.</li>
      `;
    }

    return `
      <b>If you indicate that the file being uploaded to the PRMS repository is NOT public:</b>
      <li>You confirm that the file should not be publicly accessible.</li>
      <li>The file will not be accessible through the CGIAR Results Dashboard.</li>
      <li>The file will be stored in the PRMS repository and will only be accessible by CGIAR staff with the repository link.</li>
    `;
  }

  getEvidenceRelatedTitle() {
    if (!this.dataControlSE.isInnoDev && !this.dataControlSE.isInnoUse) {
      return `Please indicate for which Impact Area tags this evidence is related to`;
    }

    return `Please indicate whether this evidence is related to an Impact Area Tag or to the Innovation ${this.dataControlSE.isInnoDev ? 'Readiness level' : 'Use'}`;
  }

  validateCloudLink() {
    if (this.evidence.is_sharepoint) {
      return false;
    }

    const cloudRegex =
      /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i;
    return this.evidence.link && cloudRegex.test(this.evidence.link?.trim());
  }

  validateCGLink() {
    const regex = /^https:\/\/(?:cgspace\.cgiar\.org\/items\/[0-9a-f-]{36}|cgspace\.cgiar\.org\/handle\/10568\/\d+)$/;
    return this.evidence.link && regex.test(this.evidence.link?.trim());
  }

  validateFileTypes(file: File) {
    const validFileTypes = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.pptx', '.jpeg', '.xlsx'];
    const extension = '.' + file.name.split('.').pop();
    const fileSizeInGB = file.size / (1024 * 1024 * 1024);
    return validFileTypes.includes(extension) && fileSizeInGB <= 1;
  }

  isInvalidLink(value: string) {
    const regex = new RegExp(
      /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}(:[0-9]{1,5})?(\/\S*)?$/i
    );

    return regex.test(value.trim());
  }

  deleteItem() {
    this.api.alertsFe.show(
      { id: 'confirm-delete-evidence', title: `Are you sure you want to delete this evidence?`, status: 'warning', confirmText: 'Yes, delete' },
      () => {
        this.deleteEvent.emit();
      }
    );
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
