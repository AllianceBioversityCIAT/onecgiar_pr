import { Component, OnInit, effect } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeographicLocationBody } from './models/geographicLocationBody';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { GeoScopeEnum } from '../../../../../../shared/enum/geo-scope.enum';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ExtraGeographicLocationBody } from './models/extraGeographicLocationBody';
import { DataControlService } from '../../../../../../shared/services/data-control.service';

@Component({
  selector: 'app-rd-geographic-location',
  templateUrl: './rd-geographic-location.component.html',
  styleUrls: ['./rd-geographic-location.component.scss'],
  standalone: false
})
export class RdGeographicLocationComponent {
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
    public customizedAlertsFeSE: CustomizedAlertsFeService,
    public fieldsManagerSE: FieldsManagerService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Geographic location');
  }

  OnChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.fieldsManagerSE.isP25() ? this.getSectionInformationp25() : this.getSectionInformation();
    }
  });

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
      this.fillGeographicLocationBody(response);
    });
  }

  fillGeographicLocationBody(response: any) {
    this.geographicLocationBody = response;
    const legacyCountries = 4;
    this.geographicLocationBody.geo_scope_id =
      this.geographicLocationBody?.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : this.geographicLocationBody.geo_scope_id;
  }

  fillExtraGeographicLocationBody(response: any) {
    this.extraGeographicLocationBody.geo_scope_id = response.extra_geo_scope_id;
    this.extraGeographicLocationBody.has_regions = response.has_extra_regions;
    this.extraGeographicLocationBody.has_countries = response.has_extra_countries;
    this.extraGeographicLocationBody.countries = response.extra_countries;
    this.extraGeographicLocationBody.regions = response.extra_regions;
    this.extraGeographicLocationBody.has_extra_geo_scope = Boolean(response.has_extra_geo_scope);
    const legacyCountries = 4;
    this.extraGeographicLocationBody.geo_scope_id =
      this.extraGeographicLocationBody?.geo_scope_id == legacyCountries ? GeoScopeEnum.COUNTRY : this.extraGeographicLocationBody.geo_scope_id;
  }

  getSectionInformationp25() {
    this.api.resultsSE.GET_geographicSectionp25().subscribe(({ response }) => {
      this.fillGeographicLocationBody(response);
      this.fillExtraGeographicLocationBody(response);
    });
  }

  onSaveSection() {
    if (this.fieldsManagerSE.isP25()) {
      this.api.resultsSE
        .PATCH_geographicSectionp25({
          has_countries: this.geographicLocationBody.has_countries,
          has_regions: this.geographicLocationBody.has_regions,
          regions: this.geographicLocationBody.regions,
          countries: this.geographicLocationBody.countries,
          geo_scope_id: this.geographicLocationBody.geo_scope_id,
          extra_geo_scope_id: this.extraGeographicLocationBody.geo_scope_id,
          extra_regions: this.extraGeographicLocationBody.regions,
          extra_countries: this.extraGeographicLocationBody.countries,
          has_extra_countries: this.extraGeographicLocationBody.has_countries,
          has_extra_regions: this.extraGeographicLocationBody.has_regions,
          has_extra_geo_scope: this.extraGeographicLocationBody.has_extra_geo_scope
        })
        .subscribe(() => {
          this.getSectionInformationp25();
        });
    } else {
      this.api.resultsSE.PATCH_geographicSection(this.geographicLocationBody).subscribe(() => {
        this.getSectionInformation();
      });
    }
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
