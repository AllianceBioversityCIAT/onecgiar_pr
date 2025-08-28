import { Component, Input } from '@angular/core';
import { RegionsCountriesService } from '../../../../../../../../../../shared/services/global/regions-countries.service';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-step-n1-geoscope',
    templateUrl: './step-n1-geoscope.component.html',
    styleUrls: ['./step-n1-geoscope.component.scss'],
    standalone: false
})
export class StepN1GeoscopeComponent {
  @Input() body = new IpsrStep1Body();
  geoscopeOptions = [
    { full_name: 'Global', id: 1 },
    { full_name: 'Regional', id: 2 },
    { full_name: 'Country', id: 4 },
    { full_name: 'Sub-national', id: 5 }
  ];

  constructor(public regionsCountriesSE: RegionsCountriesService, public api: ApiService) {}

  get selectRegionsDescription() {
    return `The list of regions below follows the UN <a class="open_route" href="https://unstats.un.org/unsd/methodology/m49/" target='_blank'>(M.49)</a> standard`;
  }
}
