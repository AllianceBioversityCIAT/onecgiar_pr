import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-confirmation-kp',
  templateUrl: './confirmation-kp.component.html',
  styleUrls: ['./confirmation-kp.component.scss']
})
export class ConfirmationKPComponent {
  @Input() body: any;
  @Input() selectedResultType: any;

  confirmationText: string;

  constructor() {}

  downloadPDF() {
    console.log('loading pdf');
  }
}
