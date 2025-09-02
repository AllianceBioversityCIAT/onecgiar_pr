import { Component, OnInit, Input } from '@angular/core';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';

@Component({
    selector: 'app-ipsr-geoscope-creator',
    templateUrl: './ipsr-geoscope-creator.component.html',
    styleUrls: ['./ipsr-geoscope-creator.component.scss'],
    standalone: false
})
export class IpsrGeoscopeCreatorComponent {
  @Input() body: any;
  sub_scope: any = [];
  geoscopeOptions = [
    { full_name: 'Global', id: 1 },
    { full_name: 'Regional', id: 2 },
    { full_name: 'Country', id: 4 },
    { full_name: 'Sub-national', id: 5 }
  ];
  constructor(public regionsCountriesSE: RegionsCountriesService) {}

  get selectRegionsDescription() {
    return `The list of regions below follows the UN <a class="open_route" href="https://unstats.un.org/unsd/methodology/m49/" target='_blank'>(M.49)</a> standard`;
  }

  onSaveSection() {
    //('entre en save');
  }

  onClicked() {
    this.sub_scope.push(this.sub_scope.length);

    for (let index = 0; index < this.body.countries.length; index++) {
      if (!this.body.countries[index].hasOwnProperty('result_countries_sub_national')) {
        this.body.countries[index]['result_countries_sub_national'] = [];
      }
    }
  }

  cleanSubNationals() {
    //('cleanSubNationals');
    //(this.body);
    this.sub_scope = [];
  }

  deleteItem(item) {
    this.sub_scope.splice(item, 1);
  }

  descriptionGeoScope() {
    return `
    <ul>
    <li>Select country/ geoscope for which innovation packaging and scaling readiness assessment will be conducted. </li>
    <li>Please note that geoscope cannot be changed after innovation package creation. </li>
    <li>To optimize the effectiveness of innovation packages, it is strongly advised to tailor them to specific contexts or geographies. If your intention is to design innovation packages for multiple countries or regions, it is crucial to consider creating separate packages for each geolocation. </li>
    </ul>
    `;
  }
}
