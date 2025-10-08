import { Component, OnInit, computed, signal } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../../results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../shared/enum/api.enum';

@Component({
  selector: 'app-innovation-packages-notification',
  templateUrl: './innovation-packages-notification.component.html',
  styleUrls: ['./innovation-packages-notification.component.scss'],
  standalone: false
})
export class InnovationPackagesNotificationComponent implements OnInit {
  allInitiatives = signal<any[]>([]);
  phaseList = [];
  phaseFilter = null;
  initiativeIdFilter = null;
  portfolioIdSelected = signal<null | number | string>(null);
  initiativesByPortfolio = computed<any[]>(() => {
    if (this.api.rolesSE.isAdmin) {
      return this.allInitiatives().filter(initiative => initiative.portfolio_id == this.portfolioIdSelected());
    } else {
      return this.api.dataControlSE.myInitiativesList.filter(initiative => initiative.portfolio_id == this.portfolioIdSelected());
    }
  });

  constructor(
    public api: ApiService,
    public resultsNotificationsSE: ResultsNotificationsService
  ) {}

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
      this.allInitiatives.set(response);
    });
  }

  onSelectPhase(event) {
    this.portfolioIdSelected.set(event.portfolio_id);
    console.log('portfolioIdSelected', this.portfolioIdSelected());
    this.initiativeIdFilter = null;
  }

  getAllPhases() {
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.IPSR).subscribe(({ response }) => {
      this.phaseList = response;
      this.phaseFilter = this.phaseList.find(phase => phase.status)?.id;
      this.onSelectPhase(this.phaseList.find(phase => phase.status));
    });
  }
}
