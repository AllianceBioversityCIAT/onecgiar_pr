import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { RolesService } from '../../shared/services/global/roles.service';
import { SaveButtonService } from './save-button.service';
import { DataControlService } from '../../shared/services/data-control.service';

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
  constructor(public rolesSE: RolesService, public saveButtonSE: SaveButtonService, public dataControlSE: DataControlService) {}
  onClickSave() {
    if (this.saveButtonSE.isSaving) return;
    this.clickSave.emit();
  }
}
