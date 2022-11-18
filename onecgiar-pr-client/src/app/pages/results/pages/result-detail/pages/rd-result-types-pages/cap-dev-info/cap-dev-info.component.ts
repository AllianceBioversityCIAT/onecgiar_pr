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
    });
  }
  onSaveSection() {
    console.log(this.capDevInfoRoutingBody);
    this.api.resultsSE.PATCH_capacityDevelopent(this.capDevInfoRoutingBody).subscribe(resp => {
      this.getSectionInformation();
    });
  }

  deliveryMethodDescription() {
    return `Please go to <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultId}/geographic-location" class="open_route" target="_blank">section 4. Geographic Location</a> and specify the location info of where the training took place in case you select the Face to face or Blended option.`;
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
