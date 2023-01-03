import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';
import { CapDevInfoRoutingBody } from './model/capDevInfoRoutingBody';

@Component({
  selector: 'app-cap-dev-info',
  templateUrl: './cap-dev-info.component.html',
  styleUrls: ['./cap-dev-info.component.scss']
})
export class CapDevInfoComponent implements OnInit {
  capDevInfoRoutingBody = new CapDevInfoRoutingBody();
  longTermOrShortTermValue = null;
  capdevsTerms = [];
  capdevsSubTerms = [];
  deliveryMethodOptions = [];
  capdev_term_id_1 = null;
  capdev_term_id_2 = null;
  constructor(public api: ApiService, public institutionsSE: InstitutionsService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.requestEvent();
    this.GET_capdevsTerms();
    this.GET_capdevsDeliveryMethod();
  }

  GET_capdevsTerms() {
    this.api.resultsSE.GET_capdevsTerms().subscribe(({ response }) => {
      this.capdevsSubTerms = response.splice(0, 2);
      this.capdevsTerms = response.splice(0, 2);
      console.log(this.capdevsSubTerms);
      console.log(this.capdevsTerms);
    });
  }
  GET_capdevsDeliveryMethod() {
    this.api.resultsSE.GET_capdevsDeliveryMethod().subscribe(({ response }) => {
      // console.log(response);
      this.deliveryMethodOptions = response;
    });
  }

  getSectionInformation() {
    this.api.resultsSE.GET_capacityDevelopent().subscribe(({ response }) => {
      console.log(response);
      this.capDevInfoRoutingBody = response;
      this.get_capdev_term_id();
    });
  }

  clean_capdev_term_2() {
    if (this.capdev_term_id_1 == 3) this.capdev_term_id_2 = null;
  }

  length_of_training() {
    return `<ul>
    <li>Long-term training refers to training that goes for 3 or more months.</li>
    <li>Short-term training refers to training that goes for less than 3 months.</li>
    <li>Both long-term and short-term training programs must be completed before reporting (to avoid reporting the same trainee multiple times across years).</li>
    </ul>`;
  }

  get_capdev_term_id() {
    console.log(this.capDevInfoRoutingBody.capdev_term_id);
    if (this.capDevInfoRoutingBody.capdev_term_id == 4) return (this.capdev_term_id_1 = 4);
    if (this.capDevInfoRoutingBody.capdev_term_id == 3) {
      return (this.capdev_term_id_1 = 3);
    }

    if (this.capDevInfoRoutingBody.capdev_term_id == 1 || this.capDevInfoRoutingBody.capdev_term_id == 2) {
      this.capdev_term_id_1 = 4;
      this.capdev_term_id_2 = this.capDevInfoRoutingBody.capdev_term_id;
    }
    return null;
  }

  validate_capdev_term_id() {
    console.log(this.capdev_term_id_1);
    console.log(this.capdev_term_id_2);
    this.capDevInfoRoutingBody.capdev_term_id = this.capdev_term_id_2 ? this.capdev_term_id_2 : this.capdev_term_id_1;
  }

  onSaveSection() {
    console.log(this.capDevInfoRoutingBody);
    this.validate_capdev_term_id();
    this.api.resultsSE.PATCH_capacityDevelopent(this.capDevInfoRoutingBody).subscribe(resp => {
      this.getSectionInformation();
    });
  }

  deliveryMethodDescription() {
    return `Please go to <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultId}/geographic-location" class="open_route" target="_blank">section 4. Geographic Location</a> and specify the location information of where the training took place if you selected 'In person' or 'Blended'.`;
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }
}
