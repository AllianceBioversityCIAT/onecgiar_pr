import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ResultsListFilterService } from 'src/app/pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';

interface IOption {
  description: string;
  id: number;
  name: string;
  selected: boolean;
}
@Component({
  selector: 'app-change-result-type-modal',
  templateUrl: './change-result-type-modal.component.html',
  styleUrls: ['./change-result-type-modal.component.scss']
})
export class ChangeResultTypeModalComponent implements OnInit {
  @Input() body = new GeneralInfoBody();

  cgSpaceHandle = '';
  newTitleText = '';

  selectedResultType: IOption | null = null;
  alertStatusDescKnowledgeProduct = `<dl>
  <dt>Please add the handle generated in CGSpace to report your knowledge product. Only knowledge products entered into CGSpace are accepted in the PRMS Reporting Tool. The PRMS Reporting Tool will automatically retrieve all metadata entered into CGSpace. This metadata cannot be edited in the PRMS.</dt> <br/>
  <dt>The handle will be verified, and only knowledge products from 2023 will be accepted. For journal articles, the PRMS Reporting Tool will check the online publication date added in CGSpace (“Date Online”). Articles Published online for a previous years will not be accepted to prevent double counting across consecutive years. </dt> <br/>
  <dt>If you need support to modify any of the harvested metadata from CGSpace, contact your Center’s knowledge manager. <strong>And do the sync again.</strong></dt>
</dl>`;

  constructor(public api: ApiService, public resultsListFilterSE: ResultsListFilterService) {}

  ngOnInit(): void {}

  CGSpaceDesc() {
    return `<strong>Disclaimer:</strong> please note that the old title <strong>"${this.body.result_name}"</strong> will be replace by the CGSpace title.`;
  }

  onSelectOneChip(option: any) {
    if (option.id !== this.body.result_type_id) {
      if (!option.selected) return (this.selectedResultType = null);

      this.selectedResultType = option;

      this.resultsListFilterSE.filters.resultLevel.forEach((option: any) => {
        option.options.forEach((option: any) => {
          if (option.id !== this.selectedResultType?.id) option.selected = false;
        });
      });
    }
  }

  changeResultType() {
    if (this.selectedResultType?.id === 6) {
      this.api.dataControlSE.confirmChangeResultTypeModal = true;
      console.log('open confirmation modal');
      return;
    }

    console.log('changing result type');
  }
}
