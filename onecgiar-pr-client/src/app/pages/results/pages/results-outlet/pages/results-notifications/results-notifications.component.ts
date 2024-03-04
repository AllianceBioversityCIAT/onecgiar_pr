import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
import {
  ModuleTypeEnum,
  StatusPhaseEnum
} from '../../../../../../shared/enum/api.enum';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FilterNotificationByInitiativePipe } from './pipes/filter-notification-by-initiative.pipe';
import { FilterNotificationByPhasePipe } from './pipes/filter-notification-by-phase.pipe';
import { NotificationItemComponent } from './components/notification-item/notification-item.component';
import { PrSelectComponent } from '../../../../../../custom-fields/pr-select/pr-select.component';
import { FormsModule } from '@angular/forms';
import { NoDataTextComponent } from '../../../../../../custom-fields/no-data-text/no-data-text.component';

@Component({
  selector: 'app-results-notifications',
  standalone: true,
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    NotificationItemComponent,
    ScrollingModule,
    FilterNotificationByInitiativePipe,
    FilterNotificationByPhasePipe,
    PrSelectComponent,
    NoDataTextComponent
  ]
})
export class ResultsNotificationsComponent implements OnInit {
  allInitiatives = [];
  phaseList = [];
  phaseFilter = null;
  initiativeIdFilter = null;

  constructor(
    public api: ApiService,
    private shareRequestModalSE: ShareRequestModalService,
    public resultsNotificationsSE: ResultsNotificationsService
  ) {}

  ngOnInit(): void {
    this.getAllPhases();
    this.GET_AllInitiatives();
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_section_information();
    });
    this.shareRequestModalSE.inNotifications = true;
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  getAllPhases() {
    this.api.resultsSE
      .GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING)
      .subscribe(({ response }) => {
        this.phaseList = response;
        this.phaseFilter = (
          this.phaseList.find(phase => phase.status) as any
        )?.id;
      });
  }
}
