import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';
import { AuthService } from '../../shared/services/api/auth.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from '../pr-button/pr-button.component';

@Component({
  selector: 'app-sync-button',
  standalone: true,
  templateUrl: './sync-button.component.html',
  styleUrls: ['./sync-button.component.scss'],
  imports: [CommonModule, PrButtonComponent]
})
export class SyncButtonComponent {
  @Input() text: string = 'Sync';
  @Output() clickSave = new EventEmitter();
  constructor(
    public dataControlSE: DataControlService,
    public rolesSE: RolesService
  ) {}

  onClickSave() {
    this.clickSave.emit();
  }
}
