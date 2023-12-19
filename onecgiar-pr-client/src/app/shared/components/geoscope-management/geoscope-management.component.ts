import { Component, Input, OnInit } from '@angular/core';
import { disableOptionsSubNa } from './interfaces/subnational.interface';
import { RegionsCountriesService } from '../../services/global/regions-countries.service';
import { GeoScopeEnum } from '../../enum/geo-scope.enum';

@Component({
  selector: 'app-geoscope-management',
  templateUrl: './geoscope-management.component.html',
  styleUrls: ['./geoscope-management.component.scss']
})
export class GeoscopeManagementComponent implements OnInit {
  @Input() body: any = { regions: [], countries: [] };
  @Input() readOnly: boolean = false;
  public selectedItems: disableOptionsSubNa[] = [];
  public sub_scope: any[] = [];
  public geoscopeOptions = [
    { full_name: 'Global', id: GeoScopeEnum.GLOBAL },
    { full_name: 'Regional', id: GeoScopeEnum.REGIONAL },
    { full_name: 'Country', id: GeoScopeEnum.COUNTRY },
    { full_name: 'Sub-national', id: GeoScopeEnum.SUB_NATIONAL }
  ];

  constructor(public regionsCountriesSE: RegionsCountriesService) {}

  cleanSubNationals() {
    this.sub_scope = [];
    this.saveFormatData();
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

  test() {
    this.readOnly = !this.readOnly;
    console.log(this.body);
  }

  ngOnInit(): void {}
}
