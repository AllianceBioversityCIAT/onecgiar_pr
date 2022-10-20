import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from './models/generalInfoBody';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent {
  generalInfoBody = new GeneralInfoBody();
  result_level: string = 'Inititative Outcome';
  result_type: string = 'Innovation use';
  scoreList = [
    {
      id: 1,
      name: '0 - Not Targeted'
    },
    {
      id: 2,
      name: '1 - Significant'
    },
    {
      id: 3,
      name: '2 - Principal'
    }
  ];
  constructor(private api: ApiService) {}
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
      description: 'Since score 2 has been selected please make sure to provide evidence of climate change tag under the <a class="open_route">Evidence</a> section ',
      querySelector: '#climate_change_tag',
      position: 'beforeend'
    });
  }
  onSaveSection() {
    console.log(this.generalInfoBody);
  }
  onChangeKrs() {
    if (this.generalInfoBody.is_krs === false) this.generalInfoBody.krs_url = null;
  }
}
