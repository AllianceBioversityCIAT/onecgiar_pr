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
import { CurrentResultService } from '../../../../shared/services/current-result.service';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss']
})
export class ResultDetailComponent {
  constructor(private currentResultSE: CurrentResultService, private shareRequestModalSE: ShareRequestModalService, public navigationBarSE: NavigationBarService, private activatedRoute: ActivatedRoute, private api: ApiService, public saveButtonSE: SaveButtonService, private resultLevelSE: ResultLevelService, private rolesSE: RolesService, private router: Router, public dataControlSE: DataControlService, private pusherService: PusherService, private greenChecksSE: GreenChecksService) {}
  closeInfo = false;
  ngOnInit(): void {
    this.dataControlSE.currentResult = null;
    this.api.resultsSE.currentResultId = null;
    this.api.updateUserData(() => {
      // console.log(this.dataControlSE.currentResult);
    });
    this.api.resultsSE.currentResultId = this.activatedRoute.snapshot.paramMap.get('id');
    this.currentResultSE.GET_resultById();
    this.greenChecksSE.updateGreenChecks();
    this.shareRequestModalSE.inNotifications = false;
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
  }
}
