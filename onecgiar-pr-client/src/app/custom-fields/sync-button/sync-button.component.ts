import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-sync-button',
  templateUrl: './sync-button.component.html',
  styleUrls: ['./sync-button.component.scss']
})
export class SyncButtonComponent {
  @Input() text: string = 'Sync';
  @Output() clickSave = new EventEmitter();
  constructor(public dataControlSE: DataControlService) {}

  onClickSave() {
    this.clickSave.emit();
  }
}
