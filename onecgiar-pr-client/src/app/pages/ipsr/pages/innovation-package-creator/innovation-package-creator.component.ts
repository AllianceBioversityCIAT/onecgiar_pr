import { Component, DoCheck } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { InnovationPackageCreatorBody } from './model/innovation-package-creator.model';
import { Router } from '@angular/router';
import { ManageInnovationsListService } from '../../services/manage-innovations-list.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';

@Component({
  selector: 'app-innovation-package-creator',
  templateUrl: './innovation-package-creator.component.html',
  styleUrls: ['./innovation-package-creator.component.scss']
})
export class InnovationPackageCreatorComponent implements DoCheck {
  innovationPackageCreatorBody = new InnovationPackageCreatorBody();
  searchText = '';
  allInitiatives = [];
  status: boolean = true;
  statusPdialog: boolean = false;
  constructor(public api: ApiService, private router: Router, public manageInnovationsListSE: ManageInnovationsListService) {
    this.GET_AllInitiatives();
    if (this.api.dataControlSE.myInitiativesList.length) {
      this.api.rolesSE.readOnly = false;
      if (this.api?.dataControlSE?.currentResult?.status) this.api.dataControlSE.currentResult.status = null;
    }
  }

  selectInnovationEvent(e) {
    this.innovationPackageCreatorBody.result_id = e.result_id;

    this.api.resultsSE.GETInnovationByResultId(e.result_id).subscribe(({ response }) => {
      this.innovationPackageCreatorBody.geo_scope_id = response.geographic_scope_id == 3 ? 4 : response.geographic_scope_id;
      this.innovationPackageCreatorBody.regions = response.hasRegions;
      this.innovationPackageCreatorBody.countries = response.hasCountries;
      this.innovationPackageCreatorBody.result_code = response.result_code;
      this.innovationPackageCreatorBody.official_code = response.official_code;
      this.innovationPackageCreatorBody.title = response.title;
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  get areLists(): boolean {
    switch (this.innovationPackageCreatorBody?.geo_scope_id) {
      case GeoScopeEnum.GLOBAL:
        return true;
      case GeoScopeEnum.REGIONAL:
        return !!this.innovationPackageCreatorBody.regions.length;
      case GeoScopeEnum.COUNTRY:
        return !!this.innovationPackageCreatorBody.countries.length;
      case GeoScopeEnum.SUB_NATIONAL:
        return this.innovationPackageCreatorBody.countries?.some((country: any) => country?.sub_national?.length);
      default:
        return false;
    }
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;

    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  onSaveSection() {
    this.innovationPackageCreatorBody.geoScopeSubNatinals.forEach(resp => {
      const subCountry = this.innovationPackageCreatorBody.countries.filter(country => resp.idCountry == country.id)[0];
      if (resp.isRegister != 0) {
        subCountry['result_countries_sub_national'].push(resp);
      }
    });

    this.api.resultsSE.POSTResultInnovationPackage(this.innovationPackageCreatorBody).subscribe({
      next: ({ response }) => {
        this.router.navigateByUrl(`/ipsr/detail/${response.newInnovationHeader.result_code}/general-information?phase=${response.newInnovationHeader.version_id}`);
        this.api.alertsFe.show({ id: 'ipsr-creator', title: 'Innovation package created', status: 'success', closeIn: 500 });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'ipsr-creator-error', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.innovationPackageCreatorBody.countries.forEach(resp => {
          resp['result_countries_sub_national'] = [];
        });
      }
    });
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
