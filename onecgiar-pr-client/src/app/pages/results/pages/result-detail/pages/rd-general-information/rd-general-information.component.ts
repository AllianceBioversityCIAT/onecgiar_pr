import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from './models/generalInfoBody';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent {
  generalInfoBody = new GeneralInfoBody();
  constructor(private api: ApiService, public scoreSE: ScoreService, public institutionsSE: InstitutionsService) {}
  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_generalInformationByResultId().subscribe(({ response }) => {
      this.generalInfoBody = response;
      console.log(this.generalInfoBody);
    });
  }
  onSaveSection() {
    console.log(this.generalInfoBody);
    this.api.resultsSE.PATCH_generalInformation(this.generalInfoBody).subscribe(
      resp => {
        this.api.alertsFe.show({ id: 'sectionSaved', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
        this.getSectionInformation();
      },
      err => {
        this.getSectionInformation();
      }
    );
  }
  onChangeKrs() {
    if (this.generalInfoBody.is_krs === false) this.generalInfoBody.krs_url = null;
  }

  showAlerts() {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: 'As a score of 2 has been selected, you are required to provide evidence of the gender tag in the <a class="open_route">Evidence</a> section ',
      querySelector: '#gender_tag',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the climate change tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/2/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#climate_change_tag',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: "If you don't find the actor you are looking for, <a class='open_route'>request</a> to have it added to the list.",
      querySelector: '#parterRequestAlert',
      position: 'beforeend'
    });
  }
}
