import { Component, Input, OnInit } from '@angular/core';
import { TocInitiativeOutcomeListsService } from '../../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../rd-theory-of-changes-services.service';

@Component({
  selector: 'app-toc-initiative-out',
  templateUrl: './toc-initiative-out.component.html',
  styleUrls: ['./toc-initiative-out.component.scss']
})
export class TocInitiativeOutComponent {
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
  SDGtestingYesorNo;
  constructor(public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public api: ApiService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}

  ngOnInit(): void {
    this.theoryOfChangesServices.body.push({
      impactAreasTargets: [],
        sdgTargest: [],
        targetsIndicators: [],
        actionAreaOutcome:[],
        isSdg:null,
        isImpactArea:null,
        resultId:null,
        initiative:null,
        is_sdg_action_impact:null
    })
    this.GET_outcomeList();
    this.get_versionDashboard()
    this.GET_outputList();
    this.GET_EOIList();
    this.valdiateEOI(this.initiative);
    if (this.initiative.toc_result_id != null) {
      this.getIndicator();
    }
  }

  getDescription(official_code, short_name) {
    const tocText = `<strong>${official_code} ${short_name}</strong> - Are you able to match your reported result to a planned result in this Initiative's Theory of Change?`;
    const contributorsText = `Is this result planned in the <strong>${official_code} ${short_name}</strong> ToC?`;
    return this.isIpsr ? contributorsText : tocText;
  }

  headerDescription(allText) {
    let text = '<ul> <li>Specify to which Work Package or End-of-Initiative Outcomes the scaling of the core innovation is expected to contribute to by 2024 in the specific geolocation</li>';
    if (allText) text += '<li>Please select the End of Initiative (EOI)-Outcome that most closely matches this result. You will have time during the reflect moment to update your ToC</li> ';
    text += '</ul>';
    return text;
  }

  GET_outputList() {
    console.log(this.api.dataControlSE.currentNotification);

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
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 1).subscribe(
      ({ response }) => {
        this.outputList = [];
        this.outputList = response;
        //(response);
      },
      err => {
        this.outputList = [];
        console.error(err);
      }
    );*/
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
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 2).subscribe(
      ({ response }) => {
        this.outcomeList = response;
        //(this.outcomeList);
      },
      err => {
        this.outcomeList = [];
        console.error(err);
      }
    );*/
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
    /*this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 3).subscribe(
      ({ response }) => {
        this.eoiList = response;
        //(this.eoiList);
      },
      err => {
        this.eoiList = [];
        console.error(err);
      }
    );*/
  }

  GET_fullInitiativeTocByinitId() {
    this.api.tocApiSE.GET_fullInitiativeTocByinitId(this.initiative.initiative_id).subscribe(
      ({ response }) => {
        
        
        this.fullInitiativeToc = response[0]?.toc_id;
      },
      err => {
        console.error(err);
      }
    );
  }

  get_versionDashboard(){
    this.api.resultsSE.get_vesrsionDashboard(this.initiative.toc_result_id,this.initiative.initiative_id).subscribe(
      ({ response }) => {
        console.log(response);
        this.fullInitiativeToc = response?.version_id;
      },
      err => {
        console.error(err);
      }
    );
  }

  showOutcomeLevel = true;

  valdiateEOI(initiative) {
    this.showOutcomeLevel = false;
    if (initiative.planned_result == false) initiative.toc_level_id = 3;
    setTimeout(() => {
      this.showOutcomeLevel = true;
    }, 100);

    if (!initiative.planned_result) {
      this.indicatorView = false;
      this.indicators = [];
    }
  }

  async getIndicator() {
    this.indicators = [];
    
    this.indicatorView = false;
    this.disabledInput = false;
    console.log(this.theoryOfChangesServices.body);
    await this.api.resultsSE.Get_indicator(this.initiative.toc_result_id, this.initiative.initiative_id).subscribe(({ response }) => {
      
      console.log(response);
      
      this.theoryOfChangesServices.targetsIndicators = response?.informationIndicator;
      this.theoryOfChangesServices.impactAreasTargets = response?.impactAreas;
      this.theoryOfChangesServices.sdgTargest = response?.sdgTargets;
      this.theoryOfChangesServices.actionAreaOutcome = response?.actionAreaOutcome;
      this.theoryOfChangesServices.impactAreasTargets.map(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
      this.theoryOfChangesServices.sdgTargest.map(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
      //this.theoryOfChangesServices.targetsIndicators.map(item => (item.is_not_aplicable = item.is_not_aplicable == 1 ? true : false));
      this.theoryOfChangesServices.actionAreaOutcome.map(item => (item.full_name = `<strong>${item.outcomeSMOcode}</strong> - ${item.outcomeStatement}`));
      this.theoryOfChangesServices.body[this.indexYesorNo] = {
        impactAreasTargets: this.theoryOfChangesServices.impactAreasTargets,
        sdgTargest: this.theoryOfChangesServices.sdgTargest,
        targetsIndicators: [],
        actionAreaOutcome: this.theoryOfChangesServices.actionAreaOutcome,
        isSdg:response?.isSdg,
        isImpactArea:response?.isImpactArea,
        resultId:response?.resultId,
        initiative:response?.initiative,
        is_sdg_action_impact:response?.is_sdg_action_impact,
      };
      
      
      if (this.indicators.length == 1) {
        this.disabledInput = true;
      }
      setTimeout(() => {
        this.indicatorView = true;
        console.log(this.theoryOfChangesServices.body);
        
      }, 100);
    });
    this.indicatorView = true;
  }

  narrativeTypeResult(){
    let narrative = ''
    if(this.resultLevelId == 1){
      narrative= 'output'
    }
    if(this.showOutcomeLevel && (this.resultLevelId == 1 ? this.initiative?.planned_result == false : true)){
      narrative= 'outcome'
    }
    if((this.resultLevelId == 1 ? this.initiative?.planned_result == false : true) && this.initiative.toc_level_id != 3){
      narrative= 'outcome'
    }
    if((this.resultLevelId == 1 ? this.initiative?.planned_result == false : true) && this.initiative.toc_level_id == 3){
      narrative= 'outcome'
    }

    return 'Indicator(s) of the '+narrative+' selected'
  }
}
