import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../../../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../../rd-theory-of-changes-services.service';
import { MultipleWPsServiceService } from '../../services/multiple-wps-service.service';

@Component({
  selector: 'app-multiple-wps-content',
  templateUrl: './multiple-wps-content.component.html',
  styleUrls: ['./multiple-wps-content.component.scss']
})
export class MultipleWPsContentComponent implements OnInit, OnChanges {
  @Input() editable: boolean;
  @Input() initiative: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean = false;
  @Input() indexYesorNo: number;
  outcomeList = [];
  outputList = [];
  eoiList = [];
  fullInitiativeToc = null;
  indicators: any = [];
  indicatorView = false;
  disabledInput = false;
  testingYesOrNo;
  showOutcomeLevel = false;

  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService, public multipleWpsService: MultipleWPsServiceService) {}

  ngOnInit(): void {
    this.theoryOfChangesServices.body.push({
      impactAreasTargets: [],
      sdgTargest: [],
      targetsIndicators: [],
      actionAreaOutcome: [],
      isSdg: null,
      isImpactArea: null,
      resultId: null,
      initiative: null,
      is_sdg_action_impact: null
    });
    this.GET_outcomeList();
    this.get_versionDashboard();
    this.GET_outputList();
    this.GET_EOIList();
    this.valdiateEOI(this.initiative);
    if (this.initiative?.toc_result_id !== null) {
      this.getIndicator();
    }
  }

  getDescription(official_code, short_name) {
    const tocText = `<strong>${official_code} ${short_name}</strong> - Does this result match a planned result in your Theory of Change?`;
    const contributorsText = `Is this result planned in the <strong>${official_code} ${short_name}</strong> ToC?`;
    return this.isIpsr ? contributorsText : tocText;
  }

  headerDescription(allText) {
    let text = '<ul>';

    if (allText) {
      text += '<li>Specify to which Work Package or End of Initiative outcomes the scaling of the core innovation is expected to contribute to by 2024 in the specific geolocation</li>';
    } else {
      text += '<li>Which End of Initiative outcome does it link to most closely?. You will have time during the reflect moment to update your ToC</li> ';
    }

    text += '</ul>';
    return text;
  }

  GET_outputList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.api.dataControlSE.currentNotification?.results_id || this.initiative?.results_id || this.api.dataControlSE?.currentResult?.id, this.initiative.initiative_id, 1).subscribe({
      next: ({ response }) => {
        this.outputList = [];
        this.outputList = response;
      },
      error: err => {
        this.outputList = [];
        console.error(err);
      }
    });
  }

  GET_outcomeList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.api.dataControlSE.currentNotification?.result_id || this.initiative?.results_id || this.api.dataControlSE?.currentResult?.id, this.initiative.initiative_id, 2).subscribe({
      next: ({ response }) => {
        this.outcomeList = response;
      },
      error: err => {
        this.outcomeList = [];
        console.error(err);
      }
    });
  }

  GET_EOIList() {
    this.api.tocApiSE.GET_tocLevelsByconfig(this.api.dataControlSE.currentNotification?.result_id || this.api.dataControlSE.currentNotification?.result_id || this.initiative?.results_id || this.api.dataControlSE?.currentResult?.id, this.initiative.initiative_id, 3).subscribe({
      next: ({ response }) => {
        this.eoiList = response;
      },
      error: err => {
        this.eoiList = [];
        console.error(err);
      }
    });
  }

  GET_fullInitiativeTocByinitId() {
    this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.initiative.initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response[0]?.toc_id;
        console.log('hola');
      },
      error: err => {
        console.error(err);
      }
    });
  }

  get_versionDashboard() {
    this.api.resultsSE.get_vesrsionDashboard(this.initiative.toc_result_id, this.initiative.initiative_id).subscribe({
      next: ({ response }) => {
        this.fullInitiativeToc = response?.version_id;
      },
      error: err => {
        console.error(err);
      }
    });
  }

  valdiateEOI(initiative) {
    this.showOutcomeLevel = false;
    if (this.theoryOfChangesServices?.planned_result === false) initiative.toc_level_id = 3;

    setTimeout(() => {
      this.showOutcomeLevel = true;
    }, 100);

    if (!this.theoryOfChangesServices?.planned_result) {
      this.indicatorView = false;
      this.indicators = [];
    }
  }

  getIndicator() {
    this.indicators = [];

    this.indicatorView = false;
    this.disabledInput = false;

    this.api.resultsSE.Get_indicator(this.initiative?.toc_result_id, this.initiative?.initiative_id).subscribe({
      next: ({ response }) => {
        this.theoryOfChangesServices.targetsIndicators = response?.informationIndicator;
        this.theoryOfChangesServices.impactAreasTargets = response?.impactAreas;
        this.theoryOfChangesServices.sdgTargest = response?.sdgTargets;
        this.theoryOfChangesServices.actionAreaOutcome = response?.actionAreaOutcome;
        this.theoryOfChangesServices.impactAreasTargets.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
        this.theoryOfChangesServices.sdgTargest.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
        this.theoryOfChangesServices.actionAreaOutcome.forEach(item => (item.full_name = `${item.actionAreaId === 1 ? '<strong>Systems Transformation</strong>' : item.actionAreaId === 2 ? '<strong>Resilient Agrifood Systems</strong>' : '<strong>Genetic Innovation</strong>'} (${item.outcomeSMOcode}) - ${item.outcomeStatement}`));
        this.theoryOfChangesServices.body[this.indexYesorNo] = {
          impactAreasTargets: this.theoryOfChangesServices.impactAreasTargets,
          sdgTargest: this.theoryOfChangesServices.sdgTargest,
          targetsIndicators: this.theoryOfChangesServices.targetsIndicators,
          actionAreaOutcome: this.theoryOfChangesServices.actionAreaOutcome,
          isSdg: response?.isSdg,
          isImpactArea: response?.isImpactArea,
          resultId: response?.resultId,
          initiative: response?.initiative,
          is_sdg_action_impact: response?.is_sdg_action_impact
        };

        if (this.indicators.length == 1) {
          this.disabledInput = true;
        }

        setTimeout(() => {
          this.indicatorView = true;
        }, 100);

        this.indicatorView = true;
      },
      error: err => {
        console.log(err);
      }
    });
  }

  narrativeTypeResult() {
    let narrative = '';
    if (this.resultLevelId == 1) {
      narrative = 'output';
    }
    if (this.showOutcomeLevel && (this.resultLevelId == 1 ? this.theoryOfChangesServices?.planned_result == false : true)) {
      narrative = 'outcome';
    }
    if ((this.resultLevelId == 1 ? this.theoryOfChangesServices?.planned_result == false : true) && this.initiative.toc_level_id != 3) {
      narrative = 'outcome';
    }
    if ((this.resultLevelId == 1 ? this.theoryOfChangesServices?.planned_result == false : true) && this.initiative.toc_level_id == 3) {
      narrative = 'outcome';
    }

    return 'Indicator(s) of the ' + narrative + ' selected';
  }

  // Change initiative info when change of active initiative

  ngOnChanges() {
    this.valdiateEOI(this?.initiative);
    if (this.initiative.toc_result_id !== null) {
      this.getIndicator();
    }
  }
}
