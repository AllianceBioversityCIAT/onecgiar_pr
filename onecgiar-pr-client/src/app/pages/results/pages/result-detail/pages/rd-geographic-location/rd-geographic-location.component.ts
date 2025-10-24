import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeographicLocationBody } from './models/geographicLocationBody';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { GeoScopeEnum } from '../../../../../../shared/enum/geo-scope.enum';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ExtraGeographicLocationBody } from './models/extraGeographicLocationBody';

@Component({
  selector: 'app-rd-geographic-location',
  templateUrl: './rd-geographic-location.component.html',
  styleUrls: ['./rd-geographic-location.component.scss'],
  standalone: false
})
export class RdGeographicLocationComponent implements OnInit {
  geographicLocationBody = new GeographicLocationBody();
  extraGeographicLocationBody = new ExtraGeographicLocationBody();
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

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public regionsCountriesSE: RegionsCountriesService,
    private customizedAlertsFeSE: CustomizedAlertsFeService,
    private fieldsManagerSE: FieldsManagerService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Geographic location');
  }

  ngOnInit(): void {
    this.getSectionInformation();
    this.getSectionInformationp25();
  }

  geographic_focus_description(id) {
    let tags = '';
    switch (id) {
      case 2:
        tags +=
          'For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.';
        break;
      case 3:
        tags +=
          'For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.';
        break;
    }
    tags += '';
    return tags;
  }

  getSectionInformation() {
    this.api.resultsSE.GET_geographicSection().subscribe(({ response }) => {
      this.geographicLocationBody = response;
      const legacyCountries = 4;
      this.geographicLocationBody.geo_scope_id =
        this.geographicLocationBody?.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : this.geographicLocationBody.geo_scope_id;
    });
  }

  getSectionInformationp25() {
    this.api.resultsSE.GET_geographicSectionp25().subscribe(({ response }) => {
      this.extraGeographicLocationBody = response;
      console.log(response);
      const legacyCountries = 4;
      this.extraGeographicLocationBody.has_extra_geo_scope = Boolean(response.has_extra_geo_scope);
      this.extraGeographicLocationBody.extra_geo_scope_id =
        this.extraGeographicLocationBody?.extra_geo_scope_id == legacyCountries
          ? GeoScopeEnum.COUNTRY
          : this.extraGeographicLocationBody.extra_geo_scope_id;
    });
  }

  onSaveSection() {
    this.api.resultsSE.PATCH_geographicSection(this.geographicLocationBody).subscribe(() => {
      this.getSectionInformation();
    });
    this.api.resultsSE.PATCH_geographicSectionp25(this.extraGeographicLocationBody).subscribe(() => {
      this.getSectionInformationp25();
    });
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  thereAnyRegionText() {
    return `The list of regions below follows the <a href='${this.UNM49}' class="open_route" target='_blank'>UN (M.49)<a> standard`;
  }

  thereAnycountriesText() {
    return `The list of countries below follows the <a href='${this.ISO3166}' class="open_route" target='_blank'>ISO 3166<a> standard`;
  }
}
