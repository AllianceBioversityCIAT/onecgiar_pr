import { Component, Input, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalizationData';

@Component({
  selector: 'app-page-alert',
  templateUrl: './page-alert.component.html',
  styleUrls: ['./page-alert.component.scss']
})
export class PageAlertComponent {
  internationalizationData = internationalizationData;
  @Input() type: string;
  constructor() {
    console.log(this.type);
  }

  get title() {
    switch (this.type) {
      case 'warning':
        return 'Something went wrong';

      case 'error':
        return 'Sorry!';
    }
    return '';
  }

  get message() {
    switch (this.type) {
      case 'warning':
        return 'Please review the parameters provided. It seems that some of them are incorrect or missing.';

      case 'error':
        return 'We are currently experiencing a technical issue with the tool. Please contact the support team at PRMSTechSupport@cgiar.org and try again in a few minutes.';
    }
    return '';
  }
}
