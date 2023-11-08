import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { v4 as uuidv4 } from 'uuid';

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

  evidencesType = [
    { id: 0, name: 'Link' },
    { id: 1, name: 'Upload file' }
  ];

  sd = `
  <li>You confirm that the SharePoint link is publicly accessible.</li>
  <li>You confirm that all intellectual property rights related to the document at the SharePoint link have been observed. This includes any rights relevant to the document owner’s Center affiliation and any specific rights tied to content within the document, such as images.</li>
  <li>You agree to the SharePoint link being displayed on the CGIAR Results Dashboard.</li>
  `;

  onFileSelected(event: any) {
    const selectedFile: File = event.target.files[0];
    if (selectedFile) {
      // Realiza las operaciones que necesites con el archivo seleccionado
      console.log(selectedFile);
      const uniqueId = uuidv4();
      const fileName = selectedFile.name;
      const fileExtension = fileName.split('.').pop();
      const newFileName = `${uniqueId}.${fileExtension}`;
      this.evidence.file = new File([selectedFile], newFileName, { type: selectedFile.type });
      this.evidence.fileUuid = uniqueId;
    }
  }

  constructor(public dataControlSE: DataControlService, public api: ApiService) {}

  onFileDropped(event: any) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.handleFile(files[0]);
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

  handleFile(file: File) {
    // Aquí puedes manejar el archivo según tus requisitos.
    console.log('Archivo arrastrado:', file);
    this.evidence.file = file;
  }
}
