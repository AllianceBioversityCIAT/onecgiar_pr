import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationBarService } from '../../../../shared/services/navigation-bar.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from '../result-creator/services/result-level.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { PusherService } from '../../../../shared/services/pusher.service';
import { GreenChecksService } from '../../../../shared/services/global/green-checks.service';
import { ShareRequestModalService } from './components/share-request-modal/share-request-modal.service';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss']
})
export class ResultDetailComponent {
  constructor(private shareRequestModalSE: ShareRequestModalService, public navigationBarSE: NavigationBarService, private activatedRoute: ActivatedRoute, private api: ApiService, public saveButtonSE: SaveButtonService, private resultLevelSE: ResultLevelService, private rolesSE: RolesService, private router: Router, public dataControlSE: DataControlService, private pusherService: PusherService, private greenChecksSE: GreenChecksService) {}
  closeInfo = false;
  ngOnInit(): void {
    this.dataControlSE.currentResult = null;
    this.api.resultsSE.currentResultId = null;
    this.api.updateUserData(() => {
      console.log(this.dataControlSE.currentResult);
    });
    this.api.resultsSE.currentResultId = this.activatedRoute.snapshot.paramMap.get('id');
    this.GET_resultById();
    this.greenChecksSE.updateGreenChecks();
    this.shareRequestModalSE.inNotifications = false;
  }

  GET_resultById() {
    this.api.resultsSE.GET_resultById().subscribe(
      ({ response }) => {
        // console.log(response);
        this.rolesSE.validateReadOnly(response);
        this.resultLevelSE.currentResultLevelName = response.result_level_name;
        this.resultLevelSE.currentResultLevelId = response.result_level_id;
        this.resultLevelSE.currentResultTypeId = response.result_type_id;
        console.log(response);
        this.dataControlSE.currentResult = response;
      },
      err => {
        console.log(err.error.statusCode == 404);
        if (err.error.statusCode == 404) this.router.navigate([`/`]);
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: 'result not found', status: 'error' });
      }
    );
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
