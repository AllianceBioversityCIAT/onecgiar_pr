import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../shared/directives/feedback-validation-directive.module';

@Component({
  selector: 'app-rd-annual-updating',
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldsModule, FeedbackValidationDirectiveModule],
})
export class RdAnnualUpdatingComponent implements OnInit {
  @Input() generalInfoBody: GeneralInfoBody = new GeneralInfoBody();
  /** Mirrors parent general-information phase gate so controls stay editable when discontinuation can be corrected (types 7 & 2). */
  @Input() isPhaseOpen = false;
  discontinuedOptions = [];
  options = [
    {
      name: `Innovation ${this.api.dataControlSE.currentResult?.result_type_id == 7 ? 'development' : 'use'} is active/investment was continued`,
      value: false
    },
    {
      name: `Innovation ${this.api.dataControlSE.currentResult?.result_type_id == 7 ? 'development' : 'use'} is inactive/investment was discontinued, because:`,
      value: true
    }
  ];

  alertText: string = '';

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.getAlertNarrative();
  }

  /** When true, pr-radio / pr-checkbox treat the field as editable despite global read-only (see P2-2923). */
  get annualUpdatingEditable(): boolean {
    return this.isPhaseOpen && !!this.api.rolesSE.access?.canDdit;
  }

  getAlertNarrative(): void {
    this.api.resultsSE.GET_globalNarratives('updated_innodev_guidance').subscribe(({ response }) => {
      this.alertText = response.value;
    });
  }

  isDiscontinuedOptionsTrue() {
    return this.generalInfoBody.is_discontinued ? this.generalInfoBody.discontinued_options.some(option => option.value) : true;
  }
}
