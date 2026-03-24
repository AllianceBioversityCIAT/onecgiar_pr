import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ResultsListFilterService } from '../../../../../../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { ChangeResultTypeServiceService } from '../../services/change-result-type-service.service';
import { Router } from '@angular/router';

interface IOption {
  description: string;
  id: number;
  name: string;
  resultLevelId: number;
  selected: boolean;
}
@Component({
  selector: 'app-change-result-type-modal',
  templateUrl: './change-result-type-modal.component.html',
  styleUrls: ['./change-result-type-modal.component.scss'],
  standalone: false
})
export class ChangeResultTypeModalComponent implements OnChanges {
  @Input() body = new GeneralInfoBody();
  validating = false;
  cgSpaceHandle = '';
  cgSpaceTitle = '';
  mqapJson: {};
  confirmationText: string = '';
  selectedResultType: IOption | null = null;
  alertStatusDesc =
    'Currently, the functionality to change result type is still under development for results at the <strong>"Initiative output"</strong> level except for <strong>"other output"</strong> to <strong>"knowledge product"</strong>. We are actively working to extend this possibility to all output types.';
  alertStatusDescKnowledgeProduct = `<dl>
  <dt>Please add the handle generated in CGSpace to report your knowledge product. Only knowledge products entered into CGSpace are accepted in the PRMS Reporting Tool. The PRMS Reporting Tool will automatically retrieve all metadata entered into CGSpace. This metadata cannot be edited in the PRMS.</dt> <br/>
  <dt>The handle will be verified, and only knowledge products from 2023 will be accepted. For journal articles, the PRMS Reporting Tool will check the online publication date added in CGSpace (“Date Online”). Articles Published online for a previous years will not be accepted to prevent double counting across consecutive years. </dt> <br/>
  <dt>1If you need support to modify any of the harvested metadata from CGSpace, contact your Center’s knowledge manager. <strong>And do the sync again.</strong></dt>
</dl>`;
  isChagingType: boolean = false;
  IOutcome = [1, 2];

  constructor(
    public api: ApiService,
    public resultsListFilterSE: ResultsListFilterService,
    public changeType: ChangeResultTypeServiceService,
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.body['result_code'] = this.api.resultsSE.currentResultCode;
    this.body['version_id'] = this.api.resultsSE.currentResultPhase;
  }

  CGSpaceDesc() {
    return `<strong>Disclaimer:</strong> please note that the old title <strong>"${this.body.result_name}"</strong> will be replace by the CGSpace title.`;
  }

  modalConfirmOrContinueText() {
    if (this.selectedResultType?.id !== 6 || (this.selectedResultType?.id === 6 && this.changeType.step === 1)) {
      return 'Confirm';
    }

    return 'Continue';
  }

  disableOptionValidation(option: IOption) {
    const { result_type_id, result_level_id } = this.body;

    if (option.id === result_type_id && option.resultLevelId === result_level_id) {
      return true;
    }

    if (option.resultLevelId === 1 || option.resultLevelId === 2) {
      return true;
    }

    return false;
  }

  onSelectOneChip(option: IOption) {
    if (!this.disableOptionValidation(option)) {
      this.resultsListFilterSE.filters.resultLevel.forEach((resultLevelOption: any) => {
        resultLevelOption.options.forEach((resultTypeOption: any) => {
          resultTypeOption.selected = false;
        });
      });

      this.selectedResultType = { ...option, selected: true };

      this.resultsListFilterSE.filters.resultLevel
        .find((resultLevelOption: any) => resultLevelOption.id === option.resultLevelId)
        .options.find((resultTypeOption: any) => resultTypeOption.id === option.id).selected = true;

      this.changeType.showFilters = true;
      this.changeType.showConfirmation = this.selectedResultType.id !== 6;
    }
  }

  onCloseModal() {
    this.changeType.step = 0;
    this.selectedResultType = null;
    this.changeType.justification = '';
    this.cgSpaceTitle = '';
    this.cgSpaceHandle = '';
    this.changeType.showConfirmation = false;
    this.changeType.showFilters = true;
    this.api.dataControlSE.changeResultTypeModal = false;
    this.resultsListFilterSE.filters.resultLevel.forEach((resultLevelOption: any) => {
      resultLevelOption.options.forEach((resultTypeOption: any) => {
        resultTypeOption.selected = false;
      });
    });
  }

  onCancelModal() {
    if (this.selectedResultType?.id === 6) {
      if (this.changeType.step === 0) {
        this.api.dataControlSE.changeResultTypeModal = false;
      }

      if (this.changeType.step === 1) {
        this.changeType.showConfirmation = false;
        this.changeType.showFilters = true;
        this.changeType.step = 0;
        this.changeType.justification = '';
        this.changeType.otherJustification = '';
      }
    } else {
      this.api.dataControlSE.changeResultTypeModal = false;
      this.changeType.showFilters = true;
    }
  }

  isContinueButtonDisabled(): boolean {
    if (this.isChagingType) return true;

    if (!this.selectedResultType) return true;

    if (this.selectedResultType.id === 6) {
      if (this.changeType.step === 0 && this.cgSpaceTitle === '') return true;
      if (this.changeType.step === 1 && this.changeType.justification === '') return true;
    } else {
      if (this.changeType.justification === '') return true;
      if (this.changeType.justification === 'Other' && this.changeType.otherJustification === '') return true;
    }

    return false;
  }

  changeResultTypeKP() {
    const currentUrl = this.router.url;
    this.isChagingType = true;

    this.api.resultsSE
      .POST_createWithHandle({
        ...this.mqapJson,
        modification_justification:
          this.changeType.justification === 'Other'
            ? `${this.changeType.justification}: ${this.changeType.otherJustification}`
            : this.changeType.justification
      })
      .subscribe({
        next: (resp: any) => {
          this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result type successfully updated', status: 'success', closeIn: 600 });
          this.onCloseModal();
          this.router.navigateByUrl(`/result/results-outlet/results-list`).then(() => {
            this.router.navigateByUrl(currentUrl);
          });
          this.isChagingType = false;
        },
        error: err => {
          this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
          this.isChagingType = false;
        }
      });
  }

  changeResultTypeOther() {
    const currentUrl = this.router.url;
    this.isChagingType = true;

    const requestBody = {
      result_level_id: this.selectedResultType.resultLevelId,
      result_type_id: this.selectedResultType.id,
      new_name: this.body.result_name,
      justification:
        this.changeType.justification === 'Other'
          ? `${this.changeType.justification}: ${this.changeType.otherJustification}`
          : this.changeType.justification
    };

    this.api.resultsSE.PATCH_createWithHandleChangeType(requestBody, this.body.result_id).subscribe({
      next: (resp: any) => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result type successfully updated', status: 'success', closeIn: 600 });
        this.onCloseModal();
        this.router.navigateByUrl(`/result/results-outlet/results-list`).then(() => {
          this.router.navigateByUrl(currentUrl);
        });
        this.isChagingType = false;
      },
      error: (err: any) => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.isChagingType = false;
      }
    });
  }

  changeResultType() {
    if (this.selectedResultType?.id === 6) {
      switch (this.changeType.step) {
        case 0:
          this.changeType.showConfirmation = true;
          this.changeType.showFilters = false;
          this.changeType.step = 1;
          break;
        case 1:
          this.changeResultTypeKP();
          break;
        default:
          break;
      }
    } else {
      this.changeType.showFilters = true;
      this.changeResultTypeOther();
    }
  }

  GET_mqapValidation() {
    this.validating = true;
    this.api.resultsSE.GET_mqapValidation(this.cgSpaceHandle).subscribe({
      next: resp => {
        this.mqapJson = resp.response;
        this.mqapJson['id'] = this.api.resultsSE.currentResultId;
        this.cgSpaceTitle = resp.response.title;
        this.validating = false;
        this.api.alertsFe.show({
          id: 'reportResultSuccess',
          title: 'Metadata successfully retrieved',
          description: 'Title: ' + this.cgSpaceTitle,
          status: 'success'
        });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validating = false;
        this.cgSpaceTitle = '';
      }
    });
  }
}
