/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-sub-geoscope',
    templateUrl: './sub-geoscope.component.html',
    styleUrls: ['./sub-geoscope.component.scss'],
    standalone: false
})
export class SubGeoscopeComponent {
  @Input() body: any = {};
  @Input() index: any;
  countrySelected: any;
  subNationalOne: any = [];
  subNationalOneSelected = null;
  subNationalTwo: any = [];
  subNationalTwoSelected = null;
  @Output() selectOptionEvent = new EventEmitter();
  showNationalLevelSelect: boolean = true;
  showNationalLevelTwoSelect: boolean = true;
  exitsSubLevelOne: boolean = true;
  exitsSubLevelTwo: boolean = true;
  nameCountry: string;
  nameCountryTwo: string;

  constructor(public api: ApiService) {}

  getSubNationalLevelOne(index) {
    this.subNationalOne = [];
    this.subNationalTwo = [];
    this.exitsSubLevelOne = true;
    this.exitsSubLevelTwo = true;
    const isoAlpha = this.body.countries.filter(resp => this.countrySelected == resp.id)[0];
    this.api.resultsSE.getSubNationalLevelOne(isoAlpha.iso_alpha_2).subscribe(resp => {
      this.subNationalOne = resp['response'];
      if (this.subNationalOne.length == 0) {
        this.exitsSubLevelOne = false;
        this.exitsSubLevelTwo = false;

        this.nameCountry = this.body.countries.filter(resp => this.countrySelected == resp.id)[0]['name'];
        this.nameCountryTwo = this.body.countries.filter(resp => this.countrySelected == resp.id)[0]['name'];
      }
    });
    if (this.body.geoScopeSubNatinals.length == 0 || this.body.geoScopeSubNatinals.length < index + 1) {
      const subCountriesSave = {
        idCountry: isoAlpha.id,
        isRegister: 0
      };
      this.body.geoScopeSubNatinals.push(subCountriesSave);
    } else if (this.body.geoScopeSubNatinals.length >= index + 1) {
      const subCountriesSave = {
        idCountry: isoAlpha.id,
        isRegister: 0
      };
      this.body.geoScopeSubNatinals[index] = subCountriesSave;
    }

    this.subNationalOneSelected = null;
    this.showNationalLevelSelect = false;
    this.showNationalLevelTwoSelect = false;
    setTimeout(() => {
      this.showNationalLevelSelect = true;
      this.showNationalLevelTwoSelect = true;
    }, 300);
  }

  getSSubNationalLevelTwo(index) {
    this.subNationalTwo = [];
    this.exitsSubLevelTwo = true;
    const isoAlpha = this.body.countries.filter(resp => this.countrySelected == resp.id)[0];
    const adminCode = this.subNationalOne.filter(resp => this.subNationalOneSelected == resp.geonameId)[0];
    const infoSublevelOne = this.subNationalOne.filter(resp => this.subNationalOneSelected == resp.geonameId)[0];
    this.api.resultsSE.getSubNationalLevelTwo(isoAlpha.iso_alpha_2, adminCode.adminCode1).subscribe(resp => {
      this.subNationalTwo = resp['response'];
      if (this.subNationalTwo.length == 0) {
        this.exitsSubLevelTwo = false;
        this.nameCountryTwo = infoSublevelOne['name'];
      }
    });

    if (this.body.geoScopeSubNatinals.length >= index + 1) {
      const subCountriesSave = {
        idCountry: isoAlpha.id,
        sub_level_one_id: infoSublevelOne['geonameId'],
        sub_level_one_name: infoSublevelOne['name'],
        isRegister: 1
      };
      this.body.geoScopeSubNatinals[index] = subCountriesSave;
    }

    this.subNationalTwoSelected = null;
    this.showNationalLevelTwoSelect = false;
    setTimeout(() => {
      this.showNationalLevelTwoSelect = true;
    }, 300);
  }

  delete(index) {
    this.selectOptionEvent.emit(index);
    this.body.geoScopeSubNatinals.splice(index, 1);
  }

  selectSubLevelTwo(index) {
    const infoSublevel = this.subNationalTwo.filter(resp => this.subNationalTwoSelected == resp.geonameId)[0];
    const infoSublevelOne = this.subNationalOne.filter(resp => this.subNationalOneSelected == resp.geonameId)[0];
    const isoAlpha = this.body.countries.filter(resp => this.countrySelected == resp.id)[0];

    if (this.body.geoScopeSubNatinals.length >= index + 1) {
      const subCountriesSave = {
        idCountry: isoAlpha.id,
        sub_level_one_id: infoSublevelOne['geonameId'],
        sub_level_one_name: infoSublevelOne['name'],
        sub_level_two_id: infoSublevel['geonameId'],
        sub_level_two_name: infoSublevel['name'],
        isRegister: 2
      };
      this.body.geoScopeSubNatinals[index] = subCountriesSave;
    }
  }
}
