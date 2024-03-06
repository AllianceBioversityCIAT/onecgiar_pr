import { Component, Output, EventEmitter, Input } from '@angular/core';
import { RolesService } from '../../shared/services/global/roles.service';
import { SaveButtonService } from './save-button.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from '../pr-button/pr-button.component';

@Component({
  selector: 'app-save-button',
  standalone: true,
  templateUrl: './save-button.component.html',
  styleUrls: ['./save-button.component.scss'],
  imports: [CommonModule, PrButtonComponent]
})
export class SaveButtonComponent {
  @Input() editable: boolean;
  @Input() disabled: boolean;
  @Input() text: string = 'Save';
  @Output() clickSave = new EventEmitter();
  expand = false;

  constructor(
    public rolesSE: RolesService,
    public saveButtonSE: SaveButtonService,
    public dataControlSE: DataControlService
  ) {}

  onClickSave() {
    if (this.saveButtonSE.isSaving) return;
    this.clickSave.emit();
  }
}
