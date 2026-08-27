import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ShareRequestModalService } from './share-request-modal.service';
import { Router } from '@angular/router';
import { RetrieveModalService } from '../retrieve-modal/retrieve-modal.service';
import { ResultsNotificationsService } from '../../../results-outlet/pages/results-notifications/results-notifications.service';
import { RdTheoryOfChangesServicesService } from '../../pages/rd-theory-of-change/rd-theory-of-changes-services.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-share-request-modal',
  templateUrl: './share-request-modal.component.html',
  styleUrls: ['./share-request-modal.component.scss'],
  standalone: false
})
export class ShareRequestModalComponent implements OnInit {
  requesting = false;
  allInitiatives = [];
  // P2-3322 (2026): signal-backed flags. Both are toggled `false -> setTimeout -> true` to force a remount
  // (`cleanObject()` for the form, `onPlannedResultChange()` for the ToC block). As plain fields the second
  // write happened outside any Angular notification, so under zoneless change detection the dialog stayed
  // frozen on `false`: reopening the modal showed an empty dialog and switching the "planned result" answer
  // dropped the Level/HLO/KPI block for good. Reading the signal from the template makes the write schedule
  // its own render pass. Same shape as CPMultipleWPsComponent (P2-3245 / P2-3275); the public API stays a
  // plain boolean, so the template and the existing specs are untouched.
  private readonly _showForm = signal<boolean>(true);
  get showForm(): boolean {
    return this._showForm();
  }
  set showForm(value: boolean) {
    this._showForm.set(value);
  }
  // P2-3322: `modelChange()` toggles this `false -> setTimeout(50) -> true` so <app-toc-initiative-out>
  // remounts against the newly selected entity (it is read through `shouldShowTocInitiativeOut`). As a plain
  // field the delayed write notified nothing, so under zoneless change detection the ToC block disappeared
  // for good after switching entity. Signal-backed, the write schedules its own render.
  private readonly _showTocOut = signal<boolean>(true);
  get showTocOut(): boolean {
    return this._showTocOut();
  }
  set showTocOut(value: boolean) {
    this._showTocOut.set(value);
  }
  disabledOptions = [{ initiative_id: 10 }];
  private readonly _tocConsumed = signal<boolean>(true);
  get tocConsumed(): boolean {
    return this._tocConsumed();
  }
  set tocConsumed(value: boolean) {
    this._tocConsumed.set(value);
  }

  constructor(
    public retrieveModalSE: RetrieveModalService,
    public api: ApiService,
    public rolesSE: RolesService,
    public shareRequestModalSE: ShareRequestModalService,
    private router: Router,
    public resultsNotificationsSE: ResultsNotificationsService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService,
    public fieldsManagerSE: FieldsManagerService
  ) {}

  ngOnInit(): void {
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();
    this.GET_AllInitiatives();
  }

  validateAcceptOrReject() {
    const plannedResult = this.shareRequestModalSE.shareRequestBody.planned_result;
    // P2-3106: in the notifications accept flow, the ToC ids are only required when the user answered "Yes"
    // (so "No" / default enables Accept without ToC mapping). The result-detail share flow keeps its original strictness.
    const tocRequired = this.api.dataControlSE.inNotifications ? !!plannedResult : true;
    const resultWithoutTRI = this.shareRequestModalSE.shareRequestBody.result_toc_results.some(result => {
      const missingTocIds = tocRequired && (!result.toc_result_id || !result?.toc_level_id);
      const missingIndicator = plannedResult && this.fieldsManagerSE.activeIndicatorsLength() > 0 && !this.fieldsManagerSE.hasSelectedIndicator();

      return missingTocIds || missingIndicator;
    });

    if (this.requesting || !this.shareRequestModalSE.shareRequestBody.initiative_id || resultWithoutTRI) return true;

    return false;
  }

  get isBilateralResult(): boolean {
    return this.api.dataControlSE?.currentResult?.source_name === 'W3/Bilaterals';
  }

  get isIpsrResult(): boolean {
    const typeId = this.api.dataControlSE?.currentResult?.result_type_id;
    return typeId === 10 || typeId === 11;
  }

  get shouldShowTocInitiativeOut(): boolean {
    const hasInitiativeId = !!this.shareRequestModalSE.shareRequestBody?.initiative_id;
    const inNotifications = this.api.dataControlSE.inNotifications;
    const resultLevelId = this.api.dataControlSE?.currentResult?.result_level_id;
    const isAllowedResultLevel = resultLevelId === 3 || resultLevelId === 4;

    if (!hasInitiativeId || !this.showTocOut) {
      return false;
    }

    // Show when not in notifications, or when in notifications with allowed result level
    return !inNotifications || (inNotifications && isAllowedResultLevel);
  }

  cleanObject() {
    this.showForm = false;
    this.shareRequestModalSE.shareRequestBody = new ShareRequestBody();

    setTimeout(() => {
      this.showForm = true;
    }, 0);
  }

  get entitiesList(): any[] {
    if (this.api.rolesSE.isAdmin) {
      return this.allInitiatives.filter(initiative => initiative.portfolio_id === this.api.dataControlSE.reportingCurrentPhase.portfolioId);
    }

    return this.api.dataControlSE.myInitiativesList.filter(
      initiative => initiative.official_code !== this.api.dataControlSE.currentResult?.submitter
    );
  }

  onRequest() {
    this.requesting = true;

    const sendBody = {
      result_id: this.api?.dataControlSE?.currentResult?.id,
      initiativeShareId: [this.shareRequestModalSE.shareRequestBody.initiative_id],
      isToc: true,
      contributors_result_toc_result: [
        {
          planned_result: this.shareRequestModalSE.shareRequestBody.planned_result,
          initiative_id: this.shareRequestModalSE.shareRequestBody.initiative_id,
          result_toc_results: this.shareRequestModalSE.shareRequestBody.result_toc_results
        }
      ],
      email_template: 'email_template_request_as_contribution'
    };

    this.api.resultsSE.POST_createRequest(sendBody).subscribe({
      next: resp => {
        this.api.dataControlSE.showShareRequest = false;

        this.api.alertsFe.show({
          id: 'requesqshared',
          title: `Request sent`,
          description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
          status: 'success'
        });
        this.requesting = false;
        if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
          this.router.navigate([`/ipsr/list/innovation-list`]);
        } else {
          this.router.navigate([`/result/results-outlet/results-list`]);
        }
      },
      error: err => {
        console.error(err);
        this.api.dataControlSE.showShareRequest = false;
        if (err.error?.statusCode === 400) {
          this.api.alertsFe.show({
            id: 'requesqsharederror',
            title: 'The request could not be sent',
            description: err?.error?.message,
            status: 'information'
          });
          this.requesting = false;
          return;
        }
        this.api.alertsFe.show({ id: 'requesqsharederror', title: 'Error when requesting', description: '', status: 'error' });
        this.requesting = false;
      }
    });
  }

  modelChange() {
    this.showTocOut = false;

    const selectedInitiative = this.allInitiatives.find(
      initiative => initiative.initiative_id === this.shareRequestModalSE.shareRequestBody.initiative_id
    );

    setTimeout(() => {
      if (selectedInitiative) {
        const { initiative_id, official_code, short_name } = selectedInitiative;

        this.shareRequestModalSE.shareRequestBody.initiative_id = initiative_id;
        this.shareRequestModalSE.shareRequestBody.official_code = official_code;
        this.shareRequestModalSE.shareRequestBody.short_name = short_name;

        this.shareRequestModalSE.shareRequestBody.result_toc_results = [
          {
            action_area_outcome_id: null,
            initiative_id,
            official_code,
            planned_result: this.shareRequestModalSE.shareRequestBody.planned_result,
            results_id: null,
            short_name,
            toc_result_id: null,
            uniqueId: Math.random().toString(36).substring(7)
          }
        ];
      }

      this.showTocOut = true;
    }, 50);
  }

  acceptOrReject() {
    const body = {
      result_request: this.api.dataControlSE.currentNotification,
      result_toc_result: this.shareRequestModalSE.shareRequestBody,
      request_status_id: 2
    };

    this.requesting = true;

    const isP25 = this.api.dataControlSE.currentResultSignal()?.portfolio === 'P25';

    this.api.resultsSE.PATCH_updateRequest(body, isP25).subscribe({
      next: resp => {
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({
          id: 'noti',
          title: `Request successfully accepted`,
          status: 'success'
        });
        this.requesting = false;
        if (this.api.resultsSE.ipsrDataControlSE.inIpsr) {
          this.resultsNotificationsSE.get_section_innovation_packages();
        } else {
          this.resultsNotificationsSE.get_section_information();
        }
      },
      error: err => {
        console.error('error', err);
        this.api.dataControlSE.showShareRequest = false;
        this.api.alertsFe.show({ id: 'noti-error', title: 'Error when requesting ', description: '', status: 'error' });
        this.requesting = false;
      }
    });
  }

  GET_AllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }

  onPlannedResultChange(item: any) {
    item?.result_toc_results?.forEach((tab: any) => {
      if (tab.indicators?.[0]) {
        tab.indicators[0].related_node_id = null;
        tab.indicators[0].toc_results_indicator_id = null;
        if (tab.indicators[0].targets?.[0]) {
          tab.indicators[0].targets[0].contributing_indicator = null;
        }
      } else {
        tab.indicators = [
          {
            related_node_id: null,
            toc_results_indicator_id: null,
            targets: [
              {
                contributing_indicator: null
              }
            ]
          }
        ];
      }

      tab.toc_progressive_narrative = null;
      tab.toc_result_id = null;
      tab.toc_level_id = null;
    });

    this.tocConsumed = false;

    setTimeout(() => {
      this.tocConsumed = true;
    }, 200);
  }
}
