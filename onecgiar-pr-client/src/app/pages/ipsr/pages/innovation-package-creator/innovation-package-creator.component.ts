import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { InnovationPackageCreatorBody } from './model/innovation-package-creator.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-innovation-package-creator',
  templateUrl: './innovation-package-creator.component.html',
  styleUrls: ['./innovation-package-creator.component.scss']
})
export class InnovationPackageCreatorComponent {
  innovationPackageCreatorBody = new InnovationPackageCreatorBody();
  searchText = '';
  constructor(public api: ApiService, private router: Router) {}
  selectInnovationEvent(e) {
    this.innovationPackageCreatorBody.result_id = e.result_id;
    this.api.resultsSE.GETInnovationByResultId(e.result_id).subscribe(({ response }) => {
      this.innovationPackageCreatorBody.geo_scope_id = response.geographic_scope_id;
      this.innovationPackageCreatorBody.regions = response.hasRegions;
      this.innovationPackageCreatorBody.countries = response.hasCountries;
      this.innovationPackageCreatorBody.result_code = response.result_code;
      this.innovationPackageCreatorBody.official_code = response.official_code;
      this.innovationPackageCreatorBody.title = response.title;
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  onSaveSection() {
    this.api.resultsSE.POSTResultInnovationPackage(this.innovationPackageCreatorBody).subscribe(({ response }) => {
      this.router.navigateByUrl(`/ipsr/detail/${response.newInnovationHeader.result_code}`);
      this.api.alertsFe.show({ id: 'ipsr-creator', title: 'Innovation package created', status: 'success', closeIn: 500 });
    });
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
