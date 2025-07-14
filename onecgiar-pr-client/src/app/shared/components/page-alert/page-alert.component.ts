import { Component, Input } from '@angular/core';
import { internationalizationData } from '../../data/internationalization-data';

@Component({
    selector: 'app-page-alert',
    templateUrl: './page-alert.component.html',
    styleUrls: ['./page-alert.component.scss'],
    standalone: false
})
export class PageAlertComponent {
  internationalizationData = internationalizationData;
  @Input() type: string;

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
        return 'Please review the link provided. It seems there is something incorrect or missing.';

      case 'error':
        return 'We are currently experiencing a technical issue with the tool. Please contact the support team at PRMSTechSupport@cgiar.org and try again in a few hours.';
    }
    return '';
  }
}
