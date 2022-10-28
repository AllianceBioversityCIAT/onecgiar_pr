import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-save-button',
  templateUrl: './save-button.component.html',
  styleUrls: ['./save-button.component.scss']
})
export class SaveButtonComponent {
  @Output() clickSave = new EventEmitter();
  constructor() {}
  onClickSave() {
    this.clickSave.emit();
  }
}
