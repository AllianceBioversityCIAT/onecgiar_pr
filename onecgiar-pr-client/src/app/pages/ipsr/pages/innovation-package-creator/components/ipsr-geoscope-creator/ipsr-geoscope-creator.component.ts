import { Component, OnInit, Input } from '@angular/core';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';

@Component({
  selector: 'app-ipsr-geoscope-creator',
  templateUrl: './ipsr-geoscope-creator.component.html',
  styleUrls: ['./ipsr-geoscope-creator.component.scss']
})
export class IpsrGeoscopeCreatorComponent {
  @Input() body: any;
  sub_scope:any = [];
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

  onSaveSection() {}

  onClicked(){
    this.sub_scope.push(this.sub_scope.length);
  }
}
