import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';
import { AuthService } from '../../shared/services/api/auth.service';
import { RolesService } from '../../shared/services/global/roles.service';

@Component({
    selector: 'app-sync-button',
    templateUrl: './sync-button.component.html',
    styleUrls: ['./sync-button.component.scss'],
    standalone: false
})
export class SyncButtonComponent {
  @Input() text: string = 'Sync';
  @Output() clickSave = new EventEmitter();
  constructor(public dataControlSE: DataControlService, public rolesSE: RolesService) {}

  onClickSave() {
    this.clickSave.emit();
  }
}
