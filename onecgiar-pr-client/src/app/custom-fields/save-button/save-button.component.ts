import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { RolesService } from '../../shared/services/global/roles.service';
import { SaveButtonService } from './save-button.service';

@Component({
  selector: 'app-save-button',
  templateUrl: './save-button.component.html',
  styleUrls: ['./save-button.component.scss']
})
export class SaveButtonComponent {
  @Input() editable: boolean;
  @Output() clickSave = new EventEmitter();
  constructor(public rolesSE: RolesService, public saveButtonSE: SaveButtonService) {}
  onClickSave() {
    if (this.saveButtonSE.isSaving) return;
    this.clickSave.emit();
  }
}
