import { Component, Input, OnInit, inject } from '@angular/core';
import { DisableOptionsSubNa } from './interfaces/subnational.interface';
import { RegionsCountriesService } from '../../services/global/regions-countries.service';
import { GeoScopeEnum } from '../../enum/geo-scope.enum';
import { ModuleTypeEnum } from '../../enum/api.enum';
import { AppModuleEnum } from '../../enum/app-module.enum';
import { ApiService } from '../../services/api/api.service';
import { ResultLevelService } from '../../../pages/results/pages/result-creator/services/result-level.service';
import { FieldsManagerService } from '../../services/fields-manager.service';

@Component({
  selector: 'app-geoscope-management',
  templateUrl: './geoscope-management.component.html',
  styleUrls: ['./geoscope-management.component.scss'],
  standalone: false
})
export class GeoscopeManagementComponent implements OnInit {
  @Input() body: any = { regions: [], countries: [] };
  @Input() readOnly: boolean = false;
  @Input() module: string;
  fieldsManagerS = inject(FieldsManagerService);
  public internalModule: AppModuleEnum;
  public selectedItems: DisableOptionsSubNa[] = [];
  public sub_scope: any[] = [];
  private readonly UNM49 = 'https://unstats.un.org/unsd/methodology/m49/';
  private readonly ISO3166 = 'https://www.iso.org/iso-3166-country-codes.html';
  public geoscopeOptions = [
    { full_name: 'Global', id: GeoScopeEnum.GLOBAL },
    { full_name: 'Regional', id: GeoScopeEnum.REGIONAL },
    { full_name: 'Country', id: GeoScopeEnum.COUNTRY },
    { full_name: 'Sub-national', id: GeoScopeEnum.SUB_NATIONAL }
  ];

  get labelRadioButtons(): string {
    return this.internalModule && this.internalModule.name === ModuleTypeEnum.REPORTING
      ? `What is the main geographic focus of the ${this.api.dataControlSE.getLastWord(this.resultLevelSE.currentResultLevelName)}?`
      : `Select country/ geoscope for which packaging and scaling readiness assessment will be conducted`;
  }

  get descriptionRadioButtons(): string {
    return this.internalModule && this.internalModule.name === ModuleTypeEnum.REPORTING
      ? `This should reflect where the <strong>${this.api.dataControlSE.getLastWord(this.resultLevelSE.currentResultLevelName)}</strong> has taken place/contributed to benefit.`
      : undefined;
  }

  constructor(
    public regionsCountriesSE: RegionsCountriesService,
    public api: ApiService,
    public resultLevelSE: ResultLevelService
  ) {}

  resetHasScope() {
    switch (this.body.geo_scope_id) {
      case GeoScopeEnum.DETERMINED:
      case GeoScopeEnum.GLOBAL:
        this.body.has_countries = false;
        this.body.has_regions = false;
        break;
      case GeoScopeEnum.REGIONAL:
        this.body.has_regions = true;
        this.body.has_countries = false;
        break;
      case GeoScopeEnum.COUNTRY:
      case GeoScopeEnum.SUB_NATIONAL:
        this.body.has_countries = true;
        this.body.has_regions = false;
        break;
    }
  }

  resetExtraScope() {
    switch (this.body.extra_geo_scope_id) {
      case GeoScopeEnum.DETERMINED:
      case GeoScopeEnum.GLOBAL:
        this.body.has_extra_countries = false;
        this.body.has_extra_regions = false;
        break;
      case GeoScopeEnum.REGIONAL:
        this.body.has_extra_regions = true;
        this.body.has_extra_countries = false;
        break;
      case GeoScopeEnum.COUNTRY:
      case GeoScopeEnum.SUB_NATIONAL:
        this.body.has_extra_countries = true;
        this.body.has_extra_regions = false;
        break;
    }
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

  saveFormatData() {
    switch (this.body.geo_scope_id) {
      case GeoScopeEnum.REGIONAL:
        this.body.countries = [];
        break;
      case GeoScopeEnum.COUNTRY:
      case GeoScopeEnum.SUB_NATIONAL:
        this.body.regions = [];
        if (GeoScopeEnum.COUNTRY) this.body.countries?.map(el => (el.sub_national = []));
        break;
      default:
        this.body.regions = [];
        this.body.countries = [];
        break;
    }
  }

  includesScope(ids: number[]): boolean {
    return ids.includes(this.body.geo_scope_id);
  }

  includesExtraScope(ids: number[]): boolean {
    return ids.includes(this.body.extra_geo_scope_id);
  }

  thereAnyText(isCountry: boolean): string {
    return `The list of ${isCountry ? 'countries' : 'regions'} below follows the <a href='${isCountry ? this.ISO3166 : this.UNM49}' class="open_route" target='_blank'>${isCountry ? 'ISO 3166' : 'UN (M.49)'}<a> standard`;
  }

  ngOnInit(): void {
    this.internalModule = AppModuleEnum.getFromName(this.module);
    if (this.internalModule && this.internalModule.name === ModuleTypeEnum.REPORTING)
      this.geoscopeOptions = [...this.geoscopeOptions, { full_name: 'This is yet to be determined', id: GeoScopeEnum.DETERMINED }];
  }
}
