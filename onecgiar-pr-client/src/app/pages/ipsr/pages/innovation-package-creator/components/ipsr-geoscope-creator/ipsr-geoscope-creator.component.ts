import { Component, OnInit, Input } from '@angular/core';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';

@Component({
  selector: 'app-ipsr-geoscope-creator',
  templateUrl: './ipsr-geoscope-creator.component.html',
  styleUrls: ['./ipsr-geoscope-creator.component.scss']
})
export class IpsrGeoscopeCreatorComponent {
  @Input() body: any;
  geoscopeOptions = [
    { full_name: 'Global', id: 1 },
    { full_name: 'Regional', id: 2 },
    { full_name: 'Country', id: 4 },
    { full_name: 'Sub-national', id: 5 }
  ];
  constructor(public regionsCountriesSE: RegionsCountriesService) {}
  onSaveSection() {}
}
