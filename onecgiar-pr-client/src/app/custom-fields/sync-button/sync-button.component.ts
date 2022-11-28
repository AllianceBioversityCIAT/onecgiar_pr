import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-sync-button',
  templateUrl: './sync-button.component.html',
  styleUrls: ['./sync-button.component.scss']
})
export class SyncButtonComponent {
  @Input() text: string = 'Sync';
  @Output() clickSave = new EventEmitter();
  constructor() {}

  onClickSave() {
    this.clickSave.emit();
  }
}
