import { Component, OnInit, Input } from '@angular/core';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { FormsModule } from '@angular/forms';
import { PrCheckboxComponent } from '../../../../../../../../custom-fields/pr-checkbox/pr-checkbox.component';
import { FeedbackValidationDirective } from '../../../../../../../../shared/directives/feedback-validation.directive';

@Component({
  selector: 'app-rd-annual-updating',
  standalone: true,
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrRadioButtonComponent,
    PrCheckboxComponent,
    FeedbackValidationDirective
  ]
})
export class RdAnnualUpdatingComponent implements OnInit {
  @Input() generalInfoBody: GeneralInfoBody = new GeneralInfoBody();
  discontinuedOptions = [];
  options = [
    {
      name: 'Innovation development is active/investment was continued',
      value: false
    },
    {
      name: 'Innovation development is inactive/investment was discontinued, because:',
      value: true
    }
  ];
  constructor(public api: ApiService) {}

  ngOnInit(): void {}

  // Create a function that determines if this.generalInfoBody.discontinued_options some value is true if this.generalInfoBody.is_discontinued is true
  isDiscontinuedOptionsTrue() {
    if (!this.generalInfoBody.is_discontinued) return true;

    if (!!this.generalInfoBody.is_discontinued) {
      return this.generalInfoBody.discontinued_options.some(
        option => option.value
      );
    } else return false;
  }
}
