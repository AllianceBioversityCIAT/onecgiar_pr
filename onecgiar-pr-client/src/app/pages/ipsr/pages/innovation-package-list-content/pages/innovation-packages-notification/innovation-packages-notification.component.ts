import { Component, OnInit } from '@angular/core';
import { ShareRequestModalService } from 'src/app/pages/results/pages/result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from 'src/app/pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ModuleTypeEnum, StatusPhaseEnum } from 'src/app/shared/enum/api.enum';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-innovation-packages-notification',
  templateUrl: './innovation-packages-notification.component.html',
  styleUrls: ['./innovation-packages-notification.component.scss']
})
export class InnovationPackagesNotificationComponent implements OnInit {
  allInitiatives = [];
  phaseList = [];
  phaseFilter = null;
  initiativeIdFilter = null;

  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService, public resultsNotificationsSE: ResultsNotificationsService) {}

  ngOnInit(): void {
    this.getAllPhases();
    this.GET_AllInitiatives();
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_section_innovation_packages();
    });

    this.api.dataControlSE.inNotifications = true;
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  getAllPhases() {
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.IPSR).subscribe(({ response }) => {
      this.phaseList = response;
      this.phaseFilter = (this.phaseList.find(phase => phase.status) as any)?.id;
    });
  }
}
