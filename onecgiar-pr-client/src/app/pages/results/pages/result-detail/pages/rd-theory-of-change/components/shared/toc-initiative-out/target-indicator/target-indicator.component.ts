import { Component, Input, OnInit } from '@angular/core';
import { environment } from '../../../../../../../../../../../environments/environment';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-target-indicator',
  templateUrl: './target-indicator.component.html',
  styleUrls: ['./target-indicator.component.scss']
})
export class TargetIndicatorComponent implements OnInit {
  disabledInput: boolean = false;
  itemReturn = null;
  iscalculated: string = 'width: 12px; height: 12px; border-radius: 100%; background-color: #B9B9B9;margin-top: 20px; margin-left: 7px;';

  @Input() initiative: any;
  @Input() disabledInputs: any;
  text = `<span style="color: #6777D8; font-weight: bold;">4. Geographic location</span>`;
  constructor(public api: ApiService, private router: Router) {}

  ngOnInit(): void {
    //(this.disabledInputs);
  }

  statusIndicator(status) {
    let statusIndicator = '';
    if (this.initiative.is_calculable) {
      if (status == 0 || status == null) {
        statusIndicator = 'NO PROGRESS';
        this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color:red;margin-top: 20px; margin-left: 7px;';
      }
      if (status == 1) {
        statusIndicator = 'IN PROGRESS';
        this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color:#E0BC00;margin-top: 20px; margin-left: 7px;';
      }

      if (status == 2) {
        statusIndicator = 'ACHIEVED';
        this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color:#38DF7B;margin-top: 20px; margin-left: 7px;';
      }
    } else {
      statusIndicator = 'INCALCULABLE';
      this.iscalculated = 'width: 12px; height: 12px; border-radius: 100%; background-color: #B9B9B9;margin-top: 20px; margin-left: 7px;';
    }

    return statusIndicator;
  }

  validarNumero(e) {
    if (e.key === '-') e.preventDefault();
  }

  changesValue() {
    this.initiative.indicator_contributing = null;
  }
  descriptionAlert() {
    return `Please ensure the planned location is reflected in section <a class='open_route alert-event' href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/geographic-location" target='_blank'>4. Geographic location</a>. If you decide to change remember to update your TOC result framework. DD is working to automate the geolocation and in the near future you will not need to fill section 4 again.`;
  }

  sumIndicator(item) {
    return Number(item) + 1;
  }

  addNumber(item, itemBoolean) {
    if (item == null) {
      if (itemBoolean == true) {
        this.itemReturn = 1;
      } else {
        this.itemReturn = 0;
      }
    }
  }

  descriptionWarning(item, itemTwo) {
    return 'The type of result (' + item + ') you are reporting does not match the type (' + itemTwo + ') of this indicator, therefore, progress cannot be reported. Please ensure that the result type matches the indicator type for accurate reporting.';
  }

  descriptionWarningYear(item, itemTwo) {
    const year = new Date(item).getFullYear();
    return {
      is_alert: year == itemTwo,
      description: 'You are reporting against an indicator that had a target in a following year. If you feel the TOC Result Framework is outdated please edit it. If the result framework is correct and you are reporting this result in advance, please go ahead.'
    };
  }
}
