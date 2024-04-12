import { Component, OnInit, Input } from '@angular/core';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-rd-annual-updating',
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss']
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

  ngOnInit(): void {
    console.log(this.generalInfoBody);
  }

  // Create a function that determines if this.generalInfoBody.discontinued_options some value is true if this.generalInfoBody.is_discontinued is true
  isDiscontinuedOptionsTrue() {
    if (!this.generalInfoBody.is_discontinued) return true;

    if (!!this.generalInfoBody.is_discontinued) {
      return this.generalInfoBody.discontinued_options.some(option => option.value);
    } else return false;
  }
}
