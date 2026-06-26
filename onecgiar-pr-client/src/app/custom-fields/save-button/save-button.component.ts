import { Component, Output, EventEmitter, Input, HostListener, ElementRef, inject } from '@angular/core';
import { RolesService } from '../../shared/services/global/roles.service';
import { SaveButtonService } from './save-button.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { PdfExportService } from '../../shared/services/pdf-export.service';

@Component({
    selector: 'app-save-button',
    templateUrl: './save-button.component.html',
    styleUrls: ['./save-button.component.scss'],
    standalone: false
})
export class SaveButtonComponent {
  @Input() editable: boolean;
  @Input() disabled: boolean;
  @Input() text: string = 'Save';
  @Output() clickSave = new EventEmitter();
  expand = false;

  readonly pdfSE = inject(PdfExportService);
  private readonly elementRef = inject(ElementRef);

  constructor(public rolesSE: RolesService, public saveButtonSE: SaveButtonService, public dataControlSE: DataControlService) {}

  onClickSave() {
    if (this.saveButtonSE.isSaving) return;
    this.clickSave.emit();
  }

  // Close the PDF dropdown when clicking outside of it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.pdfSE.menuOpen()) return;
    const insidePdf = this.elementRef.nativeElement.querySelector('.pdf-menu-container')?.contains(event.target as Node);
    if (!insidePdf) this.pdfSE.close();
  }
}
