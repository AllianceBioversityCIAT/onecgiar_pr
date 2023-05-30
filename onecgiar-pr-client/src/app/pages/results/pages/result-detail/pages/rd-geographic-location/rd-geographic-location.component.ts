import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { environment } from '../../../../../../../environments/environment.prod';
import { GeographicLocationBody } from './models/geographicLocationBody';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';

@Component({
  selector: 'app-rd-geographic-location',
  templateUrl: './rd-geographic-location.component.html',
  styleUrls: ['./rd-geographic-location.component.scss']
})
export class RdGeographicLocationComponent {
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, public regionsCountriesSE: RegionsCountriesService) {}
  geographicLocationBody = new GeographicLocationBody();
  UNM49 = 'https://unstats.un.org/unsd/methodology/m49/';
  ISO3166 = 'https://www.iso.org/iso-3166-country-codes.html';
  geographic_focus = [
    {
      name: 'Global',
      id: 1
    },
    {
      name: 'Regional',
      id: 2
    },
    {
      name: 'National',
      id: 3
    },
    {
      name: 'This is yet to be determined',
      id: 4
    }
  ];
  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  geographic_focus_description(id) {
    let tags = '';
    switch (id) {
      case 2:
        tags += 'For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.';
        break;
      case 3:
        tags += 'For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.';
        break;
    }
    tags += '';
    return tags;
  }
  getSectionInformation() {
    this.api.resultsSE.GET_geographicSection().subscribe(({ response }) => {
      this.geographicLocationBody = response;
      //(response);
    });
  }
  onSaveSection() {
    //(this.geographicLocationBody);
    this.api.resultsSE.PATCH_geographicSection(this.geographicLocationBody).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }
  onSyncSection() {
    this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
      this.getSectionInformation();
    });
  }
  showAlerts() {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `Select the geographical locations where this result is taking place. Please be as specific as possible and do not forget to include the locations coming from any Bilateral contributing to this result.`,
      querySelector: '#alert',
      position: 'beforeend'
    });

    if (this.api.dataControlSE.isKnowledgeProduct) {
      //this should be executed after the page initialization
      this.api.alertsFs.show({
        status: 'success',
        title: 'sd',
        description: `In case some of the metadata fields are incorrect, please get in touch with the library staff of your Center to update them in the repository. Before the end of the reporting period, metadata will be automatically refreshed on this page.`,
        querySelector: '#alert',
        position: 'beforeend'
      });
    }
  }
  thereAnyRegionText() {
    return `The list of regions below follows the <a href='${this.UNM49}' class="open_route" target='_blank'>UN (M.49)<a> standard`;
  }
  thereAnycountriesText() {
    return `The list of countries below follows the <a href='${this.ISO3166}' class="open_route" target='_blank'>ISO 3166<a> standard`;
  }
}
