import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-add-button',
    templateUrl: './add-button.component.html',
    styleUrls: ['./add-button.component.scss'],
    standalone: false
})
export class AddButtonComponent {
  @Input() name: string = 'Unnamed';
  @Output() clickEvent = new EventEmitter();
  @Input() disabled: boolean = false;
}
