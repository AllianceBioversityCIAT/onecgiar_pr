import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent {
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

  listvalue: any;
  yesornot: boolean = null;
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
}
