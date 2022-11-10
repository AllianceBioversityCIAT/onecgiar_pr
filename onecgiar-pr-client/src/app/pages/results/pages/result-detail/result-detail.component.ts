import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigationBarService } from '../../../../shared/services/navigation-bar.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from '../result-creator/services/result-level.service';
import { RolesService } from '../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss']
})
export class ResultDetailComponent {
  constructor(public navigationBarSE: NavigationBarService, private activatedRoute: ActivatedRoute, private api: ApiService, private resultLevelSE: ResultLevelService, private rolesSE: RolesService) {}
  ngOnInit(): void {
    this.api.updateUserData();
    this.api.resultsSE.currentResultId = this.activatedRoute.snapshot.paramMap.get('id');
    this.GET_resultById();
  }

  GET_resultById() {
    this.api.resultsSE.GET_resultById().subscribe(({ response }) => {
      // console.log(response);
      this.rolesSE.validateReadOnly(response);
      this.resultLevelSE.currentResultLevelName = response.result_level_name;
      this.resultLevelSE.currentResultLevelId = response.result_level_id;
      this.resultLevelSE.currentResultTypeId = response.result_type_id;
    });
  }
}
