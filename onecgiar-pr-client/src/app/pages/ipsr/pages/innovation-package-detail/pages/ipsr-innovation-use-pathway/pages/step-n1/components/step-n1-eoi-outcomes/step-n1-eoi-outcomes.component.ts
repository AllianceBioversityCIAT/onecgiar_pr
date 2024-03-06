import { Component, OnInit, Input } from '@angular/core';
import { TocApiService } from '../../../../../../../../../../shared/services/api/toc-api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { FormsModule } from '@angular/forms';
import { FeedbackValidationDirective } from '../../../../../../../../../../shared/directives/feedback-validation.directive';
import { PrMultiSelectComponent } from '../../../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';

@Component({
  selector: 'app-step-n1-eoi-outcomes',
  standalone: true,
  templateUrl: './step-n1-eoi-outcomes.component.html',
  styleUrls: ['./step-n1-eoi-outcomes.component.scss'],
  imports: [FormsModule, FeedbackValidationDirective, PrMultiSelectComponent]
})
export class StepN1EoiOutcomesComponent implements OnInit {
  @Input() body = new IpsrStep1Body();
  eoiList = [];

  constructor(
    private tocApiSE: TocApiService,
    private ipsrDataControlSE: IpsrDataControlService
  ) {}

  ngOnInit(): void {
    this.GET_EOIList();
  }

  GET_EOIList() {
    this.tocApiSE
      .GET_tocLevelsByconfig(
        this.ipsrDataControlSE?.detailData?.result_id,
        this.ipsrDataControlSE?.detailData?.inititiative_id,
        3
      )
      .subscribe({
        next: ({ response }) => {
          this.eoiList = response;
        },
        error: err => {
          console.error(err);
        }
      });
  }
}
