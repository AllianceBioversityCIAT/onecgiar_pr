import { Component, Input, OnInit } from '@angular/core';
import { disableOptionsSubNa } from './interfaces/subnational.interface';
import { RegionsCountriesService } from '../../services/global/regions-countries.service';

@Component({
  selector: 'app-geoscope-management',
  templateUrl: './geoscope-management.component.html',
  styleUrls: ['./geoscope-management.component.scss']
})
export class GeoscopeManagementComponent implements OnInit {
  @Input() body: any = { regions: [], countries: [] };
  public selectedItems: disableOptionsSubNa[] = [];
  public sub_scope: any[] = [];
  public geoscopeOptions = [
    { full_name: 'Global', id: 1 },
    { full_name: 'Regional', id: 2 },
    { full_name: 'Country', id: 4 },
    { full_name: 'Sub-national', id: 5 }
  ];

  constructor(public regionsCountriesSE: RegionsCountriesService) {}

  cleanSubNationals() {
    this.sub_scope = [];
    this.saveFormatData();
  }

  saveFormatData() {
    switch (this.body.geo_scope_id) {
      case 1:
        this.body.regions = [];
        this.body.countries = [];
        break;
      case 2:
        this.body.countries = [];
        break;
      case 4:
        this.body.regions = [];
        this.body.countries.map(el => (el.sub_national = []));
        break;
      case 5:
        this.body.regions = [];
        break;
      default:
        this.body.regions = [];
        this.body.countries = [];
        break;
    }
  }

  test() {
    console.log(this.body);
  }

  ngOnInit(): void {}
}
