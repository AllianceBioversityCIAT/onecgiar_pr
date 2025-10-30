import { Component, DoCheck, OnInit } from '@angular/core';
import { internationalizationData } from '../../../../shared/data/internationalization-data';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultLevelService } from './services/result-level.service';
import { Router } from '@angular/router';
import { ResultBody } from '../../../../shared/interfaces/result.interface';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { CreateResultManagementService } from './services/create-result-management.service';
import { TerminologyService } from '../../../../internationalization/terminology.service';

@Component({
  selector: 'app-result-creator',
  templateUrl: './result-creator.component.html',
  styleUrls: ['./result-creator.component.scss'],
  standalone: false
})
export class ResultCreatorComponent implements OnInit, DoCheck {
  naratives = internationalizationData.reportNewResult;
  depthSearchList: any[] = [];
  exactTitleFound = false;
  mqapJson: {};
  validating = false;
  kpAlertDescription = `Please add the handle generated in CGSpace to report your knowledge product. Only knowledge products entered into CGSpace are accepted in the PRMS Reporting Tool.<br><br>
  The PRMS Reporting Tool will automatically retrieve all metadata entered into CGSpace. Partners and geographical scope metadata are editable, while the other metadata fields are not.<br><br>
  The handle will be verified, and only knowledge products from ${
    this.phasesService?.currentlyActivePhaseOnReporting?.cgspace_year
  } will be accepted. For journal articles, the PRMS Reporting Tool will check the online publication date added in CGSpace (“Date Online”). If the online publication date is missing, the issued date (“Date Issued”) will be considered. Articles published online in ${
    this.phasesService?.currentlyActivePhaseOnReporting?.cgspace_year
  } but issued in ${this.phasesService?.currentlyActivePhaseOnReporting?.cgspace_year + 1} will be accepted for the ${
    this.phasesService?.currentlyActivePhaseOnReporting?.cgspace_year
  } reporting phase.<br><br>
  Articles published online in ${this.phasesService?.currentlyActivePhaseOnReporting?.cgspace_year - 1} but issued in ${
    this.phasesService?.currentlyActivePhaseOnReporting?.cgspace_year
  } will not be accepted and will need to be reported in the correct reporting period. A new functionality will be implemented in the PRMS Reporting Tool to periodically allow the reporting of results from previous year. Handles already reported will also not be accepted.<br><br>
  If you need support to modify any of the harvested metadata from CGSpace, contact your Center’s knowledge manager.<br><br>`;
  allInitiatives = [];
  allPhases = [];
  cgiarEntityTypes = [];
  currentResultType = '';
  mqapUrlError = {
    status: false,
    message: ''
  };

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public createResultManagementService: CreateResultManagementService,
    public terminologyService: TerminologyService,
    private router: Router,
    private phasesService: PhasesService
  ) {}

  ngOnInit(): void {
    this.api.dataControlSE.getCurrentPhases().subscribe(() => {
      this.api.rolesSE.validateReadOnly().then(() => {
        this.GET_AllInitiatives();
      });
      this.api.alertsFs.show({
        id: 'indoasd',
        status: 'success',
        title: '',
        description: this.naratives.alerts(
          this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym)
        ),
        querySelector: '.report_container',
        position: 'beforebegin'
      });
    });
    this.resultLevelSE.resultBody = new ResultBody();
    this.resultLevelSE.currentResultTypeList = [];
    this.resultLevelSE.resultLevelList?.forEach(reLevel => (reLevel.selected = false));
    this.resultLevelSE.cleanData();
    this.api.updateUserData(() => {
      if (this.api.dataControlSE.myInitiativesListReportingByPortfolio.length == 1)
        this.resultLevelSE.resultBody.initiative_id = this.api.dataControlSE.myInitiativesListReportingByPortfolio[0].id;
    });

    setTimeout(() => {
      this.getAllPhases();
    }, 600);
  }

  onSelectInit() {
    const init = ((this.api.rolesSE.isAdmin ? this.allInitiatives : this.api.dataControlSE.myInitiativesListReportingByPortfolio) || []).find(
      init => init.id == this.resultLevelSE.resultBody.initiative_id
    );
    const resultType = this.cgiarEntityTypes.find(type => type.code == init.typeCode);
    this.currentResultType = resultType?.name;
  }

  getAllPhases() {
    const reportingPhases = this.phasesService?.phases?.reporting || [];
    const ipsrPhases = this.phasesService?.phases?.ipsr || [];
    this.allPhases = [...reportingPhases, ...ipsrPhases];
  }

  GET_cgiarEntityTypes(callback) {
    this.api.resultsSE.GET_cgiarEntityTypes().subscribe({
      next: ({ response }) => {
        response.forEach(element => {
          element.isLabel = true;
        });
        callback(response);
      },
      error: err => {
        callback?.();
      }
    });
  }

  GET_AllInitiatives(callback?) {
    if (!this.api.rolesSE.isAdmin) return;

    const activePortfolio = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe({
      next: ({ response }) => {
        this.GET_cgiarEntityTypes(entityTypesResponse => {
          this.cgiarEntityTypes = entityTypesResponse;
          this.allInitiatives = response;

          this.allInitiatives.forEach(initiative => {
            const { code, name } = initiative?.obj_cgiar_entity_type || {};
            initiative.typeCode = code;
            initiative.typeName = name;
          });

          const groupList = entityTypesResponse;
          const resultList = [];
          groupList?.forEach(groupItem => {
            const initsGroup = this.allInitiatives.filter(item => item.typeCode == groupItem.code);
            if (initsGroup?.length) resultList.push(groupItem, ...initsGroup);
          });
          this.allInitiatives = resultList;
        });
      },
      error: err => {
        console.error(err);
      },
      complete: () => {
        callback?.();
      }
    });
  }

  get isKnowledgeProduct() {
    return this.resultLevelSE.resultBody.result_type_id == 6;
  }

  get resultTypeNamePlaceholder(): string {
    const typeName = this.resultTypeName;
    return typeName ? typeName + ' title...' : 'Title...';
  }

  get resultTypeName(): string {
    if (!this.resultLevelSE.currentResultTypeList || !this.resultLevelSE.resultBody.result_type_id) return '';
    return this.resultLevelSE.currentResultTypeList.find(resultType => resultType.id == this.resultLevelSE.resultBody.result_type_id)?.name;
  }

  get resultLevelName(): string {
    return this.resultLevelSE.resultBody['result_level_name'] ?? '';
  }

  clean() {
    if (this.resultLevelSE.resultBody.result_type_id == 6) this.resultLevelSE.resultBody.result_name = '';
    else this.depthSearch(this.resultLevelSE.resultBody.result_name);
  }

  depthSearch(title: string) {
    const cleanSpaces = (text: string) => text?.replace(/\s+/g, '')?.toLowerCase();
    const legacyType = this.getLegacyType(this.resultTypeName, this.resultLevelName);

    this.api.resultsSE.GET_FindResultsElastic(title, legacyType).subscribe({
      next: (response: any[]) => {
        this.depthSearchList = response.map(result => ({
          ...result,
          phase: this.allPhases.find(phase => phase.id === result?.version_id)
        }));

        this.exactTitleFound = !!this.depthSearchList.find(result => cleanSpaces(result.title) === cleanSpaces(title));
      },
      error: () => {
        this.depthSearchList = [];
        this.exactTitleFound = false;
      }
    });
  }

  getLegacyType(type: string, level: string): string {
    let legacyType = '';

    if (type == 'Innovation development') {
      legacyType = 'Innovation';
    } else if (type == 'Policy change') {
      legacyType = 'Policy';
    } else if (type == 'Capacity change' || type == 'Other outcome') {
      legacyType = 'OICR';
    } else if (level == 'Impact') {
      legacyType = 'OICR';
    }

    return legacyType;
  }

  onSaveSection() {
    if (!this.resultLevelSE.resultBody.initiative_id) {
      this.api.alertsFe.show({
        id: 'reportResultError',
        title: 'Error!',
        description: `Please select ${this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym)}`,
        status: 'error'
      });
      return;
    }

    if (this.resultLevelSE.resultBody.result_type_id != 6) {
      this.api.dataControlSE.validateBody(this.resultLevelSE.resultBody);
      this.api.resultsSE.POST_resultCreateHeader(this.resultLevelSE.resultBody).subscribe({
        next: (resp: any) => {
          this.router.navigate([`/result/result-detail/${resp?.response?.result_code}/general-information`], {
            queryParams: { phase: resp?.response?.version_id }
          });
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        },
        error: err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        }
      });
    } else {
      this.api.resultsSE.POST_createWithHandle({ ...this.mqapJson, result_data: this.resultLevelSE.resultBody }).subscribe({
        next: (resp: any) => {
          this.router.navigate([`/result/result-detail/${resp?.response?.result_code}/general-information`], {
            queryParams: { phase: resp?.response?.version_id }
          });
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        },
        error: err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        }
      });
    }
  }

  ngDoCheck(): void {
    this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.local_container');
  }

  GET_mqapValidation() {
    this.validating = true;

    if (!this.resultLevelSE.resultBody.handler) {
      this.mqapUrlError = {
        status: true,
        message: 'Please enter a valid handle.'
      };
      this.validating = false;
      return;
    }

    const regex =
      /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

    const isValid = regex.test(this.resultLevelSE.resultBody.handler);

    if (!isValid) {
      this.mqapUrlError = {
        status: true,
        message:
          'Please ensure that the handle is from the <a href="https://cgspace.cgiar.org/home" target="_blank" rel="noopener noreferrer">CGSpace repository</a> and not other CGIAR repositories.'
      };
      this.validating = false;
      return;
    }

    this.mqapUrlError = {
      status: false,
      message: ''
    };

    this.api.resultsSE.GET_mqapValidation(this.resultLevelSE.resultBody.handler).subscribe({
      next: resp => {
        this.mqapJson = resp.response;
        this.resultLevelSE.resultBody.result_name = resp.response.title;
        this.validating = false;
        this.api.alertsFe.show({
          id: 'reportResultSuccess',
          title: 'Metadata successfully retrieved',
          description: 'Title: ' + this.resultLevelSE.resultBody.result_name,
          status: 'success'
        });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validating = false;
        this.resultLevelSE.resultBody.result_name = '';
      }
    });
  }
}
