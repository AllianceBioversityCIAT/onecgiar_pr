import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from './models/generalInfoBody';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { environment } from '../../../../../../../environments/environment.prod';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent {
  generalInfoBody = new GeneralInfoBody();
  constructor(private api: ApiService, public scoreSE: ScoreService, public institutionsSE: InstitutionsService) {}
  ngOnInit(): void {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: 'Since score 2 has been selected please make sure to provide evidence of gender tag under the <a class="open_route">Evidence</a> section ',
      querySelector: '#gender_tag',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `Since score 2 has been selected please make sure to provide evidence of climate change tag under the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/2/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#climate_change_tag',
      position: 'beforeend'
    });
    console.log(`${environment.frontBaseUrl}result/result-detail/2/evidences`);
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: "If you don't find the actor you are looking for, <a class='open_route'>request</a> to have it added to the list.",
      querySelector: '#parterRequestAlert',
      position: 'beforeend'
    });
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_generalInformationByResultId().subscribe(({ response }) => {
      this.generalInfoBody = response;
      console.log((response.institutions_type = [28, 17, 26, 27]));
    });
  }
  onSaveSection() {
    console.log(this.generalInfoBody);
    this.api.resultsSE.PATCH_generalInformation(this.generalInfoBody).subscribe(resp => {
      console.log(resp);
    });
  }
  onChangeKrs() {
    if (this.generalInfoBody.is_krs === false) this.generalInfoBody.krs_url = null;
  }
}
