import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../../../../../services/manage-innovations-list.service';
import { InnovationPackageCreatorBody } from '../../../../../../../innovation-package-creator/model/innovation-package-creator.model';

@Component({
  selector: 'app-complementary-innovation',
  templateUrl: './complementary-innovation.component.html',
  styleUrls: ['./complementary-innovation.component.scss']
})
export class ComplementaryInnovationComponent implements OnInit {

  innovationPackageCreatorBody = new InnovationPackageCreatorBody();
  constructor(public api: ApiService,) {}

  ngOnInit(): void {
    
  }

  selectInnovationEvent(e) {
    console.log(e);
    
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

}
